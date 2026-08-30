const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Определяем режим (studio / game / admin) ─────────────────────────
const args = process.argv.slice(2);
let mode = 'game';
if (args.includes('--studio')) mode = 'studio';
if (args.includes('--admin')) mode = 'admin';

if (app.isPackaged) {
  const exeName = path.basename(process.execPath).toLowerCase();
  if (exeName.includes('studio')) mode = 'studio';
  else if (exeName.includes('admin')) mode = 'admin';
}

// Отключаем GPU для предотвращения крашей рендерера
app.disableHardwareAcceleration();

// Убираем верхнее меню File/View/Window
Menu.setApplicationMenu(null);

const isDev = !app.isPackaged;

// electron-packager layout: exe is at root, code at resources/app/electron/
// So __dirname = <root>/resources/app/electron/
// Root = __dirname/../../../
const ROOT_PATH = path.join(__dirname, '..', '..', '..');
const DATA_DIR = path.join(__dirname, '..'); // resources/app/ or project root — data lives here
const RESOURCES_PATH = DATA_DIR;

// ─── Восстановление удалённых файлов ────────────────────────────────────
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

function ensureAppData() {
  if (isDev) return;
  const dirs = ['dist', 'ico', 'fons', 'sounds'];
  for (const dir of dirs) {
    const srcPath = path.join(DATA_DIR, dir);
    const dstPath = path.join(ROOT_PATH, dir);
    if (fs.existsSync(srcPath) && !fs.existsSync(dstPath)) {
      try { copyDirSync(srcPath, dstPath); } catch (e) { console.error(`Restore ${dir} failed:`, e.message); }
    }
  }
}

let mainWindow = null;

function createWindow() {
  ensureAppData();

  const winOpts = {
    width: 1300,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: mode === 'studio'
      ? 'QuizForge Studio Made by GappSheRVIP777'
      : mode === 'admin'
        ? 'MindForge Admin Game Made by GappSheRVIP777'
        : 'MindForge Quiz Made by GappSheRVIP777',
  };

  const icoName = mode === 'studio'
    ? 'icon_studio.ico'
    : mode === 'admin'
      ? 'icon_admin.ico'
      : 'icon.ico';
  const icoPath = path.join(RESOURCES_PATH, 'ico', icoName);
  if (fs.existsSync(icoPath)) {
    winOpts.icon = icoPath;
  }

  mainWindow = new BrowserWindow(winOpts);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173?mode=' + mode);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(RESOURCES_PATH, 'dist', 'index.html');
    mainWindow.loadFile(indexPath, { query: { mode } });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const rlog = (m) => {
    try { fs.appendFileSync(path.join(ROOT_PATH, 'debug.log'), new Date().toISOString() + ' RENDERER: ' + m + '\n'); } catch (e) {}
  };

  const log = (m) => {
    try { fs.appendFileSync(path.join(ROOT_PATH, 'debug.log'), new Date().toISOString() + ' ' + m + '\n'); } catch (e) {}
  };

  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    rlog('FAIL_LOAD: ' + code + ' ' + desc);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Логируем только ошибки (level 3 = error), чтобы не спамить debug.log
    if (level === 3) {
      rlog('ERROR: ' + (message || ''));
    }
  });

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    rlog('CRASH: ' + JSON.stringify(details));
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    log('MODE=' + mode + ' ' + path.basename(process.execPath));
    log('Window done');
  }
}

// ─── IPC обработчики ────────────────────────────────────────────────────

ipcMain.handle('get-app-path', () => RESOURCES_PATH);
ipcMain.handle('get-mode', () => mode);

ipcMain.handle('get-resource-path', (_, relPath) => {
  return path.join(RESOURCES_PATH, relPath);
});

ipcMain.handle('read-file', (_, filePath) => {
  return fs.readFileSync(filePath);
});

ipcMain.handle('write-file', (_, filePath, data) => {
  fs.writeFileSync(filePath, Buffer.from(data));
  return true;
});

ipcMain.handle('read-dir', (_, dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath).map(f => ({
    name: f,
    path: path.join(dirPath, f),
    isFile: fs.statSync(path.join(dirPath, f)).isFile(),
    ext: path.extname(f).toLowerCase(),
  }));
});

