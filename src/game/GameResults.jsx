import React from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Divider, Stack,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ReplayIcon from '@mui/icons-material/Replay';

export default function GameResults({ quiz, score, total, answers, onRestart, onLoadNew }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  let statusText = '';
  let statusColor = '';
  if (pct === 100) { statusText = 'ИДЕАЛЬНО! Вы гений!'; statusColor = '#28a745'; }
  else if (pct >= 80) { statusText = 'Отличный результат!'; statusColor = '#ffc107'; }
  else if (pct >= 60) { statusText = 'Неплохо! Есть куда расти.'; statusColor = '#17a2b8'; }
  else if (pct >= 40) { statusText = 'Нужно подтянуть знания.'; statusColor = '#6f42c1'; }
  else { statusText = 'Стоит попробовать ещё раз!'; statusColor = '#dc3545'; }

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
      <Card sx={{ mb: 2, textAlign: 'center', pt: 3, pb: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 900, color: '#00D4FF', mb: 1 }}>
          РЕЗУЛЬТАТЫ
        </Typography>
        <Typography variant="h1" sx={{ fontWeight: 900, color: statusColor, fontSize: '5rem' }}>
          {pct}%
        </Typography>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {score} из {total} правильных
        </Typography>
        <Typography variant="body1" sx={{ color: statusColor, fontWeight: 600, mb: 2 }}>
          {statusText}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="outlined" startIcon={<HomeIcon />} onClick={onRestart}>
            В меню
          </Button>
          <Button variant="contained" startIcon={<ReplayIcon />} onClick={onLoadNew}>
            Загрузить ещё
          </Button>
        </Stack>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Детальный разбор ответов
          </Typography>
          {answers.map((entry, i) => {
            const q = quiz.questions[entry.qIdx];
            const isCorrect = entry.selected === entry.correct;
            const icon = isCorrect ? '✅' : (entry.selected === -1 ? '⏰' : '❌');
            const color = isCorrect ? '#28a745' : (entry.selected === -1 ? '#ffc107' : '#dc3545');
            return (
              <Box key={i} sx={{ mb: 1.5, p: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Chip label={`${icon} Вопрос ${i + 1}`} size="small" sx={{ bgcolor: color, color: '#fff' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{q.text}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, ml: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    Ваш ответ: <strong>{entry.selected >= 0 ? q.options[entry.selected] : '—'}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Правильный: <strong style={{ color: '#28a745' }}>{q.options[entry.correct]}</strong>
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
}
