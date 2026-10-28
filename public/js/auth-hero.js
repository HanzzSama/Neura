/**
 * public/js/auth-hero.js
 * Logika autentikasi Login & Registrasi (Email & Google) menggunakan Firebase Auth & Firestore.
 * Mengontrol slider tab interaktif, toggle password, feedback error, dan status sesi klinis.
 * Membuka/menutup form secara interaktif dari tombol "Masuk" di main navbar.
 */

(function () {
  'use strict';

  var currentMode = 'login'; // 'login' | 'register'
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
    registerForm = document.getElementById('auth-register-form');
    googleBtn = document.getElementById('auth-google-btn');
    googleBtnText = document.getElementById('auth-google-btn-text');
    googleTitle = document.getElementById('auth-google-title');
    googleSub = document.getElementById('auth-google-sub');
    dividerText = document.getElementById('auth-divider-text');
    alertBox = document.getElementById('auth-alert');
    alertText = document.getElementById('auth-alert-text');
    loggedView = document.getElementById('auth-logged-view');
    loggedAvatar = document.getElementById('auth-logged-avatar');
    loggedName = document.getElementById('auth-logged-name');
    loggedEmail = document.getElementById('auth-logged-email');
    logoutBtn = document.getElementById('auth-logout-btn');
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
  }

  // Open the Auth Drawer with slide-in from right animation
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
    document.body.classList.add('auth-drawer-open');
    document.body.style.overflow = 'hidden';

    if (navLoginBtn) navLoginBtn.classList.add('active');

    if (mode) switchTab(mode);

    // Auto focus first field after entrance animation
    setTimeout(function () {
      var targetInput = (mode === 'register')
        ? document.getElementById('register-name')
        : document.getElementById('login-email');
      if (targetInput) targetInput.focus();
    }, 320);
  }

  // Close the Auth Drawer and restore normal screen
  function closeAuthCard() {
    isAuthOpen = false;
    stopVerifyPolling();
    stopWelcomeCountdown();

    if (authCard) {
      authCard.classList.remove('is-open');
      authCard.classList.remove('in-step-mode');
      authCard.setAttribute('aria-hidden', 'true');
    }
    if (authOverlay) {
      authOverlay.classList.remove('is-open');
      authOverlay.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('auth-drawer-open');
    document.body.style.overflow = '';

    if (navLoginBtn) navLoginBtn.classList.remove('active');
    hideAlert();
  }

  function toggleAuthCard(mode) {
    if (authCard && authCard.classList.contains('is-open')) {
      closeAuthCard();
    } else {
      openAuthCard(mode || 'login');
    }
  }

  function switchTab(mode) {
    currentMode = mode;
    hideAlert();
    stopVerifyPolling();
    stopWelcomeCountdown();
    isInOnboardingStep = false; // Reset guard saat kembali ke tab normal

    if (authCard) authCard.classList.remove('in-step-mode');

    if (mode === 'register') {
      if (tabsNav) tabsNav.classList.add('is-register');
      if (tabLoginBtn) tabLoginBtn.classList.remove('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
      if (sliderTrack) sliderTrack.className = 'auth-slider-track show-register';
      if (googleTitle) googleTitle.innerHTML = 'Sign up with <span id="auth-google-btn-text">Google</span>';
      if (googleSub) googleSub.textContent = 'Registrasi akun klinis cepat & instan';
      if (googleBtn) googleBtn.title = 'Daftar Akun Baru dengan Google';
      if (dividerText) dividerText.textContent = 'atau daftar dengan email';
      if (comp1Title) comp1Title.textContent = 'Sign up';
      if (comp1ModeToggle) comp1ModeToggle.textContent = 'Log in';
    } else {
      if (tabsNav) tabsNav.classList.remove('is-register');
      if (tabLoginBtn) tabLoginBtn.classList.add('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
      if (sliderTrack) sliderTrack.className = 'auth-slider-track show-login';
      if (googleTitle) googleTitle.innerHTML = 'Log in with <span id="auth-google-btn-text">Google</span>';
      if (googleSub) googleSub.textContent = 'Single Sign-On Klinis Terverifikasi';
      if (googleBtn) googleBtn.title = 'Masuk dengan Akun Google Terdaftar';
      if (dividerText) dividerText.textContent = 'atau masuk dengan email';
      if (comp1Title) comp1Title.textContent = 'Log in';
      if (comp1ModeToggle) comp1ModeToggle.textContent = 'Sign up';
    }
    googleBtnText = document.getElementById('auth-google-btn-text');
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

    var displayName = customName || (user ? user.displayName : '') || 'Dokter';
    if (welcomeGreetingTitle) {
      welcomeGreetingTitle.textContent = 'Selamat Datang, dr. ' + displayName + '!';
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
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
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
    if (!loggedView) return;

    var displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna Klinis');
    var email = user.email || '';
    var formattedName = displayName.startsWith('dr.') ? displayName : ('dr. ' + displayName.charAt(0).toUpperCase() + displayName.slice(1));

    if (loggedName) loggedName.textContent = formattedName;
    if (loggedEmail) loggedEmail.textContent = email;

    if (loggedAvatar) {
      var initial = (displayName.charAt(0) || 'D').toUpperCase();
      var badgeSvg = '<span class="auth-avatar-badge" title="Akun Terverifikasi"><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></span>';

      if (user.photoURL) {
        loggedAvatar.innerHTML =
          '<img src="' + user.photoURL + '" alt="' + displayName + '" class="auth-avatar-img" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';" />' +
          '<div class="auth-avatar-fallback" style="display:none">' + initial + '</div>' +
          badgeSvg;
      } else {
        loggedAvatar.innerHTML =
          '<div class="auth-avatar-fallback">' + initial + '</div>' +
          badgeSvg;
      }
    }

    // Update navbar button to show user name
    if (navLoginText) {
      var firstName = displayName.split(' ')[0] || 'Akun';
      navLoginText.textContent = firstName;
    }
    if (navLoginBtn) {
      navLoginBtn.title = 'Sesi Klinis Aktif: ' + displayName;
    }

    // Add .is-logged-in to card to hide login headers ("Log in" / "Sign up")
    var formCard = document.getElementById('auth-comp-form-card');
    if (formCard) formCard.classList.add('is-logged-in');

    // Hide input forms and slider tabs
    if (tabsNav) tabsNav.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'none';
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.style.display = 'none';
    if (sliderTrack && sliderTrack.parentElement) sliderTrack.parentElement.style.display = 'none';

    // Show logged view
    loggedView.style.display = 'flex';
  }

  function showUnloggedState() {
    var formCard = document.getElementById('auth-comp-form-card');
    if (formCard) formCard.classList.remove('is-logged-in');

    if (loggedView) loggedView.style.display = 'none';
    if (tabsNav) tabsNav.style.display = 'grid';
    if (googleBtn) googleBtn.style.display = 'flex';
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.style.display = 'flex';
    if (sliderTrack && sliderTrack.parentElement) sliderTrack.parentElement.style.display = 'block';

    if (navLoginText) navLoginText.textContent = 'Masuk';
    if (navLoginBtn) navLoginBtn.title = 'Buka Form Masuk / Registrasi';
  }

  /**
   * Kirim email verifikasi HTML premium via server endpoint.
   * Server menggunakan Firebase Admin SDK + Gmail SMTP dengan pengirim "Neura AI".
   * Fallback ke Firebase sendEmailVerification jika server belum dikonfigurasi.
   */
  function sendCustomVerificationEmail(email, displayName) {
    var continueUrl = window.location.origin + '/verify-email';

    fetch('/api/send-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        displayName: displayName || '',
        continueUrl: continueUrl
      })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success) {
        console.log('[Neura Email] Email verifikasi "Neura AI" terkirim ke', email);
      } else if (data.smtp_required || data.admin_required) {
        // Server belum dikonfigurasi SMTP/Admin SDK — fallback ke Firebase email
        console.warn('[Neura Email] Server belum dikonfigurasi, fallback ke Firebase email:', data.error);
        _sendFirebaseVerificationEmail(email);
      } else {
        console.warn('[Neura Email] Gagal kirim via server:', data.error);
        _sendFirebaseVerificationEmail(email);
      }
    })
    .catch(function () {
      // Server tidak merespons — fallback ke Firebase email
      _sendFirebaseVerificationEmail(email);
    });
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
        toggleAuthCard('login');
      });
    }

    // 2. Mobile Drawer Login Button
    if (mobileLoginBtn) {
      mobileLoginBtn.addEventListener('click', function (e) {
        e.preventDefault();
        var drawer = document.getElementById('nav-mobile-drawer');
        if (drawer) drawer.classList.remove('open');
        openAuthCard('login');
      });
    }

    // 3. Brain Visual Prompt Trigger & Hero Secondary Button
    if (heroBrainTrigger) {
      heroBrainTrigger.addEventListener('click', function (e) {
        e.preventDefault();
        openAuthCard('login');
      });
    }
    var heroSecondaryBtn = document.getElementById('hero-open-auth-btn');
    if (heroSecondaryBtn) {
      heroSecondaryBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openAuthCard('login');
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
        var emailInput = document.getElementById('login-email');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          showAlert('Masukkan email Anda di kolom email terlebih dahulu, lalu klik "I forgot".', true);
          if (emailInput) emailInput.focus();
          return;
        }
        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        if (auth && fb.isConfigured()) {
          auth.sendPasswordResetEmail(email)
            .then(function () {
              showAlert('Tautan pemulihan kata sandi telah dikirimkan ke ' + email, false);
            })
            .catch(function (err) {
              showAlert(translateFirebaseError(err), true);
            });
        } else {
          showAlert('Tautan reset demo telah disimulasikan untuk ' + email, false);
        }
      });
    }

    // 7. Password visibility toggles
    document.querySelectorAll('.auth-eye-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-target');
        var input = document.getElementById(targetId);
        if (!input) return;
        var isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';

        // Swap icon
        btn.innerHTML = isPass
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      });
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

    // 9. Email / Password Login
    if (loginForm) {
      loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        hideAlert();

        var emailInput = document.getElementById('login-email');
        var passwordInput = document.getElementById('login-password');
        var email = emailInput ? emailInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';

        if (!email || !password) {
          showAlert('Silakan isi email dan kata sandi Anda.', true);
          return;
        }

        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        var db = fb ? fb.getDb() : null;

        if (!auth || !fb.isConfigured()) {
          handleDemoAuth(email, '', 'password');
          return;
        }

        setButtonLoading(loginSubmitBtn, true);
        auth.signInWithEmailAndPassword(email, password)
          .then(function (result) {
            setButtonLoading(loginSubmitBtn, false);
            var user = result.user;

            // Verifikasi Email Wajib untuk Keamanan Rekam Medis
            if (!user.emailVerified) {
              // Arahkan ke Slide Verifikasi
              showVerifySlide(user, '', user.email);
              return;
            }

            // Jika sudah terverifikasi, arahkan ke Slide Welcome
            showWelcomeSlide(user, user.displayName);
          })
          .catch(function (error) {
            setButtonLoading(loginSubmitBtn, false);
            showAlert(translateFirebaseError(error), true);
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

            // Step 2: Simpan ke Firestore & kirim email verifikasi via server (non-blocking)
            updateProfilePromise.then(function () {
              // Simpan ke Firestore (non-blocking)
              saveUserToFirestore(db, user, name);

              // Kirim custom HTML email "Neura AI" via server endpoint
              sendCustomVerificationEmail(user.email, name);
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
        user.sendEmailVerification({
          url: window.location.origin + '/welcome?verified=true'
        }).then(function () {
          btnResendVerification.textContent = '✓ Tautan Terkirim!';
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

        localStorage.removeItem('neura_auth_user');
        localStorage.removeItem('neura_user_profile');
        localStorage.removeItem('neura_active_session_id_v2');
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

      } else if (paramAuthRequired === 'true') {
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
