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
  var SILENCE_TIMEOUT_MS = 850;
  var voiceConversation = [];
  var orbState = 'idle'; // idle | listening | processing | speaking
  var orbT = 0;

  // DOM Elements
  var vcView, vcScrollArea, vcThread, vcOrbCanvas, vcOrbCtx;
  var vcCenterBubbleCanvas, vcCenterBubbleCtx;
  var vcStatusDot, vcStatusText, vcMuteBtn, vcTimer;

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

    if (!vcView) {
      isVoiceOpen = false;
      return;
    }

    // Hide main floating input container while in voice room
    var fi = document.querySelector('.floating-input-container');
    if (fi) fi.style.display = 'none';

    // Show voice chat view
    vcView.style.display = 'flex';
    vcView.setAttribute('aria-hidden', 'false');

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
      vcCenterBubbleCanvas.onclick = toggleVoiceMute;
    }
    if (vcOrbCanvas || vcCenterBubbleCanvas) {
      startOrbAnimation();
    }

    isCallActive = true;
    isMuted = false;
    isAgentSpeaking = false;
    setOrbState('listening');
    setVoiceStatus('Menghubungkan...', 'dot-listening');

    document.addEventListener('keydown', onEscClose);

    // Initial greeting from Neura
    setTimeout(function () {
      if (!isVoiceOpen) return;
      var greeting = 'Halo! Saya Neura. Sesi konsultasi suara telah aktif. Silakan mulai berbicara tentang gejala atau pertanyaan klinis Anda.';
      appendVoiceAIMessage(greeting);
      speakResponse(greeting);
    }, 500);
  }

  function closeVoiceChat() {
    if (!isVoiceOpen) return;
    isVoiceOpen = false;
    isCallActive = false;

    // Clean up timers & speech
    if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (speechRec) { try { speechRec.abort(); } catch (e) { } speechRec = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    document.removeEventListener('keydown', onEscClose);

    // Export summary to main chat session
    exportVoiceToChat();

    // Hide voice panel
    if (vcView) {
      vcView.style.display = 'none';
      vcView.setAttribute('aria-hidden', 'true');
    }

    // Restore main floating input
    var fi = document.querySelector('.floating-input-container');
    if (fi) fi.style.display = '';
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
      if (speechRec) { try { speechRec.abort(); } catch (e) { } }
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
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
  function resumeListening() {
    if (!isCallActive || isAgentSpeaking || isMuted) return;
    accumulatedFinalText = '';
    currentInterimText = '';
    startRecognitionTurn();
  }

  function startRecognitionTurn() {
    if (!isCallActive || isAgentSpeaking || isMuted) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      appendVoiceAIMessage('Browser ini tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau Microsoft Edge untuk konsultasi suara.');
      return;
    }

    if (speechRec) {
      try { speechRec.abort(); } catch (e) { }
    }

    accumulatedFinalText = '';
    currentInterimText = '';

    speechRec = new SR();
    speechRec.lang = 'id-ID';
    speechRec.continuous = true;
    speechRec.interimResults = true;

    speechRec.onstart = function () {
      if (isCallActive && !isAgentSpeaking && !isMuted) {
        setVoiceStatus('Mendengarkan...', 'dot-listening');
        setOrbState('listening');
      }
    };

    speechRec.onresult = function (event) {
      if (isAgentSpeaking || isMuted) return;

      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var res = event.results[i];
        if (res.isFinal) {
          accumulatedFinalText += ' ' + res[0].transcript;
        } else {
          interim += ' ' + res[0].transcript;
        }
      }

      currentInterimText = interim;
      var combined = (accumulatedFinalText + ' ' + currentInterimText).trim();

      if (combined.length > 0) {
        // Real-time live bubble update!
        updateLiveUserBubble(combined);
        setVoiceStatus('Mendengarkan perkataan Anda...', 'dot-listening');
        resetSilenceTimer();
      }
    };

    speechRec.onerror = function (e) {
      if (!isCallActive) return;
      if (e.error === 'not-allowed') {
        setVoiceStatus('Izin mikrofon ditolak', '');
      } else if (e.error === 'network') {
        setVoiceStatus('Koneksi suara terputus', '');
      }
    };

    speechRec.onend = function () {
      var text = (accumulatedFinalText + ' ' + currentInterimText).trim();
      if (text && isCallActive && !isAgentSpeaking) {
        commitUserSpeech(text);
      } else if (isCallActive && !isAgentSpeaking && !isMuted) {
        try { speechRec.start(); } catch (e) { }
      }
    };

    try {
      speechRec.start();
    } catch (e) { }
  }

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(function () {
      triggerCommitTurn();
    }, SILENCE_TIMEOUT_MS);
  }

  function triggerCommitTurn() {
    if (!isCallActive || isAgentSpeaking) return;
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    var full = (accumulatedFinalText + ' ' + currentInterimText).trim();
    if (full) {
      commitUserSpeech(full);
    }
  }

  function commitUserSpeech(text) {
    if (!text || !text.trim()) return;
    var query = text.trim();

    accumulatedFinalText = '';
    currentInterimText = '';

    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
    if (speechRec) { try { speechRec.abort(); } catch (e) { } }

    // Finalize live bubble into standard bubble
    finalizeLiveUserBubble(query);

    isAgentSpeaking = true;
    showVoiceTyping();
    setVoiceStatus('Menganalisa...', 'dot-processing');
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
    if (!window.speechSynthesis) {
      isAgentSpeaking = false;
      resumeListening();
      return;
    }

    isAgentSpeaking = true;
    setVoiceStatus('Neura sedang berbicara...', 'dot-speaking');
    setOrbState('speaking');
    window.speechSynthesis.cancel();

    // Clean formatting chars for clean TTS pronunciation
    var clean = text.replace(/[*_#`]/g, '').replace(/<[^>]+>/g, '').trim();
    var utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'id-ID';
    utter.rate = 1.0;
    utter.pitch = 1.02;

    var voices = window.speechSynthesis.getVoices();
    var idV = voices.find(function (v) {
      return (v.lang && (v.lang.includes('id') || v.lang.includes('ID'))) ||
        (v.name && v.name.toLowerCase().includes('indonesia'));
    });
    if (idV) utter.voice = idV;

    function finishSpeaking() {
      isAgentSpeaking = false;
      if (isCallActive && !isMuted) {
        setVoiceStatus('Mendengarkan...', 'dot-listening');
        setOrbState('listening');
        resumeListening();
      }
    }

    utter.onend = finishSpeaking;
    utter.onerror = finishSpeaking;

    window.speechSynthesis.speak(utter);
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
    var summary = '---\n🎙️ **Voice Session (' + dur + ')**\n\n' + lines.join('\n\n') + '\n\n---';
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
    var ctx = vcCenterBubbleCtx;
    var W = vcCenterBubbleCanvas.width;
    var H = vcCenterBubbleCanvas.height;
    var cx = W / 2;
    var cy = H / 2;
    var r = (W / 2) - 2;

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
  window.openVoiceConsultation = openVoiceChat;
  window.closeVoiceConsultation = closeVoiceChat;

})();
