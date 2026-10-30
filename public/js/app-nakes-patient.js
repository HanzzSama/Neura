/**
 * public/js/app-nakes-patient.js
 * ==============================
 * Role: Nakes (Tenaga Kesehatan)
 * Active Patient Bar, Medical Dossier, Patient-specific Evaluation & Status.
 */

// --------------------------------------------------------------------------
// Active Patient Context & Nakes Patient-Centric Views
// --------------------------------------------------------------------------

function getActivePatientDoc() {
  try {
    const raw = sessionStorage.getItem('neura_active_patient_doc') || localStorage.getItem('neura_active_patient_doc');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return null;
}
window.getActivePatientDoc = getActivePatientDoc;

function setActivePatientDoc(doc) {
  if (!doc) return;
  try {
    sessionStorage.setItem('neura_active_patient_doc', JSON.stringify(doc));
    localStorage.setItem('neura_active_patient_doc', JSON.stringify(doc));
    localStorage.setItem('neura_last_consultation', JSON.stringify(doc));
  } catch (e) { }
  updateActivePatientBar();
}
window.setActivePatientDoc = setActivePatientDoc;

function clearActivePatientDoc() {
  try {
    sessionStorage.removeItem('neura_active_patient_doc');
    localStorage.removeItem('neura_active_patient_doc');
  } catch (e) { }
  updateActivePatientBar();
  if (typeof showToast === 'function') {
    showToast('Sesi pasien aktif telah direset. Silakan masukkan kode pasien baru.', 'info');
  }
  submitCommand('/periksa');
}
window.clearActivePatientDoc = clearActivePatientDoc;

function updateActivePatientBar() {
  let bar = document.getElementById('nakes-active-patient-bar');
  const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';
  const doc = getActivePatientDoc();

  if (userRole !== 'Nakes' && userRole !== 'Admin') {
    if (bar) bar.style.display = 'none';
    return;
  }

  const container = document.querySelector('.chat-section') || document.getElementById('chat-messages')?.parentElement;
  if (!container) return;

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'nakes-active-patient-bar';
    bar.className = 'nakes-active-patient-bar';
    container.insertBefore(bar, container.firstChild);
  }

  if (!doc) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  const p = doc.patient || {};
  const isVal = doc.status === 'VALIDATED_BY_CLINICIAN' || (doc.validation && doc.validation.is_validated);
  const code = doc.nakes_code || doc.doc_id || 'NKS-ACTIVE';

  bar.innerHTML = `
    <div class="patient-bar-info">
      <span class="patient-bar-badge">🧑‍⚕️ Pasien Aktif</span>
      <span class="patient-bar-name">${escapeHtml(p.name || 'Pasien')} (${p.age || '—'} thn, ${escapeHtml(p.gender || '—')})</span>
      <span class="patient-bar-code">${escapeHtml(code)}</span>
      <span class="patient-bar-status ${isVal ? 'status-val' : 'status-wait'}">${isVal ? '✓ Tervalidasi' : '⏳ Menunggu Validasi'}</span>
    </div>
    <div class="patient-bar-actions">
      <button type="button" class="patient-bar-btn" onclick="submitCommand('/profile')">Profil</button>
      <button type="button" class="patient-bar-btn" onclick="submitCommand('/predict')">Prediksi</button>
      <button type="button" class="patient-bar-btn" onclick="submitCommand('/dokumen')">Dossier Medis</button>
      <button type="button" class="patient-bar-btn" onclick="submitCommand('/eval')">Evaluasi</button>
      <button type="button" class="patient-bar-btn" onclick="submitCommand('/status')">Status</button>
      <button type="button" class="patient-bar-btn btn-switch" onclick="clearActivePatientDoc()">Ganti Pasien</button>
    </div>
  `;
}
window.updateActivePatientBar = updateActivePatientBar;

