/**
 * app.js
 * ======
 * Neura AI Frontend Logic (Claude AI Experience)
 * Handles message dispatching, TensorFlow backend polling, theme toggle,
 * modals, and interactive command execution.
 */

const API = '';
const CHAT_STORAGE_KEY = 'neura_recent_chats_v2';
const LAST_SESSION_STORAGE_KEY = 'neura_active_session_id_v2';
const DRAFT_INPUT_STORAGE_KEY = 'neura_draft_chat_input_v2';
const ML_DROPDOWN_STORAGE_KEY = 'neura_ml_dropdown_collapsed';
const USER_PROFILE_STORAGE_KEY = 'neura_user_profile_v1';

const activeProfileForms = {};

let chatSessions = [];
let activeSessionId = null;
let isTyping = false;
let stopRequested = false;
let trainingPollInterval = null;
let activeModelData = null;

// Speech-to-Text Voice Dictation State
let chatSpeechRec = null;
let isChatVoiceListening = false;
let chatVoiceSilenceTimer = null;
let chatVoiceAccumulatedText = '';

// Connectivity state
let _isOnline = navigator.onLine;
let _offlineBannerHideTimer = null;

function updateSendBtnState() {
  const input = document.getElementById('chat-input-textarea');
  const btn = document.getElementById('send-msg-btn');
  if (!btn) return;

  if (isTyping) {
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

  if (isChatVoiceListening) {
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
    // Send Message State (Terracotta with Upward Arrow)
    btn.classList.remove('is-voice');
    btn.title = 'Kirim pesan (Enter)';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5a1.2 1.2 0 0 1 .85.35l6 6a1.2 1.2 0 1 1-1.7 1.7L13.2 6.55V20a1.2 1.2 0 1 1-2.4 0V6.55L6.85 10.55a1.2 1.2 0 1 1-1.7-1.7l6-6a1.2 1.2 0 0 1 .85-.35z"/>
      </svg>
    `;
  } else {
    // Voice-to-Text State (Mint Green with Microphone Icon)
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
  isTyping = generating;
  updateSendBtnState();
}

let lastVoiceBtnClick = 0;
let chatVoiceShouldKeepListening = false;
let chatVoiceRestartAttempts = 0;
let chatVoiceInactivityTimer = null;
let lastChatVoiceText = '';
let lastChatVoiceChangeTime = 0;
const CHAT_VOICE_SILENCE_TIMEOUT_MS = 1100; // Fast response: auto-commits 1.1s after speech finishes

function handleSendClick() {
  const now = Date.now();
  if (now - lastVoiceBtnClick < 300) return; // Debounce rapid accidental double-clicks
  lastVoiceBtnClick = now;

  if (isTyping) {
    stopRequested = true;
    return;
  }

  if (isChatVoiceListening) {
    stopChatVoiceInput(true);
    return;
  }

  const input = document.getElementById('chat-input-textarea');
  const hasText = input && input.value.trim().length > 0;

  if (hasText) {
    sendUserMessage();
  } else {
    startChatVoiceInput();
  }
}

function startChatVoiceInput() {
  if (isTyping) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast('Browser ini tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau Microsoft Edge.', 'error');
    return;
  }

  chatVoiceShouldKeepListening = true;
  isChatVoiceListening = true;
  chatVoiceRestartAttempts = 0;
  chatVoiceAccumulatedText = '';
  lastChatVoiceText = '';
  lastChatVoiceChangeTime = 0;

  const input = document.getElementById('chat-input-textarea');
  const banner = document.getElementById('chat-voice-status-banner');
  const statusText = document.getElementById('chat-voice-status-text');

  if (banner) banner.style.display = 'flex';
  if (statusText) statusText.textContent = 'Mendengarkan suara... Silakan mulai berbicara';

  updateSendBtnState();

  // Inactivity timeout: stop after 20 seconds if user never speaks
  if (chatVoiceInactivityTimer) clearTimeout(chatVoiceInactivityTimer);
  chatVoiceInactivityTimer = setTimeout(function () {
    if (isChatVoiceListening && (!input || !input.value.trim())) {
      stopChatVoiceInput(false);
      showToast('Waktu bicara selesai (tidak ada suara terdeteksi).', 'info');
    }
  }, 20000);

  function createAndStartRecognizer() {
    if (!chatVoiceShouldKeepListening) return;

    if (chatSpeechRec) {
      try { chatSpeechRec.abort(); } catch (e) { }
      chatSpeechRec = null;
    }

    try {
      chatSpeechRec = new SR();
      chatSpeechRec.lang = 'id-ID';
      chatSpeechRec.continuous = true;
      chatSpeechRec.interimResults = true;

      chatSpeechRec.onstart = function () {
        if (isChatVoiceListening && statusText && !input.value.trim()) {
          statusText.textContent = 'Mendengarkan... Silakan mulai berbicara';
        }
      };

      chatSpeechRec.onresult = function (event) {
        if (!isChatVoiceListening) return;

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            final += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (final) {
          chatVoiceAccumulatedText = (chatVoiceAccumulatedText + ' ' + final).trim();
        }

        const currentText = (chatVoiceAccumulatedText + ' ' + interim).trim();

        if (currentText) {
          const now = Date.now();

          // ANTI-FAN / BACKGROUND NOISE FILTER:
          // Only reset the silence timer if real NEW speech words were added!
          if (currentText !== lastChatVoiceText) {
            lastChatVoiceText = currentText;
            lastChatVoiceChangeTime = now;

            if (input) {
              input.value = currentText;
              handleTextareaInput(input);
            }

            if (statusText) {
              statusText.textContent = `Mendengar: "${currentText.length > 28 ? currentText.slice(0, 28) + '...' : currentText}"`;
            }

            // Reset inactivity timer since user is speaking
            if (chatVoiceInactivityTimer) {
              clearTimeout(chatVoiceInactivityTimer);
              chatVoiceInactivityTimer = null;
            }

            // Reset silence timer: commits quickly (1.1s) after user stops speaking
            if (chatVoiceSilenceTimer) clearTimeout(chatVoiceSilenceTimer);
            chatVoiceSilenceTimer = setTimeout(function () {
              if (isChatVoiceListening && input && input.value.trim().length > 0) {
                stopChatVoiceInput(true);
              }
            }, CHAT_VOICE_SILENCE_TIMEOUT_MS);
          } else {
            // Text unchanged (ambient fan noise repeating same transcript)
            // Do NOT reset timer! Trigger commit if silence elapsed
            if (lastChatVoiceChangeTime > 0 && (now - lastChatVoiceChangeTime >= CHAT_VOICE_SILENCE_TIMEOUT_MS)) {
              if (isChatVoiceListening && input && input.value.trim().length > 0) {
                stopChatVoiceInput(true);
              }
            }
          }
        }
      };

      chatSpeechRec.onerror = function (e) {
        console.warn('SpeechRecognition status:', e.error);
        if (e.error === 'not-allowed') {
          showToast('Izin mikrofon ditolak oleh browser. Klik ikon gembok di address bar untuk mengizinkan.', 'error');
          cancelChatVoiceInput();
        } else if (e.error === 'audio-capture') {
          showToast('Mikrofon tidak terdeteksi atau sedang dipakai aplikasi lain.', 'error');
          cancelChatVoiceInput();
        } else if (e.error === 'no-speech') {
          // Chrome pauses on quietness; do NOT stop listening! onend will restart it.
        }
      };

      chatSpeechRec.onend = function () {
        if (!chatVoiceShouldKeepListening || !isChatVoiceListening) return;

        // If user already spoke something and silence timer is running, allow silence timer to send
        const currentVal = input ? input.value.trim() : '';
        if (currentVal.length > 0) {
          // Keep listening or let silence timer commit
          if (chatVoiceRestartAttempts < 30) {
            chatVoiceRestartAttempts++;
            setTimeout(function () {
              if (chatVoiceShouldKeepListening && isChatVoiceListening) {
                createAndStartRecognizer();
              }
            }, 100);
          }
          return;
        }

        // If user hasn't spoken yet, DO NOT CLOSE! Seamlessly restart listening
        if (chatVoiceRestartAttempts < 25) {
          chatVoiceRestartAttempts++;
          setTimeout(function () {
            if (chatVoiceShouldKeepListening && isChatVoiceListening) {
              createAndStartRecognizer();
            }
          }, 120);
        } else {
          stopChatVoiceInput(false);
        }
      };

      chatSpeechRec.start();
    } catch (err) {
      console.warn('SpeechRecognition restart notice:', err);
    }
  }

  createAndStartRecognizer();
}

function stopChatVoiceInput(shouldSend = true) {
  chatVoiceShouldKeepListening = false;

  if (chatVoiceSilenceTimer) {
    clearTimeout(chatVoiceSilenceTimer);
    chatVoiceSilenceTimer = null;
  }
  if (chatVoiceInactivityTimer) {
    clearTimeout(chatVoiceInactivityTimer);
    chatVoiceInactivityTimer = null;
  }

  isChatVoiceListening = false;

  if (chatSpeechRec) {
    try { chatSpeechRec.stop(); } catch (e) { }
    chatSpeechRec = null;
  }

  const banner = document.getElementById('chat-voice-status-banner');
  if (banner) banner.style.display = 'none';

  updateSendBtnState();

  if (shouldSend) {
    const input = document.getElementById('chat-input-textarea');
    if (input && input.value.trim().length > 0) {
      sendUserMessage();
    }
  }
}

function cancelChatVoiceInput(event = null) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  chatVoiceShouldKeepListening = false;

  if (chatVoiceSilenceTimer) {
    clearTimeout(chatVoiceSilenceTimer);
    chatVoiceSilenceTimer = null;
  }
  if (chatVoiceInactivityTimer) {
    clearTimeout(chatVoiceInactivityTimer);
    chatVoiceInactivityTimer = null;
  }

  isChatVoiceListening = false;

  if (chatSpeechRec) {
    try { chatSpeechRec.abort(); } catch (e) { }
    chatSpeechRec = null;
  }

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    handleTextareaInput(input);
  }

  const banner = document.getElementById('chat-voice-status-banner');
  if (banner) banner.style.display = 'none';

  updateSendBtnState();
  showToast('Perekaman suara dibatalkan', 'info');
}

window.cancelChatVoiceInput = cancelChatVoiceInput;
window.startChatVoiceInput = startChatVoiceInput;
window.stopChatVoiceInput = stopChatVoiceInput;

// --------------------------------------------------------------------------
// Initialization & Dynamic Greeting
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setAppLanguage(getAppLanguage());
  setupGreeting();
  loadChatSessions();
  renderRecentChatsSidebar();
  initMLCommandsDropdown();
  initAppSettingsModifiers();

  // Restore saved theme preference
  try {
    const savedTheme = localStorage.getItem('neura_theme_v1');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  } catch(e) {}

  // Restore last active room/session so refreshing never resets the room
  const savedLastSessionId = localStorage.getItem(LAST_SESSION_STORAGE_KEY);
  if (savedLastSessionId === 'new') {
    startNewChat(false);
  } else if (savedLastSessionId && chatSessions.some(s => s.id === savedLastSessionId)) {
    switchChatSession(savedLastSessionId);
  } else if (chatSessions.length > 0) {
    switchChatSession(chatSessions[0].id);
  } else {
    startNewChat(false);
  }

  // Restore draft textarea content if user was typing before refresh
  try {
    const savedDraft = localStorage.getItem(DRAFT_INPUT_STORAGE_KEY);
    const chatInput = document.getElementById('chat-input-textarea');
    if (savedDraft && chatInput && !chatInput.value) {
      chatInput.value = savedDraft;
      handleTextareaInput(chatInput);
    }
  } catch(e) {}

  fetchModelStatus(false);
  setInterval(() => fetchModelStatus(false), 12000);

  // ── Internet Connectivity Detection ──────────────────────────────────────
  initConnectivity();

  // Global keyboard shortcut: Ctrl+K or Cmd+K for new chat
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      startNewChat();
    }
  });

  // Re-hydrate any profile cards present on page load
  setTimeout(() => {
    document.querySelectorAll('.profile-slide-card').forEach(card => {
      syncProfileCardToStorage(card.id);
    });
  }, 100);

  // Initialize Send/Voice Button State
  updateSendBtnState();

  // Initialize User Profile in Sidebar & Authentication Listeners
  initAuthListeners();

  // Cross-tab sync: when welcome.js changes language in another tab, app reflects it
  window.addEventListener('storage', function (e) {
    if (e.key === 'neura_lang' && e.newValue) {
      const incoming = e.newValue.toLowerCase();
      if (incoming !== getAppLanguage()) setAppLanguage(incoming);
    }
  });
});

// --------------------------------------------------------------------------
// User Profile & Authentication Synchronization
// --------------------------------------------------------------------------
function syncUserProfileUI() {
  try {
    const raw = localStorage.getItem('neura_auth_user');
    let user = null;
    if (raw) {
      user = JSON.parse(raw);
    }

    if (!user && window.NeuraFirebase && window.NeuraFirebase.auth) {
      const fbUser = window.NeuraFirebase.auth().currentUser;
      if (fbUser) {
        user = {
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Pengguna'),
          email: fbUser.email,
          uid: fbUser.uid,
          photoURL: fbUser.photoURL || ''
        };
      }
    }

    if (!user) return;

    const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Pengguna');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.email || 'Dokter / Peneliti';
    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'">`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }
  } catch (err) {
    console.warn('[Neura UI] syncUserProfileUI failed:', err);
  }
}

function initAuthListeners() {
  // Sync profile info immediately from localStorage if available
  syncUserProfileUI();

  // Hook Firebase Auth state change if initialized
  function hookFirebase() {
    if (window.NeuraFirebase && window.NeuraFirebase.auth) {
      try {
        window.NeuraFirebase.auth().onAuthStateChanged(function (user) {
          if (user) {
            syncUserProfileUI();
          }
        });
      } catch (e) {}
    }
  }

  if (window.NeuraFirebase && window.NeuraFirebase.auth) {
    hookFirebase();
  } else if (window.NeuraFirebase && window.NeuraFirebase.init) {
    window.NeuraFirebase.init().then(hookFirebase).catch(function () {});
  }
}

async function handleLogout() {
  const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari akun Neura AI?');
  if (!confirmed) return;

  try {
    if (typeof showToast === 'function') {
      showToast('Sedang keluar dari akun...', 'info');
    }

    // Dapatkan instance auth yang valid
    let auth = null;
    if (window.NeuraFirebase) {
      if (typeof window.NeuraFirebase.getAuth === 'function') {
        auth = window.NeuraFirebase.getAuth();
      }
      if (!auth && window.NeuraFirebase.auth) {
        auth = typeof window.NeuraFirebase.auth === 'function'
          ? window.NeuraFirebase.auth()
          : window.NeuraFirebase.auth;
      }
      if (!auth && typeof window.NeuraFirebase.init === 'function') {
        const fb = await window.NeuraFirebase.init();
        if (fb && fb.auth) auth = fb.auth;
      }
    }

    if (!auth && typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
      try { auth = firebase.auth(); } catch (e) {}
    }

    if (auth && typeof auth.signOut === 'function') {
      await auth.signOut();
      console.log('[Neura Auth] Firebase sign out sukses.');
    }
  } catch (err) {
    console.warn('[Neura Auth] Sign out error:', err);
  } finally {
    try {
      localStorage.removeItem('neura_auth_user');
      localStorage.removeItem('neura_user_profile');
      localStorage.removeItem('neura_active_session_id_v2');
      sessionStorage.clear();
    } catch (e) {}

    window.location.replace('/welcome?logged_out=true');
  }
}

window.handleLogout = handleLogout;
window.syncUserProfileUI = syncUserProfileUI;

// --------------------------------------------------------------------------
// Bilingual Translate System (ID / EN)
// --------------------------------------------------------------------------
const APP_TRANSLATIONS = {
  id: {
    // Sidebar nav (keys match data-i18n in index.html)
    nav_new_chat: 'Obrolan Baru',
    nav_dashboard: 'Dasbor',
    nav_recent_chats: 'Percakapan Terakhir',
    nav_ml_commands: 'Perintah ML',
    user_role: 'Dokter / Peneliti',
    checking_model: 'Memeriksa model...',
    // ML command items
    cmd_status: 'Cek Status',
    cmd_train: 'Latih 5 Epoch',
    cmd_eval: 'Evaluasi Model',
    cmd_predict: 'Jalankan Prediksi',
    cmd_progress: 'Progress Live',
    cmd_help: 'Daftar Perintah',
    cmd_intro: 'Pengenalan Neura',
    // Greeting
    greet_morning: 'Selamat pagi',
    greet_afternoon: 'Selamat siang',
    greet_evening: 'Selamat sore',
    greet_night: 'Selamat malam',
    // Hero subhead
    hero_subhead: 'Bagaimana Neura bisa membantu diagnosis Alzheimer dan pemodelan XGBoost Anda hari ini?',
    // Hero cards
    card_train_title: 'Latih Model XGBoost',
    card_train_desc: 'Latih gradient boosted decision trees pada dataset Alzheimer\u2019s (2.149 data pasien)',
    card_predict_title: 'Diagnosa Alzheimer',
    card_predict_desc: 'Prediksi risiko Alzheimer dari biomarker klinis (MMSE, ADL, Memory Complaints)',
    card_eval_title: 'Evaluasi Metrik Medis',
    card_eval_desc: 'Uji performa: 95.4% Akurasi, 94.6% Precision, 92.1% Recall & 94.1% ROC-AUC',
    card_specs_title: 'Spesifikasi Model Klinis',
    card_specs_desc: 'Lihat spesifikasi XGBoost, 32 biomarker klinis, dan bobot feature importance',
    // Input placeholder
    placeholder: 'Tanya sesuatu atau ketik / untuk perintah ML...',
    // Disclaimer
    disclaimer: 'Neura dapat membuat kesalahan. Selalu verifikasi keputusan klinis dengan profesional medis yang berkualifikasi.',
    // Model modal
    model_modal_title: 'Pilih Model AI',
    model_cancel: 'Batal',
  },
  en: {
    // Sidebar nav
    nav_new_chat: 'New Chat',
    nav_dashboard: 'Dashboard',
    nav_recent_chats: 'Recent Chats',
    nav_ml_commands: 'ML Commands',
    user_role: 'Doctor / Researcher',
    checking_model: 'Checking model...',
    // ML command items
    cmd_status: 'Check Status',
    cmd_train: 'Train 5 Epochs',
    cmd_eval: 'Evaluate Model',
    cmd_predict: 'Run Prediction',
    cmd_progress: 'Live Progress',
    cmd_help: 'Command List',
    cmd_intro: 'Neura Introduction',
    // Greeting
    greet_morning: 'Good morning',
    greet_afternoon: 'Good afternoon',
    greet_evening: 'Good evening',
    greet_night: 'Good night',
    // Hero subhead
    hero_subhead: 'How can Neura assist you with Alzheimer\u2019s disease diagnosis and XGBoost modeling today?',
    // Hero cards
    card_train_title: 'Train XGBoost Model',
    card_train_desc: 'Train gradient boosted decision trees on the Alzheimer\u2019s dataset (2,149 patient records)',
    card_predict_title: 'Run Alzheimer Diagnosis',
    card_predict_desc: 'Predict Alzheimer\u2019s risk from clinical biomarkers (MMSE, ADL, Memory Complaints)',
    card_eval_title: 'Evaluate Medical Metrics',
    card_eval_desc: 'Test performance: 95.4% Accuracy, 94.6% Precision, 92.1% Recall & 94.1% ROC-AUC',
    card_specs_title: 'Clinical Model Specs',
    card_specs_desc: 'View XGBoost specs, 32 clinical biomarkers, and feature importance weights',
    // Input placeholder
    placeholder: 'Ask something or type / for ML commands...',
    // Disclaimer
    disclaimer: 'Neura can make mistakes. Always verify clinical decisions with a qualified medical professional.',
    // Model modal
    model_modal_title: 'Select AI Model',
    model_cancel: 'Cancel',
  }
};

function getAppLanguage() {
  try { return localStorage.getItem('neura_lang') === 'en' ? 'en' : 'id'; } catch(e) { return 'id'; }
}

