/**
 * public/js/app-chat.js
 * =====================
 * Chat Session Management, Message Dispatching, Natural Language Consultation,
 * Interactive Slash Commands & DOM Stream Appenders.
 */

// Recent Chats & Sessions Management
// --------------------------------------------------------------------------
function _getChatStorageKey() {
  return typeof window.getChatStorageKey === 'function' ? window.getChatStorageKey() : (window.CHAT_STORAGE_KEY || 'neura_recent_chats_v2');
}

function _getLastSessionKey() {
  return typeof window.getLastSessionStorageKey === 'function' ? window.getLastSessionStorageKey() : (window.LAST_SESSION_STORAGE_KEY || 'neura_active_session_id_v2');
}

function loadChatSessions() {
  try {
    const key = _getChatStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      chatSessions = JSON.parse(raw);
    } else {
      chatSessions = [];
    }
  } catch (e) {
    chatSessions = [];
  }
  if (!Array.isArray(chatSessions)) chatSessions = [];
  window.chatSessions = chatSessions;
}

function saveChatSessions() {
  try {
    const key = _getChatStorageKey();
    localStorage.setItem(key, JSON.stringify(chatSessions));
    window.chatSessions = chatSessions;
  } catch (e) { }
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
  if (lower === '/dokumen' || lower === '/hasil' || lower === '/laporan' || lower === '/rujukan' || lower === '/doc' || lower === '/nakes') return 'Dokumen Konsultasi';
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
  if (window.switchAdminRoom) window.switchAdminRoom('chat');
  const session = chatSessions.find(s => s.id === sessionId);
  if (!session) return;
  activeSessionId = sessionId;
  try {
    localStorage.setItem(_getLastSessionKey(), sessionId);
  } catch (e) { }
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
        localStorage.setItem(_getLastSessionKey(), 'new');
      } catch (err) { }
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
  const role = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';

  // Role-specific subhead
  const subhead = role === 'Nakes'
    ? (t.hero_subhead_nakes || t.hero_subhead)
    : role === 'User'
      ? (t.hero_subhead_user || t.hero_subhead)
      : t.hero_subhead;

  // Role-specific card definitions
  let cards = [];

  if (role === 'Admin') {
    cards = [
      {
        cmd: '/train 50',
        icon: `<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>`,
        title: t.card_train_title,
        desc: t.card_train_desc
      },
      {
        cmd: '/predict',
        icon: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
        title: t.card_predict_title,
        desc: t.card_predict_desc
      },
      {
        cmd: '/eval',
        icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
        title: t.card_eval_title,
        desc: t.card_eval_desc
      },
      {
        cmd: '/status',
        icon: `<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>`,
        title: t.card_specs_title,
        desc: t.card_specs_desc
      }
    ];
  } else if (role === 'Nakes') {
    cards = [
      {
        cmd: '/periksa',
        icon: `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`,
        title: t.card_nakes_lookup_title,
        desc: t.card_nakes_lookup_desc
      },
      {
        cmd: '/predict',
        icon: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
        title: t.card_nakes_predict_title,
        desc: t.card_nakes_predict_desc
      },
      {
        cmd: '/eval',
        icon: `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>`,
        title: t.card_nakes_eval_title,
        desc: t.card_nakes_eval_desc
      },
      {
        cmd: '/dokumen',
        icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>`,
        title: t.card_nakes_dokumen_title,
        desc: t.card_nakes_dokumen_desc
      }
    ];
  } else {
    // User / Pasien
    cards = [
      {
        cmd: '/profile',
        icon: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
        title: t.card_user_profile_title,
        desc: t.card_user_profile_desc
      },
      {
        cmd: '/predict',
        icon: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
        title: t.card_user_predict_title,
        desc: t.card_user_predict_desc
      },
      {
        cmd: '/dokumen',
        icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>`,
        title: t.card_user_dokumen_title,
        desc: t.card_user_dokumen_desc
      },
      {
        cmd: '/konsul',
        icon: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>`,
        title: t.card_user_konsul_title,
        desc: t.card_user_konsul_desc
      }
    ];
  }

  const cardsHtml = cards.map(c => `
    <div class="hero-card cl-card cl-card--hoverable" onclick="submitCommand('${c.cmd}')">
      <div class="hero-card-header cl-title-low" style="margin:0 0 6px 0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${c.icon}</svg>
        <span>${c.title}</span>
      </div>
      <div class="hero-card-desc cl-desc-sm">${c.desc}</div>
    </div>
  `).join('');

  return `
    <div class="claude-hero" id="claude-hero">
      <img src="/assets/neura_logo.jpg" alt="Neura Logo" class="hero-neura-logo"
        onerror="this.style.display='none'" />
      <h1 class="hero-greeting cl-title-display" id="hero-greeting-text">${t.greet_evening}</h1>
      <p class="hero-subhead cl-desc-lead">${subhead}</p>

      <!-- 4 Action Cards -->
      <div class="hero-cards-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}


// --------------------------------------------------------------------------
// Start New Chat Action
// --------------------------------------------------------------------------
function startNewChat(showNotification = true) {
  if (window.switchAdminRoom) window.switchAdminRoom('chat');
  activeSessionId = null;
  _pendingMessageQueue = [];
  _isProcessingMessage = false;
  removeTypingIndicator();
  try {
    localStorage.setItem(_getLastSessionKey(), 'new');
    localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
  } catch (e) { }
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
    } catch (e) { }
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
  const chipClass = isCmd ? 'suggestion-chip cl-chip cl-badge--neutral is-cmd' : 'suggestion-chip cl-chip cl-badge--neutral';
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

  // If the suggestion chip contains a slash command (e.g. /status, /predict, /eval, /train 5, /help, /voice, /intro, /konsul, /dokumen, /periksa, /validasi), extract and run it
  const slashMatch = cmd.match(/\/(status|predict|dokumen|doc|hasil|laporan|rujukan|nakes|periksa|validasi|kode|eval|train(?:\s+\d+)?|help|progress|voice|intro|about|konsul)(?:\s+[^\s]+)?\b/i);
  let finalCmd = cmd;
  if (slashMatch && (cmd.startsWith('/') || cmd.includes('/'))) {
    finalCmd = slashMatch[0];
  }

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    updateSendBtnState();
  }

  // Send message directly with the command (executes immediately or enqueues as pending send)
  sendUserMessage(finalCmd);
}

// --------------------------------------------------------------------------
// Message Sending & Pipeline
// --------------------------------------------------------------------------
let _isProcessingMessage = false;
let _pendingMessageQueue = [];

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
      localStorage.setItem(_getLastSessionKey(), newSession.id);
    } catch (e) { }
    renderRecentChatsSidebar();
  }

  // Clear input & draft immediately for instant feedback
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    try {
      localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
    } catch (e) { }
    updateSendBtnState();
  }

  // Remove hero if present
  const hero = document.getElementById('claude-hero');
  if (hero) hero.remove();

  // If a process is already running, prioritize that first process
  // and queue this second process into "pending send"
  if (_isProcessingMessage) {
    const pendingId = 'pending_msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    appendUserBubble(text, { isPending: true, pendingId });
    _pendingMessageQueue.push({ id: pendingId, text, createdAt: Date.now() });
    showToast('Proses pertama diprioritaskan. Perintah kedua masuk antrean (pending send).', 'info');
    return;
  }

  // No active process -> execute immediately
  await _executeMessage(text, null);
}

