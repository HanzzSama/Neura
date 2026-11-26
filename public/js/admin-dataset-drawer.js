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
      const [resNakes, resQr] = await Promise.all([
        fetch('/api/admin/nakes'),
        fetch('/api/admin/nakes-qr-link', { cache: 'no-store' })
      ]);
      const data = await resNakes.json();
      const qrJson = resQr.ok ? await resQr.json().catch(() => null) : null;
      let qrErrorMsg = !resQr.ok
        ? `Endpoint /api/admin/nakes-qr-link merespons HTTP ${resQr.status}. Restart server Flask agar rute baru aktif.`
        : '';
      let qrState = (qrJson && qrJson.data) || { live_id: '', active: false, qr_url: '' };
      if (!qrState.qr_url && qrState.live_id) {
        qrState.qr_url = `${window.location.origin}/welcome/nakes/qr-code?live=${encodeURIComponent(qrState.live_id)}`;
      }

      const list = Array.isArray(data) ? data : (data.nakes || data.data || []);
      const rows = list.slice(0, 20).map((n, idx) => {
        const pwd = String(n.password || '').trim();
        const pwdHtml = pwd
          ? `<div class="nakes-pwd-cell">
               <code class="nakes-pwd-code" data-pwd-idx="${idx}" data-pwd-val="${escHtml(pwd)}" data-revealed="0">••••••••</code>
               <button type="button" class="nakes-pwd-toggle" data-pwd-toggle="${idx}">Lihat</button>
             </div>`
          : '<span style="color:var(--hub-text-muted)">-</span>';
        return `
        <tr>
          <td>${escHtml(n.name || n.nama || '-')}</td>
          <td>${escHtml(n.nakes_email || n.email || '-')}</td>
          <td>${pwdHtml}</td>
          <td>${escHtml(n.profession || n.specialty || n.spesialis || 'Umum')}</td>
        </tr>
      `;
      }).join('');

      bodyEl().innerHTML = `
        <div class="nakes-qr-admin-card" id="nakesQrAdminCard">
          <div class="nakes-qr-admin-head">
            <div>
              <div class="nakes-qr-admin-kicker">LIVE QR INVITE LINK</div>
              <div class="nakes-qr-admin-title">Tautan Undangan Registrasi Nakes</div>
            </div>
            <span class="nakes-qr-status-pill ${qrState.active ? 'is-active' : 'is-inactive'}" id="nakesQrStatusPill">
              ${qrState.active ? 'AKTIF' : 'NONAKTIF'}
            </span>
          </div>
          <div class="nakes-qr-url-row">
            <input type="text" class="nakes-qr-url-input" id="nakesQrUrlInput" readonly placeholder="Klik Generate URL Baru atau restart server..." value="${escHtml(qrState.qr_url || '')}" />
            <button type="button" class="nakes-qr-btn" id="nakesQrCopyBtn">Salin URL</button>
          </div>
          <div class="nakes-qr-actions-row">
            <button type="button" class="nakes-qr-btn nakes-qr-btn--primary" id="nakesQrToggleBtn">
              ${qrState.active ? 'Nonaktifkan URL' : 'Aktifkan URL'}
            </button>
            <button type="button" class="nakes-qr-btn" id="nakesQrGenerateBtn">Generate URL Baru</button>
            <a class="nakes-qr-btn" id="nakesQrOpenLink" href="${escHtml(qrState.qr_url || '#')}" target="_blank" rel="noopener">Buka Halaman QR ↗</a>
          </div>
          <div class="nakes-qr-feedback" id="nakesQrFeedback" ${qrErrorMsg ? '' : 'hidden'}>${escHtml(qrErrorMsg)}</div>
        </div>

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
            <thead><tr><th>Nama</th><th>Email</th><th>Password</th><th>Spesialisasi</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4">Belum ada data nakes</td></tr>'}</tbody>
          </table>
        </div>
      `;

      bodyEl().querySelectorAll('[data-pwd-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = btn.getAttribute('data-pwd-toggle');
          const codeEl = bodyEl().querySelector(`[data-pwd-idx="${idx}"]`);
          if (!codeEl) return;
          const revealed = codeEl.getAttribute('data-revealed') === '1';
          if (revealed) {
            codeEl.textContent = '••••••••';
            codeEl.setAttribute('data-revealed', '0');
            btn.textContent = 'Lihat';
          } else {
            codeEl.textContent = codeEl.getAttribute('data-pwd-val') || '-';
            codeEl.setAttribute('data-revealed', '1');
            btn.textContent = 'Tutup';
          }
        });
      });

      const urlInput = document.getElementById('nakesQrUrlInput');
      const statusPill = document.getElementById('nakesQrStatusPill');
      const toggleBtn = document.getElementById('nakesQrToggleBtn');
      const copyBtn = document.getElementById('nakesQrCopyBtn');
      const genBtn = document.getElementById('nakesQrGenerateBtn');
      const openLink = document.getElementById('nakesQrOpenLink');
      const feedbackEl = document.getElementById('nakesQrFeedback');

      function setQrFeedback(msg) {
        if (!feedbackEl) return;
        if (!msg) {
          feedbackEl.hidden = true;
          feedbackEl.textContent = '';
        } else {
          feedbackEl.hidden = false;
          feedbackEl.textContent = msg;
        }
      }

      function syncQrUi(next) {
        qrState = next || qrState;
        if (!qrState.qr_url && qrState.live_id) {
          qrState.qr_url = `${window.location.origin}/welcome/nakes/qr-code?live=${encodeURIComponent(qrState.live_id)}`;
        }
        if (urlInput) urlInput.value = qrState.qr_url || '';
        if (openLink) openLink.href = qrState.qr_url || '#';
        if (statusPill) {
          statusPill.textContent = qrState.active ? 'AKTIF' : 'NONAKTIF';
          statusPill.className = 'nakes-qr-status-pill ' + (qrState.active ? 'is-active' : 'is-inactive');
        }
        if (toggleBtn) {
          toggleBtn.textContent = qrState.active ? 'Nonaktifkan URL' : 'Aktifkan URL';
        }
        setQrFeedback('');
      }

      if (copyBtn && urlInput) {
        copyBtn.addEventListener('click', async () => {
          if (!urlInput.value) {
            setQrFeedback('URL belum tersedia. Pastikan server Flask sudah di-restart lalu klik Generate URL Baru.');
            return;
          }
          let copied = false;
          if (navigator.clipboard && window.isSecureContext) {
            try {
              await navigator.clipboard.writeText(urlInput.value);
              copied = true;
            } catch (_) {}
          }
          if (!copied) {
            urlInput.focus();
            urlInput.select();
            urlInput.setSelectionRange(0, urlInput.value.length);
            try { copied = document.execCommand('copy'); } catch (_) {}
          }
          copyBtn.textContent = copied ? 'Tersalin' : 'Pilih & Ctrl+C';
          setTimeout(() => { copyBtn.textContent = 'Salin URL'; }, 1600);
        });
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', async () => {
          toggleBtn.disabled = true;
          try {
            const r = await fetch('/api/admin/nakes-qr-link/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: !qrState.active })
            });
            const j = await r.json().catch(() => null);
            if (!r.ok || !j || !j.success || !j.data) {
              setQrFeedback(`Gagal mengubah status URL (HTTP ${r.status}). Restart server Flask terlebih dahulu.`);
              return;
            }
            syncQrUi(j.data);
          } catch (e) {
            setQrFeedback('Gagal menghubungi server: ' + e.message);
          } finally {
            toggleBtn.disabled = false;
          }
        });
      }

      if (genBtn) {
        genBtn.addEventListener('click', async () => {
          genBtn.disabled = true;
          try {
            const r = await fetch('/api/admin/nakes-qr-link/generate', { method: 'POST' });
            const j = await r.json().catch(() => null);
            if (!r.ok || !j || !j.success || !j.data) {
              setQrFeedback(`Gagal membuat URL baru (HTTP ${r.status}). Restart server Flask terlebih dahulu.`);
              return;
            }
            syncQrUi(j.data);
          } catch (e) {
            setQrFeedback('Gagal menghubungi server: ' + e.message);
          } finally {
            genBtn.disabled = false;
          }
        });
      }
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

  function buildDrawerSvgCurve(title, trainPts, valPts, isLoss) {
    const w = 520, h = 150, padX = 28, padY = 16;
    const all = [...trainPts, ...valPts];
    const minV = Math.min(...all) * 0.95;
    const maxV = Math.max(...all) * 1.03;
    const span = Math.max(0.01, maxV - minV);
    const toX = (i) => padX + (i / (trainPts.length - 1)) * (w - padX * 2);
    const toY = (v) => h - padY - ((v - minV) / span) * (h - padY * 2);
    const linePath = (pts) => pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const dots = (pts, color) => pts.map((v, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(v).toFixed(1)}" r="3.5" fill="${color}"><title>Epoch ${i + 1}: ${isLoss ? v.toFixed(3) : (v * 100).toFixed(1) + '%'}</title></circle>`).join('');

    return `
      <div class="drawer-chart-card">
        <div class="drawer-kpi-label" style="margin-bottom:8px;display:flex;justify-content:space-between;">
          <span>${escHtml(title)}</span>
          <span style="font-family:var(--hub-font-mono);font-size:10px;">
            <span style="color:var(--hub-accent);">&#9679; Train</span> &nbsp;
            <span style="color:#60A5FA;">&#9679; Val</span>
          </span>
        </div>
        <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:150px;display:block;background:var(--hub-bg-subtle);border-radius:8px;border:1px solid var(--hub-border);">
          <line x1="${padX}" y1="${padY}" x2="${w - padX}" y2="${padY}" stroke="var(--hub-border)" stroke-dasharray="3 3" />
          <line x1="${padX}" y1="${h / 2}" x2="${w - padX}" y2="${h / 2}" stroke="var(--hub-border)" stroke-dasharray="3 3" />
          <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="var(--hub-border)" />
          <path d="${linePath(trainPts)}" fill="none" stroke="var(--hub-accent)" stroke-width="2.2" stroke-linecap="round" />
          <path d="${linePath(valPts)}" fill="none" stroke="#60A5FA" stroke-width="2" stroke-dasharray="5 3" stroke-linecap="round" />
          ${dots(trainPts, 'var(--hub-accent)')}
          ${dots(valPts, '#60A5FA')}
        </svg>
      </div>
    `;
  }

  function renderMlChartsPreview() {
    const trainAcc = [0.68, 0.78, 0.86, 0.91, 0.9535];
    const valAcc = [0.65, 0.75, 0.83, 0.89, 0.938];
    const trainLoss = [0.64, 0.42, 0.28, 0.18, 0.11];
    const valLoss = [0.68, 0.48, 0.34, 0.24, 0.16];

    bodyEl().innerHTML = `
      <p style="font-size:12.5px;color:var(--hub-text-secondary);margin-bottom:10px;">
        Visualisasi kurva performa pelatihan <strong>XGBoost &amp; Neural Network</strong> (adaptif tema, hover titik untuk detail epoch):
      </p>
      <div class="drawer-chart-grid">
        ${buildDrawerSvgCurve('Model Accuracy Curve (5 Epochs)', trainAcc, valAcc, false)}
        ${buildDrawerSvgCurve('Model Loss Curve (5 Epochs)', trainLoss, valLoss, true)}
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

  function renderSettingsPanel() {
    const currTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const currRefresh = localStorage.getItem('neura_autorefresh_v1') || '0';
    const isTestMode = localStorage.getItem('neura_test_mode_v1') === 'true';
    const isReduced = localStorage.getItem('neura_reduced_motion_v1') === 'true';

    bodyEl().innerHTML = `
      <div class="settings-panel">
        <div class="settings-group">
          <div class="settings-group-title">Tampilan &amp; Antarmuka</div>
          <div class="settings-row">
            <div>
              <div class="settings-row-title">Tema Aplikasi</div>
              <div class="settings-row-sub">Pilih tampilan Light Mode atau Dark Mode.</div>
            </div>
            <div class="segmented-switch" id="settings-theme-switch">
              <button type="button" class="seg-btn ${currTheme === 'light' ? 'active' : ''}" data-set-theme="light">Light</button>
              <button type="button" class="seg-btn ${currTheme === 'dark' ? 'active' : ''}" data-set-theme="dark">Dark</button>
            </div>
          </div>

          <label class="settings-row" style="cursor:pointer;">
            <div>
              <div class="settings-row-title">Kurangi Animasi (Reduced Motion)</div>
              <div class="settings-row-sub">Nonaktifkan transisi slide untuk respons instan.</div>
            </div>
            <input type="checkbox" id="settings-reduced-motion" class="hub-switch-input" ${isReduced ? 'checked' : ''} />
            <span class="hub-switch-track"></span>
          </label>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Operasional &amp; Sandbox</div>
          <div class="settings-row">
            <div>
              <div class="settings-row-title">Auto-Refresh Telemetry</div>
              <div class="settings-row-sub">Perbarui metrik sistem &amp; radar secara berkala.</div>
            </div>
            <div class="segmented-switch" id="settings-refresh-switch">
              <button type="button" class="seg-btn ${currRefresh === '0' ? 'active' : ''}" data-set-refresh="0">Off</button>
              <button type="button" class="seg-btn ${currRefresh === '30' ? 'active' : ''}" data-set-refresh="30">30s</button>
              <button type="button" class="seg-btn ${currRefresh === '60' ? 'active' : ''}" data-set-refresh="60">60s</button>
            </div>
          </div>

          <label class="settings-row" style="cursor:pointer;">
            <div>
              <div class="settings-row-title">Test Mode (Sandbox)</div>
              <div class="settings-row-sub">Jalankan evaluasi &amp; training sebagai simulasi aman.</div>
            </div>
            <input type="checkbox" id="settings-test-mode" class="hub-switch-input" ${isTestMode ? 'checked' : ''} />
            <span class="hub-switch-track"></span>
          </label>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Diagnostik &amp; Cache</div>
          <div class="settings-action-row">
            <button type="button" class="bento-pill-btn" id="settings-diag-btn">Test Koneksi API &amp; DB</button>
            <button type="button" class="bento-pill-btn" id="settings-clear-cache-btn">Reset Preferensi UI</button>
          </div>
          <div id="settings-diag-out" class="settings-diag-out" style="display:none;"></div>
        </div>
      </div>
    `;

    // Wire Theme Switch
    bodyEl().querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTheme = btn.dataset.setTheme;
        if (document.documentElement.getAttribute('data-theme') !== targetTheme) {
          document.getElementById('hub-theme-btn')?.click();
        }
        bodyEl().querySelectorAll('[data-set-theme]').forEach(b => b.classList.toggle('active', b.dataset.setTheme === targetTheme));
      });
    });

    // Wire Reduced Motion
    document.getElementById('settings-reduced-motion')?.addEventListener('change', (e) => {
      const on = e.target.checked;
      try { localStorage.setItem('neura_reduced_motion_v1', on ? 'true' : 'false'); } catch (err) {}
      document.documentElement.setAttribute('data-reduced-motion', on ? 'true' : 'false');
      if (window.NeuraAdminHub?.toast) window.NeuraAdminHub.toast(on ? 'Animasi dikurangi' : 'Animasi halus aktif');
    });

    // Wire Auto-Refresh
    bodyEl().querySelectorAll('[data-set-refresh]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = btn.dataset.setRefresh || '0';
        bodyEl().querySelectorAll('[data-set-refresh]').forEach(b => b.classList.toggle('active', b === btn));
        if (window.NeuraAdminHub?.setAutoRefresh) window.NeuraAdminHub.setAutoRefresh(Number(sec));
      });
    });

    // Wire Test Mode synced with sidebar toggle
    document.getElementById('settings-test-mode')?.addEventListener('change', (e) => {
      const sbToggle = document.getElementById('hub-test-mode-toggle');
      if (sbToggle) {
        sbToggle.checked = e.target.checked;
        sbToggle.dispatchEvent(new Event('change'));
      }
    });

    // Wire Diagnostics
    document.getElementById('settings-diag-btn')?.addEventListener('click', async () => {
      const out = document.getElementById('settings-diag-out');
      if (!out) return;
      out.style.display = 'block';
      out.textContent = 'Menguji koneksi /api/admin/stats...';
      const t0 = performance.now();
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' });
        const ms = Math.max(1, Math.round(performance.now() - t0));
        const data = await res.json();
        out.textContent = res.ok
          ? `OK (${ms} ms) — Service: ${data.platform_kpis?.service_status || 'ONLINE'} · Total Users: ${data.platform_kpis?.total_users ?? '-'}`
          : `Error HTTP ${res.status} (${ms} ms)`;
      } catch (err) {
        out.textContent = `Gagal terhubung: ${err.message}`;
      }
    });

    // Wire Clear UI Preferences
    document.getElementById('settings-clear-cache-btn')?.addEventListener('click', () => {
      try {
        localStorage.removeItem('neura_autorefresh_v1');
        localStorage.removeItem('neura_reduced_motion_v1');
        localStorage.removeItem('neura_test_mode_v1');
      } catch (err) {}
      document.documentElement.setAttribute('data-reduced-motion', 'false');
      const sbToggle = document.getElementById('hub-test-mode-toggle');
      if (sbToggle && sbToggle.checked) {
        sbToggle.checked = false;
        sbToggle.dispatchEvent(new Event('change'));
      }
      if (window.NeuraAdminHub?.setAutoRefresh) window.NeuraAdminHub.setAutoRefresh(0);
      renderSettingsPanel();
      if (window.NeuraAdminHub?.toast) window.NeuraAdminHub.toast('Preferensi UI berhasil direset');
    });
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
    } else if (moduleItem.previewType === 'settings') {
      renderSettingsPanel();
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
