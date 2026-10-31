/**
 * public/js/app-settings.js
 * =========================
 * Application Settings Panel, Preferences & Edit Profile Modal Controller.
 */

// Settings Panel & App Preferences Manager
// --------------------------------------------------------------------------

function initAppSettingsModifiers() {
  try {
    // 1. Font Size
    const fontSize = localStorage.getItem('neura_font_size') || 'medium';
    document.body.classList.remove('font-size-small', 'font-size-large');
    if (fontSize === 'small') document.body.classList.add('font-size-small');
    if (fontSize === 'large') document.body.classList.add('font-size-large');

    // 2. Reduce Motion
    const reduceMotion = localStorage.getItem('neura_reduce_motion') === 'true';
    document.body.classList.toggle('reduce-motion', reduceMotion);

    // 3. Compact Mode
    const compactMode = localStorage.getItem('neura_compact_mode') === 'true';
    document.body.classList.toggle('compact-mode', compactMode);
  } catch (e) { }
}

function playSuccessChime() {
  try {
    const isEnabled = localStorage.getItem('neura_sound_enabled') === 'true';
    if (!isEnabled) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Pleasant 2-tone harmonic chime (C6 -> G6)
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

    gainNode.gain.setValueAtTime(0.06, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  } catch (e) { }
}

let currentSettingsSubpanel = null;
let currentSettingsSubpanelTitle = null;

function openSettingsSubpanel(subpanelId, titleId, titleEn) {
  currentSettingsSubpanel = subpanelId;
  currentSettingsSubpanelTitle = { id: titleId, en: titleEn || titleId };
  const track = document.getElementById('settings-slider-track');
  const backBtn = document.getElementById('settings-back-btn');
  const titleEl = document.getElementById('settings-title');
  const pane = document.getElementById('settings-subpanel-pane');

  // Deactivate all subpanels and activate target
  document.querySelectorAll('.settings-subpanel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(subpanelId);
  if (target) target.classList.add('active');

  // Slide track to subpanel view
  if (track) {
    track.classList.remove('is-root');
    track.classList.add('is-subpanel');
  }

  // Show back button
  if (backBtn) backBtn.style.display = 'inline-flex';

  // Set title
  if (titleEl) {
    const lang = getAppLanguage();
    titleEl.textContent = lang === 'en' ? currentSettingsSubpanelTitle.en : currentSettingsSubpanelTitle.id;
  }

  // Scroll subpanel pane to top
  if (pane) pane.scrollTop = 0;

  // Render About panel data when subpanel-about is opened
  if (subpanelId === 'subpanel-about' && window.NeuraAbout) {
    window.NeuraAbout.get().then(function (data) {
      if (!data) return;
      // Re-populate data-about elements inside this subpanel
      if (target) window.NeuraAbout.populate(target);
      // Render changelog
      const changelogBody = document.getElementById('settings-changelog-body');
      if (changelogBody && Array.isArray(data.changelog) && data.changelog.length > 0) {
        changelogBody.innerHTML = data.changelog.map(function (entry) {
          var notes = Array.isArray(entry.notes)
            ? entry.notes.map(function (n) {
              return '<div class="settings-about-changelog-note">' + n + '</div>';
            }).join('')
            : '';
          return '<div class="settings-about-changelog-entry">'
            + '<div class="settings-about-changelog-ver">'
            + '<span class="settings-about-changelog-ver-badge">v' + entry.version + '</span>'
            + '<span class="settings-about-changelog-date">' + entry.date + '</span>'
            + '</div>'
            + notes
            + '</div>';
        }).join('');
      }
    });
  }
}

function backToSettingsRoot() {
  currentSettingsSubpanel = null;
  currentSettingsSubpanelTitle = null;
  const track = document.getElementById('settings-slider-track');
  const backBtn = document.getElementById('settings-back-btn');
  const titleEl = document.getElementById('settings-title');

  // Slide track back to root
  if (track) {
    track.classList.remove('is-subpanel');
    track.classList.add('is-root');
  }

  // Hide back button
  if (backBtn) backBtn.style.display = 'none';

  // Reset title
  if (titleEl) {
    const lang = getAppLanguage();
    titleEl.textContent = lang === 'en' ? 'Settings' : 'Pengaturan';
  }

  updateSettingsNavBadges();
}

function updateSettingsNavBadges() {
  try {
    const lang = getAppLanguage();
    const theme = document.documentElement.getAttribute('data-theme') || 'light';

    // 1. Appearance
    const badgeApp = document.getElementById('menu-badge-appearance');
    if (badgeApp) {
      const themeLabel = theme === 'dark' ? (lang === 'en' ? 'Dark' : 'Gelap') : (lang === 'en' ? 'Light' : 'Terang');
      badgeApp.textContent = `${themeLabel} • ${lang.toUpperCase()}`;
    }

    // 2. Input & Chat
    const badgeInput = document.getElementById('menu-badge-input');
    if (badgeInput) {
      const enter = localStorage.getItem('neura_send_on_enter') !== 'false';
      const fSize = localStorage.getItem('neura_font_size') || 'medium';
      const fChar = fSize === 'small' ? 'S' : (fSize === 'large' ? 'L' : 'M');
      badgeInput.textContent = `${enter ? 'Enter' : 'Click'} • ${fChar}`;
    }

    // 3. Notifikasi & Suara
    const badgeNotif = document.getElementById('menu-badge-notif');
    if (badgeNotif) {
      const sound = localStorage.getItem('neura_sound_enabled') === 'true';
      const dur = ((parseInt(localStorage.getItem('neura_toast_duration') || '3500')) / 1000).toFixed(1) + 's';
      badgeNotif.textContent = sound ? `${dur} • ♪` : dur;
    }

    // 4. Model & Klinis
    const badgeClin = document.getElementById('menu-badge-clinical');
    if (badgeClin) {
      const ep = localStorage.getItem('neura_default_epochs') || '50';
      badgeClin.textContent = `${ep} Ep`;
    }

    // 5. Voice Consultation
    const badgeVoice = document.getElementById('menu-badge-voice');
    if (badgeVoice) {
      const vDelay = ((parseInt(localStorage.getItem('neura_voice_delay') || '2500')) / 1000).toFixed(1) + 's';
      const autoPlay = localStorage.getItem('neura_voice_autoplay') !== 'false';
      badgeVoice.textContent = `${vDelay} • ${autoPlay ? 'Auto' : 'Off'}`;
    }

    // 6. Aksesibilitas
    const badgeA11y = document.getElementById('menu-badge-a11y');
    if (badgeA11y) {
      const mot = localStorage.getItem('neura_reduce_motion') === 'true';
      const cmp = localStorage.getItem('neura_compact_mode') === 'true';
      if (mot && cmp) badgeA11y.textContent = lang === 'en' ? 'Calm+Dense' : 'Tenang+Padat';
      else if (mot) badgeA11y.textContent = lang === 'en' ? 'No-Motion' : 'Tenang';
      else if (cmp) badgeA11y.textContent = lang === 'en' ? 'Compact' : 'Ringkas';
      else badgeA11y.textContent = lang === 'en' ? 'Normal' : 'Normal';
    }

    // 7. Profil
    const badgeProf = document.getElementById('menu-badge-profile');
    if (badgeProf) {
      const role = localStorage.getItem('neura_user_role') || 'User';
      badgeProf.textContent = role;
    }

    // 8. Model & Chat
    const badgeChat = document.getElementById('menu-badge-chat');
    if (badgeChat) {
      badgeChat.textContent = 'XGBoost';
    }

    // 9. Data & Penyimpanan
    const badgeStore = document.getElementById('menu-badge-storage');
    if (badgeStore) {
      let totalBytes = 0;
      for (let k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          totalBytes += (String(localStorage[k]).length + k.length) * 2;
        }
      }
      const kb = (totalBytes / 1024).toFixed(0);
      badgeStore.textContent = `${kb} KB`;
    }

    // 10. Tentang
    const badgeAbout = document.getElementById('menu-badge-about');
    if (badgeAbout) {
      badgeAbout.textContent = 'v2.5.1';
    }
  } catch (e) { }
}

function openSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  if (!panel) return;
  backToSettingsRoot();
  syncSettingsPanel();
  panel.classList.add('open');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSettingsPanel() {
  const panel = document.getElementById('settings-panel');
  const overlay = document.getElementById('settings-overlay');
  if (!panel) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (!panel.classList.contains('open')) {
      backToSettingsRoot();
    }
  }, 300);
}

