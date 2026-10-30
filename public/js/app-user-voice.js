/**
 * public/js/app-user-voice.js
 * ===========================
 * Role: User (Pasien)
 * Voice Consultation Session Exporter to Main Chat & Clamp Handlers.
 */

// --------------------------------------------------------------------------
// Voice Consultation Session Exporter to Main Chat
// --------------------------------------------------------------------------
window.appendVoiceSessionToChat = function (summaryMarkdown) {
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
    } catch (e) { }
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

window.toggleVoiceSessionClamp = function (btn) {
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

window.toggleTrainingCardClamp = function (btn) {
  if (!btn) return;
  const card = btn.closest('.training-progress-card');
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

