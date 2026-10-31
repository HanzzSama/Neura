/**
 * public/js/app-core.js
 * =====================
 * Core State & App Lifecycle Coordinator — Neura AI
 *
 * Responsibilities:
 *  1. Define global storage keys & shared application state (NeuraState).
 *  2. Manage Send / Voice button UI state transitions.
 *  3. Bootstrap all modules on DOMContentLoaded.
 *  4. Handle QR code URL parameter and cross-tab language sync.
 *  5. Expose the scannable QR Code renderer helper.
 */

// ============================================================================
// § 1 — Storage Keys  (all localStorage keys in one place)
// ============================================================================

const CHAT_STORAGE_KEY         = 'neura_recent_chats_v2';
const LAST_SESSION_STORAGE_KEY = 'neura_active_session_id_v2';
const DRAFT_INPUT_STORAGE_KEY  = 'neura_draft_chat_input_v2';
const ML_DROPDOWN_STORAGE_KEY  = 'neura_ml_dropdown_collapsed';
const USER_PROFILE_STORAGE_KEY = 'neura_user_profile_v1';
const THEME_STORAGE_KEY        = 'neura_theme_v1';
const LANG_STORAGE_KEY         = 'neura_lang';

// Expose keys globally so other modules can reference them.
Object.assign(window, {
  API: '',
  CHAT_STORAGE_KEY,
  LAST_SESSION_STORAGE_KEY,
  DRAFT_INPUT_STORAGE_KEY,
  ML_DROPDOWN_STORAGE_KEY,
  USER_PROFILE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  LANG_STORAGE_KEY,
});

/**
 * Resolves the role- and user-scoped storage key for chat history.
 * Ensures user medical questions never leak to nakes, and vice versa.
 */
function getChatStorageKey() {
  try {
    const role = (typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : localStorage.getItem('neura_user_role')) || 'User';
    if (role === 'Nakes') {
      const nakesRaw = localStorage.getItem('neura_nakes_session');
      if (nakesRaw) {
        const nu = JSON.parse(nakesRaw);
        const id = nu.uid || nu.id || nu.email;
        if (id) return `neura_recent_chats_nakes_${encodeURIComponent(id)}`;
      }
      return 'neura_recent_chats_nakes';
    }
    if (role === 'Admin') {
      return 'neura_recent_chats_admin';
    }
    const rawUser = localStorage.getItem('neura_auth_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      const id = u.uid || u.email || u.id;
      if (id) return `neura_recent_chats_user_${encodeURIComponent(id)}`;
    }
  } catch (e) { }
  return 'neura_recent_chats_user';
}

function getLastSessionStorageKey() {
  return `${getChatStorageKey()}_active_id`;
}

/**
 * Wipes all active session, chat, and consultation caches from browser storage.
 * Called on logout and role switch to prevent cross-account history leakage.
 */
function clearAllUserSessionData() {
  try {
    // 1. Clear authentication & profile data
    localStorage.removeItem('neura_auth_user');
    localStorage.removeItem('neura_user_profile');
    localStorage.removeItem('neura_user_role');
    localStorage.removeItem('neura_nakes_session');
    localStorage.removeItem('neura_admin_authenticated');
    localStorage.removeItem('neura_admin_token');

    // 2. Clear personal info & consultation documents
    localStorage.removeItem('neura_last_consultation');
    localStorage.removeItem('neura_active_patient_doc');
    localStorage.removeItem('neura_last_nakes_verified_code');
    localStorage.removeItem('neura_user_institution');
    localStorage.removeItem('neura_user_phone');
    localStorage.removeItem('neura_user_bio');
    localStorage.removeItem('neura_password_last_updated');

    // 3. Clear active chat state & drafts
    localStorage.removeItem('neura_active_session_id_v2');
    localStorage.removeItem('neura_draft_chat_input_v2');
    localStorage.removeItem('neura_recent_chats_v2'); // legacy shared key

    // Also clear scoped active keys for current session
    try {
      const activeKey = getLastSessionStorageKey();
      if (activeKey) localStorage.removeItem(activeKey);
    } catch (_) { }

    sessionStorage.clear();

    // 4. Reset in-memory chat state
    window.chatSessions = [];
    window.activeSessionId = null;
    if (window.NeuraState) {
      window.NeuraState.chatSessions = [];
      window.NeuraState.activeSessionId = null;
    }

    // 5. Clear DOM elements if present
    const historyEl = document.getElementById('chat-history-list');
    if (historyEl) historyEl.innerHTML = '<div class="chat-history-empty">No recent chats yet</div>';
    const messagesEl = document.getElementById('chat-messages-container');
    if (messagesEl) messagesEl.innerHTML = '';
  } catch (e) {
    console.warn('[Neura Auth] Error clearing session data:', e);
  }
}