function setAppLanguage(lang, notify = false) {
  try { localStorage.setItem('neura_lang', lang); } catch(e) {}
  const t = APP_TRANSLATIONS[lang] || APP_TRANSLATIONS.id;

  // Update lang label buttons
  const labelEl = document.getElementById('app-lang-label');
  if (labelEl) labelEl.textContent = lang === 'en' ? 'EN' : 'ID';

  // Translate all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Textarea placeholder
  const textarea = document.getElementById('chat-input-textarea');
  if (textarea) textarea.placeholder = t.placeholder;

  // Model modal title & cancel btn
  const modalTitle = document.getElementById('model-modal-title');
  if (modalTitle) modalTitle.textContent = t.model_modal_title;
  const cancelBtn = document.getElementById('model-modal-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = t.model_cancel;

  // Re-run greeting with new language
  setupGreeting();

  // Re-render hero if visible (new chat state)
  const heroEl = document.getElementById('claude-hero');
  if (heroEl) {
    const container = document.getElementById('chat-content-container');
    if (container) {
      container.innerHTML = getHeroHtml();
      setupGreeting();
    }
  }

  if (notify) {
    showToast(lang === 'en' ? 'Language: English' : 'Bahasa: Indonesia', 'info');
  }
  // Sync dot menu labels if open
  syncDotMenuState();
}

function toggleAppLanguage() {
  const current = getAppLanguage();
  setAppLanguage(current === 'id' ? 'en' : 'id', true);
}

window.toggleAppLanguage = toggleAppLanguage;

// --------------------------------------------------------------------------
// 3-Dot User Context Menu
// --------------------------------------------------------------------------
function syncDotMenuState() {
  const lang = getAppLanguage();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Sync language badge
  const badge = document.getElementById('dot-lang-badge');
  if (badge) badge.textContent = lang === 'en' ? 'EN' : 'ID';

  // Sync lang label
  const langLabel = document.getElementById('dot-lang-label');
  if (langLabel) langLabel.textContent = lang === 'en' ? 'Switch to ID' : 'Ganti Bahasa';

  // Sync theme label & icon
  const themeLabel = document.getElementById('dot-theme-label');
  if (themeLabel) themeLabel.textContent = isDark
    ? (lang === 'en' ? 'Light Mode' : 'Mode Terang')
    : (lang === 'en' ? 'Dark Mode'  : 'Mode Gelap');

  // Swap theme icon: sun (light) <-> moon (dark)
  const themeIcon = document.getElementById('dot-theme-icon');
  if (themeIcon) {
    themeIcon.innerHTML = isDark
      ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>` // moon
      : `<circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`; // sun
  }
}

function toggleUserDotMenu(e) {
  e.stopPropagation();
  const popup = document.getElementById('user-dot-popup');
  const trigger = document.getElementById('user-dot-trigger');
  if (!popup) return;

  const isOpen = popup.classList.contains('open');
  if (isOpen) {
    closeUserDotMenu();
  } else {
    syncDotMenuState();
    popup.classList.add('open');
    trigger.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
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

// Close when clicking outside
document.addEventListener('click', function (e) {
  const menu = document.getElementById('user-dot-menu');
  if (menu && !menu.contains(e.target)) closeUserDotMenu();
});

// Close dot menu or settings panel on Escape key (with drill-down back support)
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeUserDotMenu();
    if (typeof currentSettingsSubpanel !== 'undefined' && currentSettingsSubpanel) {
      backToSettingsRoot();
    } else {
      closeSettingsPanel();
    }
  }
});


window.toggleUserDotMenu = toggleUserDotMenu;
window.closeUserDotMenu = closeUserDotMenu;

// --------------------------------------------------------------------------
// Settings Panel & App Preferences Manager
// --------------------------------------------------------------------------

function initAppSettingsModifiers() {
  try {
    // 1. Font Size
    const fontSize = localStorage.getItem('neura_font_size') || 'medium';
    document.body.classList.remove('font-size-small', 'font-size-large');
    if (fontSize === 'small') document.body.classList.add('font-size-small');
    if (fontSize === 'large') document.body.classList.add('font-size-large');

    // 2. Reduce Motion
    const reduceMotion = localStorage.getItem('neura_reduce_motion') === 'true';
    document.body.classList.toggle('reduce-motion', reduceMotion);

    // 3. Compact Mode
    const compactMode = localStorage.getItem('neura_compact_mode') === 'true';
    document.body.classList.toggle('compact-mode', compactMode);
  } catch(e) {}
}

function playSuccessChime() {
  try {
    const isEnabled = localStorage.getItem('neura_sound_enabled') === 'true';
    if (!isEnabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Pleasant 2-tone harmonic chime (C6 -> G6)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

    gainNode.gain.setValueAtTime(0.06, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  } catch(e) {}
}

let currentSettingsSubpanel = null;
let currentSettingsSubpanelTitle = null;

function openSettingsSubpanel(subpanelId, titleId, titleEn) {
  currentSettingsSubpanel = subpanelId;
  currentSettingsSubpanelTitle = { id: titleId, en: titleEn || titleId };
  const track = document.getElementById('settings-slider-track');
  const backBtn = document.getElementById('settings-back-btn');
  const titleEl = document.getElementById('settings-title');
  const pane = document.getElementById('settings-subpanel-pane');

  // Deactivate all subpanels and activate target
  document.querySelectorAll('.settings-subpanel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(subpanelId);
  if (target) target.classList.add('active');

  // Slide track to subpanel view
  if (track) {
    track.classList.remove('is-root');
    track.classList.add('is-subpanel');
  }

  // Show back button
  if (backBtn) backBtn.style.display = 'inline-flex';

  // Set title
  if (titleEl) {
    const lang = getAppLanguage();
    titleEl.textContent = lang === 'en' ? currentSettingsSubpanelTitle.en : currentSettingsSubpanelTitle.id;
  }

  // Scroll subpanel pane to top
  if (pane) pane.scrollTop = 0;
}

function backToSettingsRoot() {
  currentSettingsSubpanel = null;
  currentSettingsSubpanelTitle = null;
  const track = document.getElementById('settings-slider-track');
  const backBtn = document.getElementById('settings-back-btn');
  const titleEl = document.getElementById('settings-title');

  // Slide track back to root
  if (track) {
    track.classList.remove('is-subpanel');
    track.classList.add('is-root');
  }

  // Hide back button
  if (backBtn) backBtn.style.display = 'none';

  // Reset title
  if (titleEl) {
    const lang = getAppLanguage();
    titleEl.textContent = lang === 'en' ? 'Settings' : 'Pengaturan';
  }

  updateSettingsNavBadges();
}

function updateSettingsNavBadges() {
  try {
    const lang = getAppLanguage();
    const theme = document.documentElement.getAttribute('data-theme') || 'light';

    // 1. Appearance
    const badgeApp = document.getElementById('menu-badge-appearance');
    if (badgeApp) {
      const themeLabel = theme === 'dark' ? (lang === 'en' ? 'Dark' : 'Gelap') : (lang === 'en' ? 'Light' : 'Terang');
      badgeApp.textContent = `${themeLabel} • ${lang.toUpperCase()}`;
    }

    // 2. Input & Chat
    const badgeInput = document.getElementById('menu-badge-input');
    if (badgeInput) {
      const enter = localStorage.getItem('neura_send_on_enter') !== 'false';
      const fSize = localStorage.getItem('neura_font_size') || 'medium';
      const fChar = fSize === 'small' ? 'S' : (fSize === 'large' ? 'L' : 'M');
      badgeInput.textContent = `${enter ? 'Enter' : 'Click'} • ${fChar}`;
    }

    // 3. Notifikasi & Suara
    const badgeNotif = document.getElementById('menu-badge-notif');
    if (badgeNotif) {
      const sound = localStorage.getItem('neura_sound_enabled') === 'true';
      const dur = ((parseInt(localStorage.getItem('neura_toast_duration') || '3500')) / 1000).toFixed(1) + 's';
      badgeNotif.textContent = sound ? `${dur} • ♪` : dur;
    }

    // 4. Model & Klinis
    const badgeClin = document.getElementById('menu-badge-clinical');
    if (badgeClin) {
      const ep = localStorage.getItem('neura_default_epochs') || '50';
      badgeClin.textContent = `${ep} Ep`;
    }

    // 5. Voice Consultation
    const badgeVoice = document.getElementById('menu-badge-voice');
    if (badgeVoice) {
      const vDelay = ((parseInt(localStorage.getItem('neura_voice_delay') || '2500')) / 1000).toFixed(1) + 's';
      const autoPlay = localStorage.getItem('neura_voice_autoplay') !== 'false';
      badgeVoice.textContent = `${vDelay} • ${autoPlay ? 'Auto' : 'Off'}`;
    }

    // 6. Aksesibilitas
    const badgeA11y = document.getElementById('menu-badge-a11y');
    if (badgeA11y) {
      const mot = localStorage.getItem('neura_reduce_motion') === 'true';
      const cmp = localStorage.getItem('neura_compact_mode') === 'true';
      if (mot && cmp) badgeA11y.textContent = lang === 'en' ? 'Calm+Dense' : 'Tenang+Padat';
      else if (mot)   badgeA11y.textContent = lang === 'en' ? 'No-Motion' : 'Tenang';
      else if (cmp)   badgeA11y.textContent = lang === 'en' ? 'Compact' : 'Ringkas';
      else            badgeA11y.textContent = lang === 'en' ? 'Normal' : 'Normal';
    }

    // 7. Profil
    const badgeProf = document.getElementById('menu-badge-profile');
    if (badgeProf) {
      const role = localStorage.getItem('neura_user_role') || 'Neurologist';
      badgeProf.textContent = role;
    }

    // 8. Model & Chat
    const badgeChat = document.getElementById('menu-badge-chat');
    if (badgeChat) {
      badgeChat.textContent = 'XGBoost';
    }

    // 9. Data & Penyimpanan
    const badgeStore = document.getElementById('menu-badge-storage');
    if (badgeStore) {
      let totalBytes = 0;
      for (let k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          totalBytes += (String(localStorage[k]).length + k.length) * 2;
        }
      }
      const kb = (totalBytes / 1024).toFixed(0);
      badgeStore.textContent = `${kb} KB`;
    }

    // 10. Tentang
    const badgeAbout = document.getElementById('menu-badge-about');
    if (badgeAbout) {
      badgeAbout.textContent = 'v2.5.1';
    }
  } catch(e) {}
}

function openSettingsPanel() {
  const panel   = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  if (!panel) return;
  backToSettingsRoot();
  syncSettingsPanel();
  panel.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSettingsPanel() {
  const panel   = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  if (!panel) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (!panel.classList.contains('open')) {
      backToSettingsRoot();
    }
  }, 300);
}

function syncSettingsPanel() {
  const lang  = getAppLanguage();
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  // ── Theme chips active state
  document.getElementById('stg-light-btn')?.classList.toggle('active', theme === 'light');
  document.getElementById('stg-dark-btn')?.classList.toggle('active', theme === 'dark');

  // ── Lang chips active state
  document.getElementById('stg-id-btn')?.classList.toggle('active', lang === 'id');
  document.getElementById('stg-en-btn')?.classList.toggle('active', lang === 'en');

  // ── Input & Chat settings
  const enterCb = document.getElementById('stg-toggle-enter');
  if (enterCb) enterCb.checked = localStorage.getItem('neura_send_on_enter') !== 'false';

  const draftCb = document.getElementById('stg-toggle-draft');
  if (draftCb) draftCb.checked = localStorage.getItem('neura_draft_enabled') !== 'false';

  const curFontSize = localStorage.getItem('neura_font_size') || 'medium';
  document.getElementById('stg-font-sm')?.classList.toggle('active', curFontSize === 'small');
  document.getElementById('stg-font-md')?.classList.toggle('active', curFontSize === 'medium');
  document.getElementById('stg-font-lg')?.classList.toggle('active', curFontSize === 'large');

  // ── Notifications & Sound
  const soundCb = document.getElementById('stg-toggle-sound');
  if (soundCb) soundCb.checked = localStorage.getItem('neura_sound_enabled') === 'true';

  const toastSel = document.getElementById('stg-toast-select');
  if (toastSel) toastSel.value = localStorage.getItem('neura_toast_duration') || '3500';

  // ── Model & Clinical
  const epochsSel = document.getElementById('stg-epochs-select');
  if (epochsSel) epochsSel.value = localStorage.getItem('neura_default_epochs') || '50';

  const probCb = document.getElementById('stg-toggle-prob');
  if (probCb) probCb.checked = localStorage.getItem('neura_detailed_prob') !== 'false';

  // ── Voice Consultation
  const voiceDelaySel = document.getElementById('stg-voice-delay-select');
  if (voiceDelaySel) voiceDelaySel.value = localStorage.getItem('neura_voice_delay') || '2500';

  const voicePlayCb = document.getElementById('stg-toggle-voiceplay');
  if (voicePlayCb) voicePlayCb.checked = localStorage.getItem('neura_voice_autoplay') !== 'false';

  // ── Accessibility
  const motionCb = document.getElementById('stg-toggle-motion');
  if (motionCb) motionCb.checked = localStorage.getItem('neura_reduce_motion') === 'true';

  const compactCb = document.getElementById('stg-toggle-compact');
  if (compactCb) compactCb.checked = localStorage.getItem('neura_compact_mode') === 'true';

  // ── Storage usage display
  updateStorageUsage();

  // ── Profile info from sidebar / auth storage
  try {
    const raw  = localStorage.getItem('neura_auth_user');
    const user = raw ? JSON.parse(raw) : null;

    const nameEl  = document.getElementById('stg-profile-name');
    const emailEl = document.getElementById('stg-profile-email');
    const avatarEl = document.getElementById('stg-avatar');

    if (user) {
      const name = user.name || user.displayName || 'Pengguna';
      if (nameEl)  nameEl.textContent  = name;
      if (emailEl) emailEl.textContent = user.email || '—';
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
      const sbName = document.getElementById('sidebar-user-name')?.textContent || 'Pengguna';
      if (nameEl)  nameEl.textContent  = sbName;
      if (emailEl) emailEl.textContent = document.getElementById('sidebar-user-email')?.textContent || '—';
      if (avatarEl) avatarEl.textContent = sbName.charAt(0).toUpperCase();
    }
  } catch(e) {}

  // ── Role select
  try {
    const savedRole = localStorage.getItem('neura_user_role');
    const roleSelect = document.getElementById('stg-role-select');
    if (roleSelect && savedRole) roleSelect.value = savedRole;
  } catch(e) {}

  // ── Active model info
  const modelValEl = document.getElementById('stg-model-val');
  if (modelValEl) {
    const sbStatus = document.getElementById('sb-status-text')?.textContent;
    modelValEl.textContent = sbStatus && sbStatus !== 'Checking model...' && sbStatus !== 'Memeriksa model...'
      ? sbStatus : 'AlzheimersXGBoost v2.5';
  }

  // ── Translate all settings labels (ID / EN)
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  if (lang === 'en') {
    // English
    if (currentSettingsSubpanel && currentSettingsSubpanelTitle) {
      set('settings-title', currentSettingsSubpanelTitle.en);
    } else {
      set('settings-title', 'Settings');
    }
    set('settings-back-label',   'Back');

    // Root Menu Titles & Subtitles
    set('menu-title-appearance', 'Appearance');
    set('menu-sub-appearance',   'Interface theme & language');
    set('menu-title-input',      'Input & Chat');
    set('menu-sub-input',        'Send on Enter, drafts, font size');
    set('menu-title-notif',      'Notifications & Audio');
    set('menu-sub-notif',        'Response chime & toast duration');
    set('menu-title-clinical',   'Model & Clinical');
    set('menu-sub-clinical',     'Default epochs, risk precision');
    set('menu-title-voice',      'Voice Consultation');
    set('menu-sub-voice',        'Mic silence pause & auto-play');
    set('menu-title-a11y',       'Accessibility');
    set('menu-sub-a11y',         'Reduced motion & compact view');
    set('menu-title-profile',    'Profile');
    set('menu-sub-profile',      'Account & clinician role');
    set('menu-title-chat',       'Model & Chat');
    set('menu-sub-chat',         'Active model & message history');
    set('menu-title-storage',    'Data & Storage');
    set('menu-sub-storage',      'Memory quota, JSON export, reset');
    set('menu-title-about',      'About');
    set('menu-sub-about',        'Neura AI v2.5.1');

    set('stg-sec-appearance',    'Appearance');
    set('stg-theme-label',       'Theme');
    set('stg-theme-desc',        'Interface display mode');
    set('stg-light-label',       'Light');
    set('stg-dark-label',        'Dark');
    set('stg-lang-label',        'Language');
    set('stg-lang-desc',         'Application interface language');

    set('stg-sec-input',         'Input & Chat');
    set('stg-enter-label',       'Send on Enter');
    set('stg-enter-desc',        'Enter to send, Shift+Enter for new line');
    set('stg-draft-label',       'Auto-save Draft');
    set('stg-draft-desc',        'Preserve unsent input on reload');
    set('stg-font-label',        'Chat Font Size');
    set('stg-font-desc',         'Reading comfort for consultation messages');

    set('stg-sec-notif',         'Notifications & Audio');
    set('stg-sound-label',       'Completion Chime');
    set('stg-sound-desc',        'Soft sound when AI completes response');
    set('stg-toast-label',       'Toast Duration');
    set('stg-toast-desc',        'Display time for toast popups');

    set('stg-sec-clinical',      'Model & Clinical');
    set('stg-epochs-label',      'Default Epochs /train');
    set('stg-epochs-desc',       'Default boosting rounds for training');
    set('stg-prob-label',        'Detailed Probability');
    set('stg-prob-desc',         'Display precise decimals (e.g. 95.35%)');

    set('stg-sec-voice',         'Voice Consultation');
    set('stg-voice-delay-label', 'Silence Delay');
    set('stg-voice-delay-desc',  'Pause duration before automatic send');
    set('stg-voice-play-label',  'Auto-speak Response');
    set('stg-voice-play-desc',   'Vocalize AI response in voice room');

    set('stg-sec-a11y',          'Accessibility');
    set('stg-motion-label',      'Reduce Motion');
    set('stg-motion-desc',       'Minimize transitions and visual pulses');
    set('stg-compact-label',     'Compact View');
    set('stg-compact-desc',      'Tighter chat bubbles for long history');

    set('stg-sec-profile',       'Profile');
    set('stg-role-label',        'Role');
    set('stg-role-desc',         'Title shown in sidebar');

    set('stg-sec-chat',          'Model & Chat');
    set('stg-model-label',       'Active AI Model');
    set('stg-change-model',      'Change');
    set('stg-history-label',     'Chat History');
    set('stg-history-desc',      'Delete all saved conversations');
    set('stg-clear-label',       'Delete');

    set('stg-sec-storage',       'Data & Storage');
    set('stg-storage-label',     'Browser Storage');
    set('stg-export-label',      'Export Chat History');
    set('stg-export-desc',       'Download complete conversation history (JSON)');
    set('stg-export-btn-label',  'Export');
    set('stg-reset-label',       'Reset All Settings');
    set('stg-reset-desc',        'Restore all preferences to defaults');
    set('stg-reset-btn-label',   'Reset');

    set('stg-sec-about',         'About');
    set('stg-about-desc',        'Clinical AI platform for early Alzheimer\'s detection based on 32 multimodal biomarkers.');
    set('dot-settings-label',    'Settings');
  } else {
    // Indonesian
    if (currentSettingsSubpanel && currentSettingsSubpanelTitle) {
      set('settings-title', currentSettingsSubpanelTitle.id);
    } else {
      set('settings-title', 'Pengaturan');
    }
    set('settings-back-label',   'Kembali');

    // Root Menu Titles & Subtitles
    set('menu-title-appearance', 'Tampilan');
    set('menu-sub-appearance',   'Tema antarmuka & bahasa');
    set('menu-title-input',      'Input & Chat');
    set('menu-sub-input',        'Kirim Enter, draf, ukuran font');
    set('menu-title-notif',      'Notifikasi & Suara');
    set('menu-sub-notif',        'Chime respons & durasi toast');
    set('menu-title-clinical',   'Model & Klinis');
    set('menu-sub-clinical',     'Epochs default, presisi risiko');
    set('menu-title-voice',      'Voice Consultation');
    set('menu-sub-voice',        'Jeda mic & auto-play ucapan');
    set('menu-title-a11y',       'Aksesibilitas');
    set('menu-sub-a11y',         'Animasi & kerapatan tampilan');
    set('menu-title-profile',    'Profil');
    set('menu-sub-profile',      'Akun & role dokter/peneliti');
    set('menu-title-chat',       'Model & Chat');
    set('menu-sub-chat',         'Model aktif & riwayat pesan');
    set('menu-title-storage',    'Data & Penyimpanan');
    set('menu-sub-storage',      'Memori, ekspor JSON, reset');
    set('menu-title-about',      'Tentang');
    set('menu-sub-about',        'Neura AI v2.5.1');

    set('stg-sec-appearance',    'Tampilan');
    set('stg-theme-label',       'Tema');
    set('stg-theme-desc',        'Mode tampilan antarmuka');
    set('stg-light-label',       'Terang');
    set('stg-dark-label',        'Gelap');
    set('stg-lang-label',        'Bahasa');
    set('stg-lang-desc',         'Bahasa antarmuka aplikasi');

    set('stg-sec-input',         'Input & Chat');
    set('stg-enter-label',       'Kirim dengan Enter');
    set('stg-enter-desc',        'Enter untuk kirim, Shift+Enter untuk baris baru');
    set('stg-draft-label',       'Simpan Draf Otomatis');
    set('stg-draft-desc',        'Simpan teks belum terkirim saat refresh');
    set('stg-font-label',        'Ukuran Teks Chat');
    set('stg-font-desc',         'Kenyamanan membaca pesan konsultasi');

    set('stg-sec-notif',         'Notifikasi & Suara');
    set('stg-sound-label',       'Efek Suara Selesai');
    set('stg-sound-desc',        'Bunyi lembut saat AI selesai merespons');
    set('stg-toast-label',       'Durasi Notifikasi');
    set('stg-toast-desc',        'Waktu tampil pop-up notifikasi');

    set('stg-sec-clinical',      'Model & Klinis');
    set('stg-epochs-label',      'Default Epochs /train');
    set('stg-epochs-desc',       'Jumlah boosting rounds bawaan');
    set('stg-prob-label',        'Presisi Probabilitas');
    set('stg-prob-desc',         'Tampilkan desimal detail (misal 95.35%)');

    set('stg-sec-voice',         'Voice Consultation');
    set('stg-voice-delay-label', 'Jeda Hening Otomatis');
    set('stg-voice-delay-desc',  'Waktu hening sebelum suara dikirim');
    set('stg-voice-play-label',  'Putar Suara Otomatis');
    set('stg-voice-play-desc',   'Bicarakan respons AI saat konsultasi suara');

    set('stg-sec-a11y',          'Aksesibilitas');
    set('stg-motion-label',      'Kurangi Efek Animasi');
    set('stg-motion-desc',       'Meminimalkan transisi dan denyut visual');
    set('stg-compact-label',     'Tampilan Ringkas');
    set('stg-compact-desc',      'Penyajian bubble chat yang lebih padat');

    set('stg-sec-profile',       'Profil');
    set('stg-role-label',        'Role');
    set('stg-role-desc',         'Jabatan yang ditampilkan di sidebar');

    set('stg-sec-chat',          'Model & Chat');
    set('stg-model-label',       'Model AI Aktif');
    set('stg-change-model',      'Ganti');
    set('stg-history-label',     'Riwayat Chat');
    set('stg-history-desc',      'Hapus semua percakapan tersimpan');
    set('stg-clear-label',       'Hapus');

    set('stg-sec-storage',       'Data & Penyimpanan');
    set('stg-storage-label',     'Memori Browser');
    set('stg-export-label',      'Ekspor Riwayat Chat');
    set('stg-export-desc',       'Unduh seluruh riwayat percakapan (JSON)');
    set('stg-export-btn-label',  'Ekspor');
    set('stg-reset-label',       'Reset Semua Pengaturan');
    set('stg-reset-desc',        'Kembalikan ke konfigurasi awal');
    set('stg-reset-btn-label',   'Reset');

    set('stg-sec-about',         'Tentang');
    set('stg-about-desc',        'Platform klinis AI untuk deteksi dini Alzheimer berbasis 32 biomarker multimodal.');
    set('dot-settings-label',    'Pengaturan');
  }

  // Keep root menu status badges synced
  updateSettingsNavBadges();
}

function applySettingsTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('neura_theme_v1', theme); } catch(e) {}
  syncSettingsPanel();
  syncDotMenuState();
}

function applySettingsLang(lang) {
  setAppLanguage(lang, false);
  syncSettingsPanel();
}

function applySettingsRole(role) {
  try { localStorage.setItem('neura_user_role', role); } catch(e) {}
  const roleEl = document.getElementById('sidebar-user-role');
  if (roleEl) roleEl.textContent = role;
  updateSettingsNavBadges();
  showToast(getAppLanguage() === 'en' ? `Role updated: ${role}` : `Role diperbarui: ${role}`, 'info');
}

function applyToggleSetting(key, checked) {
  try {
    localStorage.setItem(key, checked ? 'true' : 'false');
  } catch(e) {}

  if (key === 'neura_reduce_motion') {
    document.body.classList.toggle('reduce-motion', checked);
  } else if (key === 'neura_compact_mode') {
    document.body.classList.toggle('compact-mode', checked);
  }

  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Setting updated' : 'Pengaturan diperbarui', 'info');
}

function applyFontSize(size) {
  try {
    localStorage.setItem('neura_font_size', size);
  } catch(e) {}

  document.body.classList.remove('font-size-small', 'font-size-large');
  if (size === 'small') document.body.classList.add('font-size-small');
  if (size === 'large') document.body.classList.add('font-size-large');

  document.getElementById('stg-font-sm')?.classList.toggle('active', size === 'small');
  document.getElementById('stg-font-md')?.classList.toggle('active', size === 'medium');
  document.getElementById('stg-font-lg')?.classList.toggle('active', size === 'large');

  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? `Font size: ${size}` : `Ukuran teks: ${size}`, 'info');
}

function applyToastDuration(val) {
  try {
    localStorage.setItem('neura_toast_duration', val);
  } catch(e) {}
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Toast duration updated' : 'Durasi notifikasi diperbarui', 'info');
}

function applyDefaultEpochs(val) {
  try {
    localStorage.setItem('neura_default_epochs', val);
  } catch(e) {}
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? `Default epochs: ${val}` : `Default epochs: ${val}`, 'info');
}

function applyVoiceDelay(val) {
  try {
    localStorage.setItem('neura_voice_delay', val);
  } catch(e) {}
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Voice delay updated' : 'Jeda hening diperbarui', 'info');
}

function updateStorageUsage() {
  try {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (String(localStorage[key]).length + key.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const mbQuota = 5;
    const percent = Math.min(100, Math.max(2, (totalBytes / (mbQuota * 1024 * 1024)) * 100));

    const valEl = document.getElementById('stg-storage-val');
    const fillEl = document.getElementById('stg-storage-fill');
    if (valEl) valEl.textContent = `${kb} KB / ${mbQuota} MB`;
    if (fillEl) fillEl.style.width = `${percent.toFixed(1)}%`;
  } catch(e) {}
}

function exportChatHistory() {
  try {
    loadChatSessions();
    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: 'Neura Clinical AI',
      version: '2.5.1',
      totalSessions: chatSessions.length,
      sessions: chatSessions
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `neura_chat_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const lang = getAppLanguage();
    showToast(lang === 'en' ? 'Chat history exported successfully' : 'Riwayat chat berhasil diekspor', 'success');
  } catch(e) {
    showToast('Gagal mengekspor riwayat', 'error');
  }
}

function confirmResetAllSettings() {
  const lang = getAppLanguage();
  const msg = lang === 'en'
    ? 'Reset all Neura settings to factory defaults?'
    : 'Reset semua pengaturan Neura ke nilai bawaan?';
  if (!confirm(msg)) return;

  try {
    localStorage.removeItem('neura_send_on_enter');
    localStorage.removeItem('neura_draft_enabled');
    localStorage.removeItem('neura_font_size');
    localStorage.removeItem('neura_sound_enabled');
    localStorage.removeItem('neura_toast_duration');
    localStorage.removeItem('neura_default_epochs');
    localStorage.removeItem('neura_detailed_prob');
    localStorage.removeItem('neura_voice_delay');
    localStorage.removeItem('neura_voice_autoplay');
    localStorage.removeItem('neura_reduce_motion');
    localStorage.removeItem('neura_compact_mode');
  } catch(e) {}

  initAppSettingsModifiers();
  syncSettingsPanel();
  showToast(lang === 'en' ? 'Settings reset to defaults' : 'Pengaturan dikembalikan ke awal', 'success');
}

function confirmClearHistory() {
  const lang = getAppLanguage();
  const msg  = lang === 'en'
    ? 'Are you sure? All chat history will be permanently deleted.'
    : 'Yakin? Semua riwayat chat akan dihapus permanen.';
  if (!confirm(msg)) return;
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
    localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
  } catch(e) {}
  chatSessions = [];
  startNewChat(false);
  renderRecentChatsSidebar();
  updateStorageUsage();
  updateSettingsNavBadges();
  closeSettingsPanel();
  showToast(lang === 'en' ? 'Chat history cleared' : 'Riwayat chat dihapus', 'info');
}

