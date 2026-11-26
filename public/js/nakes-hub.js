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
    currentStep: 1,
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
    const sidebar1 = document.getElementById('hub-sidebar-1');
    if (mobBtn && sidebar1) {
      mobBtn.addEventListener('click', () => {
        sidebar1.classList.toggle('is-open');
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

    const doLogout = () => {
      try {
        localStorage.removeItem('neura_nakes_session');
        localStorage.removeItem('neura_auth_user');
        localStorage.removeItem('neura_user_role');
      } catch (_) {}
      window.location.replace('/welcome');
    };
    document.getElementById('nh-logout-btn')?.addEventListener('click', doLogout);
    document.getElementById('nh-sb-logout-btn')?.addEventListener('click', doLogout);
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
        fetch('/api/consultation/summary', { cache: 'no-store' }),
        fetch('/api/consultation/list', { cache: 'no-store' })
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
      renderPatientSwitcher();
      fetchDiseaseStats();

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
      const res = await fetch(`/api/consultation/${encodeURIComponent(cleaned)}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || (!json.success && !json.found && !json.data)) {
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
      syncInlineTriage(doc);
      syncClinicalWorkflow(doc);
      renderPatientSwitcher();
      renderOfficialDossierPreview(doc);
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
    const rawProb = pred.probability_positive ?? pred.probability;
    const probNum = rawProb != null ? Number(rawProb) : null;
    const prob = probNum != null && !isNaN(probNum)
      ? `${Math.round(probNum > 1 ? probNum : probNum * 100)}%`
      : '—';

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
        <div class="nh-mini-stat"><span>TD / BMI</span><strong>${esc(stats.sbp)}/${esc(stats.dbp)} · ${esc(stats.bmi)}</strong></div>
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

  function setActiveNav(key) {
    document.querySelectorAll('[data-nh-nav]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-nh-nav') === key);
    });
  }

  let _drawerCloseTimer = null;

  function closeDrawer() {
    const bd = document.getElementById('nh-drawer-backdrop');
    if (bd && !bd.hidden) {
      bd.classList.remove('is-open');
      clearTimeout(_drawerCloseTimer);
      _drawerCloseTimer = setTimeout(() => {
        bd.hidden = true;
      }, 280);
    }
    setActiveNav('overview');
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

    clearTimeout(_drawerCloseTimer);
    bd.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => bd.classList.add('is-open'));
    });
    setActiveNav(type === 'validate' ? 'documents' : type);

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
      kicker.textContent = 'CLINICAL EVALUATION & ANALYTICS';
      title.textContent = doc ? `Analisa ${getPatientName(doc)}` : 'Analisa Data Pasien';
      if (!doc) {
        body.innerHTML = '<div class="nh-preview-empty">Pilih pasien terlebih dahulu untuk melihat analisa klinis mendalam.</div>';
        return;
      }
      body.innerHTML = '<div class="nh-preview-empty">Memuat evaluasi klinis XGBoost &amp; clinical flags...</div>';
      fetch(`/api/consultation/${encodeURIComponent(getDocCode(doc))}/patient-eval`, { cache: 'no-store' })
        .then(r => r.json())
        .then(j => {
          const ev = j.data || j.evaluation || j || {};
          const flags = Array.isArray(ev.clinical_flags) ? ev.clinical_flags : [];
          const tests = Array.isArray(ev.recommended_tests) ? ev.recommended_tests : [];
          const flagsHtml = flags.map(f => {
            const cls = f.severity === 'danger' ? 'is-risk' : (f.severity === 'warning' ? 'is-warn' : 'is-ok');
            return `<div class="nh-history-item" style="cursor:default">
              <div>
                <div class="nh-wl-name">${esc(f.param)}</div>
                <div class="nh-wl-code">${esc(f.status)}</div>
              </div>
              <span class="nh-badge ${cls}">${esc(f.val)}</span>
            </div>`;
          }).join('') || '<div class="nh-preview-empty">Tidak ada clinical flags tambahan.</div>';

          const testsHtml = tests.length
            ? `<ul style="margin:8px 0 0 18px;font-size:12.5px;color:var(--hub-text-secondary);line-height:1.6">${tests.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
            : '<div class="nh-preview-empty">Pemantauan berkala standar.</div>';

          body.innerHTML = `
            <div class="drawer-kpi-row">
              <div class="drawer-kpi-card"><div class="drawer-kpi-label">Kohort Pasien</div><div class="drawer-kpi-val" style="font-size:12px">${esc(ev.patient_cohort || '—')}</div></div>
              <div class="drawer-kpi-card"><div class="drawer-kpi-label">Kepastian Model</div><div class="drawer-kpi-val" style="font-size:12px">${esc(ev.confidence_category || '—')}</div></div>
              <div class="drawer-kpi-card"><div class="drawer-kpi-label">Margin Ambang</div><div class="drawer-kpi-val" style="font-size:13px">${esc(ev.margin_from_threshold ?? '—')}%</div></div>
            </div>
            <div style="margin:14px 0 8px;font-size:12px;font-weight:600;color:var(--hub-text)">Clinical Flags</div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">${flagsHtml}</div>
            <div style="padding:12px;border-radius:8px;border:1px solid var(--hub-border);background:var(--hub-bg-subtle);margin-bottom:14px">
              <div style="font-size:12px;font-weight:600;color:var(--hub-text)">Rekomendasi Pemeriksaan Lanjutan</div>
              ${testsHtml}
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="bento-pill-btn bento-pill-btn--accent" id="nh-anl-open-dossier">Buka Dossier 32 Biomarker</button>
              <button type="button" class="bento-pill-btn" id="nh-anl-open-val">Sahkan Validasi Dokter</button>
            </div>
          `;
          document.getElementById('nh-anl-open-dossier')?.addEventListener('click', () => openDrawer('documents'));
          document.getElementById('nh-anl-open-val')?.addEventListener('click', () => openDrawer('validate'));
        })
        .catch(err => {
          body.innerHTML = `<div class="nh-preview-empty" style="color:#dc2626">${esc(err.message)}</div>`;
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
          const res = await fetch(`/api/consultation/${encodeURIComponent(getDocCode(doc))}/validate`, {
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

    if (type === 'compare') {
      kicker.textContent = 'SIDE-BY-SIDE COMPARISON';
      title.textContent = 'Bandingkan 2 Pasien';
      if (state.consultations.length < 2) {
        body.innerHTML = '<div class="nh-preview-empty">Minimal dibutuhkan 2 data pasien untuk melakukan perbandingan.</div>';
        return;
      }
      const opts = state.consultations.slice(0, 30).map(it =>
        `<option value="${esc(getDocCode(it))}">${esc(getPatientName(it))} (${esc(getDocCode(it))})</option>`
      ).join('');
      body.innerHTML = `
        <div class="nh-compare-grid">
          <div class="nh-form-field"><label>Pasien A</label><select id="nh-cmp-a">${opts}</select></div>
          <div class="nh-form-field"><label>Pasien B</label><select id="nh-cmp-b">${opts}</select></div>
        </div>
        <div id="nh-cmp-table-wrap"></div>
      `;
      const selA = document.getElementById('nh-cmp-a');
      const selB = document.getElementById('nh-cmp-b');
      if (state.activeDoc) selA.value = getDocCode(state.activeDoc);
      selB.selectedIndex = selA.selectedIndex === 0 ? 1 : 0;

      const renderCmp = () => {
        const docA = state.consultations.find(x => getDocCode(x) === selA.value);
        const docB = state.consultations.find(x => getDocCode(x) === selB.value);
        if (!docA || !docB) return;
        const a = getBiomarkerStats(docA);
        const b = getBiomarkerStats(docB);
        const rows = [
          ['Usia / Gender', `${a.age} Thn · ${a.gender}`, `${b.age} Thn · ${b.gender}`],
          ['Skor MMSE', `${a.mmse} / 30`, `${b.mmse} / 30`],
          ['Kemandirian ADL', `${a.adl} / 10`, `${b.adl} / 10`],
          ['Tekanan Darah', `${a.sbp}/${a.dbp} mmHg`, `${b.sbp}/${b.dbp} mmHg`],
          ['Kolesterol Total', `${a.chol} mg/dL`, `${b.chol} mg/dL`],
          ['Trigliserida', `${a.trig} mg/dL`, `${b.trig} mg/dL`],
          ['BMI', `${a.bmi} kg/m²`, `${b.bmi} kg/m²`],
          ['Risiko', isDocHighRisk(docA) ? 'Tinggi' : 'Rendah', isDocHighRisk(docB) ? 'Tinggi' : 'Rendah']
        ].map(([lbl, va, vb]) => `<tr><td><strong>${esc(lbl)}</strong></td><td>${esc(va)}</td><td>${esc(vb)}</td></tr>`).join('');
        document.getElementById('nh-cmp-table-wrap').innerHTML = `
          <div class="drawer-table-wrap">
            <table class="drawer-table">
              <thead><tr><th>Indikator</th><th>${esc(getPatientName(docA))}</th><th>${esc(getPatientName(docB))}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      };
      selA.addEventListener('change', renderCmp);
      selB.addEventListener('change', renderCmp);
      renderCmp();
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
    const sidebar1 = document.getElementById('hub-sidebar-1');
    const sidebar2 = document.getElementById('hub-sidebar-2');

    document.querySelectorAll('[data-nh-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-nh-nav');
        if (sidebar1 && window.innerWidth <= 900) {
          sidebar1.classList.remove('is-open');
        }
        if (target === 'overview') {
          closeDrawer();
          if (sidebar2) sidebar2.classList.toggle('is-open');
        } else {
          openDrawer(target);
        }
      });
    });

    document.getElementById('nh-sb2-close-btn')?.addEventListener('click', () => {
      sidebar2?.classList.remove('is-open');
    });

    document.getElementById('nh-btn-toggle-queue')?.addEventListener('click', () => {
      sidebar2?.classList.toggle('is-open');
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
    document.getElementById('nh-btn-open-compare')?.addEventListener('click', () => openDrawer('compare'));
    document.getElementById('nh-btn-cmd-open')?.addEventListener('click', openCmdPalette);
    document.getElementById('nh-btn-open-analysis')?.addEventListener('click', () => openDrawer('analytics'));
    document.getElementById('nh-btn-refresh')?.addEventListener('click', fetchWorkspaceData);
    document.getElementById('nh-drawer-close')?.addEventListener('click', closeDrawer);
    document.getElementById('nh-drawer-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'nh-drawer-backdrop') closeDrawer();
    });
    document.getElementById('nh-cmd-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'nh-cmd-backdrop') closeCmdPalette();
    });
    document.getElementById('nh-cmd-input')?.addEventListener('input', (e) => renderCmdList(e.target.value));
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCmdPalette();
      } else if (e.key === 'Escape') {
        closeCmdPalette();
        closeDrawer();
      }
    });

    bindInlineTriage();
    bindClinicalWorkflows();
  }

  // ------------------------------------------------------------------------
  // Clinical Workflows: Audit, Symptom Verify, Disease Stats, e-Rx, Export
  // ------------------------------------------------------------------------

  const SYMPTOM_META = [
    ['MemoryComplaints', 'Keluhan Memori'],
    ['Forgetfulness', 'Pelupa'],
    ['Confusion', 'Kebingungan'],
    ['Disorientation', 'Disorientasi'],
    ['PersonalityChanges', 'Perubahan Sikap'],
    ['DifficultyCompletingTasks', 'Sulit Tugas'],
    ['BehavioralProblems', 'Gangguan Perilaku'],
    ['Hypertension', 'Hipertensi'],
    ['Diabetes', 'Diabetes']
  ];

  let _diseaseStatsCache = null;
  let _diseaseStatsTab = 'prevalence';
  let _workingSymptoms = {};
  let _workingMeds = [];

  async function fetchDiseaseStats() {
    try {
      const res = await fetch('/api/consultation/disease-stats', { cache: 'no-store' });
      const j = await res.json();
      if (j && j.success && j.data) {
        _diseaseStatsCache = j.data;
        renderDiseaseStats();
      }
    } catch (_) {}
  }

  function renderDiseaseStats() {
    const wrap = document.getElementById('nh-disease-stats-wrap');
    if (!wrap || !_diseaseStatsCache) return;
    const d = _diseaseStatsCache;
    if (_diseaseStatsTab === 'prevalence') {
      const top = (d.symptom_prevalence || []).slice(0, 6);
      wrap.innerHTML = top.map(item => `
        <div class="nh-bar-row">
          <span class="nh-bar-name">${esc(item.label)}</span>
          <div class="nh-bar-track"><div class="nh-bar-fill" style="width:${Math.max(4, Math.min(100, item.pct))}%"></div></div>
          <span class="nh-bar-val">${item.pct}% (${item.count})</span>
        </div>
      `).join('');
    } else {
      const tot = Math.max(1, d.total_cases || 1);
      const st = d.mmse_staging || {};
      const rows = [
        ['Normal (MMSE ≥ 24)', Math.round(((st.normal || 0) / tot) * 100), `${st.normal || 0} pasien`, 'is-ok'],
        ['MCI / Ringan (20–23)', Math.round(((st.mci || 0) / tot) * 100), `${st.mci || 0} pasien`, 'is-warn'],
        ['Defisit (MMSE < 20)', Math.round(((st.deficit || 0) / tot) * 100), `${st.deficit || 0} pasien`, 'is-risk'],
        ['Rata-rata MMSE / ADL', Math.round(((d.avg_mmse || 0) / 30) * 100), `${d.avg_mmse} · ${d.avg_adl}`, '']
      ];
      wrap.innerHTML = rows.map(([lbl, pct, val, cls]) => `
        <div class="nh-bar-row">
          <span class="nh-bar-name">${esc(lbl)}</span>
          <div class="nh-bar-track"><div class="nh-bar-fill ${cls}" style="width:${Math.max(4, Math.min(100, pct))}%"></div></div>
          <span class="nh-bar-val">${esc(val)}</span>
        </div>
      `).join('');
    }
  }

  function syncClinicalWorkflow(doc) {
    if (!doc) return;
    const cr = doc.clinical_record || {};
    const b = doc.all_32_biomarkers || doc.raw_features || {};

    const hashEl = document.getElementById('nh-audit-hash');
    const tagEl = document.getElementById('nh-doc-audit-tag');
    if (hashEl) hashEl.textContent = doc.verification_hash || doc.doc_id || getDocCode(doc);
    if (tagEl) tagEl.textContent = isDocValidated(doc) ? 'TERVALIDASI' : 'LENGKAP 32/32';

    const savedSyms = cr.verified_symptoms || {};
    _workingSymptoms = {};
    SYMPTOM_META.forEach(([k]) => {
      if (savedSyms[k]) {
        _workingSymptoms[k] = savedSyms[k];
      } else {
        _workingSymptoms[k] = Number(b[k] || 0) === 1 ? 'confirmed' : 'cleared';
      }
    });
    renderSymptomVerifyGrid();

    _workingMeds = Array.isArray(cr.medications) ? cr.medications.map(m => ({ ...m })) : [];
    renderRxList();

    const fu = cr.follow_up || {};
    const fuDate = document.getElementById('nh-fu-date');
    const fuPrio = document.getElementById('nh-fu-priority');
    const careNotes = document.getElementById('nh-care-notes');
    if (fuDate) fuDate.value = fu.date || '';
    if (fuPrio && fu.priority) fuPrio.value = fu.priority;
    if (careNotes) {
      const recs = Array.isArray(cr.recommendations) && cr.recommendations.length
        ? cr.recommendations.join('\n')
        : (fu.notes || '');
      careNotes.value = recs;
    }
  }

  function renderSymptomVerifyGrid() {
    const grid = document.getElementById('nh-symptom-verify-grid');
    if (!grid) return;
    grid.innerHTML = SYMPTOM_META.map(([k, lbl]) => {
      const st = _workingSymptoms[k] || 'cleared';
      const cls = st === 'confirmed' ? 'is-confirmed' : 'is-cleared';
      const txt = st === 'confirmed' ? 'YA · KONFIRMASI' : 'TIDAK ADA';
      return `
        <button type="button" class="nh-sym-chip ${cls}" data-sym-key="${esc(k)}">
          <span class="nh-sym-name">${esc(lbl)}</span>
          <span class="nh-sym-state">${txt}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('[data-sym-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.getAttribute('data-sym-key');
        _workingSymptoms[k] = _workingSymptoms[k] === 'confirmed' ? 'cleared' : 'confirmed';
        renderSymptomVerifyGrid();
      });
    });
  }

  function renderRxList() {
    const list = document.getElementById('nh-rx-list');
    const tag = document.getElementById('nh-rx-count-tag');
    if (tag) tag.textContent = `${_workingMeds.length} OBAT`;
    if (!list) return;
    if (!_workingMeds.length) {
      list.innerHTML = '<div class="nh-preview-empty">Belum ada obat ditambahkan untuk pasien ini.</div>';
      return;
    }
    list.innerHTML = _workingMeds.map((m, idx) => `
      <div class="nh-rx-item">
        <div>
          <strong>${esc(m.name)}</strong>
          <span style="color:var(--hub-text-muted);margin-left:6px">${esc(m.dose || '')} · ${esc(m.frequency || '')} · ${esc(m.duration || '')}</span>
        </div>
        <button type="button" class="nh-rx-del" data-rx-del="${idx}" title="Hapus">✕</button>
      </div>
    `).join('');
    list.querySelectorAll('[data-rx-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        _workingMeds.splice(Number(btn.getAttribute('data-rx-del')), 1);
        renderRxList();
      });
    });
  }

  async function saveClinicalRecord(patch, msgElId) {
    if (!state.activeDoc) return;
    const code = getDocCode(state.activeDoc);
    const msgEl = document.getElementById(msgElId);
    if (msgEl) msgEl.textContent = 'Menyimpan ke rekam medis...';
    try {
      const res = await fetch(`/api/consultation/${encodeURIComponent(code)}/clinical-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patch, clinician_name: state.nakes?.name || 'Dokter' })
      });
      const j = await res.json();
      if (j.success && j.data) {
        state.activeDoc = j.data;
        if (msgEl) msgEl.textContent = `Tersimpan (${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})`;
      } else if (msgEl) {
        msgEl.textContent = j.error || 'Gagal menyimpan';
      }
    } catch (err) {
      if (msgEl) msgEl.textContent = err.message;
    }
  }

  function buildAndPrintOfficialDossier() {
    const doc = state.activeDoc;
    const sheet = document.getElementById('nh-print-sheet');
    if (!doc || !sheet) return;
    const s = getBiomarkerStats(doc);
    const cr = doc.clinical_record || {};
    const v = doc.validation || {};
    const meds = Array.isArray(cr.medications) ? cr.medications : _workingMeds;
    const fu = cr.follow_up || {};
    const recs = Array.isArray(cr.recommendations) ? cr.recommendations : (doc.recommendations || []);
    const syms = SYMPTOM_META.map(([k, lbl]) => {
      const val = (_workingSymptoms[k] === 'confirmed') ? 'Terkonfirmasi' : 'Tidak Ada';
      return `${lbl}: ${val}`;
    }).join(' | ');

    const bioRows = (doc.biomarkers_breakdown || []).flatMap(cat =>
      (cat.items || []).map(it => `<tr><td>${esc(it.name || it.label)}</td><td>${esc(it.value)}</td><td>${esc(it.normal || '—')}</td></tr>`)
    ).join('');

    const medRows = meds.length
      ? meds.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.dose)}</td><td>${esc(m.frequency)}</td><td>${esc(m.duration)}</td></tr>`).join('')
      : '<tr><td colspan="4">Tidak ada resep obat tercatat.</td></tr>';

    sheet.innerHTML = `
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:10px;margin-bottom:14px">
        <div>
          <strong style="font-size:16px">NEURA AI — DOSSIER REKAM MEDIS RESMI</strong><br>
          <span>${esc(state.nakes?.institution || 'Unit Pelayanan Neurologi & Gangguan Memori')}</span>
        </div>
        <div style="text-align:right;font-family:monospace">
          <strong>${esc(getDocCode(doc))}</strong><br>
          <span>${esc(doc.verification_hash || '')}</span>
        </div>
      </div>
      <p><strong>Pasien:</strong> ${esc(getPatientName(doc))} (${esc(s.age)} Thn, ${esc(s.gender)}) | <strong>MMSE:</strong> ${esc(s.mmse)}/30 | <strong>ADL:</strong> ${esc(s.adl)}/10 | <strong>TD:</strong> ${esc(s.sbp)}/${esc(s.dbp)} mmHg</p>
      <p><strong>Verifikasi Gejala Dokter:</strong> ${esc(syms)}</p>
      <table class="nh-print-table"><thead><tr><th>Biomarker</th><th>Nilai Pasien</th><th>Rentang Normal</th></tr></thead><tbody>${bioRows}</tbody></table>
      <p><strong>Daftar Obat / Terapi (e-Prescription):</strong></p>
      <table class="nh-print-table"><thead><tr><th>Nama Obat</th><th>Dosis</th><th>Aturan Pakai</th><th>Durasi</th></tr></thead><tbody>${medRows}</tbody></table>
      <p><strong>Rekomendasi &amp; Tindak Lanjut:</strong> ${esc(recs.join('; ') || '—')} | <strong>Jadwal Kontrol:</strong> ${esc(fu.date || '—')} (${esc(fu.priority || 'Rutin')})</p>
      <div style="margin-top:24px;text-align:right">
        <div>Dokter Pemeriksa / Validator</div>
        <div style="margin-top:28px;font-weight:700">${esc(v.validator_name || state.nakes?.name || 'Tenaga Kesehatan')}</div>
        <div style="font-family:monospace;font-size:10px">${esc(v.signature_hash || 'DRAFT-CLINICAL-RECORD')}</div>
      </div>
    `;
    window.print();
  }

  function bindClinicalWorkflows() {
    document.querySelectorAll('#nh-dstat-tabs [data-nh-dstat]').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#nh-dstat-tabs .nh-mini-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        _diseaseStatsTab = tab.getAttribute('data-nh-dstat');
        renderDiseaseStats();
      });
    });

    document.getElementById('nh-sym-save-btn')?.addEventListener('click', () => {
      saveClinicalRecord({ verified_symptoms: _workingSymptoms }, 'nh-sym-save-msg');
    });

    document.querySelectorAll('#nh-rx-presets [data-rx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [name, dose, frequency, duration] = btn.getAttribute('data-rx').split('|');
        _workingMeds.push({ name, dose, frequency, duration });
        renderRxList();
      });
    });

    document.getElementById('nh-rx-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('nh-rx-name')?.value.trim();
      if (!name) return;
      _workingMeds.push({
        name,
        dose: document.getElementById('nh-rx-dose')?.value.trim() || '-',
        frequency: document.getElementById('nh-rx-freq')?.value.trim() || '1x1',
        duration: document.getElementById('nh-rx-dur')?.value.trim() || '30 hari'
      });
      document.getElementById('nh-rx-name').value = '';
      document.getElementById('nh-rx-dose').value = '';
      document.getElementById('nh-rx-freq').value = '';
      document.getElementById('nh-rx-dur').value = '';
      renderRxList();
    });

    document.getElementById('nh-rx-save-btn')?.addEventListener('click', () => {
      saveClinicalRecord({ medications: _workingMeds }, 'nh-rx-save-msg');
    });

    document.querySelectorAll('#nh-care-presets [data-care]').forEach(btn => {
      btn.addEventListener('click', () => {
        const ta = document.getElementById('nh-care-notes');
        const txt = btn.getAttribute('data-care');
        if (ta) ta.value = ta.value.trim() ? `${ta.value.trim()}\n${txt}` : txt;
      });
    });

    document.getElementById('nh-fu-save-btn')?.addEventListener('click', () => {
      const notesRaw = document.getElementById('nh-care-notes')?.value.trim() || '';
      const recs = notesRaw ? notesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
      saveClinicalRecord({
        recommendations: recs,
        follow_up: {
          date: document.getElementById('nh-fu-date')?.value || '',
          priority: document.getElementById('nh-fu-priority')?.value || 'RUTIN_30_HARI',
          notes: notesRaw
        }
      }, 'nh-fu-save-msg');
    });

    document.getElementById('nh-exp-pdf')?.addEventListener('click', buildAndPrintOfficialDossier);
    document.getElementById('nh-exp-json')?.addEventListener('click', () => {
      if (!state.activeDoc) return;
      const blob = new Blob([JSON.stringify(state.activeDoc, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${getDocCode(state.activeDoc) || 'dossier'}.hl7.json`;
      a.click();
    });
    document.getElementById('nh-exp-csv')?.addEventListener('click', () => {
      if (!state.activeDoc) return;
      const doc = state.activeDoc;
      const s = getBiomarkerStats(doc);
      const csv = [
        'Kode,Pasien,Usia,Gender,MMSE,ADL,TD,BMI,Status',
        `"${getDocCode(doc)}","${getPatientName(doc)}",${s.age},"${s.gender}",${s.mmse},${s.adl},"${s.sbp}/${s.dbp}",${s.bmi},"${doc.status || 'ACTIVE'}"`
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${getDocCode(doc) || 'ringkasan'}.csv`;
      a.click();
    });
  }

  // ------------------------------------------------------------------------
  // Inline Clinical Triage & Command Palette
  // ------------------------------------------------------------------------

  function syncInlineTriage(doc) {
    if (!doc) return;
    const v = doc.validation || {};
    const validated = isDocValidated(doc);
    const st = document.getElementById('nh-triage-status');
    const notes = document.getElementById('nh-triage-notes');
    const sig = document.getElementById('nh-triage-sig');
    if (st) st.textContent = validated ? 'TERVALIDASI' : 'BELUM VALIDASI';
    if (notes) notes.value = v.clinical_notes || '';
    if (sig) sig.textContent = v.signature_hash ? `SIG: ${v.signature_hash}` : `KODE: ${getDocCode(doc)}`;
  }

  function bindInlineTriage() {
    document.querySelectorAll('#nh-triage-chips .nh-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#nh-triage-chips .nh-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    document.getElementById('nh-triage-submit')?.addEventListener('click', async () => {
      if (!state.activeDoc) return;
      const btn = document.getElementById('nh-triage-submit');
      const activeChip = document.querySelector('#nh-triage-chips .nh-chip.active');
      const statusVal = activeChip ? activeChip.getAttribute('data-triage') : 'TERKONFIRMASI_KLINIS';
      const notes = document.getElementById('nh-triage-notes')?.value.trim() || '';
      btn.disabled = true;
      btn.textContent = 'Menyimpan...';
      try {
        const code = getDocCode(state.activeDoc);
        const res = await fetch(`/api/consultation/${encodeURIComponent(code)}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            validator_name: state.nakes?.name || 'Dokter Pemeriksa',
            validator_email: state.nakes?.email || '',
            validator_institution: state.nakes?.institution || 'Faskes Mitra Neura',
            validation_status: statusVal,
            clinical_notes: notes
          })
        });
        const j = await res.json();
        if (j.success) {
          await fetchWorkspaceData();
          await selectPatientByCode(code, false);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sahkan Sekarang';
      }
    });
  }

  function openCmdPalette() {
    const bd = document.getElementById('nh-cmd-backdrop');
    const inp = document.getElementById('nh-cmd-input');
    if (!bd) return;
    bd.hidden = false;
    renderCmdList('');
    setTimeout(() => inp && inp.focus(), 20);
  }

  function closeCmdPalette() {
    const bd = document.getElementById('nh-cmd-backdrop');
    if (bd) bd.hidden = true;
  }

  function renderCmdList(query) {
    const list = document.getElementById('nh-cmd-list');
    if (!list) return;
    const q = String(query || '').toLowerCase().trim();
    const actions = [
      { label: 'Buka Direktori Pasien', tag: 'Drawer', fn: () => openDrawer('patients') },
      { label: 'Bandingkan 2 Pasien', tag: 'Compare', fn: () => openDrawer('compare') },
      { label: 'Buka Dossier Medis Pasien Aktif', tag: 'Dossier', fn: () => openDrawer('documents') },
      { label: 'Ganti Tema (Light / Dark)', tag: 'Theme', fn: () => document.getElementById('hub-theme-btn')?.click() }
    ].filter(a => !q || a.label.toLowerCase().includes(q));

    const pts = state.consultations
      .filter(it => !q || getPatientName(it).toLowerCase().includes(q) || getDocCode(it).toLowerCase().includes(q))
      .slice(0, 8)
      .map(it => ({
        label: `${getPatientName(it)} — ${getDocCode(it)}`,
        tag: isDocHighRisk(it) ? 'Risiko' : 'Pasien',
        fn: () => selectPatientByCode(getDocCode(it), false)
      }));

    const combined = [...actions, ...pts];
    list.innerHTML = combined.map((c, idx) =>
      `<button type="button" class="nh-cmd-item" data-cmd-idx="${idx}"><span>${esc(c.label)}</span><span class="nh-badge">${esc(c.tag)}</span></button>`
    ).join('') || '<div class="nh-empty-hint">Tidak ada hasil.</div>';

    list.querySelectorAll('[data-cmd-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = combined[Number(btn.getAttribute('data-cmd-idx'))];
        closeCmdPalette();
        if (item && item.fn) item.fn();
      });
    });
  }

  // ------------------------------------------------------------------------
  // 6-Step Clinical Pipeline, Patient Switcher & Official Dossier Preview
  // ------------------------------------------------------------------------

  function goToNakesStep(step) {
    const next = Math.max(1, Math.min(6, Number(step) || 1));
    const prev = state.currentStep || 1;
    state.currentStep = next;

    document.querySelectorAll('.nh-step-tab').forEach(tab => {
      const s = Number(tab.getAttribute('data-nh-step'));
      tab.classList.toggle('is-active', s === next);
      tab.classList.toggle('is-done', s < next);
    });

    const fill = document.getElementById('nh-step-progress-fill');
    if (fill) fill.style.width = `${(next / 6) * 100}%`;

    document.querySelectorAll('.nh-step-pane').forEach(pane => {
      const p = Number(pane.getAttribute('data-nh-pane'));
      pane.classList.remove('is-active', 'anim-prev');
      if (p === next) {
        pane.classList.add('is-active');
        if (next < prev) pane.classList.add('anim-prev');
      }
    });

    if (next === 6 && state.activeDoc) {
      renderOfficialDossierPreview(state.activeDoc);
    }
  }

  function renderPatientSwitcher() {
    const sel = document.getElementById('nh-switcher-select');
    const meta = document.getElementById('nh-switcher-meta');
    const activeCode = state.activeDoc ? getDocCode(state.activeDoc) : '';

    if (sel) {
      if (!state.consultations.length) {
        sel.innerHTML = '<option value="">Belum ada pasien</option>';
      } else {
        sel.innerHTML = state.consultations.map(it => {
          const code = getDocCode(it);
          const name = getPatientName(it);
          return `<option value="${esc(code)}" ${code === activeCode ? 'selected' : ''}>${esc(code)} — ${esc(name)}</option>`;
        }).join('');
      }
    }

    if (meta && state.activeDoc) {
      const s = getBiomarkerStats(state.activeDoc);
      const val = isDocValidated(state.activeDoc);
      const prob = state.activeDoc.risk_probability != null
        ? `${Math.round(Number(state.activeDoc.risk_probability) * 100)}%`
        : (state.activeDoc.prediction?.probability != null ? `${Math.round(Number(state.activeDoc.prediction.probability) * 100)}%` : '—');
      meta.innerHTML = `
        <span class="nh-meta-pill">MMSE: ${esc(s.mmse)}/30</span>
        <span class="nh-meta-pill">ADL: ${esc(s.adl)}</span>
        <span class="nh-meta-pill">Risiko: ${esc(prob)}</span>
        <span class="nh-meta-pill ${val ? 'is-ok' : 'is-warn'}" id="nh-switcher-status-pill">${val ? 'TERVALIDASI' : 'BELUM VALIDASI'}</span>
      `;
    }
  }

  function renderOfficialDossierPreview(doc) {
    const box = document.getElementById('nh-official-preview');
    if (!box || !doc) return;
    const s = getBiomarkerStats(doc);
    const cr = doc.clinical_record || {};
    const v = doc.validation || {};
    const meds = Array.isArray(cr.medications) ? cr.medications : _workingMeds;
    const fu = cr.follow_up || {};
    const recs = Array.isArray(cr.recommendations) && cr.recommendations.length
      ? cr.recommendations
      : (Array.isArray(doc.recommendations) ? doc.recommendations : []);

    const confirmedSyms = SYMPTOM_META
      .filter(([k]) => _workingSymptoms[k] === 'confirmed')
      .map(([, lbl]) => lbl);

    const medSummary = meds.length
      ? meds.map(m => `${esc(m.name)} (${esc(m.dose || '-')} · ${esc(m.frequency || '-')} · ${esc(m.duration || '-')})`).join('<br>')
      : '<span style="color:var(--hub-text-muted)">Belum ada resep obat tercatat.</span>';

    const recSummary = recs.length
      ? recs.map(r => `• ${esc(r)}`).join('<br>')
      : '<span style="color:var(--hub-text-muted)">Belum ada rekomendasi klinis.</span>';

    box.innerHTML = `
      <div class="nh-doc-head">
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--hub-accent)">DOSSIER MEDIS RESMI · NEURA CLINICAL AI</div>
          <h3 style="margin:4px 0 2px;font-size:16px">${esc(getPatientName(doc))}</h3>
          <div style="font-size:12px;color:var(--hub-text-muted)">Kode: <strong>${esc(getDocCode(doc))}</strong> · Usia ${esc(s.age)} thn · ${esc(s.gender)}</div>
        </div>
        <div style="text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px">
          <div>${isDocValidated(doc) ? 'STATUS: TERVALIDASI' : 'STATUS: DRAFT KLINIS'}</div>
          <div style="color:var(--hub-text-muted)">${esc(v.signature_hash || doc.verification_hash || 'SIG-PENDING')}</div>
        </div>
      </div>
      <div class="nh-doc-grid">
        <div class="nh-doc-box">
          <h4>Ringkasan 32 Biomarker</h4>
          <div>MMSE: <strong>${esc(s.mmse)}/30</strong> · ADL: <strong>${esc(s.adl)}</strong></div>
          <div>TD: <strong>${esc(s.sbp)}/${esc(s.dbp)} mmHg</strong> · BMI: <strong>${esc(s.bmi)}</strong></div>
          <div>Kolesterol: <strong>${esc(s.chol)}</strong> · Trigliserida: <strong>${esc(s.trig)}</strong></div>
        </div>
        <div class="nh-doc-box">
          <h4>Gejala Terverifikasi (${confirmedSyms.length}/9)</h4>
          <div>${confirmedSyms.length ? esc(confirmedSyms.join(', ')) : 'Tidak ada gejala aktif terkonfirmasi.'}</div>
        </div>
        <div class="nh-doc-box">
          <h4>Regimen Obat (e-Rx)</h4>
          <div>${medSummary}</div>
        </div>
        <div class="nh-doc-box">
          <h4>Rekomendasi &amp; Tindak Lanjut</h4>
          <div>${recSummary}</div>
          <div style="margin-top:6px;font-size:12px;color:var(--hub-text-muted)">
            Kontrol: <strong>${esc(fu.date || 'Belum dijadwalkan')}</strong> (${esc(fu.priority || 'RUTIN')})
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--hub-text-muted);padding-top:8px;border-top:1px solid var(--hub-border)">
        <span>Dokter Pemeriksa: <strong>${esc(v.validator_name || state.nakes?.name || 'Tenaga Kesehatan')}</strong></span>
        <span>Catatan: ${esc(v.clinical_notes || document.getElementById('nh-triage-notes')?.value || '—')}</span>
      </div>
    `;
  }

  function bindPipelineEvents() {
    document.querySelectorAll('[data-nh-step]').forEach(tab => {
      tab.addEventListener('click', () => goToNakesStep(tab.getAttribute('data-nh-step')));
    });

    document.querySelectorAll('[data-nh-goto]').forEach(btn => {
      btn.addEventListener('click', () => goToNakesStep(btn.getAttribute('data-nh-goto')));
    });

    const switcher = document.getElementById('nh-switcher-select');
    if (switcher) {
      switcher.addEventListener('change', () => {
        if (switcher.value) selectPatientByCode(switcher.value, false);
      });
    }

    const cyclePatient = delta => {
      if (!state.consultations.length) return;
      const activeCode = state.activeDoc ? getDocCode(state.activeDoc) : '';
      const idx = Math.max(0, state.consultations.findIndex(it => getDocCode(it) === activeCode));
      const nextIdx = (idx + delta + state.consultations.length) % state.consultations.length;
      const targetCode = getDocCode(state.consultations[nextIdx]);
      if (targetCode) selectPatientByCode(targetCode, false);
    };

    document.getElementById('nh-prev-patient-btn')?.addEventListener('click', () => cyclePatient(-1));
    document.getElementById('nh-next-patient-btn')?.addEventListener('click', () => cyclePatient(1));

    document.getElementById('nh-step2-next-btn')?.addEventListener('click', async () => {
      await saveClinicalRecord({ verified_symptoms: _workingSymptoms }, 'nh-sym-save-msg');
      goToNakesStep(3);
    });

    document.getElementById('nh-step4-next-btn')?.addEventListener('click', async () => {
      await saveClinicalRecord({
        medications: _workingMeds,
        follow_up: {
          date: document.getElementById('nh-fu-date')?.value || '',
          priority: document.getElementById('nh-fu-priority')?.value || 'RUTIN_30_HARI',
          notes: document.getElementById('nh-care-notes')?.value.trim() || ''
        }
      }, 'nh-rx-save-msg');
      goToNakesStep(5);
    });

    document.getElementById('nh-step5-next-btn')?.addEventListener('click', async () => {
      const notesRaw = document.getElementById('nh-care-notes')?.value.trim() || '';
      const recs = notesRaw ? notesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
      await saveClinicalRecord({
        recommendations: recs,
        follow_up: {
          date: document.getElementById('nh-fu-date')?.value || '',
          priority: document.getElementById('nh-fu-priority')?.value || 'RUTIN_30_HARI',
          notes: notesRaw
        }
      }, 'nh-fu-save-msg');
      document.getElementById('nh-triage-submit')?.click();
      goToNakesStep(6);
    });

    document.getElementById('nh-step6-save-btn')?.addEventListener('click', async () => {
      const notesRaw = document.getElementById('nh-care-notes')?.value.trim() || '';
      const recs = notesRaw ? notesRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
      await saveClinicalRecord({
        verified_symptoms: _workingSymptoms,
        medications: _workingMeds,
        recommendations: recs,
        follow_up: {
          date: document.getElementById('nh-fu-date')?.value || '',
          priority: document.getElementById('nh-fu-priority')?.value || 'RUTIN_30_HARI',
          notes: notesRaw
        }
      }, 'nh-step6-save-msg');
      if (state.activeDoc) renderOfficialDossierPreview(state.activeDoc);
    });

    document.getElementById('nh-step6-switch-btn')?.addEventListener('click', () => {
      goToNakesStep(1);
      document.getElementById('nh-switcher-select')?.focus();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadNakesProfile();
    setupThemeAndChrome();
    bindEvents();
    bindPipelineEvents();
    fetchWorkspaceData();
    setInterval(fetchWorkspaceData, 45000);
  });
})();
