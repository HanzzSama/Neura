/**
 * public/js/app-admin-panels.js
 * ==============================
 * Admin-only panels: Database Viewer, Statistik & Analytics, File Explorer
 */

// ============================================================
// Room Switching — shows panels inside main-view
// ============================================================
const ADMIN_ROOMS = {
  nakes:    'admin-room-nakes',
  database: 'admin-room-database',
  stats:    'admin-room-stats',
  explorer: 'admin-room-explorer',
};

function switchAdminRoom(roomKey) {
  const mainView = document.querySelector('.main-view');
  // Hide all admin rooms
  Object.values(ADMIN_ROOMS).forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }
  });
  if (roomKey === 'chat' || !ADMIN_ROOMS[roomKey]) {
    if (mainView) mainView.classList.remove('admin-room-active');
    // Highlight no sidebar item as active
    document.querySelectorAll('#sidebar-nakes-admin-link,#sidebar-database-link,#sidebar-stats-link,#sidebar-files-link').forEach(el => el.classList.remove('active'));
    return;
  }
  const roomEl = document.getElementById(ADMIN_ROOMS[roomKey]);
  if (roomEl) { roomEl.style.display = 'flex'; roomEl.setAttribute('aria-hidden', 'false'); }
  if (mainView) mainView.classList.add('admin-room-active');
  // Highlight active sidebar item
  const sidebarMap = {
    nakes:    'sidebar-nakes-admin-link',
    database: 'sidebar-database-link',
    stats:    'sidebar-stats-link',
    explorer: 'sidebar-files-link'
  };
  document.querySelectorAll('#sidebar-nakes-admin-link,#sidebar-database-link,#sidebar-stats-link,#sidebar-files-link').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(sidebarMap[roomKey]);
  if (activeNav) activeNav.classList.add('active');

  // Automatically load data when switching rooms
  if (roomKey === 'nakes') {
    if (typeof switchNakesAdminView === 'function') switchNakesAdminView('table');
    if (typeof fetchAndRenderNakesTable === 'function') fetchAndRenderNakesTable();
  } else if (roomKey === 'database') {
    loadDatabaseCollections();
  } else if (roomKey === 'stats') {
    loadStatistics();
  } else if (roomKey === 'explorer') {
    _initExplorerView();
  }
}
window.switchAdminRoom = switchAdminRoom;

// ============================================================
// DATABASE ROOM
// ============================================================
let _dbCurrentCollection = null;
let _dbAllDocs = [];

function openDatabaseModal() {
  switchAdminRoom('database');
  loadDatabaseCollections();
}
function closeDatabaseModal() { switchAdminRoom('chat'); }
function closeDatabaseModalOnBackdrop(e) {}


