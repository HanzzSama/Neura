/**
 * public/js/app-ml-commands.js
 * ============================
 * ML Commands Catalog, Role-Based Visibility Filtering, & Accordion Controls.
 * - Admin Role: Focused on Platform Statistics & Monitoring (/stats, /count_user, /count_doc, /count_nakes, /data_summary, /status, /help, /intro)
 * - Nakes Role: Clinical Diagnostics & Patient Verification (/profile, /predict, /dokumen, /periksa, /eval, /status, /help, /intro)
 * - User Role: Personal Memory Screening & Consultation (/profile, /predict, /dokumen, /status, /help, /intro)
 */

const ML_COMMANDS_CONFIG = [
  // 1. User & Nakes Commands
  {
    cmd: '/profile',
    tag: '/profile',
    label: { id: 'Data Diri Pasien', en: 'Patient Profile' },
    desc: {
      User: 'Lengkapi atau perbarui formulir data diri & 32 biomarker klinis Anda',
      Nakes: 'Input & evaluasi rekam medis biomarker pasien untuk skrining'
    },
    roles: ['User', 'Nakes']
  },
  {
    cmd: '/predict',
    tag: '/predict',
    label: { id: 'Jalankan Prediksi', en: 'Run Prediction' },
    desc: {
      User: 'Skrining risiko Alzheimer personal berbasis 32 biomarker klinis',
      Nakes: 'Inferensi diagnostik klinis (Mode Pasien & Uji Dataset 2.149 Data)'
    },
    roles: ['User', 'Nakes']
  },
  {
    cmd: '/dokumen',
    tag: '/dokumen',
    label: { id: 'Dokumen Konsultasi', en: 'Consultation Doc' },
    desc: {
      User: 'Unduh lembar hasil konsultasi & Kode Nakes untuk rujukan ke faskes',
      Nakes: 'Validasi resume medis, lembar rujukan klinis & verifikasi Kode Nakes'
    },
    roles: ['User', 'Nakes']
  },
  {
    cmd: '/periksa',
    tag: '/periksa',
    label: { id: 'Periksa Dokumen Pasien', en: 'Inspect Patient Doc' },
    desc: {
      Nakes: 'Input kode konsultasi pasien untuk menelaah rekam medis & validasi klinis'
    },
    roles: ['Nakes']
  },
  {
    cmd: '/eval',
    tag: '/eval',
    label: { id: 'Evaluasi Model', en: 'Evaluate Model' },
    desc: {
      Nakes: 'Validasi metrik diagnostik (Akurasi 95.4%, Sensitivitas, Spesifisitas, AUC-ROC)'
    },
    roles: ['Nakes']
  },

  // 2. Admin Statistics & Platform Monitoring Commands (Khusus Admin)
  {
    cmd: '/stats',
    tag: '/stats',
    label: { id: 'Statistik Platform', en: 'Platform Statistics' },
    desc: {
      Admin: 'Executive dashboard agregat pengguna, dokumen, tenaga medis, dan status AI'
    },
    roles: ['Admin']
  },
  {
    cmd: '/count_user',
    tag: '/count_user',
    label: { id: 'Hitung Pengguna', en: 'Count Users' },
    desc: {
      Admin: 'Statistik total pengguna klinis terdaftar, status verifikasi akun, dan peran'
    },
    roles: ['Admin']
  },
  {
    cmd: '/count_doc',
    tag: '/count_doc',
    label: { id: 'Hitung Dokumen', en: 'Count Documents' },
    desc: {
      Admin: 'Statistik total rekam medis & dokumen rujukan konsultasi tersimpan'
    },
    roles: ['Admin']
  },
  {
    cmd: '/count_nakes',
    tag: '/count_nakes',
    label: { id: 'Hitung Nakes', en: 'Count Clinicians' },
    desc: {
      Admin: 'Statistik total tenaga kesehatan profesional & faskes mitra terdaftar'
    },
    roles: ['Admin']
  },
  {
    cmd: '/data_summary',
    tag: '/data_summary',
    label: { id: 'Ringkasan Data', en: 'Data Summary' },
    desc: {
      Admin: 'Statistik analitik 2.149 sampel dataset klinis Alzheimer & distribusi diagnosis'
    },
    roles: ['Admin']
  },

  // 3. Shared Utility Commands
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
      Admin: 'Dokumentasi seluruh perintah statistik platform dan telemetri'
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

  // 2. Update Header Title
  const headerBtn = document.getElementById('ml-commands-toggle-btn');
  if (headerBtn) {
    const titleSpan = headerBtn.querySelector('.nav-group-title');
    if (titleSpan) {
      let mainText;
      if (currentRole === 'Admin') {
        mainText = lang === 'en' ? 'Admin Statistics' : 'Statistik Admin';
      } else {
        mainText = lang === 'en' ? 'ML Commands' : 'Perintah ML';
      }
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

    if (currentRole !== 'Admin') {
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
    }
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

// =============================================================================
// Statistical Output Renderers for Admin
// =============================================================================

function renderCountUserOutput(data) {
  const b = data.breakdown || {};
  const m = data.metrics || {};
  const total = data.total_users || (b.pasien + b.nakes + b.admin);
  const isFirestore = data.source && data.source.includes('Firestore');

  const html = `
    <h4>
      Statistik Pengguna Platform Neura AI
      ${isFirestore ? '<span style="font-size:11px;padding:2px 8px;border-radius:12px;background:rgba(42,157,143,0.15);color:var(--accent-teal);font-weight:600;margin-left:8px;vertical-align:middle">Cloud Firestore Live</span>' : ''}
    </h4>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
      Ringkasan seluruh akun terdaftar dan pengguna aktif di platform (Tabel Firestore <code>users</code>):
    </p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Total Pengguna</div>
          <div class="stat-val val-good" style="font-size:22px;font-weight:700">${total}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Pasien / Publik</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-teal)">${b.pasien ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Tenaga Medis (Nakes)</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-blue)">${b.nakes ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Administrator</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-terracotta)">${b.admin ?? 0}</div>
        </div>
      </div>

      <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;gap:16px;flex-wrap:wrap;font-size:12.5px">
        <div><strong>Status Akun:</strong> <span style="color:var(--accent-green)">${m.verified_accounts ?? 0} Terverifikasi</span> &bull; <span style="color:var(--text-muted)">${m.unverified_accounts ?? 0} Pending</span></div>
        <div><strong>Sesi Aktif:</strong> <span style="color:var(--accent-teal)">${m.active_today ?? 0} akun aktif</span></div>
        ${m.source ? `<div style="color:var(--text-muted)"><strong>Sumber:</strong> ${escapeHtml(m.source)}</div>` : ''}
      </div>
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['/count_doc', '/count_nakes', '/stats']
  });
}

function renderCountDocOutput(data) {
  const m = data.metrics || {};
  const total = data.total_documents || 0;
  const recent = data.recent_documents || [];
  const isFirestore = data.source && data.source.includes('Firestore');

  let tableRows = '';
  if (recent.length > 0) {
    tableRows = recent.map(d => `
      <tr>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px">${escapeHtml(d.id || '-')}</td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--accent-teal)">${escapeHtml(d.nakes_code || '-')}</td>
        <td>${escapeHtml(d.patient_name || 'Pasien')}</td>
        <td><span class="badge ${d.risk_level === 'High Risk' ? 'badge-danger' : 'badge-success'}">${escapeHtml(d.risk_level || 'Normal')}</span></td>
        <td style="font-size:11.5px;color:var(--text-muted)">${escapeHtml(d.created_at || '-')}</td>
      </tr>
    `).join('');
  }

  const html = `
    <h4>
      Statistik Dokumen Konsultasi Klinis
      ${isFirestore ? '<span style="font-size:11px;padding:2px 8px;border-radius:12px;background:rgba(42,157,143,0.15);color:var(--accent-teal);font-weight:600;margin-left:8px;vertical-align:middle">Cloud Firestore Live</span>' : ''}
    </h4>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
      Total rekam medis, dokumen konsultasi, dan kode rujukan Nakes yang diterbitkan (Tabel Firestore <code>consultations</code>):
    </p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Total Dokumen</div>
          <div class="stat-val val-good" style="font-size:22px;font-weight:700">${total}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Tervalidasi Nakes</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-green)">${m.validated_by_nakes ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Kasus Risiko Tinggi</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-red)">${m.high_risk_cases ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Normal / Risiko Rendah</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-teal)">${m.low_risk_cases ?? 0}</div>
        </div>
      </div>

      ${tableRows ? `
        <div style="margin-top:16px;">
          <div style="font-size:12.5px;font-weight:600;margin-bottom:8px;color:var(--text-primary)">Dokumen Terbaru Diterbitkan:</div>
          <table class="claude-table" style="font-size:12px">
            <thead>
              <tr><th>Doc ID</th><th>Kode Nakes</th><th>Nama Pasien</th><th>Hasil Risiko</th><th>Waktu</th></tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      ` : `
        <p style="font-size:12.5px;color:var(--text-muted);margin-top:12px;font-style:italic">
          Belum ada riwayat dokumen konsultasi baru yang diterbitkan pada sesi ini. Dokumen akan bertambah otomatis saat pasien mengeksekusi <code>/dokumen</code>.
        </p>
      `}
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['/count_user', '/count_nakes', '/stats']
  });
}

