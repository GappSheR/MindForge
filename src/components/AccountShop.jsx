import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, Tabs, Tab, List, ListItem,
  ListItemIcon, ListItemText, IconButton, Avatar, Chip, CircularProgress,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useAppTheme } from '../theme.jsx';

const SHOP_ITEMS = [
  { id: 'skin1', name: 'Золотая тема викторин', price: 300, desc: 'Золотая расцветка вопросов' },
  { id: 'skin2', name: 'Неоновая радуга', price: 500, desc: 'Красочные ответы в вопросах' },
  { id: 'skin3', name: 'Профессорский пак', price: 750, desc: 'Академический стиль игры' },
];

export default function AccountShop({ user, onLogin, onLogout, open: openProp = false }) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [login, setLogin] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pass2, setPass2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [downloadState, setDownloadState] = useState({}); // file -> 'downloading'|'done'

  useEffect(() => {
    setOpen(openProp);
  }, [openProp]);

  useEffect(() => {
    if (user) setTab(1);
  }, [user]);

  // Загружаем каталог при открытии (или обновлении)
  useEffect(() => {
    if (open && window.electronAPI) {
      loadCatalog();
    }
  }, [open]);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const list = await window.electronAPI.shopCatalog();
      setCatalog(Array.isArray(list) ? list : []);
    } catch (e) {
      setCatalog([]);
    }
    setCatalogLoading(false);
  };

  const doLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await window.electronAPI.userLogin(login.trim(), pass);
      if (!res.ok) { setError(res.error); return; }
      onLogin(res.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const doRegister = async () => {
    setError('');
    if (!name.trim()) return setError('Укажите имя');
    if (!username.trim()) return setError('Укажите логин');
    if (!pass) return setError('Придумайте пароль');
    if (pass !== pass2) return setError('Пароли не совпадают');
    setLoading(true);
    try {
      const res = await window.electronAPI.userRegister({ name: name.trim(), username: username.trim(), password: pass });
      if (!res.ok) { setError(res.error); return; }
      onLogin(res.user);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const doBuy = async (item) => {
    if (!user) return;
    setError('');
    const res = await window.electronAPI.shopBuy(user.username, item.id, item.price);
    if (!res.ok) { setError(res.error); return; }
    onLogin({ ...user, balance: res.balance, items: res.items });
  };

  const doDownload = async (quiz) => {
    if (!user) return;
    const itemId = quiz.id;
    setError('');
    try {
      setDownloadState(s => ({ ...s, [quiz.file]: 'downloading' }));
      const folder = await window.electronAPI.openDirectoryDialog();
      if (!folder) { setDownloadState(s => ({ ...s, [quiz.file]: '' })); return; }
      const res = await window.electronAPI.quizDownload(quiz.file, folder);
      setDownloadState(s => ({ ...s, [quiz.file]: '' }));
      if (!res.ok) { setError(res.error || 'Ошибка скачивания'); return; }
      // Помечаем как скачанный
      onLogin({ ...user, items: [...(user.items || []), itemId + ':downloaded'] });
      setError('');
    } catch (e) {
      setDownloadState(s => ({ ...s, [quiz.file]: '' }));
      setError('Ошибка: ' + e.message);
    }
  };

  const owned = user?.items || [];
  const quizBought = (quiz) => owned.includes(quiz.id);
  const quizDownloaded = (quiz) => owned.includes(quiz.id + ':downloaded');

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StorefrontIcon /> {user ? 'Магазин' : 'Вход в аккаунт'}
        </Typography>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={`${user.balance} ₸`} size="small" sx={{ color: 'success.main', borderColor: 'success.main' }} variant="outlined" />
            <Avatar sx={{ width: 26, height: 26, bgcolor: theme.accent, fontSize: 14 }}>{user.name?.charAt(0) || '?'}</Avatar>
            <IconButton size="small" onClick={onLogout} title="Выйти"><LogoutIcon fontSize="small" /></IconButton>
          </Box>
        )}
      </DialogTitle>
      <DialogContent>

        {!user && (
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} sx={{ mb: 2 }}>
            <Tab label="Вход" />
            <Tab label="Регистрация" />
          </Tabs>
        )}

        {!user && tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Логин" value={login} onChange={e => setLogin(e.target.value)} fullWidth size="small" />
            <TextField label="Пароль" type="password" value={pass} onChange={e => setPass(e.target.value)} fullWidth size="small"
              onKeyDown={e => e.key === 'Enter' && doLogin()} />
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <Button variant="contained" onClick={doLogin} disabled={loading} startIcon={<LockIcon />}>
              Войти
            </Button>
            <Typography variant="caption" sx={{ color: theme.muted }}>
              Новым аккаунтам начисляется 1 000 ₸.
            </Typography>
          </Box>
        )}

        {!user && tab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Имя и фамилия" value={name} onChange={e => setName(e.target.value)} fullWidth size="small" />
            <TextField label="Логин" value={username} onChange={e => setUsername(e.target.value)} fullWidth size="small" />
            <TextField label="Пароль" type="password" value={pass} onChange={e => setPass(e.target.value)} fullWidth size="small" />
            <TextField label="Повторите пароль" type="password" value={pass2} onChange={e => setPass2(e.target.value)} fullWidth size="small"
              onKeyDown={e => e.key === 'Enter' && doRegister()} />
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <Button variant="contained" onClick={doRegister} disabled={loading} startIcon={<PersonIcon />}>
              Создать аккаунт
            </Button>
          </Box>
        )}

        {user && (
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); }} sx={{ mb: 1 }}>
            <Tab label="Форматы викторин" />
            <Tab label="Темы" />
          </Tabs>
        )}

        {user && tab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {catalogLoading ? <CircularProgress size={16} /> : (
                <IconButton size="small" onClick={loadCatalog} title="Обновить каталог"><RefreshIcon fontSize="small" /></IconButton>
              )}
              <Typography variant="caption" sx={{ color: theme.muted }}>
                Викторины от авторов. После покупки — скачивайте сколько угодно раз.
              </Typography>
            </Box>
            {catalog.length === 0 && !catalogLoading && (
              <Typography variant="body2" sx={{ color: theme.muted, textAlign: 'center', py: 3 }}>
                Магазин форматов пока пуст. Загляните позже — авторы выкладывают новые викторины.
              </Typography>
            )}
            <List>
              {catalog.map(quiz => {
                const bought = quizBought(quiz);
                const downloaded = quizDownloaded(quiz);
                return (
                  <ListItem key={quiz.id} sx={{ border: `1px solid ${theme.border}`, borderRadius: 1, mb: 1 }}>
                    <ListItemIcon>
                      <SportsEsportsIcon sx={{ color: theme.accent }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={quiz.title}
                      secondary={[
                        `${quiz.price} ₸`,
                        quiz.description ? quiz.description.slice(0, 60) : null,
                        quiz.author ? `@${quiz.author}` : null,
                        quiz.sizeMb ? `${quiz.sizeMb} МБ` : null,
                      ].filter(Boolean).join(' · ')}
                    />
                    {bought ? (
                      downloaded ? (
                        <Chip label="Скачено" size="small" color="success" />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={downloadState[quiz.file] === 'downloading' ? <CircularProgress size={14} /> : <DownloadIcon />}
                          disabled={downloadState[quiz.file] === 'downloading'}
                          onClick={() => doDownload(quiz)}
                        >
                          Скачать
                        </Button>
                      )
                    ) : (
                      <Button size="small" variant="contained" onClick={() => doBuy(quiz)} disabled={(user.balance || 0) < quiz.price}>
                        Купить за {quiz.price} ₸
                      </Button>
                    )}
                  </ListItem>
                );
              })}
            </List>
            {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
          </Box>
        )}

        {user && tab === 1 && (
          <List>
            {SHOP_ITEMS.map(item => {
              const bought = owned.includes(item.id);
              return (
                <ListItem key={item.id} sx={{ border: `1px solid ${theme.border}`, borderRadius: 1, mb: 1 }}>
                  <ListItemIcon>
                    {bought ? <CheckCircleIcon sx={{ color: 'success.main' }} /> : <StorefrontIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={item.desc + ` — ${item.price} ₸`}
                  />
                  {bought ? (
                    <Chip label="Куплено" size="small" color="success" />
                  ) : (
                    <Button size="small" variant="contained" onClick={() => doBuy(item)} disabled={(user.balance || 0) < item.price}>
                      Купить
                    </Button>
                  )}
                </ListItem>
              );
            })}
            {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  );
}