ipcMain.handle('delete-file', (_, filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

ipcMain.handle('copy-file', (_, src, dest) => {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
});

ipcMain.handle('open-file-dialog', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('save-file-dialog', async (_, defaultName, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('unzip-file', async (_, zipPath, destDir) => {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
  return destDir;
});

ipcMain.handle('zip-dir', async (_, dirPath, zipPath) => {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  zip.addLocalFolder(dirPath);
  zip.writeZip(zipPath);
  return zipPath;
});

// ─── Поиск .qgpsh по компьютеру ──────────────────────────────────────────

ipcMain.handle('find-qgpsh-files', async () => {
  const results = [];
  const userDir = process.env.USERPROFILE;
  if (userDir) {
    const dirs = ['Desktop', 'Documents', 'Downloads'].map(d => path.join(userDir, d));
    for (const dir of dirs) {
      if (fs.existsSync(dir)) {
        try { scanDirForQgpsh(dir, results); } catch (e) {}
      }
    }
  }
  return results;
});

function scanDirForQgpsh(dir, results, depth = 0) {
  if (depth > 8) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '$RECYCLE.BIN') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDirForQgpsh(fullPath, results, depth + 1);
      } else if (entry.name.toLowerCase().endsWith('.qgpsh')) {
        results.push({ path: fullPath, title: entry.name.replace(/\.qgpsh$/i, '') });
      }
    }
  } catch (e) {}
}

ipcMain.handle('quick-load-qgpsh', async (_, filePath) => {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(filePath);
  const metaEntry = zip.getEntry('metadata.json');
  if (!metaEntry) return null;
  const metadata = JSON.parse(metaEntry.getData().toString('utf8'));
  let iconData = null;
  if (metadata.icon) {
    try {
      const iconEntry = zip.getEntry('media/' + metadata.icon);
      if (iconEntry) {
        iconData = Array.from(iconEntry.getData());
      }
    } catch (e) {}
  }
  return { metadata, icon: iconData ? { name: metadata.icon, data: iconData } : null };
});

ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// ─── Аккаунты и балансы (shop) ─────────────────────────────────────────
// Общий файл на диске, чтобы Гейм и Админ видели одних пользователей
const os = require('os');
const SHARE_DIR = path.join(process.env.USERPROFILE || os.homedir(), 'Documents', 'MindForge');
const USERS_FILE = path.join(SHARE_DIR, 'users.json');

function ensureShareDir() {
  try { fs.mkdirSync(SHARE_DIR, { recursive: true }); } catch (e) {}
}

function readUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {}
  return [];
}

function writeUsers(users) {
  ensureShareDir();
  try { fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2)); } catch (e) {}
}

ipcMain.handle('users-get', () => readUsers());
ipcMain.handle('users-save', (_, users) => { writeUsers(users); return true; });

ipcMain.handle('user-login', (_, login, password) => {
  const users = readUsers();
  const user = users.find(u =>
    (u.username && u.username.toLowerCase() === String(login).toLowerCase()) ||
    (u.email && u.email.toLowerCase() === String(login).toLowerCase())
  );
  if (!user) return { ok: false, error: 'Аккаунт не найден' };
  if (user.password !== password) return { ok: false, error: 'Неверный пароль' };
  return { ok: true, user: { username: user.username, name: user.name, balance: user.balance || 0, items: user.items || [] } };
});

ipcMain.handle('user-register', (_, data) => {
  const users = readUsers();
  const login = String(data.username || '').toLowerCase();
  if (!login) return { ok: false, error: 'Укажите логин' };
  if (users.some(u => u.username && u.username.toLowerCase() === login)) {
    return { ok: false, error: 'Такой логин уже занят' };
  }
  const user = {
    username: login,
    name: data.name || '',
    password: data.password || '',
    balance: 1000, // стартовый баланс
    items: [],
    created: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return { ok: true, user: { username: user.username, name: user.name, balance: user.balance, items: user.items } };
});

ipcMain.handle('user-balance', (_, username) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  return user ? user.balance || 0 : 0;
});

ipcMain.handle('shop-buy', (_, username, itemId, price) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { ok: false, error: 'Аккаунт не найден' };
  if (user.items.includes(itemId)) return { ok: false, error: 'Уже куплено' };
  if ((user.balance || 0) < price) return { ok: false, error: 'Недостаточно средств' };
  user.balance -= price;
  user.items.push(itemId);
  writeUsers(users);
  return { ok: true, balance: user.balance, items: user.items };
});

// ─── Админ: начисление / списание тенге ────────────────────────────────
ipcMain.handle('admin-add-balance', (_, username, amount) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { ok: false, error: 'Пользователь не найден' };
  user.balance = (user.balance || 0) + Number(amount || 0);
  writeUsers(users);
  return { ok: true, balance: user.balance };
});

ipcMain.handle('admin-set-password', (_, username, newPassword) => {
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return { ok: false, error: 'Пользователь не найден' };
  user.password = String(newPassword || '');
  writeUsers(users);
  return { ok: true };
});

// ─── GitHub: обновления и облачная синхронизация ─────────────────────────
const gh = require('./github');

ipcMain.handle('gh-check-update', async () => gh.checkUpdate(mode));
ipcMain.handle('gh-update-now', async () => gh.updateApp());
ipcMain.handle('gh-apply-update', () => gh.applyStagedUpdate());
ipcMain.handle('gh-staged-update', () => gh.stagedUpdateInfo());
ipcMain.handle('users-sync', async () => gh.syncUsers());

// ─── Хранилище викторин (магазин форматов) ──────────────────────────────
ipcMain.handle('shop-catalog', async () => gh.getCatalog().catch(() => []));
ipcMain.handle('quiz-publish', async (_, opts) => gh.publishQuiz(opts).catch(e => ({ ok: false, error: e.message })));
ipcMain.handle('quiz-download-url', (_, fileName) => gh.quizDownloadUrl(fileName));
ipcMain.handle('quiz-download', async (_, fileName, destDir) => {
  try {
    const url = gh.quizDownloadUrl(fileName);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, path.basename(fileName));
    await gh.downloadTo(url, dest);
    return { ok: true, path: dest };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ─── Запуск ─────────────────────────────────────────────────────────────

function afterReady() {
  createWindow();
  // Проверяем обновления в фоне (не блокируем запуск)
  gh.checkUpdate(mode).then(upd => {
    if (upd && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gh-update-available', upd);
    }
  }).catch(() => {});
  // Синхронизируем базу с облаком (тихо, при наличии токена)
  gh.syncUsers().catch(() => {});
}

app.whenReady().then(afterReady);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