window.openSettingsPanel        = openSettingsPanel;
window.closeSettingsPanel       = closeSettingsPanel;
window.openSettingsSubpanel     = openSettingsSubpanel;
window.backToSettingsRoot       = backToSettingsRoot;
window.updateSettingsNavBadges  = updateSettingsNavBadges;
window.applySettingsTheme       = applySettingsTheme;
window.applySettingsLang        = applySettingsLang;
window.applySettingsRole        = applySettingsRole;
window.confirmClearHistory      = confirmClearHistory;
window.applyToggleSetting       = applyToggleSetting;
window.applyFontSize            = applyFontSize;
window.applyToastDuration       = applyToastDuration;
window.applyDefaultEpochs       = applyDefaultEpochs;
window.applyVoiceDelay          = applyVoiceDelay;
window.exportChatHistory        = exportChatHistory;
window.confirmResetAllSettings  = confirmResetAllSettings;

function setupGreeting() {
  const hour = new Date().getHours();
  const lang = getAppLanguage();
  const t = APP_TRANSLATIONS[lang] || APP_TRANSLATIONS.id;
  let text = t.greet_night;
  if (hour >= 5 && hour < 12) text = t.greet_morning;
  else if (hour >= 12 && hour < 17) text = t.greet_afternoon;
  else if (hour >= 17 && hour < 22) text = t.greet_evening;

  const greetingEl = document.getElementById('hero-greeting-text');
  if (greetingEl) greetingEl.textContent = text;
}

// --------------------------------------------------------------------------
// ML Commands Dropdown (Accordion)
// --------------------------------------------------------------------------
function toggleMLCommandsDropdown() {
  const list = document.getElementById('ml-commands-list');
  const btn = document.getElementById('ml-commands-toggle-btn');
  if (!list || !btn) return;

  const isCollapsed = list.classList.toggle('collapsed');
  btn.classList.toggle('collapsed', isCollapsed);
  btn.setAttribute('aria-expanded', !isCollapsed);

  try {
    localStorage.setItem(ML_DROPDOWN_STORAGE_KEY, isCollapsed ? 'true' : 'false');
  } catch(e) {}
}

function initMLCommandsDropdown() {
  try {
    const saved = localStorage.getItem(ML_DROPDOWN_STORAGE_KEY);
    // Default is expanded (isCollapsed = false), unless user explicitly collapsed it (saved === 'true')
    const isCollapsed = saved === 'true';
    const list = document.getElementById('ml-commands-list');
    const btn = document.getElementById('ml-commands-toggle-btn');
    if (list) list.classList.toggle('collapsed', isCollapsed);
    if (btn) {
      btn.classList.toggle('collapsed', isCollapsed);
      btn.setAttribute('aria-expanded', !isCollapsed);
    }
  } catch(e) {}
}

// --------------------------------------------------------------------------
// Recent Chats & Sessions Management
// --------------------------------------------------------------------------
function loadChatSessions() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (raw) {
      chatSessions = JSON.parse(raw);
    }
  } catch(e) {
    chatSessions = [];
  }
  if (!Array.isArray(chatSessions)) chatSessions = [];
}

function saveChatSessions() {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatSessions));
  } catch(e) {}
}

/**
 * Generate 1 single title based on user initial input
 */
function formatSessionTitle(text) {
  const clean = String(text || '').trim();
  const lower = clean.toLowerCase();

  // Known quick commands mapping
  if (lower === '/status') return 'Check Status';
  if (lower.startsWith('/train')) {
    const parts = clean.split(/\s+/);
    return parts[1] ? `Train ${parts[1]} Epochs` : 'Train Neural Net';
  }
  if (lower === '/predict') return 'Inference Prediction';
  if (lower === '/eval') return 'Model Evaluation';
  if (lower === '/progress') return 'Live Progress';
  if (lower === '/help') return 'Command List';

  // Natural language: Capitalize first letter, truncate nicely if too long
  const first = clean.charAt(0).toUpperCase() + clean.slice(1);
  return first.length > 28 ? first.slice(0, 26) + '...' : first;
}

function renderRecentChatsSidebar() {
  const listEl = document.getElementById('chat-history-list');
  if (!listEl) return;

  if (chatSessions.length === 0) {
    listEl.innerHTML = `<div class="chat-history-empty">No recent chats yet</div>`;
    return;
  }

  listEl.innerHTML = chatSessions.map(session => {
    const isActive = session.id === activeSessionId;
    return `
      <div class="chat-history-item ${isActive ? 'active' : ''}" onclick="switchChatSession('${escapeHtml(session.id)}')">
        <div class="chat-history-left">
          <svg class="chat-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="chat-history-title" title="${escapeHtml(session.title)}">${escapeHtml(session.title)}</span>
        </div>
        <button class="chat-item-del-btn" title="Delete chat" onclick="deleteChatSession(event, '${escapeHtml(session.id)}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

function switchChatSession(sessionId) {
  const session = chatSessions.find(s => s.id === sessionId);
  if (!session) return;
  activeSessionId = sessionId;
  try {
    localStorage.setItem(LAST_SESSION_STORAGE_KEY, sessionId);
  } catch(e) {}
  renderRecentChatsSidebar();
  renderSessionMessages(session);
}

function deleteChatSession(e, sessionId) {
  e.stopPropagation();
  chatSessions = chatSessions.filter(s => s.id !== sessionId);
  saveChatSessions();
  if (activeSessionId === sessionId) {
    if (chatSessions.length > 0) {
      switchChatSession(chatSessions[0].id);
    } else {
      activeSessionId = null;
      try {
        localStorage.setItem(LAST_SESSION_STORAGE_KEY, 'new');
      } catch(err) {}
      startNewChat();
    }
  } else {
    renderRecentChatsSidebar();
  }
  showToast('Chat removed from history', 'info');
}

function addMessageToActiveSession(msgObj) {
  if (!activeSessionId) return;
  const session = chatSessions.find(s => s.id === activeSessionId);
  if (session) {
    if (!session.messages) session.messages = [];
    session.messages.push(msgObj);
    saveChatSessions();
  }
}

function renderSessionMessages(session) {
  const container = document.getElementById('chat-content-container');
  container.innerHTML = '';

  if (!session || !session.messages || session.messages.length === 0) {
    container.innerHTML = getHeroHtml();
    setupGreeting();
    return;
  }

  session.messages.forEach(msg => {
    if (msg.role === 'user') {
      const row = document.createElement('div');
      row.className = 'message-row user';
      row.innerHTML = `<div class="user-bubble">${escapeHtml(msg.content)}</div>`;
      container.appendChild(row);
    } else if (msg.role === 'assistant') {
      const row = document.createElement('div');
      row.className = 'message-row assistant';
      let suggestionsHtml = '';
      if (Array.isArray(msg.suggestions) && msg.suggestions.length > 0) {
        suggestionsHtml = `<div class="chat-suggestions-bar">${msg.suggestions.map(s => renderSuggestionChip(s)).join('')}</div>`;
      }
      row.innerHTML = `
        <div class="assistant-header">
          <img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display='none'" />
          <span class="assistant-name">Neura</span>
          <span class="assistant-model-tag">&bull; AlzheimersXGBoost</span>
        </div>
        <div class="assistant-prose">${msg.html}</div>
        <div class="assistant-suggestions-slot">${suggestionsHtml}</div>
        <div class="msg-actions-row">
          <button class="msg-action-btn" title="Copy response" onclick="copyMessageText(this)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy</span>
          </button>
        </div>
      `;
      container.appendChild(row);

      // Trigger probability bar fills if any
      const bars = row.querySelectorAll('.prob-fill');
      bars.forEach(b => {
        const target = b.getAttribute('data-target-width');
        if (target) b.style.width = target;
      });
    }
  });

  // Re-hydrate all restored profile slide cards so inputs and navigation match localStorage
  const profileCards = container.querySelectorAll('.profile-slide-card');
  profileCards.forEach(card => {
    syncProfileCardToStorage(card.id);
  });

  // Re-hydrate voice session summaries: bungkus ke struktur body + expand bar
  container.querySelectorAll('.voice-session-summary').forEach(el => {
    // Hanya proses jika belum dibungkus (legacy flat HTML)
    if (!el.querySelector('.voice-session-body')) {
      let rawHtml = el.innerHTML
        .replace(/^(\s*---(\s*<br\s*\/?>)*)+/gi, '')
        .replace(/((\s*<br\s*\/?>)*\s*---(\s*<br\s*\/?>)*)+$/gi, '')
        .trim();

      // Coba ekstrak durasi dari teks header
      let duration = '';
      const durMatch = rawHtml.match(/Voice Session\s*\(([^)]+)\)/i);
      if (durMatch) {
        duration = durMatch[1];
        rawHtml = rawHtml.replace(/^[^<\n]*Voice Session[^<\n]*(<br\s*\/?>)*/i, '').trim();
      }

      el.innerHTML = `
        <div class="voice-session-header">
          <div class="voice-session-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-terracotta);">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <span>Voice Consultation Session</span>
          </div>
          ${duration ? `<span class="voice-session-badge">${escapeHtml(duration)}</span>` : ''}
        </div>
        <div class="voice-session-body">
          ${rawHtml}
        </div>
      `;
    }

    // Tambahkan expand bar jika konten cukup panjang dan belum ada bar
    const body = el.querySelector('.voice-session-body');
    if (body && !el.querySelector('.voice-session-expand-bar')) {
      // Gunakan estimasi panjang teks karena scrollHeight belum akurat di paint pertama
      const needsClamp = body.textContent.trim().length > 200;
      if (needsClamp) {
        el.classList.add('is-clamped');
        const bar = document.createElement('div');
        bar.className = 'voice-session-expand-bar';
        bar.innerHTML = `
          <button type="button" class="voice-session-expand-btn" onclick="toggleVoiceSessionClamp(this)">
            <span class="expand-text">Selengkapnya</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        `;
        el.appendChild(bar);
      }
    }
  });

  scrollToBottom();
}

function getHeroHtml() {
  const lang = getAppLanguage();
  const t = APP_TRANSLATIONS[lang] || APP_TRANSLATIONS.id;
  return `
    <div class="claude-hero" id="claude-hero">
      <img src="/assets/neura_logo.jpg" alt="Neura Logo" class="hero-neura-logo"
        onerror="this.style.display='none'" />
      <h1 class="hero-greeting" id="hero-greeting-text">${t.greet_evening}</h1>
      <p class="hero-subhead">${t.hero_subhead}</p>

      <!-- 4 Action Cards -->
      <div class="hero-cards-grid">
        <div class="hero-card" onclick="submitCommand('/train 50')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            <span>${t.card_train_title}</span>
          </div>
          <div class="hero-card-desc">${t.card_train_desc}</div>
        </div>

        <div class="hero-card" onclick="submitCommand('/predict')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span>${t.card_predict_title}</span>
          </div>
          <div class="hero-card-desc">${t.card_predict_desc}</div>
        </div>

        <div class="hero-card" onclick="submitCommand('/eval')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>${t.card_eval_title}</span>
          </div>
          <div class="hero-card-desc">${t.card_eval_desc}</div>
        </div>

        <div class="hero-card" onclick="submitCommand('/status')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
            <span>${t.card_specs_title}</span>
          </div>
          <div class="hero-card-desc">${t.card_specs_desc}</div>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Start New Chat Action
// --------------------------------------------------------------------------
function startNewChat(showNotification = true) {
  activeSessionId = null;
  try {
    localStorage.setItem(LAST_SESSION_STORAGE_KEY, 'new');
    localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
  } catch(e) {}
  renderRecentChatsSidebar();

  const container = document.getElementById('chat-content-container');
  container.innerHTML = getHeroHtml();
  setupGreeting();

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    updateSendBtnState();
  }

  if (showNotification) {
    showToast('New conversation ready', 'info');
  }
}

// --------------------------------------------------------------------------
// Theme Switching (Claude Warm Linen <-> Claude Obsidian Dark)
// --------------------------------------------------------------------------
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  try { localStorage.setItem('neura_theme_v1', next); } catch(e) {}
  showToast(`Switched to ${next === 'dark' ? 'Obsidian Dark' : 'Warm Linen'} mode`, 'info');
  // Sync dot menu theme label
  syncDotMenuState();
}

// --------------------------------------------------------------------------
// Sidebar Controls
// --------------------------------------------------------------------------
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const openBtn = document.getElementById('open-sidebar-btn');
  sidebar.classList.toggle('collapsed');
  if (sidebar.classList.contains('collapsed')) {
    openBtn.style.display = 'grid';
  } else {
    openBtn.style.display = window.innerWidth <= 768 ? 'grid' : 'none';
  }
}

// --------------------------------------------------------------------------
// Textarea input auto-grow & key handling
// --------------------------------------------------------------------------
function handleTextareaInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  updateSendBtnState();
  const draftEnabled = localStorage.getItem('neura_draft_enabled') !== 'false';
  if (draftEnabled) {
    try {
      if (el.value.trim().length > 0) {
        localStorage.setItem(DRAFT_INPUT_STORAGE_KEY, el.value);
      } else {
        localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
      }
    } catch(e) {}
  }
}