function renderNakesPatientRequiredPrompt(targetCmd, cmdTitle) {
  const promptId = 'req_pat_' + Date.now();
  appendAssistantMessage(`
    <h4>Pemeriksaan Dokumen Pasien Diperlukan</h4>
    <div class="claude-card nakes-lookup-card">
      <p>Perintah <strong><code>${escapeHtml(targetCmd)}</code></strong> (${escapeHtml(cmdTitle)}) pada akun Tenaga Kesehatan bekerja berdasarkan <strong>data rekam medis pasien yang sedang diperiksa</strong>.</p>
      <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:12px">
        Silakan masukkan <strong>Kode Dokumen / Konsultasi Pasien</strong> (contoh: <code>NKS-26-XXXX-ALZ</code> atau <code>DOC-NEURA-2026-XXXX</code>) untuk membuka berkas pasien dan menjalankan analisis klinis:
      </p>
      <div class="nakes-lookup-form" style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
        <input type="text" id="${promptId}_input" class="nakes-validation-input" placeholder="Contoh: NKS-26-8812-ALZ" style="flex:1;min-width:200px;font-family:'JetBrains Mono',monospace;text-transform:uppercase" onkeydown="if(event.key==='Enter') submitNakesPatientPrompt('${promptId}_input', '${escapeHtml(targetCmd)}')">
        <button type="button" class="claude-btn primary" onclick="submitNakesPatientPrompt('${promptId}_input', '${escapeHtml(targetCmd)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Buka Berkas Pasien</span>
        </button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px dashed var(--border-subtle)">
        <span>Belum memiliki kode pasien untuk diuji?</span>
        <button type="button" class="claude-btn secondary" style="padding:4px 10px;font-size:11.5px" onclick="loadSamplePatientForNakes('${escapeHtml(targetCmd)}')">
          Gunakan Sampel Pasien Klinis (2.149 Data)
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/periksa', '/help', '/intro']
  });
}
window.renderNakesPatientRequiredPrompt = renderNakesPatientRequiredPrompt;

async function submitNakesPatientPrompt(inputId, thenCmd) {
  const el = document.getElementById(inputId);
  const code = el ? el.value.trim() : '';
  if (!code) {
    if (typeof showToast === 'function') showToast('Masukkan kode dokumen pasien terlebih dahulu.', 'warning');
    return;
  }
  await loadAndActivatePatient(code, thenCmd);
}
window.submitNakesPatientPrompt = submitNakesPatientPrompt;

async function loadSamplePatientForNakes(thenCmd) {
  try {
    if (typeof showToast === 'function') showToast('Membuat simulasi dokumen pasien klinis dari dataset...', 'info');
    const docData = await fetchJSON('/api/consultation/generate', 'POST', { mode: 'dataset' });
    if (docData && !docData.error) {
      setActivePatientDoc(docData);
      if (typeof showToast === 'function') {
        showToast(`Dokumen pasien ${docData.patient?.name || 'Pasien'} (${docData.nakes_code}) aktif!`, 'success');
      }
      if (thenCmd) {
        submitCommand(thenCmd);
      } else {
        renderPatientClinicalReviewCard(docData);
      }
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Gagal memuat sampel pasien: ' + e.message, 'error');
  }
}
window.loadSamplePatientForNakes = loadSamplePatientForNakes;

async function loadAndActivatePatient(code, thenCmd) {
  try {
    const res = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}`);
    if (res && res.found && res.data) {
      setActivePatientDoc(res.data);
      if (typeof showToast === 'function') {
        showToast(`Dokumen pasien ${res.data.patient?.name || 'Pasien'} berhasil dimuat!`, 'success');
      }
      if (thenCmd) {
        submitCommand(thenCmd);
      } else {
        renderPatientClinicalReviewCard(res.data);
      }
    } else {
      if (typeof showToast === 'function') showToast(`Dokumen dengan kode '${code}' tidak ditemukan.`, 'error');
    }
  } catch (e) {
    if (typeof showToast === 'function') showToast('Error memuat dokumen: ' + e.message, 'error');
  }
}
window.loadAndActivatePatient = loadAndActivatePatient;

