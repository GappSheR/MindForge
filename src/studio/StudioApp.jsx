import React, { useState, useCallback } from 'react';
import {
  Box, Tabs, Tab, Typography, Button, Snackbar, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AddIcon from '@mui/icons-material/Add';
import SellIcon from '@mui/icons-material/Sell';
import JSZip from 'jszip';
import MetadataPanel from './MetadataPanel';
import QuestionEditor from './QuestionEditor';
import MediaPanel from './MediaPanel';
import SlideEditor from './SlideEditor';
import TimelinePanel from './TimelinePanel';
import { createEmptyQuiz, saveQuiz } from '../utils/qgpsh';

export default function StudioApp() {
  const [tab, setTab] = useState(0);
  const [quiz, setQuiz] = useState(createEmptyQuiz());
  const [mediaFiles, setMediaFiles] = useState([]);
  const [quizPath, setQuizPath] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [publishOpen, setPublishOpen] = useState(false);
  const [pubPrice, setPubPrice] = useState(100);
  const [pubDesc, setPubDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState('');

  const showSnack = (msg, severity = 'success') => {
    setSnack({ open: true, msg, severity });
  };

  const updateQuiz = useCallback((updater) => {
    setQuiz(prev => {
      const newQuiz = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      return newQuiz;
    });
  }, []);

  const handleSave = async () => {
    try {
      let path = quizPath;
      if (!path && window.electronAPI) {
        path = await window.electronAPI.saveFileDialog('quiz.qgpsh', [
          { name: 'Quiz Game Package', extensions: ['qgpsh'] },
        ]);
        if (!path) return;
        setQuizPath(path);
      }
      await saveQuiz(quiz, mediaFiles, path);
      showSnack('Викторина сохранена!');
    } catch (e) {
      showSnack('Ошибка сохранения: ' + e.message, 'error');
    }
  };

  const handleOpen = async () => {
    try {
      if (!window.electronAPI) {
        showSnack('Открытие доступно только в десктопной версии', 'warning');
        return;
      }
      const path = await window.electronAPI.openFileDialog([
        { name: 'Quiz Game Package', extensions: ['qgpsh'] },
      ]);
      if (!path) return;
      setQuizPath(path);
      const data = await window.electronAPI.readFile(path);
      const zip = await JSZip.loadAsync(new Uint8Array(data));
      const metadata = JSON.parse(await zip.file('metadata.json').async('text'));
      const questions = JSON.parse(await zip.file('questions.json').async('text'));
      const slides = zip.file('slides.json')
        ? JSON.parse(await zip.file('slides.json').async('text')) : [];
      const timeline = zip.file('timeline.json')
        ? JSON.parse(await zip.file('timeline.json').async('text')) : [];
      setQuiz({ metadata, questions, slides, timeline, media: [] });
      // Load media from zip
      const media = [];
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        mediaFolder.forEach((relPath, zipEntry) => {
          if (!zipEntry.dir) {
            media.push({ name: relPath, raw: zipEntry });
          }
        });
      }
      setMediaFiles(media);
      showSnack('Викторина загружена!');
    } catch (e) {
      showSnack('Ошибка загрузки: ' + e.message, 'error');
    }
  };

  const handleNew = () => {
    setQuiz(createEmptyQuiz());
    setMediaFiles([]);
    setQuizPath(null);
    showSnack('Новый проект создан');
  };

  const handlePublishOpen = async () => {
    if (quiz.questions.length === 0) {
      showSnack('Добавьте хотя бы один вопрос перед публикацией', 'warning');
      return;
    }
    if (!window.electronAPI) {
      showSnack('Публикация доступна только в десктопной версии', 'warning');
      return;
    }
    setPubPrice(100);
    setPubDesc(quiz.metadata.description || '');
    setPublishResult('');
    setPublishOpen(true);
  };

  const handlePublish = async () => {
    if (!quiz.metadata.title.trim()) {
      setPublishResult('Укажите название викторины в Метаданных');
      return;
    }
    setPublishing(true);
    setPublishResult('');
    try {
      // Сохраняем во временную папку
      const tmpPath = await window.electronAPI.saveFileDialog(
        `${quiz.metadata.title.replace(/[^a-z0-9а-яё _-]+/gi, '').trim() || 'quiz'}.qgpsh`,
        [{ name: 'Quiz Game Package', extensions: ['qgpsh'] }]
      );
      if (!tmpPath) { setPublishing(false); return; }
      await saveQuiz(quiz, mediaFiles, tmpPath);

      const res = await window.electronAPI.quizPublish({
        filePath: tmpPath,
        title: quiz.metadata.title,
        description: pubDesc,
        price: Number(pubPrice) || 0,
        author: quiz.metadata.author || 'GappSheR',
      });
      setPublishing(false);
      if (res.ok) {
        setPublishOpen(false);
        showSnack('Викторина опубликована в магазине!');
      } else {
        setPublishResult(res.error || 'Ошибка публикации');
      }
    } catch (e) {
      setPublishing(false);
      setPublishResult('Ошибка: ' + e.message);
    }
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#00D4FF', mr: 2 }}>
          QuizForge Studio
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={handleNew}>Новый</Button>
        <Button size="small" startIcon={<FolderOpenIcon />} onClick={handleOpen}>Открыть</Button>
        <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
          Сохранить
        </Button>
        <Button size="small" variant="contained" color="secondary" startIcon={<SellIcon />} onClick={handlePublishOpen}>
          В магазин
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary">
          Made by GappSheRVIP777
        </Typography>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, minHeight: 36 }}>
        <Tab label="Метаданные" />
        <Tab label={`Вопросы (${quiz.questions.length})`} />
        <Tab label={`Медиа (${mediaFiles.length})`} />
        <Tab label={`Презентации (${quiz.slides.length})`} />
        <Tab label="Таймлайн" />
      </Tabs>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 0 && <MetadataPanel metadata={quiz.metadata} onChange={(m) => updateQuiz({ metadata: m })} />}
        {tab === 1 && (
          <QuestionEditor
            questions={quiz.questions}
            onChange={(qs) => updateQuiz({ questions: qs })}
          />
        )}
        {tab === 2 && (
          <MediaPanel
            mediaFiles={mediaFiles}
            onChange={setMediaFiles}
          />
        )}
        {tab === 3 && (
          <SlideEditor
            slides={quiz.slides}
            onChange={(sl) => updateQuiz({ slides: sl })}
          />
        )}
        {tab === 4 && (
          <TimelinePanel
            questions={quiz.questions}
            timeline={quiz.timeline}
            slides={quiz.slides}
            mediaFiles={mediaFiles}
            onChange={(tl) => updateQuiz({ timeline: tl })}
          />
        )}
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>

      {/* Диалог публикации в магазин */}
      <Dialog open={publishOpen} onClose={() => setPublishOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SellIcon /> Публикация в магазин
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="body2">
              Викторина: <b>{quiz.metadata.title}</b> ({quiz.questions.length} вопросов)
            </Typography>
            <TextField
              label="Цена в магазине (₸)"
              type="number"
              value={pubPrice}
              onChange={e => setPubPrice(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Описание (покажем покупателям)"
              value={pubDesc}
              onChange={e => setPubDesc(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />
            {publishResult && (
              <Typography variant="body2" color={publishResult.includes('Ошибка') ? 'error' : 'success'}>
                {publishResult}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: theme => theme.palette.text.secondary }}>
              Файл .qgpsh загрузится в облачное хранилище GitHub. После покупки пользователи смогут скачать его и играть.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishOpen(false)} disabled={publishing}>Отмена</Button>
          <Button variant="contained" onClick={handlePublish} disabled={publishing} startIcon={publishing ? <CircularProgress size={16} /> : <SellIcon />}>
            {publishing ? 'Публикация...' : 'Опубликовать'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