function handleTextareaKey(e) {
  if (e.key === 'Escape') {
    if (isChatVoiceListening) {
      e.preventDefault();
      cancelChatVoiceInput();
      return;
    }
    closeQuickMenu();
  }

  const sendOnEnter = localStorage.getItem('neura_send_on_enter') !== 'false';
  if (e.key === 'Enter') {
    if (sendOnEnter && !e.shiftKey) {
      e.preventDefault();
      if (isChatVoiceListening) {
        stopChatVoiceInput(true);
      } else {
        sendUserMessage();
      }
    } else if (!sendOnEnter && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (isChatVoiceListening) {
        stopChatVoiceInput(true);
      } else {
        sendUserMessage();
      }
    }
  }
}

// --------------------------------------------------------------------------
// Quick Commands Popup Menu (+)
// --------------------------------------------------------------------------
function toggleQuickMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('quick-menu');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  if (isHidden) {
    menu.style.display = 'flex';
    setTimeout(() => {
      document.addEventListener('click', closeQuickMenuOnOutside);
    }, 10);
  } else {
    closeQuickMenu();
  }
}

function closeQuickMenu() {
  const menu = document.getElementById('quick-menu');
  if (menu) menu.style.display = 'none';
  document.removeEventListener('click', closeQuickMenuOnOutside);
}

function closeQuickMenuOnOutside(e) {
  const menu = document.getElementById('quick-menu');
  const btn = document.getElementById('input-attach-btn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    closeQuickMenu();
  }
}

window.toggleQuickMenu = toggleQuickMenu;
window.closeQuickMenu = closeQuickMenu;

function renderSuggestionChip(text) {
  const isCmd = text.includes('/') || /^(simulasi|jalankan|evaluasi|latih|cek status)/i.test(text);
  const iconSvg = isCmd
    ? `<svg class="chip-solid-icon chip-icon-cmd" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
    : `<svg class="chip-solid-icon chip-icon-msg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  const chipClass = isCmd ? 'suggestion-chip is-cmd' : 'suggestion-chip';
  const cleanText = escapeHtml(text);
  return `<button type="button" class="${chipClass}" data-cmd="${cleanText}" onclick="handleChipClick(this)">${iconSvg}<span>${cleanText}</span></button>`;
}

function handleChipClick(btn) {
  if (!btn) return;
  const cmd = btn.getAttribute('data-cmd') || btn.innerText;
  if (!cmd) return;
  submitCommand(cmd.trim());
}

function submitCommand(cmd) {
  if (!cmd) return;

  if (cmd.trim().toLowerCase() === '/voice') {
    if (typeof window.openVoiceChat === 'function') {
      window.openVoiceChat();
      return;
    }
  }

  // If the suggestion chip contains a slash command (e.g. /status, /predict, /eval, /train 5, /help, /voice, /intro, /konsul), extract and run it
  const slashMatch = cmd.match(/\/(status|predict|eval|train(?:\s+\d+)?|help|progress|voice|intro|about|konsul)\b/i);
  let finalCmd = cmd;
  if (slashMatch && (cmd.startsWith('/') || cmd.includes('/'))) {
    finalCmd = slashMatch[0];
  }

  // Force stop any ongoing typewriter streaming and clear input
  stopRequested = true;
  setGeneratingState(false);

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    updateSendBtnState();
  }

  // Send message directly with the command
  sendUserMessage(finalCmd);
}

// --------------------------------------------------------------------------
// Message Sending & Pipeline
// --------------------------------------------------------------------------
async function waitLoad(startTime, minMs = 450) {
  const elapsed = Date.now() - startTime;
  if (elapsed < minMs) {
    await new Promise(r => setTimeout(r, minMs - elapsed));
  }
}

async function sendUserMessage(textOverride = null) {
  // Block when offline
  if (!_isOnline) {
    showToast('Tidak ada koneksi internet', 'error');
    return;
  }

  const input = document.getElementById('chat-input-textarea');
  const text = (textOverride !== null ? String(textOverride) : (input ? input.value : '')).trim();
  if (!text) return;

  // Reset states
  if (isTyping) {
    stopRequested = true;
    setGeneratingState(false);
  }
  stopRequested = false;

  // If no active session exists, create a new one with title from this initial input!
  if (!activeSessionId) {
    const newSession = {
      id: 'session_' + Date.now(),
      title: formatSessionTitle(text),
      createdAt: Date.now(),
      messages: []
    };
    chatSessions.unshift(newSession);
    activeSessionId = newSession.id;
    saveChatSessions();
    try {
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, newSession.id);
    } catch(e) {}
    renderRecentChatsSidebar();
  }

  // Clear input & draft
  input.value = '';
  input.style.height = 'auto';
  try {
    localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
  } catch(e) {}
  updateSendBtnState();

  // Remove hero if present
  const hero = document.getElementById('claude-hero');
  if (hero) hero.remove();

  // Append User Message Bubble
  appendUserBubble(text);

  // Show Claude typing dots
  const typingId = showTypingIndicator();
  setGeneratingState(true);

  const preview = text.length > 26 ? text.slice(0, 26) + '...' : text;
  setDynamicIslandState('thinking', {
    sub: `Processing: "${preview}"`,
    main: 'Thinking'
  });

  const startTime = Date.now();

  try {
    await processMLInput(text, typingId, startTime);
  } catch(err) {
    await waitLoad(startTime, 350);
    removeTypingIndicator(typingId);
    appendAssistantMessage(`<p style="color:var(--accent-red)">Error: ${escapeHtml(err.message)}</p>`, { stream: false });
  } finally {
    setGeneratingState(false);
    playSuccessChime();
    if (currentIslandState !== 'training') {
      setDynamicIslandState('ready', {
        sub: 'Response complete \u2022 Neura MLP',
        main: 'Ready',
        keepTimer: true
      });
    }
  }
}

