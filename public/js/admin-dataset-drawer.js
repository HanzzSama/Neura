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

  function renderSkeleton(lines = 5) {
    return Array.from({ length: lines }, (_, i) =>
      `<div class="hub-skeleton" style="width:${95 - (i % 3) * 14}%"></div>`
    ).join('');
  }

  async function renderDatasetPreview(key, meta) {
    const isSplitDataset = ['dataset-original', 'dataset-training', 'dataset-testing'].includes(key);
    const tabsHtml = isSplitDataset ? `
      <div class="drawer-tabs" role="tablist">
        <button type="button" class="drawer-tab-btn ${key === 'dataset-original' ? 'active' : ''}" data-split-key="dataset-original">Original (100%)</button>
        <button type="button" class="drawer-tab-btn ${key === 'dataset-training' ? 'active' : ''}" data-split-key="dataset-training">Training (80%)</button>
        <button type="button" class="drawer-tab-btn ${key === 'dataset-testing' ? 'active' : ''}" data-split-key="dataset-testing">Testing (20%)</button>
      </div>
    ` : '';

    bodyEl().innerHTML = `${tabsHtml}${renderSkeleton(6)}`;
    try {
      const res = await fetch(`/api/admin/datasets/${encodeURIComponent(key)}/preview?limit=25`);
      const data = await res.json();
      if (!data.success) {
        bodyEl().innerHTML = `${tabsHtml}<p style="color:#dc2626">${escHtml(data.error || 'Gagal memuat dataset.')}</p>`;
        return;
      }

      const headersHtml = (data.headers || []).map(h => `<th>${escHtml(h)}</th>`).join('');
      const allRows = data.rows || [];

      const renderRows = (q) => {
        const term = (q || '').trim().toLowerCase();
        const filtered = term
          ? allRows.filter(r => r.some(c => String(c).toLowerCase().includes(term)))
          : allRows;
        return filtered.map(row =>
          `<tr>${row.map(cell => `<td>${escHtml(cell)}</td>`).join('')}</tr>`
        ).join('') || '<tr><td colspan="4">Tidak ada baris yang cocok</td></tr>';
      };

      const splitLabel = key === 'dataset-training' ? '80% Train' : (key === 'dataset-testing' ? '20% Test' : (meta.badge || '100% CSV'));

      bodyEl().innerHTML = `
        ${tabsHtml}
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
            <div class="drawer-kpi-val">${escHtml(splitLabel)}</div>
          </div>
        </div>
        <input type="text" class="drawer-filter-input" id="drawer-row-filter" placeholder="Filter nilai pada sampel baris..." autocomplete="off" />
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr>${headersHtml}</tr></thead>
            <tbody id="drawer-table-tbody">${renderRows('')}</tbody>
          </table>
        </div>
      `;

      bodyEl().querySelectorAll('[data-split-key]').forEach(tab => {
        tab.addEventListener('click', () => {
          const nextKey = tab.dataset.splitKey;
          if (nextKey && nextKey !== key) {
            renderDatasetPreview(nextKey, meta);
          }
        });
      });

      document.getElementById('drawer-row-filter')?.addEventListener('input', (e) => {
        const tbody = document.getElementById('drawer-table-tbody');
        if (tbody) tbody.innerHTML = renderRows(e.target.value);
      });
    } catch (err) {
      bodyEl().innerHTML = `${tabsHtml}<p style="color:#dc2626">Terjadi kesalahan jaringan: ${escHtml(err.message)}</p>`;
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
