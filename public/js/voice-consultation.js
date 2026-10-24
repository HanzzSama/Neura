/**
 * public/js/voice-consultation.js
 * Voice Consultation Room — Neura AI
 * Matches the exact design system and structure of the normal Neura chat room.
 * Features:
 *   - Real-time speech transcription directly into chat bubbles as you speak
 *   - Live user bubble with pulsing indicator that finalizes on speech completion
 *   - Claude-styled loading typing indicator while analyzing
 *   - Assistant messages styled identically to normal chat (.message-row.assistant)
 *   - Mini pulsing orb in top bar
 *   - Session timer, mute/unmute, and clean transition back to main chat
 */

(function () {
  'use strict';

  // State
  var isVoiceOpen = false;
  var isCallActive = false;
  var isMuted = false;
  var isAgentSpeaking = false;
  var speechRec = null;
  var sessionTimerInterval = null;
  var sessionSeconds = 0;
  var animFrameId = null;
  var silenceTimer = null;
  var accumulatedFinalText = '';
  var currentInterimText = '';
  var lastRecognizedSpeechText = '';
  var lastSpeechChangeTimestamp = 0;
  var SILENCE_TIMEOUT_MS = 1800;
  var voiceConversation = [];
  var orbState = 'idle'; // idle | listening | processing | speaking
  var orbT = 0;
  var noiseAudioStream = null;
  var currentUtterance = null;
  var speakSafetyTimer = null;

  // Recognition restart / error-recovery state
  var recRetryCount = 0;        // consecutive error count for backoff
  var recLastError = null;      // last error type string
  var recRestartLocked = false; // prevents double-restart race condition
  var recRetryTimer = null;     // pending setTimeout for restart
  var MAX_RETRY_DELAY_MS = 8000;

  // VAD (Voice Activity Detection) via AudioContext — audio amplitude based
  var vadAudioCtx = null;
  var vadAnalyser = null;
  var vadMicStream = null;
  var vadAnimId = null;
  var vadSpeechDetected = false;
  var VAD_NOISE_FLOOR = 4;
  var VAD_SPEECH_CONFIRM_MS = 150;
  var VAD_SILENCE_AFTER_SPEECH = 1800;
  var vadAboveFloorSince = 0;
  var vadBelowFloorSince = 0;
  var vadRunning = false;

  // DOM Elements
  var vcView, vcScrollArea, vcThread, vcOrbCanvas, vcOrbCtx;
  var vcCenterBubbleCanvas, vcCenterBubbleCtx;
  var vcStatusDot, vcStatusText, vcMuteBtn, vcTimer, vcSendNowBtn;

  // --------------------------------------------------------------------------
  // Open / Close Voice Chat Room
  // --------------------------------------------------------------------------
  function openVoiceChat() {
    if (isVoiceOpen) return;
    isVoiceOpen = true;

    vcView = document.getElementById('voice-chat-view');
    vcScrollArea = document.getElementById('voice-scroll-area');
    vcThread = document.getElementById('voice-messages-thread');
    vcOrbCanvas = document.getElementById('voice-orb-canvas');
    vcStatusDot = document.getElementById('voice-status-dot');
    vcStatusText = document.getElementById('voice-status-text');
    vcMuteBtn = document.getElementById('voice-mute-btn');
    vcTimer = document.getElementById('voice-session-timer');
    vcSendNowBtn = document.getElementById('voice-send-now-btn');
    if (vcSendNowBtn) vcSendNowBtn.style.display = 'none';

    if (!vcView) {
      isVoiceOpen = false;
      return;
    }

    // ── TRANSITION: Chat → Voice ──────────────────────────────────────────
    var mainView = document.querySelector('.main-view');
    var fi = document.querySelector('.floating-input-container');
    var islandWrapper = document.querySelector('.dynamic-island-wrapper');
    var _mainExitHandler = null;

    // 1. Briefly dim the chat area + slide island up simultaneously
    if (mainView) {
      mainView.classList.remove('chat-is-entering');
      mainView.classList.add('chat-is-exiting');

      // Auto-remove once animation ends (so it never stays stuck)
      _mainExitHandler = function () {
        mainView.removeEventListener('animationend', _mainExitHandler);
        mainView.classList.remove('chat-is-exiting');
      };
      mainView.addEventListener('animationend', _mainExitHandler);
    }
    // Slide island up out of view
    if (islandWrapper) islandWrapper.classList.add('island-voice-hidden');

    // 2. After blur-out settles (~320ms), reveal voice panel
    setTimeout(function () {
      // Force-clean chat-is-exiting regardless (voice panel z:30 covers it)
      if (mainView) {
        if (_mainExitHandler) mainView.removeEventListener('animationend', _mainExitHandler);
        mainView.classList.remove('chat-is-exiting');
      }

      if (fi) fi.style.display = 'none';

      // Show voice panel then immediately trigger enter animation
      vcView.style.display = 'flex';
      vcView.setAttribute('aria-hidden', 'false');
      vcView.classList.remove('is-exiting');
      void vcView.offsetWidth; // force reflow so browser sees display change before animation
      vcView.classList.add('is-entering');

      function onEnterDone() {
        vcView.removeEventListener('animationend', onEnterDone);
        vcView.classList.remove('is-entering');
      }
      vcView.addEventListener('animationend', onEnterDone);

    }, 320);
    // ─────────────────────────────────────────────────────────────────────

    // Reset thread & conversation log
    if (vcThread) vcThread.innerHTML = '';
    voiceConversation = [];
    sessionSeconds = 0;
    updateTimer();

    // Start session timer
    if (sessionTimerInterval) clearInterval(sessionTimerInterval);
    sessionTimerInterval = setInterval(function () {
      sessionSeconds++;
      updateTimer();
    }, 1000);

    // Initialize orb canvas animations
    if (vcOrbCanvas) {
      vcOrbCtx = vcOrbCanvas.getContext('2d');
    }
    vcCenterBubbleCanvas = document.getElementById('voice-center-bubble');
    if (vcCenterBubbleCanvas) {
      vcCenterBubbleCtx = vcCenterBubbleCanvas.getContext('2d');
      vcCenterBubbleCanvas.onclick = handleCenterBubbleClick;
      vcCenterBubbleCanvas.title = 'Klik untuk langsung kirim (atau mute jika hening)';
    }
    var clusterEl = document.getElementById('voice-bubble-cluster');
    if (clusterEl) {
      clusterEl.onclick = handleCenterBubbleClick;
    }
    if (vcOrbCanvas || vcCenterBubbleCanvas) {
      startOrbAnimation();
    }

    // Activate browser DSP hardware noise suppression + VAD stream
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true
        }
      }).then(function (stream) {
        noiseAudioStream = stream;
        startVAD(stream);
      }).catch(function (err) {
        console.warn('Microphone hardware noiseSuppression notice:', err);
      });
    }

    isCallActive = true;
    isMuted = false;
    isAgentSpeaking = true;
    setOrbState('speaking');
    setVoiceStatus('Menghubungkan...', 'dot-speaking');

    document.addEventListener('keydown', onEscClose);

    // Initial greeting from Neura (plays immediately after panel transition)
    setTimeout(function () {
      if (!isVoiceOpen) return;
      var greeting = 'Halo! Saya Neura. Sesi konsultasi suara telah aktif. Silakan mulai berbicara tentang gejala atau pertanyaan klinis Anda.';
      appendVoiceAIMessage(greeting);
      speakResponse(greeting);
    }, 380);
  }

  function handleCenterBubbleClick() {
    // If agent is speaking, clicking immediately stops TTS and listens to user
    if (isAgentSpeaking) {
      if (window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      isAgentSpeaking = false;
      setVoiceStatus('Mendengarkan...', 'dot-listening');
      setOrbState('listening');
      resumeListening();
      return;
    }

    var full = (accumulatedFinalText + ' ' + currentInterimText).trim();
    if (full.length > 0) {
      commitUserSpeech(full);
    } else {
      toggleVoiceMute();
    }
  }

  function closeVoiceChat() {
    if (!isVoiceOpen) return;
    isVoiceOpen = false;
    isCallActive = false;

    // Stop VAD
    stopVAD();

    // Clean up hardware noise suppression stream
    if (noiseAudioStream) {
      try {
        noiseAudioStream.getTracks().forEach(function (t) { t.stop(); });
      } catch (e) { }
      noiseAudioStream = null;
    }

    // Clean up timers & speech
    if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (recRetryTimer) { clearTimeout(recRetryTimer); recRetryTimer = null; }
    recRestartLocked = false;
    if (speechRec) {
      try { speechRec.onstart = null; speechRec.onresult = null;
            speechRec.onerror = null; speechRec.onend = null;
            speechRec.abort(); } catch (e) { }
      speechRec = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    document.removeEventListener('keydown', onEscClose);

    // Export summary to main chat session
    exportVoiceToChat();

    // ── TRANSITION: Voice → Chat ──────────────────────────────────────────
    var mainView = document.querySelector('.main-view');
    var fi = document.querySelector('.floating-input-container');

    if (vcView) {
      // 1. Play exit animation on voice panel
      vcView.classList.remove('is-entering');
      vcView.classList.add('is-exiting');

      function onExitDone() {
        vcView.removeEventListener('animationend', onExitDone);
        // 2. Hide voice panel completely
        vcView.style.display = 'none';
        vcView.setAttribute('aria-hidden', 'true');
        vcView.classList.remove('is-exiting');

        // 3. Restore main floating input
        if (fi) fi.style.display = '';

        // 4. Slide island back down
        var islandWrapperClose = document.querySelector('.dynamic-island-wrapper');
        if (islandWrapperClose) islandWrapperClose.classList.remove('island-voice-hidden');

        // 5. Bloom the chat back in
        if (mainView) {
          mainView.classList.remove('chat-is-exiting');
          mainView.classList.add('chat-is-entering');
          function onChatEnterDone() {
            mainView.removeEventListener('animationend', onChatEnterDone);
            mainView.classList.remove('chat-is-entering');
          }
          mainView.addEventListener('animationend', onChatEnterDone);
        }
      }
      vcView.addEventListener('animationend', onExitDone);

      // Safety fallback: if animationend never fires (hidden, reduced motion), clean up after 500ms
      setTimeout(function () {
        if (vcView && vcView.style.display !== 'none') {
          vcView.style.display = 'none';
          vcView.setAttribute('aria-hidden', 'true');
          vcView.classList.remove('is-exiting');
          if (fi) fi.style.display = '';
          var islandFallback = document.querySelector('.dynamic-island-wrapper');
          if (islandFallback) islandFallback.classList.remove('island-voice-hidden');
          if (mainView) {
            mainView.classList.remove('chat-is-exiting');
            mainView.classList.add('chat-is-entering');
          }
        }
      }, 550);
    } else {
      // Fallback if vcView was never set
      if (fi) fi.style.display = '';
    }
    // ─────────────────────────────────────────────────────────────────────
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeVoiceChat();
  }

  // --------------------------------------------------------------------------
  // Mute / Unmute
  // --------------------------------------------------------------------------
  function toggleVoiceMute() {
    isMuted = !isMuted;
    if (vcMuteBtn) {
      vcMuteBtn.classList.toggle('is-muted', isMuted);
      vcMuteBtn.title = isMuted ? 'Unmute mikrofon' : 'Mute mikrofon';
      vcMuteBtn.innerHTML = isMuted
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .74-.12 1.45-.34 2.12"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    }

    if (isMuted) {
      if (speechRec) { try { speechRec.abort(); } catch (e) { } speechRec = null; }
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
      vadSpeechDetected = false;
      vadAboveFloorSince = 0;
      vadBelowFloorSince = 0;
      removeLiveUserBubble();
      setVoiceStatus('Mikrofon dimatikan', '');
      setOrbState('idle');
    } else {
      setVoiceStatus('Mendengarkan...', 'dot-listening');
      setOrbState('listening');
      resumeListening();
    }
  }

  function updateTimer() {
    if (!vcTimer) return;
    var m = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    var s = String(sessionSeconds % 60).padStart(2, '0');
    vcTimer.textContent = m + ':' + s;
  }

  // --------------------------------------------------------------------------
  // Message Rendering (Identical to normal Neura chat)
  // --------------------------------------------------------------------------
  function appendVoiceAIMessage(text) {
    if (!vcThread) return;
    var d = new Date();
    var ts = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    var row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML =
      '<div class="assistant-header">' +
      '<img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display=\'none\'" />' +
      '<span class="assistant-name">Neura</span>' +
      '<span class="assistant-model-tag">&bull; Voice AI</span>' +
      '<span class="assistant-timestamp" style="font-size:11px;color:var(--text-muted);margin-left:auto;">' + ts + '</span>' +
      '</div>' +
      '<div class="assistant-prose fade-in">' +
      formatProse(text) +
      '</div>' +
      '<div class="msg-actions-row" style="display:flex;margin-top:6px;">' +
      '<button class="msg-action-btn" title="Dengarkan lagi" onclick="window._repeatVoiceMsg(this)">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>' +
      '<span>Dengarkan</span>' +
      '</button>' +
      '</div>';

    vcThread.appendChild(row);
    scrollToBottom();
    voiceConversation.push({ role: 'agent', text: text, ts: ts });
  }

  function appendVoiceUserBubble(text) {
    if (!vcThread) return;
    var d = new Date();
    var ts = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    var row = document.createElement('div');
    row.className = 'message-row user';
    row.innerHTML = '<div class="user-bubble">' + esc(text) + '</div>';

    vcThread.appendChild(row);
    scrollToBottom();
    voiceConversation.push({ role: 'user', text: text, ts: ts });
  }

  // --------------------------------------------------------------------------
  // Real-time Live Speech Bubble (Updated live as you speak)
  // --------------------------------------------------------------------------
  function updateLiveUserBubble(text) {
    if (!vcThread || !text) return;

    var liveRow = document.getElementById('voice-current-live-row');
    var liveBubble = document.getElementById('voice-current-live-bubble');

    if (!liveRow || !liveBubble) {
      liveRow = document.createElement('div');
      liveRow.className = 'message-row user voice-live-bubble-row';
      liveRow.id = 'voice-current-live-row';

      liveBubble = document.createElement('div');
      liveBubble.className = 'user-bubble voice-live-bubble';
      liveBubble.id = 'voice-current-live-bubble';

      liveRow.appendChild(liveBubble);
      vcThread.appendChild(liveRow);
    }

    liveBubble.textContent = text;
    scrollToBottom();
  }

  function finalizeLiveUserBubble(finalText) {
    var liveRow = document.getElementById('voice-current-live-row');
    var liveBubble = document.getElementById('voice-current-live-bubble');

    var text = (finalText || (liveBubble ? liveBubble.textContent : '')).trim();
    if (!text) {
      removeLiveUserBubble();
      return null;
    }

    var d = new Date();
    var ts = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    if (liveRow && liveBubble) {
      // Transition from live bubble to permanent chat bubble
      liveRow.className = 'message-row user';
      liveRow.removeAttribute('id');

      liveBubble.className = 'user-bubble';
      liveBubble.removeAttribute('id');
      liveBubble.textContent = text;
    } else {
      appendVoiceUserBubble(text);
    }

    voiceConversation.push({ role: 'user', text: text, ts: ts });
    scrollToBottom();
    return text;
  }

  function removeLiveUserBubble() {
    var liveRow = document.getElementById('voice-current-live-row');
    if (liveRow && liveRow.parentNode) {
      liveRow.parentNode.removeChild(liveRow);
    }
  }

  // --------------------------------------------------------------------------
  // Typing Indicator (Claude Loading Dots Animation)
  // --------------------------------------------------------------------------
  function showVoiceTyping() {
    removeVoiceTyping();
    if (!vcThread) return;

    var row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = 'voice-typing-indicator';
    row.innerHTML =
      '<div class="assistant-header">' +
      '<img src="/assets/neura_logo.jpg" alt="Neura" class="assistant-avatar-img" onerror="this.style.display=\'none\'" />' +
      '<span class="assistant-name">Neura</span>' +
      '<span class="assistant-model-tag">&bull; Voice AI</span>' +
      '</div>' +
      '<div class="claude-loading-row">' +
      '<div class="claude-loading-sparkle" title="Neura sedang berpikir...">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">' +
      '<path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z"/>' +
      '</svg>' +
      '</div>' +
      '<div class="claude-loading-dots">' +
      '<span class="claude-typing-dot"></span>' +
      '<span class="claude-typing-dot"></span>' +
      '<span class="claude-typing-dot"></span>' +
      '</div>' +
      '</div>';

    vcThread.appendChild(row);
    scrollToBottom();
  }

  function removeVoiceTyping() {
    var el = document.getElementById('voice-typing-indicator');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  function scrollToBottom() {
    if (vcScrollArea) {
      vcScrollArea.scrollTop = vcScrollArea.scrollHeight;
    } else if (vcThread) {
      vcThread.scrollTop = vcThread.scrollHeight;
    }
  }

  function formatProse(text) {
    var escaped = esc(text)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    return '<p>' + escaped + '</p>';
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setVoiceStatus(text, dotClass) {
    if (vcStatusText) vcStatusText.textContent = text;
    if (vcStatusDot) {
      vcStatusDot.className = '';
      if (dotClass) vcStatusDot.classList.add(dotClass);
    }
  }

  // --------------------------------------------------------------------------
  // Web Speech Recognition & Turn Taking
  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // VAD — AudioContext amplitude-based Voice Activity Detection
  // --------------------------------------------------------------------------
  function startVAD(stream) {
    if (vadRunning) return;
    try {
      vadAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (vadAudioCtx.state === 'suspended') {
        vadAudioCtx.resume().catch(function () {});
      }
      vadAnalyser = vadAudioCtx.createAnalyser();
      vadAnalyser.fftSize = 512;
      vadAnalyser.smoothingTimeConstant = 0.6;
      vadMicStream = vadAudioCtx.createMediaStreamSource(stream);
      vadMicStream.connect(vadAnalyser);
      vadRunning = true;
      vadSpeechDetected = false;
      vadAboveFloorSince = 0;
      vadBelowFloorSince = 0;
      runVADLoop();
    } catch (e) {
      console.warn('VAD init notice, falling back to text-based silence:', e);
    }
  }

  function stopVAD() {
    vadRunning = false;
    if (vadAnimId) { cancelAnimationFrame(vadAnimId); vadAnimId = null; }
    if (vadMicStream) { try { vadMicStream.disconnect(); } catch (e) { } vadMicStream = null; }
    if (vadAudioCtx) { try { vadAudioCtx.close(); } catch (e) { } vadAudioCtx = null; }
    vadAnalyser = null;
    vadSpeechDetected = false;
  }

  function getVADRMS() {
    if (!vadAnalyser) return 0;
    var buf = new Uint8Array(vadAnalyser.frequencyBinCount);
    vadAnalyser.getByteTimeDomainData(buf);
    var sum = 0;
    for (var i = 0; i < buf.length; i++) {
      var v = (buf[i] - 128);
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  function runVADLoop() {
    if (!vadRunning) return;
    var rms = getVADRMS();
    var now = Date.now();
    var hasText = (accumulatedFinalText + currentInterimText).trim().length > 0;

    if (rms >= VAD_NOISE_FLOOR || hasText) {
      // User is making sound above noise floor or text was recognized
      vadBelowFloorSince = 0;
      if (vadAboveFloorSince === 0) vadAboveFloorSince = now;

      if (!vadSpeechDetected) {
        vadSpeechDetected = true;
      }
    } else {
      // Below noise floor (silence)
      vadAboveFloorSince = 0;
      if (vadBelowFloorSince === 0) vadBelowFloorSince = now;

      // If we confirmed real speech AND now silent for long enough => commit!
      if (vadSpeechDetected && hasText && !isAgentSpeaking && !isMuted && isCallActive) {
        var silentFor = now - vadBelowFloorSince;
        if (silentFor >= VAD_SILENCE_AFTER_SPEECH) {
          vadSpeechDetected = false;
          vadBelowFloorSince = 0;
          triggerCommitTurn();
          vadAnimId = requestAnimationFrame(runVADLoop);
          return;
        }
      }

      // Reset if silence is very long with no text
      if (!hasText) {
        vadSpeechDetected = false;
        vadAboveFloorSince = 0;
      }
    }

    vadAnimId = requestAnimationFrame(runVADLoop);
  }

  // --------------------------------------------------------------------------
  // Speech Recognition
  // --------------------------------------------------------------------------
  function resumeListening() {
    if (!isCallActive || isAgentSpeaking || isMuted) return;
    accumulatedFinalText = '';
    currentInterimText = '';
    lastRecognizedSpeechText = '';
    lastSpeechChangeTimestamp = 0;
    vadSpeechDetected = false;
    vadAboveFloorSince = 0;
    vadBelowFloorSince = 0;
    recRetryCount = 0;
    recLastError = null;
    recRestartLocked = false;
    if (recRetryTimer) { clearTimeout(recRetryTimer); recRetryTimer = null; }
    if (vcSendNowBtn) vcSendNowBtn.style.display = 'none';
    startRecognitionTurn();
  }

  // Calculates exponential backoff delay capped at MAX_RETRY_DELAY_MS
  function getBackoffDelay() {
    var delay = Math.min(300 * Math.pow(2, recRetryCount), MAX_RETRY_DELAY_MS);
    return delay;
  }

  // Safely schedule a restart, preventing double-invocation
  function scheduleRestart(delayMs) {
    if (recRestartLocked) return;
    if (!isCallActive || isAgentSpeaking || isMuted) return;
    recRestartLocked = true;
    if (recRetryTimer) clearTimeout(recRetryTimer);
    recRetryTimer = setTimeout(function () {
      recRestartLocked = false;
      recRetryTimer = null;
      if (isCallActive && !isAgentSpeaking && !isMuted) {
        startRecognitionTurn();
      }
    }, delayMs);
  }

  function startRecognitionTurn() {
    if (!isCallActive || isAgentSpeaking || isMuted) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      appendVoiceAIMessage('Browser ini tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau Microsoft Edge untuk konsultasi suara.');
      return;
    }

    // Tear down previous instance cleanly
    if (speechRec) {
      try { speechRec.onstart = null; speechRec.onresult = null;
            speechRec.onerror = null; speechRec.onend = null;
            speechRec.abort(); } catch (e) { }
      speechRec = null;
    }

    recLastError = null;

    var rec = new SR();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    speechRec = rec;

    rec.onstart = function () {
      if (!isCallActive || isAgentSpeaking || isMuted) return;
      recRetryCount = 0;   // successful start — reset backoff
      recLastError = null;
      setVoiceStatus('Mendengarkan...', 'dot-listening');
      setOrbState('listening');
    };

    rec.onresult = function (event) {
      if (isAgentSpeaking || isMuted || !isCallActive) return;

      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var r = event.results[i];
        if (r.isFinal) {
          var conf = r[0].confidence || 0;
          var transcript = r[0].transcript.trim();
          if (transcript.length > 0 && (conf === 0 || conf >= 0.25)) {
            accumulatedFinalText += ' ' + transcript;
          }
        } else {
          interim += ' ' + r[0].transcript;
        }
      }

      currentInterimText = interim;
      var combined = (accumulatedFinalText + ' ' + currentInterimText).trim();

      if (combined.length > 0 && combined !== lastRecognizedSpeechText) {
        lastRecognizedSpeechText = combined;
        lastSpeechChangeTimestamp = Date.now();
        vadSpeechDetected = true;
        updateLiveUserBubble(combined);
        if (vcSendNowBtn) vcSendNowBtn.style.display = 'inline-flex';
        setVoiceStatus('Mendengarkan perkataan Anda...', 'dot-listening');
        resetSilenceTimer();
      }
    };

    rec.onerror = function (e) {
      if (!isCallActive) return;
      recLastError = e.error;

      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        // Fatal — user must re-grant mic permission
        setVoiceStatus('Izin mikrofon ditolak — klik ikon gembok di browser', '');
        setOrbState('idle');
        return;
      }

      if (e.error === 'audio-capture') {
        setVoiceStatus('Mikrofon tidak terdeteksi atau sedang dipakai aplikasi lain', '');
        setOrbState('idle');
        return;
      }

      if (e.error === 'no-speech') {
        recLastError = 'no-speech';
        return;
      }

      if (e.error === 'network' || e.error === 'aborted') {
        recRetryCount++;
        var delay = getBackoffDelay();
        if (e.error === 'network') {
          if (recRetryCount <= 2) {
            setVoiceStatus('Mencoba ulang koneksi suara...', 'dot-listening');
          } else {
            setVoiceStatus('Koneksi Speech API tidak stabil — mencoba ulang', '');
          }
        }
        recRestartLocked = true;
        if (recRetryTimer) clearTimeout(recRetryTimer);
        recRetryTimer = setTimeout(function () {
          recRestartLocked = false;
          recRetryTimer = null;
          if (isCallActive && !isAgentSpeaking && !isMuted) startRecognitionTurn();
        }, delay);
        return;
      }

      // Unknown error — light backoff
      recRetryCount++;
    };

    rec.onend = function () {
      if (!isCallActive) return;

      // Fatal errors — do not restart
      if (recLastError === 'not-allowed' || recLastError === 'service-not-allowed') return;

      var text = (accumulatedFinalText + ' ' + currentInterimText).trim();

      if (text && text.length >= 2 && !isAgentSpeaking) {
        commitUserSpeech(text);
        return;
      }

      // If a restart is already scheduled (from onerror backoff) — do nothing
      if (recRestartLocked || recRetryTimer) return;

      if (isAgentSpeaking || isMuted) return;

      // Benign end (no-speech timeout or normal end): restart with tiny delay
      var restartDelay = (recLastError === 'no-speech') ? 150 : 250;
      scheduleRestart(restartDelay);
    };

    try {
      rec.start();
    } catch (e) {
      scheduleRestart(350);
    }
  }

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(function () {
      silenceTimer = null;
      triggerCommitTurn();
    }, SILENCE_TIMEOUT_MS);
  }

  function triggerCommitTurn() {
    if (!isCallActive || isAgentSpeaking) return;
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    var full = (accumulatedFinalText + ' ' + currentInterimText).trim();
    if (full && full.length >= 2) {
      commitUserSpeech(full);
    } else {
      // Nothing meaningful to send — just reset VAD and keep listening
      accumulatedFinalText = '';
      currentInterimText = '';
      lastRecognizedSpeechText = '';
      lastSpeechChangeTimestamp = 0;
      vadSpeechDetected = false;
      removeLiveUserBubble();
    }
  }

  function commitUserSpeech(text) {
    if (!text || !text.trim()) return;
    var query = text.trim();

    accumulatedFinalText = '';
    currentInterimText = '';
    lastRecognizedSpeechText = '';
    lastSpeechChangeTimestamp = 0;

    if (vcSendNowBtn) vcSendNowBtn.style.display = 'none';
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (speechRec) { try { speechRec.abort(); } catch (e) { } }

    // Finalize live bubble into standard bubble
    finalizeLiveUserBubble(query);

    isAgentSpeaking = true;
    showVoiceTyping();
    setVoiceStatus('Menganalisa jawaban klinis...', 'dot-processing');
    setOrbState('processing');

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        removeVoiceTyping();
        var reply = data.reply || 'Saya telah mencatat pertanyaan Anda. Silakan lanjutkan.';
        appendVoiceAIMessage(reply);
        speakResponse(reply);
      })
      .catch(function () {
        removeVoiceTyping();
        var fallback = 'Maaf, terjadi gangguan pada koneksi analisis. Silakan ulangi pertanyaan Anda.';
        appendVoiceAIMessage(fallback);
        speakResponse(fallback);
      });
  }

  // --------------------------------------------------------------------------
  // Speech Synthesis
  // --------------------------------------------------------------------------
  function speakResponse(text) {
    if (speakSafetyTimer) {
      clearTimeout(speakSafetyTimer);
      speakSafetyTimer = null;
    }

    if (!window.speechSynthesis) {
      isAgentSpeaking = false;
      resumeListening();
      return;
    }

    isAgentSpeaking = true;
    setVoiceStatus('Neura sedang berbicara...', 'dot-speaking');
    setOrbState('speaking');

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    // Clean formatting chars for clean TTS pronunciation
    var clean = (text || '').replace(/[*_#`]/g, '').replace(/<[^>]+>/g, '').trim();
    if (!clean) {
      isAgentSpeaking = false;
      resumeListening();
      return;
    }

    var utter = new SpeechSynthesisUtterance(clean);
    currentUtterance = utter; // Keep reference to prevent Chrome GC
    utter.lang = 'id-ID';
    utter.rate = 1.0;
    utter.pitch = 1.02;

    var voices = window.speechSynthesis.getVoices();
    var idV = voices.find(function (v) {
      return (v.lang && (v.lang.includes('id') || v.lang.includes('ID'))) ||
        (v.name && v.name.toLowerCase().includes('indonesia'));
    });
    if (idV) utter.voice = idV;

    var finished = false;
    function finishSpeaking() {
      if (finished) return;
      finished = true;
      if (speakSafetyTimer) {
        clearTimeout(speakSafetyTimer);
        speakSafetyTimer = null;
      }
      currentUtterance = null;
      isAgentSpeaking = false;
      if (isCallActive && !isMuted) {
        setVoiceStatus('Mendengarkan...', 'dot-listening');
        setOrbState('listening');
        resumeListening();
      }
    }

    utter.onend = finishSpeaking;
    utter.onerror = finishSpeaking;

    // Safety timeout: Chrome TTS can stall or fail without firing onend/onerror
    var estimatedMs = Math.max(3000, Math.min(22000, (clean.length / 10) * 1000 + 2500));
    speakSafetyTimer = setTimeout(function () {
      finishSpeaking();
    }, estimatedMs);

    setTimeout(function () {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utter);
      } catch (err) {
        console.warn('SpeechSynthesis speak error:', err);
        finishSpeaking();
      }
    }, 50);
  }

  window._repeatVoiceMsg = function (btn) {
    var prose = btn.closest('.message-row') && btn.closest('.message-row').querySelector('.assistant-prose');
    if (prose) {
      speakResponse(prose.textContent);
    }
  };

  // --------------------------------------------------------------------------
  // Export Voice Conversation to Main Chat Session
  // --------------------------------------------------------------------------
  function exportVoiceToChat() {
    if (voiceConversation.length === 0) return;
    var dur = formatDur(sessionSeconds);
    var lines = voiceConversation.map(function (m) {
      return (m.role === 'user' ? '**🎙️ Anda (' + m.ts + '):** ' : '**✦ Neura (' + m.ts + '):** ') + m.text;
    });
    var summary = '🎙️ **Voice Session (' + dur + ')**\n\n' + lines.join('\n\n');
    if (typeof window.appendVoiceSessionToChat === 'function') {
      window.appendVoiceSessionToChat(summary);
    }
  }

  function formatDur(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? m + 'm ' + sec + 's' : sec + 's';
  }

  // --------------------------------------------------------------------------
  // Orb Canvas Graphic
  // --------------------------------------------------------------------------
  function setOrbState(state) {
    orbState = state;
    if (vcOrbCanvas) vcOrbCanvas.className = 'orb-' + state;
    if (vcCenterBubbleCanvas) vcCenterBubbleCanvas.className = 'center-bubble-' + state;
    var cluster = document.getElementById('voice-bubble-cluster');
    if (cluster) cluster.className = 'voice-bubble-cluster orb-' + state;
    var voiceView = document.getElementById('voice-chat-view');
    if (voiceView) {
      voiceView.classList.toggle('is-speaking', state === 'speaking');
      voiceView.classList.toggle('is-listening', state === 'listening');
      voiceView.classList.toggle('is-processing', state === 'processing');
    }
  }

  function startOrbAnimation() {
    if (animFrameId) cancelAnimationFrame(animFrameId);

    function draw() {
      orbT += 0.02;

      // 1. Draw Mini Top Orb (if present)
      if (vcOrbCtx && vcOrbCanvas) {
        var W = vcOrbCanvas.width;
        var H = vcOrbCanvas.height;
        var cx = W / 2;
        var cy = H / 2;

        vcOrbCtx.clearRect(0, 0, W, H);

        var szMap = { idle: 1, listening: 1.05, speaking: 1.15, processing: 1.02 };
        var base = (W * 0.38) * (szMap[orbState] || 1);
        var wave = orbState === 'speaking' ? Math.sin(orbT * 3.5) * 3 : Math.sin(orbT * 1.5) * 1.5;
        var r = base + wave;

        // Outer glow
        var haloR = r * 1.4;
        var hg = vcOrbCtx.createRadialGradient(cx, cy, r * 0.5, cx, cy, haloR);
        hg.addColorStop(0, 'rgba(217,119,87,0.3)');
        hg.addColorStop(0.6, 'rgba(217,100,60,0.12)');
        hg.addColorStop(1, 'rgba(217,119,87,0)');
        vcOrbCtx.beginPath();
        vcOrbCtx.arc(cx, cy, haloR, 0, Math.PI * 2);
        vcOrbCtx.fillStyle = hg;
        vcOrbCtx.fill();

        // Core sphere
        var og = vcOrbCtx.createRadialGradient(cx - r * 0.18, cy - r * 0.2, r * 0.02, cx, cy, r);
        og.addColorStop(0, '#d97757');
        og.addColorStop(0.35, '#c96040');
        og.addColorStop(0.65, '#e88c50');
        og.addColorStop(0.9, 'rgba(235,170,110,0.75)');
        og.addColorStop(1, 'rgba(250,200,160,0.05)');

        vcOrbCtx.save();
        vcOrbCtx.beginPath();
        vcOrbCtx.arc(cx, cy, r, 0, Math.PI * 2);
        vcOrbCtx.fillStyle = og;
        vcOrbCtx.shadowColor = '#d97757';
        vcOrbCtx.shadowBlur = orbState === 'speaking' ? 20 : 10;
        vcOrbCtx.fill();
        vcOrbCtx.restore();

        // Top gloss highlight
        var gg = vcOrbCtx.createRadialGradient(cx - r * 0.25, cy - r * 0.28, 0, cx - r * 0.25, cy - r * 0.28, r * 0.5);
        gg.addColorStop(0, 'rgba(255,255,255,0.32)');
        gg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        gg.addColorStop(1, 'rgba(255,255,255,0)');
        vcOrbCtx.beginPath();
        vcOrbCtx.arc(cx, cy, r, 0, Math.PI * 2);
        vcOrbCtx.fillStyle = gg;
        vcOrbCtx.fill();
      }

      // 2. Draw Center Floating Sky-Blue / Cloud Bubble (matching screenshot)
      drawCenterBubble();

      animFrameId = requestAnimationFrame(draw);
    }

    draw();
  }

  function drawCenterBubble() {
    if (!vcCenterBubbleCtx || !vcCenterBubbleCanvas) return;
    if (vcCenterBubbleCanvas.style.display === 'none' || vcCenterBubbleCanvas.width <= 4) return;
    var ctx = vcCenterBubbleCtx;
    var W = vcCenterBubbleCanvas.width;
    var H = vcCenterBubbleCanvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var r = (W / 2) - 2;
    if (r <= 0) return;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    // 1. Deep Sky Blue Backdrop Gradient
    var skyGrad = ctx.createLinearGradient(cx, 0, cx, H);
    skyGrad.addColorStop(0.0, '#1d5fe8');
    skyGrad.addColorStop(0.35, '#2563eb');
    skyGrad.addColorStop(0.7, '#3b82f6');
    skyGrad.addColorStop(1.0, '#60a5fa');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Wave animation rate based on state
    var speedMul = (orbState === 'speaking' ? 2.6 : (orbState === 'processing' ? 2.0 : 1.0));
    var t = orbT * speedMul;

    // 2. Soft billowing white cloud mass in lower half (matching screenshot)
    // Cloud swell 1 (center billowing up)
    var c1x = cx + Math.sin(t * 1.3) * (r * 0.16);
    var c1y = cy + (r * 0.35) + Math.cos(t * 1.0) * (r * 0.08);
    var g1 = ctx.createRadialGradient(c1x, c1y, 0, c1x, c1y, r * 0.85);
    g1.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    g1.addColorStop(0.38, 'rgba(255, 255, 255, 0.92)');
    g1.addColorStop(0.68, 'rgba(235, 245, 255, 0.55)');
    g1.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // Cloud swell 2 (left flank)
    var c2x = cx - (r * 0.35) + Math.cos(t * 0.9) * (r * 0.12);
    var c2y = cy + (r * 0.42) + Math.sin(t * 1.2) * (r * 0.08);
    var g2 = ctx.createRadialGradient(c2x, c2y, 0, c2x, c2y, r * 0.78);
    g2.addColorStop(0.0, 'rgba(255, 255, 255, 0.96)');
    g2.addColorStop(0.42, 'rgba(245, 250, 255, 0.78)');
    g2.addColorStop(0.75, 'rgba(210, 235, 255, 0.35)');
    g2.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // Cloud swell 3 (right flank)
    var c3x = cx + (r * 0.32) - Math.sin(t * 1.05) * (r * 0.12);
    var c3y = cy + (r * 0.38) + Math.cos(t * 1.4) * (r * 0.07);
    var g3 = ctx.createRadialGradient(c3x, c3y, 0, c3x, c3y, r * 0.72);
    g3.addColorStop(0.0, 'rgba(255, 255, 255, 0.94)');
    g3.addColorStop(0.42, 'rgba(240, 248, 255, 0.70)');
    g3.addColorStop(0.78, 'rgba(200, 230, 255, 0.25)');
    g3.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, W, H);

    // 3. Subtle ambient top gloss
    var topGlow = ctx.createRadialGradient(cx, cy - r * 0.5, 0, cx, cy - r * 0.5, r * 0.6);
    topGlow.addColorStop(0.0, 'rgba(255, 255, 255, 0.35)');
    topGlow.addColorStop(0.65, 'rgba(255, 255, 255, 0.06)');
    topGlow.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = topGlow;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.5, r * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Subtle spherical rim stroke
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --------------------------------------------------------------------------
  // Expose Globals
  // --------------------------------------------------------------------------
  window.openVoiceChat = openVoiceChat;
  window.closeVoiceChat = closeVoiceChat;
  window.toggleVoiceMute = toggleVoiceMute;
  window.handleCenterBubbleClick = handleCenterBubbleClick;
  window.openVoiceConsultation = openVoiceChat;
  window.closeVoiceConsultation = closeVoiceChat;
  window.commitVoiceSpeechNow = function () {
    var full = (accumulatedFinalText + ' ' + currentInterimText).trim();
    if (full.length > 0) {
      commitUserSpeech(full);
    } else {
      var liveBubble = document.getElementById('voice-current-live-bubble');
      if (liveBubble && liveBubble.textContent.trim()) {
        commitUserSpeech(liveBubble.textContent.trim());
      }
    }
  };

  // --------------------------------------------------------------------------
  // Startup Cleanup — strip any stuck transition classes on page load/refresh
  // --------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    var mainView = document.querySelector('.main-view');
    if (mainView) {
      mainView.classList.remove('chat-is-exiting', 'chat-is-entering');
    }

    // Ensure island is always visible on page load
    var islandWrapper = document.querySelector('.dynamic-island-wrapper');
    if (islandWrapper) islandWrapper.classList.remove('island-voice-hidden');

    var voiceView = document.getElementById('voice-chat-view');
    if (voiceView) {
      voiceView.classList.remove('is-entering', 'is-exiting');
      // Ensure voice panel is hidden and chat input is visible on load
      if (!isVoiceOpen) {
        voiceView.style.display = 'none';
        voiceView.setAttribute('aria-hidden', 'true');
        var fi = document.querySelector('.floating-input-container');
        if (fi) fi.style.removeProperty('display');
      }
    }
  });

})();
