/**
 * public/js/admin-dataset-drawer.js
 * Slide-over Quick Preview Drawer untuk Dataset, Model ML, Statistik, Nakes, & Sistem.
 */
(function () {
  const backdrop = () => document.getElementById('hub-drawer-backdrop');
  const titleEl = () => document.getElementById('drawer-title');
  const subtitleEl = () => document.getElementById('drawer-subtitle');
  const iconEl = () => document.getElementById('drawer-icon');
  const bodyEl = () => document.getElementById('drawer-body');
  const primaryBtn = () => document.getElementById('drawer-primary-btn');

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function closeDrawer() {
    const bd = backdrop();
    if (!bd) return;
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden', 'true');
  }

  function setPrimaryAction(label, href) {
    const btn = primaryBtn();
    if (!btn) return;
    if (label && href) {
      btn.textContent = label;
      btn.href = href;
      btn.style.display = 'inline-flex';
    } else {
      btn.style.display = 'none';
    }
  }

  async function renderDatasetPreview(key, meta) {
    bodyEl().innerHTML = '<p style="color:var(--hub-text-muted)">Memuat sampel dataset...</p>';
    try {
      const res = await fetch(`/api/admin/datasets/${encodeURIComponent(key)}/preview?limit=15`);
      const data = await res.json();
      if (!data.success) {
        bodyEl().innerHTML = `<p style="color:#dc2626">${escHtml(data.error || 'Gagal memuat dataset.')}</p>`;
        return;
      }

      const headersHtml = (data.headers || []).map(h => `<th>${escHtml(h)}</th>`).join('');
      const rowsHtml = (data.rows || []).map(row =>
        `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join('')}</tr>`
      ).join('');

      bodyEl().innerHTML = `
        <div class="drawer-kpi-row">
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Total Baris</div>
            <div class="drawer-kpi-val">${Number(data.total_rows || 0).toLocaleString()}</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Total Kolom</div>
            <div class="drawer-kpi-val">${data.total_columns || 0}</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Tipe Split</div>
            <div class="drawer-kpi-val">${escHtml(meta.badge || 'CSV')}</div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--hub-text-muted);margin-bottom:10px;">
          Menampilkan 15 baris pertama (maksimal 12 kolom awal) dari <code>${escHtml(key)}</code>:
        </p>
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="4">Tidak ada baris data</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      bodyEl().innerHTML = `<p style="color:#dc2626">Terjadi kesalahan jaringan: ${escHtml(err.message)}</p>`;
    }
  }

  async function renderStatsPreview() {
    bodyEl().innerHTML = '<p style="color:var(--hub-text-muted)">Memuat statistik platform...</p>';
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      const kpis = data.platform_kpis || {};
      const engine = data.ai_engine || {};
      bodyEl().innerHTML = `
        <div class="drawer-kpi-row">
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Total Pengguna</div>
            <div class="drawer-kpi-val">${kpis.total_users ?? '-'}</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Nakes Terverifikasi</div>
            <div class="drawer-kpi-val">${kpis.total_verified_nakes ?? '-'}</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Dokumen Konsultasi</div>
            <div class="drawer-kpi-val">${kpis.total_consultation_docs ?? '-'}</div>
          </div>
        </div>
        <div class="drawer-kpi-card" style="margin-bottom:12px;">
          <div class="drawer-kpi-label">AI Engine</div>
          <div class="drawer-kpi-val" style="font-size:13px;">${escHtml(engine.model || 'XGBoost')} &bull; Akurasi ${escHtml(engine.accuracy || '-')}</div>
        </div>
        <p style="font-size:12px;color:var(--hub-text-muted);">
          Status layanan: <strong>${escHtml(kpis.service_status || 'ONLINE')}</strong>. Untuk grafik interaktif lengkap, buka panel Statistik di Neura Chat.
        </p>
      `;
    } catch (err) {
      bodyEl().innerHTML = `<p style="color:#dc2626">${escHtml(err.message)}</p>`;
    }
  }

  async function renderNakesPreview() {
    bodyEl().innerHTML = '<p style="color:var(--hub-text-muted)">Memuat direktori tenaga kesehatan...</p>';
    try {
      const res = await fetch('/api/admin/nakes');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.nakes || data.data || []);
      const rows = list.slice(0, 12).map(n => `
        <tr>
          <td>${escHtml(n.name || n.nama || '-')}</td>
          <td>${escHtml(n.email || '-')}</td>
          <td>${escHtml(n.specialty || n.spesialis || 'Umum')}</td>
        </tr>
      `).join('');
      bodyEl().innerHTML = `
        <div class="drawer-kpi-row">
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Total Nakes</div>
            <div class="drawer-kpi-val">${list.length}</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Endpoint</div>
            <div class="drawer-kpi-val" style="font-size:11px;">/api/admin/nakes</div>
          </div>
          <div class="drawer-kpi-card">
            <div class="drawer-kpi-label">Status</div>
            <div class="drawer-kpi-val">Synced</div>
          </div>
        </div>
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr><th>Nama</th><th>Email</th><th>Spesialisasi</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3">Belum ada data nakes</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      bodyEl().innerHTML = `<p style="color:#dc2626">${escHtml(err.message)}</p>`;
    }
  }

  async function renderDatabasePreview() {
    bodyEl().innerHTML = '<p style="color:var(--hub-text-muted)">Memuat daftar koleksi database...</p>';
    try {
      const res = await fetch('/api/database/collections');
      const data = await res.json();
      const cols = data.collections || [];
      const rows = cols.map(c => `
        <tr>
          <td>${escHtml(c.name || c.id)}</td>
          <td>${c.count ?? c.doc_count ?? '-'}</td>
          <td>${escHtml(c.source || 'MySQL/JSON')}</td>
        </tr>
      `).join('');
      bodyEl().innerHTML = `
        <p style="font-size:12px;color:var(--hub-text-muted);margin-bottom:10px;">
          Ringkasan koleksi aktif pada backend Neura:
        </p>
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr><th>Koleksi</th><th>Records</th><th>Sumber</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3">Tidak ada koleksi</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      bodyEl().innerHTML = `<p style="color:#dc2626">${escHtml(err.message)}</p>`;
    }
  }

  function renderMlChartsPreview() {
    bodyEl().innerHTML = `
      <p style="font-size:12.5px;color:var(--hub-text-secondary);margin-bottom:10px;">
        Visualisasi performa pelatihan Neural Network &amp; XGBoost terbaru dari <code>/public/assets</code>:
      </p>
      <div class="drawer-chart-grid">
        <div class="drawer-chart-card">
          <div class="drawer-kpi-label" style="margin-bottom:6px;">Model Accuracy Curve</div>
          <img src="/assets/NeuralNetwork_accuracy.png" alt="NeuralNetwork Accuracy" onerror="this.alt='Grafik belum tersedia'" />
        </div>
        <div class="drawer-chart-card">
          <div class="drawer-kpi-label" style="margin-bottom:6px;">Model Loss Curve</div>
          <img src="/assets/NeuralNetwork_loss.png" alt="NeuralNetwork Loss" onerror="this.alt='Grafik belum tersedia'" />
        </div>
      </div>
    `;
  }

  async function renderPresencePreview() {
    bodyEl().innerHTML = '<p style="color:var(--hub-text-muted)">Memeriksa administrator aktif...</p>';
    try {
      const res = await fetch('/api/admin/active-collaborators');
      const data = await res.json();
      const admins = data.collaborators || data.active || [];
      const rows = admins.map(a => `
        <tr>
          <td>${escHtml(a.email || a.name || '-')}</td>
          <td>${escHtml(a.status || 'online')}</td>
          <td>${escHtml(a.last_seen || '-')}</td>
        </tr>
      `).join('');
      bodyEl().innerHTML = `
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr><th>Admin</th><th>Status</th><th>Aktivitas</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="3">Tidak ada kolaborator aktif saat ini</td></tr>'}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      bodyEl().innerHTML = `<p style="color:#dc2626">${escHtml(err.message)}</p>`;
    }
  }

  function open(moduleItem) {
    const bd = backdrop();
    if (!bd || !moduleItem) return;

    titleEl().textContent = moduleItem.title;
    subtitleEl().textContent = moduleItem.desc;
    iconEl().innerHTML = moduleItem.icon || '';
    setPrimaryAction(moduleItem.actionLabel, moduleItem.href);

    bd.classList.add('open');
    bd.setAttribute('aria-hidden', 'false');

    if (moduleItem.previewType === 'dataset') {
      renderDatasetPreview(moduleItem.id, moduleItem);
    } else if (moduleItem.previewType === 'ml') {
      renderMlChartsPreview();
    } else if (moduleItem.previewType === 'stats') {
      renderStatsPreview();
    } else if (moduleItem.previewType === 'nakes') {
      renderNakesPreview();
    } else if (moduleItem.previewType === 'database') {
      renderDatabasePreview();
    } else if (moduleItem.previewType === 'presence') {
      renderPresencePreview();
    } else {
      bodyEl().innerHTML = `
        <div class="drawer-kpi-card" style="margin-bottom:12px;">
          <div class="drawer-kpi-label">Modul</div>
          <div class="drawer-kpi-val">${escHtml(moduleItem.title)}</div>
        </div>
        <p style="line-height:1.6;color:var(--hub-text-secondary);">${escHtml(moduleItem.detail || moduleItem.desc)}</p>
      `;
    }
  }

  function init() {
    document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
    document.getElementById('drawer-cancel-btn')?.addEventListener('click', closeDrawer);
    backdrop()?.addEventListener('click', (e) => {
      if (e.target === backdrop()) closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  window.AdminHubDrawer = { init, open, close: closeDrawer };
})();
