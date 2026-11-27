/* ==========================================================================
   NEURA AI — GLOBAL WAVE LOADSCREEN & PAGE REFRESH CONTROLLER
   Auto-injects wave overlay on initial load, refresh (F5/Ctrl+R), & navigation
   ========================================================================== */
(function () {
  'use strict';

  if (window.NeuraLoadscreen) return;

  const PENDING_KEY = 'neura_nav_pending_label';
  const MIN_SHOW_MS = 600;
  const MAX_STUCK_MS = 4000;
  let _shownAt = 0;
  let _failsafeTimer = null;
  let _hideTimer = null;

  const ROUTE_LABELS = [
    ['/nakes/register', 'Menyiapkan Registrasi Nakes...'],
    ['/nakes', 'Membuka Nakes Hub...'],
    ['/admin', 'Membuka Admin Hub...'],
    ['/chat', 'Memuat Konsultasi Neura...'],
    ['/riset', 'Memuat Modul Riset...'],
    ['/app/struktur', 'Membuka Struktur Database...'],
    ['/neurapet', 'Memuat NeuraPet...'],
    ['/welcome', 'Membuka Beranda Neura...']
  ];

  function resolveRouteLabel(urlStr) {
    try {
      const u = new URL(urlStr, window.location.origin);
      const p = u.pathname.toLowerCase();
      for (const [prefix, label] of ROUTE_LABELS) {
        if (p.startsWith(prefix)) return label;
      }
    } catch (_) {}
    return 'Memuat halaman...';
  }

  function isReloadNavigation() {
    try {
      const nav = performance.getEntriesByType && performance.getEntriesByType('navigation');
      if (nav && nav[0] && nav[0].type === 'reload') return true;
    } catch (_) {}
    return false;
  }

  function applySavedTheme() {
    try {
      const t = localStorage.getItem('neura_theme_v1') || localStorage.getItem('neura-theme');
      if (t === 'dark' && !document.documentElement.getAttribute('data-theme')) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (_) {}
  }

  function ensureElement() {
    let el = document.getElementById('neura-global-loadscreen');
    if (el) return el;
    applySavedTheme();

    el = document.createElement('div');
    el.id = 'neura-global-loadscreen';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div class="ngl-wave-layer" aria-hidden="true">
        <svg class="ngl-wave-svg ngl-wave-svg--back" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,60 C150,110 300,10 450,60 C600,110 750,10 900,60 C1050,110 1200,10 1200,60 L1200,120 L0,120 Z" fill="#D97757" fill-opacity="0.35" />
        </svg>
        <svg class="ngl-wave-svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,70 C200,20 400,115 600,70 C800,25 1000,115 1200,70 L1200,120 L0,120 Z" fill="#D97757" fill-opacity="0.5" />
        </svg>
      </div>
      <div class="ngl-card">
        <div class="ngl-loader-cluster" aria-hidden="true">
          <svg class="ngl-refresh-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <div class="ngl-wave-bars">
            <span class="ngl-wave-bar"></span>
            <span class="ngl-wave-bar"></span>
            <span class="ngl-wave-bar"></span>
            <span class="ngl-wave-bar"></span>
            <span class="ngl-wave-bar"></span>
          </div>
        </div>
        <div class="ngl-brand">NEURA AI</div>
        <div class="ngl-label" id="ngl-label">Memuat halaman...</div>
        <div class="ngl-progress-track"><div class="ngl-progress-bar"></div></div>
      </div>
    `;

    const parent = document.documentElement || document.body;
    parent.appendChild(el);
    return el;
  }

  function show(label) {
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
    const el = ensureElement();
    const lbl = document.getElementById('ngl-label');
    if (lbl && label) lbl.textContent = label;
    el.classList.remove('is-leaving');
    el.classList.add('is-visible');
    _shownAt = Date.now();

    if (_failsafeTimer) clearTimeout(_failsafeTimer);
    _failsafeTimer = setTimeout(() => hide(true), MAX_STUCK_MS);
  }

  function hide(immediate) {
    const doHide = () => {
      if (_failsafeTimer) {
        clearTimeout(_failsafeTimer);
        _failsafeTimer = null;
      }
      try { sessionStorage.removeItem(PENDING_KEY); } catch (_) {}
      const el = document.getElementById('neura-global-loadscreen');
      if (!el) return;
      el.classList.add('is-leaving');
      setTimeout(() => {
        el.classList.remove('is-visible', 'is-leaving');
      }, 280);
    };

    if (immediate) {
      doHide();
      return;
    }

    const elapsed = Date.now() - _shownAt;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(doHide, remaining);
  }

  function refresh(label) {
    const msg = label || 'Menyegarkan halaman...';
    try { sessionStorage.setItem(PENDING_KEY, msg); } catch (_) {}
    show(msg);
    setTimeout(() => {
      window.location.reload();
    }, 160);
  }

  // Always show on initial load & browser refresh so wave animation is visible
  let initialLabel = null;
  try {
    initialLabel = sessionStorage.getItem(PENDING_KEY);
  } catch (_) {}
  if (!initialLabel) {
    initialLabel = isReloadNavigation()
      ? 'Menyegarkan halaman...'
      : resolveRouteLabel(window.location.href);
  }
  show(initialLabel);

  if (document.readyState === 'complete') {
    hide(false);
  } else {
    document.addEventListener('DOMContentLoaded', () => hide(false));
    window.addEventListener('load', () => hide(false));
  }

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) hide(true);
  });

  // Intercept F5 / Ctrl+R / Cmd+R refresh keys to trigger wave loadscreen immediately
  document.addEventListener('keydown', (e) => {
    const isF5 = e.key === 'F5';
    const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R') && !e.shiftKey;
    if (isF5 || isCtrlR) {
      try { sessionStorage.setItem(PENDING_KEY, 'Menyegarkan halaman...'); } catch (_) {}
      show('Menyegarkan halaman...');
    }
  });

  // Intercept internal link clicks & inline location.href buttons automatically
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const inlineNav = e.target && e.target.closest ? e.target.closest('[onclick*="location"]') : null;
    if (inlineNav) {
      const oc = inlineNav.getAttribute('onclick') || '';
      let label = 'Memuat halaman...';
      if (oc.includes('/admin')) label = 'Membuka Admin Hub...';
      else if (oc.includes('/nakes')) label = 'Membuka Nakes Hub...';
      else if (oc.includes('/chat')) label = 'Memuat Konsultasi Neura...';
      try { sessionStorage.setItem(PENDING_KEY, label); } catch (_) {}
      show(label);
      return;
    }

    const anchor = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!anchor) return;
    if (anchor.hasAttribute('download')) return;
    const target = (anchor.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;

    const rawHref = anchor.getAttribute('href') || '';
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
      return;
    }

    let dest;
    try {
      dest = new URL(anchor.href, window.location.href);
    } catch (_) {
      return;
    }
    if (dest.origin !== window.location.origin) return;
    if (dest.pathname === window.location.pathname && dest.search === window.location.search) return;

    const label = resolveRouteLabel(dest.href);
    try { sessionStorage.setItem(PENDING_KEY, label); } catch (_) {}
    show(label);
  }, true);

  window.addEventListener('beforeunload', () => {
    let msg = 'Memuat halaman...';
    try {
      msg = sessionStorage.getItem(PENDING_KEY) || 'Menyegarkan halaman...';
      sessionStorage.setItem(PENDING_KEY, msg);
    } catch (_) {}
    show(msg);
  });

  window.NeuraLoadscreen = {
    show,
    hide,
    refresh,
    resolveRouteLabel
  };
})();
