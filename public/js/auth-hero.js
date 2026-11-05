/**
 * public/js/auth-hero.js
 * Logika autentikasi Login & Registrasi (Email & Google) menggunakan Firebase Auth & Firestore.
 * Mengontrol slider tab interaktif, toggle password, feedback error, dan status sesi klinis.
 * Membuka/menutup form secara interaktif dari tombol "Masuk" di main navbar.
 */

(function () {
  'use strict';

  var currentMode = 'welcome'; // 'login' | 'register'
  var isAuthOpen = false;

  // DOM Elements
  var heroRight, authCard, authOverlay;
  var navLoginBtn, navLoginText, mobileLoginBtn;
  var authCloseBtn, heroBrainTrigger;
  var tabsNav, tabGlider, tabLoginBtn, tabRegisterBtn;
  var sliderTrack;
  var loginForm, registerForm;
  var googleBtn, googleBtnText, googleTitle, googleSub, dividerText;
  var alertBox, alertText;
  var loggedView, loggedAvatar, loggedName, loggedEmail, logoutBtn;
  var loginSubmitBtn, registerSubmitBtn;
  var comp1ModeToggle, comp1Title, loginForgotBtn;

  // Onboarding Step Elements (Verify & Welcome Panes)
  var verifyPane, verifyEmailDisplay, btnCheckVerified, btnResendVerification, btnCancelVerify, verifyStatusBannerText;
  var welcomePane, welcomeGreetingTitle, welcomeCountdown, btnGoToDashboard;

  // Admin 2FA Elements & State
  var adminVerifyPane, adminCustomEmailDisplay, adminRealEmailDisplay, adminOtpBoxesWrap, adminOtpDigits;
  var adminFullOtp, adminOtpTimer, adminVerifyStatusBanner, adminVerifyStatusText;
  var btnSubmitAdminOtp, btnResendAdminOtp, btnCancelAdminVerify;
  var currentAdminEmail = '';
  var currentAdminData = null;
  var adminOtpTimerInterval = null;
  var _isSendingOtp = false; // Guard: mencegah pengiriman OTP ganda

  // Step Tracking State
  var activeVerificationUser = null;
  var activeVerificationName = '';
  var activeVerificationEmail = '';
  var verifyPollingInterval = null;
  var welcomeCountdownTimer = null;
  var isInOnboardingStep = false; // Guard: mencegah monitorAuthState reset UI saat slide verify/welcome

  function initElements() {
    heroRight = document.getElementById('hero-right');
    authCard = document.getElementById('hero-auth-card');
    authOverlay = document.getElementById('auth-drawer-overlay');
    navLoginBtn = document.getElementById('nav-login-btn');
    navLoginText = document.getElementById('nav-login-text');
    mobileLoginBtn = document.getElementById('mobile-login-btn');
    authCloseBtn = document.getElementById('auth-card-close-btn');
    heroBrainTrigger = document.getElementById('hero-brain-auth-trigger');

    tabsNav = document.getElementById('auth-tabs-nav');
    tabGlider = document.getElementById('auth-tab-glider');
    tabLoginBtn = document.getElementById('tab-login-btn');
    tabRegisterBtn = document.getElementById('tab-register-btn');
    sliderTrack = document.getElementById('auth-slider-track');
    loginForm = document.getElementById('auth-login-form');
    var remBox = document.getElementById('login-remember-me');
    if (remBox) {
      try {
        remBox.checked = (localStorage.getItem('neura_remember_me') !== 'false');
      } catch (e) {}
    }
    registerForm = document.getElementById('auth-register-form');
    googleBtn = document.getElementById('auth-google-btn');
    googleBtnText = document.getElementById('auth-google-btn-text');
    googleTitle = document.getElementById('auth-google-title');
    googleSub = document.getElementById('auth-google-sub');
    dividerText = document.getElementById('auth-divider-text');
    alertBox = document.getElementById('auth-alert');
    alertText = document.getElementById('auth-alert-text');
    loggedView = document.getElementById('pane-view-profile') || document.getElementById('auth-logged-view');
    loggedAvatar = document.getElementById('welcome-user-avatar') || document.getElementById('auth-logged-avatar');
    loggedName = document.getElementById('welcome-user-name') || document.getElementById('auth-logged-name');
    loggedEmail = document.getElementById('welcome-user-email') || document.getElementById('auth-logged-email');
    logoutBtn = document.getElementById('btn-logged-logout') || document.getElementById('auth-logout-btn');
    loginSubmitBtn = document.getElementById('login-submit-btn');
    registerSubmitBtn = document.getElementById('register-submit-btn');

    // 3-Component Redesign Elements
    comp1ModeToggle = document.getElementById('comp1-mode-toggle');
    comp1Title = document.getElementById('comp1-title');
    loginForgotBtn = document.getElementById('login-forgot-btn');

    // Steps
    verifyPane = document.getElementById('auth-verify-pane');
    verifyEmailDisplay = document.getElementById('verify-email-display');
    btnCheckVerified = document.getElementById('btn-check-verified');
    btnResendVerification = document.getElementById('btn-resend-verification');
    btnCancelVerify = document.getElementById('btn-cancel-verify');
    verifyStatusBannerText = document.getElementById('verify-status-banner-text');

    welcomePane = document.getElementById('auth-welcome-pane');
    welcomeGreetingTitle = document.getElementById('welcome-greeting-title');
    welcomeCountdown = document.getElementById('welcome-countdown');
    btnGoToDashboard = document.getElementById('btn-go-to-dashboard');

    // Admin 2FA Elements
    adminVerifyPane = document.getElementById('auth-admin-verify-pane');
    adminCustomEmailDisplay = document.getElementById('admin-custom-email-display');
    adminRealEmailDisplay = document.getElementById('admin-real-email-display');
    adminOtpBoxesWrap = document.getElementById('admin-otp-boxes-wrap');
    adminOtpDigits = document.querySelectorAll('.admin-otp-digit');
    adminFullOtp = document.getElementById('admin-full-otp');
    adminOtpTimer = document.getElementById('admin-otp-timer');
    adminVerifyStatusBanner = document.getElementById('admin-verify-status-banner');
    adminVerifyStatusText = document.getElementById('admin-verify-status-text');
    btnSubmitAdminOtp = document.getElementById('btn-submit-admin-otp');
    btnResendAdminOtp = document.getElementById('btn-resend-admin-otp');
    btnCancelAdminVerify = document.getElementById('btn-cancel-admin-verify');
  }

  // Open the Auth Drawer with slide-in from right animation
  
  // =========================================================================
  // Remember Me Pill Button Handler
  // =========================================================================
  function initRememberMeButton() {
    var btn = document.getElementById('login-remember-btn');
    var hiddenInput = document.getElementById('login-remember-me');
    if (!btn) return;

    // Baca preferensi tersimpan (default: true)
    var savedPref = localStorage.getItem('neura_remember_me');
    var isActive = (savedPref !== 'false');

    function updateState(active) {
      if (active) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-checked', 'true');
        if (hiddenInput) hiddenInput.value = 'true';
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-checked', 'false');
        if (hiddenInput) hiddenInput.value = 'false';
      }
      try {
        localStorage.setItem('neura_remember_me', active ? 'true' : 'false');
      } catch (e) {}
    }

    updateState(isActive);

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      var nowActive = !btn.classList.contains('is-active');
      updateState(nowActive);
    };
  }

  function openAuthCard(mode) {
    isAuthOpen = true;
    if (authCard) {
      authCard.classList.add('is-open');
      authCard.setAttribute('aria-hidden', 'false');
    }
    if (authOverlay) {
      authOverlay.classList.add('is-open');
      authOverlay.setAttribute('aria-hidden', 'false');
    }
    document.documentElement.classList.add('auth-drawer-open');
    document.body.classList.add('auth-drawer-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Stop Lenis smooth scroll if running
    if (window.lenis && typeof window.lenis.stop === 'function') {
      try { window.lenis.stop(); } catch (e) {}
    }

    if (navLoginBtn) navLoginBtn.classList.add('active');

    var targetView = mode || 'welcome';
    switchTab(targetView);

    // Auto focus first field after entrance animation & check email value
    setTimeout(function () {
      var emailField = document.getElementById('login-email');
      if (emailField && emailField.value) {
        checkAdminEmailDynamically(emailField.value);
      }
      var targetInput = (mode === 'register')
        ? document.getElementById('register-name')
        : emailField;
      if (targetInput) targetInput.focus();
    }, 320);
  }

  // Close the Auth Drawer and restore normal screen
  function closeAuthCard() {
    isAuthOpen = false;
    stopVerifyPolling();
    stopWelcomeCountdown();
    stopAdminOtpTimer();

    if (authCard) {
      authCard.classList.remove('is-open');
      authCard.classList.remove('in-step-mode');
      authCard.setAttribute('aria-hidden', 'true');
    }
    if (authOverlay) {
      authOverlay.classList.remove('is-open');
      authOverlay.setAttribute('aria-hidden', 'true');
    }
    document.documentElement.classList.remove('auth-drawer-open');
    document.body.classList.remove('auth-drawer-open');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Resume Lenis smooth scroll if running
    if (window.lenis && typeof window.lenis.start === 'function') {
      try { window.lenis.start(); } catch (e) {}
    }

    if (navLoginBtn) navLoginBtn.classList.remove('active');
    hideAlert();
  }

  function toggleAuthCard(mode) {
    if (authCard && authCard.classList.contains('is-open')) {
      closeAuthCard();
    } else {
      openAuthCard(mode || 'welcome');
    }
  }

  function switchAuthView(viewName) {
    currentMode = viewName;
    hideAlert();
    stopVerifyPolling();
    stopWelcomeCountdown();
    stopAdminOtpTimer();
    isInOnboardingStep = (viewName === 'admin-verify');

    // Toggle is-welcome-view class on main card for particle & centering CSS
    var mainCard = document.getElementById('neura-auth-main-card');
    if (mainCard) {
      if (viewName === 'welcome') {
        mainCard.classList.add('is-welcome-view');
      } else {
        mainCard.classList.remove('is-welcome-view');
      }
    }

    // Titles & Subtitles with Apple smooth fade transition
    var titleEl = document.getElementById('auth-dynamic-title');
    var subtitleEl = document.getElementById('auth-dynamic-subtitle');
    var titlesMap = {
      'welcome': ['Welcome', 'Mulai Konsultasi dan kenali gejala lebih awal'],
      'login': ['Login', 'Mulai Konsultasi dan kenali gejala lebih awal'],
      'register': ['Register', 'Mulai Konsultasi dan kenali gejala lebih awal'],
      'forgot': ['Forgot Pass', 'Mulai Konsultasi dan kenali gejala lebih awal'],
      'profile': ['Profile', 'Profil mu dan beberapa data profil'],
      'admin-verify': ['Verifikasi 2FA', 'Kode OTP telah dikirimkan ke email administrator']
    };
    var nextTexts = titlesMap[viewName] || ['Welcome', 'Mulai Konsultasi dan kenali gejala lebih awal'];

    if (titleEl && subtitleEl) {
      if (titleEl.textContent !== nextTexts[0] || subtitleEl.textContent !== nextTexts[1]) {
        titleEl.classList.add('is-fading');
        subtitleEl.classList.add('is-fading');
        if (window.__authTitleTimer) clearTimeout(window.__authTitleTimer);
        window.__authTitleTimer = setTimeout(function () {
          titleEl.textContent = nextTexts[0];
          subtitleEl.textContent = nextTexts[1];
          titleEl.classList.remove('is-fading');
          subtitleEl.classList.remove('is-fading');
          window.__authTitleTimer = null;
        }, 140);
      }
    }

    // Panes switching with Apple spring smooth motion
    var allPanes = document.querySelectorAll('.auth-view-pane');
    var currentActive = document.querySelector('.auth-view-pane.active');
    var targetPaneId = (viewName === 'admin-verify') ? 'auth-admin-verify-pane' : ('pane-view-' + viewName);
    var targetPane = document.getElementById(targetPaneId);
    if (!targetPane && viewName === 'login') {
      targetPane = document.getElementById('pane-view-login');
    }

    if (window.__authPaneTimer) {
      clearTimeout(window.__authPaneTimer);
      window.__authPaneTimer = null;
    }

    if (currentActive && targetPane && currentActive !== targetPane) {
      // Smooth exit: outgoing pane glides up and fades out
      currentActive.classList.add('is-leaving');
      var outgoing = currentActive;

      window.__authPaneTimer = setTimeout(function () {
        outgoing.classList.remove('active', 'is-leaving');
        allPanes.forEach(function (p) {
          if (p !== targetPane) p.classList.remove('active', 'is-leaving');
        });
        targetPane.classList.add('active');
        window.__authPaneTimer = null;
      }, 150);
    } else if (targetPane) {
      allPanes.forEach(function (p) { p.classList.remove('active', 'is-leaving'); });
      targetPane.classList.add('active');
    }

    // Top Pills Indicator (3 pills at top right)
    var pillLogin = document.getElementById('top-pill-login');
    var pillRegister = document.getElementById('top-pill-register');
    var pillForgot = document.getElementById('top-pill-forgot');
    [pillLogin, pillRegister, pillForgot].forEach(function (pill) {
      if (pill) pill.classList.remove('active');
    });

    if (viewName === 'welcome' || viewName === 'login') {
      if (pillLogin) pillLogin.classList.add('active');
    } else if (viewName === 'register') {
      if (pillRegister) pillRegister.classList.add('active');
    } else if (viewName === 'forgot') {
      if (pillForgot) pillForgot.classList.add('active');
    }

    // Sub stack buttons visibility (Outside main card)
    var subStack = document.getElementById('neura-auth-sub-stack');
    var btnEmail = document.getElementById('btn-goto-login-email');
    var btnGoogle = document.getElementById('auth-google-btn');
    var placeholder = document.getElementById('sub-stack-placeholder');

    // Container class & attribute update for uniform height guarantee
    var authContainer = document.querySelector('.neura-auth-flow-container');
    if (authContainer) {
      authContainer.setAttribute('data-auth-view', viewName);
    }
    var drawerInner = document.querySelector('.auth-drawer-inner');
    if (drawerInner) {
      drawerInner.setAttribute('data-auth-view', viewName);
    }

    // Dynamic Google button text & sub-stack handling
    var googleTitleEl = document.getElementById('auth-google-btn-title') || (btnGoogle ? btnGoogle.querySelector('.capsule-title') : null);
    if (viewName === 'register') {
      if (googleTitleEl) googleTitleEl.textContent = 'Register With Google';
      if (btnGoogle) btnGoogle.title = 'Daftar dengan Akun Google';
    } else {
      if (googleTitleEl) googleTitleEl.textContent = 'Login With Google';
      if (btnGoogle) btnGoogle.title = 'Masuk dengan Akun Google';
    }

    if (viewName === 'welcome') {
      if (subStack) subStack.style.setProperty('display', 'flex', 'important');
      if (btnEmail) {
        btnEmail.style.removeProperty('display');
        btnEmail.classList.remove('is-hidden');
      }
      if (btnGoogle) {
        btnGoogle.style.setProperty('display', 'flex', 'important');
        btnGoogle.classList.remove('is-hidden');
      }
      if (placeholder) {
        placeholder.style.setProperty('display', 'none', 'important');
        placeholder.classList.add('is-hidden');
      }
    } else if (viewName === 'login' || viewName === 'register') {
      if (subStack) subStack.style.setProperty('display', 'flex', 'important');
      if (btnEmail) {
        btnEmail.classList.add('is-hidden');
      }
      if (btnGoogle) {
        btnGoogle.style.setProperty('display', 'flex', 'important');
        btnGoogle.classList.remove('is-hidden');
      }
      if (placeholder) {
        placeholder.classList.add('is-hidden');
      }
    } else if (viewName === 'forgot') {
      // Hilangkan card Google pada form Forgot Password
      if (subStack) subStack.style.setProperty('display', 'none', 'important');
      if (btnEmail) btnEmail.classList.add('is-hidden');
      if (btnGoogle) btnGoogle.classList.add('is-hidden');
      if (placeholder) placeholder.classList.add('is-hidden');
    } else if (viewName === 'profile' || viewName === 'admin-verify') {
      if (subStack) subStack.style.setProperty('display', 'none', 'important');
    }
  }

  function switchTab(mode) {
    switchAuthView(mode);
  }

  // Menampilkan Slide 3: Verifikasi Email
  function showVerifySlide(user, name, email) {
    isInOnboardingStep = true; // Aktifkan guard agar monitorAuthState tidak reset UI
    activeVerificationUser = user;
    activeVerificationName = name || (user ? user.displayName : '');
    activeVerificationEmail = email || (user ? user.email : '');

    hideAlert();
    if (authCard) authCard.classList.add('in-step-mode');
    if (sliderTrack) sliderTrack.className = 'auth-slider-track show-verify';
    if (verifyEmailDisplay) verifyEmailDisplay.textContent = activeVerificationEmail;

    if (verifyStatusBannerText) {
      verifyStatusBannerText.textContent = 'Menunggu aktivasi email Anda...';
      verifyStatusBannerText.style.color = '';
    }

    startVerifyPolling();
  }

  // Menampilkan Slide 4: Sambutan Selamat Datang Menuju Dashboard
  function showWelcomeSlide(user, customName) {
    isInOnboardingStep = true; // Aktifkan guard
    stopVerifyPolling();
    hideAlert();

    var displayName = customName || (user ? user.displayName : '') || 'User';
    var savedRole = localStorage.getItem('neura_user_role') || 'User';
    var rolePrefix = savedRole === 'Nakes' ? 'dr. ' : (savedRole === 'Admin' ? 'Admin ' : '');
    if (welcomeGreetingTitle) {
      welcomeGreetingTitle.textContent = 'Selamat Datang, ' + rolePrefix + displayName + '!';
    }

    if (authCard) authCard.classList.add('in-step-mode');
    if (sliderTrack) sliderTrack.className = 'auth-slider-track show-welcome';

    // Simpan status profil aktif
    if (user) {
      syncUserProfileToStorage(user, displayName);
      var fb = window.NeuraFirebase;
      var db = fb ? fb.getDb() : null;
      saveUserToFirestore(db, user, displayName);
    }

    // Hitung mundur 3 detik menuju Dashboard (/app)
    stopWelcomeCountdown();
    var timeLeft = 3;
    if (welcomeCountdown) welcomeCountdown.textContent = timeLeft;

    welcomeCountdownTimer = setInterval(function () {
      timeLeft--;
      if (welcomeCountdown) welcomeCountdown.textContent = timeLeft;
      if (timeLeft <= 0) {
        stopWelcomeCountdown();
        window.location.href = '/app';
      }
    }, 1000);
  }

  var KNOWN_ADMIN_EMAILS = [
    'hanzz@neura.dr.id',
    'jkmaiden@neura.dr.id',
    'muhammadhasan.cg@gmail.com',
    'muhammadhasan.cg@neura.dr.id',
    'maman@neura.dr.id',
    'mychel09@neura.dr.id',
    'jester19@neura.dr.id',
    'tsaritsaanastasya@neura.dr.id'
  ];
  var KNOWN_ADMIN_DOMAINS = ['neura.dr.id'];
  var adminCheckDebounceTimer = null;
  var adminCheckSeq = 0;
  var isAdminDetected = false;

  // Preload daftar email admin dari backend untuk deteksi instan (0ms) tanpa latency
  function loadAdminEmailsList() {
    fetch('/api/admin/emails')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && Array.isArray(data.admin_emails)) {
          KNOWN_ADMIN_EMAILS = data.admin_emails;
        }
        if (data && Array.isArray(data.admin_domains)) {
          KNOWN_ADMIN_DOMAINS = data.admin_domains;
        }
        var cur = document.getElementById('login-email');
        if (cur && cur.value) checkAdminEmailDynamically(cur.value);
      })
      .catch(function () {});
  }

  function isEmailAdmin(email) {
    if (!email) return false;
    var clean = email.trim().toLowerCase();
    if (KNOWN_ADMIN_EMAILS.indexOf(clean) !== -1) return true;
    for (var i = 0; i < KNOWN_ADMIN_DOMAINS.length; i++) {
      var dom = '@' + KNOWN_ADMIN_DOMAINS[i];
      if (clean.endsWith(dom)) return true;
    }
    return false;
  }

  function checkAdminEmailDynamically(email) {
    // WAJIB: Batalkan timer sebelumnya di baris pertama agar request lama tidak menimpa saat mengetik cepat!
    clearTimeout(adminCheckDebounceTimer);
    var clean = (email || '').trim().toLowerCase();

    if (!clean) {
      setAdminModeUI(false);
      return;
    }

    // 1. Cek Sinkron Instan (0ms): Langsung deteksi di browser tanpa jeda network!
    if (isEmailAdmin(clean)) {
      setAdminModeUI(true, clean);
      return;
    }

    // 2. Debounced asynchronous check ke backend untuk email baru/dinamis
    var currentSeq = ++adminCheckSeq;
    if (clean.includes('@') && clean.includes('.')) {
      adminCheckDebounceTimer = setTimeout(function () {
        fetch('/api/admin/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clean })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          // Guard: Hanya proses jika ini adalah request terbaru (mencegah race condition ketik cepat)
          if (currentSeq !== adminCheckSeq) return;

          if (data && data.is_admin) {
            if (KNOWN_ADMIN_EMAILS.indexOf(clean) === -1) {
              KNOWN_ADMIN_EMAILS.push(clean);
            }
            setAdminModeUI(true, clean, data.name);
          } else {
            setAdminModeUI(false);
          }
        })
        .catch(function () {
          if (currentSeq === adminCheckSeq) {
            setAdminModeUI(false);
          }
        });
      }, 150);
    } else {
      setAdminModeUI(false);
    }
  }

  function setAdminModeUI(active, email, name) {
    isAdminDetected = active;
    var emailPill = document.getElementById('login-email-pill');
    var emailAdminIcon = document.getElementById('login-email-admin-icon');
    var passPill = document.getElementById('login-password-pill');
    var passInput = document.getElementById('login-password');
    var notice = document.getElementById('admin-detected-notice');
    var submitBtn = document.getElementById('login-submit-btn');
    var descText = document.getElementById('comp1-desc-text');

    var loginForm = document.getElementById('auth-login-form');
    if (active) {
      if (emailPill) emailPill.classList.add('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'inline-flex';

      if (loginForm) loginForm.classList.add('is-admin-mode');

      // Apple smooth transition: hide password pill, reveal admin notice
      if (passPill) {
        passPill.classList.add('is-collapsed');
        setTimeout(function() {
          if (loginForm && loginForm.classList.contains('is-admin-mode')) {
            passPill.style.setProperty('display', 'none', 'important');
          }
        }, 280);
      }
      if (passInput) {
        passInput.disabled = true;
        passInput.removeAttribute('required');
        passInput.value = '';
      }
      if (notice) {
        notice.style.removeProperty('display');
        notice.style.display = 'flex';
        // Force reflow for smooth animation
        void notice.offsetWidth;
        notice.classList.add('is-visible');
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Verifikasi 2FA';
        submitBtn.title = 'Lanjut ke Verifikasi Admin 2FA';
        submitBtn.classList.add('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Kode OTP 6-digit akan dikirimkan ke email terhubung untuk memverifikasi sesi administrator.';
      }
    } else {
      if (emailPill) emailPill.classList.remove('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'none';

      if (loginForm) loginForm.classList.remove('is-admin-mode');

      // Restore password capsule and hide admin notice smoothly
      if (notice) {
        notice.classList.remove('is-visible');
        setTimeout(function() {
          if (loginForm && !loginForm.classList.contains('is-admin-mode')) {
            notice.style.setProperty('display', 'none', 'important');
          }
        }, 240);
      }
      if (passPill) {
        passPill.style.removeProperty('display');
        void passPill.offsetWidth;
        passPill.classList.remove('is-collapsed');
      }
      if (passInput) {
        passInput.disabled = false;
        passInput.setAttribute('required', '');
        passInput.placeholder = 'password';
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Login';
        submitBtn.title = 'Masuk ke Workspace';
        submitBtn.classList.remove('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Tidak semua keputusan klinis mudah, evaluasi 32 biomarker Neura hadir membantu ketepatan diagnosis presisi.';
      }
    }
  }

  // ─── ADMIN 2FA OTP FUNCTIONS ──────────────────────────────────────────
  function stopAdminOtpTimer() {
    if (adminOtpTimerInterval) {
      clearInterval(adminOtpTimerInterval);
      adminOtpTimerInterval = null;
    }
  }

  function startAdminOtpTimer(durationSeconds) {
    stopAdminOtpTimer();
    var timeLeft = durationSeconds || 300;
    function updateDisplay() {
      var m = Math.floor(timeLeft / 60);
      var s = timeLeft % 60;
      var str = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
      if (adminOtpTimer) adminOtpTimer.textContent = '(' + str + ')';
    }
    updateDisplay();
    adminOtpTimerInterval = setInterval(function () {
      timeLeft--;
      if (timeLeft <= 0) {
        stopAdminOtpTimer();
        if (adminOtpTimer) adminOtpTimer.textContent = '(Kedaluwarsa)';
        showAlert('Kode OTP telah kedaluwarsa. Silakan klik "Kirim ulang".', true);
      } else {
        updateDisplay();
      }
    }, 1000);
  }

  function showAdminVerifySlide(customEmail, name, maskedEmails, devOtp) {
    isInOnboardingStep = true;
    currentAdminEmail = customEmail;
    hideAlert();

    switchAuthView('admin-verify');

    if (adminCustomEmailDisplay) adminCustomEmailDisplay.textContent = customEmail;
    if (adminRealEmailDisplay) {
      var displayDest = Array.isArray(maskedEmails) ? maskedEmails.join(', ') : (maskedEmails || 'email terhubung');
      adminRealEmailDisplay.textContent = displayDest;
    }

    // Reset OTP boxes container & status banner
    var boxesWrap = document.getElementById('admin-otp-boxes-wrap');
    if (boxesWrap) boxesWrap.className = 'admin-otp-boxes-wrap';

    var statusBanner = document.getElementById('admin-verify-status-banner');
    if (statusBanner) statusBanner.style.display = 'none';

    if (btnSubmitAdminOtp) {
      setButtonLoading(btnSubmitAdminOtp, false);
      btnSubmitAdminOtp.classList.remove('is-verified-success');
      var btnLabel = btnSubmitAdminOtp.querySelector('.auth-btn-text');
      if (btnLabel) btnLabel.textContent = 'Verifikasi & Masuk sebagai Admin';
    }

    // Reset OTP input digits
    if (adminOtpDigits) {
      adminOtpDigits.forEach(function (input) {
        input.value = '';
        input.disabled = false;
        input.classList.remove('is-filled', 'is-error');
      });
      setTimeout(function () {
        if (adminOtpDigits[0]) adminOtpDigits[0].focus();
      }, 350);
    }
    if (adminFullOtp) adminFullOtp.value = '';

    startAdminOtpTimer(300);

    // Sembunyikan alert dev_otp agar OTP strictly dikirim via email admin terdaftar
    hideAlert();
  }

  function initAdminOtpDigitInputs() {
    if (!adminOtpDigits || !adminOtpDigits.length) return;

    adminOtpDigits.forEach(function (input, index) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          adminOtpDigits[index - 1].focus();
        }
      });

      input.addEventListener('input', function () {
        var val = input.value.replace(/[^0-9]/g, '');
        input.value = val ? val[0] : '';
        input.classList.remove('is-error');

        if (input.value) {
          input.classList.add('is-filled');
        } else {
          input.classList.remove('is-filled');
        }

        if (input.value && index < adminOtpDigits.length - 1) {
          adminOtpDigits[index + 1].focus();
        }

        var full = '';
        adminOtpDigits.forEach(function (d) { full += d.value; });
        if (adminFullOtp) adminFullOtp.value = full;

        // Auto login saat 6 digit terisi lengkap tanpa perlu klik tombol!
        if (full.length === 6) {
          handleAdminOtpVerification();
        }
      });

      input.addEventListener('paste', function (e) {
        e.preventDefault();
        var pasteData = (e.clipboardData || window.clipboardData).getData('text') || '';
        var cleanDigits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);
        if (cleanDigits) {
          for (var i = 0; i < adminOtpDigits.length; i++) {
            adminOtpDigits[i].value = cleanDigits[i] || '';
            adminOtpDigits[i].classList.remove('is-error');
            if (cleanDigits[i]) {
              adminOtpDigits[i].classList.add('is-filled');
            } else {
              adminOtpDigits[i].classList.remove('is-filled');
            }
          }
          if (adminFullOtp) adminFullOtp.value = cleanDigits;
          if (cleanDigits.length === 6) {
            handleAdminOtpVerification();
          } else {
            var nextEmpty = Math.min(cleanDigits.length, adminOtpDigits.length - 1);
            adminOtpDigits[nextEmpty].focus();
          }
        }
      });
    });
  }

  function handleAdminOtpVerification() {
    var otp = '';
    if (adminOtpDigits) {
      adminOtpDigits.forEach(function (d) { otp += d.value; });
    }
    if (!otp || otp.length < 6) {
      showAlert('Silakan masukkan 6 digit kode OTP verifikasi admin.', true);
      return;
    }

    hideAlert();

    var boxesWrap = document.getElementById('admin-otp-boxes-wrap');
    var statusBanner = document.getElementById('admin-verify-status-banner');
    var statusText = document.getElementById('admin-verify-status-text');

    // 1. Mulai Animasi Verifikasi (Wave / Pulse pada kotak digit)
    if (boxesWrap) {
      boxesWrap.classList.remove('is-error', 'is-success');
      boxesWrap.classList.add('is-verifying');
    }
    if (adminOtpDigits) {
      adminOtpDigits.forEach(function (d) { d.disabled = true; });
    }
    if (statusBanner) {
      statusBanner.className = 'verify-status-banner admin-status-banner is-verifying';
      if (statusText) statusText.textContent = 'Memverifikasi kode OTP 2FA...';
    }
    setButtonLoading(btnSubmitAdminOtp, true);

    fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentAdminEmail,
        otp: otp
      })
    })
    .then(function (res) {
      return res.text().then(function (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return {
            success: false,
            error: 'Respons server tidak valid (' + res.status + '). Silakan periksa koneksi atau log server.'
          };
        }
      });
    })
    .then(function (data) {
      if (data && data.success) {
        // 2. Animasi Sukses: Kotak-kotak berubah hijau berkilau
        if (boxesWrap) {
          boxesWrap.classList.remove('is-verifying', 'is-error');
          boxesWrap.classList.add('is-success');
        }
        if (statusBanner) {
          statusBanner.className = 'verify-status-banner admin-status-banner is-success';
          if (statusText) statusText.innerHTML = '&#10003;&nbsp; Kode OTP Valid! Mengalihkan ke Workspace...';
        }
        if (btnSubmitAdminOtp) {
          setButtonLoading(btnSubmitAdminOtp, false);
          btnSubmitAdminOtp.classList.add('is-verified-success');
          var btnText = btnSubmitAdminOtp.querySelector('.auth-btn-text');
          if (btnText) btnText.innerHTML = '&#10003; Terverifikasi!';
        }

        // 3. Auto login dengan delay animasi verify (1.2 detik)
        setTimeout(function () {
          stopAdminOtpTimer();
          localStorage.setItem('neura_user_role', 'Admin');
          localStorage.setItem('neura_admin_authenticated', 'true');
          sessionStorage.setItem('neura_admin_session', 'true');
          if (data && data.token) {
            localStorage.setItem('neura_admin_token', data.token);
            sessionStorage.setItem('neura_admin_token', data.token);
          }

          var adminName = (data.admin && data.admin.name) || (currentAdminData && currentAdminData.name) || 'Administrator';
          var adminUser = {
            uid: 'admin_' + Date.now(),
            email: currentAdminEmail,
            displayName: adminName,
            role: 'Admin',
            emailVerified: true
          };
          syncUserProfileToStorage(adminUser, adminName);

          showWelcomeSlide(adminUser, adminName);
        }, 1200);

      } else {
        // Error / OTP Salah
        setButtonLoading(btnSubmitAdminOtp, false);
        if (boxesWrap) {
          boxesWrap.classList.remove('is-verifying');
          boxesWrap.classList.add('is-error');
        }
        if (statusBanner) {
          statusBanner.style.display = 'none';
        }
        showAlert(data.error || 'Verifikasi OTP gagal. Silakan periksa kembali kode Anda.', true);

        setTimeout(function () {
          if (boxesWrap) boxesWrap.classList.remove('is-error');
          if (adminOtpDigits) {
            adminOtpDigits.forEach(function (d) {
              d.disabled = false;
              d.value = '';
              d.classList.remove('is-filled');
            });
            if (adminOtpDigits[0]) adminOtpDigits[0].focus();
          }
          if (adminFullOtp) adminFullOtp.value = '';
        }, 500);
      }
    })
    .catch(function (err) {
      setButtonLoading(btnSubmitAdminOtp, false);
      if (boxesWrap) boxesWrap.classList.remove('is-verifying');
      if (adminOtpDigits) {
        adminOtpDigits.forEach(function (d) { d.disabled = false; });
      }
      showAlert('Gagal menghubungi server: ' + err.message, true);
    });
  }

  var _isResendingAdminOtp = false;
  function handleAdminOtpResend() {
    if (!currentAdminEmail || _isResendingAdminOtp) return;
    _isResendingAdminOtp = true;
    setButtonLoading(btnResendAdminOtp, true);
    fetch('/api/admin/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentAdminEmail })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      _isResendingAdminOtp = false;
      setButtonLoading(btnResendAdminOtp, false);
      if (data && data.success) {
        startAdminOtpTimer(300);
        if (adminOtpDigits) {
          adminOtpDigits.forEach(function (d) {
            d.value = '';
            d.classList.remove('is-error');
          });
          if (adminOtpDigits[0]) adminOtpDigits[0].focus();
        }
        var msg = data.message || 'Kode OTP baru telah dikirimkan ke email terhubung.';
        showAlert(msg, false);
      } else {
        showAlert(data.error || 'Gagal mengirim ulang OTP.', true);
      }
    })
    .catch(function (err) {
      _isResendingAdminOtp = false;
      setButtonLoading(btnResendAdminOtp, false);
      showAlert('Gagal mengirim ulang OTP: ' + err.message, true);
    });
  }

  function startVerifyPolling() {
    stopVerifyPolling();
    verifyPollingInterval = setInterval(function () {
      var user = activeVerificationUser;
      if (!user && window.NeuraFirebase && window.NeuraFirebase.getAuth()) {
        user = window.NeuraFirebase.getAuth().currentUser;
      }
      if (!user) return;

      user.reload().then(function () {
        if (user.emailVerified) {
          stopVerifyPolling();
          showWelcomeSlide(user, activeVerificationName);
        }
      }).catch(function () {});
    }, 3200);
  }

  function stopVerifyPolling() {
    if (verifyPollingInterval) {
      clearInterval(verifyPollingInterval);
      verifyPollingInterval = null;
    }
  }

  function stopWelcomeCountdown() {
    if (welcomeCountdownTimer) {
      clearInterval(welcomeCountdownTimer);
      welcomeCountdownTimer = null;
    }
  }

  function showAlert(msg, isError, isHtml) {
    if (!alertBox || !alertText) return;
    if (isHtml) {
      alertText.innerHTML = msg;
    } else {
      alertText.textContent = msg;
    }
    alertBox.className = 'auth-alert ' + (isError ? 'is-error' : 'is-success');
    var icon = alertBox.querySelector('.auth-alert-icon');
    if (icon) {
      icon.innerHTML = isError
        ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
        : '<circle cx="12" cy="12" r="10"/><polyline points="16 9 10 15 8 13"/>';
    }
    alertBox.style.display = 'flex';
  }

  function hideAlert() {
    if (alertBox) {
      alertBox.style.display = 'none';
      alertBox.className = 'auth-alert';
    }
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  }

  function translateFirebaseError(err) {
    if (!err || !err.code) return err.message || 'Terjadi kesalahan sistem autentikasi.';
    switch (err.code) {
      case 'auth/invalid-email':
        return 'Format email tidak valid. Gunakan format nama@domain.com.';
      case 'auth/user-disabled':
        return 'Akun klinis ini telah dinonaktifkan.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
      case 'auth/email-already-in-use':
        return 'Email ini sudah terdaftar. Silakan pilih tab "Masuk".';
      case 'auth/weak-password':
        return 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.';
      case 'auth/popup-closed-by-user':
        return 'Jendela autentikasi Google ditutup sebelum selesai.';
      case 'auth/popup-blocked':
        return 'Popup browser diblokir. Harap izinkan popup untuk login dengan Google.';
      case 'auth/unauthorized-domain':
        return 'Domain ini belum diizinkan di Firebase. Harap tambahkan "localhost" & "127.0.0.1" ke Firebase Console > Authentication > Settings > Authorized domains.';
      case 'auth/too-many-requests':
        return 'Terlalu banyak permintaan ke server. Harap tunggu beberapa saat sebelum mencoba lagi.';
      case 'auth/network-request-failed':
        return 'Koneksi jaringan terputus. Harap periksa internet Anda.';
      // Firestore offline errors
      case 'unavailable':
      case 'firestore/unavailable':
        return 'Layanan database tidak tersedia saat ini. Harap periksa koneksi internet Anda.';
      case 'failed-precondition':
      case 'firestore/failed-precondition':
        return 'Koneksi ke database sedang offline. Harap aktifkan koneksi internet.';
      default:
        // Tangkap pesan mentah Firestore "client is offline"
        if (err.message && err.message.toLowerCase().includes('offline')) {
          return 'Tidak dapat terhubung ke server. Harap periksa koneksi internet Anda.';
        }
        return err.message || 'Terjadi kesalahan sistem.';
    }
  }

  function syncUserProfileToStorage(user, customName) {
    try {
      var displayName = customName || user.displayName || (user.email ? user.email.split('@')[0] : 'Dokter Neura');
      var profile = {
        name: displayName,
        email: user.email || '',
        uid: user.uid || '',
        photoURL: user.photoURL || '',
        authProvider: user.providerData && user.providerData[0] ? user.providerData[0].providerId : 'password',
        lastLogin: new Date().toISOString()
      };
      localStorage.setItem('neura_user_profile', JSON.stringify(profile));
      localStorage.setItem('neura_auth_user', JSON.stringify(profile));
    } catch (e) {
      console.warn('Gagal menyimpan profil ke localStorage:', e);
    }
  }

  function saveUserToFirestore(db, user, customName) {
    if (!db || !user || !user.uid) return Promise.resolve();
    var docData = {
      uid: user.uid,
      name: customName || user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      lastLogin: firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    };
    return db.collection('users').doc(user.uid).set(docData, { merge: true })
      .catch(function (err) {
        console.warn('[Neura Firestore] Simpan user warning:', err);
      });
  }

  function showLoggedState(user) {
    if (!user) return;

    var displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    var email = user.email || '';
    var savedRole = localStorage.getItem('neura_user_role') || user.role || 'User';
    var formattedName = displayName;
    if (savedRole === 'Nakes') {
      formattedName = displayName.startsWith('dr.') ? displayName : ('dr. ' + displayName.charAt(0).toUpperCase() + displayName.slice(1));
    } else if (savedRole === 'Admin') {
      formattedName = displayName.startsWith('Admin') ? displayName : ('Admin ' + displayName.charAt(0).toUpperCase() + displayName.slice(1));
    } else {
      formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    }

    var nameEl = document.getElementById('welcome-user-name');
    var roleEl = document.getElementById('welcome-user-role');
    var emailEl = document.getElementById('welcome-user-email');
    var avatarEl = document.getElementById('welcome-user-avatar');

    if (nameEl) nameEl.textContent = formattedName;
    if (roleEl) roleEl.textContent = '@' + savedRole.toLowerCase();
    if (emailEl) emailEl.textContent = email;

    if (avatarEl && user.photoURL) {
      avatarEl.src = user.photoURL;
    }

    // Update navbar button to show user name
    if (navLoginText) {
      var firstName = displayName.split(' ')[0] || 'Akun';
      navLoginText.textContent = firstName;
    }
    if (navLoginBtn) {
      navLoginBtn.title = 'Sesi Klinis Aktif: ' + displayName;
    }

    switchAuthView('profile');
  }

  function showUnloggedState() {
    if (navLoginText) navLoginText.textContent = 'Masuk';
    if (navLoginBtn) navLoginBtn.title = 'Buka Form Masuk / Registrasi';
    switchAuthView('welcome');
  }

  /**
   * Kirim email verifikasi "Confirm Email" HTML premium via server Gmail SMTP.
   * Mengirimkan idToken agar backend bisa generate OOB link resmi dari Firebase.
   */
  function sendCustomVerificationEmail(email, displayName, idToken) {
    var continueUrl = window.location.origin + '/verify-email';

    function postEmail(token) {
      return fetch('/api/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          displayName: displayName || '',
          continueUrl: continueUrl,
          idToken: token || ''
        })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          console.log('[Neura Email] Email verifikasi "Confirm Email" terkirim via SMTP ke', email);
          return true;
        } else {
          console.warn('[Neura Email] Gagal kirim via SMTP server:', data.error);
          return false;
        }
      })
      .catch(function (err) {
        console.warn('[Neura Email] Server SMTP request failed:', err);
        return false;
      });
    }

    if (idToken) {
      return postEmail(idToken);
    }

    var fb = window.NeuraFirebase;
    var user = activeVerificationUser || (fb && fb.getAuth() ? fb.getAuth().currentUser : null);
    if (user && typeof user.getIdToken === 'function') {
      return user.getIdToken(true).then(function (token) {
        return postEmail(token);
      }).catch(function () {
        return postEmail('');
      });
    }

    return postEmail('');
  }

  function _sendFirebaseVerificationEmail(email) {
    var fb = window.NeuraFirebase;
    var auth = fb ? fb.getAuth() : null;
    if (!auth || !auth.currentUser) return;
    auth.currentUser.sendEmailVerification({
      url: window.location.origin + '/verify-email'
    }).catch(function () {
      auth.currentUser && auth.currentUser.sendEmailVerification().catch(function () {});
    });
  }

  // Fallback demo simulation if Firebase API keys are not yet filled in .env
  function handleDemoAuth(email, name, provider) {
    showAlert('Kredensial Firebase di .env belum diisi. Mengaktifkan sesi demo klinis...', false);
    setTimeout(function () {
      var mockUser = {
        uid: 'demo_' + Date.now(),
        displayName: name || (email ? email.split('@')[0] : 'dr. Demo Klinisi'),
        email: email || 'klinisi.demo@neura.ai',
        photoURL: ''
      };
      syncUserProfileToStorage(mockUser, mockUser.displayName);
      showLoggedState(mockUser);
      showAlert('Berhasil masuk mode klinis! Anda akan dialihkan ke Workspace...', false);
      setTimeout(function () {
        window.location.href = '/app';
      }, 1200);
    }, 600);
  }

  function bindEvents() {
    // 1. Navbar Login Button (Main Trigger)
    if (navLoginBtn) {
      navLoginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleAuthCard(currentMode || 'profile');
      });
    }

    // 2. Mobile Drawer Login Button
    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var drawer = document.getElementById('nav-mobile-drawer');
        if (drawer) drawer.classList.remove('open');
        openAuthCard('welcome');
      });
    }

    // 3. Brain Visual Prompt Trigger & Hero Secondary Button
    if (heroBrainTrigger) {
      heroBrainTrigger.addEventListener('click', function (e) {
        e.preventDefault();
        openAuthCard('welcome');
      });
    }
    var heroSecondaryBtn = document.getElementById('hero-open-auth-btn');
    if (heroSecondaryBtn) {
      heroSecondaryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openAuthCard('welcome');
      });
    }

    // 4. Drawer Close Button & Backdrop Overlay Click
    if (authCloseBtn) {
      authCloseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeAuthCard();
      });
    }
    if (authOverlay) {
      authOverlay.addEventListener('click', function (e) {
        e.preventDefault();
        closeAuthCard();
      });
    }

    // 5. ESC key closes the auth card
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isAuthOpen) {
        closeAuthCard();
      }
    });

    // Neura 2026 Redesign: Top 3 Pills Navigation (Mockups 1, 2, 3, 4)
    var btnBackToWelcome = document.getElementById('auth-back-to-welcome-btn');
    if (btnBackToWelcome) {
      btnBackToWelcome.addEventListener('click', function (e) {
        e.preventDefault();
        switchAuthView('welcome');
      });
    }

    var pillLogin = document.getElementById('top-pill-login');
    var pillRegister = document.getElementById('top-pill-register');
    var pillForgot = document.getElementById('top-pill-forgot');
    if (pillLogin) {
      pillLogin.addEventListener('click', function () {
        switchAuthView('login');
      });
    }
    if (pillRegister) {
      pillRegister.addEventListener('click', function () {
        switchAuthView('register');
      });
    }
    if (pillForgot) {
      pillForgot.addEventListener('click', function () {
        switchAuthView('forgot');
      });
    }

    // "Login With Email" Capsule button (Image 1)
    var btnGotoEmail = document.getElementById('btn-goto-login-email');
    if (btnGotoEmail) {
      btnGotoEmail.addEventListener('click', function () {
        switchAuthView('login');
      });
    }

    // Forgot Password Form Submit Handler (Image 3)
    var forgotForm = document.getElementById('auth-forgot-form');
    if (forgotForm) {
      forgotForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var emailInput = document.getElementById('forgot-email');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          showAlert('Silakan masukkan email Anda.', true);
          return;
        }
        var submitBtn = document.getElementById('forgot-submit-btn');
        setButtonLoading(submitBtn, true);
        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        if (!auth) {
          setButtonLoading(submitBtn, false);
          showAlert('Tautan verifikasi reset telah dikirimkan ke ' + email, false);
          return;
        }
        auth.sendPasswordResetEmail(email)
          .then(function () {
            setButtonLoading(submitBtn, false);
            showAlert('Tautan verifikasi reset kata sandi telah dikirim ke ' + email + '. Silakan periksa kotak masuk email Anda.', false);
            setTimeout(function () {
              switchAuthView('login');
            }, 3000);
          })
          .catch(function (err) {
            setButtonLoading(submitBtn, false);
            showAlert(translateFirebaseError(err), true);
          });
      });
    }

    // 6. Tab switches inside form
    if (tabLoginBtn) {
      tabLoginBtn.addEventListener('click', function () {
        switchTab('login');
      });
    }
    if (tabRegisterBtn) {
      tabRegisterBtn.addEventListener('click', function () {
        switchTab('register');
      });
    }

    // Toggle mode switch on top of Component 1 ("Sign up" / "Log in")
    if (comp1ModeToggle) {
      comp1ModeToggle.addEventListener('click', function () {
        switchTab(currentMode === 'login' ? 'register' : 'login');
      });
    }

    // "I forgot" Password Reset Handler
    if (loginForgotBtn) {
      loginForgotBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var emailInput = document.getElementById('login-email');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          showAlert('Masukkan email Anda di kolom email terlebih dahulu, lalu klik "I forgot".', true);
          if (emailInput) emailInput.focus();
          return;
        }

        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          showAlert('Format email tidak valid. Harap periksa kembali alamat email Anda.', true);
          if (emailInput) emailInput.focus();
          return;
        }

        var fb = window.NeuraFirebase;
        var originalBtnText = loginForgotBtn.textContent;
        loginForgotBtn.textContent = 'Mengirim...';
        loginForgotBtn.disabled = true;

        var executeReset = function (authInstance) {
          if (authInstance) {
            return authInstance.sendPasswordResetEmail(email)
              .then(function () {
                showAlert('Tautan pemulihan kata sandi telah dikirimkan ke <strong>' + email + '</strong>. Silakan periksa kotak masuk atau spam email Anda.', false, true);
              })
              .catch(function (err) {
                if (err && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
                  showAlert('Email <strong>' + email + '</strong> belum terdaftar dalam sistem klinis Neura.', true, true);
                } else {
                  showAlert(translateFirebaseError(err), true);
                }
              });
          } else {
            showAlert('Mode Demo: Simulasi tautan pemulihan kata sandi telah disiapkan untuk ' + email, false);
            return Promise.resolve();
          }
        };

        if (fb && typeof fb.init === 'function') {
          fb.init().then(function (res) {
            var authInstance = (res && res.auth) || (fb.getAuth ? fb.getAuth() : null);
            return executeReset(authInstance);
          }).catch(function (err) {
            showAlert(translateFirebaseError(err), true);
          }).finally(function () {
            loginForgotBtn.textContent = originalBtnText;
            loginForgotBtn.disabled = false;
          });
        } else {
          var authInstance = fb && fb.getAuth ? fb.getAuth() : null;
          executeReset(authInstance).finally(function () {
            loginForgotBtn.textContent = originalBtnText;
            loginForgotBtn.disabled = false;
          });
        }
      });
    }

    // 7. Password visibility toggles
    function togglePasswordVisibility(btn) {
      if (!btn) return;
      var targetId = btn.getAttribute('data-target');
      var input = document.getElementById(targetId);
      if (!input) return;
      var isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';

      btn.setAttribute('aria-label', isPass ? 'Sembunyikan kata sandi' : 'Lihat kata sandi');
      btn.innerHTML = isPass
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

      try { input.focus(); } catch (err) {}
    }

    document.querySelectorAll('.auth-eye-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(btn);
      });
    });

    document.addEventListener('click', function (e) {
      var eyeBtn = e.target.closest ? e.target.closest('.auth-eye-btn') : null;
      if (eyeBtn) {
        e.preventDefault();
        e.stopPropagation();
        togglePasswordVisibility(eyeBtn);
      }
    });

    // 8. Google Authentication (Validasi Ketat: Masuk vs Registrasi)
    if (googleBtn) {
      googleBtn.addEventListener('click', function () {
        hideAlert();
        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        var googleProvider = fb ? fb.getGoogleProvider() : null;
        var db = fb ? fb.getDb() : null;

        var authMode = currentMode; // 'login' | 'register'

        if (!auth || !googleProvider || !fb.isConfigured()) {
          handleDemoAuth('dokter.google@neura.ai', 'dr. Mitra Google', 'google');
          return;
        }

        setButtonLoading(googleBtn, true);
        auth.signInWithPopup(googleProvider)
          .then(function (result) {
            var user = result.user;
            var isNewUser = Boolean(result.additionalUserInfo && result.additionalUserInfo.isNewUser);

            // Cek dokumen pengguna di Firestore untuk verifikasi status terdaftar
            // Jika Firestore offline, fallback ke flag isNewUser dari Firebase Auth
            var checkDbPromise = (db && user && user.uid)
              ? db.collection('users').doc(user.uid).get().catch(function () {
                  // Firestore tidak dapat dijangkau (offline) — gunakan data dari Auth saja
                  return { exists: !isNewUser };
                })
              : Promise.resolve({ exists: !isNewUser });

            return checkDbPromise.then(function (docSnap) {
              var isAlreadyRegistered = Boolean(docSnap && docSnap.exists);

              // -------------------------------------------------------------
              // KASUS 1: Tab "MASUK" (Login)
              // -------------------------------------------------------------
              if (authMode === 'login') {
                if (!isAlreadyRegistered && isNewUser) {
                  // User mencoba Masuk, tetapi akun Google ini belum pernah terdaftar!
                  setButtonLoading(googleBtn, false);
                  auth.signOut();
                  try { user.delete(); } catch (e) {}

                  showAlert(
                    '<strong>Akun Google Belum Terdaftar</strong><br>' +
                    'Akun <u>' + user.email + '</u> belum terdaftar sebagai praktisi klinis.<br>' +
                    '<button type="button" id="auth-switch-to-register-btn" class="auth-inline-link-btn">' +
                      '&#9998; Klik di sini untuk Mendaftar Akun Baru' +
                    '</button>',
                    true,
                    true
                  );

                  var switchBtn = document.getElementById('auth-switch-to-register-btn');
                  if (switchBtn) {
                    switchBtn.addEventListener('click', function () {
                      switchTab('register');
                    });
                  }
                  return;
                }

                // Akun valid & terdaftar -> Izinkan Masuk
                syncUserProfileToStorage(user);
                saveUserToFirestore(db, user);
                showAlert('Login dengan Google berhasil! Mengalihkan ke Workspace...', false);
                setTimeout(function () {
                  window.location.href = '/app';
                }, 900);
              }

              // -------------------------------------------------------------
              // KASUS 2: Tab "REGISTRASI" (Register)
              // -------------------------------------------------------------
              else {
                if (isAlreadyRegistered && !isNewUser) {
                  // User mencoba Daftar, padahal akun Google sudah terdaftar sebelumnya
                  syncUserProfileToStorage(user);
                  saveUserToFirestore(db, user);
                  showAlert(
                    '<strong>Akun Google Sudah Terdaftar!</strong><br>' +
                    'Selamat datang kembali, ' + (user.displayName || user.email) + '. Mengalihkan ke Workspace...',
                    false,
                    true
                  );
                  setTimeout(function () {
                    window.location.href = '/app';
                  }, 1000);
                  return;
                }

                // Akun baru -> Registrasi Google Berhasil
                syncUserProfileToStorage(user);
                saveUserToFirestore(db, user);
                showAlert(
                  '<strong>Pendaftaran Google Berhasil!</strong><br>' +
                  'Selamat datang dr. ' + (user.displayName || user.email.split('@')[0]) + '. Akun klinis Anda aktif. Mengalihkan...',
                  false,
                  true
                );
                setTimeout(function () {
                  window.location.href = '/app';
                }, 1000);
              }
            });
          })
          .catch(function (error) {
            setButtonLoading(googleBtn, false);
            showAlert(translateFirebaseError(error), true);
          });
      });
    }

    // 9. Email / Password Login (dengan Dukungan Email Custom Admin + 2FA)
    if (loginForm) {
      // Pasang listener input realtime untuk deteksi instan email admin (semua event keyboard & clipboard)
      var loginEmailInput = document.getElementById('login-email');
      if (loginEmailInput) {
        ['input', 'keyup', 'keydown', 'change', 'paste', 'cut', 'blur'].forEach(function (evt) {
          loginEmailInput.addEventListener(evt, function () {
            // Evaluasi instan langsung saat tombol ditekan
            checkAdminEmailDynamically(loginEmailInput.value);
          });
        });
      }

      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert();

        // Guard: cegah submit ganda / OTP terkirim lebih dari satu kali
        if (_isSendingOtp) return;

        var emailInput = document.getElementById('login-email');
        var passwordInput = document.getElementById('login-password');
        var email = emailInput ? emailInput.value.trim().toLowerCase() : '';
        var password = passwordInput ? passwordInput.value : '';

        // Simpan preferensi Remember Me (Ingat Saya: 30 hari aktif)
        var rememberBox = document.getElementById('login-remember-me');
        var isRemember = rememberBox ? rememberBox.checked : true;
        try {
          localStorage.setItem('neura_remember_me', isRemember ? 'true' : 'false');
        } catch (e) {}

        if (!email) {
          showAlert('Silakan isi email Anda.', true);
          return;
        }

        var isLocalAdmin = Boolean(isAdminDetected || isEmailAdmin(email));

        // Jika BUKAN admin, maka password wajib diisi
        if (!isLocalAdmin && !password) {
          showAlert('Silakan isi kata sandi Anda.', true);
          return;
        }

        _isSendingOtp = true; // Kunci segera: mencegah pengiriman duplikat
        setButtonLoading(loginSubmitBtn, true);

        // Jika terdeteksi admin secara lokal -> langsung kirim OTP tanpa buang waktu!
        if (isLocalAdmin) {
          fetch('/api/admin/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
          })
          .then(function (res) { return res.json(); })
          .then(function (otpResult) {
            _isSendingOtp = false;
            setButtonLoading(loginSubmitBtn, false);
            if (otpResult && otpResult.success) {
              // Gunakan nama dari API jika tersedia, fallback ke email prefix
              var adminName = (otpResult.name) || email.split('@')[0];
              currentAdminData = { name: adminName, custom_email: email };
              showAdminVerifySlide(email, adminName, otpResult.masked_emails, otpResult.dev_otp);
            } else {
              showAlert(otpResult.error || 'Gagal mengirimkan kode OTP admin.', true);
            }
          })
          .catch(function (err) {
            _isSendingOtp = false;
            setButtonLoading(loginSubmitBtn, false);
            showAlert('Gagal mengirim kode OTP admin: ' + err.message, true);
          });
          return;
        }

        // Cek ke server untuk admin lain yang belum ada di local list
        fetch('/api/admin/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        })
        .then(function (res) { return res.json(); })
        .then(function (checkResult) {
          if (checkResult && checkResult.is_admin) {
            fetch('/api/admin/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email })
            })
            .then(function (res) { return res.json(); })
            .then(function (otpResult) {
              _isSendingOtp = false;
              setButtonLoading(loginSubmitBtn, false);
              if (otpResult && otpResult.success) {
                currentAdminData = checkResult;
                showAdminVerifySlide(email, checkResult.name, otpResult.masked_emails, otpResult.dev_otp);
              } else {
                showAlert(otpResult.error || 'Gagal mengirimkan kode OTP admin.', true);
              }
            })
            .catch(function (err) {
              _isSendingOtp = false;
              setButtonLoading(loginSubmitBtn, false);
              showAlert('Gagal mengirim kode OTP admin: ' + err.message, true);
            });
            return;
          }

          _isSendingOtp = false;

          // Bukan admin -> Cek dulu apakah email nakes (@neura.ns.id atau email asli)
          // Intercept login nakes sebelum Firebase Auth
          var isNakesEmail = email.endsWith('@neura.ns.id');

          // Fungsi untuk login via Firebase setelah nakes check gagal / tidak applicable
          function doFirebaseLogin() {
            var fb = window.NeuraFirebase;
            var auth = fb ? fb.getAuth() : null;

            if (!auth || !fb.isConfigured()) {
              setButtonLoading(loginSubmitBtn, false);
              handleDemoAuth(email, '', 'password');
              return;
            }

            auth.signInWithEmailAndPassword(email, password)
              .then(function (result) {
                setButtonLoading(loginSubmitBtn, false);
                var user = result.user;
                if (!user.emailVerified) {
                  showVerifySlide(user, '', user.email);
                  return;
                }
                showWelcomeSlide(user, user.displayName);
              })
              .catch(function (error) {
                setButtonLoading(loginSubmitBtn, false);
                showAlert(translateFirebaseError(error), true);
              });
          }

          // Jika email adalah @neura.ns.id, coba login nakes dulu
          if (isNakesEmail) {
            fetch('/api/nakes/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email, password: password })
            })
            .then(function (res) { return res.json(); })
            .then(function (nakesResult) {
              if (nakesResult && nakesResult.success && nakesResult.user) {
                setButtonLoading(loginSubmitBtn, false);
                var nu = nakesResult.user;
                var nakesUser = {
                  uid: nu.uid || ('nks_' + Date.now()),
                  displayName: nu.name || nu.displayName || email.split('@')[0],
                  email: nu.email || email,
                  photoURL: '',
                  role: 'Nakes'
                };
                // Bersihkan cache dokumen & riwayat user lama agar tidak tersangkut ke nakes
                try {
                  localStorage.removeItem('neura_last_consultation');
                  localStorage.removeItem('neura_active_patient_doc');
                  localStorage.removeItem('neura_last_nakes_verified_code');
                  localStorage.removeItem('neura_recent_chats_v2');
                  localStorage.removeItem('neura_active_session_id_v2');
                  localStorage.removeItem('neura_draft_chat_input_v2');
                } catch (e) { }

                // Simpan sesi nakes ke localStorage
                localStorage.setItem('neura_user_role', 'Nakes');
                localStorage.setItem('neura_nakes_session', JSON.stringify(nu));
                syncUserProfileToStorage(nakesUser, nakesUser.displayName);
                showLoggedState(nakesUser);
                showAlert('Selamat datang, ' + nakesUser.displayName + '! Mengalihkan ke Workspace...', false);
                setTimeout(function () { window.location.href = '/app'; }, 1200);
              } else {
                setButtonLoading(loginSubmitBtn, false);
                showAlert(nakesResult.error || 'Email atau kata sandi Nakes tidak cocok.', true);
              }
            })
            .catch(function () {
              // Fallback ke Firebase jika server tidak tersedia
              doFirebaseLogin();
            });
            return;
          }

          // Email biasa (bukan nakes) -> Firebase
          doFirebaseLogin();
        })
        .catch(function () {
          var fb = window.NeuraFirebase;
          var auth = fb ? fb.getAuth() : null;

          if (!auth || !fb.isConfigured()) {
            setButtonLoading(loginSubmitBtn, false);
            handleDemoAuth(email, '', 'password');
            return;
          }

          auth.signInWithEmailAndPassword(email, password)
            .then(function (result) {
              setButtonLoading(loginSubmitBtn, false);
              var user = result.user;
              if (!user.emailVerified) {
                showVerifySlide(user, '', user.email);
                return;
              }
              showWelcomeSlide(user, user.displayName);
            })
            .catch(function (error) {
              setButtonLoading(loginSubmitBtn, false);
              showAlert(translateFirebaseError(error), true);
            });
        });
      });
    }

    // 10. Email / Password Register dengan Transisi ke Slide Verify
    if (registerForm) {
      registerForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert();

        var nameInput = document.getElementById('register-name');
        var emailInput = document.getElementById('register-email');
        var passwordInput = document.getElementById('register-password');

        var name = nameInput ? nameInput.value.trim() : '';
        var email = emailInput ? emailInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';

        if (!name || name.length < 2) {
          showAlert('Harap masukkan nama lengkap Anda.', true);
          return;
        }
        if (!email || !password) {
          showAlert('Harap isi email dan kata sandi.', true);
          return;
        }
        if (password.length < 6) {
          showAlert('Kata sandi minimal 6 karakter demi keamanan rekam medis.', true);
          return;
        }

        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        var db = fb ? fb.getDb() : null;

        if (!auth || !fb.isConfigured()) {
          handleDemoAuth(email, name, 'password');
          return;
        }

        setButtonLoading(registerSubmitBtn, true);
        auth.createUserWithEmailAndPassword(email, password)
          .then(function (result) {
            var user = result.user;

            // Step 1: Update display name
            var updateProfilePromise = user.updateProfile({ displayName: name }).catch(function () {});

            // Step 2: Simpan ke Firestore & kirim email verifikasi via server SMTP (non-blocking)
            updateProfilePromise.then(function () {
              // Simpan ke Firestore (non-blocking)
              saveUserToFirestore(db, user, name);

              // Ambil idToken user dan kirim custom email "Confirm Email" via Gmail SMTP
              user.getIdToken(true).then(function (token) {
                sendCustomVerificationEmail(user.email, name, token);
              }).catch(function () {
                sendCustomVerificationEmail(user.email, name, '');
              });
            });

            // Step 3: Langsung tampilkan slide verify tanpa menunggu side effects
            setButtonLoading(registerSubmitBtn, false);
            registerForm.reset();
            showVerifySlide(user, name, email);
          })
          .catch(function (error) {
            setButtonLoading(registerSubmitBtn, false);
            showAlert(translateFirebaseError(error), true);
          });
      });
    }

    // Listener Tombol Slide Verifikasi
    if (btnCheckVerified) {
      btnCheckVerified.addEventListener('click', function () {
        var user = activeVerificationUser;
        if (!user && window.NeuraFirebase && window.NeuraFirebase.getAuth()) {
          user = window.NeuraFirebase.getAuth().currentUser;
        }

        if (!user) {
          showAlert('Sesi verifikasi telah berakhir. Silakan masuk kembali.', true);
          switchTab('login');
          return;
        }

        setButtonLoading(btnCheckVerified, true);
        user.reload().then(function () {
          setButtonLoading(btnCheckVerified, false);
          if (user.emailVerified) {
            // Berhasil diverifikasi -> Transisi ke Slide 4 (Welcome)
            showWelcomeSlide(user, activeVerificationName);
          } else {
            if (verifyStatusBannerText) {
              verifyStatusBannerText.textContent = 'Email belum terkonfirmasi aktif. Harap klik tautan di email Anda.';
              verifyStatusBannerText.style.color = '#dc2626';
              setTimeout(function () {
                if (verifyStatusBannerText) {
                  verifyStatusBannerText.textContent = 'Menunggu aktivasi email Anda...';
                  verifyStatusBannerText.style.color = '';
                }
              }, 4000);
            }
          }
        }).catch(function (err) {
          setButtonLoading(btnCheckVerified, false);
          showAlert(translateFirebaseError(err), true);
        });
      });
    }

    if (btnResendVerification) {
      btnResendVerification.addEventListener('click', function () {
        var user = activeVerificationUser;
        if (!user && window.NeuraFirebase && window.NeuraFirebase.getAuth()) {
          user = window.NeuraFirebase.getAuth().currentUser;
        }
        if (!user) return;

        btnResendVerification.disabled = true;
        btnResendVerification.textContent = 'Mengirim...';

        user.getIdToken(true).then(function (token) {
          return sendCustomVerificationEmail(user.email, activeVerificationName, token);
        }).then(function (success) {
          if (success) {
            btnResendVerification.textContent = '✓ Email Terkirim!';
            showAlert('Tautan verifikasi "Confirm Email" berhasil dikirim ulang ke ' + user.email, false);
          } else {
            btnResendVerification.textContent = 'Gagal Mengirim';
            showAlert('Gagal mengirim ulang email verifikasi. Coba beberapa saat lagi.', true);
          }
          setTimeout(function () {
            btnResendVerification.disabled = false;
            btnResendVerification.innerHTML = '&#9993; Kirim Ulang Tautan';
          }, 4000);
        }).catch(function (err) {
          btnResendVerification.disabled = false;
          btnResendVerification.innerHTML = '&#9993; Kirim Ulang Tautan';
          showAlert(translateFirebaseError(err), true);
        });
      });
    }

    if (btnCancelVerify) {
      btnCancelVerify.addEventListener('click', function () {
        stopVerifyPolling();
        var fb = window.NeuraFirebase;
        if (fb && fb.getAuth()) fb.getAuth().signOut();
        switchTab('login');
      });
    }

    // Listener Card Verifikasi Admin (2FA OTP)
    initAdminOtpDigitInputs();

    if (btnSubmitAdminOtp) {
      btnSubmitAdminOtp.addEventListener('click', function () {
        handleAdminOtpVerification();
      });
    }

    if (btnResendAdminOtp) {
      btnResendAdminOtp.addEventListener('click', function () {
        handleAdminOtpResend();
      });
    }

    if (btnCancelAdminVerify) {
      btnCancelAdminVerify.addEventListener('click', function () {
        stopAdminOtpTimer();
        switchTab('login');
      });
    }

    // 11. Logout (Ganti Akun / Keluar)
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try {
          var fb = window.NeuraFirebase;
          var auth = fb && typeof fb.getAuth === 'function' ? fb.getAuth() : null;
          if (auth && typeof auth.signOut === 'function') {
            auth.signOut().catch(function () {});
          }
          if (typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
            try { firebase.auth().signOut().catch(function () {}); } catch (e) {}
          }
        } catch (e) {}

        // Bersihkan sesi server-side & cookies
        try {
          fetch('/api/user/logout-session', { method: 'POST', credentials: 'include' }).catch(function () {});
          fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(function () {});
        } catch (e) {}

        // Bersihkan seluruh data sesi, riwayat, dan dokumen
        if (typeof window.clearAllUserSessionData === 'function') {
          window.clearAllUserSessionData();
        } else {
          try {
            localStorage.removeItem('neura_auth_user');
            localStorage.removeItem('neura_user_profile');
            localStorage.removeItem('neura_user_role');
            localStorage.removeItem('neura_nakes_session');
            localStorage.removeItem('neura_admin_authenticated');
            localStorage.removeItem('neura_admin_token');
            localStorage.removeItem('neura_active_session_id_v2');
            localStorage.removeItem('neura_recent_chats_v2');
            localStorage.removeItem('neura_last_consultation');
            localStorage.removeItem('neura_active_patient_doc');
            localStorage.removeItem('neura_last_nakes_verified_code');
            localStorage.removeItem('neura_draft_chat_input_v2');
          } catch (e) { }
        }
        try { sessionStorage.clear(); } catch (e) {}

        showUnloggedState();
        switchTab('login');
        showAlert('Anda telah berhasil keluar dari sesi akun.', false, true);
      });
    }
  }

  // Observe Firebase Auth State
  function monitorAuthState() {
    var urlParams = new URLSearchParams(window.location.search);
    var isJustLoggedOut = urlParams.get('logged_out') === 'true';

    if (window.NeuraFirebase) {
      window.NeuraFirebase.init().then(function (fbInstance) {
        if (fbInstance.auth) {
          if (isJustLoggedOut) {
            try { fbInstance.auth.signOut().catch(function () {}); } catch (e) {}
          }

          fbInstance.auth.onAuthStateChanged(function (user) {
            if (isJustLoggedOut) {
              showUnloggedState();
              return;
            }

            if (user) {
              // Jika login via email/password tapi belum diverifikasi, jangan tampilkan sesi login
              var isPasswordUser = user.providerData && user.providerData.some(function (p) {
                return p.providerId === 'password';
              });
              if (isPasswordUser && !user.emailVerified) {
                // Jika sedang di slide verify/welcome, jangan reset UI
                if (!isInOnboardingStep) {
                  showUnloggedState();
                }
                return;
              }

              syncUserProfileToStorage(user);
              showLoggedState(user);
            } else {
              // Cek apakah ada sesi admin yang sah sebelum me-reset UI ke unlogged
              try {
                var isAdmin = localStorage.getItem('neura_admin_authenticated') === 'true' ||
                              sessionStorage.getItem('neura_admin_session') === 'true';
                var cachedAdmin = localStorage.getItem('neura_auth_user');
                if (isAdmin && cachedAdmin) {
                  var parsedAdmin = JSON.parse(cachedAdmin);
                  if (parsedAdmin && (parsedAdmin.role === 'Admin' || (parsedAdmin.email && parsedAdmin.email.toLowerCase().endsWith('@neura.dr.id')))) {
                    showLoggedState(parsedAdmin);
                    return;
                  }
                }
              } catch (e) {}

              // Jika sedang di slide verify/welcome, jangan reset UI
              if (!isInOnboardingStep) {
                showUnloggedState();
              }
            }
          });
        } else {
          if (isJustLoggedOut) {
            showUnloggedState();
            return;
          }
          // Check cached local user
          var cached = localStorage.getItem('neura_auth_user');
          if (cached) {
            try {
              var parsed = JSON.parse(cached);
              if (parsed && parsed.email) showLoggedState(parsed);
            } catch (e) {}
          }
        }
      });
    }
  }

  // Expose global methods
  window.openAuthCard = openAuthCard;
  window.closeAuthCard = closeAuthCard;
  window.switchAuthView = switchAuthView;
  window.logoutCurrentSession = function () {
    if (logoutBtn) {
      logoutBtn.click();
    } else {
      try {
        if (window.NeuraFirebase && window.NeuraFirebase.getAuth()) {
          window.NeuraFirebase.getAuth().signOut().catch(function () {});
        }
      } catch (e) {}
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      showUnloggedState();
      switchAuthView('welcome');
      showAlert('Anda telah berhasil keluar dari sesi akun.', false, true);
    }
  };
  window.toggleAuthCard = toggleAuthCard;

  // Component 3 Dynamic Date Formatter
  function initComp3Date() {
    var now = new Date();
    var monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var monthsFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    var daysName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    var mShort = monthsShort[now.getMonth()];
    var mFull = monthsFull[now.getMonth()];
    var dName = daysName[now.getDay()];
    var dDate = String(now.getDate()).padStart(2, '0');
    var year = now.getFullYear();

    var heroMonth = document.getElementById('comp3-hero-month');
    var heroYear = document.getElementById('comp3-hero-year');
    var stripDay = document.getElementById('comp3-strip-day');
    var stripDate = document.getElementById('comp3-strip-date');

    if (heroMonth) heroMonth.textContent = mShort;
    if (heroYear) heroYear.textContent = year;
    if (stripDay) stripDay.textContent = dName + ' ' + dDate;
    if (stripDate) stripDate.textContent = mFull + ' ' + year;
  }

  document.addEventListener('DOMContentLoaded', function () {
    initElements();
    initComp3Date();
    initRememberMeButton();
    loadAdminEmailsList();
    bindEvents();
    monitorAuthState();

    // Deteksi parameter URL (?verified=true | ?unverified=true | ?auth_required=true)
    // Bersihkan URL setelah dibaca agar tidak persist saat refresh
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var paramVerified     = urlParams.get('verified');
      var paramUnverified   = urlParams.get('unverified');
      var paramAuthRequired = urlParams.get('auth_required');
      var paramLoggedOut    = urlParams.get('logged_out');
      var paramUnverEmail   = urlParams.get('email') || '';

      // Bersihkan URL params segera agar refresh tidak re-trigger
      if (paramVerified || paramUnverified || paramAuthRequired || paramLoggedOut) {
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
      }

      if (paramLoggedOut === 'true') {
        showUnloggedState();
        switchTab('login');
        setTimeout(function () {
          showUnloggedState();
          switchTab('login');
          openAuthCard('login');
          showAlert(
            '<strong>Berhasil Keluar</strong><br>' +
            'Sesi akun Anda telah ditutup dengan aman. Silakan masuk kembali kapan saja.',
            false,
            true
          );
        }, 300);
      } else if (paramVerified === 'true') {
        setTimeout(function () {
          openAuthCard('login');
          var fb = window.NeuraFirebase;
          var curUser = fb && fb.getAuth() ? fb.getAuth().currentUser : null;
          if (curUser) {
            curUser.reload().then(function () {
              if (curUser.emailVerified) {
                showWelcomeSlide(curUser);
                return;
              }
              showAlert(
                '<strong>Email Anda Telah Diverifikasi!</strong><br>' +
                'Akun klinis Anda kini aktif. Silakan masukkan kata sandi untuk mengakses Workspace.',
                false,
                true
              );
            }).catch(function () {
              showAlert(
                '<strong>Email Anda Telah Diverifikasi!</strong><br>' +
                'Akun klinis Anda kini aktif. Silakan masukkan kata sandi untuk mengakses Workspace.',
                false,
                true
              );
            });
          } else {
            showAlert(
              '<strong>Email Anda Telah Diverifikasi!</strong><br>' +
              'Akun klinis Anda kini aktif. Silakan masukkan kata sandi untuk mengakses Workspace.',
              false,
              true
            );
          }
        }, 500);

      } else if (paramUnverified === 'true') {
        setTimeout(function () {
          openAuthCard('login');
          if (paramUnverEmail) {
            var emailField = document.getElementById('login-email');
            if (emailField) emailField.value = paramUnverEmail;
          }
          showAlert(
            '<strong>Wajib Verifikasi Akun!</strong><br>' +
            'Anda wajib memverifikasi akun email ' + (paramUnverEmail ? '<u>' + paramUnverEmail + '</u>' : '') + ' sebelum dapat mengakses Workspace Dashboard.<br>' +
            'Harap periksa kotak masuk (inbox) atau spam email Anda.',
            true,
            true
          );
        }, 500);

      // Auto-display hero auth card on desktop screen: default ke card profile (Mockup 4)
      if (window.innerWidth >= 1024 && !paramLoggedOut && !paramAuthRequired && !paramVerified && !paramUnverified) {
        setTimeout(function () {
          var viewParam = urlParams.get('view');
          if (viewParam) {
            openAuthCard(viewParam);
            return;
          }
          var cached = localStorage.getItem('neura_auth_user');
          if (cached) {
            try {
              var parsed = JSON.parse(cached);
              if (parsed && parsed.email) {
                openAuthCard('profile');
                return;
              }
            } catch (e) {}
          }
          openAuthCard('profile');
        }, 150);
      }
      
      } else if (paramAuthRequired === 'true') {
        // Cek dulu apakah sesi admin aktif: jika ya langsung redirect ke /app
        try {
          var isAdmin = localStorage.getItem('neura_admin_authenticated') === 'true' ||
                        sessionStorage.getItem('neura_admin_session') === 'true';
          var rawUser = localStorage.getItem('neura_auth_user');
          if (isAdmin && rawUser) {
            var parsed = JSON.parse(rawUser);
            if (parsed && (parsed.role === 'Admin' || (parsed.email && parsed.email.toLowerCase().endsWith('@neura.dr.id')))) {
              window.location.replace('/app');
              return;
            }
          }
        } catch (e) {}

        // Sebelum buka drawer, cek apakah user sudah login & verified
        // Jika ya → langsung redirect ke /app
        if (window.NeuraFirebase) {
          window.NeuraFirebase.init().then(function (fb) {
            if (fb && fb.auth) {
              // Beri waktu onAuthStateChanged terpanggil
              var checkTimer = setTimeout(function () {
                // Timeout: tidak ada sesi aktif → buka drawer
                openAuthCard('login');
                showAlert(
                  '<strong>Akses Terbatas</strong><br>' +
                  'Silakan masuk atau registrasi untuk mengakses Workspace & 32 Biomarker Pasien.',
                  true,
                  true
                );
              }, 1500);

              fb.auth.onAuthStateChanged(function (user) {
                clearTimeout(checkTimer);
                if (!user) {
                  // Tidak ada sesi → buka drawer
                  openAuthCard('login');
                  showAlert(
                    '<strong>Akses Terbatas</strong><br>' +
                    'Silakan masuk atau registrasi untuk mengakses Workspace & 32 Biomarker Pasien.',
                    true,
                    true
                  );
                  return;
                }

                var isPasswordUser = user.providerData && user.providerData.some(function (p) {
                  return p.providerId === 'password';
                });

                if (!isPasswordUser) {
                  // Google user → verified, redirect ke /app
                  window.location.replace('/app');
                  return;
                }

                // Email/password user: reload untuk cek status verifikasi terkini
                user.reload().then(function () {
                  var fresh = fb.auth.currentUser;
                  if (fresh && fresh.emailVerified) {
                    // Sudah verified → redirect ke /app
                    window.location.replace('/app');
                  } else {
                    // Belum verified → buka drawer dengan pesan unverified
                    openAuthCard('login');
                    showAlert(
                      '<strong>Wajib Verifikasi Akun!</strong><br>' +
                      'Silakan verifikasi email ' + (user.email ? '<u>' + user.email + '</u>' : '') + ' terlebih dahulu.',
                      true,
                      true
                    );
                  }
                }).catch(function () {
                  openAuthCard('login');
                  showAlert(
                    '<strong>Akses Terbatas</strong><br>' +
                    'Silakan masuk atau registrasi untuk mengakses Workspace & 32 Biomarker Pasien.',
                    true,
                    true
                  );
                });
              });
            } else {
              // Firebase tidak siap → buka drawer
              setTimeout(function () {
                openAuthCard('login');
                showAlert(
                  '<strong>Akses Terbatas</strong><br>' +
                  'Silakan masuk atau registrasi untuk mengakses Workspace & 32 Biomarker Pasien.',
                  true,
                  true
                );
              }, 500);
            }
          });
        } else {
          setTimeout(function () {
            openAuthCard('login');
            showAlert(
              '<strong>Akses Terbatas</strong><br>' +
              'Silakan masuk atau registrasi untuk mengakses Workspace & 32 Biomarker Pasien.',
              true,
              true
            );
          }, 500);
        }
      }
    } catch (e) {}
  });
})();
