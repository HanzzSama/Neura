/**
 * public/js/app-user-predict.js
 * ============================
 * Role: User (Pasien)
 * Alzheimer\'s Disease AI Prediction Results Visualizer & Risk Meter Card.
 */

function renderPredictionOutput(data) {
  const isPos = data.is_positive || (data.predicted_class && data.predicted_class.includes("Alzheimer"));
  const diagnosis = isPos ? "Alzheimer's Disease Detected" : "Non-Alzheimer's (Negative)";
  const riskClass = isPos ? "val-err" : "val-good";
  const riskLevel = data.risk_level || (isPos ? "High Risk (Positive)" : "Low Risk (Negative)");
  const detailedProb = localStorage.getItem('neura_detailed_prob') !== 'false';
  const rawProb = parseFloat(data.probability !== undefined ? data.probability : 50.0);
  const prob = detailedProb ? (isNaN(rawProb) ? '50.00' : rawProb.toFixed(2)) : (isNaN(rawProb) ? '50' : Math.round(rawProb));
  const markers = data.key_markers || {};
  const isUserProfile = data.source === 'user_profile';
  const patientDisplayName = data.patient_name || (isUserProfile ? 'Data Diri Pasien' : `Pasien #${data.patient_id}`);

  const badgeHtml = isUserProfile
    ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(50,205,100,0.12);color:var(--accent-green);border:1px solid rgba(50,205,100,0.28)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Data Diri Pasien Terverifikasi
      </span>`
    : `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:3px 9px;border-radius:999px;background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.28)">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Simulasi Dataset Alzheimer (2.149 Data)
      </span>`;

  const titleText = isUserProfile
    ? `Skrining Klinis: ${escapeHtml(patientDisplayName)}`
    : `Simulasi Pasien Dataset (${escapeHtml(String(patientDisplayName))})`;

  const bmiText = markers.BMI ? `BMI: ${markers.BMI}` : '';
  const bpText = (markers.SystolicBP && markers.DiastolicBP) ? `TD: ${markers.SystolicBP}/${markers.DiastolicBP} mmHg` : '';
  const vitalsText = [bmiText, bpText].filter(Boolean).join(' &bull; ');

  const suggestions = isUserProfile
    ? ['/dokumen', 'Ubah data diri', 'Bagaimana cara mencegah Alzheimer?', 'Simulasikan pasien dataset /predict dataset']
    : ['/dokumen', 'Jalankan prediksi pada Data Diri saya', '/predict dataset', 'Konsultasi'];

  appendAssistantMessage(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
      <h4 style="margin:0">${titleText}</h4>
      ${badgeHtml}
    </div>
    <div class="claude-card">
      <div class="claude-stats-grid">
        <div class="stat-pill">
          <div class="stat-label">Predicted Diagnosis</div>
          <div class="stat-val ${riskClass}" style="font-size:13.5px">${escapeHtml(diagnosis)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Risk Level</div>
          <div class="stat-val ${riskClass}" style="font-size:13px">${escapeHtml(riskLevel)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-label">Alzheimer's Probability</div>
          <div class="stat-val" style="font-family:'JetBrains Mono',monospace">${prob}%</div>
        </div>
      </div>

      <div style="margin-top:14px">
        <div style="font-size:10.5px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:8px">Primary Biomarkers &amp; Cognitive Scores</div>
        <div class="biomarkers-grid">
          <div class="biomarker-cell">
            <span class="biomarker-lbl">MMSE Score</span>
            <strong class="biomarker-val">${markers.MMSE ?? 24.5} / 30</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">ADL Score</span>
            <strong class="biomarker-val">${markers.ADL ?? 6.2} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Functional Assessment</span>
            <strong class="biomarker-val">${markers.FunctionalAssessment ?? 5.5} / 10</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Memory Complaints</span>
            <strong class="biomarker-val" style="color:${markers.MemoryComplaints === 'Yes' ? 'var(--accent-red)' : 'var(--accent-green)'}">${markers.MemoryComplaints ?? 'No'}</strong>
          </div>
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Demographics</span>
            <strong class="biomarker-val">${markers.Age ?? 73} thn &bull; ${markers.Gender ?? 'Male'}</strong>
          </div>
          ${vitalsText ? `
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Vitals &amp; Fisik</span>
            <strong class="biomarker-val">${vitalsText}</strong>
          </div>` : ''}
        </div>
      </div>
    </div>
  `, {
    stream: false,
    suggestions: suggestions
  });
}