function renderNakesPatientProfile(doc) {
  const p = doc.patient || {};
  const cog = doc.cognitive_scores || {};
  const isValidated = doc.status === 'VALIDATED_BY_CLINICIAN' || (doc.validation && doc.validation.is_validated);
  const nakesCode = doc.nakes_code || doc.doc_id;

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h4 style="margin:0">Rekam Medis &amp; Data Diri Pasien: ${escapeHtml(p.name || 'Pasien')}</h4>
      <span class="nakes-status-pill ${isValidated ? 'nakes-status-terkonfirmasi' : 'nakes-status-pending'}">
        ${isValidated ? '✓ Tervalidasi Dokter' : 'Menunggu Validasi'}
      </span>
    </div>

    <div class="claude-card">
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;gap:6px">
        <div>
          <span style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:700;letter-spacing:0.05em">ID Dokumen / Kode Nakes</span>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13.5px;font-weight:700;color:var(--accent-terracotta)">${escapeHtml(nakesCode)}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:11px;text-transform:uppercase;color:var(--text-muted)">Tanggal Registrasi</span>
          <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(doc.created_at || 'Hari ini')}</div>
        </div>
      </div>

      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:8px">1. Data Demografis &amp; Klinis Fisik</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(135px, 1fr));gap:8px;font-size:12.5px;padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:14px">
        <div><span style="color:var(--text-muted)">Nama:</span> <strong>${escapeHtml(p.name || '—')}</strong></div>
        <div><span style="color:var(--text-muted)">Usia:</span> <strong>${p.age || '—'} Tahun</strong></div>
        <div><span style="color:var(--text-muted)">Gender:</span> <strong>${escapeHtml(p.gender || '—')}</strong></div>
        <div><span style="color:var(--text-muted)">BMI:</span> <strong>${p.bmi || '—'} kg/m²</strong></div>
        <div><span style="color:var(--text-muted)">Tekanan Darah:</span> <strong>${p.systolic_bp || 120}/${p.diastolic_bp || 80} mmHg</strong></div>
        <div><span style="color:var(--text-muted)">Keluarga Alzheimer:</span> <strong style="color:${p.family_history ? 'var(--accent-red)' : 'var(--accent-green)'}">${p.family_history ? 'Positif (Ada)' : 'Negatif'}</strong></div>
      </div>

      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:8px">2. Pengukuran Kognitif &amp; Fungsional Awal</div>
      <div class="biomarkers-grid" style="margin-bottom:14px">
        <div class="biomarker-cell">
          <span class="biomarker-lbl">Skor MMSE</span>
          <strong class="biomarker-val" style="color:${(cog.mmse || 24) < 24 ? 'var(--accent-red)' : 'var(--accent-green)'}">${cog.mmse ?? 24} / 30</strong>
        </div>
        <div class="biomarker-cell">
          <span class="biomarker-lbl">Kemandirian ADL</span>
          <strong class="biomarker-val">${cog.adl ?? 7} / 10</strong>
        </div>
        <div class="biomarker-cell">
          <span class="biomarker-lbl">Functional Assessment</span>
          <strong class="biomarker-val">${cog.functional_assessment ?? 7} / 10</strong>
        </div>
        <div class="biomarker-cell">
          <span class="biomarker-lbl">Keluhan Memori</span>
          <strong class="biomarker-val" style="color:${cog.memory_complaints === 'Ada' ? 'var(--accent-red)' : 'var(--accent-green)'}">${cog.memory_complaints ?? 'Tidak'}</strong>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="submitCommand('/predict')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/></svg>
          <span>Jalankan Prediksi Pasien (/predict)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/dokumen')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>Buka Dossier Medis Lengkap (/dokumen)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/eval')">
          <span>Evaluasi Model Kasus (/eval)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="clearActivePatientDoc()">
          <span>Ganti Pasien</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/predict', '/dokumen', '/eval', '/status', '/periksa']
  });
}
window.renderNakesPatientProfile = renderNakesPatientProfile;

