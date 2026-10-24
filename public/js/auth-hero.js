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
  var heroRight, authCard;
  var navLoginBtn, navLoginText, mobileLoginBtn;
  var authCloseBtn, heroBrainTrigger;
  var tabsNav, tabGlider, tabLoginBtn, tabRegisterBtn;
  var sliderTrack;
  var loginForm, registerForm;
  var googleBtn;
  var alertBox, alertText;
  var loggedView, loggedAvatar, loggedName, loggedEmail, logoutBtn;
  var loginSubmitBtn, registerSubmitBtn;

  function initElements() {
    heroRight = document.getElementById('hero-right');
    authCard = document.getElementById('hero-auth-card');
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
    alertBox = document.getElementById('auth-alert');
    alertText = document.getElementById('auth-alert-text');
    loggedView = document.getElementById('auth-logged-view');
    loggedAvatar = document.getElementById('auth-logged-avatar');
    loggedName = document.getElementById('auth-logged-name');
    loggedEmail = document.getElementById('auth-logged-email');
    logoutBtn = document.getElementById('auth-logout-btn');
    loginSubmitBtn = document.getElementById('login-submit-btn');
    registerSubmitBtn = document.getElementById('register-submit-btn');
  }

  // Open the Auth Card with slide-in animation
  function openAuthCard(mode) {
    isAuthOpen = true;
    if (heroRight) heroRight.classList.add('auth-open');
    if (navLoginBtn) navLoginBtn.classList.add('active');
    if (authCard) authCard.setAttribute('aria-hidden', 'false');

    if (mode) switchTab(mode);

    // If user is scrolled down, smooth scroll back to hero section
    if (window.scrollY > 80) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Auto focus first field after entrance animation
    setTimeout(function () {
      var targetInput = (mode === 'register')
        ? document.getElementById('register-name')
        : document.getElementById('login-email');
      if (targetInput) targetInput.focus();
    }, 320);
  }

  // Close the Auth Card and restore the brain showcase visual
  function closeAuthCard() {
    isAuthOpen = false;
    if (heroRight) heroRight.classList.remove('auth-open');
    if (navLoginBtn) navLoginBtn.classList.remove('active');
    if (authCard) authCard.setAttribute('aria-hidden', 'true');
    hideAlert();
  }

  function toggleAuthCard(mode) {
    if (heroRight && heroRight.classList.contains('auth-open')) {
      closeAuthCard();
    } else {
      openAuthCard(mode || 'login');
    }
  }

  function switchTab(mode) {
    currentMode = mode;
    hideAlert();

    if (mode === 'register') {
      if (tabsNav) tabsNav.classList.add('is-register');
      if (tabLoginBtn) tabLoginBtn.classList.remove('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
      if (sliderTrack) sliderTrack.classList.add('show-register');
    } else {
      if (tabsNav) tabsNav.classList.remove('is-register');
      if (tabLoginBtn) tabLoginBtn.classList.add('active');
      if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
      if (sliderTrack) sliderTrack.classList.remove('show-register');
    }
  }

  function showAlert(msg, isError) {
    if (!alertBox || !alertText) return;
    alertText.textContent = msg;
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
      case 'auth/network-request-failed':
        return 'Koneksi jaringan terputus. Harap periksa internet Anda.';
      default:
        return err.message;
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

    if (loggedName) loggedName.textContent = displayName;
    if (loggedEmail) loggedEmail.textContent = email;

    if (loggedAvatar) {
      if (user.photoURL) {
        loggedAvatar.innerHTML = '<img src="' + user.photoURL + '" alt="' + displayName + '" class="auth-avatar-img" />';
      } else {
        var initial = (displayName.charAt(0) || 'D').toUpperCase();
        loggedAvatar.innerHTML = '<div class="auth-avatar-fallback">' + initial + '</div>';
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

    // Hide input forms and slider tabs
    if (tabsNav) tabsNav.style.display = 'none';
    if (googleBtn) googleBtn.style.display = 'none';
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.style.display = 'none';
    if (sliderTrack) sliderTrack.parentElement.style.display = 'none';

    // Show logged view
    loggedView.style.display = 'flex';
  }

  function showUnloggedState() {
    if (loggedView) loggedView.style.display = 'none';
    if (tabsNav) tabsNav.style.display = 'grid';
    if (googleBtn) googleBtn.style.display = 'inline-flex';
    var divider = document.querySelector('.auth-divider');
    if (divider) divider.style.display = 'flex';
    if (sliderTrack) sliderTrack.parentElement.style.display = 'block';

    if (navLoginText) navLoginText.textContent = 'Masuk';
    if (navLoginBtn) navLoginBtn.title = 'Buka Form Masuk / Registrasi';
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

    // 4. Card Close Button
    if (authCloseBtn) {
      authCloseBtn.addEventListener('click', function (e) {
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

    // 8. Google Sign-In
    if (googleBtn) {
      googleBtn.addEventListener('click', function () {
        hideAlert();
        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        var googleProvider = fb ? fb.getGoogleProvider() : null;
        var db = fb ? fb.getDb() : null;

        if (!auth || !googleProvider || !fb.isConfigured()) {
          handleDemoAuth('dokter.google@neura.ai', 'dr. Mitra Google', 'google');
          return;
        }

        setButtonLoading(googleBtn, true);
        auth.signInWithPopup(googleProvider)
          .then(function (result) {
            var user = result.user;
            syncUserProfileToStorage(user);
            saveUserToFirestore(db, user);
            showAlert('Login dengan Google berhasil! Mengalihkan...', false);
            setTimeout(function () {
              window.location.href = '/app';
            }, 900);
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
            var user = result.user;
            syncUserProfileToStorage(user);
            saveUserToFirestore(db, user);
            showAlert('Autentikasi berhasil. Mengalihkan ke Workspace...', false);
            setTimeout(function () {
              window.location.href = '/app';
            }, 900);
          })
          .catch(function (error) {
            setButtonLoading(loginSubmitBtn, false);
            showAlert(translateFirebaseError(error), true);
          });
      });
    }

    // 10. Email / Password Register
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
            return user.updateProfile({ displayName: name })
              .then(function () {
                syncUserProfileToStorage(user, name);
                return saveUserToFirestore(db, user, name);
              })
              .then(function () {
                showAlert('Pendaftaran akun klinis berhasil! Mengalihkan...', false);
                setTimeout(function () {
                  window.location.href = '/app';
                }, 900);
              });
          })
          .catch(function (error) {
            setButtonLoading(registerSubmitBtn, false);
            showAlert(translateFirebaseError(error), true);
          });
      });
    }

    // 11. Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        var fb = window.NeuraFirebase;
        var auth = fb ? fb.getAuth() : null;
        if (auth && fb.isConfigured()) {
          auth.signOut().then(function () {
            localStorage.removeItem('neura_auth_user');
            showUnloggedState();
            showAlert('Anda telah keluar dari sesi klinis.', false);
          });
        } else {
          localStorage.removeItem('neura_auth_user');
          showUnloggedState();
          showAlert('Sesi demo telah diakhiri.', false);
        }
      });
    }
  }

  // Observe Firebase Auth State
  function monitorAuthState() {
    if (window.NeuraFirebase) {
      window.NeuraFirebase.init().then(function (fbInstance) {
        if (fbInstance.auth) {
          fbInstance.auth.onAuthStateChanged(function (user) {
            if (user) {
              syncUserProfileToStorage(user);
              showLoggedState(user);
            } else {
              // Check if localStorage has cached session
              var cached = localStorage.getItem('neura_auth_user');
              if (cached) {
                try {
                  var parsed = JSON.parse(cached);
                  if (parsed && parsed.email) {
                    showLoggedState(parsed);
                    return;
                  }
                } catch (e) {}
              }
              showUnloggedState();
            }
          });
        } else {
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

  document.addEventListener('DOMContentLoaded', function () {
    initElements();
    bindEvents();
    monitorAuthState();
  });
})();
