import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, List, ListItem, ListItemText,
  ListItemIcon, IconButton, Chip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const PRESENTATION_EXTS = ['pptx', 'ppt', 'pps', 'ppsx', 'pdf', 'key', 'odp', 'fodp'];
const VIDEO_EXTS = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'webm', 'm4v', 'flv'];
const ALL_EXTS = [...PRESENTATION_EXTS, ...VIDEO_EXTS];

function getFileType(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (PRESENTATION_EXTS.includes(ext)) return 'presentation';
  return 'other';
}

function getFileIcon(type) {
  switch (type) {
    case 'video': return <VideoLibraryIcon />;
    case 'presentation': return <SlideshowIcon />;
    default: return <InsertDriveFileIcon />;
  }
}

function getFileColor(type) {
  switch (type) {
    case 'video': return '#6f42c1';
    case 'presentation': return '#ffc107';
    default: return 'gray';
  }
}

export default function SlideEditor({ slides, onChange }) {
  const addFiles = async () => {
    if (window.electronAPI) {
      const paths = await window.electronAPI.openFileDialog([
        { name: 'Презентации и видео', extensions: ALL_EXTS },
      ]);
      if (!paths) return;
      const path = Array.isArray(paths) ? paths[0] : paths;
      const name = path.split(/[/\\]/).pop();
      if (slides.some(s => s.file === path)) return;
      onChange([...slides, { id: `pres_${Date.now()}`, file: path, name, type: getFileType(name) }]);
    }
  };

  const deleteFile = (idx) => {
    onChange(slides.filter((_, i) => i !== idx));
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
      <Card sx={{ width: 320, flexShrink: 0 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" sx={{ color: '#00D4FF' }}>Презентации</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addFiles}>Загрузить</Button>
          </Box>
          <Divider sx={{ mb: 1 }} />
          <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
            {slides.map((s, i) => {
              const type = s.type || getFileType(s.name || s.file || '');
              return (
                <ListItem
                  key={s.id || i}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => deleteFile(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  }
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ color: getFileColor(type), minWidth: 36 }}>
                    {getFileIcon(type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={s.name || `Файл ${i + 1}`}
                    secondary={type === 'video' ? 'Видео' : 'Презентация'}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip
                    label={`.${(s.name || '').split('.').pop()}`}
                    size="small" variant="outlined"
                    sx={{ color: getFileColor(type), borderColor: getFileColor(type), ml: 1 }}
                  />
                </ListItem>
              );
            })}
            {slides.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                Нет загруженных файлов
              </Typography>
            )}
          </List>
        </CardContent>
      </Card>

      <Card sx={{ flex: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 3 }}>
            <SlideshowIcon sx={{ fontSize: 80, color: 'rgba(0,212,255,0.15)' }} />
            <Typography variant="h5" color="text.secondary" sx={{ fontWeight: 600 }}>
              Загрузите презентацию или видео
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 500 }}>
              Поддерживаемые форматы презентаций: PPTX, PPT, PPS, PDF, KEY, ODP<br />
              Поддерживаемые видео: MP4, AVI, MKV, MOV, WMV, WebM
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={addFiles} sx={{ mt: 1 }}>
              Выбрать файл
            </Button>
            {slides.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                Загружено файлов: {slides.length}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
