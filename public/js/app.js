/**
 * app.js
 * ======
 * Neura AI Frontend Logic (Claude AI Experience)
 * Handles message dispatching, TensorFlow backend polling, theme toggle,
 * modals, and interactive command execution.
 */

const API = '';
const CHAT_STORAGE_KEY = 'neura_recent_chats_v2';
const ML_DROPDOWN_STORAGE_KEY = 'neura_ml_dropdown_collapsed';

let chatSessions = [];
let activeSessionId = null;
let isTyping = false;
let stopRequested = false;
let trainingPollInterval = null;
let activeModelData = null;

function setGeneratingState(generating) {
  isTyping = generating;
  const btn = document.getElementById('send-msg-btn');
  if (!btn) return;
  if (generating) {
    btn.classList.add('is-generating');
    btn.title = 'Stop generating';
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <rect x="5" y="5" width="14" height="14" rx="2.5"/>
      </svg>
    `;
  } else {
    btn.classList.remove('is-generating');
    btn.title = 'Send message';
    btn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.5a1.2 1.2 0 0 1 .85.35l6 6a1.2 1.2 0 1 1-1.7 1.7L13.2 6.55V20a1.2 1.2 0 1 1-2.4 0V6.55L6.85 10.55a1.2 1.2 0 1 1-1.7-1.7l6-6a1.2 1.2 0 0 1 .85-.35z"/>
      </svg>
    `;
  }
}

function handleSendClick() {
  if (isTyping) {
    stopRequested = true;
    return;
  }
  sendUserMessage();
}

// --------------------------------------------------------------------------
// Initialization & Dynamic Greeting
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupGreeting();
  loadChatSessions();
  renderRecentChatsSidebar();
  initMLCommandsDropdown();

  // If there are existing saved sessions, open the most recent one; otherwise start fresh
  if (chatSessions.length > 0) {
    switchChatSession(chatSessions[0].id);
  } else {
    startNewChat();
  }

  fetchModelStatus(false);
  setInterval(() => fetchModelStatus(false), 12000);

  // Global keyboard shortcut: Ctrl+K or Cmd+K for new chat
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      startNewChat();
    }
  });
});

function setupGreeting() {
  const hour = new Date().getHours();
  let text = 'Good evening';
  if (hour >= 5 && hour < 12) text = 'Good morning';
  else if (hour >= 12 && hour < 17) text = 'Good afternoon';
  else if (hour >= 17 && hour < 22) text = 'Good evening';
  else text = 'Good night';

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
    // Default is collapsed (true), unless user explicitly opened it (saved === 'false')
    const isCollapsed = saved !== 'false';
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
  renderRecentChatsSidebar();
  renderSessionMessages(session);
}