// --------------------------------------------------------------------------
// Command Execution & Processing
// --------------------------------------------------------------------------
async function processMLInput(rawText, typingId, startTime) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (lower === '/help' || lower.endsWith('/help')) {
    await waitLoad(startTime, 400);
    removeTypingIndicator(typingId);
    renderHelpOutput();

  } else if (lower === '/intro' || lower.endsWith('/intro') || lower === '/about') {
    setDynamicIslandState('generating', {
      sub: 'Pengenalan Neura \u2022 AI Skrining Alzheimer',
      main: 'Intro'
    });
    try {
      const chatRes = await fetchJSON('/api/chat', 'POST', { message: 'pengenalan neura ai' });
      await waitLoad(startTime, 450);
      removeTypingIndicator(typingId);
      if (chatRes && chatRes.reply) {
        const formatted = formatConsultationReply(chatRes.reply);
        appendAssistantMessage(formatted, {
          stream: true,
          suggestions: chatRes.suggestions || ['Saya ingin konsultasi daya ingat', 'Apa saja gejala awal Alzheimer?', 'Coba diagnosis pasien /predict']
        });
      }
    } catch(e) {
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      appendAssistantMessage(`
        <p>Halo! Selamat datang di <strong>Neura AI</strong> — asisten cerdas untuk skrining kesehatan daya ingat dan deteksi dini risiko penyakit Alzheimer.</p>
        <p>Neura menggabungkan analisis 32 biomarker klinis berbasis model <strong>XGBoost</strong> dengan akurasi 95.35% serta konsultasi interaktif.</p>
      `, {
        stream: true,
        suggestions: ['/predict', '/status', '/eval', 'Konsultasi']
      });
    }

  } else if (lower === '/status' || lower.endsWith('/status')) {
    const data = await fetchJSON('/api/status');
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);
    renderStatusOutput(data);

  } else if (lower.startsWith('/train') || lower.includes('/train')) {
    const parts = text.split(/\s+/);
    const defaultEpochs = parseInt(localStorage.getItem('neura_default_epochs')) || 50;
    const epochs = parseInt(parts[1]) || defaultEpochs;
    setDynamicIslandState('training', {
      sub: `Training XGBoost \u2022 ${epochs} Boosting Rounds`,
      main: 'Training...'
    });
    const data = await fetchJSON('/api/train', 'POST', { epochs });
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);

    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Training Error: ${escapeHtml(data.error)}</p>`, { stream: false });
    } else {
      appendAssistantMessage(`
        <h4>XGBoost Training Initialized</h4>
        <p>Executing gradient boosting training for <strong>${epochs} boosting rounds</strong> on <code>AlzheimersXGBoost</code> (datasets/alzheimers_disease_data.csv).</p>
        <div class="terracotta-progress-wrap" id="live-progress-container">
          <div class="progress-meta-row">
            <span id="optimization-status-text">Optimization Progress</span>
            <span id="epoch-progress-counter">Round 0 / ${epochs}</span>
          </div>
          <div class="progress-bar-base">
            <div class="progress-bar-fill" id="live-progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-meta-sub" id="live-metrics-text" style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:7px;font-family:'JetBrains Mono',monospace">
            <span>Estimating tree gradients...</span>
            <span>0%</span>
          </div>
        </div>
      `, { stream: false });
      startProgressPolling(epochs);
    }

  } else if (lower === '/eval' || lower.endsWith('/eval')) {
    setDynamicIslandState('evaluating', {
      sub: 'Evaluating Alzheimer XGBoost on holdout test set...',
      main: 'Evaluating'
    });
    const data = await fetchJSON('/api/evaluate', 'POST');
    await waitLoad(startTime, 500);
    removeTypingIndicator(typingId);
    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Evaluation Error: ${escapeHtml(data.error)}</p>`, { stream: false });
    } else {
      renderEvaluationOutput(data);
    }

  } else if (lower === '/predict' || lower.endsWith('/predict')) {
    setDynamicIslandState('predicting', {
      sub: 'Analyzing 32 clinical biomarkers \u2022 Alzheimer Inference',
      main: 'Diagnosing'
    });
    const data = await fetchJSON('/api/predict', 'POST', {});
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);
    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Prediction Error: ${escapeHtml(data.error)}</p>`, { stream: false });
    } else {
      renderPredictionOutput(data);
    }

  } else if (lower === '/progress' || lower.endsWith('/progress')) {
    setDynamicIslandState('thinking', {
      sub: 'Fetching real-time training telemetry...',
      main: 'Inspecting'
    });
    const data = await fetchJSON('/api/train/progress');
    await waitLoad(startTime, 400);
    removeTypingIndicator(typingId);
    renderProgressOutput(data);

  } else if (/\b(konsul|konsultasi|tanya dokter|tanya keluhan|cek kesehatan|periksa|data diri|biodata|profil|profile)\b/i.test(text) || lower === '/profile' || lower === '/konsultasi') {
    // Consultation & User Profile Intake Handler
    const existingProfile = getUserProfile();

    if (lower === '/profile reset' || lower === 'reset profil' || lower === 'ubah data diri') {
      clearUserProfile();
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      const formId = 'profile_form_' + Date.now();
      appendAssistantMessage(`
        <p>Data diri Anda telah di-reset. Silakan lengkapi kembali formulir bertahap di bawah ini untuk memulai konsultasi klinis terbaru:</p>
        ${renderProfileSlideCard(formId)}
      `, { stream: false });
      return;
    }

    if (!existingProfile) {
      // User hasn't registered profile in localStorage yet!
      setDynamicIslandState('generating', {
        sub: 'Data Diri Pasien \u2022 Neura Clinical Intake',
        main: 'Generating'
      });
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      const formId = 'profile_form_' + Date.now();
      appendAssistantMessage(`
        <p>Halo! Senang bisa mendampingi Anda di <strong>Neura Clinical AI</strong>. 🧠</p>
        <p>Agar saya dapat memberikan konsultasi dan estimasi risiko kognitif Alzheimer yang akurat sesuai kondisi biologis Anda, mohon lengkapi <strong>Data Diri & Klinis</strong> awal Anda melalui formulir bertahap di bawah ini:</p>
        ${renderProfileSlideCard(formId)}
      `, { stream: false });
      return;
    } else {
      // User already has profile in localStorage!
      setDynamicIslandState('generating', {
        sub: `Konsultasi Pasien \u2022 ${existingProfile.name}`,
        main: 'Generating'
      });
      await waitLoad(startTime, 450);
      removeTypingIndicator(typingId);

      const comorbText = existingProfile.comorbidities && existingProfile.comorbidities.length > 0
        ? existingProfile.comorbidities.join(', ')
        : 'Tidak ada komorbiditas';
      const sympText = existingProfile.symptoms && existingProfile.symptoms.length > 0
        ? existingProfile.symptoms.join(', ')
        : 'Skrining preventif';

      appendAssistantMessage(`
        <p>Halo <strong>${escapeHtml(existingProfile.name)}</strong> (Usia: <strong>${existingProfile.age} thn</strong>, BMI: <strong>${existingProfile.bmi || '—'} (${existingProfile.bmiCategory})</strong>) 👋</p>
        <p>Saya siap mendampingi sesi konsultasi kognitif Anda. Pada catatan klinis tersimpan, Anda memiliki riwayat: <em>${escapeHtml(comorbText)}</em> dengan keluhan: <em>${escapeHtml(sympText)}</em>.</p>
        <p>Apa yang ingin Anda konsultasikan lebih lanjut hari ini? Anda bisa menanyakan analisis gejala, pencegahan demensia, atau menjalankan uji biomarker prediktif.</p>
        ${renderSavedProfileCard(existingProfile)}
      `, {
        stream: true,
        suggestions: ['/predict', 'Bagaimana cara mencegah Alzheimer?', 'Gejala awal demensia', 'Ubah data diri']
      });
      return;
    }

  } else {
    // Natural Language Assistant Response powered by Chat Dataset
    try {
      setDynamicIslandState('thinking', {
        sub: 'Matching intent \u2022 chat_dataset.py',
        main: 'Thinking'
      });

      let currentUserName = '';
      try {
        const authRaw = localStorage.getItem('neura_auth_user');
        if (authRaw) {
          const u = JSON.parse(authRaw);
          currentUserName = u.name || (u.displayName ? u.displayName : '') || (u.email ? u.email.split('@')[0] : '');
        }
        if (!currentUserName) {
          const prof = getUserProfile();
          if (prof && prof.name) currentUserName = prof.name;
        }
        if (!currentUserName) {
          const nameEl = document.getElementById('sidebar-user-name');
          if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
            currentUserName = nameEl.textContent.trim();
          }
        }
      } catch (err) {}
      if (!currentUserName || currentUserName === 'Pengguna') {
        currentUserName = 'Hanzz';
      }

      const chatRes = await fetchJSON('/api/chat', 'POST', { message: text, user_name: currentUserName });
      await waitLoad(startTime, 500);
      removeTypingIndicator(typingId);
      if (chatRes && chatRes.reply) {
        setDynamicIslandState('generating', {
          sub: `Konsultasi \u2022 ${chatRes.topic || 'Neura Clinical AI'}`,
          main: 'Generating'
        });
        let replyText = chatRes.reply;
        if (Array.isArray(replyText)) {
          replyText = replyText[0] || '';
        }
        if (typeof replyText === 'string' && replyText.includes('<<nama>>')) {
          replyText = replyText.replace(/<<nama>>/g, currentUserName);
        }
        const formatted = formatConsultationReply(replyText);
        appendAssistantMessage(formatted, {
          stream: true,
          suggestions: chatRes.suggestions || []
        });
      } else {
        setDynamicIslandState('generating', {
          sub: 'Konsultasi Klinis \u2022 Neura XGBoost',
          main: 'Generating'
        });
        const conv = generateConversationalReply(text);
        appendAssistantMessage(conv, { stream: true });
      }
    } catch(e) {
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      setDynamicIslandState('generating', {
        sub: 'Konsultasi Klinis \u2022 Neura XGBoost',
        main: 'Generating'
      });
      const conv = generateConversationalReply(text);
      appendAssistantMessage(conv, { stream: true });
    }
  }
}

// --------------------------------------------------------------------------
// Multi-Step Profile Slide Form & Clinical Intake Engine
// --------------------------------------------------------------------------
function getUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveUserProfile(profile) {
  try {
    profile.updatedAt = new Date().toISOString();
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error('Failed to save profile to localStorage:', e);
    return false;
  }
}

function clearUserProfile() {
  try {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

function calculateBMI(weightKg, heightCm) {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);
  if (!w || !h || w <= 0 || h <= 0) return null;
  const heightM = h / 100;
  const bmi = +(w / (heightM * heightM)).toFixed(1);
  let category = 'Normal';
  let pillClass = 'normal';
  if (bmi < 18.5) {
    category = 'Underweight';
    pillClass = 'underweight';
  } else if (bmi < 25) {
    category = 'Normal';
    pillClass = 'normal';
  } else if (bmi < 30) {
    category = 'Overweight';
    pillClass = 'overweight';
  } else {
    category = 'Obesitas';
    pillClass = 'obese';
  }
  return { bmi, category, pillClass };
}

function renderProfileSlideCard(formId) {
  const saved = getUserProfile();
  const hasSaved = !!(saved && saved.name);
  const TOTAL_STEPS = 16;
  const initialStep = hasSaved ? TOTAL_STEPS : 1;
  const initialProgress = hasSaved ? 100 : (100 / TOTAL_STEPS);

  const data = hasSaved ? {
    // Reguler
    name: saved.name || '',
    age: parseInt(saved.age) || 40,
    gender: saved.gender || '',
    ethnicity: saved.ethnicity ?? 0,
    educationLevel: saved.educationLevel ?? 1,
    height: saved.height || '',
    weight: saved.weight || '',
    // Gaya Hidup
    smoking: saved.smoking ?? 0,
    alcoholConsumption: saved.alcoholConsumption ?? 5,
    physicalActivity: saved.physicalActivity ?? 5,
    dietQuality: saved.dietQuality ?? 5,
    sleepQuality: saved.sleepQuality ?? 7,
    // Riwayat Penyakit
    familyHistoryAlzheimers: saved.familyHistoryAlzheimers ?? 0,
    cardiovascularDisease: saved.cardiovascularDisease ?? 0,
    diabetes: saved.diabetes ?? 0,
    depression: saved.depression ?? 0,
    headInjury: saved.headInjury ?? 0,
    hypertension: saved.hypertension ?? 0,
    // Biomarker Tekanan Darah
    systolicBP: saved.systolicBP ?? 120,
    diastolicBP: saved.diastolicBP ?? 80,
    // Biomarker Kolesterol
    cholesterolTotal: saved.cholesterolTotal ?? 200,
    cholesterolLDL: saved.cholesterolLDL ?? 100,
    cholesterolHDL: saved.cholesterolHDL ?? 50,
    cholesterolTriglycerides: saved.cholesterolTriglycerides ?? 150,
    // Skor Kognitif
    mmse: saved.mmse ?? 25,
    functionalAssessment: saved.functionalAssessment ?? 7,
    adl: saved.adl ?? 7,
    // Gejala Kognitif Spesifik
    memoryComplaints: saved.memoryComplaints ?? 0,
    behavioralProblems: saved.behavioralProblems ?? 0,
    confusion: saved.confusion ?? 0,
    disorientation: saved.disorientation ?? 0,
    personalityChanges: saved.personalityChanges ?? 0,
    difficultyCompletingTasks: saved.difficultyCompletingTasks ?? 0,
    forgetfulness: saved.forgetfulness ?? 0,
    // Legacy
    comorbidities: Array.isArray(saved.comorbidities) ? saved.comorbidities : [],
    symptoms: Array.isArray(saved.symptoms) ? saved.symptoms : [],
    familyHistory: saved.familyHistory || 'no'
  } : {
    name: '', age: 40, gender: '',
    ethnicity: 0, educationLevel: 1,
    height: '', weight: '',
    smoking: 0, alcoholConsumption: 5, physicalActivity: 5, dietQuality: 5, sleepQuality: 7,
    familyHistoryAlzheimers: 0, cardiovascularDisease: 0, diabetes: 0, depression: 0, headInjury: 0, hypertension: 0,
    systolicBP: 120, diastolicBP: 80,
    cholesterolTotal: 200, cholesterolLDL: 100, cholesterolHDL: 50, cholesterolTriglycerides: 150,
    mmse: 25, functionalAssessment: 7, adl: 7,
    memoryComplaints: 0, behavioralProblems: 0, confusion: 0, disorientation: 0,
    personalityChanges: 0, difficultyCompletingTasks: 0, forgetfulness: 0,
    comorbidities: [], symptoms: [], familyHistory: 'no'
  };

  activeProfileForms[formId] = {
    currentStep: initialStep,
    totalSteps: TOTAL_STEPS,
    data: data
  };

  const bmiInfo = calculateBMI(data.weight, data.height);

  // Helper: slider row
  function sliderRow(id, label, min, max, value, unit = '', step = 1) {
    const pct = ((value - min) / (max - min)) * 100;
    return `
      <div class="tf-adv-slider-group">
        <div class="tf-adv-slider-header">
          <span class="tf-adv-slider-label">${label}</span>
          <span class="tf-adv-slider-val" id="${formId}_${id}_val">${value}${unit}</span>
        </div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"
          class="tf-slider tf-adv-slider" id="${formId}_${id}"
          style="--slider-pct:${pct}%"
          oninput="onAdvSlider('${formId}','${id}',this.value,'${unit}')" />
        <div class="tf-adv-slider-range"><span>${min}${unit}</span><span>${max}${unit}</span></div>
      </div>`;
  }

  // Helper: binary toggle row
  function binaryRow(id, label, trueLabel = 'Ya', falseLabel = 'Tidak') {
    const val = data[id] ?? 0;
    return `
      <div class="tf-binary-row">
        <span class="tf-binary-label">${label}</span>
        <div class="tf-binary-toggle">
          <button type="button" class="tf-binary-btn ${val === 0 ? 'active-no' : ''}" data-v="0"
            onclick="onBinaryToggle('${formId}','${id}',0,this)">${falseLabel}</button>
          <button type="button" class="tf-binary-btn ${val === 1 ? 'active-yes' : ''}" data-v="1"
            onclick="onBinaryToggle('${formId}','${id}',1,this)">${trueLabel}</button>
        </div>
      </div>`;
  }

  return `
    <div class="profile-slide-card" id="${formId}">
      <div class="profile-slide-header">
        <div class="profile-slide-title">
          <svg class="profile-slide-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          <span>Data Diri &amp; Klinis Pasien</span>
        </div>
        <span class="profile-slide-step-counter" id="${formId}_counter">${initialStep} / ${TOTAL_STEPS}</span>
      </div>

      <!-- Phase label bar -->
      <div class="profile-phase-bar" id="${formId}_phasebar">
        <div class="profile-phase-steps">
          <span class="profile-phase-tag phase-reguler ${initialStep <= 9 ? 'is-active' : 'is-completed'}" id="${formId}_tag_reguler">
            <span class="phase-tag-icon">${initialStep > 9 ? '✓' : '📋'}</span>
            <span>Reguler</span>
          </span>
          <svg class="profile-phase-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="profile-phase-tag phase-advanced ${initialStep >= 10 ? 'is-active' : 'is-upcoming'}" id="${formId}_tag_advanced">
            <span class="phase-tag-icon">🔬</span>
            <span>Klinis Lanjutan</span>
          </span>
        </div>
        <span class="profile-progress-pct" id="${formId}_pct">${Math.round(initialProgress)}%</span>
      </div>

      <div class="profile-progress-bar">
        <div class="profile-progress-fill" id="${formId}_progress" style="width: ${initialProgress}%"></div>
      </div>

      <div class="slide-track-viewport">
        <div class="slide-track" id="${formId}_track">

          <!-- ══════════════════════════════════════════════════════════
               BAGIAN REGULER (Slide 1–9)
               ══════════════════════════════════════════════════════════ -->

          <!-- SLIDE 1: Nama -->
          <div class="slide-pane typeform-pane ${initialStep === 1 ? 'active' : ''}" data-step="1">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">01 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Siapa nama atau panggilan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Nama panggilan sudah cukup — digunakan untuk mempersonalisasi konsultasi.</div>
            <input type="text" class="tf-input" id="${formId}_name" placeholder="Nama atau panggilan..."
              value="${escapeHtml(data.name)}"
              oninput="onProfileInput('${formId}', 'name', this.value)"
              onkeyup="onProfileInput('${formId}', 'name', this.value)"
              onchange="onProfileInput('${formId}', 'name', this.value)"
              onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }"
              autocomplete="off" autofocus />
          </div>

          <!-- SLIDE 2: Usia -->
          <div class="slide-pane typeform-pane ${initialStep === 2 ? 'active' : ''}" data-step="2">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">02 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa usia Anda saat ini? <span class="tf-required">*</span></div>
            <div class="tf-hint">Usia adalah faktor risiko utama dalam diagnosis Alzheimer.</div>
            <div class="tf-age-display" id="${formId}_age_display">${data.age} <span>tahun</span></div>
            <div class="tf-slider-wrap">
              <span class="tf-slider-label">1</span>
              <input type="range" min="1" max="100" value="${data.age}" class="tf-slider" id="${formId}_age"
                oninput="onProfileAgeSlider('${formId}', this.value)" />
              <span class="tf-slider-label">100</span>
            </div>
            <div class="tf-age-risk" id="${formId}_age_risk">Usia dewasa — risiko Alzheimer rendah hingga menengah</div>
          </div>

          <!-- SLIDE 3: Jenis Kelamin -->
          <div class="slide-pane typeform-pane ${initialStep === 3 ? 'active' : ''}" data-step="3">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">03 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Jenis kelamin biologis Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Digunakan sebagai parameter biomarker dalam model prediktif kami.</div>
            <div class="tf-gender-grid">
              <button type="button" class="tf-gender-btn ${data.gender === 'male' ? 'active' : ''}" data-gender="male" id="${formId}_gender_male" onclick="onProfileGender('${formId}', 'male')">
                <div class="tf-gender-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.75A2.25 2.25 0 1 1 11.25 14 2.25 2.25 0 0 1 9 11.75M16.5 3h4.5v4.5h-1.5V5.56l-4.91 4.91A5.25 5.25 0 1 1 13 9.09l4.91-4.91H16.5z"/></svg></div>
                <span>Laki-laki</span>
              </button>
              <button type="button" class="tf-gender-btn ${data.gender === 'female' ? 'active' : ''}" data-gender="female" id="${formId}_gender_female" onclick="onProfileGender('${formId}', 'female')">
                <div class="tf-gender-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2a5.5 5.5 0 1 0 5.5 5.5A5.51 5.51 0 0 0 11.5 2zm0 9A3.5 3.5 0 1 1 15 7.5 3.5 3.5 0 0 1 11.5 11zM12.5 13h-2v3H8v2h2.5v3h2v-3H15v-2h-2.5z"/></svg></div>
                <span>Perempuan</span>
              </button>
            </div>
          </div>

          <!-- SLIDE 4: Demografi (Etnisitas + Pendidikan) -->
          <div class="slide-pane typeform-pane ${initialStep === 4 ? 'active' : ''}" data-step="4">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">04 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Latar belakang & pendidikan Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Faktor demografi untuk akurasi model prediktif populasi Asia.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label">Etnisitas</div>
              <div class="tf-chip-row" id="${formId}_ethnicity_chips">
                ${[['Kaukasia',0],['Asia-Amerika',1],['Afrika-Amerika',2],['Lainnya',3]].map(([lbl,val]) =>
                  `<button type="button" class="tf-chip-btn ${data.ethnicity === val ? 'selected' : ''}" data-v="${val}"
                    onclick="onChipSelect('${formId}','ethnicity',${val},this)">${lbl}</button>`
                ).join('')}
              </div>
              <div class="tf-adv-field-label" style="margin-top:14px">Tingkat Pendidikan</div>
              <div class="tf-chip-row" id="${formId}_educationLevel_chips">
                ${[['Tidak Sekolah',0],['SMA',1],['D3/S1',2],['S2/S3',3]].map(([lbl,val]) =>
                  `<button type="button" class="tf-chip-btn ${data.educationLevel === val ? 'selected' : ''}" data-v="${val}"
                    onclick="onChipSelect('${formId}','educationLevel',${val},this)">${lbl}</button>`
                ).join('')}
              </div>
            </div>
          </div>

          <!-- SLIDE 5: Tinggi Badan -->
          <div class="slide-pane typeform-pane ${initialStep === 5 ? 'active' : ''}" data-step="5">
            <div class="tf-section-label reguler-label">📋 Data Fisik</div>
            <div class="tf-question-number">05 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa tinggi badan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Digunakan bersama berat badan untuk menghitung BMI.</div>
            <div class="tf-unit-input-wrap">
              <input type="number" min="100" max="240" class="tf-unit-input" id="${formId}_height" placeholder="168" value="${data.height || ''}"
                oninput="onProfileInput('${formId}', 'height', this.value)"
                onkeyup="onProfileInput('${formId}', 'height', this.value)"
                onchange="onProfileInput('${formId}', 'height', this.value)"
                onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
              <span class="tf-unit-badge">cm</span>
            </div>
            <div class="tf-range-hint">Rentang normal: 100 – 240 cm</div>
          </div>

          <!-- SLIDE 6: Berat Badan & BMI -->
          <div class="slide-pane typeform-pane ${initialStep === 6 ? 'active' : ''}" data-step="6">
            <div class="tf-section-label reguler-label">📋 Data Fisik</div>
            <div class="tf-question-number">06 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa berat badan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Berat badan untuk menghitung BMI secara otomatis.</div>
            <div class="tf-unit-input-wrap">
              <input type="number" min="30" max="250" class="tf-unit-input" id="${formId}_weight" placeholder="65" value="${data.weight || ''}"
                oninput="onProfileInput('${formId}', 'weight', this.value)"
                onkeyup="onProfileInput('${formId}', 'weight', this.value)"
                onchange="onProfileInput('${formId}', 'weight', this.value)"
                onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
              <span class="tf-unit-badge">kg</span>
            </div>
            <div class="profile-bmi-box" id="${formId}_bmi_box" style="margin-top:14px">
              <span>Estimasi BMI:</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="profile-bmi-val" id="${formId}_bmi_val">${bmiInfo ? bmiInfo.bmi : '—'}</span>
                <span class="profile-bmi-pill ${bmiInfo ? bmiInfo.pillClass : ''}" id="${formId}_bmi_pill" style="${bmiInfo ? 'display:inline-block' : 'display:none'}">${bmiInfo ? bmiInfo.category : 'Normal'}</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 7: Gaya Hidup -->
          <div class="slide-pane typeform-pane ${initialStep === 7 ? 'active' : ''}" data-step="7">
            <div class="tf-section-label reguler-label">📋 Gaya Hidup</div>
            <div class="tf-question-number">07 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Gaya hidup harian Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Faktor gaya hidup berpengaruh besar pada risiko kognitif. Geser slider ke posisi yang sesuai.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label" style="margin-bottom:4px">Merokok</div>
              <div class="tf-binary-row">
                <span class="tf-binary-label">Apakah Anda merokok?</span>
                <div class="tf-binary-toggle">
                  <button type="button" class="tf-binary-btn ${data.smoking === 0 ? 'active-no' : ''}" data-v="0"
                    onclick="onBinaryToggle('${formId}','smoking',0,this)">Tidak</button>
                  <button type="button" class="tf-binary-btn ${data.smoking === 1 ? 'active-yes' : ''}" data-v="1"
                    onclick="onBinaryToggle('${formId}','smoking',1,this)">Ya</button>
                </div>
              </div>
              ${sliderRow('alcoholConsumption', 'Konsumsi Alkohol', 0, 20, data.alcoholConsumption, ' unit/minggu')}
              ${sliderRow('physicalActivity', 'Aktivitas Fisik', 0, 10, data.physicalActivity, ' jam/minggu')}
              ${sliderRow('dietQuality', 'Kualitas Diet', 0, 10, data.dietQuality, '/10')}
              ${sliderRow('sleepQuality', 'Kualitas Tidur', 4, 10, data.sleepQuality, '/10')}
            </div>
          </div>

          <!-- SLIDE 8: Riwayat Penyakit -->
          <div class="slide-pane typeform-pane ${initialStep === 8 ? 'active' : ''}" data-step="8">
            <div class="tf-section-label reguler-label">📋 Riwayat Medis</div>
            <div class="tf-question-number">08 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Riwayat kondisi medis? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Tandai kondisi yang Anda miliki atau pernah terdiagnosis.</div>
            <div class="tf-adv-group">
              ${binaryRow('familyHistoryAlzheimers', '🧬 Riwayat Keluarga Alzheimer')}
              ${binaryRow('cardiovascularDisease', '❤️ Penyakit Kardiovaskular')}
              ${binaryRow('diabetes', '🩸 Diabetes')}
              ${binaryRow('depression', '🧠 Depresi')}
              ${binaryRow('headInjury', '🤕 Riwayat Cedera Kepala')}
              ${binaryRow('hypertension', '💊 Hipertensi')}
            </div>
          </div>

          <!-- SLIDE 9: Riwayat Keluarga (Alzheimer spesifik) -->
          <div class="slide-pane typeform-pane ${initialStep === 9 ? 'active' : ''}" data-step="9">
            <div class="tf-section-label reguler-label">📋 Riwayat Keluarga</div>
            <div class="tf-question-number">09 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Adakah riwayat keluarga dengan Alzheimer atau Demensia? <span class="tf-required">*</span></div>
            <div class="tf-hint">Faktor genetik meningkatkan risiko hingga 2× lipat jika ada kerabat tingkat pertama yang terdiagnosis.</div>
            <div class="tf-family-grid">
              <button type="button" class="tf-family-btn ${data.familyHistory === 'yes' ? 'active' : ''}" data-val="yes" id="${formId}_fam_yes" onclick="onProfileFamilyHistory('${formId}', 'yes')">
                <div class="tf-family-icon tf-fam-yes">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                </div>
                <div class="tf-family-label">Ya, ada riwayat</div>
                <div class="tf-family-sub">Keluarga tingkat pertama</div>
              </button>
              <button type="button" class="tf-family-btn ${data.familyHistory === 'no' ? 'active' : ''}" data-val="no" id="${formId}_fam_no" onclick="onProfileFamilyHistory('${formId}', 'no')">
                <div class="tf-family-icon tf-fam-no">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
                <div class="tf-family-label">Tidak ada</div>
                <div class="tf-family-sub">Tidak diketahui riwayatnya</div>
              </button>
              <button type="button" class="tf-family-btn ${data.familyHistory === 'unknown' ? 'active' : ''}" data-val="unknown" id="${formId}_fam_unknown" onclick="onProfileFamilyHistory('${formId}', 'unknown')">
                <div class="tf-family-icon tf-fam-unknown">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </div>
                <div class="tf-family-label">Kurang yakin</div>
                <div class="tf-family-sub">Informasi tidak lengkap</div>
              </button>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════════
               BAGIAN KLINIS LANJUTAN (Slide 10–16)
               ══════════════════════════════════════════════════════════ -->

          <!-- SLIDE 10: Tekanan Darah -->
          <div class="slide-pane typeform-pane ${initialStep === 10 ? 'active' : ''}" data-step="10">
            <div class="tf-section-label advanced-label">🔬 Biomarker Klinis</div>
            <div class="tf-question-number">10 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Tekanan darah Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Masukkan nilai tekanan darah terakhir Anda. Jika tidak tahu, nilai default normal akan digunakan.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label">Tekanan Sistolik (mmHg)</div>
              <div class="tf-unit-input-wrap" style="margin-bottom:12px">
                <input type="number" min="90" max="180" class="tf-unit-input" id="${formId}_systolicBP"
                  placeholder="120" value="${data.systolicBP}"
                  oninput="onProfileInput('${formId}', 'systolicBP', this.value)"
                  onchange="onProfileInput('${formId}', 'systolicBP', this.value)"
                  onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
                <span class="tf-unit-badge">mmHg</span>
              </div>
              <div class="tf-adv-field-label">Tekanan Diastolik (mmHg)</div>
              <div class="tf-unit-input-wrap">
                <input type="number" min="60" max="120" class="tf-unit-input" id="${formId}_diastolicBP"
                  placeholder="80" value="${data.diastolicBP}"
                  oninput="onProfileInput('${formId}', 'diastolicBP', this.value)"
                  onchange="onProfileInput('${formId}', 'diastolicBP', this.value)"
                  onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
                <span class="tf-unit-badge">mmHg</span>
              </div>
              <div class="tf-range-hint" style="margin-top:8px">Normal: Sistolik 90–120 | Diastolik 60–80 mmHg</div>
            </div>
          </div>

          <!-- SLIDE 11: Biomarker Kolesterol -->
          <div class="slide-pane typeform-pane ${initialStep === 11 ? 'active' : ''}" data-step="11">
            <div class="tf-section-label advanced-label">🔬 Biomarker Klinis</div>
            <div class="tf-question-number">11 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Hasil pemeriksaan kolesterol? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Data dari hasil lab terbaru Anda (mg/dL). Lewati jika tidak memiliki data.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-two-col">
                <div>
                  <div class="tf-adv-field-label">Total Kolesterol</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="100" max="400" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolTotal"
                      value="${data.cholesterolTotal}"
                      oninput="onProfileInput('${formId}', 'cholesterolTotal', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">LDL</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="50" max="300" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolLDL"
                      value="${data.cholesterolLDL}"
                      oninput="onProfileInput('${formId}', 'cholesterolLDL', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">HDL</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="20" max="100" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolHDL"
                      value="${data.cholesterolHDL}"
                      oninput="onProfileInput('${formId}', 'cholesterolHDL', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">Trigliserida</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="50" max="400" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolTriglycerides"
                      value="${data.cholesterolTriglycerides}"
                      oninput="onProfileInput('${formId}', 'cholesterolTriglycerides', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
              </div>
              <div class="tf-range-hint" style="margin-top:8px">Normal Total: &lt;200 | LDL: &lt;130 | HDL: &gt;40 | TG: &lt;150 mg/dL</div>
            </div>
          </div>

          <!-- SLIDE 12: Skor MMSE -->
          <div class="slide-pane typeform-pane ${initialStep === 12 ? 'active' : ''}" data-step="12">
            <div class="tf-section-label advanced-label">🔬 Skor Kognitif</div>
            <div class="tf-question-number">12 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Skor uji kognitif Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Jika Anda pernah diperiksa dokter, masukkan skor berikut. Jika tidak, nilai perkiraan akan digunakan.</div>
            <div class="tf-adv-group">
              ${sliderRow('mmse', 'MMSE (Mini-Mental State Exam)', 0, 30, data.mmse, '/30')}
              <div class="tf-mmse-legend">
                <span class="mmse-tag severe">0–9: Berat</span>
                <span class="mmse-tag moderate">10–18: Sedang</span>
                <span class="mmse-tag mild">19–23: Ringan</span>
                <span class="mmse-tag normal">24–30: Normal</span>
              </div>
              ${sliderRow('functionalAssessment', 'Functional Assessment', 0, 10, data.functionalAssessment, '/10')}
              ${sliderRow('adl', 'ADL (Aktivitas Kehidupan Sehari-hari)', 0, 10, data.adl, '/10')}
            </div>
          </div>

          <!-- SLIDE 13: Keluhan Memori & Perilaku -->
          <div class="slide-pane typeform-pane ${initialStep === 13 ? 'active' : ''}" data-step="13">
            <div class="tf-section-label advanced-label">🔬 Keluhan Kognitif</div>
            <div class="tf-question-number">13 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Keluhan fungsi memori & perilaku? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Tandai gejala yang sering Anda rasakan dalam 3–6 bulan terakhir.</div>
            <div class="tf-adv-group">
              ${binaryRow('memoryComplaints', '🧠 Sering lupa (Keluhan Memori)')}
              ${binaryRow('behavioralProblems', '😤 Masalah perilaku / emosi')}
              ${binaryRow('confusion', '😵 Bingung / mudah tersesat')}
              ${binaryRow('disorientation', '🗺️ Disorientasi waktu & tempat')}
              ${binaryRow('personalityChanges', '🔄 Perubahan kepribadian drastis')}
              ${binaryRow('difficultyCompletingTasks', '📋 Sulit menyelesaikan tugas rutin')}
              ${binaryRow('forgetfulness', '📦 Sering lupa menaruh barang')}
            </div>
          </div>

          <!-- SLIDE 14: Keluhan Kognitif (chips legacy + gejala lain) -->
          <div class="slide-pane typeform-pane ${initialStep === 14 ? 'active' : ''}" data-step="14">
            <div class="tf-section-label advanced-label">🔬 Keluhan Kognitif</div>
            <div class="tf-question-number">14 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Keluhan fungsi kognitif tambahan? <span class="tf-required">*</span></div>
            <div class="tf-hint">Pilih semua gejala yang Anda rasakan (minimal 1 pilihan).</div>
            <div class="profile-chips-grid" id="${formId}_symptoms_grid">
              <div class="profile-chip ${data.symptoms.includes('Sering lupa peristiwa terkini') ? 'selected' : ''}" data-val="Sering lupa peristiwa terkini" onclick="onProfileSymptomToggle('${formId}', this, 'Sering lupa peristiwa terkini')">
                <span>Sering lupa peristiwa yang baru terjadi</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Sulit fokus & konsentrasi') ? 'selected' : ''}" data-val="Sulit fokus & konsentrasi" onclick="onProfileSymptomToggle('${formId}', this, 'Sulit fokus & konsentrasi')">
                <span>Sulit fokus / menyelesaikan tugas rutin</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Sering salah menaruh barang') ? 'selected' : ''}" data-val="Sering salah menaruh barang" onclick="onProfileSymptomToggle('${formId}', this, 'Sering salah menaruh barang')">
                <span>Sering salah taruh barang &amp; bingung mencari</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Disorientasi waktu & tempat') ? 'selected' : ''}" data-val="Disorientasi waktu & tempat" onclick="onProfileSymptomToggle('${formId}', this, 'Disorientasi waktu & tempat')">
                <span>Disorientasi waktu atau arah jalan</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Pencegahan & skrining umum') ? 'selected' : ''}" data-val="Pencegahan & skrining umum" onclick="onProfileSymptomToggle('${formId}', this, 'Pencegahan & skrining umum')">
                <span>Tidak ada keluhan (skrining preventif)</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 15: Riwayat Penyakit Lain (komorbiditas chips) -->
          <div class="slide-pane typeform-pane ${initialStep === 15 ? 'active' : ''}" data-step="15">
            <div class="tf-section-label advanced-label">🔬 Komorbiditas</div>
            <div class="tf-question-number">15 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Penyakit penyerta yang dimiliki? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Pilih semua yang sesuai — atau lewati jika tidak ada.</div>
            <div class="profile-chips-grid" id="${formId}_comorbidities_grid">
              <div class="profile-chip ${data.comorbidities.includes('Hipertensi') ? 'selected' : ''}" data-val="Hipertensi" onclick="onProfileComorbidityToggle('${formId}', this, 'Hipertensi')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Hipertensi</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Diabetes Mellitus') ? 'selected' : ''}" data-val="Diabetes Mellitus" onclick="onProfileComorbidityToggle('${formId}', this, 'Diabetes Mellitus')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                <span>Diabetes Mellitus</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Kolesterol Tinggi') ? 'selected' : ''}" data-val="Kolesterol Tinggi" onclick="onProfileComorbidityToggle('${formId}', this, 'Kolesterol Tinggi')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18h-2v-1.07A4.49 4.49 0 0 1 8 13h2a2.5 2.5 0 0 0 5 0c0-1.5-1-2-2.5-2.5S9 9 9 7.5A3.5 3.5 0 0 1 11 4.07V3h2v1.07A4.49 4.49 0 0 1 16 8h-2a2.5 2.5 0 0 0-5 0c0 1.5 1 2 2.5 2.5s3.5 1.5 3.5 3a3.5 3.5 0 0 1-2 3.43z"/></svg>
                <span>Kolesterol Tinggi</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Penyakit Jantung') ? 'selected' : ''}" data-val="Penyakit Jantung" onclick="onProfileComorbidityToggle('${formId}', this, 'Penyakit Jantung')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>
                <span>Penyakit Jantung</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Gangguan Tidur / Insomnia') ? 'selected' : ''}" data-val="Gangguan Tidur / Insomnia" onclick="onProfileComorbidityToggle('${formId}', this, 'Gangguan Tidur / Insomnia')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.4-11.4A10 10 0 0 1 12.3 2z"/></svg>
                <span>Insomnia / Gangguan Tidur</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Tidak Ada') ? 'selected' : ''}" data-val="Tidak Ada" onclick="onProfileComorbidityToggle('${formId}', this, 'Tidak Ada')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                <span>Tidak Ada Penyakit Lain</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 16: Konfirmasi Akhir -->
          <div class="slide-pane typeform-pane ${initialStep === 16 ? 'active' : ''}" data-step="16">
            <div class="tf-section-label advanced-label">✅ Konfirmasi</div>
            <div class="tf-question-number">16 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Data Anda siap disimpan!</div>
            <div class="tf-hint">Semua data klinis lengkap akan digunakan untuk prediksi risiko Alzheimer yang akurat oleh model XGBoost Neura.</div>
            <div class="tf-confirmation-box">
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">📋</span>
                <span>Profil dasar tersimpan</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🧬</span>
                <span>Riwayat medis &amp; gaya hidup</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🔬</span>
                <span>Biomarker klinis lanjutan</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🧠</span>
                <span>Skor &amp; gejala kognitif</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-cta">Klik <strong>Simpan &amp; Mulai Konsultasi</strong> untuk memulai prediksi biomarker Alzheimer.</div>
            </div>
          </div>

        </div>
      </div>

      <div class="slide-nav-footer">
        <button type="button" class="slide-btn-prev" id="${formId}_btn_prev"
          style="visibility:${initialStep > 1 ? 'visible' : 'hidden'}"
          onclick="prevProfileSlide('${formId}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          Kembali
        </button>
        <button type="button" class="slide-btn-next" id="${formId}_btn_next"
          ${!hasSaved ? 'disabled' : ''}
          onclick="nextProfileSlide('${formId}')">
          <span>${hasSaved ? '✓ Simpan & Mulai Konsultasi' : 'Lanjut'}</span>
          ${!hasSaved ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' : ''}
        </button>
      </div>
    </div>
  `;
}



function syncProfileCardToStorage(formId) {
  const card = document.getElementById(formId);
  if (!card) return;

  const saved = getUserProfile();
  const hasSaved = !!(saved && saved.name);
  const TOTAL_STEPS = 16;
  const targetStep = hasSaved ? TOTAL_STEPS : 1;

  const buildData = (s) => ({
    name: s.name || '', age: parseInt(s.age) || 40, gender: s.gender || '',
    ethnicity: s.ethnicity ?? 0, educationLevel: s.educationLevel ?? 1,
    height: s.height || '', weight: s.weight || '',
    smoking: s.smoking ?? 0, alcoholConsumption: s.alcoholConsumption ?? 5,
    physicalActivity: s.physicalActivity ?? 5, dietQuality: s.dietQuality ?? 5, sleepQuality: s.sleepQuality ?? 7,
    familyHistoryAlzheimers: s.familyHistoryAlzheimers ?? 0, cardiovascularDisease: s.cardiovascularDisease ?? 0,
    diabetes: s.diabetes ?? 0, depression: s.depression ?? 0, headInjury: s.headInjury ?? 0, hypertension: s.hypertension ?? 0,
    systolicBP: s.systolicBP ?? 120, diastolicBP: s.diastolicBP ?? 80,
    cholesterolTotal: s.cholesterolTotal ?? 200, cholesterolLDL: s.cholesterolLDL ?? 100,
    cholesterolHDL: s.cholesterolHDL ?? 50, cholesterolTriglycerides: s.cholesterolTriglycerides ?? 150,
    mmse: s.mmse ?? 25, functionalAssessment: s.functionalAssessment ?? 7, adl: s.adl ?? 7,
    memoryComplaints: s.memoryComplaints ?? 0, behavioralProblems: s.behavioralProblems ?? 0,
    confusion: s.confusion ?? 0, disorientation: s.disorientation ?? 0, personalityChanges: s.personalityChanges ?? 0,
    difficultyCompletingTasks: s.difficultyCompletingTasks ?? 0, forgetfulness: s.forgetfulness ?? 0,
    comorbidities: Array.isArray(s.comorbidities) ? s.comorbidities : [],
    symptoms: Array.isArray(s.symptoms) ? s.symptoms : [],
    familyHistory: s.familyHistory || 'no'
  });

  const emptyData = buildData({});

  let form = activeProfileForms[formId];
  if (!form) {
    form = { currentStep: targetStep, totalSteps: TOTAL_STEPS, data: hasSaved ? buildData(saved) : emptyData };
    activeProfileForms[formId] = form;
  } else {
    form.currentStep = targetStep;
    form.totalSteps = TOTAL_STEPS;
    if (hasSaved) form.data = buildData(saved);
  }

  // Sync DOM elements
  const nameInput = document.getElementById(`${formId}_name`);
  if (nameInput) nameInput.value = form.data.name;

  const ageSlider = document.getElementById(`${formId}_age`);
  const ageDisplay = document.getElementById(`${formId}_age_display`);
  if (ageSlider) ageSlider.value = form.data.age;
  if (ageDisplay) ageDisplay.innerHTML = `${form.data.age} <span>tahun</span>`;

  const maleBtn = document.getElementById(`${formId}_gender_male`);
  const femaleBtn = document.getElementById(`${formId}_gender_female`);
  if (maleBtn) maleBtn.classList.toggle('active', form.data.gender === 'male');
  if (femaleBtn) femaleBtn.classList.toggle('active', form.data.gender === 'female');

  const hInput = document.getElementById(`${formId}_height`);
  if (hInput) hInput.value = form.data.height;

  const wInput = document.getElementById(`${formId}_weight`);
  if (wInput) wInput.value = form.data.weight;

  const bmiRes = calculateBMI(form.data.weight, form.data.height);
  const bmiVal = document.getElementById(`${formId}_bmi_val`);
  const bmiPill = document.getElementById(`${formId}_bmi_pill`);
  if (bmiVal && bmiPill) {
    if (bmiRes) {
      bmiVal.textContent = bmiRes.bmi;
      bmiPill.textContent = bmiRes.category;
      bmiPill.className = 'profile-bmi-pill ' + bmiRes.pillClass;
      bmiPill.style.display = 'inline-block';
    } else {
      bmiVal.textContent = '—';
      bmiPill.style.display = 'none';
    }
  }

  const comorbGrid = document.getElementById(`${formId}_comorbidities_grid`);
  if (comorbGrid) {
    comorbGrid.querySelectorAll('.profile-chip').forEach(c => {
      c.classList.toggle('selected', form.data.comorbidities.includes(c.getAttribute('data-val')));
    });
  }

  const sympGrid = document.getElementById(`${formId}_symptoms_grid`);
  if (sympGrid) {
    sympGrid.querySelectorAll('.profile-chip').forEach(c => {
      c.classList.toggle('selected', form.data.symptoms.includes(c.getAttribute('data-val')));
    });
  }

  ['yes', 'no', 'unknown'].forEach(v => {
    const btn = document.getElementById(`${formId}_fam_${v}`);
    if (btn) btn.classList.toggle('active', form.data.familyHistory === v);
  });

  applySlideTransition(formId, 'next');
  updateSlideNavState(formId);
}

// Handler untuk slider advanced (gaya hidup, kognitif)
window.onAdvSlider = function(formId, field, val, unit) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const numVal = parseFloat(val);
  form.data[field] = numVal;
  const valEl = document.getElementById(`${formId}_${field}_val`);
  if (valEl) valEl.textContent = numVal + (unit || '');
  const sliderEl = document.getElementById(`${formId}_${field}`);
  if (sliderEl) {
    const min = parseFloat(sliderEl.min), max = parseFloat(sliderEl.max);
    sliderEl.style.setProperty('--slider-pct', `${((numVal - min) / (max - min)) * 100}%`);
  }
  updateSlideNavState(formId);
};

// Handler untuk tombol binary (Ya/Tidak)
window.onBinaryToggle = function(formId, field, val, btn) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = parseInt(val);
  const row = btn.closest('.tf-binary-toggle');
  if (row) {
    row.querySelectorAll('.tf-binary-btn').forEach(b => {
      b.classList.remove('active-yes', 'active-no');
    });
    btn.classList.add(val === '1' ? 'active-yes' : 'active-no');
  }
  updateSlideNavState(formId);
};

// Handler untuk chip select tunggal (Ethnicity, EducationLevel)
window.onChipSelect = function(formId, field, val, btn) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = parseInt(val);
  const row = btn.closest('.tf-chip-row');
  if (row) {
    row.querySelectorAll('.tf-chip-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }
  updateSlideNavState(formId);
};

function getOrCreateProfileForm(formId) {
  if (activeProfileForms[formId]) {
    return activeProfileForms[formId];
  }

  const card = document.getElementById(formId);
  if (!card) return null;

  syncProfileCardToStorage(formId);
  return activeProfileForms[formId];
}

function onProfileInput(formId, field, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = val;

  if (field === 'height' || field === 'weight') {
    const bmiRes = calculateBMI(form.data.weight, form.data.height);
    const valEl = document.getElementById(`${formId}_bmi_val`);
    const pillEl = document.getElementById(`${formId}_bmi_pill`);
    if (valEl && pillEl) {
      if (bmiRes) {
        valEl.textContent = bmiRes.bmi;
        pillEl.textContent = bmiRes.category;
        pillEl.className = 'profile-bmi-pill ' + bmiRes.pillClass;
        pillEl.style.display = 'inline-block';
      } else {
        valEl.textContent = '—';
        pillEl.style.display = 'none';
      }
    }
  }

  updateSlideNavState(formId);
}

function onProfileAgeSlider(formId, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const age = parseInt(val);
  form.data.age = age;

  const displayEl = document.getElementById(`${formId}_age_display`);
  if (displayEl) displayEl.innerHTML = `${age} <span>tahun</span>`;

  const riskEl = document.getElementById(`${formId}_age_risk`);
  if (riskEl) {
    let t = '';
    if (age < 18)       t = 'Anak-anak / remaja — profil khusus pediatri';
    else if (age < 40)  t = 'Usia muda — risiko Alzheimer sangat rendah';
    else if (age < 50)  t = 'Dewasa — risiko rendah, deteksi dini disarankan';
    else if (age < 60)  t = 'Pra-lansia — risiko mulai meningkat, pantau biomarker';
    else if (age < 70)  t = 'Lansia awal — risiko menengah hingga tinggi';
    else                t = 'Lansia — risiko tinggi, konsultasi berkala sangat dianjurkan';
    riskEl.textContent = t;
  }

  const sliderEl = document.getElementById(`${formId}_age`);
  if (sliderEl) {
    const pct = ((age - 1) / 99) * 100;
    sliderEl.style.setProperty('--slider-pct', `${pct}%`);
  }

  updateSlideNavState(formId);
}

function onProfileGender(formId, gender) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data.gender = gender;

  // New Typeform large icon buttons
  const maleBtn = document.getElementById(`${formId}_gender_male`);
  const femaleBtn = document.getElementById(`${formId}_gender_female`);
  if (maleBtn && femaleBtn) {
    maleBtn.classList.toggle('active', gender === 'male');
    femaleBtn.classList.toggle('active', gender === 'female');
  } else {
    // fallback: old segmented style
    const seg = document.getElementById(`${formId}_gender_seg`);
    if (seg) {
      seg.querySelectorAll('.profile-seg-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-gender') === gender);
      });
    }
  }
  updateSlideNavState(formId);
}

function onProfileComorbidityToggle(formId, el, condition) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  if (!form.data.comorbidities) form.data.comorbidities = [];

  const grid = document.getElementById(`${formId}_comorbidities_grid`);
  if (!grid) return;

  if (condition === 'Tidak Ada') {
    form.data.comorbidities = ['Tidak Ada'];
    const allChips = grid.querySelectorAll('.profile-chip');
    allChips.forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  } else {
    form.data.comorbidities = form.data.comorbidities.filter(c => c !== 'Tidak Ada');
    const noneChip = grid.querySelector('.profile-chip[data-val="Tidak Ada"]');
    if (noneChip) noneChip.classList.remove('selected');

    const idx = form.data.comorbidities.indexOf(condition);
    if (idx > -1) {
      form.data.comorbidities.splice(idx, 1);
      el.classList.remove('selected');
    } else {
      form.data.comorbidities.push(condition);
      el.classList.add('selected');
    }
  }
  updateSlideNavState(formId);
}

function onProfileSymptomToggle(formId, el, symptom) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  if (!form.data.symptoms) form.data.symptoms = [];

  const idx = form.data.symptoms.indexOf(symptom);
  if (idx > -1) {
    form.data.symptoms.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    form.data.symptoms.push(symptom);
    el.classList.add('selected');
  }
  updateSlideNavState(formId);
}

function onProfileFamilyHistory(formId, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data.familyHistory = val;

  // New Typeform card buttons
  ['yes', 'no', 'unknown'].forEach(v => {
    const btn = document.getElementById(`${formId}_fam_${v}`);
    if (btn) btn.classList.toggle('active', v === val);
  });

  // Fallback: old segmented style
  const seg = document.getElementById(`${formId}_family_seg`);
  if (seg) {
    seg.querySelectorAll('.profile-seg-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-val') === val);
    });
  }
  updateSlideNavState(formId);
}

function validateProfileSlide(formId, step) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return false;
  const d = form.data || {};

  switch (step) {
    case 1: {
      const domVal = document.getElementById(`${formId}_name`)?.value;
      const nameVal = (typeof d.name === 'string' && d.name.trim().length > 0)
        ? d.name.trim() : (domVal ? domVal.trim() : '');
      return nameVal.length >= 2;
    }
    case 2: {
      const ageVal = parseInt(d.age || 40);
      return !isNaN(ageVal) && ageVal >= 1 && ageVal <= 100;
    }
    case 3: return !!d.gender;
    case 4: return true; // demografi opsional
    case 5: {
      const domVal = document.getElementById(`${formId}_height`)?.value;
      const h = parseFloat(d.height || domVal);
      return !isNaN(h) && h >= 100 && h <= 240;
    }
    case 6: {
      const domVal = document.getElementById(`${formId}_weight`)?.value;
      const w = parseFloat(d.weight || domVal);
      return !isNaN(w) && w >= 30 && w <= 250;
    }
    case 7: return true;  // gaya hidup — selalu valid (slider punya default)
    case 8: return true;  // riwayat penyakit opsional
    case 9: return !!d.familyHistory;
    // Advanced: opsional, selalu lanjut
    case 10: case 11: case 12: case 13: case 15: return true;
    // Slide 14: keluhan kognitif wajib minimal 1
    case 14: return d.symptoms && d.symptoms.length > 0;
    // Slide 16: konfirmasi akhir
    case 16: return true;
    default: return true;
  }
}

function updateSlideNavState(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const btnNext = document.getElementById(`${formId}_btn_next`);
  if (!btnNext) return;

  const isValid = validateProfileSlide(formId, form.currentStep);
  if (isValid) {
    btnNext.disabled = false;
    btnNext.removeAttribute('disabled');
    btnNext.style.opacity = '1';
    btnNext.style.pointerEvents = 'auto';
    btnNext.style.cursor = 'pointer';
  } else {
    btnNext.disabled = true;
    btnNext.setAttribute('disabled', 'true');
    btnNext.style.opacity = '0.45';
    btnNext.style.pointerEvents = 'none';
    btnNext.style.cursor = 'not-allowed';
  }
}

function nextProfileSlide(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  // Pre-sync DOM input values before validating
  const step = form.currentStep;
  if (step === 1) {
    const el = document.getElementById(`${formId}_name`);
    if (el) form.data.name = el.value.trim();
  } else if (step === 5) {
    const el = document.getElementById(`${formId}_height`);
    if (el) form.data.height = el.value;
  } else if (step === 6) {
    const el = document.getElementById(`${formId}_weight`);
    if (el) form.data.weight = el.value;
  } else if (step === 10) {
    const sEl = document.getElementById(`${formId}_systolicBP`);
    const dEl = document.getElementById(`${formId}_diastolicBP`);
    if (sEl) form.data.systolicBP = parseFloat(sEl.value) || 120;
    if (dEl) form.data.diastolicBP = parseFloat(dEl.value) || 80;
  } else if (step === 11) {
    ['cholesterolTotal','cholesterolLDL','cholesterolHDL','cholesterolTriglycerides'].forEach(f => {
      const el = document.getElementById(`${formId}_${f}`);
      if (el && el.value) form.data[f] = parseFloat(el.value);
    });
  }

  if (!validateProfileSlide(formId, form.currentStep)) {
    updateSlideNavState(formId);
    return;
  }

  if (form.currentStep === form.totalSteps) {
    submitProfileForm(formId);
    return;
  }

  form.currentStep++;
  applySlideTransition(formId, 'next');
}

function prevProfileSlide(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form || form.currentStep <= 1) return;

  form.currentStep--;
  applySlideTransition(formId, 'prev');
}

function applySlideTransition(formId, direction = 'next') {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  const card = document.getElementById(formId);
  if (!card) return;

  const counter = document.getElementById(`${formId}_counter`);
  const progress = document.getElementById(`${formId}_progress`);
  const btnPrev = document.getElementById(`${formId}_btn_prev`);
  const btnNext = document.getElementById(`${formId}_btn_next`);

  // Activate only currentStep slide, hide all others to prevent horizontal spillover
  const panes = card.querySelectorAll('.slide-pane');
  panes.forEach(pane => {
    const stepNum = parseInt(pane.getAttribute('data-step'));
    if (stepNum === form.currentStep) {
      pane.classList.add('active');
      if (direction === 'prev') {
        pane.classList.add('slide-from-prev');
      } else {
        pane.classList.remove('slide-from-prev');
      }
    } else {
      pane.classList.remove('active', 'slide-from-prev');
    }
  });

  if (counter) {
    counter.textContent = `${form.currentStep} / ${form.totalSteps}`;
  }

  const pct = Math.round((form.currentStep / form.totalSteps) * 100);
  if (progress) {
    progress.style.width = `${pct}%`;
  }

  const pctEl = document.getElementById(`${formId}_pct`);
  if (pctEl) {
    pctEl.textContent = `${pct}%`;
  }

  const tagReguler = document.getElementById(`${formId}_tag_reguler`);
  const tagAdvanced = document.getElementById(`${formId}_tag_advanced`);
  if (tagReguler && tagAdvanced) {
    if (form.currentStep <= 9) {
      tagReguler.className = 'profile-phase-tag phase-reguler is-active';
      const icon = tagReguler.querySelector('.phase-tag-icon');
      if (icon) icon.textContent = '📋';
      tagAdvanced.className = 'profile-phase-tag phase-advanced is-upcoming';
    } else {
      tagReguler.className = 'profile-phase-tag phase-reguler is-completed';
      const icon = tagReguler.querySelector('.phase-tag-icon');
      if (icon) icon.textContent = '✓';
      tagAdvanced.className = 'profile-phase-tag phase-advanced is-active';
    }
  }

  if (btnPrev) {
    btnPrev.style.visibility = form.currentStep > 1 ? 'visible' : 'hidden';
  }

  if (btnNext) {
    const isLast = form.currentStep === form.totalSteps;
    const labels = {
      1: 'Lanjut →', 2: 'Konfirmasi Usia', 3: 'Lanjut →',
      4: 'Lanjut ke Fisik', 5: 'Lanjut ke Berat Badan', 6: 'Lanjut ke Gaya Hidup',
      7: 'Lanjut ke Riwayat Penyakit', 8: 'Lanjut ke Riwayat Keluarga',
      9: '🔬 Lanjut ke Data Klinis', 10: 'Lanjut ke Kolesterol',
      11: 'Lanjut ke Skor Kognitif', 12: 'Lanjut ke Keluhan',
      13: 'Lanjut ke Keluhan Lanjutan', 14: 'Lanjut ke Komorbiditas',
      15: 'Lanjut ke Konfirmasi', 16: '✓ Simpan & Mulai Konsultasi'
    };
    const nextLabel = labels[form.currentStep] || 'Lanjut';
    btnNext.innerHTML = `
      <span>${nextLabel}</span>
      ${!isLast ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' : ''}
    `;
    updateSlideNavState(formId);
  }

  // Auto focus input on the current active slide
  setTimeout(() => {
    if (form.currentStep === 1) document.getElementById(`${formId}_name`)?.focus();
    else if (form.currentStep === 5) document.getElementById(`${formId}_height`)?.focus();
    else if (form.currentStep === 6) document.getElementById(`${formId}_weight`)?.focus();
    else if (form.currentStep === 10) document.getElementById(`${formId}_systolicBP`)?.focus();
  }, 80);
}

function submitProfileForm(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  const d = form.data;
  const bmiInfo = calculateBMI(d.weight, d.height);

  const profile = {
    // Data dasar
    name: d.name.trim(),
    age: parseInt(d.age),
    gender: d.gender,
    ethnicity: d.ethnicity ?? 0,
    educationLevel: d.educationLevel ?? 1,
    height: parseFloat(d.height),
    weight: parseFloat(d.weight),
    bmi: bmiInfo ? bmiInfo.bmi : null,
    bmiCategory: bmiInfo ? bmiInfo.category : 'Normal',
    // Gaya hidup
    smoking: d.smoking ?? 0,
    alcoholConsumption: d.alcoholConsumption ?? 5,
    physicalActivity: d.physicalActivity ?? 5,
    dietQuality: d.dietQuality ?? 5,
    sleepQuality: d.sleepQuality ?? 7,
    // Riwayat penyakit
    familyHistoryAlzheimers: d.familyHistoryAlzheimers ?? 0,
    cardiovascularDisease: d.cardiovascularDisease ?? 0,
    diabetes: d.diabetes ?? 0,
    depression: d.depression ?? 0,
    headInjury: d.headInjury ?? 0,
    hypertension: d.hypertension ?? 0,
    // Biomarker tekanan darah
    systolicBP: d.systolicBP ?? 120,
    diastolicBP: d.diastolicBP ?? 80,
    // Biomarker kolesterol
    cholesterolTotal: d.cholesterolTotal ?? 200,
    cholesterolLDL: d.cholesterolLDL ?? 100,
    cholesterolHDL: d.cholesterolHDL ?? 50,
    cholesterolTriglycerides: d.cholesterolTriglycerides ?? 150,
    // Skor kognitif
    mmse: d.mmse ?? 25,
    functionalAssessment: d.functionalAssessment ?? 7,
    adl: d.adl ?? 7,
    // Gejala kognitif spesifik
    memoryComplaints: d.memoryComplaints ?? 0,
    behavioralProblems: d.behavioralProblems ?? 0,
    confusion: d.confusion ?? 0,
    disorientation: d.disorientation ?? 0,
    personalityChanges: d.personalityChanges ?? 0,
    difficultyCompletingTasks: d.difficultyCompletingTasks ?? 0,
    forgetfulness: d.forgetfulness ?? 0,
    // Legacy
    comorbidities: d.comorbidities || [],
    symptoms: d.symptoms || [],
    familyHistory: d.familyHistory || 'no'
  };

  saveUserProfile(profile);

  // Replace form card with confirmed summary card
  const cardEl = document.getElementById(formId);
  if (cardEl) {
    cardEl.outerHTML = renderSavedProfileCard(profile);
  }

  showToast('Data diri dan profil klinis lengkap berhasil disimpan!', 'success');

  // Trigger personalized consultation follow-up
  startPersonalizedConsultation(profile);
}

function renderSavedProfileCard(p) {
  if (!p) return '';
  const comorbs = (p.comorbidities && p.comorbidities.length > 0)
    ? p.comorbidities.map(c => `<span class="profile-summary-tag">${escapeHtml(c)}</span>`).join('')
    : '<span class="profile-summary-tag">Tidak ada komorbiditas</span>';
  const genderLabel = p.gender === 'female' ? 'Perempuan' : 'Laki-laki';

  return `
    <div class="profile-summary-card">
      <div class="profile-summary-header">
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Profil Pasien Terverifikasi (${escapeHtml(p.name)})</span>
        </div>
        <button type="button" class="profile-edit-btn" onclick="submitCommand('ubah data diri')">Ubah Data Diri</button>
      </div>
      <div class="profile-summary-tags">
        <span class="profile-summary-tag">${escapeHtml(p.name)}, ${p.age} thn (${genderLabel})</span>
        <span class="profile-summary-tag">TB: ${p.height} cm | BB: ${p.weight} kg</span>
        <span class="profile-summary-tag">BMI: ${p.bmi || '—'} (${escapeHtml(p.bmiCategory)})</span>
        ${comorbs}
      </div>
    </div>
  `;
}

async function startPersonalizedConsultation(profile) {
  setDynamicIslandState('generating', {
    sub: `Konsultasi Klinis \u2022 ${profile.name}`,
    main: 'Generating'
  });

  const ageRisk = profile.age >= 65
    ? 'kategori usia risiko tinggi (>65 tahun)'
    : profile.age >= 50
      ? 'kategori usia risiko menengah (50–65 tahun)'
      : 'kategori usia muda/dewasa (<50 tahun)';
  const comorbText = profile.comorbidities && profile.comorbidities.length > 0
    ? profile.comorbidities.join(', ')
    : 'Tidak ada komorbiditas dilaporkan';
  const sympText = profile.symptoms && profile.symptoms.length > 0
    ? profile.symptoms.join(', ')
    : 'Skrining preventif';
  const famText = profile.familyHistory === 'yes'
    ? 'Terdapat riwayat keluarga dengan Alzheimer/Demensia (faktor genetik perlu diwaspadai)'
    : profile.familyHistory === 'unknown'
      ? 'Riwayat keluarga belum terkonfirmasi'
      : 'Tidak ada riwayat keluarga';

  const replyHtml = `
    <p>Terima kasih, <strong>${escapeHtml(profile.name)}</strong>! Profil kesehatan klinis Anda telah tersimpan dan siap digunakan untuk konsultasi.</p>
    
    <p><strong>Ringkasan Parameter Klinis Anda:</strong></p>
    <ul>
      <li><strong>Faktor Usia (${profile.age} tahun):</strong> Berada pada <em>${ageRisk}</em>.</li>
      <li><strong>Indeks Massa Tubuh (BMI ${profile.bmi || '—'}):</strong> Status <strong>${escapeHtml(profile.bmiCategory)}</strong>.</li>
      <li><strong>Riwayat Komorbiditas:</strong> ${escapeHtml(comorbText)}.</li>
      <li><strong>Keluhan yang Dirasakan:</strong> ${escapeHtml(sympText)}.</li>
      <li><strong>Riwayat Keluarga:</strong> ${escapeHtml(famText)}.</li>
    </ul>

    <p>💡 <strong>Analisis & Saran Awal Neura:</strong><br>
    Berdasarkan data di atas, keluhan fungsi memori yang Anda alami dapat diperiksa lebih dalam dengan pemodelan biomarker (skor MMSE, Functional Assessment, dan biomarker darah). Model machine learning Neura dapat melakukan estimasi komprehensif terhadap kemungkinan risiko Alzheimer.</p>

    <p>Apakah Anda ingin menjalankan prediksi biomarker lengkap dengan perintah <code>/predict</code> sekarang?</p>
  `;

  appendAssistantMessage(replyHtml, {
    stream: true,
    suggestions: ['/predict', 'Bagaimana cara mencegah Alzheimer?', 'Gejala awal demensia', 'Ubah data diri']
  });
}

// --------------------------------------------------------------------------
// Conversational Consultation & Natural Language Engine
// --------------------------------------------------------------------------
function formatConsultationReply(rawText) {
  if (!rawText) return '';
  if (Array.isArray(rawText)) {
    rawText = rawText.join('\n\n');
  }

  // Process markdown tables if present
  if (rawText.includes('|')) {
    const lines = rawText.split('\n');
    let inTable = false;
    let tableHtml = '';
    let resultLines = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
        if (cells.every(c => /^:?-+:?$/.test(c))) {
          continue;
        }
        if (!inTable) {
          inTable = true;
          tableHtml = '<table class="claude-table" style="margin:10px 0"><thead><tr>' + cells.map(c => `<th>${escapeHtml(c)}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table>';
          resultLines.push(tableHtml);
          inTable = false;
          tableHtml = '';
        }
        resultLines.push(line);
      }
    }
    if (inTable) {
      tableHtml += '</tbody></table>';
      resultLines.push(tableHtml);
    }
    rawText = resultLines.join('\n');
  }

  // Parse markdown formatting
  let html = rawText
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `<p>${html}</p>`;
}