async function loadDatabaseCollections() {
  const listEl = document.getElementById('db-collection-list');
  if (!listEl) return;
  listEl.innerHTML = '<div class="db-loading-state"><div class="db-spinner"></div><span>Loading...</span></div>';
  try {
    const db = firebase.firestore();
    const knownCollections = ['users', 'nakes', 'consultations', 'predictions', 'ml_logs', 'sessions'];
    const results = [];
    for (const name of knownCollections) {
      try {
        const snap = await db.collection(name).limit(1).get();
        if (!snap.empty || snap !== undefined) results.push({ name });
      } catch (_) {}
    }
    if (results.length === 0) {
      listEl.innerHTML = '<div class="db-loading-state"><span>Tidak ada collection yang dapat diakses.</span></div>';
      return;
    }
    listEl.innerHTML = results.map(c => `
      <div class="db-collection-item" onclick="loadDbCollection('${c.name}')" data-col="${c.name}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        <span>${c.name}</span>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = `<div class="db-loading-state"><span>Error: ${err.message}</span></div>`;
  }
}

window.refreshDatabaseCollections = loadDatabaseCollections;

async function loadDbCollection(name) {
  _dbCurrentCollection = name;
  document.querySelectorAll('.db-collection-item').forEach(el => {
    el.classList.toggle('active', el.dataset.col === name);
  });
  const tableWrap = document.getElementById('db-table-wrap');
  const breadcrumb = document.getElementById('db-breadcrumb');
  const countEl = document.getElementById('db-doc-count');
  if (breadcrumb) breadcrumb.textContent = name;
  if (tableWrap) tableWrap.innerHTML = '<div class="db-loading-state"><div class="db-spinner"></div><span>Loading documents...</span></div>';
  try {
    const db = firebase.firestore();
    const snap = await db.collection(name).limit(100).get();
    _dbAllDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (countEl) countEl.textContent = `${_dbAllDocs.length} dokumen`;
    renderDbTable(_dbAllDocs);
  } catch (err) {
    if (tableWrap) tableWrap.innerHTML = `<div class="db-empty-state"><p>Error: ${err.message}</p></div>`;
  }
}
window.loadDbCollection = loadDbCollection;

function renderDbTable(docs) {
  const tableWrap = document.getElementById('db-table-wrap');
  if (!tableWrap) return;
  if (docs.length === 0) {
    tableWrap.innerHTML = '<div class="db-empty-state"><p>Tidak ada dokumen ditemukan.</p></div>';
    return;
  }
  const firstDoc = docs[0];
  const priority = ['displayName', 'email', 'role', 'createdAt', 'name'];
  const allKeys = Object.keys(firstDoc).filter(k => k !== 'id');
  const orderedKeys = ['id', ...priority.filter(k => allKeys.includes(k)), ...allKeys.filter(k => !priority.includes(k))].slice(0, 8);

  const formatVal = (key, val) => {
    if (val === null || val === undefined) return '<span style="color:var(--text-muted)">null</span>';
    if (typeof val === 'object' && val.seconds) {
      return new Date(val.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (key === 'role') {
      const cls = val === 'admin' ? 'db-badge--admin' : val === 'nakes' ? 'db-badge--nakes' : 'db-badge--user';
      return `<span class="db-badge ${cls}">${val}</span>`;
    }
    const s = String(val);
    return s.length > 40 ? s.slice(0, 38) + '...' : s;
  };

  tableWrap.innerHTML = `
    <table class="db-table">
      <thead><tr>${orderedKeys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
      <tbody>${docs.map(doc => `<tr>${orderedKeys.map(k => `<td class="${k === 'id' ? 'db-id-cell' : ''}" title="${String(doc[k] ?? '')}">${formatVal(k, doc[k])}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

window.filterDbDocuments = function(query) {
  const q = query.toLowerCase();
  const filtered = _dbAllDocs.filter(doc => Object.values(doc).some(v => String(v ?? '').toLowerCase().includes(q)));
  const countEl = document.getElementById('db-doc-count');
  if (countEl) countEl.textContent = `${filtered.length} / ${_dbAllDocs.length} dokumen`;
  renderDbTable(filtered);
};

window.switchToDbCollection = function(name) {
  switchAdminRoom('database');
  setTimeout(() => loadDbCollection(name), 350);
};

// ============================================================
// STATISTICS ROOM
// ============================================================
function openStatisticsModal() {
  switchAdminRoom('stats');
  loadStatistics();
}
function closeStatisticsModal() { switchAdminRoom('chat'); }
function closeStatisticsModalOnBackdrop(e) {}
window.loadStatisticsRoom = loadStatistics;

async function loadStatistics() {
  try {
    const db = firebase.firestore();
    const usersSnap = await db.collection('users').get();
    const totalUsers = usersSnap.size;
    let totalNakes = 0, totalConsult = 0, totalPredict = 0;
    try { totalNakes = (await db.collection('nakes').get()).size; } catch (_) {}
    try { totalConsult = (await db.collection('consultations').get()).size; } catch (_) {}
    try { totalPredict = (await db.collection('predictions').get()).size; } catch (_) {}

    _animateCounter('stat-total-users', totalUsers);
    _animateCounter('stat-val-users', totalUsers);
    _animateCounter('stat-total-nakes', totalNakes);
    _animateCounter('stat-val-nakes', totalNakes);
    _animateCounter('stat-total-consult', totalConsult);
    _animateCounter('stat-val-consults', totalConsult);
    _animateCounter('stat-total-predict', totalPredict);
    _animateCounter('stat-val-predictions', totalPredict);
    _drawDonut(totalUsers, totalNakes);
    _drawBarChart(usersSnap.docs);
    _renderRecentRegistrations(usersSnap.docs);
  } catch (err) {
    console.error('Stats error:', err);
  }
}

function _animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 40) || 1;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString('id-ID');
    if (current >= target) clearInterval(timer);
  }, 25);
}

function _drawDonut(users, nakes) {
  const total = users + nakes;
  if (total === 0) return;
  const circumference = 2 * Math.PI * 48;
  const userLen = (users / total) * circumference;
  const nakesLen = (nakes / total) * circumference;
  const usersArc = document.getElementById('donut-users-arc');
  const nakesArc = document.getElementById('donut-nakes-arc');
  if (usersArc) {
    usersArc.setAttribute('stroke-dasharray', `${userLen.toFixed(1)} ${(circumference - userLen).toFixed(1)}`);
    usersArc.setAttribute('stroke-dashoffset', '75.4');
  }
  if (nakesArc) {
    const offset = ((circumference - userLen) + 75.4) % circumference;
    nakesArc.setAttribute('stroke-dasharray', `${nakesLen.toFixed(1)} ${(circumference - nakesLen).toFixed(1)}`);
    nakesArc.setAttribute('stroke-dashoffset', offset.toFixed(1));
  }
  const legend = document.getElementById('stats-donut-legend');
  if (legend) {
    legend.innerHTML = `
      <div class="stats-legend-item"><span class="stats-legend-dot" style="background:#e07a5f"></span>Pasien (${users})</div>
      <div class="stats-legend-item"><span class="stats-legend-dot" style="background:#2a9d8f"></span>Nakes (${nakes})</div>`;
  }
}

function _drawBarChart(docs) {
  const barEl = document.getElementById('stats-bar-chart');
  if (!barEl) return;
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleString('id-ID', { month: 'short' }), key: `${d.getFullYear()}-${d.getMonth()}`, count: 0 });
  }
  docs.forEach(doc => {
    const ts = doc.data().createdAt;
    if (!ts) return;
    const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const m = months.find(m => m.key === key);
    if (m) m.count++;
  });
  const maxCount = Math.max(...months.map(m => m.count), 1);
  barEl.innerHTML = months.map(m => {
    const pct = Math.max((m.count / maxCount) * 100, 4);
    return `<div class="stats-bar-group">
      <span class="stats-bar-val">${m.count}</span>
      <div class="stats-bar" style="height:${pct}%"></div>
      <span class="stats-bar-label">${m.label}</span>
    </div>`;
  }).join('');
}