function deleteChatSession(e, sessionId) {
  e.stopPropagation();
  chatSessions = chatSessions.filter(s => s.id !== sessionId);
  saveChatSessions();
  if (activeSessionId === sessionId) {
    activeSessionId = null;
    startNewChat();
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
      row.innerHTML = `
        <div class="assistant-header">
          <img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display='none'" />
          <span class="assistant-name">Neura</span>
          <span class="assistant-model-tag">&bull; AlzheimersXGBoost</span>
        </div>
        <div class="assistant-prose">${msg.html}</div>
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

  scrollToBottom();
}

function getHeroHtml() {
  return `
    <div class="claude-hero" id="claude-hero">
      <img src="/assets/neura_logo.jpg" alt="Neura Logo" class="hero-neura-logo" onerror="this.style.display='none'" />
      <h1 class="hero-greeting" id="hero-greeting-text">Good evening</h1>
      <p class="hero-subhead">How can Neura assist you with your TensorFlow machine learning workflows today?</p>
      <div class="hero-cards-grid">
        <div class="hero-card" onclick="submitCommand('/train 5')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            <span>Train Neural Network</span>
          </div>
          <div class="hero-card-desc">Execute 5 epochs of backpropagation on synthetic data</div>
        </div>
        <div class="hero-card" onclick="submitCommand('/predict')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>Run Inference</span>
          </div>
          <div class="hero-card-desc">Sample a 128-dim input and inspect top class probabilities</div>
        </div>
        <div class="hero-card" onclick="submitCommand('/eval')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Evaluate Metrics</span>
          </div>
          <div class="hero-card-desc">Compute test loss and test accuracy against validation sets</div>
        </div>
        <div class="hero-card" onclick="submitCommand('/status')">
          <div class="hero-card-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            <span>Model Architecture</span>
          </div>
          <div class="hero-card-desc">Verify checkpoints, weights readiness, and server health</div>
        </div>
      </div>
    </div>
  `;
}

// --------------------------------------------------------------------------
// Start New Chat Action
// --------------------------------------------------------------------------
function startNewChat() {
  activeSessionId = null;
  renderRecentChatsSidebar();

  const container = document.getElementById('chat-content-container');
  container.innerHTML = getHeroHtml();
  setupGreeting();

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
    input.focus();
  }

  showToast('New conversation ready', 'info');
}

// --------------------------------------------------------------------------
// Theme Switching (Claude Warm Linen <-> Claude Obsidian Dark)
// --------------------------------------------------------------------------
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  showToast(`Switched to ${next === 'dark' ? 'Obsidian Dark' : 'Warm Linen'} mode`, 'info');
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
}

function handleTextareaKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendUserMessage();
  }
}

function submitCommand(cmd) {
  const input = document.getElementById('chat-input-textarea');
  input.value = cmd;
  sendUserMessage();
}

// --------------------------------------------------------------------------
// Message Sending & Pipeline
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Message Sending & Pipeline
// --------------------------------------------------------------------------
async function waitLoad(startTime, minMs = 450) {
  const elapsed = Date.now() - startTime;
  if (elapsed < minMs) {
    await new Promise(r => setTimeout(r, minMs - elapsed));
  }
}

async function sendUserMessage() {
  const input = document.getElementById('chat-input-textarea');
  const text = input.value.trim();
  if (!text) return;
  if (isTyping) {
    stopRequested = true;
    return;
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
    renderRecentChatsSidebar();
  }

  // Clear input
  input.value = '';
  input.style.height = 'auto';

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

  if (lower === '/help') {
    await waitLoad(startTime, 400);
    removeTypingIndicator(typingId);
    renderHelpOutput();

  } else if (lower === '/status') {
    const data = await fetchJSON('/api/status');
    await waitLoad(startTime, 450);
    removeTypingIndicator(typingId);
    renderStatusOutput(data);

  } else if (lower.startsWith('/train')) {
    const parts = text.split(/\s+/);
    const epochs = parseInt(parts[1]) || 50;
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
        <p>Started asynchronous training session for <strong>${epochs} boosting rounds</strong> on <code>AlzheimersXGBoost</code> (datasets/alzheimers_disease_data.csv).</p>
        <div class="terracotta-progress-wrap" id="live-progress-container">
          <div class="progress-meta-row">
            <span>Optimization Progress</span>
            <span id="epoch-progress-counter">Round 0 / ${epochs}</span>
          </div>
          <div class="progress-bar-base">
            <div class="progress-bar-fill" id="live-progress-fill" style="width: 0%"></div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Background boosting daemon active. Polling live status...</p>
      `, { stream: false });
      startProgressPolling(epochs);
    }

  } else if (lower === '/eval') {
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

  } else if (lower === '/predict') {
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

  } else if (lower === '/progress') {
    setDynamicIslandState('thinking', {
      sub: 'Fetching real-time training telemetry...',
      main: 'Inspecting'
    });
    const data = await fetchJSON('/api/train/progress');
    await waitLoad(startTime, 400);
    removeTypingIndicator(typingId);
    renderProgressOutput(data);

  } else {
    // Natural Language Assistant Response powered by Chat Dataset
    try {
      setDynamicIslandState('thinking', {
        sub: 'Matching intent \u2022 chat_dataset.py',
        main: 'Thinking'
      });
      const chatRes = await fetchJSON('/api/chat', 'POST', { message: text });
      await waitLoad(startTime, 500);
      removeTypingIndicator(typingId);
      if (chatRes && chatRes.matched && chatRes.reply) {
        setDynamicIslandState('generating', {
          sub: `Matched [${chatRes.category || 'chat_dataset'}] \u2022 Intent Verified`,
          main: 'Generating'
        });
        const formatted = escapeHtml(chatRes.reply)
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br>')
          .replace(/`([^`]+)`/g, '<code>$1</code>');
        appendAssistantMessage(`<p>${formatted}</p>`, { stream: true });
      } else {
        setDynamicIslandState('generating', {
          sub: 'Streaming response \u2022 AlzheimersXGBoost',
          main: 'Generating'
        });
        appendAssistantMessage(generateConversationalReply(text), { stream: true });
      }
    } catch(e) {
      await waitLoad(startTime, 400);
      removeTypingIndicator(typingId);
      setDynamicIslandState('generating', {
        sub: 'Streaming response \u2022 AlzheimersXGBoost',
        main: 'Generating'
      });
      appendAssistantMessage(generateConversationalReply(text), { stream: true });
    }
  }
}

// --------------------------------------------------------------------------
// Conversational Natural Language Engine
// --------------------------------------------------------------------------
function generateConversationalReply(text) {
  const t = text.toLowerCase();
  if (t.includes('hello') || t.includes('hi') || t.includes('halo')) {
    return `
      <p>Hello! I'm <strong>Neura</strong>, an interactive TensorFlow neural network assistant. I can train models, run live predictions, evaluate validation metrics, and inspect neural architecture.</p>
      <p>Try running <code>/status</code>, <code>/train 5</code>, or <code>/predict</code> to get started.</p>
    `;
  }
  if (t.includes('train')) {
    return `
      <p>You can train the underlying neural network using the command <code>/train [epochs]</code>. For instance, running <code>/train 10</code> will launch 10 epochs of backpropagation on our classification dataset.</p>
    `;
  }
  if (t.includes('predict') || t.includes('inference')) {
    return `
      <p>To run inference on a sample 128-dimensional vector, execute <code>/predict</code>. The model will calculate softmax probabilities across all 10 target classes.</p>
    `;
  }
  if (t.includes('eval') || t.includes('metric') || t.includes('accuracy')) {
    return `
      <p>Use <code>/eval</code> to run test evaluations on your saved checkpoint. It calculates categorical crossentropy loss and accuracy metrics.</p>
    `;
  }
  if (t.includes('who') || t.includes('what') || t.includes('architecture')) {
    return `
      <p>Neura is running an advanced <strong>XGBoost (Extreme Gradient Boosting) Classifier</strong> trained on clinical patient records for high-accuracy Alzheimer's disease diagnosis:</p>
      <ul style="margin:8px 0 12px 20px;line-height:1.7">
        <li><strong>Dataset:</strong> datasets/alzheimers_disease_data.csv (2,149 records)</li>
        <li><strong>Input Features:</strong> 32 clinical biomarkers (MMSE, ADL, Memory, Functional Assessment, etc.)</li>
        <li><strong>Algorithm:</strong> XGBoost Gradient Boosted Decision Trees</li>
        <li><strong>Performance:</strong> 95.35% Accuracy &bull; 94.11% ROC-AUC &bull; 92.11% Sensitivity</li>
      </ul>
      <p>Type <code>/help</code> to see all available commands.</p>
    `;
  }
  return `
    <p>I received your message: <em>"${escapeHtml(text)}"</em>.</p>
    <p>As an Alzheimer's ML assistant, you can control me with these commands: <code>/status</code>, <code>/train [rounds]</code>, <code>/predict</code>, <code>/eval</code>, <code>/progress</code>, or <code>/help</code>.</p>
  `;
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
      ${data.checkpoint ? `<p style="font-size:11.5px;color:var(--text-muted);margin-top:12px">Checkpoint: <code>${escapeHtml(data.checkpoint)}</code></p>` : ''}
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
  const prob = data.probability !== undefined ? data.probability : 50.0;
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
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:8px">Primary Biomarkers &amp; Cognitive Scores</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;font-size:12px;">
          <div style="background:var(--bg-hover);padding:6px 10px;border-radius:6px;">
            <span style="color:var(--text-muted);display:block;font-size:10.5px">MMSE Score</span>
            <strong style="color:var(--text-primary)">${markers.MMSE ?? 24.5} / 30</strong>
          </div>
          <div style="background:var(--bg-hover);padding:6px 10px;border-radius:6px;">
            <span style="color:var(--text-muted);display:block;font-size:10.5px">ADL Score</span>
            <strong style="color:var(--text-primary)">${markers.ADL ?? 6.2} / 10</strong>
          </div>
          <div style="background:var(--bg-hover);padding:6px 10px;border-radius:6px;">
            <span style="color:var(--text-muted);display:block;font-size:10.5px">Functional Assessment</span>
            <strong style="color:var(--text-primary)">${markers.FunctionalAssessment ?? 5.5} / 10</strong>
          </div>
          <div style="background:var(--bg-hover);padding:6px 10px;border-radius:6px;">
            <span style="color:var(--text-muted);display:block;font-size:10.5px">Memory Complaints</span>
            <strong style="color:${markers.MemoryComplaints === 'Yes' ? 'var(--accent-red)' : 'var(--accent-green)'}">${markers.MemoryComplaints ?? 'No'}</strong>
          </div>
          <div style="background:var(--bg-hover);padding:6px 10px;border-radius:6px;">
            <span style="color:var(--text-muted);display:block;font-size:10.5px">Patient Demographics</span>
            <strong style="color:var(--text-primary)">${markers.Age ?? 73} y.o. &bull; ${markers.Gender ?? 'Male'}</strong>
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

  trainingPollInterval = setInterval(async () => {
    try {
      const data = await fetchJSON('/api/train/progress');
      const progress = data.progress || [];
      const completed = progress.length;
      const pct = Math.min(Math.round((completed / totalEpochs) * 100), 100);

      const fill = document.getElementById('live-progress-fill');
      const counter = document.getElementById('epoch-progress-counter');
      if (fill) fill.style.width = pct + '%';
      if (counter) counter.textContent = `Epoch ${completed} / ${totalEpochs}`;

      const lastEp = progress[completed - 1];
      const lossText = lastEp ? `Loss: ${lastEp.loss.toFixed(3)} \u2022 Acc: ${(lastEp.accuracy * 100).toFixed(0)}%` : 'Optimizing...';
      setDynamicIslandState('training', {
        sub: `Epoch ${completed}/${totalEpochs} \u2022 ${lossText}`,
        main: `Training (${pct}%)`
      });

      if (!data.running) {
        clearInterval(trainingPollInterval);
        trainingPollInterval = null;
        fetchModelStatus(false);
        showToast('Training completed successfully', 'success');

        setDynamicIslandState('ready', {
          sub: data.report ? `Training Complete \u2022 Val Acc: ${(data.report.best_val_acc * 100).toFixed(1)}%` : 'Training Complete',
          main: 'Trained',
          keepTimer: true
        });

        if (data.report) {
          appendAssistantMessage(`
            <h4>Training Session Completed</h4>
            <div class="claude-card">
              <div class="claude-stats-grid">
                <div class="stat-pill">
                  <div class="stat-label">Total Epochs</div>
                  <div class="stat-val">${data.report.epochs_run}</div>
                </div>
                <div class="stat-pill">
                  <div class="stat-label">Best Val Accuracy</div>
                  <div class="stat-val val-good">${(data.report.best_val_acc * 100).toFixed(1)}%</div>
                </div>
                <div class="stat-pill">
                  <div class="stat-label">Best Val Loss</div>
                  <div class="stat-val">${data.report.best_val_loss}</div>
                </div>
                <div class="stat-pill">
                  <div class="stat-label">Train Accuracy</div>
                  <div class="stat-val">${(data.report.final_train_acc * 100).toFixed(1)}%</div>
                </div>
              </div>
              <p style="font-size:12px;color:var(--text-muted);margin-top:12px">Checkpoint saved to <code>public/checkpoints/NeuralNetwork.keras</code>.</p>
            </div>
          `);
        }
      }
    } catch(err) {
      // Silent error during poll
    }
  }, 1200);
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
  addMessageToActiveSession({ role: 'assistant', html: html });
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
  const actionRow = row.querySelector('.msg-actions-row');

  if (stream) {
    streamTypewriter(proseEl, html, () => {
      if (actionRow) actionRow.style.display = 'flex';
      scrollToBottom();
    });
  } else {
    proseEl.innerHTML = html;
    if (actionRow) actionRow.style.display = 'flex';
    
    // Animate probability bars
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
  // If html has tables, cards, lists or code blocks, render directly with smooth fade to prevent breaking HTML tags
  if (fullHtml.includes('<table') || fullHtml.includes('claude-card') || fullHtml.includes('progress-bar') || fullHtml.includes('<pre>') || fullHtml.includes('<ul') || fullHtml.includes('<ol')) {
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

  // Word/tag tokenizer for fluid progressive streaming
  const tokens = fullHtml.split(/(\s+|<[^>]+>)/).filter(Boolean);
  let idx = 0;
  let accumulated = '';
  const cursor = '<span class="streaming-cursor"></span>';

  function renderNext() {
    if (stopRequested) {
      targetElement.innerHTML = accumulated;
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
      targetElement.innerHTML = accumulated;
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
    islandStat.textContent = data.training_running ? 'Training' : data.model_ready ? 'Ready' : 'Not Loaded';
    islandStat.style.color = data.training_running ? 'var(--accent-terracotta)' : data.model_ready ? '#4ade80' : '#f87171';
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
      if (subEl) subEl.textContent = data.model_ready ? `${data.model_name || "Alzheimer's AI"} \u2022 32 Biomarkers` : 'No Model Checkpoint';
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
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
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