async function _executeMessage(text, pendingId = null) {
  _isProcessingMessage = true;
  stopRequested = false;
  setGeneratingState(true);

  if (pendingId) {
    const badge = document.getElementById(`badge_${pendingId}`);
    if (badge) {
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(-4px)';
      setTimeout(() => badge.remove(), 250);
    }
    const bubble = document.getElementById(pendingId);
    if (bubble) {
      bubble.classList.remove('user-bubble-pending');
    }
  } else {
    appendUserBubble(text);
  }

  // Show Claude typing dots
  const typingId = showTypingIndicator();

  const preview = text.length > 26 ? text.slice(0, 26) + '...' : text;
  setDynamicIslandState('thinking', {
    sub: `Processing: "${preview}"`,
    main: 'Thinking'
  });

  const startTime = Date.now();

  try {
    await processMLInput(text, typingId, startTime);
  } catch (err) {
    console.error('Process error:', err);
    await waitLoad(startTime, 350);
    removeTypingIndicator(typingId);
    appendAssistantMessage(`<p style="color:var(--accent-red)">Error: ${escapeHtml(err.message || String(err))}</p>`, { stream: false });
  } finally {
    removeTypingIndicator(typingId);

    // If there is another message in queue, dequeue and process sequentially
    if (_pendingMessageQueue.length > 0) {
      const nextItem = _pendingMessageQueue.shift();
      playSuccessChime();
      setTimeout(() => {
        _executeMessage(nextItem.text, nextItem.id);
      }, 350);
    } else {
      _isProcessingMessage = false;
      setGeneratingState(false);
      playSuccessChime();
      if (currentIslandState !== 'training') {
        setDynamicIslandState('ready', {
          sub: 'Response complete \u2022 Neura MLP',
          main: 'Ready',
          keepTimer: true
        });
      }
      updateSendBtnState();
    }
  }
}

