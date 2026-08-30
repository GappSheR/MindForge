import React from 'react';
import { Box, Typography } from '@mui/material';

export default function TimerDisplay({ seconds, total }) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  const display = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  let color = '#00D4FF';
  if (seconds <= 10) color = '#dc3545';
  else if (seconds <= 30) color = '#ffc107';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, color, fontFamily: 'monospace' }}>
        {display}
      </Typography>
    </Box>
  );
}