function renderCountNakesOutput(data) {
  const m = data.metrics || {};
  const total = data.total_nakes || 0;
  const list = data.directory || [];

  let listHtml = '';
  if (list.length > 0) {
    listHtml = list.map(n => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div>
          <div style="font-weight:600;color:var(--text-primary)">${escapeHtml(n.name || '')}</div>
          <div style="font-size:11.5px;color:var(--text-muted)">${escapeHtml(n.profession || '')} &bull; ${escapeHtml(n.institution || '')}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--accent-teal);display:block">${escapeHtml(n.email || '')}</span>
          <span style="font-size:10.5px;color:var(--accent-green);font-weight:600">${escapeHtml(n.status || 'Terverifikasi')}</span>
        </div>
      </div>
    `).join('');
  }

  const html = `
    <h4>Statistik Tenaga Kesehatan (Nakes) Terdaftar</h4>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
      Direktori dokter spesialis dan tenaga kesehatan mitra terverifikasi:
    </p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Total Tenaga Medis</div>
          <div class="stat-val val-good" style="font-size:22px;font-weight:700">${total}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Terverifikasi KKI / Kemenkes</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-green)">${m.verified_kki ?? total}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Fasilitas Kesehatan Mitra</div>
          <div class="stat-val" style="font-size:18px;color:var(--accent-teal)">${m.partner_institutions ?? 0} Faskes</div>
        </div>
      </div>

      <div style="margin-top:14px;padding-top:10px;">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:6px;color:var(--text-primary)">Direktori Nakes Aktif:</div>
        ${listHtml}
      </div>
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['/count_user', '/count_doc', '/stats']
  });
}

