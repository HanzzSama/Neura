/**
 * app.js
 * ======
 * Neura AI Frontend Logic (Claude AI Experience)
 * Handles message dispatching, TensorFlow backend polling, theme toggle,
 * modals, and interactive command execution.
 */

const API = '';
let isTyping = false;
let trainingPollInterval = null;
let activeModelData = null;

// --------------------------------------------------------------------------
// Initialization & Dynamic Greeting
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupGreeting();
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

function activateChat(el, title) {
  document.querySelectorAll('.chat-history-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  showToast(`Loaded: ${title}`, 'info');
}

// --------------------------------------------------------------------------
// New Chat Action
// --------------------------------------------------------------------------
function startNewChat() {
  const container = document.getElementById('chat-content-container');
  container.innerHTML = `
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
  setupGreeting();
  document.getElementById('chat-input-textarea').value = '';
  document.getElementById('chat-input-textarea').style.height = 'auto';
  showToast('New conversation started', 'info');
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
async function sendUserMessage() {
  const input = document.getElementById('chat-input-textarea');
  const text = input.value.trim();
  if (!text || isTyping) return;

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
  isTyping = true;
  document.getElementById('send-msg-btn').disabled = true;

  try {
    await processMLInput(text, typingId);
  } catch(err) {
    removeTypingIndicator(typingId);
    appendAssistantMessage(`<p style="color:var(--accent-red)">Error: ${escapeHtml(err.message)}</p>`);
  } finally {
    isTyping = false;
    document.getElementById('send-msg-btn').disabled = false;
  }
}

// --------------------------------------------------------------------------
// Command Execution & Processing
// --------------------------------------------------------------------------
async function processMLInput(rawText, typingId) {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  if (lower === '/help') {
    removeTypingIndicator(typingId);
    renderHelpOutput();

  } else if (lower === '/status') {
    const data = await fetchJSON('/api/status');
    removeTypingIndicator(typingId);
    renderStatusOutput(data);

  } else if (lower.startsWith('/train')) {
    const parts = text.split(/\s+/);
    const epochs = parseInt(parts[1]) || 5;
    const data = await fetchJSON('/api/train', 'POST', { epochs });
    removeTypingIndicator(typingId);

    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Training Error: ${escapeHtml(data.error)}</p>`);
    } else {
      appendAssistantMessage(`
        <h4>Training Initialized</h4>
        <p>Started asynchronous training session for <strong>${epochs} epoch${epochs > 1 ? 's' : ''}</strong> on <code>BaseNeuralNetwork</code>.</p>
        <div class="terracotta-progress-wrap" id="live-progress-container">
          <div class="progress-meta-row">
            <span>Optimization Progress</span>
            <span id="epoch-progress-counter">Epoch 0 / ${epochs}</span>
          </div>
          <div class="progress-bar-base">
            <div class="progress-bar-fill" id="live-progress-fill" style="width: 0%"></div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Background daemon active. Polling live status...</p>
      `);
      startProgressPolling(epochs);
    }

  } else if (lower === '/eval') {
    const data = await fetchJSON('/api/evaluate', 'POST');
    removeTypingIndicator(typingId);
    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Evaluation Error: ${escapeHtml(data.error)}</p>`);
    } else {
      renderEvaluationOutput(data.metrics || {});
    }

  } else if (lower === '/predict') {
    const data = await fetchJSON('/api/predict', 'POST', {});
    removeTypingIndicator(typingId);
    if (data.error) {
      appendAssistantMessage(`<p style="color:var(--accent-red)">Prediction Error: ${escapeHtml(data.error)}</p>`);
    } else {
      renderPredictionOutput(data);
    }

  } else if (lower === '/progress') {
    const data = await fetchJSON('/api/train/progress');
    removeTypingIndicator(typingId);
    renderProgressOutput(data);

  } else {
    // Natural Language Assistant Response
    removeTypingIndicator(typingId);
    appendAssistantMessage(generateConversationalReply(text));
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
      <p>Neura is built using a clean MVC (Model-View-Controller) architecture with TensorFlow and Flask. The model is a multi-layer perceptron (MLP) featuring:</p>
      <ul style="margin:8px 0 12px 20px;line-height:1.7">
        <li><strong>Input:</strong> 128 continuous features</li>
        <li><strong>Hidden:</strong> Dense(64, ReLU) &bull; Dense(32, ReLU)</li>
        <li><strong>Output:</strong> 10 classes with Softmax activation</li>
      </ul>
      <p>Type <code>/help</code> to see all available commands.</p>
    `;
  }
  return `
    <p>I received your message: <em>"${escapeHtml(text)}"</em>.</p>
    <p>As a TensorFlow assistant, you can control me with these commands: <code>/status</code>, <code>/train [n]</code>, <code>/predict</code>, <code>/eval</code>, <code>/progress</code>, or <code>/help</code>.</p>
  `;
}