function syncSettingsPanel() {
  const lang = getAppLanguage();
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  // ── Theme chips active state
  document.getElementById('stg-light-btn')?.classList.toggle('active', theme === 'light');
  document.getElementById('stg-dark-btn')?.classList.toggle('active', theme === 'dark');

  // ── Lang chips active state
  document.getElementById('stg-id-btn')?.classList.toggle('active', lang === 'id');
  document.getElementById('stg-en-btn')?.classList.toggle('active', lang === 'en');

  // ── Input & Chat settings
  const enterCb = document.getElementById('stg-toggle-enter');
  if (enterCb) enterCb.checked = localStorage.getItem('neura_send_on_enter') !== 'false';

  const draftCb = document.getElementById('stg-toggle-draft');
  if (draftCb) draftCb.checked = localStorage.getItem('neura_draft_enabled') !== 'false';

  const curFontSize = localStorage.getItem('neura_font_size') || 'medium';
  document.getElementById('stg-font-sm')?.classList.toggle('active', curFontSize === 'small');
  document.getElementById('stg-font-md')?.classList.toggle('active', curFontSize === 'medium');
  document.getElementById('stg-font-lg')?.classList.toggle('active', curFontSize === 'large');

  // ── Notifications & Sound
  const soundCb = document.getElementById('stg-toggle-sound');
  if (soundCb) soundCb.checked = localStorage.getItem('neura_sound_enabled') === 'true';

  const toastSel = document.getElementById('stg-toast-select');
  if (toastSel) toastSel.value = localStorage.getItem('neura_toast_duration') || '3500';

  // ── Model & Clinical
  const epochsSel = document.getElementById('stg-epochs-select');
  if (epochsSel) epochsSel.value = localStorage.getItem('neura_default_epochs') || '50';

  const probCb = document.getElementById('stg-toggle-prob');
  if (probCb) probCb.checked = localStorage.getItem('neura_detailed_prob') !== 'false';

  // ── Voice Consultation
  const voiceDelaySel = document.getElementById('stg-voice-delay-select');
  if (voiceDelaySel) voiceDelaySel.value = localStorage.getItem('neura_voice_delay') || '2500';

  const voicePlayCb = document.getElementById('stg-toggle-voiceplay');
  if (voicePlayCb) voicePlayCb.checked = localStorage.getItem('neura_voice_autoplay') !== 'false';

  // ── Accessibility
  const motionCb = document.getElementById('stg-toggle-motion');
  if (motionCb) motionCb.checked = localStorage.getItem('neura_reduce_motion') === 'true';

  const compactCb = document.getElementById('stg-toggle-compact');
  if (compactCb) compactCb.checked = localStorage.getItem('neura_compact_mode') === 'true';

  // ── Storage usage display
  updateStorageUsage();

  // ── Profile info from sidebar / auth storage
  try {
    const raw = localStorage.getItem('neura_auth_user');
    const user = raw ? JSON.parse(raw) : null;

    const nameEl = document.getElementById('stg-profile-name');
    const emailEl = document.getElementById('stg-profile-email');
    const avatarEl = document.getElementById('stg-avatar');

    if (user) {
      const name = user.name || user.displayName || 'Pengguna';
      if (nameEl) nameEl.textContent = name;
      if (emailEl) emailEl.textContent = user.email || '—';
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
      const sbName = document.getElementById('sidebar-user-name')?.textContent || 'Pengguna';
      if (nameEl) nameEl.textContent = sbName;
      if (emailEl) emailEl.textContent = document.getElementById('sidebar-user-email')?.textContent || '—';
      if (avatarEl) avatarEl.textContent = sbName.charAt(0).toUpperCase();
    }
  } catch (e) { }

  // ── Role select (Hanya ditampilkan untuk Admin; User & Nakes TIDAK MENAMPILKAN fitur ini sama sekali)
  try {
    const savedRole = localStorage.getItem('neura_user_role') || 'User';
    const roleRow = document.getElementById('stg-role-row');
    const roleSelect = document.getElementById('stg-role-select');
    const isAdmin = isCurrentUserAdmin();

    if (roleRow) {
      if (isAdmin) {
        // Admin: Tampilkan row dan aktifkan dropdown
        roleRow.style.display = 'flex';
        if (roleSelect) {
          roleSelect.value = savedRole;
          roleSelect.disabled = false;
        }
      } else {
        // User & Nakes: HILANGKAN FITUR INI (tidak ditampilkan sama sekali)
        roleRow.style.display = 'none';
        if (roleSelect) {
          roleSelect.disabled = true;
        }
      }
    }

    // Admin tidak memiliki menu ganti password
    const changePwdBtn = document.getElementById('stg-change-pwd-btn');
    if (changePwdBtn) {
      changePwdBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    }
  } catch (e) { }

  // ── Active model info
  const modelValEl = document.getElementById('stg-model-val');
  if (modelValEl) {
    const sbStatus = document.getElementById('sb-status-text')?.textContent;
    modelValEl.textContent = sbStatus && sbStatus !== 'Checking model...' && sbStatus !== 'Memeriksa model...'
      ? sbStatus : 'AlzheimersXGBoost v2.5';
  }

  // ── Translate all settings labels (ID / EN)
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

  if (lang === 'en') {
    // English
    if (currentSettingsSubpanel && currentSettingsSubpanelTitle) {
      set('settings-title', currentSettingsSubpanelTitle.en);
    } else {
      set('settings-title', 'Settings');
    }
    set('settings-back-label', 'Back');

    // Root Menu Titles & Subtitles
    set('menu-title-appearance', 'Appearance');
    set('menu-sub-appearance', 'Interface theme & language');
    set('menu-title-input', 'Input & Chat');
    set('menu-sub-input', 'Send on Enter, drafts, font size');
    set('menu-title-notif', 'Notifications & Audio');
    set('menu-sub-notif', 'Response chime & toast duration');
    set('menu-title-clinical', 'Model & Clinical');
    set('menu-sub-clinical', 'Default epochs, risk precision');
    set('menu-title-voice', 'Voice Consultation');
    set('menu-sub-voice', 'Mic silence pause & auto-play');
    set('menu-title-a11y', 'Accessibility');
    set('menu-title-profile', 'Profile');
    if (isCurrentUserAdmin()) {
      set('menu-sub-profile', 'Account & stakeholder role (User, Admin, Nakes)');
    } else {
      set('menu-sub-profile', 'Account details & user profile');
    }
    set('menu-title-chat', 'Model & Chat');
    set('menu-sub-chat', 'Active model & message history');
    set('menu-title-storage', 'Data & Storage');
    set('menu-sub-storage', 'Memory quota, JSON export, reset');
    set('menu-title-about', 'About');
    set('menu-sub-about', 'Neura AI v2.5.1');

    set('stg-sec-appearance', 'Appearance');
    set('stg-theme-label', 'Theme');
    set('stg-theme-desc', 'Interface display mode');
    set('stg-light-label', 'Light');
    set('stg-dark-label', 'Dark');
    set('stg-lang-label', 'Language');
    set('stg-lang-desc', 'Application interface language');

    set('stg-sec-input', 'Input & Chat');
    set('stg-enter-label', 'Send on Enter');
    set('stg-enter-desc', 'Enter to send, Shift+Enter for new line');
    set('stg-draft-label', 'Auto-save Draft');
    set('stg-draft-desc', 'Preserve unsent input on reload');
    set('stg-font-label', 'Chat Font Size');
    set('stg-font-desc', 'Reading comfort for consultation messages');

    set('stg-sec-notif', 'Notifications & Audio');
    set('stg-sound-label', 'Completion Chime');
    set('stg-sound-desc', 'Soft sound when AI completes response');
    set('stg-toast-label', 'Toast Duration');
    set('stg-toast-desc', 'Display time for toast popups');

    set('stg-sec-clinical', 'Model & Clinical');
    set('stg-epochs-label', 'Default Epochs /train');
    set('stg-epochs-desc', 'Default boosting rounds for training');
    set('stg-prob-label', 'Detailed Probability');
    set('stg-prob-desc', 'Display precise decimals (e.g. 95.35%)');

    set('stg-sec-voice', 'Voice Consultation');
    set('stg-voice-delay-label', 'Silence Delay');
    set('stg-voice-delay-desc', 'Pause duration before automatic send');
    set('stg-voice-play-label', 'Auto-speak Response');
    set('stg-voice-play-desc', 'Vocalize AI response in voice room');

    set('stg-sec-a11y', 'Accessibility');
    set('stg-motion-label', 'Reduce Motion');
    set('stg-motion-desc', 'Minimize transitions and visual pulses');
    set('stg-compact-label', 'Compact View');
    set('stg-compact-desc', 'Tighter chat bubbles for long history');

    set('stg-sec-profile', 'Profile');
    set('stg-role-label', 'Stakeholder Role');
    if (isCurrentUserAdmin()) {
      set('stg-role-desc', 'Select your stakeholder role in the platform');
    } else {
      set('stg-role-desc', 'Role locked: Only Administrator has permission to switch roles');
    }

    set('stg-sec-chat', 'Model & Chat');
    set('stg-model-label', 'Active AI Model');
    set('stg-change-model', 'Change');
    set('stg-history-label', 'Chat History');
    set('stg-history-desc', 'Delete all saved conversations');
    set('stg-clear-label', 'Delete');

    set('stg-sec-storage', 'Data & Storage');
    set('stg-storage-label', 'Browser Storage');
    set('stg-export-label', 'Export Chat History');
    set('stg-export-desc', 'Download complete conversation history (JSON)');
    set('stg-export-btn-label', 'Export');
    set('stg-reset-label', 'Reset All Settings');
    set('stg-reset-desc', 'Restore all preferences to defaults');
    set('stg-reset-btn-label', 'Reset');

    set('stg-sec-about', 'About');
    set('stg-about-desc', 'Clinical AI platform for early Alzheimer\'s detection based on 32 multimodal biomarkers.');
    set('dot-settings-label', 'Settings');
  } else {
    // Indonesian
    if (currentSettingsSubpanel && currentSettingsSubpanelTitle) {
      set('settings-title', currentSettingsSubpanelTitle.id);
    } else {
      set('settings-title', 'Pengaturan');
    }
    set('settings-back-label', 'Kembali');

    // Root Menu Titles & Subtitles
    set('menu-title-appearance', 'Tampilan');
    set('menu-sub-appearance', 'Tema antarmuka & bahasa');
    set('menu-title-input', 'Input & Chat');
    set('menu-sub-input', 'Kirim Enter, draf, ukuran font');
    set('menu-title-notif', 'Notifikasi & Suara');
    set('menu-sub-notif', 'Chime respons & durasi toast');
    set('menu-title-clinical', 'Model & Klinis');
    set('menu-sub-clinical', 'Epochs default, presisi risiko');
    set('menu-title-voice', 'Voice Consultation');
    set('menu-sub-voice', 'Jeda mic & auto-play ucapan');
    set('menu-title-a11y', 'Aksesibilitas');
    set('menu-sub-a11y', 'Animasi & kerapatan tampilan');
    set('menu-title-profile', 'Profil');
    if (isCurrentUserAdmin()) {
      set('menu-sub-profile', 'Akun & peran stakeholder (User, Admin, Nakes)');
    } else {
      set('menu-sub-profile', 'Informasi akun & profil pengguna');
    }
    set('menu-title-chat', 'Model & Chat');
    set('menu-sub-chat', 'Model aktif & riwayat pesan');
    set('menu-title-storage', 'Data & Penyimpanan');
    set('menu-sub-storage', 'Memori, ekspor JSON, reset');
    set('menu-title-about', 'Tentang');
    set('menu-sub-about', 'Neura AI v2.5.1');

    set('stg-sec-appearance', 'Tampilan');
    set('stg-theme-label', 'Tema');
    set('stg-theme-desc', 'Mode tampilan antarmuka');
    set('stg-light-label', 'Terang');
    set('stg-dark-label', 'Gelap');
    set('stg-lang-label', 'Bahasa');
    set('stg-lang-desc', 'Bahasa antarmuka aplikasi');

    set('stg-sec-input', 'Input & Chat');
    set('stg-enter-label', 'Kirim dengan Enter');
    set('stg-enter-desc', 'Enter untuk kirim, Shift+Enter untuk baris baru');
    set('stg-draft-label', 'Simpan Draf Otomatis');
    set('stg-draft-desc', 'Simpan teks belum terkirim saat refresh');
    set('stg-font-label', 'Ukuran Teks Chat');
    set('stg-font-desc', 'Kenyamanan membaca pesan konsultasi');

    set('stg-sec-notif', 'Notifikasi & Suara');
    set('stg-sound-label', 'Efek Suara Selesai');
    set('stg-sound-desc', 'Bunyi lembut saat AI selesai merespons');
    set('stg-toast-label', 'Durasi Notifikasi');
    set('stg-toast-desc', 'Waktu tampil pop-up notifikasi');

    set('stg-sec-clinical', 'Model & Klinis');
    set('stg-epochs-label', 'Default Epochs /train');
    set('stg-epochs-desc', 'Jumlah boosting rounds bawaan');
    set('stg-prob-label', 'Presisi Probabilitas');
    set('stg-prob-desc', 'Tampilkan desimal detail (misal 95.35%)');

    set('stg-sec-voice', 'Voice Consultation');
    set('stg-voice-delay-label', 'Jeda Hening Otomatis');
    set('stg-voice-delay-desc', 'Waktu hening sebelum suara dikirim');
    set('stg-voice-play-label', 'Putar Suara Otomatis');
    set('stg-voice-play-desc', 'Bicarakan respons AI saat konsultasi suara');

    set('stg-sec-a11y', 'Aksesibilitas');
    set('stg-motion-label', 'Kurangi Efek Animasi');
    set('stg-motion-desc', 'Meminimalkan transisi dan denyut visual');
    set('stg-compact-label', 'Tampilan Ringkas');
    set('stg-compact-desc', 'Penyajian bubble chat yang lebih padat');

    set('stg-sec-profile', 'Profil');
    set('stg-role-label', 'Peran Stakeholder');
    if (isCurrentUserAdmin()) {
      set('stg-role-desc', 'Pilih peran stakeholder Anda dalam sistem');
    } else {
      set('stg-role-desc', 'Peran dikunci: Hanya Administrator yang berwenang mengganti peran');
    }

    set('stg-sec-chat', 'Model & Chat');
    set('stg-model-label', 'Model AI Aktif');
    set('stg-change-model', 'Ganti');
    set('stg-history-label', 'Riwayat Chat');
    set('stg-history-desc', 'Hapus semua percakapan tersimpan');
    set('stg-clear-label', 'Hapus');

    set('stg-sec-storage', 'Data & Penyimpanan');
    set('stg-storage-label', 'Memori Browser');
    set('stg-export-label', 'Ekspor Riwayat Chat');
    set('stg-export-desc', 'Unduh seluruh riwayat percakapan (JSON)');
    set('stg-export-btn-label', 'Ekspor');
    set('stg-reset-label', 'Reset Semua Pengaturan');
    set('stg-reset-desc', 'Kembalikan ke konfigurasi awal');
    set('stg-reset-btn-label', 'Reset');

    set('stg-sec-about', 'Tentang');
    set('stg-about-desc', 'Platform klinis AI untuk deteksi dini Alzheimer berbasis 32 biomarker multimodal.');
    set('dot-settings-label', 'Pengaturan');
  }

  // Keep root menu status badges synced
  updateSettingsNavBadges();
}

function applySettingsTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('neura_theme_v1', theme); } catch (e) { }
  syncSettingsPanel();
  syncDotMenuState();
}

function applySettingsLang(lang) {
  setAppLanguage(lang, false);
  syncSettingsPanel();
}

function formatRoleLabel(role) {
  if (role === 'Nakes') return 'Nakes (Tenaga Kesehatan)';
  if (role === 'Admin') return 'Admin (Administrator)';
  return 'User (Pengguna Umum)';
}

function applySettingsRole(role) {
  // Keamanan: Validasi bahwa khusus role User dan Nakes TIDAK BISA switch, hanya Admin
  if (!isCurrentUserAdmin()) {
    const currentRole = localStorage.getItem('neura_user_role') || 'User';
    const roleSelect = document.getElementById('stg-role-select');
    if (roleSelect) roleSelect.value = currentRole;
    showToast(
      getAppLanguage() === 'en'
        ? 'Permission denied: Only Administrator can switch stakeholder roles.'
        : 'Akses ditolak: Hanya Administrator yang berwenang mengganti peran stakeholder.',
      'error'
    );
    return;
  }

  try { localStorage.setItem('neura_user_role', role); } catch (e) { }
  const roleEl = document.getElementById('sidebar-user-role');
  if (roleEl) {
    roleEl.textContent = formatRoleLabel(role);
    roleEl.setAttribute('data-role', (role || 'user').toLowerCase());
  }
  updateSettingsNavBadges();
  if (typeof renderRoleMLCommands === 'function') {
    renderRoleMLCommands(role);
  }
  showToast(getAppLanguage() === 'en' ? `Role updated: ${role}` : `Peran diperbarui: ${role}`, 'info');
}

