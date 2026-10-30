/**
 * public/js/app-nakes-validate.js
 * ===============================
 * Role: Nakes (Tenaga Kesehatan)
 * Modal Validasi Klinis Rekam Medis & Digital Signature Nakes.
 */


async function openConsultationValidationModal(code) {
  const modal = document.getElementById('consultation-validation-modal');
  const body = document.getElementById('consultation-validation-modal-body');
  if (!modal || !body) return;

  let doc = null;
  try {
    const rawSaved = localStorage.getItem('neura_last_consultation');
    if (rawSaved) {
      const parsed = JSON.parse(rawSaved);
      if (parsed.nakes_code === code || parsed.doc_id === code || !code) {
        doc = parsed;
      }
    }
    if (!doc && code) {
      const res = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}`);
      if (res && res.found && res.data) doc = res.data;
    }
  } catch (e) { }

  if (!doc) {
    showToast('Data dokumen pasien tidak ditemukan untuk divalidasi.', 'error');
    return;
  }

  let nakesSession = null;
  try {
    const raw = localStorage.getItem('neura_nakes_session');
    if (raw) nakesSession = JSON.parse(raw);
  } catch (e) { }

  const defaultDoctor = nakesSession?.name || document.getElementById('sidebar-user-name')?.textContent || 'dr. Citra Anindita, Sp.N';
  const defaultSip = nakesSession?.sip_number || '503/SIP.DS/042/Dinkes/2023';
  const defaultInst = nakesSession?.institution || 'RSUP Dr. Sardjito Yogyakarta';

  const existingVal = doc.validation || {};
  const currentStatus = existingVal.validation_status || 'TERKONFIRMASI_KLINIS';
  const currentNotes = existingVal.clinical_notes || '';

  const patientName = doc.patient?.name || 'Pasien';
  const nakesCode = doc.nakes_code || doc.doc_id || code;

  body.innerHTML = `
    <div style="margin-bottom:14px;padding:12px;background:var(--bg-app);border:1px solid var(--border-subtle);border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Pasien yang Divalidasi</span>
          <div style="font-size:14px;font-weight:700;color:var(--text-primary)">${escapeHtml(patientName)}</div>
        </div>
        <div style="text-align:right">
          <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Kode Konsultasi</span>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--accent-terracotta)">${escapeHtml(nakesCode)}</div>
        </div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--text-secondary)">
        Inferensi AI: <strong>${escapeHtml(doc.prediction?.diagnosis_label || 'Non-Alzheimer')}</strong> (Probabilitas: ${doc.prediction?.probability || 50}%, Tingkat Risiko: ${escapeHtml(doc.prediction?.risk_level || 'Rendah')})
      </div>
    </div>

    <form id="nakes-validation-form" onsubmit="event.preventDefault();submitConsultationValidation('${escapeHtml(nakesCode)}')">
      <div class="nakes-validation-form-group">
        <label class="nakes-validation-label">Nama Tenaga Medis / Dokter Pemeriksa</label>
        <input type="text" id="val-doctor-name" class="nakes-validation-input" value="${escapeHtml(existingVal.validator_name || defaultDoctor)}" required>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="nakes-validation-form-group">
          <label class="nakes-validation-label">Nomor SIP / STR</label>
          <input type="text" id="val-doctor-sip" class="nakes-validation-input" value="${escapeHtml(existingVal.validator_sip || defaultSip)}" placeholder="Contoh: 503/SIP.DS/042/Dinkes/2023">
        </div>
        <div class="nakes-validation-form-group">
          <label class="nakes-validation-label">Fasilitas Kesehatan / RS</label>
          <input type="text" id="val-doctor-inst" class="nakes-validation-input" value="${escapeHtml(existingVal.validator_institution || defaultInst)}" placeholder="Contoh: RSUP Dr. Sardjito">
        </div>
      </div>

      <div class="nakes-validation-form-group">
        <label class="nakes-validation-label">Penetapan Status Klinis Pasien</label>
        <select id="val-status-select" class="nakes-validation-select">
          <option value="TERKONFIRMASI_KLINIS" ${currentStatus === 'TERKONFIRMASI_KLINIS' ? 'selected' : ''}>🟢 Terkonfirmasi Klinis (Diagnosis Sesuai Skrining AI)</option>
          <option value="OBSERVASI_BERKALA" ${currentStatus === 'OBSERVASI_BERKALA' ? 'selected' : ''}>🟡 Observasi Berkala (Pemeriksaan Ulang Kognitif 3–6 Bulan)</option>
          <option value="RUJUKAN_LANJUTAN" ${currentStatus === 'RUJUKAN_LANJUTAN' ? 'selected' : ''}>🔴 Rujukan Lanjutan ke Spesialis Neurologi / MoCA / MRI</option>
          <option value="DIAGNOSIS_BANDING" ${currentStatus === 'DIAGNOSIS_BANDING' ? 'selected' : ''}>⚪ Diagnosis Banding Lain (Non-Alzheimer / Gangguan Memori Reversibel)</option>
        </select>
      </div>

      <div class="nakes-validation-form-group">
        <label class="nakes-validation-label">Catatan Medis, Terapi &amp; Arahan Dokter</label>
        <textarea id="val-clinical-notes" class="nakes-validation-textarea" rows="3" placeholder="Masukkan arahan resep, modifikasi gaya hidup (MIND diet, latihan daya ingat), atau instruksi rujukan faskes...">${escapeHtml(currentNotes)}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
        <button type="button" class="claude-btn secondary" onclick="closeConsultationValidationModal()">Batal</button>
        <button type="submit" id="btn-submit-validation" class="claude-btn primary" style="display:inline-flex;align-items:center;gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Sahkan &amp; Terbitkan Validasi Medis</span>
        </button>
      </div>
    </form>
  `;

  modal.classList.add('open');
}
window.openConsultationValidationModal = openConsultationValidationModal;

function closeConsultationValidationModal() {
  const modal = document.getElementById('consultation-validation-modal');
  if (modal) modal.classList.remove('open');
}
window.closeConsultationValidationModal = closeConsultationValidationModal;

function closeConsultationValidationModalOnBackdrop(e) {
  if (e.target.id === 'consultation-validation-modal') {
    closeConsultationValidationModal();
  }
}
window.closeConsultationValidationModalOnBackdrop = closeConsultationValidationModalOnBackdrop;

async function submitConsultationValidation(code) {
  const submitBtn = document.getElementById('btn-submit-validation');
  const doctorName = document.getElementById('val-doctor-name')?.value.trim();
  const doctorSip = document.getElementById('val-doctor-sip')?.value.trim();
  const doctorInst = document.getElementById('val-doctor-inst')?.value.trim();
  const statusVal = document.getElementById('val-status-select')?.value;
  const notes = document.getElementById('val-clinical-notes')?.value.trim();

  if (!doctorName) {
    showToast('Nama dokter pemeriksa wajib diisi.', 'warning');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Menyimpan Validasi...';
  }

  const payload = {
    validator_name: doctorName,
    validator_sip: doctorSip,
    validator_institution: doctorInst,
    validation_status: statusVal,
    clinical_notes: notes
  };

  try {
    const res = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}/validate`, 'POST', payload);
    if (res && res.success && res.data) {
      localStorage.setItem('neura_last_consultation', JSON.stringify(res.data));
      if (typeof setActivePatientDoc === 'function') setActivePatientDoc(res.data);
      closeConsultationValidationModal();
      showToast(`Dokumen ${code} berhasil divalidasi oleh ${doctorName}!`, 'success');
      renderPatientClinicalReviewCard(res.data);
    } else {
      showToast(res.error || 'Gagal menyimpan validasi klinis.', 'error');
    }
  } catch (err) {
    console.error('Validation submission error:', err);
    showToast(err.message || 'Terjadi kesalahan sistem saat validasi.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Sahkan &amp; Terbitkan Validasi Medis</span>
      `;
    }
  }
}
window.submitConsultationValidation = submitConsultationValidation;

async function reEvaluatePatientConsultation(code) {
  let doc = null;
  try {
    const raw = localStorage.getItem('neura_last_consultation');
    if (raw) doc = JSON.parse(raw);
    if (!doc && code) {
      const res = await fetchJSON(`/api/consultation/${encodeURIComponent(code)}`);
      if (res && res.found) doc = res.data;
    }
  } catch (e) { }

  if (!doc) {
    showToast('Dokumen pasien tidak ditemukan untuk dievaluasi ulang.', 'error');
    return;
  }

  showToast(`Menjalankan simulasi ulang inferensi XGBoost untuk ${doc.patient?.name || 'Pasien'}...`, 'info');
  const patientData = doc.patient || {};
  const cogData = doc.cognitive_scores || {};

  const simulatePayload = {
    mode: 'user_profile',
    input: {
      name: patientData.name,
      age: patientData.age,
      gender: patientData.gender === 'Perempuan' ? 'female' : 'male',
      height: 165,
      weight: Math.round(22.5 * 1.65 * 1.65),
      systolicBP: patientData.systolic_bp,
      diastolicBP: patientData.diastolic_bp,
      mmse: cogData.mmse,
      functionalAssessment: cogData.functional_assessment,
      memoryComplaints: cogData.memory_complaints === 'Ada' ? 'yes' : 'no'
    }
  };

  const predictRes = await fetchJSON('/api/predict', 'POST', simulatePayload);
  if (predictRes && !predictRes.error) {
    renderPredictionOutput(predictRes);
  } else {
    showToast('Gagal menjalankan uji inferensi ulang.', 'error');
  }
}
window.reEvaluatePatientConsultation = reEvaluatePatientConsultation;