// --------------------------------------------------------------------------
// Renderers for ML Results (Claude Warm Aesthetic)
// --------------------------------------------------------------------------
function renderHelpOutput() {
  appendAssistantMessage(`
    <h4>Available Commands</h4>
    <p>Here are the commands you can use to interact with the TensorFlow engine:</p>
    <table class="claude-table">
      <tr><td><code>/status</code></td><td>Check model weights readiness, checkpoint path, and runtime environment</td></tr>
      <tr><td><code>/train [N]</code></td><td>Train the neural network for N epochs (e.g. <code>/train 5</code>)</td></tr>
      <tr><td><code>/eval</code></td><td>Evaluate model performance and compute loss/accuracy on test data</td></tr>
      <tr><td><code>/predict</code></td><td>Run inference on a sample feature vector and display class probabilities</td></tr>
      <tr><td><code>/progress</code></td><td>Inspect real-time epoch logs and training metrics</td></tr>
      <tr><td><code>/help</code></td><td>Display this command index</td></tr>
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
          <div class="stat-val" style="font-size:13.5px">${escapeHtml(data.model_name || 'BaseNeuralNetwork')}</div>
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

function renderEvaluationOutput(metrics) {
  const loss = metrics.loss ?? metrics.val_loss ?? 0;
  const acc = metrics.accuracy ?? metrics.compile_metrics ?? metrics.acc ?? 0;
  const lossClass = loss < 1 ? 'val-good' : loss < 2 ? '' : 'val-warn';
  const accClass = acc > 0.6 ? 'val-good' : acc > 0.35 ? '' : 'val-warn';

  const rows = Object.entries(metrics).map(([k, v]) => `
    <tr>
      <td>${escapeHtml(k)}</td>
      <td style="font-weight:600;color:var(--text-primary)">${typeof v === 'number' ? v.toFixed(4) : escapeHtml(v)}</td>
    </tr>
  `).join('');

  appendAssistantMessage(`
    <h4>Evaluation Results</h4>
    <p>Model evaluated against test data distribution:</p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Test Loss</div>
          <div class="stat-val ${lossClass}">${loss.toFixed(4)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Accuracy</div>
          <div class="stat-val ${accClass}">${(acc * 100).toFixed(1)}%</div>
        </div>
      </div>
      <table class="claude-table" style="margin-top:14px">
        <thead><tr><th>Metric Name</th><th>Calculated Value</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

function renderPredictionOutput(data) {
  const probs = data.probabilities || [];
  const topClass = data.predicted_class || 'Unknown';
  const conf = (data.confidence * 100).toFixed(1);
  const sorted = [...probs].sort((a, b) => b.prob - a.prob).slice(0, 5);

  const bars = sorted.map((item, idx) => {
    const pct = (item.prob * 100).toFixed(1);
    const isTop = idx === 0;
    return `
      <div class="prob-row">
        <span class="prob-name">${escapeHtml(item.class)}</span>
        <div class="prob-track">
          <div class="prob-fill ${isTop ? 'is-top' : ''}" style="width: ${pct}%"></div>
        </div>
        <span class="prob-percent">${pct}%</span>
      </div>
    `;
  }).join('');

  appendAssistantMessage(`
    <h4>Inference Output</h4>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Predicted Class</div>
          <div class="stat-val val-good">${escapeHtml(topClass)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Confidence</div>
          <div class="stat-val">${conf}%</div>
        </div>
      </div>
      <div style="margin-top:16px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:8px">Top 5 Softmax Probabilities</div>
        ${bars}
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

      if (!data.running) {
        clearInterval(trainingPollInterval);
        trainingPollInterval = null;
        fetchModelStatus(false);
        showToast('Training completed successfully', 'success');

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
  const container = document.getElementById('chat-content-container');
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  container.appendChild(row);
  scrollToBottom();
}

function appendAssistantMessage(html) {
  const container = document.getElementById('chat-content-container');
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.innerHTML = `
    <div class="assistant-header">
      <img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display='none'" />
      <span class="assistant-name">Neura</span>
      <span class="assistant-model-tag">&bull; BaseNeuralNetwork</span>
    </div>
    <div class="assistant-prose">${html}</div>
    <div class="msg-actions-row">
      <button class="msg-action-btn" title="Copy response" onclick="copyMessageText(this)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      </button>
    </div>
  `;
  container.appendChild(row);
  scrollToBottom();
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
    </div>
    <div class="claude-typing-row">
      <div class="claude-typing-dot"></div>
      <div class="claude-typing-dot"></div>
      <div class="claude-typing-dot"></div>
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

  // Modal fields
  const mName = document.getElementById('modal-model-name');
  const mEnv = document.getElementById('modal-env');
  const mCp = document.getElementById('modal-checkpoint');
  const mStat = document.getElementById('modal-status');
  if (mName) mName.textContent = data.model_name || 'BaseNeuralNetwork';
  if (mEnv) mEnv.textContent = data.environment || 'development';
  if (mCp) mCp.textContent = data.checkpoint || 'public/checkpoints/NeuralNetwork.keras';
  if (mStat) {
    mStat.textContent = data.model_ready ? 'Ready' : 'Not Trained';
    mStat.style.color = data.model_ready ? 'var(--accent-green)' : 'var(--accent-red)';
  }
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
