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
      renderScatterMatrix();

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
      renderDomainRadar(doc);
      syncSimulatorFromDoc(doc);
      syncInlineTriage(doc);
      renderScatterMatrix();
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

    bindSimulatorAndTriage();
  }

  // ------------------------------------------------------------------------
  // Interactive Domain Radar (5-Axis SVG), Simulator, Triage, Scatter, Compare
  // ------------------------------------------------------------------------

  function renderDomainRadar(doc) {
    const wrap = document.getElementById('nh-radar-wrap');
    if (!wrap || !doc) return;
    const s = getBiomarkerStats(doc);
    const tag = document.getElementById('nh-radar-tag');
    if (tag) tag.textContent = getDocCode(doc);

    const clamp01 = (v) => Math.max(0.1, Math.min(1, v));
    const axes = [
      { label: 'MMSE', norm: clamp01(Number(s.mmse) / 30), raw: `${s.mmse}/30` },
      { label: 'ADL', norm: clamp01(Number(s.adl) / 10), raw: `${s.adl}/10` },
      { label: 'Vaskular', norm: clamp01(1 - Math.max(0, Number(s.sbp) - 110) / 110), raw: `${s.sbp} mmHg` },
      { label: 'Lipid', norm: clamp01(1 - Math.max(0, Number(s.chol) - 150) / 300), raw: `${s.chol} mg/dL` },
      { label: 'BMI', norm: clamp01(1 - Math.abs(Number(s.bmi) - 22) / 22), raw: `${s.bmi} kg/m²` }
    ];

    const cx = 110, cy = 100, R = 68;
    const pt = (idx, ratio) => {
      const ang = (-Math.PI / 2) + (idx * 2 * Math.PI / axes.length);
      return [cx + Math.cos(ang) * R * ratio, cy + Math.sin(ang) * R * ratio];
    };

    const patientPts = axes.map((a, i) => pt(i, a.norm).map(n => n.toFixed(1)).join(',')).join(' ');
    const targetPts = axes.map((_, i) => pt(i, 0.78).map(n => n.toFixed(1)).join(',')).join(' ');
    const gridRings = [0.35, 0.65, 1].map(r => {
      const p = axes.map((_, i) => pt(i, r).map(n => n.toFixed(1)).join(',')).join(' ');
      return `<polygon points="${p}" fill="none" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>`;
    }).join('');
    const spokes = axes.map((_, i) => {
      const [x, y] = pt(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>`;
    }).join('');
    const labels = axes.map((a, i) => {
      const [lx, ly] = pt(i, 1.2);
      const [dx, dy] = pt(i, a.norm);
      return `
        <text x="${lx.toFixed(1)}" y="${(ly + 3).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="currentColor" opacity="0.65">${esc(a.label)}</text>
        <circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="4" fill="#D97757" class="nh-radar-dot" data-tip="${esc(a.label)}: ${esc(a.raw)}" style="cursor:pointer"/>
      `;
    }).join('');

    wrap.innerHTML = `
      <svg class="nh-radar-svg" viewBox="0 0 220 205" style="color:var(--hub-text)">
        ${gridRings}${spokes}
        <polygon points="${targetPts}" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-dasharray="3 3" stroke-width="1.2"/>
        <polygon points="${patientPts}" fill="#D97757" fill-opacity="0.18" stroke="#D97757" stroke-width="1.8"/>
        ${labels}
      </svg>
      <div class="nh-radar-tip" id="nh-radar-tip">Arahkan kursor ke titik domain</div>
    `;

    const tip = document.getElementById('nh-radar-tip');
    wrap.querySelectorAll('.nh-radar-dot').forEach(dot => {
      dot.addEventListener('mouseenter', () => { if (tip) tip.textContent = dot.getAttribute('data-tip'); });
      dot.addEventListener('mouseleave', () => { if (tip) tip.textContent = 'Arahkan kursor ke titik domain'; });
    });
  }

  function syncSimulatorFromDoc(doc) {
    if (!doc) return;
    const s = getBiomarkerStats(doc);
    const b = s.b32 || {};
    const setRange = (id, valId, val) => {
      const el = document.getElementById(id);
      const vEl = document.getElementById(valId);
      if (el && !isNaN(Number(val))) el.value = Number(val);
      if (vEl && el) vEl.textContent = el.value;
    };
    setRange('nh-sim-mmse', 'nh-sim-mmse-val', s.mmse);
    setRange('nh-sim-adl', 'nh-sim-adl-val', s.adl);
    setRange('nh-sim-sbp', 'nh-sim-sbp-val', s.sbp);
    const mem = document.getElementById('nh-sim-mem');
    const dis = document.getElementById('nh-sim-dis');
    if (mem) mem.checked = Number(b.MemoryComplaints || 0) === 1;
    if (dis) dis.checked = Number(b.Disorientation || 0) === 1;
    updateLocalSimEstimate();
  }

  function updateLocalSimEstimate() {
    const mmse = Number(document.getElementById('nh-sim-mmse')?.value ?? 24);
    const adl = Number(document.getElementById('nh-sim-adl')?.value ?? 7);
    const sbp = Number(document.getElementById('nh-sim-sbp')?.value ?? 120);
    const mem = document.getElementById('nh-sim-mem')?.checked ? 1 : 0;
    const dis = document.getElementById('nh-sim-dis')?.checked ? 1 : 0;
    let score = 12 + Math.max(0, 24 - mmse) * 2.6 + Math.max(0, 7 - adl) * 3.1 + Math.max(0, sbp - 130) * 0.22 + mem * 14 + dis * 16;
    score = Math.max(3, Math.min(97, Math.round(score)));
    const el = document.getElementById('nh-sim-score');
    if (el) el.textContent = `${score}% (${score >= 60 ? 'Tinggi' : score >= 35 ? 'Sedang' : 'Rendah'})`;
  }

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

  function renderScatterMatrix() {
    const wrap = document.getElementById('nh-scatter-wrap');
    if (!wrap) return;
    if (!state.consultations.length) {
      wrap.innerHTML = '<div class="nh-preview-empty">Belum ada data pasien.</div>';
      return;
    }
    const W = 760, H = 175, padL = 36, padR = 18, padT = 14, padB = 24;
    const activeCode = state.activeDoc ? getDocCode(state.activeDoc) : '';
    const dots = state.consultations.map(it => {
      const s = getBiomarkerStats(it);
      const age = Math.max(18, Math.min(95, Number(s.age) || 65));
      const mmse = Math.max(0, Math.min(30, Number(s.mmse) || 24));
      const x = padL + 8 + ((age - 18) / 77) * (W - padL - padR - 14);
      const y = padT + (1 - mmse / 30) * (H - padT - padB);
      const code = getDocCode(it);
      const high = isDocHighRisk(it);
      const fill = high ? '#dc2626' : (mmse < 24 ? '#d97706' : '#16a34a');
      const isSel = code === activeCode;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSel ? 5.5 : 3.8}" fill="${fill}" fill-opacity="${isSel ? 1 : 0.78}" stroke="${isSel ? '#ffffff' : 'none'}" stroke-width="1.5" class="nh-scatter-dot" data-sc-code="${esc(code)}" data-sc-tip="${esc(getPatientName(it))} (${esc(code)}) · Usia ${age} · MMSE ${mmse}/30"/>`;
    }).join('');
    const y24 = (padT + (1 - 24 / 30) * (H - padT - padB)).toFixed(1);

    wrap.innerHTML = `
      <svg class="nh-scatter-svg" viewBox="0 0 ${W} ${H}">
        <line x1="${padL}" y1="${y24}" x2="${W - padR}" y2="${y24}" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="3 3"/>
        <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="currentColor" stroke-opacity="0.18"/>
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="currentColor" stroke-opacity="0.18"/>
        <text x="${padL + 4}" y="${H - 6}" font-size="10" fill="currentColor" opacity="0.5">18 thn</text>
        <text x="${W - padR}" y="${H - 6}" text-anchor="end" font-size="10" fill="currentColor" opacity="0.5">95 thn</text>
        <text x="6" y="${padT + 8}" font-size="10" fill="currentColor" opacity="0.5">30</text>
        <text x="6" y="${Number(y24) + 3}" font-size="9" fill="currentColor" opacity="0.45">24</text>
        <text x="10" y="${H - padB}" font-size="10" fill="currentColor" opacity="0.5">0</text>
        ${dots}
      </svg>
      <div class="nh-scatter-tip" id="nh-scatter-tip">Klik titik mana saja untuk memuat dossier pasien</div>
    `;
    const tip = document.getElementById('nh-scatter-tip');
    wrap.querySelectorAll('.nh-scatter-dot').forEach(dot => {
      dot.addEventListener('mouseenter', () => { if (tip) tip.textContent = dot.getAttribute('data-sc-tip'); });
      dot.addEventListener('click', () => selectPatientByCode(dot.getAttribute('data-sc-code'), false));
    });
  }

  function bindSimulatorAndTriage() {
    [['nh-sim-mmse', 'nh-sim-mmse-val'], ['nh-sim-adl', 'nh-sim-adl-val'], ['nh-sim-sbp', 'nh-sim-sbp-val']].forEach(([inId, vId]) => {
      document.getElementById(inId)?.addEventListener('input', (e) => {
        const vEl = document.getElementById(vId);
        if (vEl) vEl.textContent = e.target.value;
        updateLocalSimEstimate();
      });
    });
    ['nh-sim-mem', 'nh-sim-dis'].forEach(id => document.getElementById(id)?.addEventListener('change', updateLocalSimEstimate));
    document.getElementById('nh-sim-reset')?.addEventListener('click', () => syncSimulatorFromDoc(state.activeDoc));
    document.getElementById('nh-sim-run')?.addEventListener('click', async () => {
      const btn = document.getElementById('nh-sim-run');
      const scoreEl = document.getElementById('nh-sim-score');
      if (!btn || !scoreEl) return;
      const base = (state.activeDoc && (state.activeDoc.all_32_biomarkers || state.activeDoc.raw_features)) || {};
      const payload = {
        ...base,
        MMSE: Number(document.getElementById('nh-sim-mmse').value),
        ADL: Number(document.getElementById('nh-sim-adl').value),
        SystolicBP: Number(document.getElementById('nh-sim-sbp').value),
        MemoryComplaints: document.getElementById('nh-sim-mem').checked ? 1 : 0,
        Disorientation: document.getElementById('nh-sim-dis').checked ? 1 : 0
      };
      btn.disabled = true;
      btn.textContent = 'Menguji...';
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await res.json();
        const prob = j.probability_positive ?? j.probability ?? j.risk_probability;
        if (prob != null) {
          const pct = Math.round(Number(prob) > 1 ? Number(prob) : Number(prob) * 100);
          scoreEl.textContent = `${pct}% (${j.risk_level || (pct >= 50 ? 'High Risk' : 'Low Risk')})`;
        }
      } catch (_) {} finally {
        btn.disabled = false;
        btn.textContent = 'Uji /api/predict';
      }
    });

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

  document.addEventListener('DOMContentLoaded', () => {
    loadNakesProfile();
    setupThemeAndChrome();
    bindEvents();
    fetchWorkspaceData();
    setInterval(fetchWorkspaceData, 45000);
  });
})();
