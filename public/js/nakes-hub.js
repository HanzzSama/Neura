/* ==========================================================================
   NEURA NAKES HUB — Clinical Workspace Controller
   Handles patient code lookup, 32-biomarker analysis, dossier, history, & validation
   ========================================================================== */
(function () {
  'use strict';

  const state = {
    consultations: [],
    summary: {},
    activeDoc: null,
    filter: 'all',
    histTab: 'patients',
    nakes: null
  };

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function loadNakesProfile() {
    let profile = {};
    try {
      profile = JSON.parse(localStorage.getItem('neura_nakes_session') || '{}') || {};
    } catch (_) {}
    if (!profile.email) {
      try {
        const u = JSON.parse(localStorage.getItem('neura_auth_user') || '{}') || {};
        profile = {
          id: u.nakes_id || u.uid || '',
          name: u.displayName || 'Tenaga Kesehatan',
          email: u.email || 'nakes@neura.ns.id',
          profession: u.profession || 'Dokter Spesialis',
          institution: u.institution || 'Fasilitas Kesehatan Mitra Neura'
        };
      } catch (_) {}
    }
    state.nakes = profile;

    const name = profile.name || 'Dokter';
    const initial = name.trim().charAt(0).toUpperCase() || 'N';
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText('nh-greeting', `Selamat bertugas, ${name}`);
    setText('nh-avatar-btn', initial);
    setText('nh-pop-avatar', initial);
    setText('nh-pop-name', name);
    setText('nh-pop-email', profile.email || 'nakes@neura.ns.id');
    setText('nh-pop-spec', profile.profession || 'Nakes');
  }

  function setupThemeAndChrome() {
    const themeBtn = document.getElementById('hub-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('neura_theme_v1', next); } catch (_) {}
      });
    }

    const mobBtn = document.getElementById('hub-mobile-menu-btn');
    const sidebar = document.getElementById('hub-sidebar');
    const sbBackdrop = document.getElementById('hub-sidebar-backdrop');
    if (mobBtn && sidebar && sbBackdrop) {
      mobBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sbBackdrop.hidden = !sidebar.classList.contains('open');
      });
      sbBackdrop.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sbBackdrop.hidden = true;
      });
    }

    const avatarBtn = document.getElementById('nh-avatar-btn');
    const pop = document.getElementById('nh-profile-popover');
    if (avatarBtn && pop) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        pop.hidden = !pop.hidden;
      });
      document.addEventListener('click', (e) => {
        if (!pop.hidden && !pop.contains(e.target) && e.target !== avatarBtn) {
          pop.hidden = true;
        }
      });
    }

    const openProf = document.getElementById('nh-open-profile-btn');
    if (openProf) {
      openProf.addEventListener('click', () => {
        if (pop) pop.hidden = true;
        openDrawer('profile');
      });
    }

    const logoutBtn = document.getElementById('nh-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        try {
          localStorage.removeItem('neura_nakes_session');
          localStorage.removeItem('neura_auth_user');
          localStorage.removeItem('neura_user_role');
        } catch (_) {}
        window.location.replace('/welcome');
      });
    }
  }

  function isDocValidated(item) {
    return item.status === 'VALIDATED_BY_CLINICIAN' || Boolean(item.validation && item.validation.is_validated);
  }

  function isDocHighRisk(item) {
    const pred = item.prediction || {};
    const rl = String(item.risk_level || pred.risk_level || '').toLowerCase();
    return Boolean(pred.is_positive) || rl.includes('tinggi') || rl.includes('high') || rl.includes('positif');
  }

  function getDocCode(item) {
    return item.nakes_code || item.code || item.doc_id || item.document_id || '';
  }

  function getPatientName(item) {
    return (item.patient && item.patient.name) || item.patient_name || 'Pasien Anonim';
  }

  async function fetchWorkspaceData() {
    try {
      const [resSum, resList] = await Promise.all([
        fetch('/api/nakes/consultation/summary', { cache: 'no-store' }),
        fetch('/api/nakes/consultation/list', { cache: 'no-store' })
      ]);
      const sumJson = await resSum.json().catch(() => ({}));
      const listJson = await resList.json().catch(() => ({}));

      state.summary = sumJson.summary || sumJson.data || sumJson || {};
      const rawList = listJson.data || listJson.consultations || listJson.items || [];
      state.consultations = Array.isArray(rawList) ? rawList : [];

      renderTelemetry();
      renderSidebarWorklist();
      renderHistoryList();
      populateCodeDatalist();

      if (!state.activeDoc && state.consultations.length > 0) {
        const firstCode = getDocCode(state.consultations[0]);
        if (firstCode) await selectPatientByCode(firstCode, false);
      }
    } catch (err) {
      const wl = document.getElementById('nh-sidebar-worklist');
      if (wl) wl.innerHTML = `<div class="nh-empty-hint">Gagal memuat data: ${esc(err.message)}</div>`;
    }
  }

  function renderTelemetry() {
    const total = state.consultations.length;
    const validated = state.consultations.filter(isDocValidated).length;
    const pending = Math.max(0, total - validated);
    const high = state.consultations.filter(isDocHighRisk).length;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('nh-kpi-total', total);
    set('nh-kpi-validated', validated);
    set('nh-kpi-pending', pending);
    set('nh-kpi-high', high);
    set('nh-sb-count', total);
    set('nh-eco-patient-tag', `${total} pasien`);
    set('nh-last-sync', `Update ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);

    const donut = document.getElementById('nh-donut-val');
    if (donut) {
      const circ = 2 * Math.PI * 38;
      const ratio = total > 0 ? validated / total : 0;
      const dash = (ratio * circ).toFixed(1);
      donut.setAttribute('stroke-dasharray', `${dash} ${circ.toFixed(1)}`);
    }
  }

  function populateCodeDatalist() {
    const dl = document.getElementById('nh-code-datalist');
    if (!dl) return;
    dl.innerHTML = state.consultations
      .slice(0, 30)
      .map(it => `<option value="${esc(getDocCode(it))}">${esc(getPatientName(it))}</option>`)
      .join('');
  }

  function renderSidebarWorklist() {
    const box = document.getElementById('nh-sidebar-worklist');
    if (!box) return;
    let items = state.consultations;
    if (state.filter === 'pending') items = items.filter(it => !isDocValidated(it));
    else if (state.filter === 'high') items = items.filter(isDocHighRisk);

    if (!items.length) {
      box.innerHTML = '<div class="nh-empty-hint">Tidak ada pasien pada filter ini.</div>';
      return;
    }

    const activeCode = state.activeDoc ? getDocCode(state.activeDoc) : '';
    box.innerHTML = items.slice(0, 25).map(it => {
      const code = getDocCode(it);
      const val = isDocValidated(it);
      const high = isDocHighRisk(it);
      const badgeCls = val ? 'is-ok' : (high ? 'is-risk' : 'is-warn');
      const badgeLbl = val ? 'VALID' : (high ? 'RISIKO' : 'PENDING');
      return `
        <button type="button" class="nh-worklist-item ${code === activeCode ? 'is-selected' : ''}" data-pick-code="${esc(code)}">
          <div class="nh-wl-top">
            <span class="nh-wl-name">${esc(getPatientName(it))}</span>
            <span class="nh-badge ${badgeCls}">${badgeLbl}</span>
          </div>
          <span class="nh-wl-code">${esc(code)}</span>
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-pick-code]').forEach(btn => {
      btn.addEventListener('click', () => selectPatientByCode(btn.getAttribute('data-pick-code'), false));
    });
  }

  async function selectPatientByCode(code, openDossierAfter) {
    const cleaned = String(code || '').trim().toUpperCase();
    if (!cleaned) return;
    const tag = document.getElementById('nh-active-code-tag');
    const preview = document.getElementById('nh-active-preview');
    if (tag) tag.textContent = 'MEMUAT...';

    try {
      const res = await fetch(`/api/nakes/consultation/${encodeURIComponent(cleaned)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        if (tag) tag.textContent = 'TIDAK DITEMUKAN';
        if (preview) preview.innerHTML = `<div class="nh-preview-empty" style="color:#dc2626">${esc(json.error || 'Kode dokumen pasien tidak ditemukan.')}</div>`;
        return;
      }
      const doc = json.data || json.consultation || json;
      state.activeDoc = doc;
      const topIn = document.getElementById('nh-topbar-code-input');
      const mainIn = document.getElementById('nh-main-code-input');
      if (topIn) topIn.value = cleaned;
      if (mainIn) mainIn.value = cleaned;

      renderActivePatientPreview(doc);
      renderBiomarkerViz(doc);
      renderSidebarWorklist();
      if (openDossierAfter) openDrawer('documents');
    } catch (err) {
      if (tag) tag.textContent = 'ERROR';
      if (preview) preview.innerHTML = `<div class="nh-preview-empty" style="color:#dc2626">${esc(err.message)}</div>`;
    }
  }

  function getBiomarkerStats(doc) {
    const p = doc.patient || {};
    const b = doc.all_32_biomarkers || doc.raw_features || {};
    const cog = doc.cognitive_scores || {};
    return {
      age: p.age ?? b.Age ?? '—',
      gender: p.gender ?? b.Gender ?? '—',
      bmi: p.bmi ?? b.BMI ?? '—',
      sbp: p.systolic_bp ?? b.SystolicBP ?? '—',
      dbp: p.diastolic_bp ?? b.DiastolicBP ?? '—',
      mmse: cog.mmse ?? b.MMSE ?? '—',
      adl: cog.adl ?? b.ADL ?? '—',
      func: cog.functional_assessment ?? b.FunctionalAssessment ?? '—',
      chol: b.CholesterolTotal ?? '—',
      ldl: b.CholesterolLDL ?? '—',
      trig: b.CholesterolTriglycerides ?? '—',
      b32: b
    };
  }

  function renderActivePatientPreview(doc) {
    const tag = document.getElementById('nh-active-code-tag');
    const preview = document.getElementById('nh-active-preview');
    if (!preview) return;

    const code = getDocCode(doc);
    const pred = doc.prediction || {};
    const stats = getBiomarkerStats(doc);
    const validated = isDocValidated(doc);
    const prob = pred.probability_positive != null ? `${Math.round(Number(pred.probability_positive) * 100)}%` : '—';

    if (tag) tag.textContent = code;
    preview.innerHTML = `
      <div class="nh-wl-top">
        <div>
          <strong style="font-size:14px;color:var(--hub-text)">${esc(getPatientName(doc))}</strong>
          <div style="font-size:11.5px;color:var(--hub-text-muted)">${esc(stats.age)} Thn · ${esc(stats.gender)} · ${esc(pred.risk_level || 'Skrining')}</div>
        </div>
        <span class="nh-badge ${validated ? 'is-ok' : 'is-warn'}">${validated ? 'TERVALIDASI' : 'BELUM VALIDASI'}</span>
      </div>
      <div class="nh-patient-mini-grid">
        <div class="nh-mini-stat"><span>Prob. Risiko</span><strong>${esc(prob)}</strong></div>
        <div class="nh-mini-stat"><span>Skor MMSE</span><strong>${esc(stats.mmse)} / 30</strong></div>
        <div class="nh-mini-stat"><span>TD / BMI</span><strong>${esc(stats.sbp)}/${esc(stats.dbp)}</strong></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="bento-pill-btn bento-pill-btn--accent" id="nh-prev-dossier-btn">Buka Dossier Medis</button>
        <button type="button" class="bento-pill-btn" id="nh-prev-validate-btn">${validated ? 'Edit Validasi' : 'Sahkan Validasi'}</button>
      </div>
    `;

    document.getElementById('nh-prev-dossier-btn')?.addEventListener('click', () => openDrawer('documents'));
    document.getElementById('nh-prev-validate-btn')?.addEventListener('click', () => openDrawer('validate'));
  }

  function renderBiomarkerViz(doc) {
    const wrap = document.getElementById('nh-biomarker-viz');
    if (!wrap) return;
    const s = getBiomarkerStats(doc);
    const b = s.b32 || {};

    const bars = [
      { name: 'MMSE (Kognitif)', val: Number(s.mmse), max: 30, unit: '/ 30', cls: Number(s.mmse) < 20 ? 'is-risk' : (Number(s.mmse) < 24 ? 'is-warn' : 'is-ok') },
      { name: 'ADL (Kemandirian)', val: Number(s.adl), max: 10, unit: '/ 10', cls: Number(s.adl) < 6 ? 'is-warn' : 'is-ok' },
      { name: 'Tekanan Sistolik', val: Number(s.sbp), max: 220, unit: 'mmHg', cls: Number(s.sbp) >= 140 ? 'is-risk' : (Number(s.sbp) >= 130 ? 'is-warn' : 'is-ok') },
      { name: 'Kolesterol Total', val: Number(s.chol), max: 550, unit: 'mg/dL', cls: Number(s.chol) >= 240 ? 'is-risk' : (Number(s.chol) >= 200 ? 'is-warn' : 'is-ok') },
      { name: 'Trigliserida', val: Number(s.trig), max: 450, unit: 'mg/dL', cls: Number(s.trig) >= 200 ? 'is-risk' : (Number(s.trig) >= 150 ? 'is-warn' : 'is-ok') },
      { name: 'BMI', val: Number(s.bmi), max: 45, unit: 'kg/m²', cls: Number(s.bmi) >= 30 ? 'is-risk' : (Number(s.bmi) >= 25 ? 'is-warn' : 'is-ok') }
    ].filter(x => !isNaN(x.val));

    const flags = [
      ['MemoryComplaints', 'Keluhan Memori'],
      ['Forgetfulness', 'Pelupa'],
      ['Confusion', 'Kebingungan'],
      ['Disorientation', 'Disorientasi'],
      ['Hypertension', 'Hipertensi'],
      ['Diabetes', 'Diabetes']
    ].map(([k, lbl]) => {
      const on = Number(b[k] || 0) === 1;
      return `<span class="nh-badge ${on ? 'is-risk' : ''}">${esc(lbl)}: ${on ? 'Ya' : 'Tidak'}</span>`;
    }).join('');

    wrap.innerHTML = bars.map(bar => {
      const pct = Math.max(4, Math.min(100, Math.round((bar.val / bar.max) * 100)));
      return `
        <div class="nh-bar-row">
          <span class="nh-bar-name">${esc(bar.name)}</span>
          <div class="nh-bar-track"><div class="nh-bar-fill ${bar.cls}" style="width:${pct}%"></div></div>
          <span class="nh-bar-val">${esc(bar.val)} ${esc(bar.unit)}</span>
        </div>
      `;
    }).join('') + `<div class="nh-symptom-chips">${flags}</div>`;
  }

  function renderHistoryList() {
    const box = document.getElementById('nh-history-list');
    if (!box) return;
    if (!state.consultations.length) {
      box.innerHTML = '<div class="nh-empty-hint">Belum ada riwayat konsultasi atau dokumen.</div>';
      return;
    }

    const items = state.histTab === 'docs'
      ? state.consultations.slice(0, 12)
      : state.consultations.slice(0, 12);

    box.innerHTML = items.map(it => {
      const code = getDocCode(it);
      const val = isDocValidated(it);
      const v = it.validation || {};
      const sub = state.histTab === 'docs'
        ? `${esc(it.doc_id || code)} · ${val ? esc(v.validator_name || 'Dokter') : 'Belum Disahkan'}`
        : `${esc(code)} · ${esc(it.created_at || 'Baru saja')}`;
      return `
        <div class="nh-history-item" data-hist-code="${esc(code)}">
          <div style="min-width:0">
            <div class="nh-wl-name">${esc(getPatientName(it))}</div>
            <div class="nh-wl-code">${sub}</div>
          </div>
          <span class="nh-badge ${val ? 'is-ok' : 'is-warn'}">${val ? 'VALIDATED' : 'ACTIVE'}</span>
        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-hist-code]').forEach(row => {
      row.addEventListener('click', () => selectPatientByCode(row.getAttribute('data-hist-code'), true));
    });
  }

  function closeDrawer() {
    const bd = document.getElementById('nh-drawer-backdrop');
    if (bd) bd.hidden = true;
  }

  function evaluateItemStatus(name, value, explicitStatus) {
    if (explicitStatus) {
      const cls = (explicitStatus === 'Defisit' || explicitStatus === 'Tinggi') ? 'is-risk' : (explicitStatus === 'Waspada' ? 'is-warn' : 'is-ok');
      return { text: explicitStatus, cls };
    }
    const num = parseFloat(String(value || ''));
    if (name.includes('MMSE') && !isNaN(num)) {
      if (num < 20) return { text: 'Defisit', cls: 'is-risk' };
      if (num < 24) return { text: 'Waspada', cls: 'is-warn' };
    } else if ((name.includes('ADL') || name.includes('Functional')) && !isNaN(num) && num < 6) {
      return { text: 'Waspada', cls: 'is-warn' };
    } else if (name.includes('BMI') && !isNaN(num)) {
      if (num >= 30) return { text: 'Tinggi', cls: 'is-risk' };
      if (num >= 25 || num < 18.5) return { text: 'Waspada', cls: 'is-warn' };
    } else if (name === 'Tekanan Darah') {
      const [sbp, dbp] = String(value || '').split('/').map(Number);
      if (sbp >= 140 || dbp >= 90) return { text: 'Tinggi', cls: 'is-risk' };
      if (sbp >= 130 || dbp >= 85) return { text: 'Waspada', cls: 'is-warn' };
    } else if (name === 'Kolesterol Total' && !isNaN(num)) {
      if (num >= 240) return { text: 'Tinggi', cls: 'is-risk' };
      if (num >= 200) return { text: 'Waspada', cls: 'is-warn' };
    } else if (name === 'LDL / HDL') {
      const [ldl, hdl] = String(value || '').split('/').map(Number);
      if (ldl >= 160) return { text: 'Tinggi', cls: 'is-risk' };
      if (ldl >= 130 || hdl < 40) return { text: 'Waspada', cls: 'is-warn' };
    } else if (name === 'Trigliserida' && !isNaN(num)) {
      if (num >= 200) return { text: 'Tinggi', cls: 'is-risk' };
      if (num >= 150) return { text: 'Waspada', cls: 'is-warn' };
    }
    return { text: 'Normal', cls: 'is-ok' };
  }

  function openDrawer(type) {
    const bd = document.getElementById('nh-drawer-backdrop');
    const kicker = document.getElementById('nh-drawer-kicker');
    const title = document.getElementById('nh-drawer-title');
    const body = document.getElementById('nh-drawer-body');
    if (!bd || !body) return;

    bd.hidden = false;

    if (type === 'patients') {
      kicker.textContent = 'PATIENT DIRECTORY';
      title.textContent = 'Data Pasien Skrining';
      body.innerHTML = `
        <div class="nh-code-box" style="margin-top:0">
          <input type="text" id="nh-drw-search" class="nh-code-field" style="text-transform:none" placeholder="Cari nama pasien atau kode NKS..." />
        </div>
        <div class="drawer-table-wrap">
          <table class="drawer-table">
            <thead><tr><th>Pasien</th><th>Kode</th><th>Risiko</th><th>Status</th></tr></thead>
            <tbody id="nh-drw-patient-tbody"></tbody>
          </table>
        </div>
      `;
      const renderRows = (q = '') => {
        const ql = q.toLowerCase();
        const filtered = state.consultations.filter(it =>
          getPatientName(it).toLowerCase().includes(ql) || getDocCode(it).toLowerCase().includes(ql)
        );
        const tb = document.getElementById('nh-drw-patient-tbody');
        tb.innerHTML = filtered.map(it => {
          const code = getDocCode(it);
          const val = isDocValidated(it);
          const high = isDocHighRisk(it);
          return `
            <tr style="cursor:pointer" data-row-code="${esc(code)}">
              <td><strong>${esc(getPatientName(it))}</strong></td>
              <td style="font-family:var(--hub-font-mono);font-size:11px">${esc(code)}</td>
              <td><span class="nh-badge ${high ? 'is-risk' : 'is-ok'}">${high ? 'Tinggi' : 'Rendah'}</span></td>
              <td><span class="nh-badge ${val ? 'is-ok' : 'is-warn'}">${val ? 'Valid' : 'Pending'}</span></td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="4">Tidak ada pasien ditemukan.</td></tr>';
        tb.querySelectorAll('[data-row-code]').forEach(tr => {
          tr.addEventListener('click', () => selectPatientByCode(tr.getAttribute('data-row-code'), true));
        });
      };
      renderRows();
      document.getElementById('nh-drw-search')?.addEventListener('input', e => renderRows(e.target.value));
      return;
    }

    if (type === 'documents') {
      const doc = state.activeDoc;
      kicker.textContent = 'ELECTRONIC MEDICAL DOSSIER';
      title.textContent = doc ? `Dossier ${getDocCode(doc)}` : 'Data Dokumen Medis';
      if (!doc) {
        body.innerHTML = '<div class="nh-preview-empty">Belum ada pasien dipilih. Pilih pasien terlebih dahulu atau masukkan kode dokumen pasien.</div>';
        return;
      }
      const s = getBiomarkerStats(doc);
      const val = isDocValidated(doc);
      const v = doc.validation || {};
      const breakdown = Array.isArray(doc.biomarkers_breakdown) ? doc.biomarkers_breakdown : [];
      const rowsHtml = breakdown.map(cat => {
        const catHead = `<tr><td colspan="4" style="font-weight:700;background:var(--hub-bg-subtle)">${esc(cat.category || 'Kategori')}</td></tr>`;
        const itemsHtml = (cat.items || []).map(it => {
          const nm = it.name || it.label || 'Biomarker';
          const st = evaluateItemStatus(nm, it.value, it.status);
          return `<tr>
            <td><strong>${esc(nm)}</strong></td>
            <td style="font-family:var(--hub-font-mono)">${esc(it.value)}</td>
            <td style="color:var(--hub-text-muted);font-size:11px">${esc(it.normal || '—')}</td>
            <td><span class="nh-badge ${st.cls}">${esc(st.text)}</span></td>
          </tr>`;
        }).join('');
        return catHead + itemsHtml;
      }).join('');

      body.innerHTML = `
        <div class="drawer-kpi-row">
          <div class="drawer-kpi-card"><div class="drawer-kpi-label">Pasien</div><div class="drawer-kpi-val" style="font-size:13px">${esc(getPatientName(doc))}</div></div>
          <div class="drawer-kpi-card"><div class="drawer-kpi-label">MMSE / ADL</div><div class="drawer-kpi-val" style="font-size:13px">${esc(s.mmse)}/30 · ${esc(s.adl)}/10</div></div>
          <div class="drawer-kpi-card"><div class="drawer-kpi-label">TD / BMI</div><div class="drawer-kpi-val" style="font-size:13px">${esc(s.sbp)}/${esc(s.dbp)} · ${esc(s.bmi)}</div></div>
        </div>
        <div class="drawer-table-wrap" style="margin-bottom:14px">
          <table class="drawer-table">
            <thead><tr><th>Biomarker</th><th>Nilai</th><th>Normal</th><th>Status</th></tr></thead>
            <tbody>${rowsHtml || '<tr><td colspan="4">Tidak ada breakdown biomarker.</td></tr>'}</tbody>
          </table>
        </div>
        <div style="padding:10px 12px;border-radius:8px;border:1px solid var(--hub-border);background:var(--hub-bg-subtle);font-size:12px;margin-bottom:14px">
          <strong>Status Validasi:</strong> ${val ? `Disahkan oleh ${esc(v.validator_name || 'Dokter')} (${esc(v.validation_status || 'TERKONFIRMASI')})` : 'Belum disahkan oleh dokter pemeriksa.'}
        </div>
        <div class="nh-no-print" style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="bento-pill-btn bento-pill-btn--accent" id="nh-drw-print">Cetak PDF</button>
          <button type="button" class="bento-pill-btn" id="nh-drw-json">Unduh JSON HL7</button>
          <button type="button" class="bento-pill-btn" id="nh-drw-go-val">${val ? 'Edit Validasi' : 'Sahkan Validasi'}</button>
        </div>
      `;
      document.getElementById('nh-drw-print')?.addEventListener('click', () => window.print());
      document.getElementById('nh-drw-json')?.addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${getDocCode(doc) || 'dossier'}.json`;
        a.click();
      });
      document.getElementById('nh-drw-go-val')?.addEventListener('click', () => openDrawer('validate'));
      return;
    }

    if (type === 'analytics') {
      const doc = state.activeDoc;
      kicker.textContent = 'CLINICAL EVALUATION & SIMULATION';
      title.textContent = doc ? `Analisa ${getPatientName(doc)}` : 'Analisa Data Pasien';
      if (!doc) {
        body.innerHTML = '<div class="nh-preview-empty">Pilih pasien terlebih dahulu untuk menjalankan analisa &amp; simulasi klinis.</div>';
        return;
      }
      const s = getBiomarkerStats(doc);
      body.innerHTML = `
        <form class="nh-form-stack" id="nh-eval-form">
          <div class="nh-form-field">
            <label>Koreksi / Observasi Skor MMSE (0 - 30)</label>
            <input type="number" step="0.5" min="0" max="30" id="nh-eval-mmse" value="${esc(s.mmse === '—' ? 24 : s.mmse)}" />
          </div>
          <div class="nh-form-field">
            <label>Koreksi / Observasi Kemandirian ADL (0 - 10)</label>
            <input type="number" step="0.5" min="0" max="10" id="nh-eval-adl" value="${esc(s.adl === '—' ? 7 : s.adl)}" />
          </div>
          <div class="nh-form-field">
            <label>Catatan Analisa Klinisi</label>
            <textarea rows="3" id="nh-eval-notes" placeholder="Catatan hasil pemeriksaan saraf / neuropsikologis..."></textarea>
          </div>
          <div id="nh-eval-msg" style="font-size:12px;color:var(--hub-text-muted)"></div>
          <button type="submit" class="bento-pill-btn bento-pill-btn--accent" style="height:36px">Simpan &amp; Evaluasi Ulang</button>
        </form>
      `;
      document.getElementById('nh-eval-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('nh-eval-msg');
        msg.textContent = 'Menyimpan evaluasi...';
        try {
          const res = await fetch(`/api/nakes/consultation/${encodeURIComponent(getDocCode(doc))}/patient-eval`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mmse: Number(document.getElementById('nh-eval-mmse').value),
              adl: Number(document.getElementById('nh-eval-adl').value),
              clinical_notes: document.getElementById('nh-eval-notes').value.trim(),
              evaluator_name: state.nakes?.name || 'Dokter'
            })
          });
          const j = await res.json();
          msg.textContent = j.success ? 'Evaluasi berhasil disimpan.' : (j.error || 'Gagal menyimpan.');
          if (j.success) await selectPatientByCode(getDocCode(doc), false);
        } catch (err) {
          msg.textContent = err.message;
        }
      });
      return;
    }

    if (type === 'validate') {
      const doc = state.activeDoc;
      kicker.textContent = 'DIGITAL SIGNATURE';
      title.textContent = doc ? `Validasi ${getDocCode(doc)}` : 'Pengesahan Dokter';
      if (!doc) {
        body.innerHTML = '<div class="nh-preview-empty">Pilih pasien terlebih dahulu untuk melakukan pengesahan dokumen.</div>';
        return;
      }
      const v = doc.validation || {};
      body.innerHTML = `
        <form class="nh-form-stack" id="nh-val-form">
          <div class="nh-form-field">
            <label>Status Klinis Akhir</label>
            <select id="nh-val-status">
              <option value="TERKONFIRMASI_KLINIS">TERKONFIRMASI KLINIS</option>
              <option value="PERLU_RUJUKAN_LANJUTAN">PERLU RUJUKAN LANJUTAN (MRI / MoCA)</option>
              <option value="PEMANTAUAN_BERKALA">PEMANTAUAN BERKALA</option>
            </select>
          </div>
          <div class="nh-form-field">
            <label>Catatan Medis &amp; Terapi</label>
            <textarea rows="4" id="nh-val-notes" placeholder="Tuliskan rekomendasi klinis, terapi, atau jadwal kontrol ulang...">${esc(v.clinical_notes || '')}</textarea>
          </div>
          <div id="nh-val-msg" style="font-size:12px;color:var(--hub-text-muted)"></div>
          <button type="submit" class="bento-pill-btn bento-pill-btn--accent" style="height:36px">Sahkan &amp; Tanda Tangani Dokumen</button>
        </form>
      `;
      document.getElementById('nh-val-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('nh-val-msg');
        msg.textContent = 'Mengesahkan dokumen...';
        try {
          const res = await fetch(`/api/nakes/consultation/${encodeURIComponent(getDocCode(doc))}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              validator_name: state.nakes?.name || 'Dokter Pemeriksa',
              validator_email: state.nakes?.email || '',
              validator_institution: state.nakes?.institution || 'Faskes Mitra Neura',
              validation_status: document.getElementById('nh-val-status').value,
              clinical_notes: document.getElementById('nh-val-notes').value.trim()
            })
          });
          const j = await res.json();
          msg.textContent = j.success ? 'Dokumen berhasil disahkan.' : (j.error || 'Gagal mengesahkan.');
          if (j.success) {
            await fetchWorkspaceData();
            await selectPatientByCode(getDocCode(doc), false);
          }
        } catch (err) {
          msg.textContent = err.message;
        }
      });
      return;
    }

    if (type === 'history') {
      kicker.textContent = 'CLINICAL AUDIT LOG';
      title.textContent = 'History Pasien & Dokumen';
      body.innerHTML = state.consultations.map(it => {
        const code = getDocCode(it);
        const val = isDocValidated(it);
        return `
          <div class="nh-history-item" style="margin-bottom:8px" data-drw-hist="${esc(code)}">
            <div>
              <div class="nh-wl-name">${esc(getPatientName(it))} — ${esc(code)}</div>
              <div class="nh-wl-code">${esc(it.doc_id || code)} · ${esc(it.created_at || '')}</div>
            </div>
            <span class="nh-badge ${val ? 'is-ok' : 'is-warn'}">${val ? 'VALIDATED' : 'ACTIVE'}</span>
          </div>
        `;
      }).join('') || '<div class="nh-preview-empty">Belum ada riwayat.</div>';
      body.querySelectorAll('[data-drw-hist]').forEach(el => {
        el.addEventListener('click', () => selectPatientByCode(el.getAttribute('data-drw-hist'), true));
      });
      return;
    }

    if (type === 'profile') {
      kicker.textContent = 'NAKES CREDENTIALS';
      title.textContent = 'Profil Tenaga Kesehatan';
      const n = state.nakes || {};
      body.innerHTML = `
        <form class="nh-form-stack" id="nh-prof-form">
          <div class="nh-form-field"><label>Nama Lengkap</label><input id="nh-pf-name" value="${esc(n.name || '')}" /></div>
          <div class="nh-form-field"><label>Spesialisasi</label><input id="nh-pf-prof" value="${esc(n.profession || '')}" /></div>
          <div class="nh-form-field"><label>Instansi / Faskes</label><input id="nh-pf-inst" value="${esc(n.institution || '')}" /></div>
          <div class="nh-form-field"><label>Email Neura</label><input value="${esc(n.email || '')}" disabled /></div>
          <div id="nh-pf-msg" style="font-size:12px;color:var(--hub-text-muted)"></div>
          <button type="submit" class="bento-pill-btn bento-pill-btn--accent" style="height:36px">Simpan Profil</button>
        </form>
      `;
      document.getElementById('nh-prof-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('nh-pf-msg');
        msg.textContent = 'Menyimpan...';
        try {
          const res = await fetch('/api/nakes/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: n.email,
              id: n.id,
              name: document.getElementById('nh-pf-name').value.trim(),
              profession: document.getElementById('nh-pf-prof').value.trim(),
              institution: document.getElementById('nh-pf-inst').value.trim()
            })
          });
          const j = await res.json();
          msg.textContent = j.success ? 'Profil berhasil diperbarui.' : (j.error || 'Gagal menyimpan.');
          if (j.success && j.data) {
            localStorage.setItem('neura_nakes_session', JSON.stringify({ ...n, ...j.data }));
            loadNakesProfile();
          }
        } catch (err) {
          msg.textContent = err.message;
        }
      });
    }
  }

  function bindEvents() {
    document.querySelectorAll('[data-nh-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-nh-nav]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.getAttribute('data-nh-nav');
        if (target !== 'overview') openDrawer(target);
      });
    });

    document.querySelectorAll('[data-nh-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-nh-filter]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.filter = chip.getAttribute('data-nh-filter');
        renderSidebarWorklist();
      });
    });

    document.querySelectorAll('[data-nh-hist]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('[data-nh-hist]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.histTab = tab.getAttribute('data-nh-hist');
        renderHistoryList();
      });
    });

    document.querySelectorAll('[data-nh-drawer]').forEach(card => {
      card.addEventListener('click', () => openDrawer(card.getAttribute('data-nh-drawer')));
    });

    document.getElementById('nh-topbar-code-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      selectPatientByCode(document.getElementById('nh-topbar-code-input')?.value, true);
    });

    document.getElementById('nh-main-code-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      selectPatientByCode(document.getElementById('nh-main-code-input')?.value, false);
    });

    document.getElementById('nh-btn-open-patients')?.addEventListener('click', () => openDrawer('patients'));
    document.getElementById('nh-btn-open-analysis')?.addEventListener('click', () => openDrawer('analytics'));
    document.getElementById('nh-btn-refresh')?.addEventListener('click', fetchWorkspaceData);
    document.getElementById('nh-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('nh-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'nh-drawer-backdrop') closeDrawer();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadNakesProfile();
    setupThemeAndChrome();
    bindEvents();
    fetchWorkspaceData();
  });
})();
