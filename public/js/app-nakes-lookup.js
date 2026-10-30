/**
 * public/js/app-nakes-lookup.js
 * =============================
 * Role: Nakes (Tenaga Kesehatan)
 * Nakes Lookup & Clinical Review Card Generator (/periksa).
 */

// --------------------------------------------------------------------------
// Nakes Clinical Functions: Lookup, Prediction Review & Validation
// --------------------------------------------------------------------------

function renderNakesLookupPromptCard() {
  let sampleHint = '';
  try {
    const raw = localStorage.getItem('neura_last_consultation');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.nakes_code || parsed.doc_id)) {
        const c = parsed.nakes_code || parsed.doc_id;
        sampleHint = `
          <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">
            <span>Dokumen terakhir tersimpan: </span>
            <button type="button" class="claude-btn secondary" style="padding:2px 8px;font-size:11px;font-family:'JetBrains Mono',monospace" onclick="submitNakesLookup('${escapeHtml(c)}')">
              ${escapeHtml(c)}
            </button>
          </div>
        `;
      }
    }
  } catch (e) { }

  appendAssistantMessage(`
    <h4>Pemeriksaan Dokumen &amp; Validasi Klinis Pasien</h4>
    <div class="claude-card nakes-lookup-card">
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">
        Sebagai <strong>Tenaga Kesehatan (Nakes)</strong>, masukkan <strong>Kode Konsultasi Rujukan Nakes</strong> (contoh: <code>NKS-26-8812-ALZ</code>) atau <strong>No. Dokumen</strong> pasien untuk menelaah profil biomarker, menguji prediksi klinis, dan menerbitkan validasi resmi:
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <input type="text" id="nakes-code-input" class="nakes-validation-input" placeholder="Contoh: NKS-26-8812-ALZ" style="flex:1;min-width:220px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;" onkeydown="if(event.key==='Enter')submitNakesLookup()">
        <button type="button" class="claude-btn primary" onclick="submitNakesLookup()" style="display:inline-flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Cari &amp; Buka Rekam Medis</span>
        </button>
      </div>
      ${sampleHint}
    </div>
  `, {
    stream: false,
    suggestions: ['/dokumen', '/predict dataset', '/eval', '/help']
  });
}

function submitNakesLookup(overrideCode = null) {
  let code = overrideCode;
  if (!code) {
    const input = document.getElementById('nakes-code-input');
    code = input ? input.value.trim() : '';
  }
  if (!code) {
    showToast('Masukkan kode dokumen konsultasi pasien terlebih dahulu.', 'warning');
    return;
  }
  submitCommand(`/periksa ${code}`);
}
window.submitNakesLookup = submitNakesLookup;

