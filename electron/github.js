// ─── GitHub-интеграция MindForge ───────────────────────────────────────
// 1) Проверка и скачивание обновлений из GitHub Releases
// 2) Gist-синхронизация базы аккаунтов (Documents/MindForge/users.json)

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

// ЗАПОЛНИТЬ ПОСЛЕ РЕГИСТРАЦИИ: ник GitHub и имя репозитория
const CONFIG = {
  owner: 'GappSheR',                // ← твой GitHub-ник (без @)
  repo: 'MindForge',                // ← имя репозитория
  token: '',                        // ← заполняется вручную ниже (из файла)
};

// Токен НЕ хранится в git! Читается из gitignored-файла .gh_token рядом с github.js
// (или из переменной окружения MF_GH_TOKEN).
function loadToken() {
  const env = process.env.MF_GH_TOKEN;
  if (env) return env;
  const file = path.join(__dirname, '.gh_token');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch (e) {}
  return '';
}
CONFIG.token = loadToken();
const GIST_ID = '';                 // ← ID гиста (появится после первого синка)

const SHARE_DIR = path.join(process.env.USERPROFILE || os.homedir(), 'Documents', 'MindForge');
const USERS_FILE = path.join(SHARE_DIR, 'users.json');
const APPS_DIR = path.join(SHARE_DIR, 'apps');       // сюда качаются обновления
const UPDATE_META = path.join(APPS_DIR, 'latest.json');

function httpRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

// ─── Обновления ────────────────────────────────────────────────────────

// Список релизов (публичный, токен не нужен если репо public)
async function getReleases() {
  const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/releases`;
  const res = await httpRequest(url, { 'User-Agent': 'mindforge', Accept: 'application/vnd.github+json' });
  if (res.status !== 200) throw new Error('GitHub API ' + res.status);
  return JSON.parse(res.body);
}

// Найти в релизе файл для данной сборки (гейм/студио/админ)
async function checkUpdate(appKey) {
  try {
    const releases = await getReleases();
    const latest = releases.find(r => !r.draft && !r.prerelease);
    if (!latest) return null;
    const asset = latest.assets.find(a => a.name.toLowerCase().includes(appKey) && /\.exe$/.test(a.name));
    if (!asset) return null;
    // версия из тега, напр. v1.2.3
    const version = String(latest.tag_name || '').replace(/^v/i, '');
    return {
      version,
      tag: latest.tag_name,
      name: asset.name,
      size: asset.size,
      sizeMb: Math.round(asset.size / 1024 / 1024),
      url: asset.browser_download_url,
      published: latest.published_at,
      notes: (latest.body || '').slice(0, 400),
    };
  } catch (e) {
    return null; // нет сети — тихо пропускаем
  }
}

// Скачать файл с GitHub
function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'mindforge' } }, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        https.get(res.headers.location, { headers: { 'User-Agent': 'mindforge' } }, r2 => {
          r2.pipe(file);
        }).on('error', reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      res.pipe(file);
    }).on('error', reject);
    file.on('finish', () => file.close(() => resolve(dest)));
    file.on('error', reject);
  });
}

// Проверить и скачать обновление для нашего exe
async function updateApp() {
  const exeName = path.basename(process.execPath);
  const key = exeName.toLowerCase().includes('studio') ? 'studio'
    : exeName.toLowerCase().includes('admin') ? 'admin' : 'game';

  const upd = await checkUpdate(key);
  if (!upd) return { ok: false, reason: 'нет обновлений' };

  const dest = path.join(APPS_DIR, upd.name);
  await download(upd.url, dest);

  const meta = { key, exeName, version: upd.version, file: dest, name: upd.name, downloadedAt: new Date().toISOString() };
  fs.writeFileSync(UPDATE_META, JSON.stringify(meta, null, 2));
  return { ok: true, ...upd, localFile: dest };
}

// Применить скачанное обновление (на следующий запуск)
function stagedUpdateInfo() {
  try { return JSON.parse(fs.readFileSync(UPDATE_META, 'utf8')); } catch (e) { return null; }
}

// Заменить exe новым (нужно прав админа на запись рядом с собой)
function applyStagedUpdate() {
  try {
    const meta = stagedUpdateInfo();
    if (!meta || !meta.file || !fs.existsSync(meta.file)) return { ok: false, error: 'нет файла' };
    const cur = process.execPath;
    const backup = cur + '.old';
    if (fs.existsSync(backup)) fs.rmSync(backup, { force: true });
    fs.copyFileSync(cur, backup);
    fs.copyFileSync(meta.file, cur);
    fs.rmSync(meta.file, { force: true });
    try { fs.rmSync(UPDATE_META, { force: true }); } catch (e) {}
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Gist-синхронизация базы аккаунтов ─────────────────────────────────

function readUsersLocal() {
  try { if (fs.existsSync(USERS_FILE)) return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (e) {}
  return [];
}
function writeUsersLocal(users) {
  fs.mkdirSync(SHARE_DIR, { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function gistFetch() {
  if (!CONFIG.token) return null;
  const gid = await resolveGistId();
  if (!gid) return null;
  const res = await httpRequest(`https://api.github.com/gists/${gid}`, {
    'User-Agent': 'mindforge',
    Authorization: `token ${CONFIG.token}`,
    Accept: 'application/vnd.github+json',
  });
  if (res.status !== 200) return null;
  const g = JSON.parse(res.body);
  const file = g.files && Object.values(g.files)[0];
  return file && file.content ? JSON.parse(file.content) : [];
}

