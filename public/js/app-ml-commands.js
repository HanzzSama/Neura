/**
 * public/js/app-ml-commands.js
 * ============================
 * ML Commands Catalog, Role-Based Visibility Filtering, & Accordion Controls.
 * Supports /profile, /predict, /dokumen, /periksa, /eval, /train, /progress, /status, /help, /intro.
 */

const ML_COMMANDS_CONFIG = [
  {
    cmd: '/profile',
    tag: '/profile',
    label: { id: 'Data Diri Pasien', en: 'Patient Profile' },
    desc: {
      User: 'Lengkapi atau perbarui formulir data diri & 32 biomarker klinis Anda',
      Nakes: 'Input & evaluasi rekam medis biomarker pasien untuk skrining',
      Admin: 'Inspeksi & pengelolaan profil biomarker pengguna'
    },
    roles: ['User', 'Nakes', 'Admin']
  },
  {
    cmd: '/predict',
    tag: '/predict',
    label: { id: 'Jalankan Prediksi', en: 'Run Prediction' },
    desc: {
      User: 'Skrining risiko Alzheimer personal berbasis 32 biomarker klinis',
      Nakes: 'Inferensi diagnostik klinis (Mode Pasien & Uji Dataset 2.149 Data)',
      Admin: 'Diagnostik inferensi XGBoost & pengujian benchmark'
    },
    roles: ['User', 'Nakes', 'Admin']
  },
  {
    cmd: '/dokumen',
    tag: '/dokumen',
    label: { id: 'Dokumen Konsultasi', en: 'Consultation Doc' },
    desc: {
      User: 'Unduh lembar hasil konsultasi & Kode Nakes untuk rujukan ke faskes',
      Nakes: 'Validasi resume medis, lembar rujukan klinis & verifikasi Kode Nakes',
      Admin: 'Generator dokumen konsultasi & pemeriksaan template rujukan'
    },
    roles: ['User', 'Nakes', 'Admin']
  },
  {
    cmd: '/periksa',
    tag: '/periksa',
    label: { id: 'Periksa Dokumen Pasien', en: 'Inspect Patient Doc' },
    desc: {
      Nakes: 'Input kode konsultasi pasien untuk menelaah rekam medis & validasi klinis',
      Admin: 'Pencarian & validasi dokumen konsultasi pasien via kode'
    },
    roles: ['Nakes', 'Admin']
  },
  {
    cmd: '/eval',
    tag: '/eval',
    label: { id: 'Evaluasi Model', en: 'Evaluate Model' },
    desc: {
      Nakes: 'Validasi metrik diagnostik (Akurasi 95.4%, Sensitivitas, Spesifisitas, AUC-ROC)',
      Admin: 'Evaluasi performa XGBoost, Confusion Matrix, log-loss, F1-Score & ROC'
    },
    roles: ['Nakes', 'Admin']
  },
  {
    cmd: '/train 5',
    tag: '/train 5',
    label: { id: 'Latih 5 Epoch', en: 'Train 5 Epochs' },
    desc: {
      Admin: 'Latih ulang model XGBoost 5 boosting rounds pada dataset klinis'
    },
    roles: ['Admin']
  },
  {
    cmd: '/progress',
    tag: '/progress',
    label: { id: 'Progress Live', en: 'Live Progress' },
    desc: {
      Admin: 'Pantau log telemetri optimasi boosting iteratif secara realtime'
    },
    roles: ['Admin']
  },
  {
    cmd: '/status',
    tag: '/status',
    label: { id: 'Cek Status', en: 'Check Status' },
    desc: {
      User: 'Periksa kesiapan dan ketersediaan layanan sistem Neura AI',
      Nakes: 'Periksa kesiapan model diagnostik XGBoost dan parameter biomarker',
      Admin: 'Inspeksi telemetri lengkap sistem, memori server, dan checkpoint model'
    },
    roles: ['User', 'Nakes', 'Admin']
  },
  {
    cmd: '/help',
    tag: '/help',
    label: { id: 'Daftar Perintah', en: 'Command List' },
    desc: {
      User: 'Panduan lengkap perintah dan cara penggunaan konsultasi Neura',
      Nakes: 'Panduan perintah klinis, diagnostik biomarker, dan evaluasi',
      Admin: 'Dokumentasi seluruh perintah sistem, pelatihan, dan telemetri'
    },
    roles: ['User', 'Nakes', 'Admin']
  },
  {
    cmd: '/intro',
    tag: '/intro',
    label: { id: 'Pengenalan Neura', en: 'About Neura' },
    desc: {
      User: 'Pengenalan Neura AI dan panduan konsultasi kesehatan memori',
      Nakes: 'Protokol klinis Neura AI untuk deteksi dini penyakit Alzheimer',
      Admin: 'Ikhtisar arsitektur sistem dan engine diagnostik XGBoost'
    },
    roles: ['User', 'Nakes', 'Admin']
  }
];