function _renderRecentRegistrations(docs) {
  const tableEl = document.getElementById('stats-recent-table');
  if (!tableEl) return;
  const sorted = [...docs].sort((a, b) => (b.data().createdAt?.seconds ?? 0) - (a.data().createdAt?.seconds ?? 0)).slice(0, 8);
  tableEl.innerHTML = `<table class="stats-recent-list">
    <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Terdaftar</th></tr></thead>
    <tbody>${sorted.map(doc => {
      const d = doc.data();
      const role = d.role || 'user';
      const cls = role === 'admin' ? 'db-badge--admin' : role === 'nakes' ? 'db-badge--nakes' : 'db-badge--user';
      const ts = d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '---';
      return `<tr><td>${d.displayName || d.name || '---'}</td><td>${d.email || '---'}</td><td><span class="db-badge ${cls}">${role}</span></td><td>${ts}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ============================================================
// FILE EXPLORER MODAL
// ============================================================
const FILE_TREE = [
  { name: 'public', type: 'folder', children: [
    { name: 'assets', type: 'folder', children: [{ name: 'logo.png', type: 'img' }, { name: 'favicon.ico', type: 'file' }] },
    { name: 'css', type: 'folder', children: [{ name: 'style.css', type: 'css' }, { name: 'welcome.css', type: 'css' }, { name: 'smooth-scroll.css', type: 'css' }] },
    { name: 'js', type: 'folder', children: [
      { name: 'app.js', type: 'js' }, { name: 'app-core.js', type: 'js' }, { name: 'app-auth.js', type: 'js' },
      { name: 'app-chat.js', type: 'js' }, { name: 'app-settings.js', type: 'js' }, { name: 'app-ui.js', type: 'js' },
      { name: 'app-ml-commands.js', type: 'js' }, { name: 'app-translations.js', type: 'js' },
      { name: 'app-voice-input.js', type: 'js' }, { name: 'app-user.js', type: 'js' },
      { name: 'app-user-profile.js', type: 'js' }, { name: 'app-user-predict.js', type: 'js' },
      { name: 'app-user-consultation.js', type: 'js' }, { name: 'app-user-history.js', type: 'js' },
      { name: 'app-user-voice.js', type: 'js' }, { name: 'app-nakes.js', type: 'js' },
      { name: 'app-nakes-auth.js', type: 'js' }, { name: 'app-nakes-lookup.js', type: 'js' },
      { name: 'app-nakes-patient.js', type: 'js' }, { name: 'app-nakes-validate.js', type: 'js' },
      { name: 'app-nakes-history.js', type: 'js' }, { name: 'app-admin.js', type: 'js' },
      { name: 'app-admin-auth.js', type: 'js' }, { name: 'app-admin-ml.js', type: 'js' },
      { name: 'app-admin-nakes.js', type: 'js' }, { name: 'app-admin-history.js', type: 'js' },
      { name: 'app-admin-panels.js', type: 'js' }, { name: 'auth-guard.js', type: 'js' },
      { name: 'auth-hero.js', type: 'js' }, { name: 'firebase-config.js', type: 'js' },
      { name: 'dynamic-island.js', type: 'js' }, { name: 'page-transition.js', type: 'js' },
      { name: 'smooth-scroll.js', type: 'js' }, { name: 'voice-consultation.js', type: 'js' },
      { name: 'welcome.js', type: 'js' }, { name: 'about_app.js', type: 'js' },
    ]},
    { name: 'index.html', type: 'html' }, { name: 'welcome.html', type: 'html' }, { name: 'verify-email.html', type: 'html' },
  ]},
  { name: 'server', type: 'folder', children: [
    { name: 'api', type: 'folder', children: [{ name: 'auth.js', type: 'js' }, { name: 'predict.js', type: 'js' }, { name: 'train.js', type: 'js' }] },
    { name: 'middleware', type: 'folder', children: [{ name: 'authMiddleware.js', type: 'js' }, { name: 'rateLimiter.js', type: 'js' }] },
    { name: 'utils', type: 'folder', children: [{ name: 'firestore.js', type: 'js' }, { name: 'logger.js', type: 'js' }] },
    { name: 'index.js', type: 'js' }, { name: 'package.json', type: 'json' }, { name: 'server.py', type: 'file' },
  ]},
  { name: 'ml', type: 'folder', children: [
    { name: 'model', type: 'folder', children: [{ name: 'neura_model.pkl', type: 'file' }, { name: 'scaler.pkl', type: 'file' }] },
    { name: 'notebooks', type: 'folder', children: [{ name: 'training.ipynb', type: 'file' }, { name: 'evaluation.ipynb', type: 'file' }] },
    { name: 'train.py', type: 'file' }, { name: 'predict.py', type: 'file' }, { name: 'requirements.txt', type: 'file' },
  ]},
  { name: '.env', type: 'file' }, { name: 'package.json', type: 'json' }, { name: 'README.md', type: 'md' },
];

const QUICK_ACCESS = [
  { name: 'Neura Project', path: [] },
  { name: 'public/js', path: ['public', 'js'] },
  { name: 'public/css', path: ['public', 'css'] },
  { name: 'server', path: ['server'] },
  { name: 'ml', path: ['ml'] },
];

let _explorerCurrentPath = [];
let _explorerHistory = [[]];
let _explorerHistoryIdx = 0;
let _explorerViewMode = 'list';

function _initExplorerView() {
  _explorerCurrentPath = [];
  _explorerHistory = [[]];
  _explorerHistoryIdx = 0;
  _renderExplorerTree();
  _renderExplorerContent(FILE_TREE);
  _renderQuickAccess();
  _updateExplorerAddress();
  _updateNavButtons();
}
function openFileExplorerModal() {
  switchAdminRoom('explorer');
}
function closeFileExplorerModal() { switchAdminRoom('chat'); }
function closeFileExplorerModalOnBackdrop(e) {
  if (e.target.id === 'file-explorer-modal') closeFileExplorerModal();
}

function _getItemIcon(type, isFolder, size) {
  size = size || 15;
  if (isFolder || type === 'folder') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#fbbf24" stroke="none" class="item-icon-folder"><path d="M10 4H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/></svg>`;
  }
  const ext = type;
  if (ext === 'js') return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" class="item-icon-js"><rect width="16" height="16" rx="2" fill="rgba(247,223,30,0.15)" stroke="#f7df1e" stroke-width="1"/><text x="2" y="12" font-size="7" fill="#f7df1e" font-weight="bold" font-family="monospace">JS</text></svg>`;
  if (ext === 'css') return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" class="item-icon-css"><rect width="16" height="16" rx="2" fill="rgba(38,77,228,0.12)" stroke="#264de4" stroke-width="1"/><text x="1" y="12" font-size="6" fill="#264de4" font-weight="bold" font-family="monospace">CSS</text></svg>`;
  if (ext === 'html') return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" class="item-icon-html"><rect width="16" height="16" rx="2" fill="rgba(227,79,38,0.12)" stroke="#e34f26" stroke-width="1"/><text x="1" y="12" font-size="5.5" fill="#e34f26" font-weight="bold" font-family="monospace">HTML</text></svg>`;
  if (ext === 'json') return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" class="item-icon-json"><rect width="16" height="16" rx="2" fill="rgba(107,114,128,0.1)" stroke="#6b7280" stroke-width="1"/><text x="2" y="12" font-size="6.5" fill="#6b7280" font-weight="bold" font-family="monospace">{}</text></svg>`;
  if (ext === 'md') return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" class="item-icon-md"><rect width="16" height="16" rx="2" fill="rgba(75,85,99,0.1)" stroke="#4b5563" stroke-width="1"/><text x="2" y="12" font-size="6.5" fill="#4b5563" font-weight="bold" font-family="monospace">MD</text></svg>`;
  if (ext === 'img') return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.8" class="item-icon-img"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="item-icon-file"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}

function _getNodeByPath(pathArr) {
  if (!pathArr || pathArr.length === 0) return { children: FILE_TREE };
  let nodes = FILE_TREE;
  for (const seg of pathArr) {
    const found = nodes.find(n => n.name === seg);
    if (!found) return null;
    nodes = found.children || [];
  }
  return { children: nodes };
}

function _renderExplorerContent(items, search) {
  search = search || '';
  const pane = document.getElementById('explorer-content-pane');
  const countEl = document.getElementById('explorer-item-count');
  if (!pane) return;
  const filtered = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;
  if (countEl) countEl.textContent = `${filtered.length} item${filtered.length !== 1 ? 's' : ''}`;

  const folders = filtered.filter(i => i.type === 'folder');
  const files = filtered.filter(i => i.type !== 'folder');
  const sorted = [...folders, ...files];

  if (_explorerViewMode === 'list') {
    pane.innerHTML = `<div class="explorer-list-view">
      <div class="explorer-list-header"><span>Nama</span><span>Tipe</span><span>Items</span><span>Ukuran</span></div>
      ${sorted.map(item => `
        <div class="explorer-list-item" onclick="explorerNavigate('${item.name}','${item.type}')">
          <div class="explorer-list-item-name">${_getItemIcon(item.type, item.type === 'folder', 14)}<span>${item.name}</span></div>
          <span class="explorer-item-meta">${item.type === 'folder' ? 'Folder' : item.type.toUpperCase()}</span>
          <span class="explorer-item-meta">${item.type === 'folder' ? (item.children ? item.children.length : 0) + ' items' : ''}</span>
          <span class="explorer-item-meta">${item.type !== 'folder' ? '---' : ''}</span>
        </div>`).join('')}
    </div>`;
  } else {
    pane.innerHTML = `<div class="explorer-grid-view">
      ${sorted.map(item => `
        <div class="explorer-grid-item" onclick="explorerNavigate('${item.name}','${item.type}')">
          ${_getItemIcon(item.type, item.type === 'folder', 36)}
          <span class="explorer-grid-item-name">${item.name}</span>
        </div>`).join('')}
    </div>`;
  }
}

function _renderExplorerTree() {
  const root = document.getElementById('explorer-tree-root');
  if (!root) return;
  root.innerHTML = _buildTreeHTML(FILE_TREE, []);
}

function _buildTreeHTML(nodes, pathArr) {
  return nodes.filter(n => n.type === 'folder').map(node => {
    const path = [...pathArr, node.name];
    const key = path.join('||');
    const hasChildren = node.children && node.children.some(c => c.type === 'folder');
    return `<div class="explorer-tree-item" onclick="explorerTreeClick(event,'${key}')" data-treepath="${key}">
      ${hasChildren ? `<span class="tree-expand-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></span>` : '<span style="width:12px;display:inline-block"></span>'}
      ${_getItemIcon('folder', true, 13)}<span>${node.name}</span>
    </div>
    <div class="explorer-tree-children" id="tc-${key.replace(/\|\|/g, '-')}">
      ${hasChildren ? _buildTreeHTML(node.children, path) : ''}
    </div>`;
  }).join('');
}

function _renderQuickAccess() {
  const qa = document.getElementById('explorer-quick-access');
  if (!qa) return;
  qa.innerHTML = QUICK_ACCESS.map(item => `
    <div class="explorer-tree-item" onclick="explorerJumpTo('${item.path.join('||')}')">
      ${_getItemIcon('folder', true, 13)}<span>${item.name}</span>
    </div>`).join('');
}

window.explorerTreeClick = function(e, key) {
  e.stopPropagation();
  const childrenEl = document.getElementById('tc-' + key.replace(/\|\|/g, '-'));
  const clickedEl = document.querySelector(`[data-treepath="${key}"]`);
  if (clickedEl) clickedEl.classList.toggle('expanded');
  if (childrenEl) childrenEl.classList.toggle('open');
  const pathArr = key ? key.split('||') : [];
  explorerJumpTo(key);
};

window.explorerJumpTo = function(keyOrArr) {
  const pathArr = Array.isArray(keyOrArr) ? keyOrArr : (keyOrArr ? keyOrArr.split('||') : []);
  _explorerCurrentPath = pathArr;
  _explorerHistoryIdx++;
  _explorerHistory = _explorerHistory.slice(0, _explorerHistoryIdx);
  _explorerHistory.push([...pathArr]);
  _updateExplorerAddress();
  const node = _getNodeByPath(pathArr);
  _renderExplorerContent(node ? (node.children || []) : []);
  _updateNavButtons();
};

window.explorerNavigate = function(name, type) {
  if (type !== 'folder') {
    const statusR = document.getElementById('explorer-status-right');
    if (statusR) statusR.textContent = 'Selected: ' + name;
    return;
  }
  explorerJumpTo([..._explorerCurrentPath, name].join('||'));
};

window.explorerGoBack = function() {
  if (_explorerHistoryIdx > 0) {
    _explorerHistoryIdx--;
    _explorerCurrentPath = [...(_explorerHistory[_explorerHistoryIdx] || [])];
    _updateExplorerAddress();
    const node = _getNodeByPath(_explorerCurrentPath);
    _renderExplorerContent(node ? (node.children || []) : []);
    _updateNavButtons();
  }
};
window.explorerGoForward = function() {
  if (_explorerHistoryIdx < _explorerHistory.length - 1) {
    _explorerHistoryIdx++;
    _explorerCurrentPath = [...(_explorerHistory[_explorerHistoryIdx] || [])];
    _updateExplorerAddress();
    const node = _getNodeByPath(_explorerCurrentPath);
    _renderExplorerContent(node ? (node.children || []) : []);
    _updateNavButtons();
  }
};
window.explorerGoUp = function() {
  if (_explorerCurrentPath.length > 0) {
    explorerJumpTo([..._explorerCurrentPath].slice(0, -1).join('||'));
  }
};
window.explorerSearch = function(q) {
  const node = _getNodeByPath(_explorerCurrentPath);
  _renderExplorerContent(node ? (node.children || []) : [], q);
};
window.explorerViewMode = function(mode) {
  _explorerViewMode = mode;
  document.querySelectorAll('.explorer-toolbar-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('explorer-btn-' + mode);
  if (btn) btn.classList.add('active');
  const node = _getNodeByPath(_explorerCurrentPath);
  _renderExplorerContent(node ? (node.children || []) : []);
};
window.explorerExpandAll = function() {
  document.querySelectorAll('.explorer-tree-children').forEach(el => el.classList.add('open'));
  document.querySelectorAll('.explorer-tree-item').forEach(el => el.classList.add('expanded'));
};
window.explorerCollapseAll = function() {
  document.querySelectorAll('.explorer-tree-children').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.explorer-tree-item').forEach(el => el.classList.remove('expanded'));
};

function _updateExplorerAddress() {
  const el = document.getElementById('explorer-address');
  const left = document.getElementById('explorer-status-left');
  const path = ['Neura Project', ..._explorerCurrentPath].join(' > ');
  if (el) el.textContent = path;
  if (left) left.textContent = _explorerCurrentPath.length === 0 ? 'Root project' : _explorerCurrentPath.join('/');
}
function _updateNavButtons() {
  const back = document.getElementById('explorer-back-btn');
  const fwd = document.getElementById('explorer-fwd-btn');
  if (back) back.disabled = _explorerHistoryIdx <= 0;
  if (fwd) fwd.disabled = _explorerHistoryIdx >= _explorerHistory.length - 1;
}

// Expose to window
window.openDatabaseModal = openDatabaseModal;
window.openStatisticsModal = openStatisticsModal;
window.openFileExplorerModal = openFileExplorerModal;
window.closeDatabaseModal = closeDatabaseModal;
window.closeStatisticsModal = closeStatisticsModal;
window.closeFileExplorerModal = closeFileExplorerModal;
window.closeDatabaseModalOnBackdrop = closeDatabaseModalOnBackdrop;
window.closeStatisticsModalOnBackdrop = closeStatisticsModalOnBackdrop;
window.closeFileExplorerModalOnBackdrop = closeFileExplorerModalOnBackdrop;
