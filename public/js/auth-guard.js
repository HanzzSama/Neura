/**
 * public/js/auth-guard.js
 * Pelindung Keamanan Akses Halaman Workspace Dashboard (/app).
 *
 * Aturan Keamanan Klinis:
 * 1. Pengguna WAJIB terautentikasi melalui Firebase Auth (bukan localStorage).
 * 2. Pengguna email/password WAJIB memverifikasi email (emailVerified === true).
 * 3. Jika belum login atau belum verifikasi, akses DITOLAK dan diarahkan ke /welcome.
 *
 * TIDAK ADA fallback localStorage — Firebase Auth adalah satu-satunya sumber kebenaran.
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
  }

  function redirectToWelcome(reason, email) {
    if (redirected) return;
    redirected = true;

    try {
      localStorage.removeItem('neura_auth_user');
      localStorage.removeItem('neura_user_profile');
    } catch (e) {}

    var targetUrl = '/welcome?auth_required=true';
    if (reason === 'unverified') {
      targetUrl = '/welcome?unverified=true' + (email ? '&email=' + encodeURIComponent(email) : '');
    }

    window.location.replace(targetUrl);
  }

  function runGuard(fb) {
    if (!fb || !fb.auth || !fb.isConfigured) {
      redirectToWelcome('not_logged_in');
      return;
    }

    // Timeout: jika onAuthStateChanged tidak dipanggil dalam 8 detik
    var timeoutHandle = setTimeout(function () {
      if (!redirected) {
        redirectToWelcome('not_logged_in');
      }
    }, 8000);

    fb.auth.onAuthStateChanged(function (user) {
      clearTimeout(timeoutHandle);

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
    function doGuard() {
      window.NeuraFirebase.init().then(function (fb) {
        runGuard(fb);
      }).catch(function () {
        redirectToWelcome('not_logged_in');
      });
    }

    if (window.NeuraFirebase) {
      doGuard();
    } else {
      // Tunggu hingga firebase-config.js selesai dimuat (maks 5 detik)
      var waited = 0;
      var waitInterval = setInterval(function () {
        waited += 100;
        if (window.NeuraFirebase) {
          clearInterval(waitInterval);
          doGuard();
        } else if (waited >= 5000) {
          clearInterval(waitInterval);
          // Firebase SDK tidak tersedia — tolak akses
          redirectToWelcome('not_logged_in');
        }
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAccess);
  } else {
    checkAccess();
  }
})();