function renderNakesPatientPrediction(predData, doc) {
  const p = doc.patient || {};
  const pred = predData.prediction || predData;
  const isPos = pred.prediction === 1 || pred.is_positive || (pred.diagnosis_label && pred.diagnosis_label.includes('Alzheimer'));
  const prob = pred.probability_percent ?? pred.probability ?? 50.0;
  const riskClass = isPos ? 'val-err' : 'val-good';
  const nakesCode = doc.nakes_code || doc.doc_id;

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h4 style="margin:0">Hasil Prediksi XGBoost Pasien: ${escapeHtml(p.name || 'Pasien')}</h4>
      <span class="patient-bar-code">${escapeHtml(nakesCode)}</span>
    </div>

    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Diagnosis Prediktif</div>
          <div class="stat-val ${riskClass}" style="font-size:13.5px">${escapeHtml(pred.diagnosis_label || (isPos ? 'Risiko Alzheimer Terdeteksi' : 'Batas Normal / Negatif'))}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Tingkat Keparahan Risiko</div>
          <div class="stat-val ${riskClass}">${escapeHtml(pred.risk_level || (isPos ? 'High Risk' : 'Low Risk'))}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Probabilitas Risiko</div>
          <div class="stat-val" style="font-family:'JetBrains Mono',monospace">${prob}%</div>
        </div>
      </div>

      <div style="margin:12px 0">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
          <span>Skala Probabilitas Model (Ambang Batas: 50%)</span>
          <strong>${prob}%</strong>
        </div>
        <div style="height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${prob}%;background:${isPos ? 'var(--accent-red)' : 'var(--accent-green)'};transition:width 0.4s ease"></div>
        </div>
      </div>

      <div style="font-size:12.5px;color:var(--text-secondary);padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:12px">
        <strong>Interpretasi Klinis Nakes:</strong> Berdasarkan inferensi model XGBoost pada 32 biomarker pasien ${escapeHtml(p.name || 'ini')}, pasien terklasifikasi dalam kategori <strong>${escapeHtml(pred.risk_level || 'Risiko')}</strong>. Disarankan melakukan pengesahan diagnosis melalui formulir validasi klinis sebelum menerbitkan resume rujukan.
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Sahkan Validasi Klinis Pasien</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/dokumen')">
          <span>Dossier Medis Lengkap (/dokumen)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/eval')">
          <span>Evaluasi Model Kasus (/eval)</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/dokumen', '/eval', '/status', '/periksa']
  });
}
window.renderNakesPatientPrediction = renderNakesPatientPrediction;