function generateConversationalReply(text) {
  const t = text.toLowerCase();
  if (t.includes('hello') || t.includes('hi') || t.includes('halo') || t.includes('pagi') || t.includes('siang') || t.includes('malam')) {
    return {
      html: `
        <p>Halo! Saya <strong>Neura AI</strong>, asisten cerdas untuk skrining kesehatan daya ingat dan deteksi dini risiko penyakit Alzheimer berbasis XGBoost.</p>
        <p>Anda bisa berkonsultasi seputar keluhan daya ingat, menanyakan perbedaan pikun biasa vs Alzheimer, atau memulai skrining mandiri.</p>
      `,
      suggestions: [
        'Saya ingin konsultasi daya ingat',
        'Apa perbedaan pikun biasa vs Alzheimer?',
        '/predict'
      ]
    };
  }
  if (t.includes('konsultasi') || t.includes('skrining') || t.includes('periksa') || t.includes('lupa') || t.includes('pikun')) {
    return {
      html: `
        <p>Terima kasih sudah berkonsultasi dengan <strong>Neura</strong>.</p>
        <p>Untuk membantu skrining awal daya ingat Anda atau anggota keluarga, ceritakan keluhan Anda atau jawab pertanyaan panduan ini:</p>
        <p>1. <strong>Berapa usia</strong> pasien yang dikonsultasikan?</p>
        <p>2. <strong>Keluhan apa yang sering dialami?</strong> (Misal: sering lupa nama kerabat dekat, salah meletakkan barang, mengulang pertanyaan yang sama).</p>
        <p>3. <strong>Apakah mulai mempengaruhi kemandirian harian?</strong> (Misal: kesulitan mengelola uang, minum obat, atau bepergian sendiri).</p>
        <p>Anda juga dapat mengetik <code>/predict</code> untuk melihat simulasi analisis 32 biomarker klinis kami.</p>
      `,
      suggestions: [
        'Apa saja 10 tanda awal Alzheimer?',
        'Kapan harus membawa orang tua ke dokter?',
        '/predict'
      ]
    };
  }
  if (t.includes('train')) {
    return {
      html: `
        <p>Anda dapat melatih model <strong>XGBoost Classifier</strong> menggunakan perintah <code>/train [rounds]</code>. Contoh: <code>/train 5</code> untuk mengeksekusi 5 boosting rounds dengan monitoring log-loss dan akurasi real-time.</p>
      `,
      suggestions: ['/train 5', '/status']
    };
  }
  if (t.includes('predict') || t.includes('inferensi') || t.includes('diagnosis')) {
    return {
      html: `
        <p>Untuk menjalankan inferensi klinis pada pasien, ketik <code>/predict</code>. Model XGBoost akan menganalisis 32 biomarker (MMSE, ADL, memori, demografi) dan menghitung probabilitas risiko Alzheimer.</p>
      `,
      suggestions: ['/predict', '/status']
    };
  }
  if (t.includes('eval') || t.includes('metric') || t.includes('akurasi')) {
    return {
      html: `
        <p>Gunakan <code>/eval</code> untuk memeriksa metrik evaluasi model XGBoost terhadap 430 sampel holdout uji: Akurasi 95.35%, ROC-AUC 94.11%, dan sensitivitas 92.11%.</p>
      `,
      suggestions: ['/eval', '/predict']
    };
  }
  let currentUserName = '';
  try {
    const authRaw = localStorage.getItem('neura_auth_user');
    if (authRaw) {
      const u = JSON.parse(authRaw);
      currentUserName = u.name || (u.displayName ? u.displayName : '') || (u.email ? u.email.split('@')[0] : '');
    }
    if (!currentUserName) {
      const prof = getUserProfile();
      if (prof && prof.name) currentUserName = prof.name;
    }
    if (!currentUserName) {
      const nameEl = document.getElementById('sidebar-user-name');
      if (nameEl && nameEl.textContent && nameEl.textContent.trim()) {
        currentUserName = nameEl.textContent.trim();
      }
    }
  } catch (err) {}
  if (!currentUserName || currentUserName === 'Pengguna') {
    currentUserName = 'Hanzz';
  }

  const fallbackIntentResponses = [
    `Mohon maaf tidak bisa menjawab sesuai pertanyaan ${escapeHtml(currentUserName)}. Saat ini <strong>Neura AI</strong> dirancang secara khusus untuk berfokus pada skrining awal kesehatan daya ingat, deteksi dini risiko penyakit Alzheimer, analisis 32 biomarker klinis, dan edukasi gaya hidup sehat untuk otak. Silakan ajukan pertanyaan seputar kesehatan memori atau gunakan perintah <code>/predict</code>.`,
    `Mohon maaf tidak bisa menjawab sesuai pertanyaan ${escapeHtml(currentUserName)}. Topik atau pertanyaan yang Anda sampaikan berada di luar basis data percakapan klinis Neura AI. Saya siap membantu Anda jika ingin berkonsultasi mengenai tanda-tanda awal demensia, tes kognitif MMSE, skor kemandirian ADL, atau nutrisi ramah otak.`,
    `Mohon maaf tidak bisa menjawab sesuai pertanyaan ${escapeHtml(currentUserName)}. Sebagai asisten skrining kognitif medis, cakupan saya terbatas pada pencegahan dan deteksi dini Alzheimer, panduan caregiver lansia, serta simulasi biomarker klinis. Silakan ajukan pertanyaan terkait topik kesehatan daya ingat.`,
    `Mohon maaf tidak bisa menjawab sesuai pertanyaan ${escapeHtml(currentUserName)}. Informasi mengenai hal tersebut tidak tersedia di dalam basis pengetahuan Neura AI. Anda dapat mencoba menanyakan perbedaan pikun biasa vs Alzheimer, faktor risiko demensia, atau ketik <code>/help</code> untuk panduan lengkap.`,
    `Mohon maaf tidak bisa menjawab sesuai pertanyaan ${escapeHtml(currentUserName)}. Pertanyaan tersebut berada di luar cakupan konsultasi medis Neura AI. Silakan ajukan pertanyaan seputar keluhan daya ingat orang tua, skrining faktor risiko genetik dan vaskular, atau jalankan simulasi klinis <code>/predict</code>.`
  ];

  const chosenReply = fallbackIntentResponses[Math.floor(Math.random() * fallbackIntentResponses.length)];

  return {
    html: `<p>${chosenReply}</p>`,
    responses: fallbackIntentResponses,
    suggestions: [
      'Saya ingin konsultasi daya ingat',
      'Apa saja 10 tanda awal Alzheimer?',
      'Makanan apa yang ramah otak?',
      '/predict'
    ]
  };
}