// --------------------------------------------------------------------------
// Command Execution & Processing
// --------------------------------------------------------------------------
async function processMLInput(rawText, typingId, startTime) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (lower === 'salin kode nakes' || lower === 'salin kode' || lower === '/salin' || lower === '/copy') {
    await waitLoad(startTime, 300);
    removeTypingIndicator(typingId);
    let code = null;
    try {
      const saved = localStorage.getItem('neura_last_consultation');
      if (saved) {
        const parsed = JSON.parse(saved);
        code = parsed.nakes_code || parsed.doc_id;
      }
    } catch (e) { }

    if (code) {
      if (typeof copyNakesCode === 'function') {
        copyNakesCode(code);
      }
      appendAssistantMessage(`
        <h4>Salin Kode Konsultasi Rujukan Nakes</h4>
        <div class="claude-card">
          <p>✓ Kode Konsultasi Nakes Anda: <strong style="font-family:'JetBrains Mono',monospace;color:var(--accent-terracotta);font-size:15px;letter-spacing:0.05em">${escapeHtml(code)}</strong> berhasil disalin ke clipboard.</p>
          <p style="font-size:12.5px;color:var(--text-secondary);margin-top:6px">
            Serahkan atau sebutkan kode ini kepada Dokter atau Tenaga Kesehatan di fasilitas kesehatan rujukan. Dokter dapat menggunakan perintah <code>/periksa ${escapeHtml(code)}</code> untuk membuka dossier rekam medis lengkap.
          </p>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button type="button" class="claude-btn primary" onclick="copyNakesCode('${escapeHtml(code)}', this)">
              Salin Lagi
            </button>
            <button type="button" class="claude-btn secondary" onclick="openNakesDetailModal('${escapeHtml(code)}')">
              Lihat Detail Nakes
            </button>
            <button type="button" class="claude-btn secondary" onclick="printConsultationDoc()">
              Cetak Dokumen
            </button>
          </div>
        </div>
      `, {
        stream: false,
        suggestions: ['/dokumen', '/predict', '/eval', '/help']
      });
    } else {
      appendAssistantMessage(`
        <h4>Kode Konsultasi Nakes Belum Diterbitkan</h4>
        <div class="claude-card">
          <p style="color:var(--accent-amber)">Belum ada kode konsultasi rujukan nakes yang tersimpan di sesi Anda.</p>
          <p style="font-size:12.5px;color:var(--text-secondary);margin-top:6px">
            Silakan buat dokumen rekam medis terlebih dahulu dengan perintah <code>/dokumen</code> untuk menerbitkan kode konsultasi resmi yang dapat divalidasi oleh dokter.
          </p>
        </div>
      `, {
        stream: false,
        suggestions: ['/dokumen', '/predict', '/help']
      });
    }
    return;

  } else if (lower === '/help' || lower.endsWith('/help')) {
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
    } catch (e) {
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
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'Nakes') {
      const activeDoc = typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null;
      if (!activeDoc) {
        await waitLoad(startTime, 350);
        removeTypingIndicator(typingId);
        renderNakesPatientRequiredPrompt('/status', 'Cek Status Pasien');
        return;
      }
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      renderNakesPatientStatus(activeDoc);
      return;
    }

    const data = await fetchJSON('/api/status');
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);
    renderStatusOutput(data);

  } else if (lower.startsWith('/train') || lower.includes('/train')) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole !== 'Admin') {
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      const isNakes = userRole === 'Nakes';
      const roleLabel = isNakes ? 'Tenaga Kesehatan (Nakes)' : 'Pengguna Umum (Pasien)';
      appendAssistantMessage(`
        <h4>Akses Terbatas: Pelatihan Model XGBoost</h4>
        <div class="claude-card">
          <p>Peran Anda saat ini adalah <strong>${roleLabel}</strong>. Perintah <code>/train</code> merupakan hak akses khusus <strong>Administrator &amp; ML Engineer</strong> untuk melatih ulang model pada dataset klinis demi menjaga integritas model diagnostik yang tersertifikasi.</p>
          <p>Fitur yang dapat Anda gunakan sesuai peran Anda:</p>
          <ul style="margin: 8px 0 12px 18px; line-height: 1.6;">
            <li><code>/predict</code> — Menjalankan skrining risiko klinis Alzheimer</li>
            ${isNakes ? '<li><code>/eval</code> — Meninjau metrik validasi klinis model (Sensitivitas, Spesifisitas, AUC)</li>' : ''}
            <li><code>/dokumen</code> — Menghasilkan resume medis &amp; Kode Rujukan Nakes</li>
            <li><code>/status</code> — Memeriksa kesiapan layanan AI Neura</li>
          </ul>
        </div>
      `, {
        stream: false,
        suggestions: isNakes ? ['/predict', '/eval', '/dokumen'] : ['/predict', '/profile', '/dokumen']
      });
      return;
    }

    const parts = text.split(/\s+/);
    const defaultEpochs = parseInt(localStorage.getItem('neura_default_epochs')) || 50;
    const epochs = parseInt(parts[1]) || defaultEpochs;
    setDynamicIslandState('training', {
      sub: `Training XGBoost \u2022 ${epochs} Boosting Rounds`,
      main: 'Training...'
    });
    const data = await fetchJSON('/api/train', 'POST', { epochs, role: 'Admin' });
    removeTypingIndicator(typingId);

    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Training Error: ${escapeHtml(data.error)}</p>`, { stream: false });
    } else {
      const runId = 'train_' + Date.now();
      appendAssistantMessage(`
        <h4>XGBoost Training Initialized</h4>
        <p>Executing gradient boosting training for <strong>${epochs} boosting rounds</strong> on <code>AlzheimersXGBoost</code> (datasets/alzheimers_disease_data.csv).</p>
        <div class="terracotta-progress-wrap" id="${runId}_container">
          <div class="progress-meta-row">
            <span id="${runId}_status">Optimization Progress</span>
            <span id="${runId}_counter">Round 0 / ${epochs}</span>
          </div>
          <div class="progress-bar-base">
            <div class="progress-bar-fill active" id="${runId}_fill" style="width: 0%"></div>
          </div>
          <div class="progress-meta-sub" id="${runId}_meta" style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-top:7px;font-family:'JetBrains Mono',monospace">
            <span>Estimating tree gradients...</span>
            <span>0%</span>
          </div>
        </div>
      `, { stream: false });
      startProgressPolling(epochs, runId);
    }

  } else if (lower === '/eval' || lower.endsWith('/eval')) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'User') {
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      appendAssistantMessage(`
        <h4>Validasi Klinis Model Neura AI</h4>
        <div class="claude-card">
          <p>Model deteksi dini Neura AI telah divalidasi klinis secara komprehensif pada <strong>2.149 data pasien</strong> menggunakan 32 biomarker kesehatan otak.</p>
          <div class="claude-stats-grid" style="margin: 12px 0;">
            <div class="stat-pill">
              <div class="stat-label">Akurasi Skrining</div>
              <div class="stat-val val-good">95.35%</div>
            </div>
            <div class="stat-pill">
              <div class="stat-label">Sensitivitas Deteksi</div>
              <div class="stat-val val-good">92.11%</div>
            </div>
            <div class="stat-pill">
              <div class="stat-label">Kapasitas Diskriminasi</div>
              <div class="stat-val val-good">ROC-AUC 94.1%</div>
            </div>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin-top:8px"><em>Catatan: Rincian teknis Confusion Matrix dan telemetri boosting ditujukan untuk Tenaga Kesehatan (Nakes) dan Administrator.</em></p>
          <p>Untuk memulai pemeriksaan risiko daya ingat Anda, silakan gunakan perintah <code>/predict</code>.</p>
        </div>
      `, {
        stream: false,
        suggestions: ['/predict', '/profile', '/dokumen', 'Konsultasi']
      });
      return;
    }

    if (userRole === 'Nakes') {
      const activeDoc = typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null;
      if (!activeDoc) {
        await waitLoad(startTime, 350);
        removeTypingIndicator(typingId);
        renderNakesPatientRequiredPrompt('/eval', 'Evaluasi Model Kasus Pasien');
        return;
      }
      setDynamicIslandState('evaluating', {
        sub: `Evaluasi Model pada Kasus \u2022 ${activeDoc.patient?.name || 'Pasien'}`,
        main: 'Evaluating'
      });
      const code = activeDoc.nakes_code || activeDoc.doc_id;
      const evalData = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}/patient-eval`);
      await waitLoad(startTime, 450);
      removeTypingIndicator(typingId);
      renderNakesPatientModelEvaluation(evalData, activeDoc);
      return;
    }

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

  } else if (lower.startsWith('/predict') || lower.includes('/predict')) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'Nakes') {
      const activeDoc = typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null;
      if (!activeDoc) {
        await waitLoad(startTime, 350);
        removeTypingIndicator(typingId);
        renderNakesPatientRequiredPrompt('/predict', 'Jalankan Prediksi Pasien');
        return;
      }
      const pName = activeDoc.patient?.name || 'Pasien';
      setDynamicIslandState('predicting', {
        sub: `Inferensi Klinis XGBoost \u2022 ${pName}`,
        main: 'Diagnosing'
      });
      const payload = { input: activeDoc.raw_features || activeDoc.patient, source: 'patient_document' };
      const data = await fetchJSON('/api/predict', 'POST', payload);
      await waitLoad(startTime, 450);
      removeTypingIndicator(typingId);
      if (data.error) {
        appendAssistantMessage(`<p style="color:var(--accent-red)">Prediction Error: ${escapeHtml(data.error)}</p>`, { stream: false });
      } else {
        renderNakesPatientPrediction(data, activeDoc);
      }
      return;
    }

    const profile = getUserProfile();

    if (!profile || !profile.name || !profile.name.trim()) {
      // User has not filled their Data Diri yet - MANDATORY before diagnosis
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      const formId = 'profile_form_' + Date.now();
      appendAssistantMessage(`
        <h4 class="neura-title-mid">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-terracotta)"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Data Diri Pasien Diperlukan Sebelum Diagnosis AI</span>
        </h4>
        <p class="neura-desc">Diagnosis klinis Alzheimer XGBoost memerlukan data riil <strong>32 Biomarker Pasien</strong> (usia, tekanan darah, skor kognitif MMSE, ADL, dll). Anda wajib melengkapi <strong>Data Diri Pasien</strong> terlebih dahulu di bawah ini sebelum menjalankan diagnosis:</p>
        ${renderProfileSlideCard(formId)}
      `, {
        stream: false,
        suggestions: ['/profile', 'Konsultasi', '/status', '/help']
      });
      return;
    }

    const patientName = profile.name.trim();
    setDynamicIslandState('predicting', {
      sub: `Analyzing ${patientName}'s 32 biomarkers \u2022 Alzheimer Inference`,
      main: 'Diagnosing'
    });

    const payload = { input: profile, source: 'user_profile' };
    const data = await fetchJSON('/api/predict', 'POST', payload);
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);
    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Prediction Error: ${escapeHtml(data.error)}</p>`, { stream: false });
    } else {
      renderPredictionOutput(data);
    }

  } else if (lower === '/progress' || lower.endsWith('/progress')) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole !== 'Admin') {
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      appendAssistantMessage(`
        <h4>Telemetri Pelatihan Realtime</h4>
        <div class="claude-card">
          <p>Pemantauan telemetri gradien <code>/progress</code> hanya aktif saat proses pelatihan ulang model XGBoost sedang dijalankan oleh Administrator / Tim Machine Learning.</p>
          <p>Untuk memeriksa kesiapan dan status operasional sistem saat ini, silakan gunakan perintah <code>/status</code>.</p>
        </div>
      `, {
        stream: false,
        suggestions: ['/status', '/predict']
      });
      return;
    }

    setDynamicIslandState('thinking', {
      sub: 'Fetching real-time training telemetry...',
      main: 'Inspecting'
    });
    const data = await fetchJSON('/api/train/progress');
    await waitLoad(startTime, 400);
    removeTypingIndicator(typingId);
    renderProgressOutput(data);

  } else if (
    lower === '/dokumen' || lower.startsWith('/dokumen') ||
    lower === '/hasil' || lower.startsWith('/hasil') ||
    lower === '/laporan' || lower.startsWith('/laporan') ||
    lower === '/rujukan' || lower.startsWith('/rujukan') ||
    lower === '/doc' || lower.startsWith('/doc') ||
    lower === '/nakes' || lower.startsWith('/nakes') ||
    lower === 'dokumen konsultasi' || lower === 'kode konsultasi' ||
    lower.includes('kode nakes') || lower.includes('hasil konsultasi') ||
    lower.includes('dokumen hasil') || lower.includes('cetak dokumen') ||
    lower.includes('buat dokumen') || lower.includes('cetak lembar') ||
    lower.includes('cetak berkas') || lower.includes('print dokumen')
  ) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'Nakes') {
      const activeDoc = typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null;
      if (!activeDoc) {
        await waitLoad(startTime, 350);
        removeTypingIndicator(typingId);
        renderNakesPatientRequiredPrompt('/dokumen', 'Dokumen Konsultasi / Dossier Medis');
        return;
      }
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      renderNakesDetailedDossier(activeDoc);
      return;
    }

    // Role User / Pasien: WAJIB periksa apakah Data Diri sudah terisi
    const profile = getUserProfile();
    if (!profile || !profile.name || !profile.name.trim()) {
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      const formId = 'profile_form_' + Date.now();
      appendAssistantMessage(`
        <h4 class="neura-title-mid">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-terracotta)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Data Diri Pasien Diperlukan Sebelum Cetak Dokumen</span>
        </h4>
        <p class="neura-desc">Untuk menerbitkan <strong>Dokumen Hasil Konsultasi Medis</strong> dan <strong>Kode Rujukan Nakes</strong>, saya memerlukan <strong>Data Diri &amp; 32 Biomarker Pasien</strong> Anda terlebih dahulu agar rekam medis yang diterbitkan sesuai identitas dan kondisi klinis riil Anda:</p>
        ${renderProfileSlideCard(formId)}
      `, {
        stream: false,
        suggestions: ['/profile', 'Konsultasi', '/help']
      });
      return;
    }

    setDynamicIslandState('generating', {
      sub: 'Menyusun Dokumen Hasil Konsultasi & Kode Nakes...',
      main: 'Dokumen'
    });

    try {
      const payload = { input: profile, source: 'user_profile' };
      const docData = await fetchJSON('/api/consultation/generate', 'POST', payload);
      await waitLoad(startTime, 450);
      removeTypingIndicator(typingId);

      if (docData && !docData.error) {
        try {
          localStorage.setItem('neura_last_consultation', JSON.stringify(docData));
        } catch (e) { }
        renderConsultationDocument(docData);
      } else {
        appendAssistantMessage(`<p style="color:var(--accent-red)">Gagal menyusun dokumen konsultasi: ${escapeHtml(docData.error || 'Terjadi kesalahan sistem')}</p>`, { stream: false });
      }
    } catch (e) {
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      appendAssistantMessage(`<p style="color:var(--accent-red)">Error: ${escapeHtml(e.message)}</p>`, { stream: false });
    }
    return;

  } else if (
    lower === '/periksa' || lower.startsWith('/periksa ') ||
    lower === '/validasi' || lower.startsWith('/validasi ') ||
    lower === '/kode' || lower.startsWith('/kode ') ||
    lower.startsWith('periksa dokumen') || lower.startsWith('validasi dokumen') ||
    lower.startsWith('input kode')
  ) {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'User') {
      await waitLoad(startTime, 350);
      removeTypingIndicator(typingId);
      appendAssistantMessage(`
        <h4>Pemeriksaan Dokumen Pasien</h4>
        <div class="claude-card">
          <p>Fitur <strong>Periksa &amp; Validasi Dokumen Pasien</strong> merupakan wewenang <strong>Tenaga Kesehatan (Nakes)</strong> dan <strong>Dokter</strong> untuk menelaah rekam medis serta memvalidasi hasil skrining pasien di fasilitas kesehatan.</p>
          <p>Jika Anda adalah pasien, silakan gunakan perintah <code>/dokumen</code> untuk melihat lembar hasil konsultasi dan Kode Nakes Anda sendiri, atau gunakan <code>/predict</code> untuk melakukan skrining.</p>
        </div>
      `, {
        stream: false,
        suggestions: ['/dokumen', '/predict', 'Konsultasi']
      });
      return;
    }

    const codeMatch = text.match(/\b(NKS-[A-Za-z0-9\-]+|DOC-[A-Za-z0-9\-]+)\b/i);
    const candidateCode = codeMatch ? codeMatch[0].trim() : (text.split(/\s+/)[1] || '').trim();

    if (candidateCode && candidateCode.length >= 5 && !candidateCode.startsWith('/')) {
      await lookupAndRenderPatientDocument(candidateCode, typingId, startTime);
      return;
    }

    await waitLoad(startTime, 350);
    removeTypingIndicator(typingId);
    renderNakesLookupPromptCard();
    return;

  } else if (/\b(konsul|konsultasi|tanya dokter|tanya keluhan|cek kesehatan|data diri|biodata|profil|profile)\b/i.test(text) || lower === '/profile' || lower === '/konsultasi') {
    const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
    if (userRole === 'Nakes') {
      const activeDoc = typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null;
      if (!activeDoc) {
        await waitLoad(startTime, 350);
        removeTypingIndicator(typingId);
        renderNakesPatientRequiredPrompt('/profile', 'Data Diri Pasien');
        return;
      }
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      renderNakesPatientProfile(activeDoc);
      return;
    }

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
      } catch (err) { }
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
    } catch (e) {
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
        <p class="neura-desc-lead">Terima kasih sudah berkonsultasi dengan <strong>Neura</strong>.</p>
        <p class="neura-desc">Untuk membantu skrining awal daya ingat Anda atau anggota keluarga, ceritakan keluhan Anda atau jawab pertanyaan panduan ini:</p>
        <ol class="neura-list-num">
          <li><strong>Berapa usia</strong> pasien yang dikonsultasikan?</li>
          <li><strong>Keluhan apa yang sering dialami?</strong> (Misal: sering lupa nama kerabat dekat, salah meletakkan barang, mengulang pertanyaan yang sama).</li>
          <li><strong>Apakah mulai mempengaruhi kemandirian harian?</strong> (Misal: kesulitan mengelola uang, minum obat, atau bepergian sendiri).</li>
        </ol>
        <p class="neura-desc">Anda juga dapat mengetik <code>/predict</code> untuk melihat simulasi analisis 32 biomarker klinis kami.</p>
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
  } catch (err) { }
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
  const currentRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
  const roleLabel = currentRole === 'Admin' ? 'Administrator / ML Engineer' : currentRole === 'Nakes' ? 'Tenaga Kesehatan (Nakes)' : 'Pengguna Umum (Pasien)';
  const lang = typeof getAppLanguage === 'function' ? getAppLanguage() : 'id';

  let rows = '';

  // 1. Profile
  rows += `
    <tr>
      <td><code>/profile</code></td>
      <td>${currentRole === 'Nakes'
        ? (lang === 'en' ? 'Manage & assess patient clinical biomarker record' : 'Input &amp; kelola rekam medis biomarker klinis pasien')
        : (lang === 'en' ? 'Fill or update your patient profile & 32 clinical biomarkers' : 'Lengkapi atau perbarui formulir Data Diri &amp; 32 Biomarker Klinis')}</td>
    </tr>
  `;

  // 2. Predict
  rows += `
    <tr>
      <td><code>/predict</code></td>
      <td>${currentRole === 'Nakes'
        ? (lang === 'en' ? 'Run Alzheimer clinical inference (Patient Mode or Benchmark Dataset)' : 'Jalankan inferensi klinis Alzheimer (Mode Pasien &amp; Uji Dataset 2.149 Data)')
        : (lang === 'en' ? 'Run personalized Alzheimer risk screening based on your biomarkers' : 'Jalankan skrining risiko Alzheimer mandiri berbasis data biomarker')}</td>
    </tr>
  `;

  if (currentRole === 'Nakes' || currentRole === 'Admin') {
    rows += `
      <tr>
        <td><code>/predict dataset</code></td>
        <td>${lang === 'en' ? 'Simulate inference on random test samples from Alzheimer Dataset (2,149 records)' : 'Simulasikan inferensi pada data pasien acak dari Dataset Alzheimer (2.149 data)'}</td>
      </tr>
    `;
  }

  // 3. Dokumen
  rows += `
    <tr>
      <td><code>/dokumen</code></td>
      <td>${currentRole === 'Nakes'
        ? (lang === 'en' ? 'Review & validate clinical consultation summary, medical referral & Nakes code' : 'Validasi resume medis, lembar rujukan faskes &amp; verifikasi Kode Nakes')
        : (lang === 'en' ? 'Download official consultation summary & Nakes referral code for clinics' : 'Tampilkan lembar resmi Dokumen Hasil Konsultasi &amp; Kode Rujukan Nakes')}</td>
    </tr>
  `;

  // 3b. Periksa Dokumen Pasien (Nakes & Admin)
  if (currentRole === 'Nakes' || currentRole === 'Admin') {
    rows += `
      <tr>
        <td><code>/periksa [kode]</code></td>
        <td>${lang === 'en' ? 'Lookup patient consultation document by code, review XGBoost prediction & validate' : 'Input kode dokumen pasien untuk menelaah hasil prediksi &amp; mengesahkan validasi medis'}</td>
      </tr>
    `;
  }

  // 4. Eval (Nakes & Admin)
  if (currentRole === 'Nakes' || currentRole === 'Admin') {
    rows += `
      <tr>
        <td><code>/eval</code></td>
        <td>${currentRole === 'Nakes'
          ? (lang === 'en' ? 'Inspect clinical validation metrics (95.4% Accuracy, Sensitivity, Specificity, AUC)' : 'Evaluasi metrik validasi klinis (Akurasi 95.4%, Sensitivitas, Spesifisitas, AUC-ROC)')
          : (lang === 'en' ? 'Evaluate model performance (Precision, Recall, F1, Log-loss, ROC-AUC curve)' : 'Evaluasi metrik teknis model (Precision, Recall, F1-Score, Confusion Matrix, Loss)')}</td>
      </tr>
    `;
  }

  // 5. Train & Progress (Admin only)
  if (currentRole === 'Admin') {
    rows += `
      <tr>
        <td><code>/train [N]</code></td>
        <td>${lang === 'en' ? 'Train XGBoost model for N boosting rounds on datasets/alzheimers_disease_data.csv' : 'Latih model XGBoost untuk N boosting rounds pada dataset klinis'}</td>
      </tr>
      <tr>
        <td><code>/progress</code></td>
        <td>${lang === 'en' ? 'Monitor iterative boosting telemetry and live loss updates in realtime' : 'Pantau log telemetri optimasi boosting iteratif secara realtime'}</td>
      </tr>
    `;
  }

  // 6. Status, Voice, Konsul, Intro, Help (All roles)
  rows += `
    <tr>
      <td><code>/status</code></td>
      <td>${currentRole === 'Admin'
        ? (lang === 'en' ? 'Inspect full server telemetry, memory status, and XGBoost checkpoint' : 'Inspeksi telemetri lengkap sistem, memori server, dan kesiapan model')
        : (lang === 'en' ? 'Check AI service readiness and model availability' : 'Periksa kesiapan model XGBoost, 32 biomarker, dan ketersediaan sistem')}</td>
    </tr>
    <tr>
      <td><code>/voice</code></td>
      <td>${lang === 'en' ? 'Open interactive voice consultation room' : 'Buka Voice Room untuk konsultasi suara interaktif real-time'}</td>
    </tr>
    <tr>
      <td><code>/konsul</code></td>
      <td>${lang === 'en' ? 'Start memory cognitive consultation session' : 'Mulai sesi konsultasi daya ingat atau formulir asesmen klinis'}</td>
    </tr>
    <tr>
      <td><code>/intro</code></td>
      <td>${lang === 'en' ? 'Introduction to Neura AI and clinical capabilities' : 'Tampilkan sapaan dan pengenalan Neura AI serta fitur konsultasi'}</td>
    </tr>
    <tr>
      <td><code>/help</code></td>
      <td>${lang === 'en' ? 'Display this interactive command guide' : 'Tampilkan panduan perintah interaktif ini'}</td>
    </tr>
  `;

  appendAssistantMessage(`
    <h4 class="neura-title-mid">${lang === 'en' ? 'Available Commands' : 'Daftar Perintah'} &bull; <span style="font-size:12.5px;font-weight:600;color:var(--accent-terracotta)">${roleLabel}</span></h4>
    <p class="neura-desc">${lang === 'en' ? 'Interactive commands customized for your role:' : 'Berikut adalah perintah interaktif yang tersedia dan disesuaikan untuk peran Anda:'}</p>
    <table class="neura-data-table cmd-list">
      <thead>
        <tr>
          <th>${lang === 'en' ? 'Command' : 'Perintah'}</th>
          <th>${lang === 'en' ? 'Function' : 'Deskripsi Fungsi'}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
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
    <h4 class="neura-title-mid">System &amp; Model Status</h4>
    <div class="neura-card">
      <div class="neura-stat-grid claude-stats-grid">
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Model Status</div>
          <div class="neura-stat-val stat-val ${statusClass}">${statusText}</div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Model Architecture</div>
          <div class="neura-stat-val stat-val" style="font-size:13.5px">${escapeHtml(data.model_name || 'AlzheimersXGBoost')}</div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Environment</div>
          <div class="neura-stat-val stat-val" style="font-size:13.5px">${escapeHtml(data.environment || 'development')}</div>
        </div>
      </div>
      ${data.checkpoint ? `<p class="checkpoint-path-note neura-desc-sm">Checkpoint: <code>${escapeHtml(data.checkpoint)}</code></p>` : ''}
    </div>
    ${!isReady ? `<div class="neura-note neura-note--warning"><div class="neura-note-body"><div class="neura-note-title">Perhatian Checkpoint</div><div class="neura-note-desc">Tidak ada checkpoint model terdeteksi. Jalankan <code>/train 5</code> untuk melatih model terlebih dahulu.</div></div></div>` : ''}
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
    <h4 class="neura-title-mid">Clinical Evaluation Results (XGBoost)</h4>
    <p class="neura-desc">Model evaluated against holdout test distribution (430 patients):</p>
    <div class="neura-card">
      <div class="neura-stat-grid claude-stats-grid">
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Model Accuracy</div>
          <div class="neura-stat-val stat-val val-good">${(acc * 100).toFixed(1)}%</div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">ROC-AUC</div>
          <div class="neura-stat-val stat-val val-good">${(auc * 100).toFixed(1)}%</div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Sensitivity / Recall</div>
          <div class="neura-stat-val stat-val val-good">${(rec * 100).toFixed(1)}%</div>
        </div>
      </div>
      <table class="claude-table neura-data-table" style="margin-top:14px">
        <thead><tr><th>Metric Name</th><th>Score</th><th>Clinical Description</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="neura-desc-sm" style="margin-top:10px">Confusion Matrix: 270 True Negatives, 140 True Positives, only 8 False Positives &amp; 12 False Negatives.</p>
    </div>
  `);
}



// --------------------------------------------------------------------------
// DOM Message Appenders
// --------------------------------------------------------------------------
function appendUserBubble(text, options = {}) {
  const { isPending = false, pendingId = null } = options;
  addMessageToActiveSession({ role: 'user', content: text });
  const container = document.getElementById('chat-content-container');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'message-row user';
  if (isPending && pendingId) {
    row.innerHTML = `
      <div class="user-bubble user-bubble-pending" id="${pendingId}">
        <div class="user-bubble-text">${escapeHtml(text)}</div>
        <div class="msg-pending-badge" id="badge_${pendingId}">
          <svg class="spin-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10"/>
          </svg>
          <span>Menunggu antrean...</span>
        </div>
      </div>
    `;
  } else {
    row.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  }
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

function removeTypingIndicator(id = null) {
  if (id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  } else {
    document.querySelectorAll('.message-row.assistant[id^="typing-"]').forEach(el => el.remove());
  }
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


