/**
 * public/js/app-core.js
 * =====================
 * Core State & App Lifecycle Coordinator for Neura AI.
 * Initializes storage keys, shared application state, and DOM bootstrap.
 */

// Global Constants
const API = '';
const CHAT_STORAGE_KEY = 'neura_recent_chats_v2';
const LAST_SESSION_STORAGE_KEY = 'neura_active_session_id_v2';
const DRAFT_INPUT_STORAGE_KEY = 'neura_draft_chat_input_v2';
const ML_DROPDOWN_STORAGE_KEY = 'neura_ml_dropdown_collapsed';
const USER_PROFILE_STORAGE_KEY = 'neura_user_profile_v1';

window.API = API;
window.CHAT_STORAGE_KEY = CHAT_STORAGE_KEY;
window.LAST_SESSION_STORAGE_KEY = LAST_SESSION_STORAGE_KEY;
window.DRAFT_INPUT_STORAGE_KEY = DRAFT_INPUT_STORAGE_KEY;
window.ML_DROPDOWN_STORAGE_KEY = ML_DROPDOWN_STORAGE_KEY;
window.USER_PROFILE_STORAGE_KEY = USER_PROFILE_STORAGE_KEY;

// Global Shared State Container
window.NeuraState = {
  chatSessions: [],
  activeSessionId: null,
  isTyping: false,
  stopRequested: false,
  trainingPollInterval: null,
  activeModelData: null,
  activeProfileForms: {},
  chatSpeechRec: null,
  isChatVoiceListening: false,
  chatVoiceSilenceTimer: null,
  chatVoiceAccumulatedText: '',
  _isOnline: navigator.onLine,
  _offlineBannerHideTimer: null,
};

// Aliases on window for global access
window.activeProfileForms = window.NeuraState.activeProfileForms;
window.chatSessions = window.NeuraState.chatSessions;
window.activeSessionId = window.NeuraState.activeSessionId;
window.isTyping = window.NeuraState.isTyping;
window.stopRequested = window.NeuraState.stopRequested;
window.trainingPollInterval = window.NeuraState.trainingPollInterval;
window.activeModelData = window.NeuraState.activeModelData;
window.chatSpeechRec = window.NeuraState.chatSpeechRec;
window.isChatVoiceListening = window.NeuraState.isChatVoiceListening;
window.chatVoiceSilenceTimer = window.NeuraState.chatVoiceSilenceTimer;
window.chatVoiceAccumulatedText = window.NeuraState.chatVoiceAccumulatedText;
window._isOnline = window.NeuraState._isOnline;
window._offlineBannerHideTimer = window.NeuraState._offlineBannerHideTimer;

// Backward-compatible variable declarations
var chatSessions = window.NeuraState.chatSessions;
var activeSessionId = window.NeuraState.activeSessionId;
var isTyping = window.NeuraState.isTyping;
var stopRequested = window.NeuraState.stopRequested;
var activeProfileForms = window.NeuraState.activeProfileForms;

// --------------------------------------------------------------------------
// Send / Voice Button UI State
// --------------------------------------------------------------------------
function updateSendBtnState() {
  const input = document.getElementById('chat-input-textarea');
  const btn = document.getElementById('send-msg-btn');
  if (!btn) return;

  if (window.isTyping) {
    btn.classList.add('is-generating');
    btn.classList.remove('is-voice', 'is-listening');
    btn.title = 'Hentikan respon';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="5" width="14" height="14" rx="2.5"/>
      </svg>
    `;
    return;
  }

  btn.classList.remove('is-generating');

  if (window.isChatVoiceListening) {
    btn.classList.add('is-listening');
    btn.classList.remove('is-voice');
    btn.title = 'Sedang mendengarkan... Klik untuk kirim pesan sekarang';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2.5"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2.5"/>
      </svg>
    `;
    return;
  }

  btn.classList.remove('is-listening');

  const hasText = input && input.value.trim().length > 0;
  if (hasText) {
    // Send Message State
    btn.classList.remove('is-voice');
    btn.title = 'Kirim pesan (Enter)';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5a1.2 1.2 0 0 1 .85.35l6 6a1.2 1.2 0 1 1-1.7 1.7L13.2 6.55V20a1.2 1.2 0 1 1-2.4 0V6.55L6.85 10.55a1.2 1.2 0 1 1-1.7-1.7l6-6a1.2 1.2 0 0 1 .85-.35z"/>
      </svg>
    `;
  } else {
    // Voice-to-Text State
    btn.classList.add('is-voice');
    btn.title = 'Bicara untuk Konversi Suara ke Pesan Chat';
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    `;
  }
}