async function gistPush(users) {
  if (!CONFIG.token) return false;
  try {
    const gid = await resolveGistId();
    const body = JSON.stringify({
      description: 'MindForge users DB',
      public: false,
      files: {},
    });
    let url = 'https://api.github.com/gists';
    let method = 'POST';
    if (gid) { url += '/' + gid; method = 'PATCH'; }
    body2 = { ...JSON.parse(body) };
    // формируем содержимое файла
    const payload = {
      description: 'MindForge users DB',
      public: false,
      files: { 'users.json': { content: JSON.stringify(users) } },
    };
    const res = await new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const req = https.request(url, {
        method,
        headers: {
          'User-Agent': 'mindforge',
          Authorization: `token ${CONFIG.token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, (r) => {
        let d = '';
        r.setEncoding('utf8');
        r.on('data', c => d += c);
        r.on('end', () => resolve({ status: r.statusCode, body: d }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
    if (res.status === 201 || res.status === 200) {
      const parsed = JSON.parse(res.body);
      CONFIG.gistId = CONFIG.gistId || parsed.id;
      return true;
    }
    return false;
  } catch (e) { return false; }
}

let cachedGistId = null;
function resolveGistId() {
  return new Promise((resolve) => {
    if (cachedGistId) return resolve(cachedGistId);
    if (CONFIG.token) {
      httpRequest('https://api.github.com/gists', {
        'User-Agent': 'mindforge',
        Authorization: `token ${CONFIG.token}`,
        Accept: 'application/vnd.github+json',
      }).then(res => {
        if (res.status === 200) {
          const list = JSON.parse(res.body);
          const found = list.find(g => g.files && g.files['users.json']);
          cachedGistId = found ? found.id : null;
        }
        resolve(cachedGistId);
      }).catch(() => resolve(null));
    } else resolve(null);
  });
}

// Объединить: локальные users + облачные users (по логину)
function mergeUsers(local, remote) {
  const map = {};
  for (const u of local) if (u && u.username) map[u.username] = u;
  for (const u of remote) if (u && u.username && !map[u.username]) map[u.username] = u;
  return Object.values(map);
}

async function syncUsers() {
  const local = readUsersLocal();
  try {
    const remote = await gistFetch();
    if (remote) {
      const merged = mergeUsers(local, remote);
      writeUsersLocal(merged);
    }
  } catch (e) {}
  // push локальных (merge с облаком сделал выше при fetch; push снова сверит)
  const merged = readUsersLocal();
  await gistPush(merged);
  return readUsersLocal();
}

module.exports = {
  CONFIG,
  checkUpdate,
  updateApp,
  applyStagedUpdate,
  stagedUpdateInfo,
  syncUsers,
  readUsersLocal,
  writeUsersLocal,
  SHARE_DIR,
  USERS_FILE,
};