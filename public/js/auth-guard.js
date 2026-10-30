/**
 * public/js/auth-guard.js
 * Pelindung Keamanan Akses Halaman Workspace Dashboard (/app).
 *
 * Aturan Akses:
 * 1. Administrator (2FA Terverifikasi): Diizinkan akses langsung dengan session token / admin authentication.
 * 2. Pengguna Klinis Demo: Diizinkan jika dalam mode demonstrasi offline.
 * 3. Pengguna Standar (Firebase Auth): WAJIB login & terverifikasi (emailVerified === true).
 * 4. Jika tidak memenuhi salah satu di atas: Akses ditolak dan diarahkan ke /welcome?auth_required=true.
 */

(function () {
  'use strict';

  var redirected = false;

  function releaseShield() {
    if (document.body) {
      document.body.classList.add('auth-cleared');
    }
    var shield = document.getElementById('auth-shield-style');
    if (shield) shield.remove();
    try {
      window.dispatchEvent(new CustomEvent('neura:auth-cleared'));
    } catch (e) {}
  }

  function isSpecialAuthenticated() {
    // 1. Cek Sesi Admin 2FA Terautentikasi
    try {
      var isAdminAuth = localStorage.getItem('neura_admin_authenticated') === 'true' ||
                        sessionStorage.getItem('neura_admin_session') === 'true';
      var rawUser = localStorage.getItem('neura_auth_user');
      if (isAdminAuth && rawUser) {
        var user = JSON.parse(rawUser);
        var email = (user && user.email ? user.email.toLowerCase().trim() : '');
        var role = (user && user.role ? user.role : (localStorage.getItem('neura_user_role') || ''));
        if (role === 'Admin' || (role && role.toLowerCase() === 'admin') || email.endsWith('@neura.dr.id') || email === 'muhammadhasan.cg@gmail.com') {
          return true;
        }
      }
    } catch (e) {}

    // 2. Cek Mode Demo Klinis
    try {
      var rawDemo = localStorage.getItem('neura_auth_user');
      if (rawDemo) {
        var demoUser = JSON.parse(rawDemo);
        if (demoUser && demoUser.uid && String(demoUser.uid).indexOf('demo_') === 0) {
          return true;
        }
      }
    } catch (e) {}

    // 3. Cek Sesi Tenaga Kesehatan (Nakes) - Login via /api/nakes/login
    try {
      var nakesRole = localStorage.getItem('neura_user_role');
      var nakesSession = localStorage.getItem('neura_nakes_session');
      if (nakesRole === 'Nakes' && nakesSession) {
        var ns = JSON.parse(nakesSession);
        if (ns && ns.email && ns.email.endsWith('@neura.ns.id')) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  }

  function verifyAdminSessionWithServer() {
    try {
      var token = localStorage.getItem('neura_admin_token') || sessionStorage.getItem('neura_admin_token');
      if (!token) return;
      fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.valid) {
          // Sesi di server sudah kedaluwarsa / dihapus
          localStorage.removeItem('neura_admin_authenticated');
          localStorage.removeItem('neura_admin_token');
          sessionStorage.removeItem('neura_admin_session');
          sessionStorage.removeItem('neura_admin_token');
          redirectToWelcome('session_expired');
        }
      })
      .catch(function () {});
    } catch (e) {}
  }

  function redirectToWelcome(reason, email) {
    if (redirected) return;
    if (isSpecialAuthenticated()) {
      releaseShield();
      return;
    }
    redirected = true;

    try {
      localStorage.removeItem('neura_auth_user');
      localStorage.removeItem('neura_user_profile');
      localStorage.removeItem('neura_nakes_session');
      localStorage.removeItem('neura_user_role');
      sessionStorage.setItem('neura_iris_active', 'true');
      sessionStorage.setItem('neura_iris_x', String(window.innerWidth / 2));
      sessionStorage.setItem('neura_iris_y', String(window.innerHeight / 2));
    } catch (e) {}

    var targetUrl = '/welcome?auth_required=true';
    if (reason === 'unverified') {
      targetUrl = '/welcome?unverified=true' + (email ? '&email=' + encodeURIComponent(email) : '');
    }

    window.location.replace(targetUrl);
  }

  function runGuard(fb) {
    if (isSpecialAuthenticated()) {
      releaseShield();
      verifyAdminSessionWithServer();
      return;
    }

    if (!fb || !fb.auth || !fb.isConfigured) {
      if (isSpecialAuthenticated()) {
        releaseShield();
        return;
      }
      redirectToWelcome('not_logged_in');
      return;
    }

    // Timeout: jika onAuthStateChanged tidak dipanggil dalam 8 detik
    var timeoutHandle = setTimeout(function () {
      if (!redirected) {
        if (isSpecialAuthenticated()) {
          releaseShield();
        } else {
          redirectToWelcome('not_logged_in');
        }
      }
    }, 8000);

    fb.auth.onAuthStateChanged(function (user) {
      clearTimeout(timeoutHandle);

      if (isSpecialAuthenticated()) {
        releaseShield();
        verifyAdminSessionWithServer();
        return;
      }

      if (!user) {
        redirectToWelcome('not_logged_in');
        return;
      }

      var isPasswordUser = user.providerData && user.providerData.some(function (p) {
        return p.providerId === 'password';
      });

      if (!isPasswordUser) {
        // Login via Google (OAuth) — izinkan masuk tanpa cek emailVerified
        updateLocalCache(user);
        releaseShield();
        return;
      }

      // Pengguna email/password: reload untuk cek status verifikasi terkini dari server Firebase
      user.reload().then(function () {
        var freshUser = fb.auth.currentUser;
        if (!freshUser || !freshUser.emailVerified) {
          // Belum diverifikasi — paksa sign out dan tolak akses
          fb.auth.signOut().catch(function () {});
          redirectToWelcome('unverified', user.email);
        } else {
          // Terverifikasi — izinkan masuk
          updateLocalCache(freshUser);
          releaseShield();
        }
      }).catch(function () {
        // Gagal reload (offline?) — tolak akses untuk keamanan
        fb.auth.signOut().catch(function () {});
        redirectToWelcome('unverified', user.email);
      });
    });
  }

  function updateLocalCache(user) {
    try {
      localStorage.setItem('neura_auth_user', JSON.stringify({
        name: user.displayName || (user.email ? user.email.split('@')[0] : 'Pengguna'),
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified
      }));
    } catch (e) {}
  }

  function checkAccess() {
    // 0ms Synchronous Check: Jika admin atau demo aktif, langsung buka shield seketika!
    if (isSpecialAuthenticated()) {
      releaseShield();
      verifyAdminSessionWithServer();
      return;
    }

    function doGuard() {
      if (isSpecialAuthenticated()) {
        releaseShield();
        return;
      }
      window.NeuraFirebase.init().then(function (fb) {
        runGuard(fb);
      }).catch(function () {
        if (!isSpecialAuthenticated()) {
          redirectToWelcome('not_logged_in');
        } else {
          releaseShield();
        }
      });
    }

    if (window.NeuraFirebase) {
      doGuard();
    } else {
      // Tunggu hingga firebase-config.js selesai dimuat (maks 5 detik)
      var waited = 0;
      var waitInterval = setInterval(function () {
        if (isSpecialAuthenticated()) {
          clearInterval(waitInterval);
          releaseShield();
          return;
        }
        waited += 100;
        if (window.NeuraFirebase) {
          clearInterval(waitInterval);
          doGuard();
        } else if (waited >= 5000) {
          clearInterval(waitInterval);
          if (!isSpecialAuthenticated()) {
            redirectToWelcome('not_logged_in');
          } else {
            releaseShield();
          }
        }
      }, 100);
    }
  }

  // Jalankan segera tanpa menunggu jika DOM sudah ada
  if (isSpecialAuthenticated()) {
    releaseShield();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccess);
  } else {
    checkAccess();
  }
})();
