/**
 * ══════════════════════════════════════════════════════════════════════════════
 * NEURA  —  IRIS APERTURE PAGE TRANSITION & REFRESH ENGINE  v4.2
 * ══════════════════════════════════════════════════════════════════════════════
 * Fitur:
 *  - Effect Lubang Membesar & Mengecil (Optical Iris Aperture Canvas 2D):
 *    * Saat berpindah halaman / refresh: Lubang aperture mengecil ke pusat/kursor
 *    * Saat tiba di halaman tujuan / setelah refresh: Lubang aperture membesar mekar
 *  - Intersepsi Shortcut Refresh: Menangkap Ctrl+R, Ctrl+Shift+R, F5, Cmd+R
 *    menjalankan animasi lubang mengecil sebelum reload.
 *  - Intersepsi Tombol Refresh Bawaan Browser: Menangkap beforeunload & pagehide,
 *    langsung memicu transisi lubang mengecil dan mendeteksi PerformanceNavigationTiming
 *    agar saat halaman reloaded dibuka, efek lubang membesar langsung berjalan.
 *  - Pre-render Blocking di <head>: Mencegah flash layar putih saat transisi.
 *  - Sinkronisasi dengan auth-cleared pada Workspace Dashboard (/app).
 * ══════════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var OVERLAY_COLOR     = '#080810';
  var EXIT_DELAY_MS     = 45;   // Jeda mikro sebelum lubang mulai mengecil
  var EXIT_DURATION_MS  = 620;  // Durasi lubang mengecil hingga tertutup
  var ENTRY_DELAY_MS    = 140;  // Jeda mikro di halaman tujuan sebelum lubang mekar
  var ENTRY_DURATION_MS = 1150; // Durasi lubang membesar membuka halaman
  var AUTH_MAX_WAIT_MS  = 3000;

  var KEY_X       = 'neura_iris_x';
  var KEY_Y       = 'neura_iris_y';
  var KEY_ACTIVE  = 'neura_iris_active';
  var KEY_REFRESH = 'neura_iris_refresh';

  // Koordinat live kursor untuk posisi pusat lubang aperture
  var liveCursorX = null;
  var liveCursorY = null;

  window.addEventListener('mousemove', function (e) {
    liveCursorX = e.clientX;
    liveCursorY = e.clientY;
  }, { passive: true });

  // Navigation Timing API: Mendeteksi apakah halaman dibuka akibat reload/refresh browser
  function isPageReload() {
    try {
      if (window.performance) {
        var navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          return navEntries[0].type === 'reload';
        }
        if (performance.navigation) {
          return performance.navigation.type === 1; // TYPE_RELOAD
        }
      }
    } catch (e) {}
    return false;
  }

  // Precision Cubic-Bezier Easing Solvers (Halus & bebas stutter 60-120 FPS)
  function createBezier(p1x, p1y, p2x, p2y) {
    function bx(t) { return 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t; }
    function by(t) { return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t; }
    function bxd(t) { return 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var cx = bx(t) - x;
        if (Math.abs(cx) < 1e-4) break;
        var slope = bxd(t);
        if (Math.abs(slope) < 1e-6) break;
        t -= cx / slope;
      }
      return by(t);
    };
  }

  // Kurva natural S-Curve untuk mengecil & Gentle QuintOut untuk membesar
  var easeExit  = createBezier(0.55, 0, 0.25, 1);
  var easeEntry = createBezier(0.2, 1, 0.32, 1);

  var canvasEl    = null;
  var ctx         = null;
  var isAnimating = false;
  var animFrameId = null;

  /**
   * Menghitung radius maksimal untuk menutupi seluruh 4 sudut viewport
   * dari titik pusat kursor/layar manapun.
   */
  function calcMaxRadius(originX, originY) {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var d1 = Math.hypot(originX, originY);
    var d2 = Math.hypot(w - originX, originY);
    var d3 = Math.hypot(originX, h - originY);
    var d4 = Math.hypot(w - originX, h - originY);
    return Math.ceil(Math.max(d1, d2, d3, d4) * 1.1) + 24;
  }

  /**
   * Inisialisasi Hardware Canvas 2D
   */
  function initCanvas() {
    if (!canvasEl) {
      canvasEl = document.createElement('canvas');
      canvasEl.id = 'neura-iris-canvas';
      canvasEl.setAttribute('aria-hidden', 'true');
      canvasEl.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100vw',
        'height:100vh',
        'z-index:999999',
        'pointer-events:all',
        'visibility:visible',
        'opacity:1'
      ].join(';') + ';';

      var root = document.documentElement || document.body;
      if (root) root.appendChild(canvasEl);
    }

    var dpr = window.devicePixelRatio || 1;
    var w = window.innerWidth;
    var h = window.innerHeight;

    if (canvasEl.width !== Math.round(w * dpr) || canvasEl.height !== Math.round(h * dpr)) {
      canvasEl.width  = Math.round(w * dpr);
      canvasEl.height = Math.round(h * dpr);
    }

    ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
  }

  function removeCanvas() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    var existing = document.getElementById('neura-iris-canvas');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    var closingOverlay = document.getElementById('neura-iris-closing-overlay');
    if (closingOverlay && closingOverlay.parentNode) {
      closingOverlay.parentNode.removeChild(closingOverlay);
    }
    canvasEl    = null;
    ctx         = null;
    isAnimating = false;
  }

  /**
   * Menggambar bingkai gelap solid dengan lubang optik aperture melingkar
   * (feathered multi-stop gradient) yang membesar atau mengecil.
   */
  function drawAperture(originX, originY, radius) {
    if (!ctx || !canvasEl) return;
    var w = window.innerWidth;
    var h = window.innerHeight;

    // Bingkai latar belakang solid gelap
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = OVERLAY_COLOR;
    ctx.fillRect(0, 0, w, h);

    if (radius <= 0) return;

    // Potong lubang aperture transparan di tengah dengan tepi halus (optical feathering)
    ctx.globalCompositeOperation = 'destination-out';

    if (radius > 4) {
      var feather = Math.min(6, Math.max(2.5, radius * 0.028));
      var grad = ctx.createRadialGradient(
        originX, originY, Math.max(0, radius - feather),
        originX, originY, radius + feather
      );
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.68, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(originX, originY, radius + feather, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(originX, originY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * EFEK LUBANG MENGECIL (Exit Transition):
   * Mengontraksikan lubang dari ukuran layar penuh hingga 0px ke pusat koordinat.
   */
  function exitTransition(originX, originY, href, callback) {
    if (isAnimating) return;
    isAnimating = true;

    try {
      sessionStorage.setItem(KEY_X, String(Math.round(originX)));
      sessionStorage.setItem(KEY_Y, String(Math.round(originY)));
      sessionStorage.setItem(KEY_ACTIVE, 'true');
    } catch (e) {}

    initCanvas();
    var maxR = calcMaxRadius(originX, originY);
    drawAperture(originX, originY, maxR);

    setTimeout(function () {
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var rawProgress = Math.min(1, elapsed / EXIT_DURATION_MS);
        var eased = easeExit(rawProgress);

        // Radius lubang mengecil dari maxR menuju 0
        var currentRadius = Math.max(0, maxR * (1 - eased));
        drawAperture(originX, originY, currentRadius);

        if (rawProgress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          // Tutup sempurna (radius 0) saat selesai
          drawAperture(originX, originY, 0);
          isAnimating = false;

          if (typeof callback === 'function') {
            callback();
          } else if (href) {
            window.location.href = href;
          }
        }
      }

      animFrameId = requestAnimationFrame(step);
    }, EXIT_DELAY_MS);
  }

  /**
   * EFEK LUBANG MEMBESAR (Entry Transition):
   * Memekarkan lubang aperture dari radius 0px membesar lembut membuka halaman tujuan.
   */
  function openIris() {
    if (!canvasEl) {
      initCanvas();
    }
    if (!canvasEl) return;

    var rawX = window.innerWidth / 2;
    var rawY = window.innerHeight / 2;

    try {
      var sx = sessionStorage.getItem(KEY_X);
      var sy = sessionStorage.getItem(KEY_Y);
      if (sx) rawX = parseFloat(sx);
      if (sy) rawY = parseFloat(sy);
    } catch (e) {}

    var irisX = (liveCursorX !== null && !sessionStorage.getItem(KEY_REFRESH)) ? liveCursorX : rawX;
    var irisY = (liveCursorY !== null && !sessionStorage.getItem(KEY_REFRESH)) ? liveCursorY : rawY;
    var targetRadius = calcMaxRadius(irisX, irisY);

    // Awali dengan kanvas solid (lubang radius 0)
    drawAperture(irisX, irisY, 0);

    setTimeout(function () {
      if (!canvasEl) return;
      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var rawProgress = Math.min(1, elapsed / ENTRY_DURATION_MS);
        var eased = easeEntry(rawProgress);

        // Radius lubang membesar dari 0 menuju targetRadius
        var currentRadius = targetRadius * eased;
        drawAperture(irisX, irisY, currentRadius);

        // Lepas blokir interaksi klik saat lubang terbuka 58%
        if (rawProgress > 0.58 && canvasEl && canvasEl.style.pointerEvents !== 'none') {
          canvasEl.style.pointerEvents = 'none';
        }

        // Fade-out halus di 18% akhir pemuaian
        if (rawProgress > 0.82 && canvasEl) {
          var fadeT = (rawProgress - 0.82) / 0.18;
          canvasEl.style.opacity = String(Math.max(0, 1 - fadeT));
        }

        if (rawProgress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          removeCanvas();
        }
      }

      animFrameId = requestAnimationFrame(step);
    }, ENTRY_DELAY_MS);
  }

  /**
   * Efek Lubang Mengecil Cepat saat tombol reload browser ditekan (beforeunload)
   */
  function triggerUnloadApertureClose(originX, originY) {
    if (document.getElementById('neura-iris-closing-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'neura-iris-closing-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'width:100vw',
      'height:100vh',
      'z-index:9999999',
      'pointer-events:all',
      'overflow:hidden'
    ].join(';') + ';';

    var maxR = calcMaxRadius(originX, originY);
    var size = maxR * 2;
    var hole = document.createElement('div');
    hole.style.cssText = [
      'position:absolute',
      'left:' + Math.round(originX - size / 2) + 'px',
      'top:' + Math.round(originY - size / 2) + 'px',
      'width:' + size + 'px',
      'height:' + size + 'px',
      'border-radius:50%',
      'box-shadow:0 0 0 9999px ' + OVERLAY_COLOR,
      'transition:transform 0.42s cubic-bezier(0.55, 0, 0.25, 1)',
      'transform:scale(1)',
      'transform-origin:center center',
      'pointer-events:none'
    ].join(';') + ';';

    overlay.appendChild(hole);
    var container = document.body || document.documentElement;
    if (container) container.appendChild(overlay);

    requestAnimationFrame(function () {
      hole.style.transform = 'scale(0)';
    });
  }

  /**
   * Koordinasi buka lubang dengan auth-cleared pada Workspace Dashboard (/app)
   */
  function waitForAuthClearedThenOpen() {
    var opened = false;
    var timer = null;
    var obs = null;

    function doOpen() {
      if (opened) return;
      opened = true;
      if (timer) clearTimeout(timer);
      if (obs) obs.disconnect();
      window.removeEventListener('neura:auth-cleared', doOpen);
      openIris();
    }

    if (document.body && document.body.classList.contains('auth-cleared')) {
      doOpen();
      return;
    }

    window.addEventListener('neura:auth-cleared', doOpen, { once: true });

    if (document.body && typeof MutationObserver !== 'undefined') {
      obs = new MutationObserver(function () {
        if (document.body && document.body.classList.contains('auth-cleared')) {
          doOpen();
        }
      });
      obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    timer = setTimeout(doOpen, AUTH_MAX_WAIT_MS);
  }

  /**
   * Entry Transition: Berjalan di halaman tujuan saat dimuat atau saat reload
   */
  function entryTransition() {
    var isReload = isPageReload();
    var shouldRun = false;

    try {
      shouldRun = (sessionStorage.getItem(KEY_ACTIVE) === 'true') || isReload;
      if (shouldRun) {
        sessionStorage.removeItem(KEY_ACTIVE);
        sessionStorage.removeItem(KEY_REFRESH);
      }
    } catch (e) {}

    if (!shouldRun) return;

    // Reset posisi scroll pada landing page
    if (window.location.pathname === '/' || window.location.pathname.startsWith('/welcome')) {
      try {
        window.scrollTo(0, 0);
      } catch (e) {}
    }

    // Siapkan canvas pada kondisi tertutup (radius: 0)
    initCanvas();
    drawAperture(window.innerWidth / 2, window.innerHeight / 2, 0);

    var authShield = document.getElementById('auth-shield-style');
    if (authShield && document.body && !document.body.classList.contains('auth-cleared')) {
      waitForAuthClearedThenOpen();
    } else {
      openIris();
    }

    // Safety watchdog: menjamin layar tidak pernah terkunci
    setTimeout(function () {
      removeCanvas();
    }, 4500);
  }

  /**
   * Intersepsi Shortcut Refresh: Ctrl+R, Ctrl+Shift+R, F5, Cmd+R
   * Menjalankan efek lubang mengecil sebelum me-reload halaman
   */
  function setupRefreshShortcuts() {
    window.addEventListener('keydown', function (e) {
      var isR = e.key === 'r' || e.key === 'R' || e.keyCode === 82;
      var isCtrlOrCmd = e.ctrlKey || e.metaKey;
      var isF5 = e.key === 'F5' || e.keyCode === 116;

      if ((isCtrlOrCmd && isR) || isF5) {
        e.preventDefault();
        e.stopPropagation();

        var originX = (liveCursorX !== null) ? liveCursorX : (window.innerWidth / 2);
        var originY = (liveCursorY !== null) ? liveCursorY : (window.innerHeight / 2);

        try {
          sessionStorage.setItem(KEY_X, String(Math.round(originX)));
          sessionStorage.setItem(KEY_Y, String(Math.round(originY)));
          sessionStorage.setItem(KEY_ACTIVE, 'true');
          sessionStorage.setItem(KEY_REFRESH, 'true');
        } catch (err) {}

        // Efek lubang mengecil -> panggil reload setelah tertutup
        exitTransition(originX, originY, null, function () {
          window.location.reload();
        });
      }
    }, true);
  }

  /**
   * Intersepsi Tombol Refresh Bawaan Browser:
   * Menangkap beforeunload & pagehide saat tombol reload toolbar ditekan
   */
  function setupBrowserReloadButton() {
    function onUnload() {
      var originX = (liveCursorX !== null) ? liveCursorX : (window.innerWidth / 2);
      var originY = (liveCursorY !== null) ? liveCursorY : (window.innerHeight / 2);

      try {
        sessionStorage.setItem(KEY_X, String(Math.round(originX)));
        sessionStorage.setItem(KEY_Y, String(Math.round(originY)));
        sessionStorage.setItem(KEY_ACTIVE, 'true');
        sessionStorage.setItem(KEY_REFRESH, 'true');
      } catch (e) {}

      triggerUnloadApertureClose(originX, originY);
    }

    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
  }

  /**
   * Intersepsi link navigasi internal
   */
  function shouldIntercept(anchor) {
    if (!anchor || !anchor.href) return false;
    try {
      var url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return false;
    } catch (e) { return false; }

    if (anchor.pathname === window.location.pathname && anchor.hash) return false;
    if (anchor.hasAttribute('download')) return false;
    if (anchor.target === '_blank') return false;
    if (anchor.href === window.location.href) return false;
    if (anchor.protocol === 'javascript:') return false;
    if (anchor.hasAttribute('data-no-transition')) return false;

    var NEURA_ROUTES = ['/', '/app', '/app/', '/welcome', '/welcome/', '/chat'];
    var onRoute = NEURA_ROUTES.some(function (r) {
      return anchor.pathname === r || anchor.pathname.startsWith(r);
    });

    return anchor.hasAttribute('data-transition') || onRoute;
  }

  function interceptLinks() {
    document.addEventListener('click', function (e) {
      if (isAnimating) return;
      var el = e.target;
      while (el && el.tagName !== 'A') el = el.parentElement;
      if (!el || !shouldIntercept(el)) return;

      e.preventDefault();
      e.stopPropagation();

      var clickX = e.clientX || (window.innerWidth / 2);
      var clickY = e.clientY || (window.innerHeight / 2);
      exitTransition(clickX, clickY, el.href);
    }, true);
  }

  /**
   * Pre-render blocking in head: Menutup layar dengan solid kanvas (radius 0)
   * segera saat script dieksekusi di <head> sebelum browser menggambar frame pertama.
   */
  function preRenderBlock() {
    var isReload = isPageReload();
    var shouldBlock = false;

    try {
      shouldBlock = (sessionStorage.getItem(KEY_ACTIVE) === 'true') || isReload;
    } catch (e) {}

    if (shouldBlock) {
      initCanvas();
      drawAperture(window.innerWidth / 2, window.innerHeight / 2, 0);
    }
  }

  // Public API
  window.NeuraTransition = {
    navigate: function (href, evt) {
      var x = evt ? evt.clientX : (window.innerWidth / 2);
      var y = evt ? evt.clientY : (window.innerHeight / 2);
      exitTransition(x, y, href);
    },
    exit: function (callback, evt) {
      var x = evt ? evt.clientX : (window.innerWidth / 2);
      var y = evt ? evt.clientY : (window.innerHeight / 2);
      exitTransition(x, y, null, callback);
    },
    open: function () {
      openIris();
    },
    get busy() { return isAnimating; }
  };

  // 1. Jalankan langsung di <head> untuk pre-render blocking
  preRenderBlock();

  // 2. Pasang pendengar shortcut & tombol reload bawaan browser
  setupRefreshShortcuts();
  setupBrowserReloadButton();

  // 3. Jalankan entry transition (lubang membesar) saat DOM siap
  function onReady() {
    entryTransition();
    interceptLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();