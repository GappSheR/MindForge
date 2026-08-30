import React from 'react';
import { Box, TextField, Card, CardContent, Typography, Button, IconButton } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function MetadataPanel({ metadata, onChange }) {
  const handleChange = (field, value) => {
    onChange({ ...metadata, [field]: value });
  };

  const handleIconUpload = async () => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.openFileDialog([
      { name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
    ]);
    if (!path) return;
    const name = path.split(/[/\\]/).pop();
    onChange({ ...metadata, icon: name, iconPath: path });
  };

  const handleIconRemove = () => {
    onChange({ ...metadata, icon: null, iconPath: null });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: '#00D4FF' }}>
          Метаданные викторины
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
          <TextField
            label="Название"
            value={metadata.title}
            onChange={(e) => handleChange('title', e.target.value)}
            fullWidth
          />
          <TextField
            label="Автор"
            value={metadata.author}
            onChange={(e) => handleChange('author', e.target.value)}
            fullWidth
          />
          <TextField
            label="Описание"
            value={metadata.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            fullWidth
          />

          {/* Icon upload */}
          <Typography variant="subtitle2" sx={{ mt: 1, color: '#00D4FF' }}>
            Иконка викторины
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {metadata.icon ? (
              <>
                {metadata.iconPath ? (
                  <Box
                    component="img"
                    src={metadata.iconPath}
                    sx={{ width: 64, height: 64, borderRadius: 2, objectFit: 'cover' }}
                  />
                ) : (
                  <Box sx={{
                    width: 64, height: 64, borderRadius: 2,
                    bgcolor: 'rgba(0,212,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ImageIcon sx={{ color: '#00D4FF44' }} />
                  </Box>
                )}
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>{metadata.icon}</Typography>
                <IconButton size="small" color="error" onClick={handleIconRemove}>
                  <DeleteIcon />
                </IconButton>
              </>
            ) : (
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={handleIconUpload}>
                Загрузить иконку
              </Button>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