function applyToggleSetting(key, checked) {
  try {
    localStorage.setItem(key, checked ? 'true' : 'false');
  } catch (e) { }

  if (key === 'neura_reduce_motion') {
    document.body.classList.toggle('reduce-motion', checked);
  } else if (key === 'neura_compact_mode') {
    document.body.classList.toggle('compact-mode', checked);
  }

  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Setting updated' : 'Pengaturan diperbarui', 'info');
}

function applyFontSize(size) {
  try {
    localStorage.setItem('neura_font_size', size);
  } catch (e) { }

  document.body.classList.remove('font-size-small', 'font-size-large');
  if (size === 'small') document.body.classList.add('font-size-small');
  if (size === 'large') document.body.classList.add('font-size-large');

  document.getElementById('stg-font-sm')?.classList.toggle('active', size === 'small');
  document.getElementById('stg-font-md')?.classList.toggle('active', size === 'medium');
  document.getElementById('stg-font-lg')?.classList.toggle('active', size === 'large');

  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? `Font size: ${size}` : `Ukuran teks: ${size}`, 'info');
}

function applyToastDuration(val) {
  try {
    localStorage.setItem('neura_toast_duration', val);
  } catch (e) { }
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Toast duration updated' : 'Durasi notifikasi diperbarui', 'info');
}

