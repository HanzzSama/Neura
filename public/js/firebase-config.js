/**
 * public/js/firebase-config.js
 * Inisialisasi Firebase Authentication & Cloud Firestore untuk Neura AI.
 * 
 * Mendukung konfigurasi otomatis dari server /api/firebase-config atau
 * dari window.FIREBASE_CONFIG / fallback lokal.
 */

(function () {
  'use strict';

  // Fallback configuration template.
  // Anda dapat mengisi kredensial di file .env atau langsung di objek ini:
  var DEFAULT_CONFIG = {
    apiKey: "AIzaSyD8XfBnr37fKwudLuJRWRAi2wMjU9KG838",
    authDomain: "neura-f20b9.firebaseapp.com",
    projectId: "neura-f20b9",
    storageBucket: "neura-f20b9.firebasestorage.app",
    messagingSenderId: "372520569422",
    appId: "1:372520569422:web:f200b0ccee225284f5911f",
  };

  var app = null;
  var auth = null;
  var db = null;
  var googleProvider = null;
  var isInitialized = false;
  var initPromise = null;

  function isConfigValid(cfg) {
    return Boolean(cfg && cfg.apiKey && cfg.apiKey.trim().length > 10 && !cfg.apiKey.includes('your_'));
  }

  function initFirebase() {
    if (initPromise) return initPromise;

    initPromise = new Promise(function (resolve) {
      // Coba fetch dari server /api/firebase-config, dengan fallback langsung ke DEFAULT_CONFIG
      fetch('/api/firebase-config')
        .then(function (res) {
          if (!res.ok) return DEFAULT_CONFIG;
          return res.json().catch(function () { return DEFAULT_CONFIG; });
        })
        .then(function (serverCfg) {
          var config = DEFAULT_CONFIG;
          if (isConfigValid(serverCfg)) {
            config = serverCfg;
          } else if (window.FIREBASE_CONFIG && isConfigValid(window.FIREBASE_CONFIG)) {
            config = window.FIREBASE_CONFIG;
          }

          if (typeof firebase !== 'undefined' && isConfigValid(config)) {
            try {
              if (!firebase.apps.length) {
                app = firebase.initializeApp(config);
              } else {
                app = firebase.app();
              }
              auth = firebase.auth();
              db = firebase.firestore ? firebase.firestore() : null;
              googleProvider = new firebase.auth.GoogleAuthProvider();
              googleProvider.setCustomParameters({ prompt: 'select_account' });
              isInitialized = true;
              console.log('[Neura Firebase] Inisialisasi Firebase Auth & Firestore berhasil.');
            } catch (err) {
              console.warn('[Neura Firebase] Inisialisasi error:', err);
            }
          } else {
            console.warn('[Neura Firebase] Kunci Firebase belum diisi di .env atau firebase-config.js. Mode demo aktif.');
          }

          resolve({
            app: app,
            auth: auth,
            db: db,
            googleProvider: googleProvider,
            isConfigured: isInitialized
          });
        })
        .catch(function (err) {
          console.warn('[Neura Firebase] Fetch config error, checking local fallback...', err);
          if (typeof firebase !== 'undefined' && isConfigValid(DEFAULT_CONFIG)) {
            try {
              app = firebase.initializeApp(DEFAULT_CONFIG);
              auth = firebase.auth();
              db = firebase.firestore ? firebase.firestore() : null;
              googleProvider = new firebase.auth.GoogleAuthProvider();
              isInitialized = true;
            } catch (e) {
              console.error(e);
            }
          }
          resolve({
            app: app,
            auth: auth,
            db: db,
            googleProvider: googleProvider,
            isConfigured: isInitialized
          });
        });
    });

    return initPromise;
  }

  // Expose global module
  window.NeuraFirebase = {
    init: initFirebase,
    get app() { return app; },
    get auth() { return auth; },
    get db() { return db; },
    get googleProvider() { return googleProvider; },
    getApp: function () { return app; },
    getAuth: function () { return auth; },
    getDb: function () { return db; },
    getGoogleProvider: function () { return googleProvider; },
    isConfigured: function () { return isInitialized; }
  };

  // Start initialization immediately
  initFirebase();
})();
