const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Отключаем GPU — чтобы рендерер не падал
app.disableHardwareAcceleration();

// Убираем верхнее меню File/View/Window
Menu.setApplicationMenu(null);

// Общая база аккаунтов: та же, что читает MindForge Quiz (Documents/MindForge)
const SHARE_DIR = path.join(process.env.USERPROFILE || app.getPath('documents'), 'Documents', 'MindForge');
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
ipcMain.handle('users-path', () => USERS_FILE);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '..', 'ico', 'icon_admin.ico'),
    title: 'MindForge Admin Game Made by GappSheRVIP777',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});