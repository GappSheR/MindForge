const $ = (id) => document.getElementById(id);

let users = [];
let currentAction = 'add';
let currentUsername = null;

const fmt = (n) => (n || 0).toLocaleString('ru-RU') + ' ₸';

function toast(msg, isErr) {
  const el = $('toast');
  el.textContent = msg;
  el.style.background = isErr ? '#e51400' : '#6a9955';
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2500);
}

async function load() {
  try {
    users = (await window.adminAPI.getUsers()) || [];
    render();
    const p = await window.adminAPI.usersPath();
    $('dbPath').textContent = p;
  } catch (e) {
    toast('Ошибка загрузки: ' + e.message, true);
  }
}

function render() {
  const table = $('table');
  const empty = $('empty');
  const tbody = $('tbody');
  $('count').textContent = 'Всего аккаунтов: ' + users.length;

  if (users.length === 0) {
    table.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  table.classList.remove('hidden');
  empty.classList.add('hidden');

  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td'); tdName.textContent = u.name || '—';
    const tdLogin = document.createElement('td'); tdLogin.textContent = u.username || '—';
    const tdPass = document.createElement('td'); tdPass.textContent = u.password || '—'; tdPass.classList.add('mono');
    const tdBal = document.createElement('td'); tdBal.classList.add('num');
    const b = (u.balance || 0);
    const badge = document.createElement('span');
    badge.className = 'badge' + (b <= 0 ? ' zero' : '');
    badge.textContent = fmt(b);
    tdBal.appendChild(badge);
    const tdItems = document.createElement('td'); tdItems.classList.add('num'); tdItems.textContent = (u.items || []).length;

    const tdDate = document.createElement('td');
    try { tdDate.textContent = new Date(u.created).toLocaleString('ru-RU'); } catch (e) { tdDate.textContent = '—'; }

    const tdActs = document.createElement('td'); tdActs.classList.add('actions');
    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn small';
    btnAdd.textContent = 'Начислить';
    btnAdd.onclick = () => openBalance(u.username, 'Начислить', 'add');
    const btnDel = document.createElement('button');
    btnDel.className = 'btn small danger';
    btnDel.textContent = 'Удалить';
    btnDel.onclick = () => removeUser(u);
    tdActs.appendChild(btnAdd);
    tdActs.appendChild(btnDel);

    tr.appendChild(tdName); tr.appendChild(tdLogin); tr.appendChild(tdPass);
    tr.appendChild(tdBal); tr.appendChild(tdItems); tr.appendChild(tdDate);
    tr.appendChild(tdActs);
    tbody.appendChild(tr);
  });
}

function openBalance(username, title, action) {
  currentUsername = username;
  currentAction = action;
  const u = users.find(x => x.username === username);
  $('targetUser').textContent = `${u.name} (@${u.username}) — текущий баланс: ${fmt(u.balance)}`;
  $('formAdd').classList.add('hidden');
  $('formBalance').classList.remove('hidden');
  $('modalTitle').textContent = title;
  $('fAmount').value = '';
  setSeg(action);
  $('overlay').classList.remove('hidden');
  $('fAmount').focus();
}

function openAdd() {
  currentUsername = null;
  $('fName').value = ''; $('fUsername').value = ''; $('fPassword').value = ''; $('fBalance').value = '1000';
  $('formBalance').classList.add('hidden');
  $('formAdd').classList.remove('hidden');
  $('modalTitle').textContent = 'Новый аккаунт';
  $('overlay').classList.remove('hidden');
  $('fName').focus();
}

function closeModal() {
  $('overlay').classList.add('hidden');
}

function setSeg(a) {
  currentAction = a;
  $('segAdd').classList.toggle('active', a === 'add');
  $('segRemove').classList.toggle('active', a === 'remove');
}

async function applyBalance() {
  const val = parseFloat($('fAmount').value);
  if (!currentUsername || isNaN(val) || val <= 0) return;
  const delta = currentAction === 'add' ? val : -val;
  const u = users.find(x => x.username === currentUsername);
  u.balance = Math.max(0, (u.balance || 0) + delta);
  await saveAndClose(`${u.name}: баланс ${currentAction === 'add' ? '+' : '-'}${val} ₸`);
}

async function createUser() {
  const name = $('fName').value.trim();
  const username = $('fUsername').value.trim().toLowerCase();
  const password = $('fPassword').value;
  const balance = Math.max(0, parseInt($('fBalance').value) || 0);
  if (!name || !username || !password) { toast('Заполните имя, логин и пароль', true); return; }
  if (users.some(u => u.username === username)) { toast('Такой логин уже существует', true); return; }
  users.push({ username, name, password, balance, items: [], created: new Date().toISOString() });
  await saveAndClose('Аккаунт создан');
}

async function removeUser(u) {
  if (!confirm(`Удалить аккаунт ${u.name} (@${u.username})?`)) return;
  users = users.filter(x => x.username !== u.username);
  await saveAndClose('Аккаунт удалён');
}

async function saveAndClose(msg) {
  try {
    await window.adminAPI.saveUsers(users);
    render();
    closeModal();
    toast(msg);
  } catch (e) {
    toast('Ошибка сохранения: ' + e.message, true);
  }
}

$('btnRefresh').onclick = load;
$('btnAdd').onclick = openAdd;
$('btnCreate').onclick = createUser;
$('btnApply').onclick = applyBalance;
$('btnCancel').onclick = closeModal;
$('btnCancel2').onclick = closeModal;
$('segAdd').onclick = () => setSeg('add');
$('segRemove').onclick = () => setSeg('remove');

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !$('overlay').classList.contains('hidden')) {
    if (!$('formBalance').classList.contains('hidden')) applyBalance();
    else if (!$('formAdd').classList.contains('hidden')) createUser();
  }
});

load();