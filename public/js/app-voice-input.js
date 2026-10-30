/**
 * public/js/app-voice-input.js
 * ============================
 * Speech-to-Text Voice Dictation using Web Speech API (id-ID).
 * Provides microphone input into the main chat textarea with anti-noise filtering.
 */

let lastVoiceBtnClick = 0;
let chatVoiceShouldKeepListening = false;
let chatVoiceRestartAttempts = 0;
let chatVoiceInactivityTimer = null;
let lastChatVoiceText = '';
let lastChatVoiceChangeTime = 0;
const CHAT_VOICE_SILENCE_TIMEOUT_MS = 1100; // Auto-commits 1.1s after speech finishes

function handleSendClick() {
  const now = Date.now();
  if (now - lastVoiceBtnClick < 300) return; // Debounce rapid accidental double-clicks
  lastVoiceBtnClick = now;

  if (window.isTyping) {
    window.stopRequested = true;
    return;
  }

  if (window.isChatVoiceListening) {
    stopChatVoiceInput(true);
    return;
  }

  const input = document.getElementById('chat-input-textarea');
  const hasText = input && input.value.trim().length > 0;

  if (hasText) {
    if (typeof sendUserMessage === 'function') {
      sendUserMessage();
    }
  } else {
    startChatVoiceInput();
  }
}

function startChatVoiceInput() {
  if (window.isTyping) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (typeof showToast === 'function') {
      showToast('Browser ini tidak mendukung Web Speech API. Silakan gunakan Google Chrome atau Microsoft Edge.', 'error');
    }
    return;
  }

  chatVoiceShouldKeepListening = true;
  window.isChatVoiceListening = true;
  chatVoiceRestartAttempts = 0;
  window.chatVoiceAccumulatedText = '';
  lastChatVoiceText = '';
  lastChatVoiceChangeTime = 0;

  const input = document.getElementById('chat-input-textarea');
  const banner = document.getElementById('chat-voice-status-banner');
  const statusText = document.getElementById('chat-voice-status-text');

  if (banner) banner.style.display = 'flex';
  if (statusText) statusText.textContent = 'Mendengarkan suara... Silakan mulai berbicara';

  if (typeof updateSendBtnState === 'function') {
    updateSendBtnState();
  }

  // Inactivity timeout: stop after 20 seconds if user never speaks
  if (chatVoiceInactivityTimer) clearTimeout(chatVoiceInactivityTimer);
  chatVoiceInactivityTimer = setTimeout(function () {
    if (window.isChatVoiceListening && (!input || !input.value.trim())) {
      stopChatVoiceInput(false);
      if (typeof showToast === 'function') {
        showToast('Waktu bicara selesai (tidak ada suara terdeteksi).', 'info');
      }
    }
  }, 20000);

  function createAndStartRecognizer() {
    if (!chatVoiceShouldKeepListening) return;

    if (window.chatSpeechRec) {
      try { window.chatSpeechRec.abort(); } catch (e) { }
      window.chatSpeechRec = null;
    }

    try {
      window.chatSpeechRec = new SR();
      window.chatSpeechRec.lang = 'id-ID';
      window.chatSpeechRec.continuous = true;
      window.chatSpeechRec.interimResults = true;

      window.chatSpeechRec.onstart = function () {
        if (window.isChatVoiceListening && statusText && !input.value.trim()) {
          statusText.textContent = 'Mendengarkan... Silakan mulai berbicara';
        }
      };

      window.chatSpeechRec.onresult = function (event) {
        if (!window.isChatVoiceListening) return;

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
          window.chatVoiceAccumulatedText = (window.chatVoiceAccumulatedText + ' ' + final).trim();
        }

        const currentText = (window.chatVoiceAccumulatedText + ' ' + interim).trim();

        if (currentText) {
          const now = Date.now();

          // ANTI-FAN / BACKGROUND NOISE FILTER:
          // Only reset the silence timer if real NEW speech words were added!
          if (currentText !== lastChatVoiceText) {
            lastChatVoiceText = currentText;
            lastChatVoiceChangeTime = now;

            if (input) {
              input.value = currentText;
              if (typeof handleTextareaInput === 'function') handleTextareaInput(input);
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
            if (window.chatVoiceSilenceTimer) clearTimeout(window.chatVoiceSilenceTimer);
            window.chatVoiceSilenceTimer = setTimeout(function () {
              if (window.isChatVoiceListening && input && input.value.trim().length > 0) {
                stopChatVoiceInput(true);
              }
            }, CHAT_VOICE_SILENCE_TIMEOUT_MS);
          } else {
            // Text unchanged (ambient fan noise repeating same transcript)
            if (lastChatVoiceChangeTime > 0 && (now - lastChatVoiceChangeTime >= CHAT_VOICE_SILENCE_TIMEOUT_MS)) {
              if (window.isChatVoiceListening && input && input.value.trim().length > 0) {
                stopChatVoiceInput(true);
              }
            }
          }
        }
      };

      window.chatSpeechRec.onerror = function (e) {
        console.warn('SpeechRecognition status:', e.error);
        if (e.error === 'not-allowed') {
          if (typeof showToast === 'function') {
            showToast('Izin mikrofon ditolak oleh browser. Klik ikon gembok di address bar untuk mengizinkan.', 'error');
          }
          cancelChatVoiceInput();
        } else if (e.error === 'audio-capture') {
          if (typeof showToast === 'function') {
            showToast('Mikrofon tidak terdeteksi atau sedang dipakai aplikasi lain.', 'error');
          }
          cancelChatVoiceInput();
        } else if (e.error === 'no-speech') {
          // Chrome pauses on quietness; seamless restart
        }
      };

      window.chatSpeechRec.onend = function () {
        if (!chatVoiceShouldKeepListening || !window.isChatVoiceListening) return;

        const currentVal = input ? input.value.trim() : '';
        if (currentVal.length > 0) {
          if (chatVoiceRestartAttempts < 30) {
            chatVoiceRestartAttempts++;
            setTimeout(function () {
              if (chatVoiceShouldKeepListening && window.isChatVoiceListening) {
                createAndStartRecognizer();
              }
            }, 100);
          }
          return;
        }

        if (chatVoiceRestartAttempts < 25) {
          chatVoiceRestartAttempts++;
          setTimeout(function () {
            if (chatVoiceShouldKeepListening && window.isChatVoiceListening) {
              createAndStartRecognizer();
            }
          }, 120);
        } else {
          stopChatVoiceInput(false);
        }
      };

      window.chatSpeechRec.start();
    } catch (err) {
      console.warn('SpeechRecognition restart notice:', err);
    }
  }

  createAndStartRecognizer();
}