function renderRoleMLCommands(roleOverride = null) {
  const currentRole = roleOverride || (typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User');
  const lang = typeof getAppLanguage === 'function' ? getAppLanguage() : 'id';

  // 1. Render Sidebar #ml-commands-list
  const sidebarList = document.getElementById('ml-commands-list');
  if (sidebarList) {
    const allowedCommands = ML_COMMANDS_CONFIG.filter(item => item.roles.includes(currentRole));
    let html = '';
    allowedCommands.forEach(item => {
      const lbl = lang === 'en' ? item.label.en : item.label.id;
      const desc = item.desc[currentRole] || item.desc['User'] || '';
      html += `
        <button class="ml-command-item" onclick="submitCommand('${escapeHtml(item.cmd)}')" title="${escapeHtml(desc)}">
          <span>${escapeHtml(lbl)}</span>
          <span class="ml-tag">${escapeHtml(item.tag)}</span>
        </button>
      `;
    });
    sidebarList.innerHTML = html;
  }

  // 2. Update Header Title (without role pill badge)
  const headerBtn = document.getElementById('ml-commands-toggle-btn');
  if (headerBtn) {
    const titleSpan = headerBtn.querySelector('.nav-group-title');
    if (titleSpan) {
      const mainText = lang === 'en' ? 'ML Commands' : 'Perintah ML';
      titleSpan.textContent = mainText;
    }
  }

  // 3. Render Quick Menu in Chat Box
  const quickMenu = document.getElementById('quick-menu');
  if (quickMenu) {
    const allowedCommands = ML_COMMANDS_CONFIG.filter(item => item.roles.includes(currentRole));
    let qmHtml = '';
    allowedCommands.forEach(item => {
      const lbl = lang === 'en' ? item.label.en : item.label.id;
      qmHtml += `
        <button type="button" class="qm-item" onclick="submitCommand('${escapeHtml(item.cmd)}');closeQuickMenu()">
          <span>${escapeHtml(lbl)}</span>
          <span class="qm-tag">${escapeHtml(item.tag)}</span>
        </button>
      `;
    });

    // Voice and Konsul options
    qmHtml += `
      <button type="button" class="qm-item" onclick="if(window.openVoiceChat)window.openVoiceChat();closeQuickMenu()">
        <span>${lang === 'en' ? 'Voice Room' : 'Ruang Suara'}</span>
        <span class="qm-tag">/voice</span>
      </button>
      <button type="button" class="qm-item" onclick="submitCommand('/konsul');closeQuickMenu()">
        <span>${lang === 'en' ? 'Clinical Consult' : 'Konsultasi Klinis'}</span>
        <span class="qm-tag">/konsul</span>
      </button>
    `;
    quickMenu.innerHTML = qmHtml;
  }
}

function toggleMLCommandsDropdown() {
  const list = document.getElementById('ml-commands-list');
  const btn = document.getElementById('ml-commands-toggle-btn');
  if (!list || !btn) return;

  const isCollapsed = list.classList.toggle('collapsed');
  btn.classList.toggle('collapsed', isCollapsed);
  btn.setAttribute('aria-expanded', !isCollapsed);

  try {
    localStorage.setItem(window.ML_DROPDOWN_STORAGE_KEY || 'neura_ml_dropdown_collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) { }
}

function initMLCommandsDropdown() {
  try {
    const saved = localStorage.getItem(window.ML_DROPDOWN_STORAGE_KEY || 'neura_ml_dropdown_collapsed');
    const isCollapsed = saved === 'true';
    const list = document.getElementById('ml-commands-list');
    const btn = document.getElementById('ml-commands-toggle-btn');
    if (list) list.classList.toggle('collapsed', isCollapsed);
    if (btn) {
      btn.classList.toggle('collapsed', isCollapsed);
      btn.setAttribute('aria-expanded', !isCollapsed);
    }
  } catch (e) { }
  renderRoleMLCommands();
}

// Window exports
window.ML_COMMANDS_CONFIG = ML_COMMANDS_CONFIG;
window.renderRoleMLCommands = renderRoleMLCommands;
window.toggleMLCommandsDropdown = toggleMLCommandsDropdown;
window.initMLCommandsDropdown = initMLCommandsDropdown;
