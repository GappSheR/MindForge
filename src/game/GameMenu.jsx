import React, { useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, CircularProgress,
  Grid, IconButton, Chip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import JSZip from 'jszip';
import { loadQuiz } from '../utils/qgpsh';
import { useAppTheme } from '../theme.jsx';
import AccountShop from '../components/AccountShop.jsx';

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
}

const DEFAULT_COLORS = ['#00D4FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316'];

function DefaultIcon({ title, size }) {
  const color = DEFAULT_COLORS[Math.abs((title || '').length) % DEFAULT_COLORS.length];
  return (
    <Box sx={{
      width: size || 72, height: size || 72, borderRadius: 2,
      background: `linear-gradient(135deg, ${color}, ${color}66)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <SportsEsportsIcon sx={{ fontSize: (size || 72) * 0.5, color: '#fff' }} />
    </Box>
  );
}

function IconDisplay({ iconData, title, size }) {
  if (iconData && iconData.url) {
    return (
      <Box
        component="img"
        src={iconData.url}
        sx={{ width: size || 72, height: size || 72, borderRadius: 2, objectFit: 'cover' }}
      />
    );
  }
  if (iconData && iconData.data) {
    const blob = new Blob([iconData.data], { type: 'image/png' });
    iconData.url = URL.createObjectURL(blob);
    return (
      <Box
        component="img"
        src={iconData.url}
        sx={{ width: size || 72, height: size || 72, borderRadius: 2, objectFit: 'cover' }}
      />
    );
  }
  return <DefaultIcon title={title} size={size} />;
}

export default function GameMenu({ games, onGamesChange, onLoadQuiz }) {
  const { theme } = useAppTheme();
  const [view, setView] = useState(games.length > 0 ? 'list' : 'start');
  const [scanning, setScanning] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const inputRef = useRef(null);

  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mf-user');
      if (saved) setUser(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    try { sessionStorage.setItem('mf-user', JSON.stringify(u)); } catch (e) {}
  };

  const handleLogout = () => {
    setUser(null);
    try { sessionStorage.removeItem('mf-user'); } catch (e) {}
  };

  const startScan = async () => {
    setScanning(true);
    setError('');
    setScanProgress('Поиск викторин на компьютере...');
    try {
      if (window.electronAPI) {
        const files = await window.electronAPI.findQgpshFiles();
        setScanProgress('Загрузка информации...');
        const results = [];
        const batchSize = 5;
        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const loaded = await Promise.all(batch.map(async (f) => {
            try {
              const info = await window.electronAPI.quickLoadQgpsh(f.path);
              if (info) {
                return {
                  path: f.path,
                  title: info.metadata.title || f.title,
                  author: info.metadata.author || 'Неизвестно',
                  icon: info.icon || null,
                };
              }
            } catch (e) {}
            return { path: f.path, title: f.title, author: 'Неизвестно', icon: null };
          }));
          results.push(...loaded);
        }
        onGamesChange(results);
        setView('list');
      } else {
        inputRef.current?.click();
      }
    } catch (e) {
      setError('Ошибка поиска: ' + e.message);
    }
    setScanning(false);
  };

  const handleBrowseFolder = async () => {
    if (!window.electronAPI) return;
    setScanning(true);
    setError('');
    try {
      const dir = await window.electronAPI.openDirectoryDialog();
      if (!dir) { setScanning(false); return; }
      setScanProgress('Сканирование папки...');
      const files = await window.electronAPI.findQgpshFiles();
      const filtered = files.filter(f => f.path.startsWith(dir));
      const results = [];
      for (const f of filtered) {
        try {
          const info = await window.electronAPI.quickLoadQgpsh(f.path);
          if (info) {
            results.push({
              path: f.path,
              title: info.metadata.title || f.title,
              author: info.metadata.author || 'Неизвестно',
              icon: info.icon || null,
            });
          }
        } catch (e) {
          results.push({ path: f.path, title: f.title, author: 'Неизвестно', icon: null });
        }
      }
      onGamesChange(results);
      setView('list');
    } catch (e) {
      setError('Ошибка: ' + e.message);
    }
    setScanning(false);
  };

  const handleFileInput = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadingQuiz(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(new Uint8Array(arrayBuffer));
      const metadata = JSON.parse(await zip.file('metadata.json').async('text'));
      const questions = JSON.parse(await zip.file('questions.json').async('text'));
      const slides = zip.file('slides.json') ? JSON.parse(await zip.file('slides.json').async('text')) : [];
      const timeline = zip.file('timeline.json') ? JSON.parse(await zip.file('timeline.json').async('text')) : [];
      const resolvedMedia = {};
      const mediaFolder = zip.folder('media');
      if (mediaFolder) {
        await Promise.all(Object.keys(mediaFolder.files).map(async (relPath) => {
          const entry = mediaFolder.files[relPath];
          if (entry.dir) return;
          try {
            const raw = await entry.async('uint8array');
            const ext = relPath.split('.').pop().toLowerCase();
            const mimeMap = {
              png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
              mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
              mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
              pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            };
            const blob = new Blob([raw], { type: mimeMap[ext] || 'application/octet-stream' });
            resolvedMedia[relPath] = URL.createObjectURL(blob);
            resolvedMedia[relPath.split('/').pop()] = URL.createObjectURL(blob);
          } catch (e) {}
        }));
      }
      for (const s of slides) {
        if (s.file && mediaFolder) {
          const fileName = s.name || s.file.split(/[/\\]/).pop();
          if (!resolvedMedia[fileName]) {
            const entry = mediaFolder.file(fileName);
            if (entry) {
              try {
                const raw = await entry.async('uint8array');
                const ext = fileName.split('.').pop().toLowerCase();
                const mimeMap = {
                  mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
                  mov: 'video/quicktime', wmv: 'video/x-ms-wmv', webm: 'video/webm',
                  pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                };
                const blob = new Blob([raw], { type: mimeMap[ext] || 'application/octet-stream' });
                resolvedMedia[fileName] = URL.createObjectURL(blob);
              } catch (e) {}
            }
          }
        }
      }
      onLoadQuiz({ metadata, questions, slides, timeline, media: [], resolvedMedia }, file.name);
    } catch (e) {
      setError('Ошибка загрузки: ' + e.message);
    }
    setLoadingQuiz(false);
  };

  const handleSelectGame = async (game) => {
    setLoadingQuiz(true);
    setError('');
    try {
      if (window.electronAPI) {
        const quizData = await loadQuiz(game.path);
        const resolvedMedia = {};
        for (const m of quizData.media) {
          if (m.data && m.data.async) {
            try {
              const raw = await m.data.async('uint8array');
              const ext = m.name.split('.').pop().toLowerCase();
              const mimeMap = {
                png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
                mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
                mp4: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
                pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              };
              const blob = new Blob([raw], { type: mimeMap[ext] || 'application/octet-stream' });
              resolvedMedia[m.name] = URL.createObjectURL(blob);
              resolvedMedia[m.name.split('/').pop()] = URL.createObjectURL(blob);
            } catch (e) { console.warn('Media extract fail:', m.name, e); }
          }
        }
        onLoadQuiz({ ...quizData, resolvedMedia }, game.path);
      } else {
        startScan();
      }
    } catch (e) {
      setError('Ошибка загрузки викторины: ' + e.message);
      setLoadingQuiz(false);
    }
  };

  const goBack = () => {
    setView('start');
    setError('');
  };

  // ─── START VIEW ──────────────────────────────────────────────────────
  if (view === 'start') {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
          <Button size="small" startIcon={<StorefrontIcon />} onClick={() => setShopOpen(true)}>
            Магазин
          </Button>
          <Button size="small" startIcon={<AccountCircleIcon />} onClick={() => setShopOpen(true)}>
            {user ? user.name : 'Войти'}
          </Button>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card sx={{ maxWidth: 460, width: '100%', textAlign: 'center', p: { xs: 3, md: 4 } }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <SportsEsportsIcon sx={{ fontSize: 56, color: theme.accent }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                MindForge Quiz
              </Typography>
              <Typography variant="body2" sx={{ color: theme.muted, mb: 4 }}>
                Made by GappSheRVIP777
              </Typography>
              <Button
                variant="contained"
              size="large"
              startIcon={scanning ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              onClick={startScan}
              disabled={scanning}
              sx={{ py: 1.4, px: 5, fontSize: '1.05rem' }}
            >
              {scanning ? 'Поиск...' : 'Играть'}
            </Button>
            <Typography variant="caption" sx={{ color: theme.muted, display: 'block', mt: 2 }}>
              Автоматический поиск викторин .qgpsh на компьютере
            </Typography>
            <input ref={inputRef} type="file" accept=".qgpsh" style={{ display: 'none' }} onChange={handleFileInput} />
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 2 }}>{error}</Typography>
            )}
          </CardContent>
        </Card>
      </Box>
      <AccountShop user={user} onLogin={handleLogin} onLogout={handleLogout} open={shopOpen} />
    </Box>
  );
  }

  // ─── SCANNING VIEW ───────────────────────────────────────────────────
  if (view === 'scanning') {
    return (
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={64} thickness={3} sx={{ color: theme.accent, mb: 3 }} />
          <Typography variant="h5" sx={{ mb: 1, color: theme.text }}>Поиск викторин</Typography>
          <Typography variant="body2" sx={{ color: theme.muted }}>{scanProgress}</Typography>
        </Box>
      </Box>
    );
  }

  // ─── GAME LIST VIEW ──────────────────────────────────────────────────
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={goBack} sx={{ color: theme.accent }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.accent, flex: 1 }}>
          {games.length > 0 ? `Найдено викторин: ${games.length}` : 'Викторины не найдены'}
        </Typography>
        <Button size="small" startIcon={<StorefrontIcon />} onClick={() => setShopOpen(true)}>
          {user ? user.name : 'Магазин'}
        </Button>
        {window.electronAPI && (
          <Button size="small" startIcon={<FolderOpenIcon />} onClick={handleBrowseFolder} disabled={scanning}>
            Выбрать папку
          </Button>
        )}
      </Box>

      {loadingQuiz && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={48} sx={{ color: theme.accent }} />
          <Typography variant="body2" sx={{ color: theme.muted, mt: 1 }}>Загрузка викторины...</Typography>
        </Box>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {games.length === 0 && !loadingQuiz ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <SportsEsportsIcon sx={{ fontSize: 80, color: theme.border, mb: 2 }} />
          <Typography variant="h6" sx={{ color: theme.text, mb: 1 }}>
            Викторины не найдены
          </Typography>
          <Typography variant="body2" sx={{ color: theme.muted, mb: 3 }}>
            {window.electronAPI
              ? 'Поместите файлы .qgpsh в папки Документы, Рабочий стол или Загрузки'
              : 'Нажмите "Играть" и выберите файл .qgpsh'}
          </Typography>
          {window.electronAPI && (
            <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleBrowseFolder}>
              Выбрать папку вручную
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ flex: 1, overflow: 'auto', alignContent: 'flex-start' }}>
          {games.map((game, i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={game.path || i}>
              <Card
                sx={{
                  cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                  opacity: loadingQuiz ? 0.6 : 1,
                  pointerEvents: loadingQuiz ? 'none' : 'auto',
                }}
                onClick={() => handleSelectGame(game)}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                  <IconDisplay iconData={game.icon} title={game.title} size={64} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.text, noWrap: true, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {game.title}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ color: theme.muted }}>
                      {game.author}
                    </Typography>
                    <Chip
                      label=".qgpsh"
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.5, fontSize: 10, height: 20, color: theme.accent, borderColor: theme.border }}
                    />
                  </Box>
                  <PlayArrowIcon sx={{ color: theme.accent, opacity: 0.6 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <AccountShop user={user} onLogin={handleLogin} onLogout={handleLogout} open={shopOpen} />
    </Box>
  );
}