function setGeneratingState(generating) {
  window.isTyping = generating;
  updateSendBtnState();
}

window.updateSendBtnState = updateSendBtnState;
window.setGeneratingState = setGeneratingState;

// --------------------------------------------------------------------------
// DOMContentLoaded Lifecycle Coordinator
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  if (typeof setAppLanguage === 'function' && typeof getAppLanguage === 'function') {
    setAppLanguage(getAppLanguage());
  }
  if (typeof setupGreeting === 'function') setupGreeting();
  if (typeof loadChatSessions === 'function') loadChatSessions();
  if (typeof renderRecentChatsSidebar === 'function') renderRecentChatsSidebar();
  if (typeof initMLCommandsDropdown === 'function') initMLCommandsDropdown();
  if (typeof updateActivePatientBar === 'function') updateActivePatientBar();
  if (typeof initAppSettingsModifiers === 'function') initAppSettingsModifiers();

  // Restore saved theme preference
  try {
    const savedTheme = localStorage.getItem('neura_theme_v1');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  } catch (e) { }

  // Restore last active room/session
  const savedLastSessionId = localStorage.getItem(LAST_SESSION_STORAGE_KEY);
  if (savedLastSessionId === 'new') {
    if (typeof startNewChat === 'function') startNewChat(false);
  } else if (savedLastSessionId && window.chatSessions && window.chatSessions.some(s => s.id === savedLastSessionId)) {
    if (typeof switchChatSession === 'function') switchChatSession(savedLastSessionId);
  } else if (window.chatSessions && window.chatSessions.length > 0) {
    if (typeof switchChatSession === 'function') switchChatSession(window.chatSessions[0].id);
  } else {
    if (typeof startNewChat === 'function') startNewChat(false);
  }

  // Restore draft textarea content
  try {
    const savedDraft = localStorage.getItem(DRAFT_INPUT_STORAGE_KEY);
    const chatInput = document.getElementById('chat-input-textarea');
    if (savedDraft && chatInput && !chatInput.value) {
      chatInput.value = savedDraft;
      if (typeof handleTextareaInput === 'function') handleTextareaInput(chatInput);
    }
  } catch (e) { }

  if (typeof fetchModelStatus === 'function') {
    fetchModelStatus(false);
    setInterval(() => fetchModelStatus(false), 12000);
  }

  // Internet Connectivity Detection
  if (typeof initConnectivity === 'function') initConnectivity();

  // Global keyboard shortcut: Ctrl+K or Cmd+K for new chat
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (typeof startNewChat === 'function') startNewChat();
    }
  });

  // Re-hydrate any profile cards present on page load
  setTimeout(() => {
    document.querySelectorAll('.profile-slide-card').forEach(card => {
      if (typeof syncProfileCardToStorage === 'function') {
        syncProfileCardToStorage(card.id);
      }
    });
  }, 100);

  updateSendBtnState();

  // Initialize User Profile in Sidebar & Authentication Listeners
  if (typeof initAuthListeners === 'function') initAuthListeners();

  // Cross-tab sync
  window.addEventListener('storage', function (e) {
    if (e.key === 'neura_lang' && e.newValue) {
      const incoming = e.newValue.toLowerCase();
      if (typeof getAppLanguage === 'function' && typeof setAppLanguage === 'function') {
        if (incoming !== getAppLanguage()) setAppLanguage(incoming);
      }
    }
  });
});
