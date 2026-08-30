import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Radio, RadioGroup, FormControlLabel, FormControl,
  Slider, IconButton, List, ListItem, ListItemText, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { createDefaultQuestion, getMediaCategory } from '../utils/qgpsh';

export default function QuestionEditor({ questions, onChange }) {
  const [selected, setSelected] = useState(-1);

  const addQuestion = () => {
    const q = createDefaultQuestion(questions.length);
    onChange([...questions, q]);
    setSelected(questions.length);
  };

  const deleteQuestion = (idx) => {
    if (idx < 0) return;
    const newQ = questions.filter((_, i) => i !== idx);
    onChange(newQ);
    setSelected(Math.min(selected, newQ.length - 1));
  };

  const updateQuestion = (idx, field, value) => {
    const newQ = questions.map((q, i) => i === idx ? { ...q, [field]: value } : q);
    onChange(newQ);
  };

  const updateOption = (qIdx, optIdx, value) => {
    const newQ = questions.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    });
    onChange(newQ);
  };

  const attachFile = async (field) => {
    if (!window.electronAPI || selected < 0) return;
    const exts = field === 'image'
      ? ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp']
      : ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
    const path = await window.electronAPI.openFileDialog([
      { name: field === 'image' ? 'Картинки' : 'Музыка', extensions: exts },
    ]);
    if (!path) return;
    const name = path.split(/[/\\]/).pop();
    updateQuestion(selected, field, { name, path });
  };

  const removeFile = (field) => {
    if (selected < 0) return;
    updateQuestion(selected, field, null);
  };

  const q = selected >= 0 && selected < questions.length ? questions[selected] : null;

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
      {/* Left - question list */}
      <Card sx={{ width: 280, flexShrink: 0 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#00D4FF' }}>Вопросы</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addQuestion}>
              Добавить
            </Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
            {questions.map((q, i) => (
              <ListItem
                key={q.id || i}
                button
                selected={selected === i}
                onClick={() => setSelected(i)}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => deleteQuestion(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemText
                  primary={`#${i + 1} ${q.text.substring(0, 25)}${q.text.length > 25 ? '...' : ''}`}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
              </ListItem>
            ))}
            {questions.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Вопросов пока нет
              </Typography>
            )}
          </List>
        </CardContent>
      </Card>

      {/* Right - question editor */}
      <Card sx={{ flex: 1 }}>
        <CardContent>
          {q ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#00D4FF' }}>
                  Вопрос #{selected + 1}
                </Typography>
                <Button size="small" color="error" startIcon={<DeleteIcon />}
                        onClick={() => deleteQuestion(selected)}>
                  Удалить
                </Button>
              </Box>

              <TextField
                label="Текст вопроса"
                value={q.text}
                onChange={(e) => updateQuestion(selected, 'text', e.target.value)}
                fullWidth
                multiline
                rows={2}
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ mb: 1 }}>Варианты ответов:</Typography>
              <FormControl component="fieldset" sx={{ width: '100%', mb: 2 }}>
                <RadioGroup value={q.correct} onChange={(e) => updateQuestion(selected, 'correct', parseInt(e.target.value))}>
                  {q.options.map((opt, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <FormControlLabel
                        value={i}
                        control={<Radio size="small" />}
                        label=""
                        sx={{ mr: 0.5 }}
                      />
                      <TextField
                        size="small"
                        value={opt}
                        onChange={(e) => updateOption(selected, i, e.target.value)}
                        fullWidth
                        variant="outlined"
                        placeholder={`Вариант ${i + 1}`}
                      />
                    </Box>
                  ))}
                </RadioGroup>
              </FormControl>

              <Typography variant="subtitle2" gutterBottom>
                Таймер: {q.timer} сек
              </Typography>
              <Slider
                value={q.timer}
                onChange={(_, v) => updateQuestion(selected, 'timer', v)}
                min={5}
                max={600}
                step={5}
                sx={{ maxWidth: 400, mb: 1, color: '#00D4FF' }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', maxWidth: 400 }}>
                <Typography variant="caption" color="text.secondary">5 сек</Typography>
                <Typography variant="caption" color="text.secondary">10 мин</Typography>
              </Box>

              {/* Image attachment */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <ImageIcon sx={{ color: '#28a745' }} />
                <Typography variant="subtitle2">Картинка к вопросу</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {q.image ? (
                  <>
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap>{q.image.name}</Typography>
                    <Button size="small" color="error" onClick={() => removeFile('image')}>Удалить</Button>
                  </>
                ) : (
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => attachFile('image')}>
                    Прикрепить картинку
                  </Button>
                )}
              </Box>

              {/* Music attachment */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MusicNoteIcon sx={{ color: '#1a73e8' }} />
                <Typography variant="subtitle2">Музыка к вопросу</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {q.music ? (
                  <>
                    <Typography variant="body2" sx={{ flex: 1 }} noWrap>{q.music.name}</Typography>
                    <Button size="small" color="error" onClick={() => removeFile('music')}>Удалить</Button>
                  </>
                ) : (
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => attachFile('music')}>
                    Прикрепить музыку
                  </Button>
                )}
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <Typography variant="body1" color="text.secondary">
                Выберите или добавьте вопрос
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