Object.assign(window, {
  getChatStorageKey,
  getLastSessionStorageKey,
  clearAllUserSessionData,
});

// ============================================================================
// § 2 — Shared Application State  (single source of truth)
// ============================================================================

window.NeuraState = {
  // Chat session management
  chatSessions:         [],
  activeSessionId:      null,

  // Request lifecycle
  isTyping:             false,
  stopRequested:        false,

  // ML model
  trainingPollInterval: null,
  activeModelData:      null,

  // Profile editing (keyed by card ID)
  activeProfileForms:   {},

  // Voice recognition
  chatSpeechRec:            null,
  isChatVoiceListening:     false,
  chatVoiceSilenceTimer:    null,
  chatVoiceAccumulatedText: '',

  // Connectivity
  _isOnline:               navigator.onLine,
  _offlineBannerHideTimer: null,
};

// Flatten state onto `window` for backward-compatible global access.
Object.assign(window, {
  chatSessions:             window.NeuraState.chatSessions,
  activeSessionId:          window.NeuraState.activeSessionId,
  isTyping:                 window.NeuraState.isTyping,
  stopRequested:            window.NeuraState.stopRequested,
  activeProfileForms:       window.NeuraState.activeProfileForms,
  chatSpeechRec:            window.NeuraState.chatSpeechRec,
  isChatVoiceListening:     window.NeuraState.isChatVoiceListening,
  chatVoiceSilenceTimer:    window.NeuraState.chatVoiceSilenceTimer,
  chatVoiceAccumulatedText: window.NeuraState.chatVoiceAccumulatedText,
  _isOnline:                window.NeuraState._isOnline,
  _offlineBannerHideTimer:  window.NeuraState._offlineBannerHideTimer,
});

// `var` declarations for legacy modules that reference these as bare identifiers.
var chatSessions       = window.NeuraState.chatSessions;
var activeSessionId    = window.NeuraState.activeSessionId;
var isTyping           = window.NeuraState.isTyping;
var stopRequested      = window.NeuraState.stopRequested;
var activeProfileForms = window.NeuraState.activeProfileForms;

// ============================================================================
// § 3 — Send / Voice Button UI
// ============================================================================

/**
 * Refreshes the send-button appearance based on current app state.
 *
 * States (priority order):
 *  1. Generating  — stop-square icon
 *  2. Listening   — animated mic
 *  3. Has text    — send-arrow icon
 *  4. Empty input — mic icon (voice-to-text mode)
 */
