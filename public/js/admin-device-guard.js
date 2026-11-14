/**
 * public/js/admin-device-guard.js
 * =================================
 * Neura AI — Admin Device Restriction Guard.
 * 
 * Melarang akses halaman Administrator pada rasio perangkat Mobile maupun Tablet Mini
 * (Breakpoint: Lebar Layar <= 1024px).
 * Menampilkan Full-Page Alert dengan opsi beralih ke mode Pasien atau keluar sesi.
 */

(function () {
  'use strict';

  var RESTRICTED_MAX_WIDTH = 1024; // Mencakup Mobile (<=767px) dan Tablet Mini (768px - 1024px)
  var OVERLAY_ID = 'admin-device-alert-overlay';

  function isRestrictedScreen() {
    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    return width <= RESTRICTED_MAX_WIDTH;
  }

  function getDeviceCategory(width) {
    if (width <= 480) return 'Smartphone (Mobile)';
    if (width <= 767) return 'Large Mobile / Phablet';
    if (width <= 820) return 'Tablet Mini (Portrait)';
    return 'Tablet (Compact Viewport)';
  }

  function isAdminContext() {
    try {
      // 1. Cek Sesi / Role Admin Aktif
      var role = '';
      if (typeof getCurrentUserRole === 'function') {
        role = getCurrentUserRole();
      } else {
        role = localStorage.getItem('neura_user_role') || '';
      }
      var isAdminRole = (role && role.toLowerCase() === 'admin') ||
                        localStorage.getItem('neura_admin_authenticated') === 'true' ||
                        sessionStorage.getItem('neura_admin_session') === 'true';

      // 2. Cek apakah ada Admin Room yang sedang aktif di DOM
      var mainView = document.querySelector('.main-view');
      var isAdminRoomActive = mainView && mainView.classList.contains('admin-room-active');

      var adminRoomIds = ['admin-room-nakes', 'admin-room-stats', 'admin-room-explorer', 'admin-room-research'];
      var isAnyAdminRoomVisible = adminRoomIds.some(function (id) {
        var el = document.getElementById(id);
        if (!el) return false;
        var style = window.getComputedStyle(el);
        return style.display !== 'none' && el.getAttribute('aria-hidden') !== 'true';
      });

      // 3. Cek Modal Admin Nakes
      var adminModal = document.getElementById('admin-nakes-modal');
      var isModalOpen = adminModal && adminModal.classList.contains('open');

      // 4. Cek Halaman Struktur dengan mode admin atau role admin
      var isStrukturPage = window.location.pathname.indexOf('struktur') !== -1;
      var urlParams = new URLSearchParams(window.location.search);
      var modeParam = urlParams.get('mode');
      var isStrukturAdminMode = isStrukturPage && (modeParam === 'database' || modeParam === 'explorer' || isAdminRole);

      return isAdminRole || isAdminRoomActive || isAnyAdminRoomVisible || isModalOpen || isStrukturAdminMode;
    } catch (e) {
      return false;
    }
  }

  function ensureOverlayExists() {
    var overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'admin-device-alert-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.display = 'none';

    overlay.innerHTML = [
      '<div class="admin-device-alert-backdrop"></div>',
      '<div class="admin-device-alert-card">',
      '  <!-- Status Badge -->',
      '  <div class="admin-alert-badge-wrap">',
      '    <span class="admin-alert-badge-dot"></span>',
      '    <span class="admin-alert-badge-text">PORTAL GOVERNANCE &bull; DESKTOP ONLY</span>',
      '  </div>',
      '',
      '  <!-- Restricted Device Illustration -->',
      '  <div class="admin-alert-icon-box">',
      '    <svg class="admin-alert-icon-svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">',
      '      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>',
      '      <line x1="8" y1="21" x2="16" y2="21"></line>',
      '      <line x1="12" y1="17" x2="12" y2="21"></line>',
      '      <line x1="5" y1="7" x2="19" y2="13" stroke="#f43f5e" stroke-width="2.2"></line>',
      '    </svg>',
      '    <div class="admin-alert-glow-ring"></div>',
      '  </div>',
      '',
      '  <!-- Text Headings -->',
      '  <h2 class="admin-alert-title">Akses Halaman Admin Dibatasi</h2>',
      '  <p class="admin-alert-subtitle">',
      '    Halaman Administrator Neura AI tidak diizinkan untuk diakses melalui perangkat rasio <strong>Mobile</strong> maupun <strong>Tablet Mini</strong>.',
      '  </p>',
      '',
      '  <!-- Telemetry & Reason Box -->',
      '  <div class="admin-alert-info-box">',
      '    <div class="admin-alert-info-desc">',
      '      Tata kelola data klinis, audit 32 biomarker, telemetri ML, dan manajemen Nakes Kemenkes/KKI memerlukan kanvas visual layar penuh untuk menghindari kesalahan navigasi.',
      '    </div>',
      '    <div class="admin-alert-info-grid">',
      '      <div class="info-metric-card danger">',
      '        <span class="metric-title">Ukuran Layar Terdeteksi</span>',
      '        <span class="metric-val danger" id="admin-guard-current-size">0 &times; 0 px</span>',
      '        <span class="metric-sub" id="admin-guard-device-type">Mobile / Tablet Mini</span>',
      '      </div>',
      '      <div class="info-metric-card success">',
      '        <span class="metric-title">Persyaratan Minimal</span>',
      '        <span class="metric-val success">&ge; 1025 px</span>',
      '        <span class="metric-sub">Laptop / PC Desktop</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '',
      '  <!-- Actions -->',
      '  <div class="admin-alert-actions">',
      '    <button type="button" class="admin-alert-btn primary" id="admin-guard-btn-user-mode">',
      '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
      '      </svg>',
      '      <span>Beralih ke Chat Pasien (HP)</span>',
      '    </button>',
      '    <button type="button" class="admin-alert-btn secondary" id="admin-guard-btn-logout">',
      '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
      '        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>',
      '        <polyline points="16 17 21 12 16 7"></polyline>',
      '        <line x1="21" y1="12" x2="9" y2="12"></line>',
      '      </svg>',
      '      <span>Keluar Sesi Admin</span>',
      '    </button>',
      '  </div>',
      '',
      '  <div class="admin-alert-footer-note">',
      '    Sistem Keamanan Neura AI &bull; Device Resolution Policy v2.4',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(overlay);

    // Event handler tombol Beralih ke Mode Pasien
    var btnUserMode = overlay.querySelector('#admin-guard-btn-user-mode');
    if (btnUserMode) {
      btnUserMode.addEventListener('click', function () {
        handleSwitchToUserMode();
      });
    }

    // Event handler tombol Keluar Sesi Admin
    var btnLogout = overlay.querySelector('#admin-guard-btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', function () {
        handleAdminLogout();
      });
    }

    return overlay;
  }

  function handleSwitchToUserMode() {
    try {
      // 1. Tutup admin room jika sedang terbuka
      if (typeof switchAdminRoom === 'function') {
        switchAdminRoom('chat');
      }
      var mainView = document.querySelector('.main-view');
      if (mainView) mainView.classList.remove('admin-room-active');

      // 2. Tutup admin nakes modal jika terbuka
      var adminModal = document.getElementById('admin-nakes-modal');
      if (adminModal) adminModal.classList.remove('open');

      // 3. Ubah role menjadi User / Pasien
      localStorage.setItem('neura_user_role', 'User');

      // Sinkronisasi UI
      if (typeof syncUserProfileUI === 'function') syncUserProfileUI();
      if (typeof syncAdminNavVisibility === 'function') syncAdminNavVisibility();

      // Jika berada di halaman struktur / riset, arahkan kembali ke /app
      if (window.location.pathname.indexOf('struktur') !== -1 || window.location.pathname.indexOf('riset') !== -1) {
        window.location.href = '/app';
        return;
      }

      checkAdminDeviceGuard();
      if (typeof showToast === 'function') {
        showToast('Beralih ke mode Pasien. Fitur konsultasi aktif untuk layar mobile.', 'info');
      }
    } catch (e) {
      window.location.href = '/app';
    }
  }

  function handleAdminLogout() {
    try {
      if (typeof logoutAdmin === 'function') {
        logoutAdmin();
      } else {
        localStorage.removeItem('neura_admin_token');
        localStorage.removeItem('neura_admin_authenticated');
        localStorage.removeItem('neura_admin_name');
        localStorage.removeItem('neura_user_role');
        sessionStorage.removeItem('neura_admin_session');
        sessionStorage.removeItem('neura_admin_token');
        window.location.href = '/welcome';
      }
    } catch (e) {
      window.location.href = '/welcome';
    }
  }

  function checkAdminDeviceGuard() {
    var overlay = ensureOverlayExists();
    if (!overlay) return;

    var isRestricted = isRestrictedScreen();
    var inAdmin = isAdminContext();

    if (isRestricted && inAdmin) {
      // Tampilkan Alert Page Full
      var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

      var sizeEl = document.getElementById('admin-guard-current-size');
      if (sizeEl) sizeEl.innerHTML = width + ' &times; ' + height + ' px';

      var typeEl = document.getElementById('admin-guard-device-type');
      if (typeEl) typeEl.textContent = getDeviceCategory(width);

      overlay.style.display = 'flex';
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('admin-device-blocked');
    } else {
      // Sembunyikan Alert
      overlay.style.display = 'none';
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('admin-device-blocked');
    }
  }

  // Intercept switchAdminRoom agar langsung memblokir jika dipanggil di layar <= 1024px
  function patchSwitchAdminRoom() {
    if (typeof window.switchAdminRoom === 'function' && !window.switchAdminRoom._patchedByDeviceGuard) {
      var origSwitch = window.switchAdminRoom;
      var patched = function (roomKey) {
        if (roomKey !== 'chat' && isRestrictedScreen()) {
          checkAdminDeviceGuard();
          var overlay = ensureOverlayExists();
          if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('admin-device-blocked');
          }
          return;
        }
        var res = origSwitch.apply(this, arguments);
        checkAdminDeviceGuard();
        return res;
      };
      patched._patchedByDeviceGuard = true;
      window.switchAdminRoom = patched;
    }
  }

  // Intercept openNakesAdminModal
  function patchOpenNakesModal() {
    if (typeof window.openNakesAdminModal === 'function' && !window.openNakesAdminModal._patchedByDeviceGuard) {
      var origModal = window.openNakesAdminModal;
      var patched = function () {
        if (isRestrictedScreen()) {
          checkAdminDeviceGuard();
          var overlay = ensureOverlayExists();
          if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.classList.add('admin-device-blocked');
          }
          return;
        }
        return origModal.apply(this, arguments);
      };
      patched._patchedByDeviceGuard = true;
      window.openNakesAdminModal = patched;
    }
  }

  // Delegated click interceptor untuk semua link & tombol navigasi admin di layar mobile/tablet
  document.addEventListener('click', function (e) {
    if (!isRestrictedScreen()) return;

    var target = e.target && e.target.closest ? e.target.closest('.admin-menu-item, [data-admin-only], #sidebar-files-link, #sidebar-research-admin-link, #sidebar-stats-link, #sidebar-nakes-admin-link, #sidebar-database-link') : null;
    if (target) {
      // Kecualikan tombol toggle accordion menu
      if (target.id === 'admin-menu-toggle-btn') return;
      e.preventDefault();
      e.stopPropagation();

      var overlay = ensureOverlayExists();
      if (overlay) {
        var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        var sizeEl = document.getElementById('admin-guard-current-size');
        if (sizeEl) sizeEl.innerHTML = width + ' &times; ' + height + ' px';
        var typeEl = document.getElementById('admin-guard-device-type');
        if (typeEl) typeEl.textContent = getDeviceCategory(width);

        overlay.style.display = 'flex';
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('admin-device-blocked');
      }
    }
  }, true);

  // Inisialisasi Event Listeners
  window.addEventListener('resize', checkAdminDeviceGuard, { passive: true });
  window.addEventListener('orientationchange', checkAdminDeviceGuard);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      ensureOverlayExists();
      patchSwitchAdminRoom();
      patchOpenNakesModal();
      checkAdminDeviceGuard();
    });
  } else {
    ensureOverlayExists();
    patchSwitchAdminRoom();
    patchOpenNakesModal();
    checkAdminDeviceGuard();
  }

  // Observer agar selalu responsif terhadap perubahan role atau navigasi DOM
  var mutationTimeout = null;
  var observer = new MutationObserver(function () {
    if (mutationTimeout) clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(function () {
      patchSwitchAdminRoom();
      patchOpenNakesModal();
      checkAdminDeviceGuard();
    }, 150);
  });

  if (document.body) {
    observer.observe(document.body, { attributes: true, childList: true, subtree: false });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      observer.observe(document.body, { attributes: true, childList: true, subtree: false });
    });
  }

  window.checkAdminDeviceGuard = checkAdminDeviceGuard;
  console.log('[Neura Security] Admin Device Restriction Guard active (<= 1024px restricted).');
})();
