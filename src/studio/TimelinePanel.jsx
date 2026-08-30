import React from 'react';
import {
  Box, Card, CardContent, Typography, Button, IconButton,
  List, ListItem, ListItemText, Divider, Chip, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { createDefaultTimelineEvent } from '../utils/qgpsh';

export default function TimelinePanel({ questions, timeline, slides, mediaFiles, onChange }) {
  const getTimeline = (idx) => {
    while (timeline.length <= idx) {
      timeline.push({ before: [], after: [] });
    }
    return timeline[idx];
  };

  const addEvent = (qIdx, side) => {
    const entry = getTimeline(qIdx);
    entry[side].push(createDefaultTimelineEvent());
    onChange([...timeline]);
  };

  const removeEvent = (qIdx, side, evIdx) => {
    const entry = getTimeline(qIdx);
    entry[side].splice(evIdx, 1);
    onChange([...timeline]);
  };

  const updateEvent = (qIdx, side, evIdx, field, value) => {
    const entry = getTimeline(qIdx);
    entry[side][evIdx] = { ...entry[side][evIdx], [field]: value };
    onChange([...timeline]);
  };

  // Build file list for dropdown
  const fileOptions = [];
  slides.forEach((s, i) => {
    fileOptions.push({ value: `slide_${i}`, label: `[Слайд] ${s.title || `Слайд ${i + 1}`}` });
  });
  mediaFiles.forEach(f => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const icon = {
      png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', bmp: '🖼',
      mp3: '🎵', wav: '🎵', ogg: '🎵',
      mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬',
      pptx: '📽', ppt: '📽', pdf: '📄',
    }[ext] || '📄';
    fileOptions.push({ value: `media/${f.name}`, label: `${icon} ${f.name}` });
  });

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Сначала добавьте вопросы во вкладке "Вопросы"
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {questions.map((q, qIdx) => {
        const entry = getTimeline(qIdx);
        return (
          <Card key={qIdx}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: '#00D4FF' }}>
                Вопрос {qIdx + 1}: {q.text.substring(0, 40)}{q.text.length > 40 ? '...' : ''}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Before */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2">ДО:</Typography>
                    <Button size="small" startIcon={<AddIcon />}
                            onClick={() => addEvent(qIdx, 'before')}>
                      +
                    </Button>
                  </Box>
                  {entry.before.map((ev, evIdx) => (
                    <Box key={evIdx} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select
                          value={ev.type}
                          onChange={(e) => updateEvent(qIdx, 'before', evIdx, 'type', e.target.value)}
                        >
                          <MenuItem value="slide">Слайд</MenuItem>
                          <MenuItem value="image">Картинка</MenuItem>
                          <MenuItem value="video">Видео</MenuItem>
                          <MenuItem value="audio">Музыка</MenuItem>
                          <MenuItem value="file">Файл</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                        <Select
                          value={ev.file || ''}
                          onChange={(e) => updateEvent(qIdx, 'before', evIdx, 'file', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value=""><em>(выберите)</em></MenuItem>
                          {fileOptions.map((fo, fi) => (
                            <MenuItem key={fi} value={fo.value}>{fo.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton size="small" onClick={() => removeEvent(qIdx, 'before', evIdx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {entry.before.length === 0 && (
                    <Typography variant="caption" color="text.secondary">Нет событий</Typography>
                  )}
                </Box>

                {/* After */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="subtitle2">ПОСЛЕ:</Typography>
                    <Button size="small" startIcon={<AddIcon />}
                            onClick={() => addEvent(qIdx, 'after')}>
                      +
                    </Button>
                  </Box>
                  {entry.after.map((ev, evIdx) => (
                    <Box key={evIdx} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select
                          value={ev.type}
                          onChange={(e) => updateEvent(qIdx, 'after', evIdx, 'type', e.target.value)}
                        >
                          <MenuItem value="slide">Слайд</MenuItem>
                          <MenuItem value="image">Картинка</MenuItem>
                          <MenuItem value="video">Видео</MenuItem>
                          <MenuItem value="audio">Музыка</MenuItem>
                          <MenuItem value="file">Файл</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                        <Select
                          value={ev.file || ''}
                          onChange={(e) => updateEvent(qIdx, 'after', evIdx, 'file', e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value=""><em>(выберите)</em></MenuItem>
                          {fileOptions.map((fo, fi) => (
                            <MenuItem key={fi} value={fo.value}>{fo.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <IconButton size="small" onClick={() => removeEvent(qIdx, 'after', evIdx)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {entry.after.length === 0 && (
                    <Typography variant="caption" color="text.secondary">Нет событий</Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
