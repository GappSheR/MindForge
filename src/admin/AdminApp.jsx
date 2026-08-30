import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppTheme } from '../theme.jsx';

const fmt = (n) => (n || 0).toLocaleString('ru-RU') + ' ₸';

export default function AdminApp() {
  const { theme } = useAppTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('add'); // add | remove
  const [toast, setToast] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.usersGet) {
        const list = await window.electronAPI.usersGet();
        setUsers(list || []);
      }
    } catch (e) {
      setToast('Ошибка загрузки: ' + e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (list) => {
    try {
      if (window.electronAPI && window.electronAPI.usersSave) {
        await window.electronAPI.usersSave(list);
      }
    } catch (e) {
      setToast('Ошибка сохранения: ' + e.message);
    }
  };

  const applyBalance = async () => {
    const val = parseFloat(amount);
    if (!editUser || isNaN(val)) return;
    const delta = action === 'add' ? val : -val;
    const next = users.map(u => u.username === editUser.username
      ? { ...u, balance: Math.max(0, (u.balance || 0) + delta) }
      : u);
    setUsers(next);
    await save(next);
    setToast(`${editUser.name}: баланс ${action === 'add' ? '+' : '-'}${val} ₸`);
    setEditUser(null);
    setAmount('');
    setAction('add');
  };

  const removeUser = async (u) => {
    if (!confirm(`Удалить аккаунт ${u.name} (${u.username})?`)) return;
    const next = users.filter(x => x.username !== u.username);
    setUsers(next);
    await save(next);
    setToast('Аккаунт удалён');
  };

  const addManual = async () => {
    if (!editUser || !editUser.username.trim()) return;
    const next = [...users, editUser];
    setUsers(next);
    await save(next);
    setToast('Аккаунт создан');
    setEditUser(null);
  };

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: 3, gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          MindForge Admin Game
        </Typography>
        <Button size="small" startIcon={<AddCircleIcon />} onClick={() => setEditUser({ username: '', name: '', password: '', balance: 0, items: [] })}>
          Создать аккаунт
        </Button>
        <IconButton size="small" onClick={load}><RefreshIcon /></IconButton>
      </Box>

      <Paper sx={{ flex: 1, overflow: 'auto' }} variant="outlined">
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={40} />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6, color: theme.muted }}>
            <Typography variant="body1">Аккаунтов пока нет.</Typography>
            <Typography variant="caption">Они появятся после регистрации пользователей в MindForge Quiz.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Имя</TableCell>
                  <TableCell>Логин</TableCell>
                  <TableCell>Пароль</TableCell>
                  <TableCell>Баланс</TableCell>
                  <TableCell>Покупки</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.username} hover>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{u.password || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={fmt(u.balance)} color={u.balance > 0 ? 'success' : 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>{u.items?.length || 0}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => { setEditUser(u); setAction('add'); setAmount(''); }}>
                        Начислить
                      </Button>
                      <Button size="small" color="error" onClick={() => removeUser(u)} startIcon={<DeleteIcon fontSize="small" />}>
                        Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {users.some(u => u.username === editUser?.username) ? 'Начислить / списать' : 'Новый аккаунт'}
        </DialogTitle>
        <DialogContent>
          {users.some(u => u.username === editUser?.username) ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {editUser?.name} (@{editUser?.username})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant={action === 'add' ? 'contained' : 'outlined'} onClick={() => setAction('add')}>Начислить</Button>
                <Button size="small" variant={action === 'remove' ? 'contained' : 'outlined'} onClick={() => setAction('remove')}>Списать</Button>
              </Box>
              <TextField
                label="Сумма (₸)"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                fullWidth
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') applyBalance(); }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="Имя и фамилия" value={editUser?.name || ''}
                onChange={e => setEditUser({ ...editUser, name: e.target.value })} fullWidth size="small" />
              <TextField label="Логин" value={editUser?.username || ''}
                onChange={e => setEditUser({ ...editUser, username: e.target.value.toLowerCase().trim() })} fullWidth size="small" />
              <TextField label="Пароль" value={editUser?.password || ''}
                onChange={e => setEditUser({ ...editUser, password: e.target.value })} fullWidth size="small" />
              <TextField label="Начальный баланс (₸)" type="number" value={editUser?.balance || 0}
                onChange={e => setEditUser({ ...editUser, balance: parseFloat(e.target.value) || 0 })} fullWidth size="small" />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Отмена</Button>
          <Button variant="contained"
            onClick={users.some(u => u.username === editUser?.username) ? applyBalance : addManual}>
            {users.some(u => u.username === editUser?.username) ? 'Применить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
}