// --------------------------------------------------------------------------
// Renderers for ML Results (Claude Warm Aesthetic)
// --------------------------------------------------------------------------
function renderHelpOutput() {
  appendAssistantMessage(`
    <h4>Available Commands</h4>
    <p>Here are the interactive commands you can use to interact with the Alzheimer XGBoost engine:</p>
    <table class="claude-table">
      <tr><td><code>/status</code></td><td>Check Alzheimer XGBoost model readiness, 32 biomarkers, and accuracy metrics</td></tr>
      <tr><td><code>/train [N]</code></td><td>Train the XGBoost model for N boosting rounds on datasets/alzheimers_disease_data.csv (e.g. <code>/train 50</code>)</td></tr>
      <tr><td><code>/eval</code></td><td>Evaluate model performance (95.4% Accuracy, Precision, Recall, F1, ROC-AUC)</td></tr>
      <tr><td><code>/predict</code></td><td>Run clinical Alzheimer diagnosis inference on a patient and inspect risk probabilities</td></tr>
      <tr><td><code>/progress</code></td><td>Inspect real-time boosting iteration logs and logloss metrics</td></tr>
      <tr><td><code>/intro</code></td><td>Tampilkan sapaan dan pengenalan Neura AI serta fitur konsultasi</td></tr>
      <tr><td><code>/voice</code></td><td>Buka Voice Room untuk konsultasi suara interaktif real-time</td></tr>
      <tr><td><code>/konsul</code></td><td>Mulai sesi konsultasi daya ingat atau formulir data diri pasien</td></tr>
      <tr><td><code>/help</code></td><td>Display this interactive command guide</td></tr>
    </table>
  `);
}

function renderStatusOutput(data) {
  activeModelData = data;
  updateUIModelStatus(data);

  const isReady = data.model_ready;
  const isTraining = data.training_running;
  const statusText = isTraining ? 'Training in progress...' : isReady ? 'Model Ready' : 'Checkpoint Not Found';
  const statusClass = isTraining ? 'val-warn' : isReady ? 'val-good' : 'val-err';

  appendAssistantMessage(`
    <h4>System & Model Status</h4>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Model Status</div>
          <div class="stat-val ${statusClass}">${statusText}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Model Architecture</div>
          <div class="stat-val" style="font-size:13.5px">${escapeHtml(data.model_name || 'AlzheimersXGBoost')}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Environment</div>
          <div class="stat-val" style="font-size:13.5px">${escapeHtml(data.environment || 'development')}</div>
        </div>
      </div>
      ${data.checkpoint ? `<p class="checkpoint-path-note">Checkpoint: <code>${escapeHtml(data.checkpoint)}</code></p>` : ''}
    </div>
    ${!isReady ? `<p style="color:var(--accent-red);font-size:13px">Note: No trained checkpoint detected. Run <code>/train 5</code> to train the model first.</p>` : ''}
  `);
}

function renderEvaluationOutput(data) {
  const metrics = data.metrics || data || {};
  const acc = metrics.accuracy ?? 0.9535;
  const prec = metrics.precision ?? 0.9459;
  const rec = metrics.recall ?? 0.9211;
  const f1 = metrics.f1_score ?? 0.9333;
  const auc = metrics.roc_auc ?? 0.9411;

  const rows = [
    { name: 'Model Accuracy', val: `${(acc * 100).toFixed(2)}%`, note: 'Overall classification correctness' },
    { name: 'Precision', val: `${(prec * 100).toFixed(2)}%`, note: 'Positive predictive value' },
    { name: 'Recall (Sensitivity)', val: `${(rec * 100).toFixed(2)}%`, note: 'True positive detection rate' },
    { name: 'F1-Score', val: `${(f1 * 100).toFixed(2)}%`, note: 'Harmonic mean of precision & recall' },
    { name: 'ROC-AUC Score', val: `${(auc * 100).toFixed(2)}%`, note: 'Discriminative capacity' },
  ].map(item => `
    <tr>
      <td style="font-weight:500">${escapeHtml(item.name)}</td>
      <td style="font-weight:600;color:var(--accent-green);font-family:'JetBrains Mono',monospace">${item.val}</td>
      <td style="font-size:11.5px;color:var(--text-muted)">${item.note}</td>
    </tr>
  `).join('');

  appendAssistantMessage(`
    <h4>Clinical Evaluation Results (XGBoost)</h4>
    <p>Model evaluated against holdout test distribution (430 patients):</p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Model Accuracy</div>
          <div class="stat-val val-good">${(acc * 100).toFixed(1)}%</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">ROC-AUC</div>
          <div class="stat-val val-good">${(auc * 100).toFixed(1)}%</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Sensitivity / Recall</div>
          <div class="stat-val val-good">${(rec * 100).toFixed(1)}%</div>
        </div>
      </div>
      <table class="claude-table" style="margin-top:14px">
        <thead><tr><th>Metric Name</th><th>Score</th><th>Clinical Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="font-size:11px;color:var(--text-muted);margin-top:10px">Confusion Matrix: 270 True Negatives, 140 True Positives, only 8 False Positives &amp; 12 False Negatives.</p>
    </div>
  `);
}

