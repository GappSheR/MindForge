import React, { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, List, ListItem,
  ListItemText, ListItemIcon, Chip, IconButton, Divider,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getMediaCategory } from '../utils/qgpsh';

function getIcon(cat) {
  switch (cat) {
    case 'image': return <ImageIcon />;
    case 'audio': return <MusicNoteIcon />;
    case 'video': return <VideoLibraryIcon />;
    default: return <i />;
  }
}

function getColor(cat) {
  switch (cat) {
    case 'image': return '#28a745';
    case 'audio': return '#1a73e8';
    case 'video': return '#6f42c1';
    case 'presentation': return '#ffc107';
    default: return 'gray';
  }
}

export default function MediaPanel({ mediaFiles, onChange }) {
  const addFile = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.openFileDialog([
        { name: 'Media Files', extensions: ['png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'mp4', 'avi', 'pptx', 'pdf'] },
      ]);
      if (!path) return;
      const name = path.split(/[/\\]/).pop();
      const exists = mediaFiles.some(f => f.name === name);
      if (exists) return;
      onChange([...mediaFiles, { name, path, type: 'file' }]);
    }
  };

  const deleteFile = (idx) => {
    onChange(mediaFiles.filter((_, i) => i !== idx));
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00D4FF' }}>Медиафайлы</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={addFile}>Добавить</Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {mediaFiles.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Медиафайлов пока нет
          </Typography>
        ) : (
          <List>
            {mediaFiles.map((f, i) => {
              const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
              const cat = getMediaCategory(ext);
              return (
                <ListItem key={i} secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => deleteFile(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }>
                  <ListItemIcon sx={{ color: getColor(cat) }}>
                    {getIcon(cat)}
                  </ListItemIcon>
                  <ListItemText
                    primary={f.name}
                    secondary={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                  <Chip label={ext} size="small" variant="outlined"
                        sx={{ color: getColor(cat), borderColor: getColor(cat) }} />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
