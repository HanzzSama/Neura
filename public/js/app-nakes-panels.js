/**
 * public/js/app-nakes-panels.js
 * ==============================
 * Role: Nakes (Tenaga Kesehatan)
 * Controller untuk Ruang Kerja Nakes:
 * - Room 1: Daftar Hasil Konsultasi & Skrining Pasien (Patient Worklist)
 * - Room Navigation & Coordinator
 * - KPI Summary & Export CSV
 */

(function () {
  'use strict';

  let _nakesConsultationsCache = [];
  let _nakesActiveFilterStatus = 'all';
  let _nakesActiveFilterRisk = 'all';
  let _nakesSearchQuery = '';

  /**
   * Cek apakah user saat ini memiliki role Nakes
   */
  function isCurrentUserNakes() {
    if (typeof isNakesLoggedIn === 'function' && isNakesLoggedIn()) return true;
    const role = localStorage.getItem('neura_user_role');
    if (role === 'Nakes' || (role && role.toLowerCase() === 'nakes')) return true;
    try {
      const raw = localStorage.getItem('neura_auth_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u && (u.role === 'Nakes' || (u.email && u.email.endsWith('@neura.ns.id')))) return true;
      }
    } catch (e) { }
    return false;
  }
  window.isCurrentUserNakes = isCurrentUserNakes;

  /**
   * Toggle Accordion Menu Nakes di Sidebar
   */
  function toggleNakesMenuDropdown() {
    const list = document.getElementById('nakes-menu-list');
    const btn = document.getElementById('nakes-menu-toggle-btn');
    if (!list || !btn) return;

    const isCollapsed = list.classList.toggle('collapsed');
    btn.classList.toggle('collapsed', isCollapsed);
    btn.setAttribute('aria-expanded', !isCollapsed);

    try {
      localStorage.setItem('neura_nakes_menu_collapsed', isCollapsed ? 'true' : 'false');
    } catch (e) { }
  }
  window.toggleNakesMenuDropdown = toggleNakesMenuDropdown;

  /**
   * Sinkronisasi visibilitas menu sidebar Nakes
   */
  function syncNakesNavVisibility() {
    try {
      const isNakes = isCurrentUserNakes();
      const nakesSection = document.getElementById('nakes-menu-dropdown-section');
      if (nakesSection) {
        nakesSection.style.display = isNakes ? 'block' : 'none';
      }
    } catch (e) { }
  }
  window.syncNakesNavVisibility = syncNakesNavVisibility;

  /**
   * Beralih ke Ruang Kerja Nakes (Room Switcher)
   */
  function switchNakesRoom(roomKey) {
    const mainView = document.querySelector('.main-view');
    const inboxRoom = document.getElementById('nakes-room-inbox');

    // Tutup admin rooms jika ada yang aktif
    if (typeof ADMIN_ROOMS !== 'undefined') {
      Object.values(ADMIN_ROOMS).forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.setAttribute('aria-hidden', 'true'); }
      });
    }

    // Reset highlight sidebar
    document.querySelectorAll('.nakes-menu-item, .admin-menu-item').forEach(el => el.classList.remove('active'));

    if (roomKey === 'chat' || !roomKey) {
      if (inboxRoom) {
        inboxRoom.style.display = 'none';
        inboxRoom.setAttribute('aria-hidden', 'true');
      }
      if (mainView) mainView.classList.remove('admin-room-active');
      return;
    }

    if (roomKey === 'inbox') {
      if (inboxRoom) {
        inboxRoom.style.display = 'flex';
        inboxRoom.setAttribute('aria-hidden', 'false');
      }
      if (mainView) mainView.classList.add('admin-room-active');

      const navBtn = document.getElementById('sidebar-nakes-inbox-link');
      if (navBtn) navBtn.classList.add('active');

      // Muat data tabel
      loadNakesConsultationsTable();
    }
  }
  window.switchNakesRoom = switchNakesRoom;

  /**
   * Mengambil data dan merender tabel konsultasi Nakes
   */
  async function loadNakesConsultationsTable(forceRefresh = false) {
    const tbody = document.getElementById('nakes-consult-tbody');
    const countEl = document.getElementById('nakes-record-count');

    if (!tbody) return;

    if (forceRefresh || _nakesConsultationsCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:40px 20px;color:var(--text-muted)">
            <div class="db-spinner" style="margin:0 auto 12px"></div>
            <span>Memuat data hasil konsultasi pasien...</span>
          </td>
        </tr>
      `;

      try {
        const [resList, resSummary] = await Promise.all([
          fetch('/api/consultation/list').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/consultation/summary').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        if (resList && resList.success && Array.isArray(resList.data)) {
          _nakesConsultationsCache = resList.data;
        } else {
          _nakesConsultationsCache = [];
        }

        // Render KPI
        if (resSummary && resSummary.success) {
          updateNakesKPICards(resSummary);
        } else {
          deriveAndRenderKPIFromCache(_nakesConsultationsCache);
        }
      } catch (err) {
        console.warn('[Neura Nakes] Gagal memuat konsultasi:', err);
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center;padding:30px;color:var(--accent-danger, #ef4444)">
              Gagal memuat data konsultasi dari server. Silakan coba lagi.
            </td>
          </tr>
        `;
        return;
      }
    }

    renderFilteredTable();
  }
  window.loadNakesConsultationsTable = loadNakesConsultationsTable;

  /**
   * Update angka pada kartu ringkasan KPI
   */
  function updateNakesKPICards(s) {
    const elTotal = document.getElementById('kpi-nakes-total');
    const elPending = document.getElementById('kpi-nakes-pending');
    const elHigh = document.getElementById('kpi-nakes-high-risk');
    const elVal = document.getElementById('kpi-nakes-validated');

    if (elTotal) elTotal.textContent = s.total_patients || 0;
    if (elPending) elPending.textContent = s.pending_count || 0;
    if (elHigh) elHigh.textContent = s.high_risk_count || 0;
    if (elVal) elVal.textContent = s.validated_count || 0;
  }

  function deriveAndRenderKPIFromCache(docs) {
    let pending = 0, validated = 0, high = 0;
    docs.forEach(d => {
      const isVal = d.status === 'VALIDATED_BY_CLINICIAN' || (d.validation && d.validation.is_validated);
      if (isVal) validated++; else pending++;
      const prob = (d.prediction && d.prediction.probability) || 0;
      const riskLvl = (d.prediction && d.prediction.risk_level || '').toLowerCase();
      if (prob >= 70 || riskLvl.includes('high')) high++;
    });
    updateNakesKPICards({
      total_patients: docs.length,
      pending_count: pending,
      validated_count: validated,
      high_risk_count: high
    });
  }

  /**
   * Filter dan render ulang baris tabel berdasarkan state
   */
  function renderFilteredTable() {
    const tbody = document.getElementById('nakes-consult-tbody');
    const countEl = document.getElementById('nakes-record-count');
    if (!tbody) return;

    let filtered = _nakesConsultationsCache.filter(doc => {
      // 1. Status Filter
      const isVal = doc.status === 'VALIDATED_BY_CLINICIAN' || (doc.validation && doc.validation.is_validated);
      if (_nakesActiveFilterStatus === 'validated' && !isVal) return false;
      if (_nakesActiveFilterStatus === 'pending' && isVal) return false;

      // 2. Risk Filter
      const prob = (doc.prediction && doc.prediction.probability) || 0;
      const riskLvl = (doc.prediction && doc.prediction.risk_level || '').toLowerCase();
      if (_nakesActiveFilterRisk === 'high' && prob < 70 && !riskLvl.includes('high')) return false;
      if (_nakesActiveFilterRisk === 'moderate' && (prob < 40 || prob >= 70) && !riskLvl.includes('mod')) return false;
      if (_nakesActiveFilterRisk === 'low' && prob >= 40 && !riskLvl.includes('low')) return false;

      // 3. Search query
      if (_nakesSearchQuery) {
        const q = _nakesSearchQuery.toLowerCase();
        const pName = (doc.patient && doc.patient.name || '').toLowerCase();
        const nks = (doc.nakes_code || '').toLowerCase();
        const dId = (doc.doc_id || '').toLowerCase();
        if (!pName.includes(q) && !nks.includes(q) && !dId.includes(q)) return false;
      }

      return true;
    });

    if (countEl) {
      countEl.textContent = `Menampilkan ${filtered.length} dari ${_nakesConsultationsCache.length} konsultasi`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:36px;color:var(--text-muted)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="margin:0 auto 10px;opacity:.5;display:block">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Tidak ada dokumen konsultasi yang cocok dengan filter atau pencarian.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(doc => {
      const patient = doc.patient || {};
      const pred = doc.prediction || {};
      const cog = doc.cognitive_scores || {};
      const isVal = doc.status === 'VALIDATED_BY_CLINICIAN' || (doc.validation && doc.validation.is_validated);
      const prob = typeof pred.probability === 'number' ? pred.probability.toFixed(1) : '—';
      const mmse = typeof cog.mmse === 'number' ? cog.mmse : (doc.raw_features && doc.raw_features.MMSE || '—');
      const adl = typeof cog.adl === 'number' ? cog.adl : (doc.raw_features && doc.raw_features.ADL || '—');

      // Risk badge styling
      let riskBadge = '';
      const probNum = parseFloat(prob) || 0;
      if (probNum >= 70 || (pred.risk_level || '').toLowerCase().includes('high')) {
        riskBadge = `<span class="nakes-badge nakes-badge--danger"><span class="badge-dot"></span>${prob}% • Risiko Tinggi</span>`;
      } else if (probNum >= 40 || (pred.risk_level || '').toLowerCase().includes('mod')) {
        riskBadge = `<span class="nakes-badge nakes-badge--warning"><span class="badge-dot"></span>${prob}% • Risiko Sedang</span>`;
      } else {
        riskBadge = `<span class="nakes-badge nakes-badge--success"><span class="badge-dot"></span>${prob}% • Risiko Rendah</span>`;
      }

      // Status badge styling
      let statusBadge = '';
      if (isVal) {
        const valName = (doc.validation && doc.validation.validator_name) || 'Klinisi';
        statusBadge = `<span class="nakes-badge nakes-badge--success" title="Divalidasi oleh: ${valName}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Tervalidasi</span>`;
      } else {
        statusBadge = `<span class="nakes-badge nakes-badge--pending"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Menunggu Telaah</span>`;
      }

      // MMSE color
      let mmseColor = 'var(--text-primary)';
      if (typeof mmse === 'number') {
        if (mmse < 20) mmseColor = '#ef4444';
        else if (mmse < 24) mmseColor = '#f59e0b';
        else mmseColor = '#10b981';
      }

      const pName = patient.name || 'Pasien Anonim';
      const pAge = patient.age ? `${patient.age} Thn` : '—';
      const pGender = patient.gender || '—';
      const nakesCode = doc.nakes_code || doc.doc_id || 'NKS-UNKNOWN';
      const dateStr = doc.created_at || '—';

      return `
        <tr class="nakes-table-row">
          <td>
            <div class="nakes-cell-code">
              <span class="nakes-code-tag">${nakesCode}</span>
            </div>
          </td>
          <td>
            <div class="nakes-cell-date">${dateStr}</div>
          </td>
          <td>
            <div class="nakes-cell-patient">
              <div class="nakes-avatar-pill">${pName.charAt(0).toUpperCase()}</div>
              <div>
                <div class="nakes-patient-name">${escapeHtml(pName)}</div>
                <div class="nakes-patient-meta">${pAge} • ${escapeHtml(pGender)}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="nakes-cell-scores">
              <span>MMSE: <strong style="color:${mmseColor}">${mmse}</strong>/30</span>
              <span class="nakes-sub-score">ADL: ${adl}/10</span>
            </div>
          </td>
          <td>
            ${riskBadge}
          </td>
          <td>
            ${statusBadge}
          </td>
          <td style="text-align:right">
            <div class="nakes-action-group">
              <button type="button" class="nakes-action-btn primary" onclick="openNakesReviewFromInbox('${nakesCode}')" title="Telaah & Validasi Klinis Pasien">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>Telaah</span>
              </button>
              <button type="button" class="nakes-action-btn secondary" onclick="openNakesValidationModal('${nakesCode}')" title="Buka Formulir Tanda Tangan Digital">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                <span>Validasi</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Action: Buka telaah klinis di chat atau modal
   */
  function openNakesReviewFromInbox(code) {
    // Switch kembali ke chat dan trigger review pasien
    switchNakesRoom('chat');
    if (typeof lookupAndRenderPatientDocument === 'function') {
      lookupAndRenderPatientDocument(code);
    } else if (typeof submitNakesLookup === 'function') {
      submitNakesLookup(code);
    }
  }
  window.openNakesReviewFromInbox = openNakesReviewFromInbox;

  /**
   * Filter Event Handlers
   */
  function filterNakesConsultationsByStatus(val) {
    _nakesActiveFilterStatus = val;
    renderFilteredTable();
  }
  window.filterNakesConsultationsByStatus = filterNakesConsultationsByStatus;

  function filterNakesConsultationsByRisk(val) {
    _nakesActiveFilterRisk = val;
    renderFilteredTable();
  }
  window.filterNakesConsultationsByRisk = filterNakesConsultationsByRisk;

  function onNakesSearchInput(val) {
    _nakesSearchQuery = (val || '').trim();
    renderFilteredTable();
  }
  window.onNakesSearchInput = onNakesSearchInput;

  /**
   * Export Tabel Konsultasi ke CSV
   */
  function exportNakesConsultationsCsv() {
    if (!_nakesConsultationsCache || _nakesConsultationsCache.length === 0) {
      if (typeof showToast === 'function') showToast('Tidak ada data konsultasi untuk diekspor.', 'warning');
      return;
    }

    const headers = ['Kode NKS', 'No Dokumen', 'Tanggal Konsultasi', 'Nama Pasien', 'Usia', 'Gender', 'MMSE', 'ADL', 'Probabilitas (%)', 'Tingkat Risiko', 'Status Validasi', 'Penelaah Klinis'];
    const rows = _nakesConsultationsCache.map(d => {
      const p = d.patient || {};
      const pred = d.prediction || {};
      const cog = d.cognitive_scores || {};
      const v = d.validation || {};
      const isVal = d.status === 'VALIDATED_BY_CLINICIAN' || v.is_validated;
      return [
        `"${d.nakes_code || ''}"`,
        `"${d.doc_id || ''}"`,
        `"${d.created_at || ''}"`,
        `"${p.name || ''}"`,
        p.age || '',
        `"${p.gender || ''}"`,
        cog.mmse || '',
        cog.adl || '',
        pred.probability || '',
        `"${pred.risk_level || ''}"`,
        `"${isVal ? 'Tervalidasi' : 'Menunggu Telaah'}"`,
        `"${v.validator_name || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Neura_Daftar_Konsultasi_Pasien_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
      showToast('Data konsultasi berhasil diekspor ke format CSV.', 'success');
    }
  }
  window.exportNakesConsultationsCsv = exportNakesConsultationsCsv;

  // Inisialisasi saat dokumen siap
  document.addEventListener('DOMContentLoaded', () => {
    syncNakesNavVisibility();
  });

  // Re-check visibility jika ada event auth
  window.addEventListener('neura:auth-cleared', syncNakesNavVisibility);
  window.addEventListener('storage', (e) => {
    if (e.key === 'neura_nakes_session' || e.key === 'neura_user_role') {
      syncNakesNavVisibility();
    }
  });

  console.log('[Neura Modular] Nakes Panels & Worklist Module initialized.');
})();