async function lookupAndRenderPatientDocument(code, typingId, startTime) {
  setDynamicIslandState('generating', {
    sub: `Memeriksa Dokumen Klinis \u2022 ${code}`,
    main: 'Mencari'
  });

  let doc = null;
  try {
    const rawSaved = localStorage.getItem('neura_last_consultation');
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (parsed.nakes_code === code || parsed.doc_id === code) {
        doc = parsed;
      }
    }
    const res = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}`);
    if (res && res.found && res.data) {
      doc = res.data;
    }
  } catch (e) {
    console.error('Error fetching consultation:', e);
  }

  await waitLoad(startTime, 450);
  removeTypingIndicator(typingId);

  if (!doc) {
    appendAssistantMessage(`
      <h4>Pencarian Dokumen Pasien</h4>
      <div class="claude-card">
        <p style="color:var(--accent-red);font-weight:600">Dokumen dengan kode "${escapeHtml(code)}" tidak ditemukan di database server.</p>
        <p style="font-size:12.5px;color:var(--text-secondary);margin-top:6px">
          Pastikan format kode sudah sesuai (contoh: <code>NKS-26-XXXX-ALZ</code> atau <code>DOC-NEURA-2026-XXXX</code>). Jika pasien baru saja membuat dokumen di perangkat lain, minta pasien untuk memeriksa kembali kode pada lembar konsultasi mereka.
        </p>
        <div style="margin-top:10px">
          <button type="button" class="claude-btn secondary" onclick="submitCommand('/periksa')">Coba Kode Lain</button>
          <button type="button" class="claude-btn secondary" onclick="submitCommand('/dokumen')">Buat Dokumen Baru</button>
        </div>
      </div>
    `, { stream: false });
    return;
  }

  try {
    localStorage.setItem('neura_last_consultation', JSON.stringify(doc));
    if (typeof setActivePatientDoc === 'function') setActivePatientDoc(doc);
  } catch (e) { }

  renderPatientClinicalReviewCard(doc);
}

function renderPatientClinicalReviewCard(doc) {
  const patient = doc.patient || {};
  const pred = doc.prediction || {};
  const cog = doc.cognitive_scores || {};
  const isValidated = doc.status === 'VALIDATED_BY_CLINICIAN' || (doc.validation && doc.validation.is_validated);
  const nakesCode = doc.nakes_code || doc.doc_id;

  const isPos = pred.is_positive || (pred.diagnosis_label && pred.diagnosis_label.includes('Alzheimer'));
  const riskClass = isPos ? 'val-err' : 'val-good';
  const prob = pred.probability ?? 50.0;

  let statusBadgeHtml = '';
  if (isValidated) {
    statusBadgeHtml = `
      <span class="nakes-status-pill nakes-status-terkonfirmasi">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Tervalidasi Klinis
      </span>
    `;
  } else {
    statusBadgeHtml = `
      <span class="nakes-status-pill nakes-status-pending">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Menunggu Validasi Dokter
      </span>
    `;
  }

  let stampHtml = '';
  if (isValidated && doc.validation) {
    const v = doc.validation;
    const statusLabels = {
      'TERKONFIRMASI_KLINIS': 'Terkonfirmasi Klinis (Diagnosis Sesuai Skrining)',
      'OBSERVASI_BERKALA': 'Observasi & Pemantauan Kognitif Berkala',
      'RUJUKAN_LANJUTAN': 'Rujukan Lanjutan ke Dokter Spesialis Saraf / MRI',
      'DIAGNOSIS_BANDING': 'Diagnosis Banding Klinis (Non-Alzheimer)'
    };
    const statusLabel = statusLabels[v.validation_status] || v.validation_status;

    stampHtml = `
      <div class="nakes-validation-stamp">
        <div class="nakes-validation-stamp-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
            <strong style="color:var(--accent-green);font-size:12.5px;letter-spacing:0.02em;text-transform:uppercase">Dokumen Resmi Tervalidasi Tenaga Kesehatan</strong>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">${escapeHtml(v.signature_hash || '')}</span>
          </div>
          <div style="font-size:13px;color:var(--text-primary);margin-top:4px;font-weight:600">
            ${escapeHtml(v.validator_name)} ${v.validator_sip ? `&bull; SIP: ${escapeHtml(v.validator_sip)}` : ''}
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">
            ${escapeHtml(v.validator_institution || 'Fasilitas Pelayanan Kesehatan')} &bull; Tanggal: ${escapeHtml(v.validated_at || '')}
          </div>
          <div style="margin-top:6px;font-size:12px;padding:6px 10px;background:rgba(16,185,129,0.08);border-radius:6px">
            <strong>Status Klinis:</strong> ${escapeHtml(statusLabel)}
            ${v.clinical_notes ? `<br><strong>Catatan Dokter:</strong> <em>"${escapeHtml(v.clinical_notes)}"</em>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
      <h4 style="margin:0">Rekam Medis &amp; Hasil Prediksi Pasien: ${escapeHtml(patient.name || 'Pasien')}</h4>
      ${statusBadgeHtml}
    </div>

    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Prediksi Klinis AI</div>
          <div class="stat-val ${riskClass}" style="font-size:13.5px">${escapeHtml(pred.diagnosis_label || (isPos ? 'Alzheimer Detected' : 'Non-Alzheimer'))}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Tingkat Risiko</div>
          <div class="stat-val ${riskClass}" style="font-size:13px">${escapeHtml(pred.risk_level || (isPos ? 'Tinggi' : 'Rendah'))}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Probabilitas Alzheimer</div>
          <div class="stat-val" style="font-family:'JetBrains Mono',monospace">${prob}%</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;font-size:12.5px;margin:12px 0 8px 0;padding:10px 12px;background:var(--bg-tertiary);border-radius:8px">
        <div><strong>Nama:</strong> ${escapeHtml(patient.name || '—')}</div>
        <div><strong>Usia / JK:</strong> ${patient.age || '—'} Thn &bull; ${escapeHtml(patient.gender || '—')}</div>
        <div><strong>BMI:</strong> ${patient.bmi || '—'} kg/m² (${escapeHtml(patient.bmi_category || 'Normal')})</div>
        <div><strong>Tekanan Darah:</strong> ${patient.systolic_bp || 120}/${patient.diastolic_bp || 80} mmHg</div>
      </div>

      <div style="margin-top:10px">
        <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:6px">Penilaian Kognitif Utama</div>
        <div class="biomarkers-grid">
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Skor MMSE</span>
            <strong class="biomarker-val">${cog.mmse ?? 24} / 30</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Skor ADL</span>
            <strong class="biomarker-val">${cog.adl ?? 7} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Functional Assessment</span>
            <strong class="biomarker-val">${cog.functional_assessment ?? 7} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Keluhan Daya Ingat</span>
            <strong class="biomarker-val" style="color:${cog.memory_complaints === 'Ada' ? 'var(--accent-red)' : 'var(--accent-green)'}">${cog.memory_complaints ?? 'Tidak'}</strong>
          </div>
        </div>
      </div>

      ${stampHtml}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="openConsultationValidationModal('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>${isValidated ? 'Perbarui Validasi Medis' : 'Validasi Konsultasi Pasien'}</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="openNakesDetailModal('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>Lihat 32 Biomarker Lengkap</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="reEvaluatePatientConsultation('${escapeHtml(nakesCode)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Uji Ulang Prediksi</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="printConsultationDoc()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Cetak Resume Medis</span>
        </button>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: ['/periksa', '/dokumen', '/eval', '/help']
  });
}
window.renderPatientClinicalReviewCard = renderPatientClinicalReviewCard;