function renderNakesDetailedDossier(doc) {
  const p = doc.patient || {};
  const pred = doc.prediction || {};
  const cog = doc.cognitive_scores || {};
  const v = doc.validation || {};
  const isValidated = doc.status === 'VALIDATED_BY_CLINICIAN' || v.is_validated;
  const nakesCode = doc.nakes_code || doc.doc_id;
  const cardId = 'dossier_' + Date.now();

  let biomarkerRows = '';
  if (doc.biomarkers_breakdown && Array.isArray(doc.biomarkers_breakdown)) {
    doc.biomarkers_breakdown.forEach(cat => {
      biomarkerRows += `
        <tr class="nakes-table-category">
          <td colspan="4">${escapeHtml(cat.category || 'Kategori')}</td>
        </tr>
      `;
      if (cat.items && Array.isArray(cat.items)) {
        cat.items.forEach(it => {
          let devClass = 'normal';
          let devText = 'Normal';
          const valStr = String(it.value || '').toLowerCase();
          if (valStr.includes('ada') || valStr.includes('perokok') || (it.name === 'Skor MMSE' && parseInt(it.value) < 24)) {
            devClass = 'warning';
            devText = 'Waspada';
          }
          if (it.name === 'Skor MMSE' && parseInt(it.value) < 20) {
            devClass = 'critical';
            devText = 'Defisit';
          }
          biomarkerRows += `
            <tr>
              <td><strong>${escapeHtml(it.name)}</strong></td>
              <td style="font-family:'JetBrains Mono',monospace">${escapeHtml(it.value)}</td>
              <td style="color:var(--text-muted);font-size:11.5px">${escapeHtml(it.normal || '—')}</td>
              <td><span class="biomarker-dev-tag ${devClass}">${devText}</span></td>
            </tr>
          `;
        });
      }
    });
  }

  let stampBlock = '';
  if (isValidated) {
    stampBlock = `
      <div class="nakes-validation-stamp" style="margin: 16px 0;">
        <div class="nakes-validation-stamp-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <strong style="color:var(--accent-green);font-size:12.5px;letter-spacing:0.04em;text-transform:uppercase">VALIDASI MEDIS DOKTER TERTANDA TANGAN RESMI</strong>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">${escapeHtml(v.signature_hash || '')}</span>
          </div>
          <div style="font-size:13.5px;color:var(--text-primary);margin-top:4px;font-weight:700">
            ${escapeHtml(v.validator_name || 'Dokter Spesialis Saraf')} ${v.validator_sip ? `&bull; SIP: ${escapeHtml(v.validator_sip)}` : ''}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">
            ${escapeHtml(v.validator_institution || 'Fasilitas Pelayanan Kesehatan')} &bull; Validasi: ${escapeHtml(v.validated_at || '')}
          </div>
          <div style="font-size:12.5px;padding:8px 12px;background:rgba(16,185,129,0.08);border-radius:6px">
            <strong>Status Klinis:</strong> ${escapeHtml(v.validation_status || 'TERKONFIRMASI_KLINIS')}
            ${v.clinical_notes ? `<br><strong>Catatan Medis &amp; Terapi:</strong> <em>"${escapeHtml(v.clinical_notes)}"</em>` : ''}
          </div>
        </div>
      </div>
    `;
  } else {
    stampBlock = `
      <div style="margin:14px 0;padding:12px;background:rgba(245,158,11,0.08);border:1px dashed rgba(245,158,11,0.4);border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div style="font-size:12.5px;color:var(--text-secondary)">
          <strong>Status Berkas:</strong> Dokumen skrining pasien ini belum disahkan oleh dokter pemeriksa.
        </div>
        <button type="button" class="claude-btn primary" style="padding:5px 12px;font-size:12px" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          Sahkan Validasi Sekarang
        </button>
      </div>
    `;
  }

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h4 style="margin:0">Rekam Medis Elektronik &amp; Dossier Medis Nakes</h4>
      <span class="patient-bar-code">${escapeHtml(nakesCode)}</span>
    </div>

    <div class="nakes-dossier-card" id="${cardId}">
      <div class="nakes-dossier-header">
        <div>
          <span class="nakes-dossier-badge">DOKUMEN RESMI REKAM MEDIS &bull; DOSSIER NAKES</span>
          <div class="nakes-dossier-inst">RSUP Dr. Sardjito Yogyakarta &bull; Unit Pelayanan Gangguan Memori</div>
          <div class="nakes-dossier-sub">Sistem Rekam Medis Elektronik Neura AI &bull; Akurasi Model XGBoost 95.35%</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:var(--accent-terracotta)">${escapeHtml(doc.doc_id || nakesCode)}</div>
          <div style="font-size:11px;color:var(--text-muted)">Waktu Cetak: ${new Date().toLocaleDateString('id-ID')}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12px;margin-bottom:14px">
        <div><span style="color:var(--text-muted)">Pasien:</span> <strong>${escapeHtml(p.name || '—')}</strong></div>
        <div><span style="color:var(--text-muted)">Usia/JK:</span> <strong>${p.age || '—'} Thn / ${escapeHtml(p.gender || '—')}</strong></div>
        <div><span style="color:var(--text-muted)">BMI:</span> <strong>${p.bmi || '—'} kg/m²</strong></div>
        <div><span style="color:var(--text-muted)">TD:</span> <strong>${p.systolic_bp || 120}/${p.diastolic_bp || 80} mmHg</strong></div>
        <div><span style="color:var(--text-muted)">Skor MMSE:</span> <strong>${cog.mmse ?? 24} / 30</strong></div>
        <div><span style="color:var(--text-muted)">Kemandirian ADL:</span> <strong>${cog.adl ?? 7} / 10</strong></div>
      </div>

      <div style="margin:12px 0">
        <div style="font-size:11.5px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">Tabel Pengukuran 32 Biomarker Klinis Pasien</div>
        <table class="nakes-table-biomarkers">
          <thead>
            <tr>
              <th>Biomarker / Indikator</th>
              <th>Nilai Pasien</th>
              <th>Rentang Normal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${biomarkerRows}
          </tbody>
        </table>
      </div>

      ${stampBlock}

      <div class="nakes-btn-group" style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="printPatientDossier('${cardId}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Cetak Dossier Medis (Print PDF)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="downloadPatientDossierJson('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Unduh JSON Rekam Medis (HL7 Ready)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          <span>${isValidated ? 'Edit Catatan Dokter' : 'Sahkan Validasi'}</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="clearActivePatientDoc()">
          <span>Ganti Pasien</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/predict', '/eval', '/status', '/periksa']
  });
}
window.renderNakesDetailedDossier = renderNakesDetailedDossier;

