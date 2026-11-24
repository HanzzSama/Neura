/**
 * public/js/admin-presence.js
 * =============================
 * Real-Time Admin Presence & Multi-User Collaboration Engine for Neura AI.
 * 
 * Melacak status aktif, sedang login, halaman terkini, dan waktu login terakhir
 * dari seluruh Administrator & Peneliti secara persisten di database MySQL
 * dengan sinkronisasi real-time.
 */

(function () {
  'use strict';

  var HEARTBEAT_INTERVAL_MS = 15000;   // 15 detik kirim heartbeat
  var REFRESH_COLLAB_MS     = 12000;   // 12 detik polling daftar rekan
  var heartbeatTimer = null;
  var collabTimer    = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getAdminToken() {
    return localStorage.getItem('neura_admin_token') ||
           sessionStorage.getItem('neura_admin_token') ||
           '';
  }

  function isAdminAuthenticated() {
    var role = (localStorage.getItem('neura_user_role') || '').toLowerCase();
    return role === 'admin' ||
           localStorage.getItem('neura_admin_authenticated') === 'true' ||
           sessionStorage.getItem('neura_admin_session') === 'true';
  }

  function getCurrentUserAction() {
    try {
      var pathname = window.location.pathname || '';
      var search = window.location.search || '';
      var urlParams = new URLSearchParams(search);

      if (pathname.indexOf('struktur') !== -1) {
        var canvasView = (window.STATE && window.STATE.canvasView) ? window.STATE.canvasView : (urlParams.get('view') || 'general');
        if (canvasView === 'database') {
          return 'Eksplorasi Skema Database';
        } else if (canvasView === 'explorer') {
          var pathArr = (window.STATE && window.STATE.explorerPath) ? window.STATE.explorerPath : [];
          return pathArr.length ? 'Explorer: /' + pathArr.join('/') : 'Explorer: Root Direktori';
        } else {
          return 'Aktif di Kanvas Arsitektur';
        }
      }

      if (pathname.indexOf('app') !== -1) {
        var activeTab = document.querySelector('.nav-item.active, .subnav-item.active');
        var tabText = activeTab ? activeTab.textContent.trim() : 'Dashboard Analisis AI';
        return 'Navigasi: ' + tabText;
      }

      if (pathname.indexOf('admin') !== -1) {
        return 'Administrasi & Keamanan Sistem';
      }

      return 'Sedang Aktif';
    } catch (e) {
      return 'Aktif di Sistem';
    }
  }

  function getCurrentPageLabel() {
    var pathname = window.location.pathname || '';
    var search = window.location.search || '';
    return pathname + search || '/';
  }

  // -----------------------------------------------------------------------
  // 1. Heartbeat Sender
  // -----------------------------------------------------------------------
  function sendHeartbeat() {
    var token = getAdminToken();
    if (!token && !isAdminAuthenticated()) return;

    var currentView = (window.STATE && window.STATE.canvasView) ? window.STATE.canvasView : 'general';
    var payload = {
      token: token,
      current_page: getCurrentPageLabel(),
      page_title: document.title || 'Neura Clean Architecture',
      canvas_view: currentView,
      action: getCurrentUserAction()
    };

    fetch('/api/admin/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token
      },
      body: JSON.stringify(payload)
    }).catch(function (err) {
      // Silent catch for network hiccups
    });
  }

  // -----------------------------------------------------------------------
  // 2. Active Collaborators Fetcher & UI Renderer
  // -----------------------------------------------------------------------
  function fetchAndRenderCollaborators() {
    var token = getAdminToken();
    var url = '/api/admin/active-collaborators' + (token ? '?token=' + encodeURIComponent(token) : '');

    fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Admin-Token': token
      }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.success || !Array.isArray(data.collaborators)) return;
      renderCollaborators(data);
    })
    .catch(function (err) {
      console.warn('[AdminPresence] Gagal memuat presence rekan:', err);
    });
  }

  var AVATAR_BG_PALETTE = [
    'linear-gradient(135deg, #EA580C, #C2410C)', // Orange (Hanzz / Super Admin)
    'linear-gradient(135deg, #06B6D4, #0891B2)', // Cyan (SK)
    'linear-gradient(135deg, #8B5CF6, #6D28D9)', // Purple (AR)
    'linear-gradient(135deg, #10B981, #059669)', // Emerald (BS)
    'linear-gradient(135deg, #EC4899, #DB2777)', // Pink (MP)
    'linear-gradient(135deg, #F59E0B, #D97706)', // Amber (AS)
  ];

  function renderCollaborators(data) {
    var collabs = data.collaborators || [];
    var onlineCount = data.online_count || 0;

    // A. Update Topbar Stack (#collaborators-stack)
    var stackEl = document.getElementById('collaborators-stack');
    if (stackEl) {
      stackEl.setAttribute('title', onlineCount + ' Peneliti & Pengembang Aktif (Klik untuk detail)');

      var maxChips = 3;
      var previewCollabs = collabs.slice(0, maxChips);
      var remaining = Math.max(0, collabs.length - maxChips);

      var chipsHtml = previewCollabs.map(function (c, idx) {
        var bg = AVATAR_BG_PALETTE[idx % AVATAR_BG_PALETTE.length];
        var chipClass = c.is_you ? 'chip-3' : ('chip-' + ((idx % 3) + 1));
        var tooltip = escapeHtml(c.name) + ' (' + escapeHtml(c.role) + ') • ' + (c.is_online ? 'Online' : 'Away');
        return '<span class="avatar-chip ' + chipClass + '" style="background:' + bg + ';" title="' + tooltip + '">' +
               escapeHtml(c.initials) +
               '</span>';
      }).join('');

      if (remaining > 0) {
        chipsHtml += '<span class="avatar-chip chip-more" title="+' + remaining + ' admin lainnya">+' + remaining + '</span>';
      }

      stackEl.innerHTML = chipsHtml;
    }

    // B. Update Topbar Popover (#collaborators-popup)
    var popupEl = document.getElementById('collaborators-popup');
    if (popupEl) {
      var headerText = 'ADMINISTRATOR & PENELITI AKTIF (' + onlineCount + ' ONLINE)';

      var itemsHtml = collabs.map(function (c, idx) {
        var bg = AVATAR_BG_PALETTE[idx % AVATAR_BG_PALETTE.length];
        var youBadge = c.is_you ? '<span class="collab-badge-you">Anda / Host</span>' : '';
        var dotClass = c.dot_class || (c.is_online ? 'status-live' : 'status-away');
        var dotMiniClass = c.online_state === 'online' ? 'dot-online' : (c.online_state === 'away' ? 'dot-away' : 'dot-offline');
        var youItemClass = c.is_you ? 'collab-item collab-item-you' : 'collab-item';

        return [
          '<div class="' + youItemClass + '">',
          '  <div class="collab-avatar" style="background:' + bg + ';">',
          '    ' + escapeHtml(c.initials),
          '    <span class="collab-dot-mini ' + dotMiniClass + '"></span>',
          '  </div>',
          '  <div class="collab-info">',
          '    <div class="collab-name">',
          '      ' + escapeHtml(c.name) + ' ' + youBadge,
          '    </div>',
          '    <div class="collab-role">',
          '      ' + escapeHtml(c.department) + ' &bull; <span class="' + dotClass + '">' + escapeHtml(c.action) + '</span>',
          '    </div>',
          '    <div class="collab-meta-row">',
          '      <span class="collab-page-badge" title="Halaman Terkini">',
          '        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
          '        ' + escapeHtml(c.current_page),
          '      </span>',
          '      <span class="collab-time-badge" title="Waktu Login">',
          '        Login: ' + escapeHtml(c.last_login),
          '      </span>',
          '    </div>',
          '  </div>',
          '</div>'
        ].join('\n');
      }).join('');

      var footerHtml = [
        '<div class="collab-footer">',
        '  <span class="pulse-dot"></span> Terhubung ke Database MySQL &bull; Real-time Aktif',
        '</div>'
      ].join('');

      popupEl.innerHTML = [
        '<div class="dropdown-menu-header">' + escapeHtml(headerText) + '</div>',
        itemsHtml,
        footerHtml
      ].join('\n');
    }

    // C. Sinkronkan juga ke badge pengguna online di canvas (users table card)
    var usersOnlinePill = document.querySelector('.db-card-online-group[id*="users"] .db-online-label');
    if (usersOnlinePill) {
      usersOnlinePill.innerHTML = '<span class="db-online-pulse"></span>' + collabs.length + ' Online';
    }
  }

  // -----------------------------------------------------------------------
  // 3. Lifecycle & Event Bindings
  // -----------------------------------------------------------------------
  function initPresenceEngine() {
    // 1. Initial heartbeat & sync
    sendHeartbeat();
    fetchAndRenderCollaborators();

    // 2. Setup periodic intervals
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    if (collabTimer) clearInterval(collabTimer);
    collabTimer = setInterval(fetchAndRenderCollaborators, REFRESH_COLLAB_MS);

    // 3. Tab visibility change (kirim heartbeat seketika saat user kembali ke tab)
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        sendHeartbeat();
        fetchAndRenderCollaborators();
      }
    });

    // 4. Hook popup click to refresh immediately
    var stackEl = document.getElementById('collaborators-stack');
    if (stackEl) {
      stackEl.addEventListener('click', function () {
        fetchAndRenderCollaborators();
      });
    }

    // 5. Expose for manual trigger (misal saat ganti view kanvas di struktur.js)
    window.NeuraPresence = {
      sendHeartbeat: sendHeartbeat,
      refresh: fetchAndRenderCollaborators
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPresenceEngine);
  } else {
    initPresenceEngine();
  }

})();