function renderPredictionOutput(data) {
  const isPos = data.is_positive || (data.predicted_class && data.predicted_class.includes("Alzheimer"));
  const diagnosis = isPos ? "Alzheimer's Disease Detected" : "Non-Alzheimer's (Negative)";
  const riskClass = isPos ? "val-err" : "val-good";
  const riskLevel = data.risk_level || (isPos ? "High Risk (Positive)" : "Low Risk (Negative)");
  const detailedProb = localStorage.getItem('neura_detailed_prob') !== 'false';
  const rawProb = parseFloat(data.probability !== undefined ? data.probability : 50.0);
  const prob = detailedProb ? (isNaN(rawProb) ? '50.00' : rawProb.toFixed(2)) : (isNaN(rawProb) ? '50' : Math.round(rawProb));
  const markers = data.key_markers || {};
  const patientId = data.patient_id || '#4751';

  appendAssistantMessage(`
    <h4>Patient Clinical Diagnosis (${escapeHtml(String(patientId))})</h4>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Predicted Diagnosis</div>
          <div class="stat-val ${riskClass}" style="font-size:13.5px">${escapeHtml(diagnosis)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Risk Level</div>
          <div class="stat-val ${riskClass}" style="font-size:13px">${escapeHtml(riskLevel)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Alzheimer's Probability</div>
          <div class="stat-val" style="font-family:'JetBrains Mono',monospace">${prob}%</div>
        </div>
      </div>

      <div style="margin-top:14px">
        <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:8px">Primary Biomarkers &amp; Cognitive Scores</div>
        <div class="biomarkers-grid">
          <div class="biomarker-cell">
            <span class="biomarker-lbl">MMSE Score</span>
            <strong class="biomarker-val">${markers.MMSE ?? 24.5} / 30</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">ADL Score</span>
            <strong class="biomarker-val">${markers.ADL ?? 6.2} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Functional Assessment</span>
            <strong class="biomarker-val">${markers.FunctionalAssessment ?? 5.5} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Memory Complaints</span>
            <strong class="biomarker-val" style="color:${markers.MemoryComplaints === 'Yes' ? 'var(--accent-red)' : 'var(--accent-green)'}">${markers.MemoryComplaints ?? 'No'}</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Demographics</span>
            <strong class="biomarker-val">${markers.Age ?? 73} y.o. &bull; ${markers.Gender ?? 'Male'}</strong>
          </div>
        </div>
      </div>
    </div>
  `);
}

function renderProgressOutput(data) {
  if (!data.progress || data.progress.length === 0) {
    appendAssistantMessage(data.running
      ? `<p>Training is actively executing in background, awaiting first epoch logs...</p>`
      : `<p>No recent training sessions recorded. Use <code>/train 5</code> to initiate a new run.</p>`
    );
    return;
  }

  const rows = data.progress.map(ep => `
    <tr>
      <td>Epoch ${ep.epoch}</td>
      <td>${ep.loss.toFixed(4)}</td>
      <td class="${ep.val_loss < 1.5 ? 'val-good' : ''}">${ep.val_loss.toFixed(4)}</td>
      <td>${(ep.accuracy * 100).toFixed(1)}%</td>
      <td class="${ep.val_accuracy > 0.5 ? 'val-good' : ''}">${(ep.val_accuracy * 100).toFixed(1)}%</td>
    </tr>
  `).join('');

  const statusBadge = data.running ? 'Running...' : data.report ? 'Complete' : 'Stopped';

  appendAssistantMessage(`
    <h4>Training Session Progress &bull; ${statusBadge}</h4>
    <div class="claude-card">
      <table class="claude-table">
        <thead><tr><th>Epoch</th><th>Loss</th><th>Val Loss</th><th>Acc</th><th>Val Acc</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

// --------------------------------------------------------------------------
// Training Polling Mechanism
// --------------------------------------------------------------------------
function startProgressPolling(totalEpochs) {
  if (trainingPollInterval) clearInterval(trainingPollInterval);

  let lastCompleted = 0;

  trainingPollInterval = setInterval(async () => {
    try {
      const data = await fetchJSON('/api/train/progress');
      const progress = data.progress || [];
      const completed = progress.length;
      lastCompleted = Math.max(lastCompleted, completed);
      const pct = Math.min(Math.round((lastCompleted / totalEpochs) * 100), 100);

      const fill = document.getElementById('live-progress-fill');
      const counter = document.getElementById('epoch-progress-counter');
      const liveMeta = document.getElementById('live-metrics-text');
      const statusTitle = document.getElementById('optimization-status-text');

      if (fill) fill.style.width = pct + '%';
      if (counter) counter.textContent = `Round ${lastCompleted} / ${totalEpochs}`;

      const lastEp = progress[lastCompleted - 1];
      if (lastEp && liveMeta) {
        liveMeta.innerHTML = `
          <span>Loss: <strong style="color:var(--accent-terracotta)">${lastEp.loss.toFixed(4)}</strong> &bull; Val Acc: <strong style="color:var(--accent-green)">${(lastEp.val_accuracy * 100).toFixed(1)}%</strong></span>
          <span style="color:var(--text-secondary);font-weight:600">${pct}%</span>
        `;
      } else if (lastCompleted === 0 && liveMeta) {
        liveMeta.innerHTML = `
          <span>Splitting 2,149 patient records &bull; Initializing boosting rounds...</span>
          <span style="color:var(--text-secondary)">0%</span>
        `;
      }

      setDynamicIslandState('training', {
        sub: lastEp ? `Round ${lastCompleted}/${totalEpochs} \u2022 Loss: ${lastEp.loss.toFixed(3)} \u2022 ${(lastEp.val_accuracy * 100).toFixed(0)}%` : `Round ${lastCompleted}/${totalEpochs} \u2022 Optimizing trees...`,
        main: `Training (${pct}%)`
      });

      // When training finishes and all rounds are rendered
      if (!data.running && lastCompleted >= progress.length) {
        clearInterval(trainingPollInterval);
        trainingPollInterval = null;

        if (fill) fill.style.width = '100%';
        if (counter) counter.textContent = `Round ${totalEpochs} / ${totalEpochs}`;
        if (statusTitle) statusTitle.textContent = 'Optimization Converged';
        if (liveMeta) {
          liveMeta.innerHTML = `<span style="color:var(--accent-green);font-weight:500">&check; All ${totalEpochs} boosting rounds converged</span><span style="color:var(--accent-green);font-weight:600">100%</span>`;
        }

        fetchModelStatus(false);
        showToast('Model training completed successfully', 'success');

        setDynamicIslandState('ready', {
          sub: data.report ? `Training Complete \u2022 Accuracy: ${(data.report.accuracy * 100).toFixed(1)}%` : 'Training Complete',
          main: 'Trained',
          keepTimer: true
        });

        if (data.report) {
          setTimeout(() => {
            appendAssistantMessage(`
              <h4>Training Session Completed</h4>
              <div class="claude-card">
                <div class="claude-stats-grid">
                  <div class="stat-pill">
                    <div class="stat-label">Total Rounds</div>
                    <div class="stat-val">${totalEpochs}</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">Test Accuracy</div>
                    <div class="stat-val val-good">${(data.report.accuracy * 100).toFixed(1)}%</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">F1-Score</div>
                    <div class="stat-val val-good">${(data.report.f1_score * 100).toFixed(1)}%</div>
                  </div>
                  <div class="stat-pill">
                    <div class="stat-label">ROC-AUC</div>
                    <div class="stat-val val-good">${(data.report.roc_auc * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <p class="checkpoint-path-note">Checkpoint saved to <code>public/checkpoints/xgboost_alzheimers.json</code></p>
              </div>
            `, { stream: false });
          }, 350);
        }
      }
    } catch(err) {
      // Silent error during poll
    }
  }, 120);
}

// --------------------------------------------------------------------------
// DOM Message Appenders
// --------------------------------------------------------------------------
function appendUserBubble(text) {
  addMessageToActiveSession({ role: 'user', content: text });
  const container = document.getElementById('chat-content-container');
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(row);
  scrollToBottom();
}

function appendAssistantMessage(html, options = {}) {
  let contentHtml = html;
  let suggestionsList = options.suggestions || [];
  if (typeof html === 'object' && html !== null && html.html) {
    contentHtml = html.html;
    if (html.suggestions) suggestionsList = html.suggestions;
  }

  addMessageToActiveSession({ role: 'assistant', html: contentHtml, suggestions: suggestionsList });
  const { stream = false } = options;
  const container = document.getElementById('chat-content-container');
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.innerHTML = `
    <div class="assistant-header">
      <img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display='none'" />
      <span class="assistant-name">Neura</span>
      <span class="assistant-model-tag">&bull; AlzheimersXGBoost</span>
    </div>
    <div class="assistant-prose fade-in"></div>
    <div class="assistant-suggestions-slot"></div>
    <div class="msg-actions-row" style="display:none">
      <button class="msg-action-btn" title="Copy response" onclick="copyMessageText(this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();

  const proseEl = row.querySelector('.assistant-prose');
  const suggestionsSlot = row.querySelector('.assistant-suggestions-slot');
  const actionRow = row.querySelector('.msg-actions-row');

  // Build suggestions HTML if any
  let suggestionsHtml = '';
  if (Array.isArray(suggestionsList) && suggestionsList.length > 0) {
    const chips = suggestionsList.map(s => renderSuggestionChip(s)).join('');
    suggestionsHtml = `<div class="chat-suggestions-bar">${chips}</div>`;
  }

  function revealFooter() {
    if (suggestionsSlot && suggestionsHtml) {
      suggestionsSlot.innerHTML = suggestionsHtml;
    }
    if (actionRow) actionRow.style.display = 'flex';
    scrollToBottom();
  }

  if (stream) {
    streamTypewriter(proseEl, contentHtml, revealFooter);
  } else {
    proseEl.innerHTML = contentHtml;
    revealFooter();
    
    // Animate probability bars if present
    const bars = proseEl.querySelectorAll('.prob-fill');
    if (bars.length > 0) {
      setTimeout(() => {
        bars.forEach(b => {
          const target = b.getAttribute('data-target-width');
          if (target) b.style.width = target;
        });
      }, 60);
    }
    scrollToBottom();
  }
}

function streamTypewriter(targetElement, fullHtml, onComplete) {
  // Only bypass full typewriter for ML card outputs with progress bars and complex stat grids
  if (fullHtml.includes('claude-card') || fullHtml.includes('terracotta-progress-wrap')) {
    targetElement.innerHTML = fullHtml;
    const bars = targetElement.querySelectorAll('.prob-fill');
    if (bars.length > 0) {
      setTimeout(() => {
        bars.forEach(b => {
          const target = b.getAttribute('data-target-width');
          if (target) b.style.width = target;
        });
      }, 60);
    }
    if (onComplete) onComplete();
    return;
  }

  // Word/tag tokenizer for fluid progressive streaming: tables and tags stay atomic
  const tokens = fullHtml.split(/(\s+|<table[\s\S]*?<\/table>|<[^>]+>)/i).filter(Boolean);
  let idx = 0;
  let accumulated = '';
  const cursor = '<span class="streaming-cursor"></span>';

  function renderNext() {
    if (stopRequested) {
      targetElement.innerHTML = fullHtml;
      if (onComplete) onComplete();
      return;
    }

    const count = Math.min(2, tokens.length - idx);
    for (let i = 0; i < count; i++) {
      accumulated += tokens[idx++];
    }
    targetElement.innerHTML = accumulated + cursor;
    scrollToBottom();

    if (idx < tokens.length) {
      setTimeout(renderNext, 18);
    } else {
      targetElement.innerHTML = fullHtml;
      if (onComplete) onComplete();
    }
  }

  renderNext();
}

function showTypingIndicator() {
  const container = document.getElementById('chat-content-container');
  const id = 'typing-' + Date.now();
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.id = id;
  row.innerHTML = `
    <div class="assistant-header">
      <img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display='none'" />
      <span class="assistant-name">Neura</span>
      <span class="assistant-model-tag">&bull; AlzheimersXGBoost</span>
    </div>
    <div class="claude-loading-row">
      <div class="claude-loading-sparkle" title="Neura is thinking...">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/>
        </svg>
      </div>
      <div class="claude-loading-dots">
        <div class="claude-typing-dot"></div>
        <div class="claude-typing-dot"></div>
        <div class="claude-typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  const scrollArea = document.getElementById('chat-scroll-area');
  scrollArea.scrollTop = scrollArea.scrollHeight;
}

function copyMessageText(btn) {
  const prose = btn.closest('.message-row').querySelector('.assistant-prose');
  if (prose) {
    navigator.clipboard.writeText(prose.innerText).then(() => {
      showToast('Copied to clipboard', 'info');
    });
  }
}

// --------------------------------------------------------------------------
// Server Status Polling & UI Sync
// --------------------------------------------------------------------------
async function fetchModelStatus(isUserTriggered = false) {
  try {
    const data = await fetchJSON('/api/status');
    activeModelData = data;
    updateUIModelStatus(data);
    if (isUserTriggered) renderStatusOutput(data);
  } catch(err) {
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

  // Dynamic Island synchronization
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
    islandEnv.textContent = `${data.model_name || 'AlzheimersXGBoost'} \u2022 ${data.environment || 'development'}`;
  }

  // Sync compact notch if island is currently in ready state
  if (currentIslandState === 'ready' || currentIslandState === 'idle') {
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

  // Modal fields
  const mName = document.getElementById('modal-model-name');
  const mEnv = document.getElementById('modal-env');
  const mCp = document.getElementById('modal-checkpoint');
  const mStat = document.getElementById('modal-status');
  if (mName) mName.textContent = data.model_name || 'AlzheimersXGBoost';
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
      subEl.textContent = options.sub || 'Synthesizing response \u2022 AlzheimersXGBoost';
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

// --------------------------------------------------------------------------
// Model Architecture Modal
// --------------------------------------------------------------------------
function openModelModal() {
  document.getElementById('model-modal').classList.add('open');
}

function closeModelModal() {
  document.getElementById('model-modal').classList.remove('open');
}

function closeModelModalOnBackdrop(e) {
  if (e.target.id === 'model-modal') closeModelModal();
}

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const box = document.getElementById('toast-box');
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
// Utility Helpers
// --------------------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchJSON(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(API + url, opts);
  return res.json();
}

// =============================================================================
// INTERNET CONNECTIVITY MODULE
// 3-layer detection: browser events + heartbeat ping + central state controller
// =============================================================================

/**
 * Initialise connectivity detection.
 * Called once from DOMContentLoaded.
 */
function initConnectivity() {
  // Layer 1: instant browser events
  window.addEventListener('online',  () => setOnlineState(true));
  window.addEventListener('offline', () => setOnlineState(false));

  // Layer 2: heartbeat ping every 15 s
  setInterval(heartbeatCheck, 15_000);

  // Run an initial check immediately (catches captive portals on load)
  heartbeatCheck();
}

/**
 * Heartbeat: fetch /api/status with a 4-second timeout.
 * Updates online state based on real server reachability.
 */
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

/**
 * Central connectivity state controller.
 * All UI changes for online/offline live here.
 * @param {boolean} isOnline
 */
function setOnlineState(isOnline) {
  if (_isOnline === isOnline) return; // no change
  const wasOnline = _isOnline;
  _isOnline = isOnline;

  // ── 1. Offline Banner pill ───────────────────────────────────────────────
  const banner = document.getElementById('offline-banner');
  const bannerText = document.getElementById('offline-banner-text');
  const bannerIcon = document.getElementById('offline-banner-icon');

  if (banner) {
    clearTimeout(_offlineBannerHideTimer);

    if (!isOnline) {
      // Show red offline pill
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
      // Show green recovery pill briefly, then hide
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

  // ── 2. Input area gating ─────────────────────────────────────────────────
  const inputArea = document.querySelector('.chat-input-area');
  if (inputArea) {
    inputArea.classList.toggle('is-offline', !isOnline);
  }
  const textarea = document.getElementById('chat-input-textarea');
  const sendBtn  = document.getElementById('send-msg-btn');
  if (textarea) textarea.disabled = !isOnline;
  if (sendBtn)  sendBtn.disabled  = !isOnline;

  // ── 3. In-chat system notice ─────────────────────────────────────────────
  if (!isOnline) {
    _appendSystemNotice(
      'offline',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      'Koneksi terputus. Periksa jaringan Anda.'
    );
    setDynamicIslandState && setDynamicIslandState('idle', { sub: 'Offline', main: 'No connection' });
  } else if (wasOnline === false) {
    // Only show recovery notice when we were actually offline before
    _appendSystemNotice(
      'online',
      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      'Koneksi pulih — Neura siap!'
    );
  }
}

/**
 * Inject a styled system notice row into the active chat scroll container.
 * @param {'offline'|'online'} type
 * @param {string} iconSvg
 * @param {string} message
 */
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

// --------------------------------------------------------------------------
// Voice Consultation Session Exporter to Main Chat
// --------------------------------------------------------------------------
window.appendVoiceSessionToChat = function(summaryMarkdown) {
  if (!summaryMarkdown) return;
  if (!activeSessionId) {
    const newSession = {
      id: 'session_' + Date.now(),
      title: 'Voice Consultation',
      createdAt: Date.now(),
      messages: []
    };
    chatSessions.unshift(newSession);
    activeSessionId = newSession.id;
    saveChatSessions();
    try {
      localStorage.setItem(LAST_SESSION_STORAGE_KEY, newSession.id);
    } catch(e) {}
    renderRecentChatsSidebar();
    const hero = document.getElementById('claude-hero');
    if (hero) hero.remove();
  }

  // 1. Strip raw markdown hr delimiters ("---") from top and bottom
  let cleanMarkdown = String(summaryMarkdown)
    .replace(/^(\s*---\s*[\r\n]*)+/g, '')
    .replace(/([\r\n]*\s*---\s*)+$/g, '')
    .trim();

  // 2. Extract duration if present: e.g. "Voice Session (7m 56s)"
  let duration = '';
  const durMatch = cleanMarkdown.match(/Voice Session\s*\(([^)]+)\)/i);
  if (durMatch) {
    duration = durMatch[1];
    cleanMarkdown = cleanMarkdown.replace(/^[^\n]*Voice Session[^\n]*\n*/i, '').trim();
  }

  // 3. Format turns into structured HTML
  const bodyHtml = cleanMarkdown
    .replace(/\n\n/g, '<br><br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  const isLongSession = cleanMarkdown.length > 220 || cleanMarkdown.split('\n').length > 3;

  const formattedHtml = `
    <div class="voice-session-summary ${isLongSession ? 'is-clamped' : ''}">
      <div class="voice-session-header">
        <div class="voice-session-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-terracotta);">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span>Voice Consultation Session</span>
        </div>
        ${duration ? `<span class="voice-session-badge">${escapeHtml(duration)}</span>` : ''}
      </div>
      <div class="voice-session-body">
        ${bodyHtml}
      </div>
      ${isLongSession ? `
      <div class="voice-session-expand-bar">
        <button type="button" class="voice-session-expand-btn" onclick="toggleVoiceSessionClamp(this)">
          <span class="expand-text">Selengkapnya</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>` : ''}
    </div>
  `;

  appendAssistantMessage(formattedHtml, { stream: false });
};

window.toggleVoiceSessionClamp = function(btn) {
  if (!btn) return;
  const card = btn.closest('.voice-session-summary');
  if (!card) return;
  const isClamped = card.classList.contains('is-clamped');
  const textEl = btn.querySelector('.expand-text');

  if (isClamped) {
    card.classList.remove('is-clamped');
    card.classList.add('is-expanded');
    if (textEl) textEl.textContent = 'Ciutkan';
  } else {
    card.classList.remove('is-expanded');
    card.classList.add('is-clamped');
    if (textEl) textEl.textContent = 'Selengkapnya';
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

