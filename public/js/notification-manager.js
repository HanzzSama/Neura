/**
 * public/js/notification-manager.js
 * =================================
 * Neura AI — Native Device & Real-time Notification Manager.
 * 
 * Fitur:
 * 1. Web Notifications API (OS-level Notification Toast di Windows/Mac/Android).
 * 2. Real-time SSE Stream Listener (/api/notifications/stream).
 * 3. Web Audio API Chime Synth (Suara notifikasi jernih bawaan browser tanpa load mp3 eksternal).
 * 4. Fallback integrasi ke Neura Dynamic Island / In-App Notification HUD.
 */

(function (window, document) {
  'use strict';

  var NeuraNotification = {
    _eventSource: null,
    _audioCtx: null,
    _role: 'all',
    _hasRequested: false,

    isSupported: function () {
      return ('Notification' in window);
    },

    getPermissionStatus: function () {
      if (!this.isSupported()) return 'unsupported';
      return Notification.permission; // 'granted', 'denied', 'default'
    },

    requestPermission: function (callback) {
      if (!this.isSupported()) {
        console.warn('[NeuraNotification] Web Notification API tidak didukung browser ini.');
        if (callback) callback('unsupported');
        return;
      }

      this._hasRequested = true;
      try {
        Notification.requestPermission().then(function (perm) {
          console.log('[NeuraNotification] Izin notifikasi:', perm);
          localStorage.setItem('neura_notif_permission', perm);
          if (callback) callback(perm);
        }).catch(function (err) {
          console.warn('[NeuraNotification] Request permission error:', err);
          if (callback) callback('denied');
        });
      } catch (e) {
        // Fallback browser lama yang menggunakan callback
        Notification.requestPermission(function (perm) {
          localStorage.setItem('neura_notif_permission', perm);
          if (callback) callback(perm);
        });
      }
    },

    /**
     * Synthesizer Suara Chime Apple-style menggunakan Web Audio API murni.
     * Tidak membutuhkan download asset file audio eksternal.
     */
    playChime: function () {
      try {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!this._audioCtx) {
          this._audioCtx = new AudioContext();
        }
        if (this._audioCtx.state === 'suspended') {
          this._audioCtx.resume();
        }

        var ctx = this._audioCtx;
        var now = ctx.currentTime;

        // Nada 1: E6 (1318.5 Hz)
        var osc1 = ctx.createOscillator();
        var gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1318.5, now);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.36);

        // Nada 2: A6 (1760 Hz)
        var osc2 = ctx.createOscillator();
        var gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760.0, now + 0.08);
        gain2.gain.setValueAtTime(0, now + 0.08);
        gain2.gain.linearRampToValueAtTime(0.16, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.56);
      } catch (err) {
        // Abaikan jika autoplay dicegah browser
      }
    },

    /**
     * Tampilkan Notifikasi OS Bawaan Device
     */
    show: function (title, body, options) {
      options = options || {};
      var self = this;

      // 1. Bunyikan efek suara jika diaktifkan (default: true)
      if (options.silent !== true) {
        self.playChime();
      }

      // 2. Jika izin OS telah diberikan -> Munculkan OS-level toast bawaan
      if (this.isSupported() && Notification.permission === 'granted') {
        try {
          var notifOptions = {
            body: body || '',
            icon: options.icon || '/assets/icons/neura-icon.png',
            tag: options.tag || ('neura_' + Date.now()),
            renotify: true,
            requireInteraction: options.requireInteraction || false,
            silent: true // Sudah ditangani oleh playChime Web Audio API
          };

          var n = new Notification(title, notifOptions);
          n.onclick = function (e) {
            e.preventDefault();
            window.focus();
            if (options.action_url) {
              window.location.href = options.action_url;
            }
          };
        } catch (e) {
          console.warn('[NeuraNotification] Gagal instansiasi Notification:', e);
        }
      }

      // 3. Resonansi In-App: Sinkronisasi ke Dynamic Island / HUD
      this._mirrorToDynamicIsland(title, body, options);
    },

    /**
     * Tampilkan juga di UI Neura Dynamic Island jika elemen tersedia
     */
    _mirrorToDynamicIsland: function (title, body, options) {
      if (window.NeuraDynamicIsland && typeof window.NeuraDynamicIsland.showNotification === 'function') {
        window.NeuraDynamicIsland.showNotification(title, body, options);
        return;
      }

      // In-App Toast Fallback sederhana jika Dynamic Island tidak aktif
      this._showFallbackToast(title, body, options);
    },

    _showFallbackToast: function (title, body, options) {
      var container = document.getElementById('neura-device-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'neura-device-toast-container';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
      }

      var toast = document.createElement('div');
      toast.style.cssText = 'pointer-events:auto;background:rgba(20,20,20,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:12px 18px;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:4px;min-width:280px;max-width:360px;transform:translateY(20px);opacity:0;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);font-family:sans-serif;';
      
      var titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-size:13px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;';
      titleEl.textContent = title;

      var bodyEl = document.createElement('div');
      bodyEl.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.75);line-height:1.4;';
      bodyEl.textContent = body;

      toast.appendChild(titleEl);
      toast.appendChild(bodyEl);
      container.appendChild(toast);

      // Slide in
      requestAnimationFrame(function () {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
      });

      // Click action
      toast.addEventListener('click', function () {
        if (options.action_url) {
          window.location.href = options.action_url;
        }
        toast.remove();
      });

      // Auto dismiss
      setTimeout(function () {
        toast.style.transform = 'translateY(10px)';
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 350);
      }, 5000);
    },

    /**
     * Hubungkan ke SSE Stream Server
     */
    connectStream: function (role) {
      if (this._eventSource) {
        this._eventSource.close();
      }

      this._role = role || localStorage.getItem('neura_user_role') || 'all';
      var streamUrl = '/api/notifications/stream?role=' + encodeURIComponent(this._role.toLowerCase());

      try {
        var es = new EventSource(streamUrl);
        var self = this;

        es.onmessage = function (event) {
          if (!event.data) return;
          try {
            var data = JSON.parse(event.data);
            if (data.type === 'INIT') {
              console.log('[NeuraNotification] Stream tersambung:', data);
              return;
            }

            // Tampilkan notifikasi yang disiarkan server
            self.show(data.title || 'Notifikasi Neura', data.body || '', data);
          } catch (e) {
            console.error('[NeuraNotification] Parse event error:', e);
          }
        };

        es.onerror = function () {
          // Reconnect otomatis dikelola oleh browser EventSource
        };

        this._eventSource = es;
      } catch (err) {
        console.warn('[NeuraNotification] Gagal inisialisasi EventSource:', err);
      }
    },

    init: function () {
      var self = this;
      var role = localStorage.getItem('neura_user_role') || 'all';

      // Sambungkan SSE stream
      this.connectStream(role);

      // Auto-request permission jika admin sudah login dan belum ditanya
      if (this.isSupported() && Notification.permission === 'default') {
        var isAdmin = (role.toLowerCase() === 'admin') || (localStorage.getItem('neura_admin_authenticated') === 'true');
        if (isAdmin && !this._hasRequested) {
          setTimeout(function () {
            self.requestPermission();
          }, 2000);
        }
      }
    }
  };

  // Expose globally
  window.NeuraNotification = NeuraNotification;

  // Auto init saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      NeuraNotification.init();
    });
  } else {
    NeuraNotification.init();
  }

})(window, document);