function applyDefaultEpochs(val) {
  try {
    localStorage.setItem('neura_default_epochs', val);
  } catch (e) { }
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? `Default epochs: ${val}` : `Default epochs: ${val}`, 'info');
}

function applyVoiceDelay(val) {
  try {
    localStorage.setItem('neura_voice_delay', val);
  } catch (e) { }
  updateSettingsNavBadges();
  const lang = getAppLanguage();
  showToast(lang === 'en' ? 'Voice delay updated' : 'Jeda hening diperbarui', 'info');
}

function updateStorageUsage() {
  try {
    let totalBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalBytes += (String(localStorage[key]).length + key.length) * 2;
      }
    }
    const kb = (totalBytes / 1024).toFixed(1);
    const mbQuota = 5;
    const percent = Math.min(100, Math.max(2, (totalBytes / (mbQuota * 1024 * 1024)) * 100));

    const valEl = document.getElementById('stg-storage-val');
    const fillEl = document.getElementById('stg-storage-fill');
    if (valEl) valEl.textContent = `${kb} KB / ${mbQuota} MB`;
    if (fillEl) fillEl.style.width = `${percent.toFixed(1)}%`;
  } catch (e) { }
}

function exportChatHistory() {
  try {
    loadChatSessions();
    const exportData = {
      exportedAt: new Date().toISOString(),
      platform: 'Neura Clinical AI',
      version: '2.5.1',
      totalSessions: chatSessions.length,
      sessions: chatSessions
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `neura_chat_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    const lang = getAppLanguage();
    showToast(lang === 'en' ? 'Chat history exported successfully' : 'Riwayat chat berhasil diekspor', 'success');
  } catch (e) {
    showToast('Gagal mengekspor riwayat', 'error');
  }
}

function confirmResetAllSettings() {
  const lang = getAppLanguage();
  const msg = lang === 'en'
    ? 'Reset all Neura settings to factory defaults?'
    : 'Reset semua pengaturan Neura ke nilai bawaan?';
  if (!confirm(msg)) return;

  try {
    localStorage.removeItem('neura_send_on_enter');
    localStorage.removeItem('neura_draft_enabled');
    localStorage.removeItem('neura_font_size');
    localStorage.removeItem('neura_sound_enabled');
    localStorage.removeItem('neura_toast_duration');
    localStorage.removeItem('neura_default_epochs');
    localStorage.removeItem('neura_detailed_prob');
    localStorage.removeItem('neura_voice_delay');
    localStorage.removeItem('neura_voice_autoplay');
    localStorage.removeItem('neura_reduce_motion');
    localStorage.removeItem('neura_compact_mode');
  } catch (e) { }

  initAppSettingsModifiers();
  syncSettingsPanel();
  showToast(lang === 'en' ? 'Settings reset to defaults' : 'Pengaturan dikembalikan ke awal', 'success');
}

function confirmClearHistory() {
  const lang = getAppLanguage();
  const msg = lang === 'en'
    ? 'Are you sure? All chat history will be permanently deleted.'
    : 'Yakin? Semua riwayat chat akan dihapus permanen.';
  if (!confirm(msg)) return;
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
    localStorage.removeItem(DRAFT_INPUT_STORAGE_KEY);
  } catch (e) { }
  chatSessions = [];
  startNewChat(false);
  renderRecentChatsSidebar();
  updateStorageUsage();
  updateSettingsNavBadges();
  closeSettingsPanel();
  showToast(lang === 'en' ? 'Chat history cleared' : 'Riwayat chat dihapus', 'info');
}

window.openSettingsPanel = openSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.openSettingsSubpanel = openSettingsSubpanel;
window.backToSettingsRoot = backToSettingsRoot;
window.updateSettingsNavBadges = updateSettingsNavBadges;
window.applySettingsTheme = applySettingsTheme;
window.applySettingsLang = applySettingsLang;
window.applySettingsRole = applySettingsRole;
window.confirmClearHistory = confirmClearHistory;
window.applyToggleSetting = applyToggleSetting;
window.applyFontSize = applyFontSize;
window.applyToastDuration = applyToastDuration;
window.applyDefaultEpochs = applyDefaultEpochs;
window.applyVoiceDelay = applyVoiceDelay;
window.exportChatHistory = exportChatHistory;
window.confirmResetAllSettings = confirmResetAllSettings;



// Edit Profile & Password Controller
// ==========================================================================
function openEditProfileModal(initialTab = 'info') {
  const modal = document.getElementById('edit-profile-modal');
  if (!modal) return;

  // Baca data profil terkini
  let user = null;
  try {
    const raw = localStorage.getItem('neura_auth_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) { }

  if (!user && window.NeuraFirebase && window.NeuraFirebase.auth) {
    try {
      const fbUser = window.NeuraFirebase.auth().currentUser;
      if (fbUser) {
        user = {
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Pengguna'),
          email: fbUser.email || '',
          photoURL: fbUser.photoURL || ''
        };
      }
    } catch (e) { }
  }

  const currentName = user?.name || document.getElementById('sidebar-user-name')?.textContent || 'Pengguna';
  const currentEmail = user?.email || document.getElementById('stg-profile-email')?.textContent || '—';
  const currentRole = localStorage.getItem('neura_user_role') || 'User';
  const currentInst = user?.institution || localStorage.getItem('neura_user_institution') || '';
  const currentPhone = user?.phone || localStorage.getItem('neura_user_phone') || '';
  const currentBio = user?.bio || localStorage.getItem('neura_user_bio') || '';

  // Isi ke Form Info
  const nameInput = document.getElementById('edit-profile-input-name');
  const emailInput = document.getElementById('edit-profile-input-email');
  const instInput = document.getElementById('edit-profile-input-institution');
  const phoneInput = document.getElementById('edit-profile-input-phone');
  const bioInput = document.getElementById('edit-profile-input-bio');
  const previewAvatar = document.getElementById('edit-avatar-preview');
  const previewName = document.getElementById('edit-avatar-name-display');
  const previewRole = document.getElementById('edit-avatar-role-badge');

  if (nameInput) nameInput.value = currentName;
  if (emailInput) emailInput.value = currentEmail;
  if (instInput) instInput.value = currentInst;
  if (phoneInput) phoneInput.value = currentPhone;
  if (bioInput) bioInput.value = currentBio;
  if (previewName) previewName.textContent = currentName;
  if (previewRole) previewRole.textContent = currentRole;
  if (previewAvatar) previewAvatar.textContent = currentName.charAt(0).toUpperCase();

  // Reset form password
  const pwdForm = document.getElementById('form-edit-password');
  if (pwdForm) pwdForm.reset();
  handlePasswordStrengthInput('');

  // Untuk Admin: sembunyikan menu/tab Keamanan & Kata Sandi
  const isAdmin = typeof isCurrentUserAdmin === 'function' ? isCurrentUserAdmin() : (currentRole === 'Admin');
  const tabSecBtn = document.getElementById('tab-btn-edit-security');
  const panelSec = document.getElementById('panel-edit-profile-security');
  const modalTitle = modal.querySelector('.modal-title');
  if (isAdmin) {
    if (tabSecBtn) tabSecBtn.style.display = 'none';
    if (panelSec) panelSec.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Edit Profil Administrator';
    initialTab = 'info';
  } else {
    if (tabSecBtn) tabSecBtn.style.display = 'inline-flex';
    if (modalTitle) modalTitle.textContent = 'Edit Profil & Kata Sandi';
  }

  // Tampilkan modal dan buka tab yang diminta
  modal.classList.add('open');
  switchEditProfileTab(initialTab);
}
window.openEditProfileModal = openEditProfileModal;

function closeEditProfileModal() {
  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.remove('open');
}
window.closeEditProfileModal = closeEditProfileModal;

function closeEditProfileModalOnBackdrop(e) {
  if (e && e.target && e.target.id === 'edit-profile-modal') {
    closeEditProfileModal();
  }
}
window.closeEditProfileModalOnBackdrop = closeEditProfileModalOnBackdrop;

function switchEditProfileTab(tabName) {
  const currentRole = localStorage.getItem('neura_user_role') || 'User';
  const isAdmin = typeof isCurrentUserAdmin === 'function' ? isCurrentUserAdmin() : (currentRole === 'Admin');
  if (isAdmin && tabName === 'security') {
    tabName = 'info';
  }

  const panelInfo = document.getElementById('panel-edit-profile-info');
  const panelSec = document.getElementById('panel-edit-profile-security');
  const tabBtnInfo = document.getElementById('tab-btn-edit-info');
  const tabBtnSec = document.getElementById('tab-btn-edit-security');

  if (tabName === 'security' && !isAdmin) {
    if (panelInfo) panelInfo.style.display = 'none';
    if (panelSec) panelSec.style.display = 'block';
    if (tabBtnInfo) tabBtnInfo.classList.remove('active');
    if (tabBtnSec) tabBtnSec.classList.add('active');
  } else {
    if (panelInfo) panelInfo.style.display = 'block';
    if (panelSec) panelSec.style.display = 'none';
    if (tabBtnInfo) tabBtnInfo.classList.add('active');
    if (tabBtnSec) tabBtnSec.classList.remove('active');
  }
}
window.switchEditProfileTab = switchEditProfileTab;

function handleEditProfileNameChange() {
  const nameInput = document.getElementById('edit-profile-input-name');
  const previewAvatar = document.getElementById('edit-avatar-preview');
  const previewName = document.getElementById('edit-avatar-name-display');
  const val = (nameInput?.value || '').trim() || 'Pengguna';
  if (previewName) previewName.textContent = val;
  if (previewAvatar) previewAvatar.textContent = val.charAt(0).toUpperCase();
}
window.handleEditProfileNameChange = handleEditProfileNameChange;

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';

  if (btnEl) {
    btnEl.innerHTML = isPassword ? `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    ` : `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function handlePasswordStrengthInput(pwd) {
  const fill = document.getElementById('pwd-strength-fill');
  const label = document.getElementById('pwd-strength-label');
  if (!fill || !label) return;

  if (!pwd) {
    fill.style.width = '0%';
    fill.style.background = '#ef4444';
    label.textContent = 'Kekuatan Sandi: —';
    return;
  }

  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 8) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

  if (score <= 1) {
    fill.style.width = '25%';
    fill.style.background = '#ef4444';
    label.textContent = 'Kekuatan Sandi: Lemah (minimal 6 karakter)';
    label.style.color = '#ef4444';
  } else if (score <= 3) {
    fill.style.width = '60%';
    fill.style.background = '#f59e0b';
    label.textContent = 'Kekuatan Sandi: Sedang (tambahkan variasi karakter)';
    label.style.color = '#f59e0b';
  } else {
    fill.style.width = '100%';
    fill.style.background = '#22c55e';
    label.textContent = 'Kekuatan Sandi: Sangat Kuat ✓';
    label.style.color = '#4ade80';
  }
}
window.handlePasswordStrengthInput = handlePasswordStrengthInput;

async function handleSaveProfile(event) {
  if (event) event.preventDefault();

  const name = (document.getElementById('edit-profile-input-name')?.value || '').trim();
  const institution = (document.getElementById('edit-profile-input-institution')?.value || '').trim();
  const phone = (document.getElementById('edit-profile-input-phone')?.value || '').trim();
  const bio = (document.getElementById('edit-profile-input-bio')?.value || '').trim();

  if (!name) {
    if (typeof showToast === 'function') showToast('Nama lengkap tidak boleh kosong.', 'warning');
    return;
  }

  const saveBtn = document.getElementById('btn-save-profile');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>Menyimpan...</span>`;
  }

  const currentRole = localStorage.getItem('neura_user_role') || 'User';
  let user = null;
  try {
    const raw = localStorage.getItem('neura_auth_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) { }

  const currentEmail = (document.getElementById('edit-profile-input-email')?.value || user?.email || '').trim().toLowerCase();
  const isNakes = currentRole === 'Nakes' || currentEmail.endsWith('@neura.ns.id');

  try {
    // 1. Jika peran Nakes: Simpan ke backend nakes_directory.json
    if (isNakes) {
      try {
        const res = await fetch('/api/nakes/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: user?.uid || user?.id,
            email: currentEmail,
            name: name,
            institution: institution,
            phone: phone,
            bio: bio
          })
        });
        const json = await res.json();
        if (json && json.success) {
          try {
            const nakesSess = JSON.parse(localStorage.getItem('neura_nakes_session') || '{}');
            nakesSess.name = name;
            nakesSess.institution = institution;
            nakesSess.phone = phone;
            localStorage.setItem('neura_nakes_session', JSON.stringify(nakesSess));
          } catch (e) { }
        }
      } catch (err) {
        console.warn('[Neura Nakes Profile Update Server Error]:', err);
      }
    }

    // 2. Update ke Firebase Auth jika aktif (khusus akun Google/Firebase biasa)
    let fbUser = null;
    if (window.NeuraFirebase && window.NeuraFirebase.auth && !isNakes) {
      try {
        const auth = typeof window.NeuraFirebase.auth === 'function' ? window.NeuraFirebase.auth() : window.NeuraFirebase.auth;
        if (auth && auth.currentUser) {
          fbUser = auth.currentUser;
          await fbUser.updateProfile({ displayName: name });
        }
      } catch (e) {
        console.warn('[Neura Auth] updateProfile Firebase error:', e);
      }
    }

    // 3. Simpan ke Firestore (collection 'nakes' dan 'users')
    if (window.firebase && window.firebase.firestore) {
      try {
        const db = window.firebase.firestore();
        // Jika Nakes, simpan langsung ke collection 'nakes'
        if (isNakes) {
          const nakesDocId = user?.uid || user?.id || (currentEmail ? currentEmail.replace(/[^a-zA-Z0-9_-]/g, '_') : 'nakes_current');
          await db.collection('nakes').doc(nakesDocId).set({
            id: nakesDocId,
            name: name,
            nakes_email: currentEmail,
            institution: institution,
            phone: phone,
            bio: bio,
            role: 'Nakes',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Simpan ke collection 'users'
        const userDocId = fbUser ? fbUser.uid : (user?.uid || (currentEmail ? currentEmail.replace(/[^a-zA-Z0-9_-]/g, '_') : 'user_current'));
        await db.collection('users').doc(userDocId).set({
          uid: userDocId,
          name: name,
          displayName: name,
          email: currentEmail,
          institution: institution,
          phone: phone,
          bio: bio,
          role: currentRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn('[Firestore Sync Warning]:', e);
      }
    }

    // 4. Update localStorage profile & user
    let userObj = {};
    try {
      const raw = localStorage.getItem('neura_auth_user');
      if (raw) userObj = JSON.parse(raw);
    } catch (e) { }

    userObj.name = name;
    userObj.displayName = name;
    userObj.institution = institution;
    userObj.phone = phone;
    userObj.bio = bio;

    localStorage.setItem('neura_auth_user', JSON.stringify(userObj));
    localStorage.setItem('neura_user_profile', JSON.stringify(userObj));
    localStorage.setItem('neura_user_institution', institution);
    localStorage.setItem('neura_user_phone', phone);
    localStorage.setItem('neura_user_bio', bio);

    // 5. Update UI di seluruh komponen
    syncUserProfileUI();
    const stgNameEl = document.getElementById('stg-profile-name');
    if (stgNameEl) stgNameEl.textContent = name;
    const stgAvatarEl = document.getElementById('stg-avatar');
    if (stgAvatarEl) stgAvatarEl.textContent = name.charAt(0).toUpperCase();

    // Jika tabel nakes admin sedang terbuka, refresh otomatis
    if (typeof fetchAndRenderNakesTable === 'function') {
      fetchAndRenderNakesTable();
    }

    if (typeof showToast === 'function') {
      showToast('Profil pengguna berhasil diperbarui dan disinkronkan!', 'success');
    }

    closeEditProfileModal();
  } catch (err) {
    console.error('Error saving profile:', err);
    if (typeof showToast === 'function') {
      showToast('Gagal memperbarui profil: ' + (err.message || err), 'error');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Simpan Perubahan Profil</span>
      `;
    }
  }
}
window.handleSaveProfile = handleSaveProfile;