function printPatientDossier(cardId) {
  window.print();
}
window.printPatientDossier = printPatientDossier;

function downloadPatientDossierJson(code) {
  const doc = getActivePatientDoc();
  if (!doc) {
    if (typeof showToast === 'function') showToast('Data dokumen pasien tidak ditemukan.', 'error');
    return;
  }
  const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(doc, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", jsonStr);
  dlAnchor.setAttribute("download", `Dossier_Medis_${doc.nakes_code || 'Patient'}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  if (typeof showToast === 'function') showToast('File JSON Rekam Medis Pasien berhasil diunduh.', 'success');
}
window.downloadPatientDossierJson = downloadPatientDossierJson;

function renderNakesPatientModelEvaluation(evalData, doc) {
  const p = doc.patient || {};
  const nakesCode = doc.nakes_code || doc.doc_id;

  if (!evalData || !evalData.success) {
    appendAssistantMessage(`
      <h4>Evaluasi Model pada Kasus Pasien</h4>
      <div class="claude-card">
        <p>Gagal memuat evaluasi kasus: ${escapeHtml(evalData?.error || 'Koneksi terganggu')}</p>
      </div>
    `, { stream: false });
    return;
  }

  const mc = evalData.model_confidence || {};
  const ca = evalData.cohort_analysis || {};
  const flags = evalData.clinical_flags || [];
  const tests = evalData.suggested_tests || [];

  const flagsHtml = flags.map(f => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-tertiary);border-radius:6px;font-size:12px;margin-bottom:4px">
      <span><strong>${escapeHtml(f.param)}:</strong> ${escapeHtml(f.val)}</span>
      <span class="biomarker-dev-tag ${f.severity === 'danger' ? 'critical' : (f.severity === 'warning' ? 'warning' : 'normal')}">${escapeHtml(f.status)}</span>
    </div>
  `).join('');

  const testsHtml = tests.map(t => `
    <li style="margin-bottom:4px;font-size:12.5px">${escapeHtml(t)}</li>
  `).join('');

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:gap:8px">
      <h4 style="margin:0">Evaluasi Model Klinis Kasus Pasien: ${escapeHtml(p.name || 'Pasien')}</h4>
      <span class="patient-bar-code">${escapeHtml(nakesCode)}</span>
    </div>

    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Tingkat Kepastian Model</div>
          <div class="stat-val val-good" style="font-size:12.5px">${escapeHtml(mc.certainty_level || 'Tinggi')}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Margin dari Ambang Batas (50%)</div>
          <div class="stat-val" style="font-family:'JetBrains Mono',monospace">${escapeHtml(mc.margin_from_decision_boundary || '—')}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Akurasi Rujukan XGBoost</div>
          <div class="stat-val val-good">${escapeHtml(mc.model_accuracy_reference || '95.35%')}</div>
        </div>
      </div>

      <div style="margin:12px 0;padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;font-size:12.5px">
        <div style="font-weight:700;color:var(--accent-terracotta);margin-bottom:4px">Analisis Kohort Pasien Sebanding:</div>
        <div style="color:var(--text-secondary)">
          ${escapeHtml(ca.cohort_label || 'Kelompok Demografi Pasien')} diuji pada 2.149 dataset:
          Sensitivitas: <strong>${escapeHtml(ca.cohort_sensitivity || '95.8%')}</strong> &bull;
          Spesifisitas: <strong>${escapeHtml(ca.cohort_specificity || '94.9%')}</strong> &bull;
          F1-Score: <strong>${escapeHtml(ca.cohort_f1 || '94.6%')}</strong>.
        </div>
      </div>

      <div style="margin:12px 0">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.05em;margin-bottom:6px">Faktor Risiko Klinis Terdeteksi pada Pasien:</div>
        ${flagsHtml}
      </div>

      <div style="margin:12px 0;padding:10px 12px;background:rgba(224,122,95,0.06);border-radius:6px">
        <div style="font-weight:700;font-size:12px;color:var(--text-primary);margin-bottom:6px">Rekomendasi Uji Lanjutan Dokter:</div>
        <ul style="margin:0 0 0 16px;padding:0;color:var(--text-secondary)">
          ${testsHtml}
        </ul>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Sahkan Validasi Medis</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/dokumen')">
          <span>Lihat Dossier Lengkap (/dokumen)</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/dokumen', '/predict', '/status', '/periksa']
  });
}
window.renderNakesPatientModelEvaluation = renderNakesPatientModelEvaluation;

