/**
 * NeuraLogoutModal — Shared Admin-style Logout Confirmation Popup
 * Used by Nakes Hub (/nakes), User Workspace (/chat), and Welcome (/welcome).
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'neura-logout-modal-styles';
  var BACKDROP_ID = 'neura-shared-logout-backdrop';
  var _onConfirm = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.nl-logout-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.48);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility .2s ease;font-family:"Inter",-apple-system,BlinkMacSystemFont,sans-serif}',
      '.nl-logout-backdrop.open{opacity:1;visibility:visible;pointer-events:auto}',
      '.nl-logout-modal{width:min(400px,100%);background:var(--hub-bg,#ffffff);border:1px solid var(--hub-border,#e5e7eb);border-radius:12px;box-shadow:0 20px 45px rgba(0,0,0,0.22);padding:18px;display:flex;flex-direction:column;gap:12px;transform:scale(0.96);transition:transform .22s cubic-bezier(0.16,1,0.3,1)}',
      '[data-theme="dark"] .nl-logout-modal{background:var(--hub-bg,#161615);border-color:var(--hub-border,#2a2a28)}',
      '.nl-logout-backdrop.open .nl-logout-modal{transform:scale(1)}',
      '.nl-logout-head{display:flex;align-items:center;gap:12px}',
      '.nl-logout-icon{width:38px;height:38px;border-radius:9px;background:rgba(220,38,38,0.1);border:1px solid rgba(220,38,38,0.25);color:#DC2626;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '[data-theme="dark"] .nl-logout-icon{color:#F87171}',
      '.nl-logout-title{margin:0;font-size:15px;font-weight:600;color:var(--hub-text,#111827)}',
      '[data-theme="dark"] .nl-logout-title{color:var(--hub-text,#f4f4f2)}',
      '.nl-logout-sub{margin:2px 0 0;font-size:12px;color:var(--hub-text-muted,#6b7280)}',
      '[data-theme="dark"] .nl-logout-sub{color:var(--hub-text-muted,#9ca3af)}',
      '.nl-logout-desc{margin:0;font-size:12.5px;line-height:1.5;color:var(--hub-text-secondary,#4b5563)}',
      '[data-theme="dark"] .nl-logout-desc{color:var(--hub-text-secondary,#d1d5db)}',
      '.nl-logout-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-top:4px}',
      '.nl-logout-cancel{height:32px;padding:0 14px;border-radius:7px;border:1px solid var(--hub-border,#d1d5db);background:transparent;color:var(--hub-text,#374151);font-size:12.5px;font-weight:500;cursor:pointer;transition:background .14s}',
      '[data-theme="dark"] .nl-logout-cancel{border-color:var(--hub-border,#333330);color:var(--hub-text,#e5e7eb)}',
      '.nl-logout-cancel:hover{background:rgba(128,128,128,0.1)}',
      '.nl-logout-confirm{height:32px;padding:0 14px;border-radius:7px;border:none;background:#DC2626;color:#FFFFFF;font-size:12.5px;font-weight:600;cursor:pointer;transition:filter .14s}',
      '.nl-logout-confirm:hover{filter:brightness(1.08)}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureModal() {
    ensureStyles();
    var backdrop = document.getElementById(BACKDROP_ID);
    if (backdrop) return backdrop;

    backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    backdrop.className = 'nl-logout-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = [
      '<div class="nl-logout-modal" role="dialog" aria-modal="true" aria-labelledby="nl-logout-title">',
      '  <div class="nl-logout-head">',
      '    <div class="nl-logout-icon">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">',
      '        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
      '        <polyline points="16 17 21 12 16 7"/>',
      '        <line x1="21" y1="12" x2="9" y2="12"/>',
      '      </svg>',
      '    </div>',
      '    <div>',
      '      <h3 class="nl-logout-title" id="nl-logout-title">Akhiri Sesi?</h3>',
      '      <p class="nl-logout-sub" id="nl-logout-sub">Sesi terautentikasi akan ditutup</p>',
      '    </div>',
      '  </div>',
      '  <p class="nl-logout-desc" id="nl-logout-desc"></p>',
      '  <div class="nl-logout-actions">',
      '    <button type="button" class="nl-logout-cancel" id="nl-logout-cancel">Batal</button>',
      '    <button type="button" class="nl-logout-confirm" id="nl-logout-confirm">Ya, Log Out</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(backdrop);

    function close() {
      backdrop.classList.remove('open');
      backdrop.setAttribute('aria-hidden', 'true');
      _onConfirm = null;
    }

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) close();
    });
    document.getElementById('nl-logout-cancel').addEventListener('click', close);
    document.getElementById('nl-logout-confirm').addEventListener('click', function () {
      var fn = _onConfirm;
      close();
      if (typeof fn === 'function') fn();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) close();
    });

    return backdrop;
  }

  global.NeuraLogoutModal = {
    open: function (opts) {
      opts = opts || {};
      var backdrop = ensureModal();
      document.getElementById('nl-logout-title').textContent = opts.title || 'Akhiri Sesi?';
      document.getElementById('nl-logout-sub').textContent = opts.subtitle || 'Sesi terautentikasi akan ditutup';
      document.getElementById('nl-logout-desc').textContent = opts.description || 'Anda akan keluar dari sesi saat ini dan perlu masuk kembali untuk mengakses halaman ini.';
      document.getElementById('nl-logout-confirm').textContent = opts.confirmLabel || 'Ya, Log Out';
      _onConfirm = opts.onConfirm || null;
      backdrop.classList.add('open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  };
})(window);
