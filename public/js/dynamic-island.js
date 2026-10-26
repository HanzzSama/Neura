/**
 * Global Dynamic Island Manager
 * Works across all pages (welcome.html, index.html, etc.)
 */

(function () {
  'use strict';

  let islandTimerInterval = null;
  let islandStartTime = null;
  let currentIslandState = 'ready';

  // 1. Inject Dynamic Island HTML if not already in DOM
  function ensureDynamicIslandDOM() {
    if (document.getElementById('dynamic-island')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'dynamic-island-wrapper';
    wrapper.innerHTML = `
      <div class="dynamic-island theme-green" id="dynamic-island">
        <!-- Compact Notch State -->
        <div class="island-notch-compact" id="island-compact-trigger" onclick="handleIslandClick()">
          <span class="island-notch-sub" id="island-sub-text">XGBoost &bull; 32 Biomarkers</span>
          <div class="island-notch-main-row">
            <div class="island-pixel-loader" id="island-pixel-loader" title="Neura AI Processing">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" class="pixel-loader-svg">
                <rect x="0" y="0" width="4" height="4" class="px-cell px-0-0" />
                <rect x="4" y="0" width="4" height="4" class="px-cell px-1-0" />
                <rect x="8" y="0" width="4" height="4" class="px-cell px-2-0" />
                <rect x="0" y="4" width="4" height="4" class="px-cell px-0-1" />
                <rect x="4" y="4" width="4" height="4" class="px-cell px-1-1" />
                <rect x="8" y="4" width="4" height="4" class="px-cell px-2-1" />
                <rect x="0" y="8" width="4" height="4" class="px-cell px-0-2" />
                <rect x="4" y="8" width="4" height="4" class="px-cell px-1-2" />
                <rect x="8" y="8" width="4" height="4" class="px-cell px-2-2" />
              </svg>
            </div>
            <!-- Live Voice Soundwave visualizer bars -->
            <div class="island-soundwave" id="island-soundwave" style="display:none" title="Voice AI Active">
              <span class="soundwave-bar bar-1"></span>
              <span class="soundwave-bar bar-2"></span>
              <span class="soundwave-bar bar-3"></span>
              <span class="soundwave-bar bar-4"></span>
              <span class="soundwave-bar bar-5"></span>
            </div>
            <span class="island-notch-main" id="island-main-text">Ready</span>
            <!-- Inline notch stop button for live voice barge-in -->
            <button class="island-notch-stop-btn" id="island-notch-stop-btn" style="display:none" onclick="event.stopPropagation(); if(window.interruptVoiceSpeaking){window.interruptVoiceSpeaking('island_notch_click');}" title="Hentikan Suara Neura">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            </button>
            <span class="island-notch-timer" id="island-timer" style="display:none">00:00</span>
          </div>
        </div>

        <!-- Expanded Dropdown State -->
        <div class="island-expanded">
          <div class="island-expanded-header">
            <div class="island-header-left">
              <div class="island-logo-mini">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/>
                </svg>
              </div>
              <div>
                <div class="island-model-name" id="island-model-name">Neura AI Clinical Hub</div>
                <div class="island-model-sub" id="island-env-tag">XGBoost Classifier &bull; 32 Biomarkers</div>
              </div>
            </div>
            <div class="island-header-right">
              <span class="island-user-badge" id="island-user-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span id="island-user-name">Guest</span>
              </span>
              <span class="island-badge-live" id="island-badge-live">Live XGBoost 3.x</span>
            </div>
          </div>

          <div class="island-metrics-row">
            <div class="island-stat-box stat-default">
              <span class="island-stat-num" id="island-stat-features">32</span>
              <span class="island-stat-lbl">Biomarkers</span>
            </div>
            <div class="island-stat-box stat-purple">
              <span class="island-stat-num" id="island-stat-classes">2</span>
              <span class="island-stat-lbl">Classes (0/1)</span>
            </div>
            <div class="island-stat-box stat-cyan" id="island-stat-box-intents">
              <span class="island-stat-num" id="island-stat-intents" style="color:#06b6d4">241</span>
              <span class="island-stat-lbl">Clinical Intents</span>
            </div>
            <div class="island-stat-box stat-green" id="island-stat-box-status">
              <span class="island-stat-num" id="island-stat-status" style="color:#22c55e">95.4%</span>
              <span class="island-stat-lbl">Accuracy</span>
            </div>
          </div>

          <div class="island-quick-actions">
            <button class="island-btn btn-orange" onclick="globalIslandAction('/train 50')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2v-2h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H6V5zm12 0h-2v2h-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1v2h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 11h8v2H8z"/>
              </svg>
              <span>Train</span>
            </button>
            <button class="island-btn btn-purple" onclick="globalIslandAction('/predict')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/>
              </svg>
              <span>Diagnose</span>
            </button>
            <button class="island-btn btn-cyan" onclick="globalIslandAction('voice')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
              <span>Voice AI</span>
            </button>
            <button class="island-btn btn-green" onclick="globalIslandAction('/eval')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H4V3a1 1 0 0 0-1-1zm5 14h2a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1zm5 0h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1zm5 0h2a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1z"/>
              </svg>
              <span>Metrics</span>
            </button>
            <button class="island-btn btn-default" onclick="globalIslandAction('specs')">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>Specs</span>
            </button>
          </div>

          <div class="island-prompts-row">
            <button class="island-prompt-pill" onclick="triggerIslandPrompt('Apa perbedaan pikun biasa dan alzheimer?')">🧠 Beda Pikun</button>
            <button class="island-prompt-pill" onclick="triggerIslandPrompt('Bagaimana interpretasi skor tes MMSE?')">📋 Skor MMSE</button>
            <button class="island-prompt-pill" onclick="triggerIslandPrompt('Bagaimana pola diet MIND untuk pencegahan?')">🥗 Diet MIND</button>
            <button class="island-prompt-pill" onclick="triggerIslandPrompt('Bagaimana tips merawat lansia dengan demensia?')">🛡️ Caregiver</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  // 2. Formatting & Timers
  function formatElapsedTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }

  window.startIslandTimer = function () {
    window.stopIslandTimer(0);
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
  };

  window.stopIslandTimer = function (keepVisibleMs = 3500) {
    if (islandTimerInterval) {
      clearInterval(islandTimerInterval);
      islandTimerInterval = null;
    }
    const timerEl = document.getElementById('island-timer');
    if (!timerEl) return;
    if (keepVisibleMs > 0) {
      setTimeout(() => {
        if (currentIslandState === 'ready' || currentIslandState === 'idle') {
          timerEl.style.display = 'none';
        }
      }, keepVisibleMs);
    } else {
      timerEl.style.display = 'none';
    }
  };

  // 3. State Setter
  window.setDynamicIslandState = function (state, options = {}) {
    currentIslandState = state;
    const island = document.getElementById('dynamic-island');
    const subEl = document.getElementById('island-sub-text');
    const mainEl = document.getElementById('island-main-text');
    const pixelLoader = document.getElementById('island-pixel-loader');
    const soundwave = document.getElementById('island-soundwave');
    const notchStopBtn = document.getElementById('island-notch-stop-btn');

    if (!island || !subEl || !mainEl) return;

    island.classList.remove(
      'theme-orange', 'theme-purple', 'theme-green', 'theme-default',
      'theme-cyan', 'theme-voice-listening', 'theme-voice-speaking', 'theme-stopped', 'theme-voice-stopped',
      'is-thinking', 'is-training', 'is-ready'
    );

    // Default icon states
    if (pixelLoader) pixelLoader.style.display = 'flex';
    if (soundwave) soundwave.style.display = 'none';
    if (notchStopBtn) notchStopBtn.style.display = 'none';

    switch (state) {
      case 'voice-speaking':
        island.classList.add('theme-voice-speaking', 'theme-orange', 'is-thinking');
        if (pixelLoader) pixelLoader.style.display = 'none';
        if (soundwave) soundwave.style.display = 'flex';
        if (notchStopBtn) notchStopBtn.style.display = 'inline-flex';
        subEl.textContent = options.sub || 'Neura Voice AI \u2022 Speaking';
        mainEl.textContent = options.main || 'Speaking';
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'voice-listening':
        island.classList.add('theme-voice-listening', 'theme-cyan', 'is-thinking');
        if (pixelLoader) pixelLoader.style.display = 'none';
        if (soundwave) soundwave.style.display = 'flex';
        if (notchStopBtn) notchStopBtn.style.display = 'none';
        subEl.textContent = options.sub || 'Voice AI Consultation \u2022 Listening';
        mainEl.textContent = options.main || 'Listening';
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'voice-stopped':
        island.classList.add('theme-voice-stopped', 'theme-stopped');
        if (pixelLoader) pixelLoader.style.display = 'flex';
        if (soundwave) soundwave.style.display = 'none';
        if (notchStopBtn) notchStopBtn.style.display = 'none';
        subEl.textContent = options.sub || 'Voice Interrupted \u2022 Standby';
        mainEl.textContent = options.main || 'Stopped';
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'thinking':
        island.classList.add('theme-orange', 'is-thinking');
        subEl.textContent = options.sub || 'Matching clinical intent \u2022 chat_dataset.py';
        mainEl.textContent = options.main || 'Thinking';
        window.startIslandTimer();
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
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'predicting':
        island.classList.add('theme-purple', 'is-thinking');
        subEl.textContent = options.sub || 'Evaluating 32 Biomarkers \u2022 Clinical Inference';
        mainEl.textContent = options.main || 'Diagnosing';
        window.startIslandTimer();
        break;

      case 'evaluating':
        island.classList.add('theme-green', 'is-thinking');
        subEl.textContent = options.sub || 'Evaluating test metrics \u2022 430 patient records';
        mainEl.textContent = options.main || 'Evaluating';
        window.startIslandTimer();
        break;

      case 'idle':
        island.classList.add('theme-default');
        subEl.textContent = options.sub || "Alzheimer's AI \u2022 Standby";
        mainEl.textContent = options.main || 'Idle';
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'ready':
      default:
        island.classList.add('theme-green', 'is-ready');
        subEl.textContent = options.sub || "Alzheimer's AI \u2022 32 Clinical Biomarkers";
        mainEl.textContent = options.main || 'Ready';
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;
    }
  };

  // 4. Action Handlers (Universal)
  window.handleIslandClick = function () {
    if (window.openModelModal) {
      window.openModelModal();
    } else {
      window.location.href = '/app';
    }
  };

  window.triggerIslandPrompt = function (query) {
    if (!query) return;
    if (typeof window.submitCommand === 'function') {
      const input = document.getElementById('chat-input') || document.querySelector('.floating-input');
      if (input) input.value = query;
      window.submitCommand(query);
    } else {
      sessionStorage.setItem('pending_neura_action', query);
      window.location.href = '/app';
    }
  };

  window.globalIslandAction = function (action) {
    if (action === 'voice') {
      if (typeof window.openVoiceChat === 'function') {
        window.openVoiceChat();
      } else {
        sessionStorage.setItem('pending_neura_action', '__open_voice__');
        window.location.href = '/app';
      }
      return;
    }

    if (typeof window.submitCommand === 'function') {
      if (action === 'specs') {
        if (window.openModelModal) window.openModelModal();
      } else {
        window.submitCommand(action);
      }
    } else {
      // If we are on welcome.html or external page, navigate to /app with action
      if (action === 'specs') {
        window.location.href = '/app';
      } else {
        sessionStorage.setItem('pending_neura_action', action);
        window.location.href = '/app';
      }
    }
  };

  // 5. Background Poller for Live Model Sync
  async function syncStatus() {
    try {
      // Sync user badge from localStorage
      const userBadgeEl = document.getElementById('island-user-name');
      if (userBadgeEl) {
        try {
          const rawUser = localStorage.getItem('neura_auth_user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            const name = parsed.name || parsed.username || parsed.email || 'Dr. Hanzz';
            userBadgeEl.textContent = name;
          } else {
            userBadgeEl.textContent = 'Guest';
          }
        } catch (_) {
          userBadgeEl.textContent = 'Dr. Hanzz';
        }
      }

      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();

      const islandStat = document.getElementById('island-stat-status');
      const islandStatBox = document.getElementById('island-stat-box-status');
      const islandEnv = document.getElementById('island-env-tag');
      const islandStatFeatures = document.getElementById('island-stat-features');
      const islandStatIntents = document.getElementById('island-stat-intents');

      if (islandStatFeatures && data.features_count) {
        islandStatFeatures.textContent = data.features_count;
      }
      if (islandStatIntents && data.intents_count) {
        islandStatIntents.textContent = data.intents_count;
      }

      if (islandStat) {
        if (data.training_running) {
          islandStat.textContent = 'Training';
          islandStat.style.color = '#f59e0b';
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

      // Do not override voice states while active
      if (currentIslandState === 'voice-speaking' || currentIslandState === 'voice-listening' || currentIslandState === 'voice-stopped') {
        return;
      }

      if (currentIslandState === 'ready' || currentIslandState === 'idle') {
        if (data.training_running) {
          window.setDynamicIslandState('training', { sub: 'Training active in background...', main: 'Training...' });
        } else {
          const subEl = document.getElementById('island-sub-text');
          const mainEl = document.getElementById('island-main-text');
          if (subEl) subEl.textContent = data.model_ready ? 'XGBoost \u2022 32 Biomarkers' : 'No Model Checkpoint';
          if (mainEl) mainEl.textContent = data.model_ready ? 'Ready' : 'Idle';
        }
      }
    } catch (_) {}
  }

  // 6. Initialize on DOM Ready
  function init() {
    ensureDynamicIslandDOM();
    syncStatus();
    setInterval(syncStatus, 5000);

    // Check for pending action in sessionStorage on /app
    if (typeof window.submitCommand === 'function') {
      const pending = sessionStorage.getItem('pending_neura_action');
      if (pending) {
        sessionStorage.removeItem('pending_neura_action');
        if (pending === '__open_voice__') {
          setTimeout(() => { if (window.openVoiceChat) window.openVoiceChat(); }, 500);
        } else {
          setTimeout(() => window.submitCommand(pending), 400);
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
