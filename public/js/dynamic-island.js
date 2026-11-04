/**
 * Global Dynamic Island — Bot Pet
 * ================================
 * Compact ceiling-mounted notch with interactive pixel bot pet.
 * Reacts to app states: ready, thinking, generating, training,
 * predicting, evaluating, idle, voice-speaking, voice-listening, voice-stopped.
 *
 * Preserved public API (no breaking changes to callers):
 *   window.setDynamicIslandState(state, options)
 *   window.startIslandTimer()
 *   window.stopIslandTimer(keepVisibleMs)
 *   window.handleIslandClick()
 *   window.triggerIslandPrompt(query)
 *   window.globalIslandAction(action)
 */

(function () {
  'use strict';

  let islandTimerInterval = null;
  let islandStartTime = null;
  let currentIslandState = 'ready';
  window.currentIslandState = 'ready';
  function getDefaultReadySubText() {
    try {
      const curModel = localStorage.getItem('neura_chat_model') || (window.neuraChatModel || 'dataset');
      if (curModel === 'llm') {
        const llmName = (typeof getLLMShortName === 'function') ? getLLMShortName() : (localStorage.getItem('neura_llm_model_name') || 'LLM');
        return llmName + ' • Generative AI';
      }
    } catch (e) {}
    return 'XGBoost • 32 Biomarkers';
  }
  window.getDefaultReadySubText = getDefaultReadySubText;


  // ─── Bot Pet Config ────────────────────────────────────────────────────────
  const BOT_MOODS = {
    ready:           { speech: 'Halo! Siap mengevaluasi rekam medis.', mood: 'Ready',      moodClass: 'mood-happy' },
    intake:          { speech: 'Mencatat data klinis pasien...',       mood: 'Intake',     moodClass: 'mood-intake' },
    predicting:      { speech: 'Mengevaluasi 32 biomarker klinis...', mood: 'Diagnosing', moodClass: 'mood-predicting' },
    xgboost:         { speech: 'Menelusuri pohon keputusan model...',  mood: 'Computing',  moodClass: 'mood-xgboost' },
    training:        { speech: 'Training model XGBoost...',           mood: 'Training',   moodClass: 'mood-working' },
    generating:      { speech: 'Menyusun laporan hasil diagnosis...', mood: 'Generating', moodClass: 'mood-thinking' },
    validating:      { speech: 'Memverifikasi checksum data...',      mood: 'Verifying',  moodClass: 'mood-validating' },
    success:         { speech: 'Analisis klinis selesai tervalidasi!',mood: 'Completed',  moodClass: 'mood-happy' },
    warning:         { speech: 'Biomarker berisiko tinggi terdeteksi.',mood: 'Attention',  moodClass: 'mood-warning' },
    thinking:        { speech: 'Hmm, sebentar ya...',             mood: 'Thinking',   moodClass: 'mood-thinking' },
    evaluating:      { speech: 'Menghitung metrik akurasi...',    mood: 'Busy',      moodClass: 'mood-working' },
    idle:            { speech: 'Zzz… ketuk aku!',                mood: 'Sleepy',    moodClass: 'mood-idle' },
    'voice-speaking':{ speech: 'Sedang berbicara...',            mood: 'Talking',   moodClass: 'mood-speaking' },
    'voice-listening':{ speech: 'Saya dengar kamu...',           mood: 'Listening', moodClass: 'mood-listening' },
    'voice-stopped': { speech: 'Suara dihentikan.',              mood: 'Silent',    moodClass: 'mood-idle' },
  };

  // SVG faces (compact 20px pixel art)
  function getBotFaceSVG(state) {
    const faces = {
      ready:           `<circle cx="7" cy="9" r="2.2" fill="#4ade80"/>
                        <circle cx="17" cy="9" r="2.2" fill="#4ade80"/>
                        <path d="M7 15 Q12 19 17 15" stroke="#4ade80" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      thinking:        `<circle cx="7" cy="9" r="1.8" fill="#fb923c" opacity="0.5"/>
                        <circle cx="7" cy="9" r="1" fill="#fb923c"/>
                        <circle cx="17" cy="9" r="1.8" fill="#fb923c" opacity="0.5"/>
                        <circle cx="17" cy="9" r="1" fill="#fb923c"/>
                        <path d="M9 15 Q12 14 15 15" stroke="#fb923c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
      generating:      `<circle cx="7" cy="9" r="2.2" fill="#fb923c"/>
                        <circle cx="7" cy="9" r="0.9" fill="#000" opacity="0.6"/>
                        <circle cx="17" cy="9" r="2.2" fill="#fb923c"/>
                        <circle cx="17" cy="9" r="0.9" fill="#000" opacity="0.6"/>
                        <path d="M9 15 Q12 14 15 15" stroke="#fb923c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
      training:        `<rect x="4.5" y="7" width="4" height="4" rx="1" fill="#f59e0b"/>
                        <rect x="15.5" y="7" width="4" height="4" rx="1" fill="#f59e0b"/>
                        <path d="M8 16 Q12 13 16 16" stroke="#f59e0b" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      predicting:      `<circle cx="7" cy="9" r="2.5" fill="#c084fc"/>
                        <circle cx="7" cy="9" r="1.2" fill="#000" opacity="0.5"/>
                        <circle cx="17" cy="9" r="2.5" fill="#c084fc"/>
                        <circle cx="17" cy="9" r="1.2" fill="#000" opacity="0.5"/>
                        <path d="M8 16 Q12 19 16 16" stroke="#c084fc" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      evaluating:      `<rect x="4.5" y="6.5" width="5" height="5" rx="2.5" fill="#4ade80"/>
                        <rect x="14.5" y="6.5" width="5" height="5" rx="2.5" fill="#4ade80"/>
                        <path d="M8 15 Q12 18 16 15" stroke="#4ade80" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      idle:            `<path d="M5 9.5 Q7 9 9 9.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <path d="M15 9.5 Q17 9 19 9.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <path d="M9 15.5 Q12 15 15 15.5" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
      'voice-speaking':`<circle cx="7" cy="9" r="2.5" fill="#fb923c"/>
                        <circle cx="17" cy="9" r="2.5" fill="#fb923c"/>
                        <ellipse cx="12" cy="16" rx="4" ry="2.5" fill="#fb923c" opacity="0.8"/>`,
      'voice-listening':`<circle cx="7" cy="9" r="3" fill="#38bdf8"/>
                         <circle cx="7" cy="9" r="1.2" fill="#000" opacity="0.5"/>
                         <circle cx="17" cy="9" r="3" fill="#38bdf8"/>
                         <circle cx="17" cy="9" r="1.2" fill="#000" opacity="0.5"/>
                         <path d="M8 15 Q12 19 16 15" stroke="#38bdf8" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      'voice-stopped': `<path d="M5 9.5 Q7 9 9 9.5" stroke="#f87171" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <path d="M15 9.5 Q17 9 19 9.5" stroke="#f87171" stroke-width="1.8" fill="none" stroke-linecap="round"/>
                        <path d="M9 16 Q12 14.5 15 16" stroke="#f87171" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    };
    return faces[state] || faces.ready;
  }

  // Large bot face for expanded panel (like Image 2: cute white mochi / pebble bot)
  function getBotFaceLargeSVG(state) {
    let eyesHtml = '';
    switch (state) {
      case 'intake':
        // Melirik ke bawah mencatat data formulir
        eyesHtml = `
          <ellipse cx="33" cy="47" rx="5.5" ry="7.5" transform="rotate(2 33 47)" fill="#000000"/>
          <ellipse cx="67" cy="47" rx="5.5" ry="7.5" transform="rotate(-2 67 47)" fill="#000000"/>
        `;
        break;
      case 'xgboost':
      case 'validating':
        // Mata tajam menyipit analitis
        eyesHtml = `
          <ellipse cx="32" cy="42" rx="6" ry="6.5" transform="rotate(-6 32 42)" fill="#000000"/>
          <ellipse cx="68" cy="42" rx="6" ry="6.5" transform="rotate(6 68 42)" fill="#000000"/>
        `;
        break;
      case 'success':
        // Mata melengkung bahagia tersenyum ^ ^
        eyesHtml = `
          <path d="M 27 45 Q 33 37 39 45" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
          <path d="M 61 45 Q 67 37 73 45" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        `;
        break;
      case 'warning':
        // Mata membulat waspada
        eyesHtml = `
          <ellipse cx="33" cy="43" rx="7" ry="8.5" fill="#000000"/>
          <ellipse cx="67" cy="43" rx="7" ry="8.5" fill="#000000"/>
          <circle cx="35" cy="41" r="2.2" fill="#FFFFFF"/>
          <circle cx="69" cy="41" r="2.2" fill="#FFFFFF"/>
        `;
        break;
      case 'thinking':
      case 'generating':
      case 'predicting':
        eyesHtml = `
          <ellipse cx="31" cy="40" rx="5.5" ry="7.5" transform="rotate(-4 31 40)" fill="#000000"/>
          <ellipse cx="65" cy="40" rx="5.5" ry="7.5" transform="rotate(-4 65 40)" fill="#000000"/>
        `;
        break;
      case 'training':
        eyesHtml = `
          <path d="M 27 45 Q 33 38 39 45" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
          <path d="M 61 45 Q 67 38 73 45" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        `;
        break;
      case 'idle':
        eyesHtml = `
          <path d="M 27 42 Q 33 47 39 42" stroke="#000000" stroke-width="2.8" stroke-linecap="round" fill="none"/>
          <path d="M 61 42 Q 67 47 73 42" stroke="#000000" stroke-width="2.8" stroke-linecap="round" fill="none"/>
        `;
        break;
      case 'voice-speaking':
        eyesHtml = `
          <path d="M 27 43 Q 33 37 39 43" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
          <path d="M 61 43 Q 67 37 73 43" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
          <ellipse cx="50" cy="53" rx="3.5" ry="4.5" fill="#000000"/>
        `;
        break;
      case 'voice-listening':
        eyesHtml = `
          <ellipse cx="33" cy="43" rx="6.5" ry="9" transform="rotate(4 33 43)" fill="#000000"/>
          <circle cx="35" cy="41" r="2.2" fill="#FFFFFF"/>
          <ellipse cx="67" cy="43" rx="6.5" ry="9" transform="rotate(-4 67 43)" fill="#000000"/>
          <circle cx="69" cy="41" r="2.2" fill="#FFFFFF"/>
        `;
        break;
      case 'voice-stopped':
        eyesHtml = `
          <circle cx="33" cy="44" r="5" fill="#000000"/>
          <circle cx="67" cy="44" r="5" fill="#000000"/>
        `;
        break;
      case 'ready':
      case 'evaluating':
      default:
        // Default Image 2: cute solid white mochi head with wide slightly-tilted black oval eyes
        eyesHtml = `
          <ellipse cx="33" cy="44" rx="5.5" ry="8" transform="rotate(6 33 44)" fill="#000000"/>
          <ellipse cx="67" cy="44" rx="5.5" ry="8" transform="rotate(-6 67 44)" fill="#000000"/>
        `;
        break;
    }

    return `<svg width="86" height="64" viewBox="0 0 100 76" fill="none" xmlns="http://www.w3.org/2000/svg" class="bot-face-svg" id="bot-face-large-svg">
      <!-- White Mochi Head Body (Exact match to Image 2) -->
      <path id="bot-head-body" d="M 50 6 C 78 6 95 18 95 39 C 95 60 78 71 50 71 C 22 71 5 60 5 39 C 5 18 22 6 50 6 Z" fill="#FFFFFF"/>
      <!-- Eyes Group with Blink & Tracking Layers -->
      <g class="bot-eyes-wrapper" id="bot-eyes-wrapper">
        <g class="bot-eyes-track" id="bot-eyes-track">
          ${eyesHtml}
        </g>
      </g>
    </svg>`;
  }

  // ─── Inject DOM ────────────────────────────────────────────────────────────
  function ensureDynamicIslandDOM() {
    let island = document.getElementById('dynamic-island');
    if (!island) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-island-wrapper';
      wrapper.innerHTML = `
        <div class="dynamic-island theme-green state-ready is-ready" id="dynamic-island">
          <!-- Compact Notch State -->
          <div class="island-notch-compact" id="island-compact-trigger" onclick="handleIslandClick()">
            <span class="island-notch-sub" id="island-sub-text">XGBoost • 32 Biomarkers</span>
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
              <button class="island-notch-stop-btn" id="island-notch-stop-btn" style="display:none"
                onclick="event.stopPropagation(); if(window.interruptVoiceSpeaking){window.interruptVoiceSpeaking('island_notch_click');}"
                title="Hentikan Suara Neura">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
              </button>
              <span class="island-notch-timer" id="island-timer" style="display:none">00:00</span>
            </div>
          </div>

          <!-- Bot Pet Expanded Panel (Status indicator matching compact notch) -->
          <div class="island-bot-panel" id="island-bot-panel">
            <div class="bot-face-large" id="bot-face-large">
              ${getBotFaceLargeSVG('ready')}
            </div>
            <div class="island-pet-status" id="island-pet-status">
              <span class="island-pet-sub" id="island-pet-sub">XGBoost &bull; 32 Biomarkers</span>
              <div class="island-pet-main-row">
                <div class="island-pixel-loader island-pet-pixel-loader" id="island-pet-pixel-loader" title="Neura AI Processing">
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
                <span class="island-pet-main" id="island-pet-main">Ready</span>
              </div>
            </div>
            <div class="island-capsule-content" id="island-capsule-content"></div>
          </div>
        </div>
      `;
      document.body.appendChild(wrapper);
      island = document.getElementById('dynamic-island');
    } else {
      // Clean up legacy expanded dropdown or old speech bubble if present
      const oldExpanded = island.querySelector('.island-expanded');
      if (oldExpanded) oldExpanded.remove();
      const oldSpeech = island.querySelector('#bot-speech');
      if (oldSpeech) oldSpeech.remove();

      // Ensure bot pet panel exists with new centered layout
      if (!document.getElementById('island-bot-panel')) {
        const botPanel = document.createElement('div');
        botPanel.className = 'island-bot-panel';
        botPanel.id = 'island-bot-panel';
        botPanel.innerHTML = `
          <div class="bot-face-large" id="bot-face-large">
            ${getBotFaceLargeSVG('ready')}
          </div>
          <div class="island-pet-status" id="island-pet-status">
            <span class="island-pet-sub" id="island-pet-sub">XGBoost &bull; 32 Biomarkers</span>
            <div class="island-pet-main-row">
              <div class="island-pixel-loader island-pet-pixel-loader" id="island-pet-pixel-loader" title="Neura AI Processing">
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
              <span class="island-pet-main" id="island-pet-main">Ready</span>
            </div>
          </div>
          <div class="island-capsule-content" id="island-capsule-content"></div>
        `;
        island.appendChild(botPanel);
      } else {
        // Refresh face with Image 2 design
        const faceContainer = document.getElementById('bot-face-large');
        if (faceContainer) faceContainer.innerHTML = getBotFaceLargeSVG('ready');
      }
    }

    // Setup interactions
    _setupBotInteractions();
  }

  // ─── Living Bot Interactions (Random Gaze Engine, Blinking & Physics) ─────
  let _botInteractionsInitialized = false;
  let _danceClickCount = 0;
  let _danceTimer = null;
  let _petTimeout = null;
  let _blinkTimer = null;
  let _gazeTimer = null;
  let _lastMouseMoveTime = 0;
  let _trackingRaf = null;
  let _isPetting = false;
  let _isHoveringIsland = false;
  let _collapseTimer = null;
  const COLLAPSE_DELAY_MS = 550; // Delay sembunyi saat non-hover (550ms)

  // Natural Gaze Poses ("Menoleh" arah acak dengan gerakan kepala & mata yang selaras)
  const GAZE_POSES = [
    { name: 'left',        eyeX: -6.5, eyeY:  0.0, headRot: -5.0, headX: -2.8, headY:  0.0 },
    { name: 'right',       eyeX:  6.5, eyeY:  0.0, headRot:  5.0, headX:  2.8, headY:  0.0 },
    { name: 'up-left',     eyeX: -5.0, eyeY: -4.5, headRot: -3.8, headX: -2.0, headY: -1.2 },
    { name: 'up-right',    eyeX:  5.0, eyeY: -4.5, headRot:  3.8, headX:  2.0, headY: -1.2 },
    { name: 'down',        eyeX:  0.0, eyeY:  5.0, headRot:  0.0, headX:  0.0, headY:  1.8 },
    { name: 'down-left',   eyeX: -4.8, eyeY:  3.8, headRot: -2.8, headX: -1.4, headY:  1.2 },
    { name: 'down-right',  eyeX:  4.8, eyeY:  3.8, headRot:  2.8, headX:  1.4, headY:  1.2 },
    { name: 'center',      eyeX:  0.0, eyeY:  0.0, headRot:  0.0, headX:  0.0, headY:  0.0 }
  ];

  let _isFloatingCapsule = false;

  function _toggleFloatingCapsule(forceState) {
    const island = document.getElementById('dynamic-island');
    const wrapper = document.querySelector('.dynamic-island-wrapper');
    if (!island) return;

    if (typeof forceState === 'boolean') {
      _isFloatingCapsule = forceState;
    } else {
      _isFloatingCapsule = !_isFloatingCapsule;
    }

    if (_isFloatingCapsule) {
      island.classList.add('is-floating-capsule');
      island.classList.add('is-expanded');
      if (wrapper) wrapper.classList.add('wrapper-floating');
      // Berikan reaksi squish lembut menyapa saat kapsul mengambang aktif
      setTimeout(() => {
        _triggerPetInteraction();
      }, 150);
    } else {
      island.classList.remove('is-floating-capsule');
      if (wrapper) wrapper.classList.remove('wrapper-floating');
      if (!_isHoveringIsland && !_isFloatingCapsule) {
        island.classList.remove('is-expanded');
      }
    }
  }

  window.toggleDynamicIslandFloating = _toggleFloatingCapsule;

  function _setupBotInteractions() {
    if (_botInteractionsInitialized) return;
    _botInteractionsInitialized = true;

    const island = document.getElementById('dynamic-island');
    if (!island) return;

    // Hover delay: smooth expansion with delay on leave
    island.addEventListener('mouseenter', () => {
      _isHoveringIsland = true;
      clearTimeout(_collapseTimer);
      island.classList.add('is-expanded');
    });

    island.addEventListener('mouseleave', () => {
      _isHoveringIsland = false;
      clearTimeout(_collapseTimer);
      _collapseTimer = setTimeout(() => {
        if (!_isHoveringIsland) {
          island.classList.remove('is-expanded');
        }
      }, COLLAPSE_DELAY_MS);
    });

    // Click on island / pet
    // Klik 2x (double-click) saat hover untuk mengubah menjadi kapsul mengambang (detached floating pill)
    island.addEventListener('dblclick', function (e) {
      if (e.target.closest('#island-notch-stop-btn')) return;
      e.stopPropagation();
      e.preventDefault();
      _toggleFloatingCapsule();
    });

    island.addEventListener('click', function (e) {
      if (e.target.closest('#island-notch-stop-btn')) return;

      _danceClickCount++;
      clearTimeout(_danceTimer);
      _danceTimer = setTimeout(() => { _danceClickCount = 0; }, 400);

      if (_danceClickCount >= 3) {
        _danceClickCount = 0;
        _triggerDance();
        return;
      }
      _triggerPetInteraction();
    });

    // 1. Mouse Tracking: Bot eyes follow cursor smoothly
    window.addEventListener('mousemove', _onMouseMove, { passive: true });

    // 2. Start Living Autonomous Behaviors (Random Gazing, Blinking & Double-Takes)
    _startIdleBehaviors();
  }

  function _onMouseMove(e) {
    _lastMouseMoveTime = Date.now();
    if (_isPetting) return;

    if (_trackingRaf) cancelAnimationFrame(_trackingRaf);
    _trackingRaf = requestAnimationFrame(() => {
      _updateEyeTracking(e.clientX, e.clientY);
    });
  }

  function _updateEyeTracking(targetX, targetY) {
    const trackEl = document.getElementById('bot-eyes-track');
    const faceEl = document.getElementById('bot-face-large');
    const headBody = document.getElementById('bot-head-body');
    if (!trackEl || !faceEl) return;

    const rect = faceEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // collapsed/hidden

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = targetX - centerX;
    const deltaY = targetY - centerY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      trackEl.style.transform = 'translate(0px, 0px)';
      if (headBody) headBody.style.transform = 'translate(0px, 0px) rotate(0deg)';
      return;
    }

    // Displacement limit: ±5.8px horizontal, ±4.2px vertical
    const maxRadius = 380;
    const factor = Math.min(distance / maxRadius, 1);
    const offsetX = (deltaX / distance) * factor * 5.8;
    const offsetY = (deltaY / distance) * factor * 4.2;

    trackEl.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;

    // Organic subtle head tilt & turn towards mouse pointer (±3.5 deg)
    if (headBody) {
      const tiltAngle = (deltaX / distance) * factor * 3.5;
      const headShiftX = (deltaX / distance) * factor * 1.8;
      headBody.style.transform = `translate(${headShiftX.toFixed(2)}px, 0px) rotate(${tiltAngle.toFixed(2)}deg)`;
    }
  }

  // ─── Autonomous Random Gaze & Blinking Engine ───────────────────────────────
  function _startIdleBehaviors() {
    _scheduleNextBlink();
    _scheduleNextGaze();
  }

  function _applyGazePose(pose) {
    if (_isPetting) return;
    const trackEl = document.getElementById('bot-eyes-track');
    const headBody = document.getElementById('bot-head-body');
    if (!trackEl || !headBody) return;

    trackEl.style.transform = `translate(${pose.eyeX.toFixed(1)}px, ${pose.eyeY.toFixed(1)}px)`;
    headBody.style.transform = `translate(${pose.headX.toFixed(1)}px, ${pose.headY.toFixed(1)}px) rotate(${pose.headRot.toFixed(1)}deg)`;
  }

  function _scheduleNextGaze() {
    clearTimeout(_gazeTimer);
    // Realistis & hidup: menoleh secara berkala setiap 1.5s - 3.2s
    const delay = Math.random() * 1700 + 1500;

    _gazeTimer = setTimeout(() => {
      const timeSinceMouse = Date.now() - _lastMouseMoveTime;
      // Aktifkan menoleh random saat kursor tidak bergerak > 700ms
      if (timeSinceMouse > 700 && !_isPetting) {
        _performRandomGlance();
      }
      _scheduleNextGaze();
    }, delay);
  }

  function _performRandomGlance() {
    // 35% kemungkinan kedipan mikro tepat saat menoleh (saccadic blink)
    if (Math.random() < 0.35) {
      _triggerMicroBlink();
    }

    // 15% kemungkinan aksi "Double-Take" (menoleh ke satu sisi, lalu cepat melirik ke sisi lain)
    if (Math.random() < 0.15) {
      _performDoubleTake();
      return;
    }

    // Pilih pose acak
    const pose = GAZE_POSES[Math.floor(Math.random() * GAZE_POSES.length)];
    _applyGazePose(pose);

    // Tahan tatapan selama 750ms - 1500ms agar ekspresi menoleh terlihat jelas
    const holdDuration = Math.random() * 750 + 750;
    setTimeout(() => {
      const timeSinceMouse = Date.now() - _lastMouseMoveTime;
      if (timeSinceMouse > 700 && !_isPetting) {
        // 45% kemungkinan kembali menatap lurus ke depan
        if (Math.random() < 0.45 && pose.name !== 'center') {
          _applyGazePose(GAZE_POSES[GAZE_POSES.length - 1]);
        }
      }
    }, holdDuration);
  }

  function _performDoubleTake() {
    const leftPose = GAZE_POSES[0];   // left
    const rightPose = GAZE_POSES[1];  // right
    const centerPose = GAZE_POSES[GAZE_POSES.length - 1]; // center

    _applyGazePose(leftPose);
    setTimeout(() => {
      if (!_isPetting) {
        _triggerMicroBlink();
        _applyGazePose(rightPose);
        setTimeout(() => {
          if (!_isPetting) _applyGazePose(centerPose);
        }, 550);
      }
    }, 380);
  }

  function _triggerMicroBlink() {
    const eyesWrap = document.getElementById('bot-eyes-wrapper');
    if (!eyesWrap) return;
    eyesWrap.classList.add('is-blinking');
    setTimeout(() => eyesWrap.classList.remove('is-blinking'), 85);
  }

  function _scheduleNextBlink() {
    clearTimeout(_blinkTimer);
    // Kedipan alami spontan setiap 2.0s - 4.2s
    const delay = Math.random() * 2200 + 2000;
    _blinkTimer = setTimeout(() => {
      _triggerOrganicBlink(() => {
        _scheduleNextBlink();
      });
    }, delay);
  }

  function _triggerOrganicBlink(onComplete) {
    const eyesWrap = document.getElementById('bot-eyes-wrapper');
    if (!eyesWrap) {
      if (onComplete) onComplete();
      return;
    }

    const isDoubleBlink = Math.random() < 0.28;

    eyesWrap.classList.add('is-blinking');
    setTimeout(() => {
      eyesWrap.classList.remove('is-blinking');
      if (isDoubleBlink) {
        setTimeout(() => {
          eyesWrap.classList.add('is-blinking');
          setTimeout(() => {
            eyesWrap.classList.remove('is-blinking');
            if (onComplete) onComplete();
          }, 90);
        }, 110);
      } else {
        if (onComplete) onComplete();
      }
    }, 110);
  }

  // Petting interaction on Click: soft squish bounce + happy curved eyes
  function _triggerPetInteraction() {
    const faceEl = document.getElementById('bot-face-large');
    const eyesTrack = document.getElementById('bot-eyes-track');
    if (!faceEl) return;

    _isPetting = true;

    // Elastic jelly squish on pet
    faceEl.classList.remove('bot-squish', 'bot-dance');
    void faceEl.offsetWidth; // reflow
    faceEl.classList.add('bot-squish');

    // Switch eyes to cheerful squint curves ^ ^
    if (eyesTrack) {
      clearTimeout(_petTimeout);
      eyesTrack.innerHTML = `
        <path d="M 27 44 Q 33 37 39 44" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
        <path d="M 61 44 Q 67 37 73 44" stroke="#000000" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      `;
      _petTimeout = setTimeout(() => {
        _isPetting = false;
        const current = window.dynamicIslandState || 'ready';
        _updateBotPet(current);
      }, 700);
    } else {
      setTimeout(() => { _isPetting = false; }, 700);
    }
  }

  function _triggerDance() {
    const pet = document.getElementById('bot-face-large');
    if (!pet) return;
    pet.classList.remove('bot-dance', 'bot-squish');
    void pet.offsetWidth; // reflow
    pet.classList.add('bot-dance');
    setTimeout(() => pet.classList.remove('bot-dance'), 700);
  }

  // ─── Update Bot Pet UI ─────────────────────────────────────────────────────
  function _updateBotPet(state) {
    const cfg = BOT_MOODS[state] || BOT_MOODS.ready;

    // Update large face SVG
    const faceEl = document.getElementById('bot-face-large');
    if (faceEl) faceEl.innerHTML = getBotFaceLargeSVG(state);

    // Mood dot & label
    const moodDot = document.getElementById('bot-mood-dot');
    const moodLabel = document.getElementById('bot-mood-label');
    if (moodDot) {
      moodDot.className = 'bot-mood-dot ' + cfg.moodClass;
    }
    if (moodLabel) {
      moodLabel.textContent = cfg.mood;
    }
  }

  // ─── Timer ────────────────────────────────────────────────────────────────
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

  // ─── State Setter ──────────────────────────────────────────────────────────
  window.setDynamicIslandState = function (state, options = {}) {
    currentIslandState = state;
    window.currentIslandState = state;
    const island = document.getElementById('dynamic-island');
    const subEl = document.getElementById('island-sub-text');
    const mainEl = document.getElementById('island-main-text');
    const petSubEl = document.getElementById('island-pet-sub');
    const petMainEl = document.getElementById('island-pet-main');
    const pixelLoader = document.getElementById('island-pixel-loader');
    const soundwave = document.getElementById('island-soundwave');
    const notchStopBtn = document.getElementById('island-notch-stop-btn');

    if (!island) return;

    function applyIslandText(sub, main) {
      if (subEl) subEl.textContent = sub;
      if (mainEl) mainEl.textContent = main;
      if (petSubEl) petSubEl.textContent = sub;
      if (petMainEl) petMainEl.textContent = main;
    }

    island.classList.remove(
      'theme-orange', 'theme-purple', 'theme-green', 'theme-default',
      'theme-cyan', 'theme-voice-listening', 'theme-voice-speaking', 'theme-stopped', 'theme-voice-stopped',
      'is-thinking', 'is-training', 'is-ready',
      'state-ready', 'state-intake', 'state-predicting', 'state-xgboost',
      'state-training', 'state-generating', 'state-validating', 'state-success', 'state-warning', 'state-thinking'
    );
    island.classList.add('state-' + state);

    // Default icon states
    if (pixelLoader) pixelLoader.style.display = 'flex';
    if (soundwave) soundwave.style.display = 'none';
    if (notchStopBtn) notchStopBtn.style.display = 'none';

    switch (state) {
      case 'intake':
        applyIslandText(options.sub || 'Rekam Medis • Data Intake', options.main || 'Inputting...');
        window.startIslandTimer();
        break;

      case 'xgboost':
        applyIslandText(options.sub || 'XGBoost v3.4 • Tree Traversal', options.main || 'Computing...');
        window.startIslandTimer();
        break;

      case 'validating':
        applyIslandText(options.sub || 'Integritas Data • SHA-256 Check', options.main || 'Verifying...');
        window.startIslandTimer();
        break;

      case 'success':
        applyIslandText(options.sub || 'Hasil Selesai • Akurasi 94.4%', options.main || 'Completed');
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'warning':
        applyIslandText(options.sub || 'Perhatian Klinis • Risiko Tinggi', options.main || 'Attention');
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'voice-speaking':
        island.classList.add('theme-voice-speaking', 'theme-orange', 'is-thinking');
        if (pixelLoader) pixelLoader.style.display = 'none';
        if (soundwave) soundwave.style.display = 'flex';
        if (notchStopBtn) notchStopBtn.style.display = 'inline-flex';
        applyIslandText(options.sub || 'Neura Voice AI \u2022 Speaking', options.main || 'Speaking');
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'voice-listening':
        island.classList.add('theme-voice-listening', 'theme-cyan', 'is-thinking');
        if (pixelLoader) pixelLoader.style.display = 'none';
        if (soundwave) soundwave.style.display = 'flex';
        if (notchStopBtn) notchStopBtn.style.display = 'none';
        applyIslandText(options.sub || 'Voice AI Consultation \u2022 Listening', options.main || 'Listening');
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'voice-stopped':
        island.classList.add('theme-voice-stopped', 'theme-stopped');
        if (pixelLoader) pixelLoader.style.display = 'flex';
        if (soundwave) soundwave.style.display = 'none';
        if (notchStopBtn) notchStopBtn.style.display = 'none';
        applyIslandText(options.sub || 'Voice Interrupted \u2022 Standby', options.main || 'Stopped');
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'thinking':
        island.classList.add('state-thinking', 'is-thinking');
        applyIslandText(options.sub || 'Matching clinical intent • chat_dataset.py', options.main || 'Thinking...');
        window.startIslandTimer();
        break;

      case 'generating':
        island.classList.add('theme-orange', 'is-thinking');
        applyIslandText(options.sub || 'Synthesizing \u2022 Alzheimer', options.main || 'Generating');
        break;

      case 'training':
        island.classList.add('theme-orange', 'is-training');
        applyIslandText(options.sub || 'Training XGBoost \u2022 Gradient Boosted Trees', options.main || 'Training...');
        if (!islandTimerInterval) window.startIslandTimer();
        break;

      case 'predicting':
        island.classList.add('theme-purple', 'is-thinking');
        applyIslandText(options.sub || 'Evaluating 32 Biomarkers \u2022 Clinical Inference', options.main || 'Diagnosing');
        window.startIslandTimer();
        break;

      case 'evaluating':
        island.classList.add('theme-green', 'is-thinking');
        applyIslandText(options.sub || 'Evaluating test metrics \u2022 430 patient records', options.main || 'Evaluating');
        window.startIslandTimer();
        break;

      case 'idle':
        island.classList.add('theme-default');
        applyIslandText(options.sub || "Alzheimer's AI \u2022 Standby", options.main || 'Idle');
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;

      case 'ready':
      default:
        island.classList.add('theme-green', 'is-ready', 'state-ready');
        applyIslandText(options.sub || getDefaultReadySubText(), options.main || 'Ready');
        window.stopIslandTimer(options.keepTimer ? 3500 : 0);
        break;
    }

    // Update bot pet expression
    _updateBotPet(state);
  };

  // ─── Action Handlers ───────────────────────────────────────────────────────
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
      if (action === 'specs') {
        window.location.href = '/app';
      } else {
        sessionStorage.setItem('pending_neura_action', action);
        window.location.href = '/app';
      }
    }
  };

  // ─── Name Formatter ────────────────────────────────────────────────────────
  function formatDisplayName(name, maxLen = 14) {
    if (!name) return 'Guest';
    const trimmed = String(name).trim();
    if (trimmed.length <= maxLen) return trimmed;
    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      const short = parts[0] + ' ' + parts[1].charAt(0) + '.';
      if (short.length <= maxLen) return short;
      if (parts[0].length <= maxLen) return parts[0];
    }
    return trimmed.slice(0, maxLen - 1) + '…';
  }

  // ─── Background Status Poller ──────────────────────────────────────────────
  const pollModelStatus = syncStatus;
  window.pollModelStatus = syncStatus;

  async function syncStatus() {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) return;
      const data = await res.json();

      // Jangan ganggu proses yang sedang aktif berjalan
      if (
        currentIslandState === 'voice-speaking' ||
        currentIslandState === 'voice-listening' ||
        currentIslandState === 'voice-stopped' ||
        currentIslandState === 'intake' ||
        currentIslandState === 'predicting' ||
        currentIslandState === 'xgboost' ||
        currentIslandState === 'generating' ||
        currentIslandState === 'thinking' ||
        currentIslandState === 'validating'
      ) return;

      if (data.training_running) {
        if (currentIslandState !== 'training') {
          window.setDynamicIslandState('training', { sub: 'Training in background…', main: 'Training…' });
        }
      } else {
        if (currentIslandState === 'training') {
          window.setDynamicIslandState('ready', { sub: 'XGBoost • 32 Biomarkers', main: 'Ready' });
        } else if (currentIslandState === 'ready' || currentIslandState === 'idle') {
          const targetState = data.model_ready ? 'ready' : 'idle';
          const targetSub = data.model_ready ? getDefaultReadySubText() : 'No Checkpoint';
          const targetMain = data.model_ready ? 'Ready' : 'Idle';
          const island = document.getElementById('dynamic-island');
          // Jika kelas terdesinkronisasi (misal tersisa theme-orange), re-apply state bersih
          if (island && (!island.classList.contains('state-' + targetState) || island.classList.contains('theme-orange'))) {
            window.setDynamicIslandState(targetState, { sub: targetSub, main: targetMain });
          }
        }
      }
    } catch (_) {}
  }

  // ─── Initial Welcome Greeting on Load / Refresh ────────────────────────────
  function _showInitialWelcomeGreeting() {
    const island = document.getElementById('dynamic-island');
    if (!island) return;

    // Tunggu sebentar (400ms) agar transisi render halaman selesai
    setTimeout(() => {
      // Munculkan panel pet saat baru refresh / buka halaman
      island.classList.add('is-expanded');

      // Lakukan interaksi menyapa ceria (squish elastis & senyum ^ ^)
      setTimeout(() => {
        _triggerPetInteraction();
      }, 400);

      // Tampilkan sebentar (~2.4 detik), lalu sembunyikan kembali sebagai default
      setTimeout(() => {
        if (!_isHoveringIsland) {
          island.classList.remove('is-expanded');
        }
      }, 2500);
    }, 400);
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    ensureDynamicIslandDOM();
    syncStatus();
    setInterval(syncStatus, 8000);

    // Tampilkan sebentar pet saat baru refresh lalu sembunyikan sebagai default
    _showInitialWelcomeGreeting();

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

  // ─── Interactive Clinical Pipeline Demo Runner ─────────────────────────────
  window.demoIslandPipeline = function (intervalMs = 3200) {
    const states = [
      { state: 'intake',     sub: 'Rekam Medis • Data Intake',          main: 'Inputting...' },
      { state: 'predicting', sub: 'Evaluasi 32 Biomarker • AI Engine',  main: 'Diagnosing...' },
      { state: 'xgboost',    sub: 'XGBoost v3.4 • Tree Traversal',      main: 'Computing...' },
      { state: 'generating', sub: 'Sintesis Klinis • Diagnostik',       main: 'Generating...' },
      { state: 'validating', sub: 'Integritas Data • SHA-256 Check',    main: 'Verifying...' },
      { state: 'success',    sub: 'Hasil Selesai • Akurasi 94.4%',      main: 'Completed' },
      { state: 'ready',      sub: 'XGBoost • 32 Biomarkers',            main: 'Ready' }
    ];

    let idx = 0;
    console.log('[Dynamic Island] Memulai demo alur proses klinis Neura...');
    const runner = setInterval(() => {
      if (idx >= states.length) {
        clearInterval(runner);
        console.log('[Dynamic Island] Demo alur selesai!');
        return;
      }
      const s = states[idx++];
      window.setDynamicIslandState(s.state, { sub: s.sub, main: s.main });
    }, intervalMs);
  };

  // ─── Automatic Form Intake Listener ───────────────────────────────────────
  function setupAutoIntakeListener() {
    let intakeDebounce = null;

    function handleIntakeTrigger(target) {
      if (!target || !target.matches('input, textarea, select')) return;
      if (target.type === 'hidden' || target.type === 'submit' || target.type === 'button') return;
      if (target.id === 'chat-input-textarea' || (typeof target.closest === 'function' && target.closest('#chat-input-container'))) return;
      if (
        currentIslandState === 'voice-speaking' ||
        currentIslandState === 'voice-listening' ||
        currentIslandState === 'predicting' ||
        currentIslandState === 'training'
      ) return;

      let fieldHint = target.placeholder || target.getAttribute('data-field') || target.name || target.id || 'Data Diri & Klinis';
      fieldHint = fieldHint.replace(/profile_form_[0-9a-zA-Z_]+/gi, '').replace(/[._-]+/g, ' ').trim();
      if (!fieldHint || fieldHint.length < 2) fieldHint = 'Data Pasien';

      window.setDynamicIslandState('intake', {
        sub: 'Rekam Medis • ' + fieldHint.slice(0, 24),
        main: 'Inputting...'
      });

      clearTimeout(intakeDebounce);
      intakeDebounce = setTimeout(() => {
        if (currentIslandState === 'intake') {
          window.setDynamicIslandState('ready', {
            sub: 'XGBoost • 32 Biomarkers',
            main: 'Ready'
          });
        }
      }, 3500);
    }

    // Capture on both input and focusin (clicking or focusing immediately triggers intake state!)
    document.addEventListener('input', (e) => handleIntakeTrigger(e.target), { passive: true });
    document.addEventListener('focusin', (e) => handleIntakeTrigger(e.target), { passive: true });
  }

  window.getCurrentIslandState = () => currentIslandState;

  function init() {
    ensureDynamicIslandDOM();
    _startRandomGaze();
    _startNaturalBlinking();
    syncStatus();
    setInterval(syncStatus, 8000);
    _showInitialWelcomeGreeting();
    setupAutoIntakeListener();

    // Check if there was a pending island prompt from welcome/landing page
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