async function handleUpdatePassword(event) {
  if (event) event.preventDefault();

  const oldPassword = document.getElementById('input-old-password')?.value || '';
  const newPassword = document.getElementById('input-new-password')?.value || '';
  const confirmPassword = document.getElementById('input-confirm-password')?.value || '';

  if (!oldPassword) {
    if (typeof showToast === 'function') showToast('Masukkan kata sandi saat ini.', 'warning');
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    if (typeof showToast === 'function') showToast('Kata sandi baru minimal harus 6 karakter.', 'warning');
    return;
  }
  if (newPassword !== confirmPassword) {
    if (typeof showToast === 'function') showToast('Konfirmasi kata sandi baru tidak cocok.', 'error');
    return;
  }

  const updateBtn = document.getElementById('btn-update-password');
  if (updateBtn) {
    updateBtn.disabled = true;
    updateBtn.innerHTML = `<span>Memproses Sandi...</span>`;
  }

  const currentRole = localStorage.getItem('neura_user_role') || 'User';
  let user = null;
  try {
    const raw = localStorage.getItem('neura_auth_user');
    if (raw) user = JSON.parse(raw);
  } catch (e) { }
  const currentEmail = (document.getElementById('edit-profile-input-email')?.value || user?.email || '').trim().toLowerCase();
  const isNakes = currentRole === 'Nakes' || currentEmail.endsWith('@neura.ns.id');

  try {
    if (isNakes) {
      // 1. Update kata sandi Nakes di server direktori Neura
      const res = await fetch('/api/nakes/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentEmail,
          id: user?.uid || user?.id,
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Gagal mengubah kata sandi Nakes.');
      }

      // Update session nakes di localStorage
      try {
        const nakesSess = JSON.parse(localStorage.getItem('neura_nakes_session') || '{}');
        nakesSess.password = newPassword;
        localStorage.setItem('neura_nakes_session', JSON.stringify(nakesSess));
      } catch (e) { }

      // Simpan kata sandi baru ke Firestore collection 'nakes'
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const nakesDocId = user?.uid || user?.id || (currentEmail ? currentEmail.replace(/[^a-zA-Z0-9_-]/g, '_') : 'nakes_current');
          await db.collection('nakes').doc(nakesDocId).set({
            password: newPassword,
            passwordUpdatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.warn('[Firestore Nakes Password Sync Warning]:', fsErr);
        }
      }

      // Refresh tabel nakes admin jika sedang aktif
      if (typeof fetchAndRenderNakesTable === 'function') {
        fetchAndRenderNakesTable();
      }

    } else {
      // 2. Coba via Firebase Auth untuk pengguna biasa
      if (window.NeuraFirebase && window.NeuraFirebase.auth) {
        try {
          const auth = typeof window.NeuraFirebase.auth === 'function' ? window.NeuraFirebase.auth() : window.NeuraFirebase.auth;
          const currentUser = auth ? auth.currentUser : null;

          if (currentUser && currentUser.email) {
            // Re-authenticate dulu dengan credential kata sandi lama
            if (window.firebase && window.firebase.auth && window.firebase.auth.EmailAuthProvider) {
              const credential = window.firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPassword);
              await currentUser.reauthenticateWithCredential(credential);
            }
            // Perbarui kata sandi di Firebase
            await currentUser.updatePassword(newPassword);
          }
        } catch (fbErr) {
          if (fbErr.code === 'auth/wrong-password') {
            throw new Error('Kata sandi saat ini yang Anda masukkan salah.');
          } else if (fbErr.code === 'auth/weak-password') {
            throw new Error('Kata sandi terlalu lemah. Gunakan kombinasi karakter yang lebih kuat.');
          } else {
            console.warn('[Firebase Auth updatePassword warning]:', fbErr);
          }
        }
      }
    }

    // Simpan metadata waktu update sandi
    localStorage.setItem('neura_password_last_updated', new Date().toISOString());

    if (typeof showToast === 'function') {
      showToast('Kata sandi akun Anda berhasil diperbarui dan disinkronkan ke server!', 'success');
    }

    document.getElementById('form-edit-password')?.reset();
    handlePasswordStrengthInput('');
    closeEditProfileModal();
  } catch (err) {
    console.error('Error updating password:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Gagal mengubah kata sandi.', 'error');
    }
  } finally {
    if (updateBtn) {
      updateBtn.disabled = false;
      updateBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <span>Perbarui Kata Sandi</span>
      `;
    }
  }
}
window.handleUpdatePassword = handleUpdatePassword;