function updateSendBtnState() {
  const input = document.getElementById('chat-input-textarea');
  const btn   = document.getElementById('send-msg-btn');
  if (!btn) return;

  // — State 1: AI is generating —
  if (window.isTyping) {
    const hasText = input && input.value.trim().length > 0;
    if (hasText) {
      btn.classList.remove('is-generating', 'is-voice', 'is-listening');
      btn.title     = 'Kirim ke antrean (Pending Send)';
      btn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.5a1.2 1.2 0 0 1 .85.35l6 6a1.2 1.2 0 1 1-1.7 1.7L13.2 6.55V20a1.2 1.2 0 1 1-2.4 0V6.55L6.85 10.55a1.2 1.2 0 1 1-1.7-1.7l6-6a1.2 1.2 0 0 1 .85-.35z"/>
        </svg>`;
      return;
    }
    btn.classList.add('is-generating');
    btn.classList.remove('is-voice', 'is-listening');
    btn.title     = 'Hentikan respon';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="5" width="14" height="14" rx="2.5"/>
      </svg>`;
    return;
  }

  btn.classList.remove('is-generating');

  // — State 2: Voice recognition active —
  if (window.isChatVoiceListening) {
    btn.classList.add('is-listening');
    btn.classList.remove('is-voice');
    btn.title     = 'Sedang mendengarkan… Klik untuk kirim sekarang';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2.5"/>
        <line x1="8"  y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2.5"/>
      </svg>`;
    return;
  }

  btn.classList.remove('is-listening');

  const hasText = input && input.value.trim().length > 0;

  if (hasText) {
    // — State 3: Input has text → send arrow —
    btn.classList.remove('is-voice');
    btn.title     = 'Kirim pesan (Enter)';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5a1.2 1.2 0 0 1 .85.35l6 6a1.2 1.2 0 1 1-1.7 1.7L13.2 6.55V20a1.2 1.2 0 1 1-2.4 0V6.55L6.85 10.55a1.2 1.2 0 1 1-1.7-1.7l6-6a1.2 1.2 0 0 1 .85-.35z"/>
      </svg>`;
  } else {
    // — State 4: Empty → mic for voice-to-text —
    btn.classList.add('is-voice');
    btn.title     = 'Bicara untuk konversi suara ke teks';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2.2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8"  y1="23" x2="16" y2="23"/>
      </svg>`;
  }
}

/**
 * Toggles the global generating flag and refreshes the button UI.
 * @param {boolean} generating
 */
function setGeneratingState(generating) {
  window.isTyping = generating;
  updateSendBtnState();
}

window.updateSendBtnState = updateSendBtnState;
window.setGeneratingState  = setGeneratingState;

// ============================================================================
// § 4 — DOMContentLoaded Bootstrap
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {

  // — Language & Greeting —
  if (typeof getAppLanguage === 'function' && typeof setAppLanguage === 'function') {
    setAppLanguage(getAppLanguage());
  }
  if (typeof setupGreeting  === 'function') setupGreeting();

  // — Chat Sessions & Sidebar —
  if (typeof loadChatSessions         === 'function') loadChatSessions();
  if (typeof renderRecentChatsSidebar === 'function') renderRecentChatsSidebar();

  // — Feature Modules —
  if (typeof initMLCommandsDropdown   === 'function') initMLCommandsDropdown();
  if (typeof updateActivePatientBar   === 'function') updateActivePatientBar();
  if (typeof initAppSettingsModifiers === 'function') initAppSettingsModifiers();
  if (typeof initConnectivity         === 'function') initConnectivity();
  if (typeof initAuthListeners        === 'function') initAuthListeners();

  // — Restore Persisted State —
  _restoreTheme();
  _restoreLastSession();
  _restoreDraftInput();

  // — Model Status Polling —
  if (typeof fetchModelStatus === 'function') {
    fetchModelStatus(false);
    setInterval(() => fetchModelStatus(false), 12_000);
  }

  // — Global Keyboard Shortcut: Ctrl+K / Cmd+K → New Chat —
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (typeof startNewChat === 'function') startNewChat();
    }
  });

  // — Re-hydrate Profile Cards —
  setTimeout(() => {
    document.querySelectorAll('.profile-slide-card').forEach(card => {
      if (typeof syncProfileCardToStorage === 'function') {
        syncProfileCardToStorage(card.id);
      }
    });
  }, 100);

  // — Sync send-button after all modules are ready —
  updateSendBtnState();

  // — Cross-Tab Language Sync —
  window.addEventListener('storage', (e) => {
    if (e.key === LANG_STORAGE_KEY && e.newValue) {
      const incoming = e.newValue.toLowerCase();
      if (typeof getAppLanguage === 'function' && typeof setAppLanguage === 'function') {
        if (incoming !== getAppLanguage()) setAppLanguage(incoming);
      }
    }
  });

  // — QR Code URL Parameter (/app?code=NKS-XX-XXXX-XXX) —
  _handleQRCodeParam();
});

// ============================================================================
// § 5 — Private Bootstrap Helpers
// ============================================================================

/** Restores the saved color-theme (dark / light) from localStorage. */
function _restoreTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (_) { /* localStorage unavailable */ }
}

/**
 * Restores the last active chat session.
 * Falls back to newest session or starts a fresh one.
 */
function _restoreLastSession() {
  const lastKey  = typeof getLastSessionStorageKey === 'function' ? getLastSessionStorageKey() : LAST_SESSION_STORAGE_KEY;
  const lastId   = localStorage.getItem(lastKey);
  const sessions = window.chatSessions || [];

  if (lastId === 'new' || sessions.length === 0) {
    if (typeof startNewChat === 'function') startNewChat(false);
  } else if (lastId && sessions.some(s => s.id === lastId)) {
    if (typeof switchChatSession === 'function') switchChatSession(lastId);
  } else if (sessions.length > 0) {
    if (typeof switchChatSession === 'function') switchChatSession(sessions[0].id);
  } else {
    if (typeof startNewChat === 'function') startNewChat(false);
  }
}

/** Restores any unsent draft message from localStorage into the chat input. */
function _restoreDraftInput() {
  try {
    const draft     = localStorage.getItem(DRAFT_INPUT_STORAGE_KEY);
    const chatInput = document.getElementById('chat-input-textarea');
    if (draft && chatInput && !chatInput.value) {
      chatInput.value = draft;
      if (typeof handleTextareaInput === 'function') handleTextareaInput(chatInput);
    }
  } catch (_) { /* localStorage unavailable */ }
}

/**
 * Checks the URL for a `?code=` parameter (set by QR code scanning)
 * and auto-submits the /periksa command once the app is ready.
 */
function _handleQRCodeParam() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get('code');
    if (code) {
      setTimeout(() => {
        if (typeof submitCommand === 'function') submitCommand(`/periksa ${code}`);
      }, 700);
    }
  } catch (_) { /* URLSearchParams unavailable */ }
}

// ============================================================================
// § 6 — QR Code Renderer
// ============================================================================

/**
 * Generates a scannable SVG QR code for the given text.
 * Falls back to the qrserver.com public API if the local library is absent.
 *
 * @param  {string} text — URL or string to encode.
 * @param  {number} size — Desired output size in px (default: 96).
 * @returns {string}      HTML string: an inline <svg> or an <img> tag.
 */
window.renderScannableQRCode = function renderScannableQRCode(text, size = 96) {
  if (!text) return '';

  // Try bundled qrcode.min.js first (offline, no external request)
  try {
    if (typeof window.qrcode === 'function') {
      const qr       = window.qrcode(0, 'M');
      qr.addData(String(text));
      qr.make();
      const count    = qr.getModuleCount();
      const cellSize = Math.max(2, Math.floor((size - 8) / count));
      return qr.createSvgTag(cellSize, 4);
    }
  } catch (err) {
    console.warn('[Neura] Local QR generator failed, using online fallback:', err);
  }

  // Online fallback — requires internet connectivity
  const encoded = encodeURIComponent(text);
  return `<img
    src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=1F1E1D&bgcolor=FFFFFF"
    alt="QR Code" width="${size}" height="${size}"
    style="display:block;border-radius:4px"
  />`;
};