function stopChatVoiceInput(shouldSend = true) {
  chatVoiceShouldKeepListening = false;

  if (window.chatVoiceSilenceTimer) {
    clearTimeout(window.chatVoiceSilenceTimer);
    window.chatVoiceSilenceTimer = null;
  }
  if (chatVoiceInactivityTimer) {
    clearTimeout(chatVoiceInactivityTimer);
    chatVoiceInactivityTimer = null;
  }

  window.isChatVoiceListening = false;

  if (window.chatSpeechRec) {
    try { window.chatSpeechRec.stop(); } catch (e) { }
    window.chatSpeechRec = null;
  }

  const banner = document.getElementById('chat-voice-status-banner');
  if (banner) banner.style.display = 'none';

  if (typeof updateSendBtnState === 'function') {
    updateSendBtnState();
  }

  if (shouldSend) {
    const input = document.getElementById('chat-input-textarea');
    if (input && input.value.trim().length > 0 && typeof sendUserMessage === 'function') {
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

  if (window.chatVoiceSilenceTimer) {
    clearTimeout(window.chatVoiceSilenceTimer);
    window.chatVoiceSilenceTimer = null;
  }
  if (chatVoiceInactivityTimer) {
    clearTimeout(chatVoiceInactivityTimer);
    chatVoiceInactivityTimer = null;
  }

  window.isChatVoiceListening = false;

  if (window.chatSpeechRec) {
    try { window.chatSpeechRec.abort(); } catch (e) { }
    window.chatSpeechRec = null;
  }

  const input = document.getElementById('chat-input-textarea');
  if (input) {
    input.value = '';
    if (typeof handleTextareaInput === 'function') handleTextareaInput(input);
  }

  const banner = document.getElementById('chat-voice-status-banner');
  if (banner) banner.style.display = 'none';

  if (typeof updateSendBtnState === 'function') {
    updateSendBtnState();
  }
  if (typeof showToast === 'function') {
    showToast('Perekaman suara dibatalkan', 'info');
  }
}

// Window exports
window.handleSendClick = handleSendClick;
window.startChatVoiceInput = startChatVoiceInput;
window.stopChatVoiceInput = stopChatVoiceInput;
window.cancelChatVoiceInput = cancelChatVoiceInput;
