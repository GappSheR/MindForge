import React, { useState, useEffect } from 'react';
import { Box, IconButton, Tooltip, Alert, Button } from '@mui/material';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import DownloadIcon from '@mui/icons-material/Download';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import StudioApp from './studio/StudioApp';
import GameApp from './game/GameApp';
import AdminApp from './admin/AdminApp';
import LoadingScreen from './components/LoadingScreen';
import AppThemeProvider, { useAppTheme } from './theme.jsx';

const params = new URLSearchParams(window.location.search);
const MODE = params.get('mode') || 'game';
const APP_NAMES = {
  game: 'MindForge Quiz',
  studio: 'QuizForge Studio',
  admin: 'MindForge Admin Game',
};

const ICONS = {
  game: { dark: 'ico/mindforge_black.png', light: 'ico/mindforge_white.png' },
  studio: { dark: 'ico/studio_black.png', light: 'ico/studio_white.png' },
  admin: { dark: 'ico/mindforge_admin_black.png', light: 'ico/mindforge_admin_white.png' },
};

function toFileUrl(p) {
  if (!p) return '';
  if (p.startsWith('file://') || p.startsWith('http')) return p;
  return 'file:///' + p.replace(/\\/g, '/');
}

function UpdateBanner({ appName }) {
  const { theme } = useAppTheme();
  const [upd, setUpd] = useState(null);
  const [state, setState] = useState('idle'); // idle | downloading | ready
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!window.electronAPI) return;
    const onAvail = (u) => { if (u) setUpd(u); };
    window.electronAPI.on('gh-update-available', onAvail);
    window.electronAPI.ghCheckUpdate().then(() => {}).catch(() => {});
    return () => window.electronAPI.removeAllListeners('gh-update-available');
  }, []);

  if (!upd) return null;

  const download = async () => {
    setState('downloading');
    setErr('');
    try {
      const r = await window.electronAPI.ghUpdateNow();
      if (r && r.ok) { setState('ready'); }
      else setState('idle');
    } catch (e) { setState('idle'); setErr('Ошибка загрузки: ' + e.message); }
  };

  const applyNow = async () => {
    try {
      const r = await window.electronAPI.ghApplyUpdate();
      if (r && r.ok) window.location.reload();
      else setErr('Обновление применится при следующем запуске');
    } catch (e) { setErr(e.message); }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1600, width: 'min(92vw, 640px)' }}>
      <Alert
        severity="info"
        variant="filled"
        sx={{ bgcolor: theme.surface, color: theme.text, border: `1px solid ${theme.accent}`, borderRadius: 1.5, alignItems: 'center' }}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {state !== 'downloading' && (
              <Button size="small" variant="contained" onClick={state === 'ready' ? applyNow : download}
                startIcon={state === 'ready' ? <SystemUpdateIcon /> : <DownloadIcon />}
                sx={{ bgcolor: theme.accent, textTransform: 'none' }}>
                {state === 'ready' ? 'Обновить сейчас' : 'Скачать v' + (upd.version || '')}
              </Button>
            )}
            {state === 'downloading' && <Button size="small" disabled sx={{ color: theme.muted, textTransform: 'none' }}>Загрузка…</Button>}
            <Button size="small" onClick={() => setUpd(null)} sx={{ color: theme.muted, minWidth: 30 }}>✕</Button>
          </Box>
        }
      >
        Доступно обновление для <b>{appName}</b> — версия <b>{upd.version}</b> ({upd.sizeMb} МБ).
        {upd.notes && <Box component="span" sx={{ display: 'block', color: theme.muted, fontSize: 12, mt: 0.5 }}>{upd.notes}</Box>}
      </Alert>
      {err && <Box sx={{ color: '#e51400', fontSize: 12, mt: 1, textAlign: 'center' }}>{err}</Box>}
    </Box>
  );
}

function AppInner() {
  const { themeName, toggle, theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [iconUrl, setIconUrl] = useState('');
  const appName = APP_NAMES[MODE] || APP_NAMES.game;

  useEffect(() => {
    if (window.electronAPI) {
      const icoRel = ICONS[MODE]?.[themeName] || 'ico/icon.png';
      window.electronAPI.getResourcePath(icoRel)
        .then(p => setIconUrl(toFileUrl(p)))
        .catch(() => {});
    }
  }, [themeName, MODE]);

  return (
    <Box sx={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      bgcolor: theme.bg, color: theme.text,
      display: 'flex', flexDirection: 'column',
    }}>
      <Tooltip title={themeName === 'dark' ? 'Светлая тема' : 'Тёмная тема'} placement="left">
        <IconButton
          onClick={toggle}
          size="small"
          sx={{ position: 'fixed', top: 12, right: 12, zIndex: 1500, color: theme.muted }}
        >
          {themeName === 'dark' ? <Brightness7Icon fontSize="inherit" /> : <Brightness4Icon fontSize="inherit" />}
        </IconButton>
      </Tooltip>

      {loading && <LoadingScreen appName={appName} iconUrl={iconUrl} onDone={() => setLoading(false)} />}

{!loading && (
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {MODE === 'studio' ? <StudioApp /> : MODE === 'admin' ? <AdminApp /> : <GameApp />}
        </Box>
      )}
      <UpdateBanner appName={appName} />
    </Box>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AppInner />
    </AppThemeProvider>
  );
}