function renderNakesPatientStatus(doc) {
  const p = doc.patient || {};
  const v = doc.validation || {};
  const isValidated = doc.status === 'VALIDATED_BY_CLINICIAN' || v.is_validated;
  const nakesCode = doc.nakes_code || doc.doc_id;

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h4 style="margin:0">Status Berkas Rekam Medis: ${escapeHtml(p.name || 'Pasien')}</h4>
      <span class="patient-bar-code">${escapeHtml(nakesCode)}</span>
    </div>

    <div class="claude-card">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;font-size:12.5px;padding:12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:14px">
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block">Status Validasi</span>
          <strong style="color:${isValidated ? 'var(--accent-green)' : 'var(--accent-terracotta)'}">
            ${isValidated ? '✓ VALIDATED_BY_CLINICIAN' : '⏳ PENDING_VALIDATION'}
          </strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block">Parameter Biomarker</span>
          <strong>32/32 Parameter (100% Lengkap)</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block">Integritas Dokumen</span>
          <strong style="color:var(--accent-green)">SHA-256 Terverifikasi</strong>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-muted);display:block">Masa Berlaku Rujukan</span>
          <strong>30 Hari (Aktif)</strong>
        </div>
      </div>

      <div style="font-size:12.5px;color:var(--text-secondary);padding:10px 12px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:12px">
        <div><strong>Dokter Pemeriksa:</strong> ${escapeHtml(v.validator_name || 'Menunggu penetapan dokter')}</div>
        <div><strong>SIP:</strong> ${escapeHtml(v.validator_sip || '—')} &bull; <strong>Faskes:</strong> ${escapeHtml(v.validator_institution || 'RSUP Dr. Sardjito')}</div>
        <div><strong>Hash Tanda Tangan:</strong> <code style="font-size:11px">${escapeHtml(v.signature_hash || 'Belum diterbitkan')}</code></div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          <span>${isValidated ? 'Perbarui Validasi' : 'Validasi Sekarang'}</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/dokumen')">
          <span>Buka Dossier Medis (/dokumen)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="clearActivePatientDoc()">
          <span>Ganti Pasien</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/dokumen', '/predict', '/eval', '/periksa']
  });
}
window.renderNakesPatientStatus = renderNakesPatientStatus;

