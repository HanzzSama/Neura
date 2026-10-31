/**
 * public/js/app-ui.js
 * ===================
 * Core UI components:
 * - Toast notification system
 * - Dynamic Island visual state & timer
 * - Backend model status polling
 * - Theme switcher (Dark / Light)
 * - User dot menu
 * - Sidebar collapsible navigation
 * - Network connectivity detection & offline banner
 * - Common HTML/fetch helpers
 */

// --------------------------------------------------------------------------
// Utility Helpers
// --------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchJSON(url, method = 'GET', body = null, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const opts = { 
      method, 
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch((window.API || '') + url, opts);
    clearTimeout(timer);
    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (_) {}
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`Permintaan ke ${url} melebihi batas waktu (timeout). Silakan coba lagi.`);
    }
    throw err;
  }
}

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const box = document.getElementById('toast-box');
  if (!box) return;

  const toast = document.createElement('div');
  toast.className = 'claude-toast';

  let iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  if (type === 'success') {
    iconSvg = `<svg style="color:var(--accent-green)" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg style="color:var(--accent-red)" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  box.appendChild(toast);
  const duration = parseInt(localStorage.getItem('neura_toast_duration')) || 3500;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// --------------------------------------------------------------------------
// Dynamic Greeting
// --------------------------------------------------------------------------
function setupGreeting() {
  const hour = new Date().getHours();
  const lang = typeof getAppLanguage === 'function' ? getAppLanguage() : 'id';
  const t = (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS[lang]) || (window.APP_TRANSLATIONS && window.APP_TRANSLATIONS.id) || {};
  let text = t.greet_night || 'Selamat malam';
  if (hour >= 5 && hour < 12) text = t.greet_morning || 'Selamat pagi';
  else if (hour >= 12 && hour < 17) text = t.greet_afternoon || 'Selamat siang';
  else if (hour >= 17 && hour < 22) text = t.greet_evening || 'Selamat sore';

  const greetingEl = document.getElementById('hero-greeting-text');
  if (greetingEl) greetingEl.textContent = text;
}

// --------------------------------------------------------------------------
// Theme Switching
// --------------------------------------------------------------------------
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('neura_theme_v1', next); } catch (e) { }
  showToast(`Switched to ${next === 'dark' ? 'Obsidian Dark' : 'Warm Linen'} mode`, 'info');
  syncDotMenuState();
}

// --------------------------------------------------------------------------
// Sidebar Controls
// --------------------------------------------------------------------------
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('open-sidebar-btn');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  if (openBtn) {
    if (sidebar.classList.contains('collapsed')) {
      openBtn.style.display = 'grid';
    } else {
      openBtn.style.display = window.innerWidth <= 768 ? 'grid' : 'none';
    }
  }
}

// --------------------------------------------------------------------------
// 3-Dot User Context Menu
// --------------------------------------------------------------------------
function syncDotMenuState() {
  const lang = typeof getAppLanguage === 'function' ? getAppLanguage() : 'id';
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  const badge = document.getElementById('dot-lang-badge');
  if (badge) badge.textContent = lang === 'en' ? 'EN' : 'ID';

  const langLabel = document.getElementById('dot-lang-label');
  if (langLabel) langLabel.textContent = lang === 'en' ? 'Switch to ID' : 'Ganti Bahasa';

  const themeLabel = document.getElementById('dot-theme-label');
  if (themeLabel) themeLabel.textContent = isDark
    ? (lang === 'en' ? 'Light Mode' : 'Mode Terang')
    : (lang === 'en' ? 'Dark Mode' : 'Mode Gelap');

  const themeIcon = document.getElementById('dot-theme-icon');
  if (themeIcon) {
    themeIcon.innerHTML = isDark
      ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`
      : `<circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
  }
}

function toggleUserDotMenu(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const popup = document.getElementById('user-dot-popup');
  const trigger = document.getElementById('user-dot-trigger');
  if (!popup) return;

  const isOpen = popup.classList.contains('open');
  if (isOpen) {
    closeUserDotMenu();
  } else {
    syncDotMenuState();
    popup.classList.add('open');
    if (trigger) {
      trigger.classList.add('active');
      trigger.setAttribute('aria-expanded', 'true');
    }
  }
}

function closeUserDotMenu() {
  const popup = document.getElementById('user-dot-popup');
  const trigger = document.getElementById('user-dot-trigger');
  if (popup) popup.classList.remove('open');
  if (trigger) {
    trigger.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
  }
}

document.addEventListener('click', function (e) {
  const menu = document.getElementById('user-dot-menu');
  if (menu && !menu.contains(e.target)) closeUserDotMenu();
});

// --------------------------------------------------------------------------
// Server Status Polling & UI Sync
// --------------------------------------------------------------------------
async function fetchModelStatus(isUserTriggered = false) {
  try {
    const data = await fetchJSON('/api/status');
    window.activeModelData = data;
    updateUIModelStatus(data);
    if (isUserTriggered && typeof renderStatusOutput === 'function') {
      renderStatusOutput(data);
    }
  } catch (err) {
    const dot = document.getElementById('sb-status-dot');
    const text = document.getElementById('sb-status-text');
    if (dot) dot.className = 'status-dot dot-offline';
    if (text) text.textContent = 'Offline';
  }
}

function updateUIModelStatus(data) {
  const dot = document.getElementById('sb-status-dot');
  const text = document.getElementById('sb-status-text');
  const badge = document.getElementById('top-model-badge');

  if (data.training_running) {
    if (dot) dot.className = 'status-dot dot-training';
    if (text) text.textContent = 'Training...';
    if (badge) { badge.textContent = 'Training'; badge.style.color = 'var(--accent-terracotta)'; }
  } else if (data.model_ready) {
    if (dot) dot.className = 'status-dot dot-ready';
    if (text) text.textContent = 'Model Ready';
    if (badge) { badge.textContent = 'Ready'; badge.style.color = 'var(--accent-green)'; }
  } else {
    if (dot) dot.className = 'status-dot dot-offline';
    if (text) text.textContent = 'No Checkpoint';
    if (badge) { badge.textContent = 'Not Trained'; badge.style.color = 'var(--text-muted)'; }
  }

  const islandStat = document.getElementById('island-stat-status');
  const islandStatBox = document.getElementById('island-stat-box-status');
  const islandEnv = document.getElementById('island-env-tag');

  if (islandStat) {
    if (data.training_running) {
      islandStat.textContent = 'Training';
      islandStat.style.color = 'var(--accent-terracotta)';
    } else if (data.model_ready && data.metrics && data.metrics.accuracy) {
      islandStat.textContent = (data.metrics.accuracy * 100).toFixed(1) + '%';
      islandStat.style.color = '#4ade80';
    } else if (data.model_ready) {
      islandStat.textContent = 'Ready';
      islandStat.style.color = '#4ade80';
    } else {
      islandStat.textContent = 'N/A';
      islandStat.style.color = '#f87171';
    }
  }

  if (islandStatBox) {
    islandStatBox.classList.remove('stat-green', 'stat-orange', 'stat-default');
    islandStatBox.classList.add(data.training_running ? 'stat-orange' : data.model_ready ? 'stat-green' : 'stat-default');
  }

  if (islandEnv) {
    const mName = data.model_name || 'Alzheimer';
    const eName = data.environment || 'development';
    const shortEnv = eName === 'development' ? 'dev' : eName;
    const shortM = mName.length > 16 ? mName.slice(0, 15) + '…' : mName;
    islandEnv.textContent = `${shortM} \u2022 ${shortEnv}`;
    islandEnv.title = `${mName} \u2022 ${eName}`;
  }

  if (window.currentIslandState === 'ready' || window.currentIslandState === 'idle') {
    if (data.training_running) {
      setDynamicIslandState('training', { sub: 'Training active in background...', main: 'Training...' });
    } else {
      const subEl = document.getElementById('island-sub-text');
      const mainEl = document.getElementById('island-main-text');
      if (subEl) subEl.textContent = data.model_ready ? 'XGBoost \u2022 32 Biomarkers' : 'No Model Checkpoint';
      if (mainEl) mainEl.textContent = data.model_ready ? 'Ready' : 'Idle';
      if (!data.model_ready) {
        setDynamicIslandState('idle', { sub: 'No Model Checkpoint \u2022 Standby', main: 'Idle' });
      }
    }
  }

  const mName = document.getElementById('modal-model-name');
  const mEnv = document.getElementById('modal-env');
  const mCp = document.getElementById('modal-checkpoint');
  const mStat = document.getElementById('modal-status');
  if (mName) mName.textContent = data.model_name || 'Alzheimer';
  if (mEnv) mEnv.textContent = data.environment || 'development';
  if (mCp) mCp.textContent = data.checkpoint || 'public/checkpoints/xgboost_alzheimers.json';
  if (mStat) {
    mStat.textContent = data.model_ready ? 'Ready' : 'Not Trained';
    mStat.style.color = data.model_ready ? 'var(--accent-green)' : 'var(--accent-red)';
  }
}

// --------------------------------------------------------------------------
// Dynamic Island Interactive State & Timer Manager
// --------------------------------------------------------------------------
let islandTimerInterval = null;
let islandStartTime = null;
let currentIslandState = 'ready';
window.currentIslandState = currentIslandState;

function formatElapsedTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function startIslandTimer() {
  stopIslandTimer(0);
  islandStartTime = Date.now();
  const timerEl = document.getElementById('island-timer');
  if (timerEl) {
    timerEl.style.display = 'inline-block';
    timerEl.textContent = '00:00.0';
  }
  islandTimerInterval = setInterval(() => {
    if (!islandStartTime) return;
    const elapsed = Date.now() - islandStartTime;
    if (timerEl) timerEl.textContent = formatElapsedTime(elapsed);
  }, 100);
}

function stopIslandTimer(keepVisibleMs = 3500) {
  if (islandTimerInterval) {
    clearInterval(islandTimerInterval);
    islandTimerInterval = null;
  }
  const timerEl = document.getElementById('island-timer');
  if (!timerEl) return;
  if (keepVisibleMs > 0) {
    setTimeout(() => {
      if (currentIslandState === 'ready') {
        timerEl.style.display = 'none';
      }
    }, keepVisibleMs);
  } else {
    timerEl.style.display = 'none';
  }
}

function setDynamicIslandState(state, options = {}) {
  currentIslandState = state;
  window.currentIslandState = state;
  const island = document.getElementById('dynamic-island');
  const subEl = document.getElementById('island-sub-text');
  const mainEl = document.getElementById('island-main-text');

  if (!island || !subEl || !mainEl) return;

  island.classList.remove(
    'theme-orange', 'theme-purple', 'theme-green', 'theme-default',
    'is-thinking', 'is-training', 'is-ready'
  );

  switch (state) {
    case 'thinking':
      island.classList.add('theme-orange', 'is-thinking');
      subEl.textContent = options.sub || 'Matching clinical intent \u2022 chat_dataset.py';
      mainEl.textContent = options.main || 'Thinking';
      startIslandTimer();
      break;

    case 'generating':
      island.classList.add('theme-orange', 'is-thinking');
      subEl.textContent = options.sub || 'Synthesizing response \u2022 Alzheimer';
      mainEl.textContent = options.main || 'Generating';
      break;

    case 'training':
      island.classList.add('theme-orange', 'is-training');
      subEl.textContent = options.sub || 'Training XGBoost \u2022 Gradient Boosted Trees';
      mainEl.textContent = options.main || 'Training...';
      if (!islandTimerInterval) startIslandTimer();
      break;

    case 'predicting':
      island.classList.add('theme-purple', 'is-thinking');
      subEl.textContent = options.sub || 'Evaluating 32 Biomarkers \u2022 Clinical Inference';
      mainEl.textContent = options.main || 'Diagnosing';
      startIslandTimer();
      break;

    case 'evaluating':
      island.classList.add('theme-green', 'is-thinking');
      subEl.textContent = options.sub || 'Evaluating test metrics \u2022 430 patient records';
      mainEl.textContent = options.main || 'Evaluating';
      startIslandTimer();
      break;

    case 'idle':
      island.classList.add('theme-default');
      subEl.textContent = options.sub || "Alzheimer's AI \u2022 Standby";
      mainEl.textContent = options.main || 'Idle';
      stopIslandTimer(options.keepTimer ? 3500 : 0);
      break;

    case 'ready':
    default:
      island.classList.add('theme-green', 'is-ready');
      subEl.textContent = options.sub || "Alzheimer's AI \u2022 32 Clinical Biomarkers";
      mainEl.textContent = options.main || 'Ready';
      stopIslandTimer(options.keepTimer ? 3500 : 0);
      break;
  }
}

function handleIslandClick() {
  if (currentIslandState === 'training') {
    const prog = document.getElementById('live-progress-container');
    if (prog) {
      prog.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }
  openModelModal();
}

function openModelModal() {
  const el = document.getElementById('model-modal');
  if (el) el.classList.add('open');
}

function closeModelModal() {
  const el = document.getElementById('model-modal');
  if (el) el.classList.remove('open');
}

function closeModelModalOnBackdrop(e) {
  if (e.target && e.target.id === 'model-modal') closeModelModal();
}

// --------------------------------------------------------------------------
// Internet Connectivity Detection
// --------------------------------------------------------------------------
let _isOnline = navigator.onLine;
let _offlineBannerHideTimer = null;

function initConnectivity() {
  window.addEventListener('online', () => setOnlineState(true));
  window.addEventListener('offline', () => setOnlineState(false));
  setInterval(heartbeatCheck, 15000);
  heartbeatCheck();
}

async function heartbeatCheck() {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('/api/status', { signal: controller.signal });
    clearTimeout(tid);
    setOnlineState(res.ok);
  } catch {
    setOnlineState(false);
  }
}

function setOnlineState(isOnline) {
  if (_isOnline === isOnline) return;
  const wasOnline = _isOnline;
  _isOnline = isOnline;
  window._isOnline = isOnline;

  const banner = document.getElementById('offline-banner');
  const bannerText = document.getElementById('offline-banner-text');
  const bannerIcon = document.getElementById('offline-banner-icon');

  if (banner) {
    clearTimeout(_offlineBannerHideTimer);

    if (!isOnline) {
      banner.classList.remove('is-online');
      if (bannerText) bannerText.textContent = 'Tidak ada koneksi internet';
      if (bannerIcon) bannerIcon.innerHTML = `
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      `;
      banner.classList.add('visible');
    } else {
      banner.classList.add('is-online');
      if (bannerText) bannerText.textContent = 'Koneksi pulih — Neura siap!';
      if (bannerIcon) bannerIcon.innerHTML = `
        <path d="M1.42 9a15.91 15.91 0 0 1 21.16 0"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 14 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <line x1="12" y1="20" x2="12.01" y2="20"/>
      `;
      banner.classList.add('visible');
      _offlineBannerHideTimer = setTimeout(() => {
        banner.classList.remove('visible', 'is-online');
      }, 2800);
    }
  }

  const inputArea = document.querySelector('.chat-input-area');
  if (inputArea) {
    inputArea.classList.toggle('is-offline', !isOnline);
  }
  const textarea = document.getElementById('chat-input-textarea');
  const sendBtn = document.getElementById('send-msg-btn');
  if (textarea) textarea.disabled = !isOnline;
  if (sendBtn) sendBtn.disabled = !isOnline;

  if (!isOnline) {
    _appendSystemNotice(
      'offline',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      'Koneksi terputus. Periksa jaringan Anda.'
    );
    if (typeof setDynamicIslandState === 'function') {
      setDynamicIslandState('idle', { sub: 'Offline', main: 'No connection' });
    }
  } else if (wasOnline === false) {
    _appendSystemNotice(
      'online',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      'Koneksi pulih — Neura siap!'
    );
  }
}

function _appendSystemNotice(type, iconSvg, message) {
  const container = document.getElementById('chat-content-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `system-notice ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

// Window exports
window.escapeHtml = escapeHtml;
window.fetchJSON = fetchJSON;
window.showToast = showToast;
window.setupGreeting = setupGreeting;
window.toggleTheme = toggleTheme;
window.toggleSidebar = toggleSidebar;
window.syncDotMenuState = syncDotMenuState;
window.toggleUserDotMenu = toggleUserDotMenu;
window.closeUserDotMenu = closeUserDotMenu;
window.fetchModelStatus = fetchModelStatus;
window.updateUIModelStatus = updateUIModelStatus;
window.setDynamicIslandState = setDynamicIslandState;
window.handleIslandClick = handleIslandClick;
window.openModelModal = openModelModal;
window.closeModelModal = closeModelModal;
window.closeModelModalOnBackdrop = closeModelModalOnBackdrop;
window.initConnectivity = initConnectivity;
window.setOnlineState = setOnlineState;
