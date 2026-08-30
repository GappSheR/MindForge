import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAppTheme } from '../theme.jsx';

export default function LoadingScreen({ appName, iconUrl, onDone }) {
  const { theme } = useAppTheme();
  const [dots, setDots] = useState('');
  const [iconErr, setIconErr] = useState(false);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      setDots('.'.repeat((frame % 3) + 1));
      if (frame >= 40) { clearInterval(interval); onDone(); }
    }, 75);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      bgcolor: theme.bg,
    }}>
      {iconUrl && !iconErr ? (
        <Box component="img" src={iconUrl} onError={() => setIconErr(true)}
          sx={{ width: 96, height: 96, mb: 3, objectFit: 'contain' }} />
      ) : (
        <Box sx={{
          width: 96, height: 96, mb: 3, borderRadius: '12px',
          border: `1px solid ${theme.border}`,
          bgcolor: theme.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: 42, fontWeight: 700, color: theme.accent }}>
            {(appName || '?').charAt(0)}
          </Typography>
        </Box>
      )}

      <CircularProgress size={36} thickness={4} sx={{ color: theme.accent, mb: 4 }} />

      <Typography variant="h5" sx={{ fontWeight: 600, color: theme.text, mb: 1 }}>
        {appName}
      </Typography>

      <Typography variant="body2" sx={{ color: theme.muted }}>
        Загрузка{dots}
      </Typography>
    </Box>
  );
}