function renderDataSummaryOutput(data) {
  const d = data.diagnosis_distribution || {};
  const dem = data.demographics || {};
  const c = data.clinical_metrics || {};
  const top = data.top_features || [];

  let topFeaturesHtml = '';
  if (top.length > 0) {
    topFeaturesHtml = top.map(f => `
      <tr>
        <td style="font-weight:600;color:var(--text-primary)">${escapeHtml(f.name)}</td>
        <td style="color:var(--accent-teal);font-weight:600;font-family:'JetBrains Mono',monospace">${escapeHtml(f.weight)}</td>
        <td style="font-size:11.5px;color:var(--text-muted)">${escapeHtml(f.desc)}</td>
      </tr>
    `).join('');
  }

  const html = `
    <h4>Ringkasan Statistik Dataset Klinis 32 Biomarker</h4>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
      Analitik distribusi data rekam medis pasien Alzheimer (2.149 sampel data latih):
    </p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Total Sampel Pasien</div>
          <div class="stat-val val-good" style="font-size:20px;font-weight:700">2.149 Data</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Normal / Non-Demensia</div>
          <div class="stat-val" style="font-size:17px;color:var(--accent-green)">${d.normal_non_dementia} (${d.normal_percent}%)</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Terdiagnosis Risiko</div>
          <div class="stat-val" style="font-size:17px;color:var(--accent-red)">${d.alzheimer_risk} (${d.alzheimer_percent}%)</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Rata-Rata Usia Pasien</div>
          <div class="stat-val" style="font-size:17px;color:var(--accent-blue)">${dem.avg_age} Tahun</div>
        </div>
      </div>

      <div style="margin-top:14px;padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;">
        <div><strong>Proporsi Gender:</strong> <span>${dem.pria} Pria (50.6%) &bull; ${dem.wanita} Wanita (49.4%)</span></div>
        <div><strong>Rata-Rata Skor MMSE:</strong> <span style="color:var(--accent-teal)">${c.avg_mmse} / 30</span></div>
        <div><strong>Skor Kemandirian ADL:</strong> <span style="color:var(--accent-teal)">${c.avg_adl_score} / 10</span></div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-size:12.5px;font-weight:600;margin-bottom:8px;color:var(--text-primary)">Biomarker Paling Berpengaruh (Top Feature Importances):</div>
        <table class="claude-table" style="font-size:12px">
          <thead>
            <tr><th>Fitur Biomarker</th><th>Kontribusi Bobot</th><th>Keterangan Diagnostik</th></tr>
          </thead>
          <tbody>${topFeaturesHtml}</tbody>
        </table>
      </div>
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['/stats', '/count_user', '/count_doc']
  });
}

function renderPlatformStatsOutput(data) {
  const k = data.platform_kpis || {};
  const b = data.user_breakdown || {};
  const eng = data.ai_engine || {};

  const html = `
    <h4>Executive Platform Statistics &bull; Neura AI</h4>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px">
      Ringkasan metrik performa, pengguna, dan dokumen platform Neura AI:
    </p>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Total Pengguna</div>
          <div class="stat-val" style="font-size:22px;font-weight:700;color:var(--accent-teal)">${k.total_users ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Dokumen Konsultasi</div>
          <div class="stat-val" style="font-size:22px;font-weight:700;color:var(--accent-blue)">${k.total_consultation_docs ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Tenaga Medis (Nakes)</div>
          <div class="stat-val" style="font-size:22px;font-weight:700;color:var(--accent-green)">${k.total_verified_nakes ?? 0}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Akurasi Model AI</div>
          <div class="stat-val val-good" style="font-size:22px;font-weight:700">${eng.accuracy ?? '95.35%'}</div>
        </div>
      </div>

      <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12.5px;">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text-primary)">Distribusi Akun:</div>
          <div style="color:var(--text-secondary)">
            Pasien: <strong>${b.pasien ?? 0}</strong> &bull; Nakes: <strong>${b.nakes ?? 0}</strong> &bull; Admin: <strong>${b.admin ?? 0}</strong>
          </div>
        </div>
        <div style="padding:10px 14px;background:rgba(255,255,255,0.03);border-radius:8px;font-size:12.5px;">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text-primary)">Status Layanan:</div>
          <div style="color:var(--accent-green);font-weight:600">
            ${k.service_status || 'ONLINE & READY'} &bull; 32 Biomarker
          </div>
        </div>
      </div>
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['/count_user', '/count_doc', '/count_nakes', '/data_summary']
  });
}

// Window exports
window.ML_COMMANDS_CONFIG = ML_COMMANDS_CONFIG;
window.renderRoleMLCommands = renderRoleMLCommands;
window.toggleMLCommandsDropdown = toggleMLCommandsDropdown;
window.initMLCommandsDropdown = initMLCommandsDropdown;
window.renderCountUserOutput = renderCountUserOutput;
window.renderCountDocOutput = renderCountDocOutput;
window.renderCountNakesOutput = renderCountNakesOutput;
window.renderDataSummaryOutput = renderDataSummaryOutput;
window.renderPlatformStatsOutput = renderPlatformStatsOutput;
