/**
 * public/js/app-user-predict.js
 * ============================
 * Role: User (Pasien)
 * Alzheimer's Disease AI Prediction Results Visualizer & Risk Meter Card.
 * Fully Aligned with datasets/modelML.rmp (32 Biomarkers, XGBoost 25 Trees, Diagnosis 0 vs 1).
 */

function renderPredictionOutput(data) {
  const isPos = data.is_positive || data.ml_label === 1 || (data.predicted_class && data.predicted_class.includes("Alzheimer"));
  const mlLabelBadge = data.ml_label_badge || (isPos ? "Diagnosis = 1" : "Diagnosis = 0");
  const mlLabelName = data.ml_label_name || (isPos ? "Diagnosis = 1 (Alzheimer's Disease Detected)" : "Diagnosis = 0 (Non-Alzheimer's / Negative)");
  const riskClass = isPos ? "val-err" : "val-good";
  const riskLevel = data.risk_level || (isPos ? "High Risk (Positive)" : "Low Risk (Negative)");
  
  const prob1 = parseFloat(data.probability_1 !== undefined ? data.probability_1 : (data.probability !== undefined ? data.probability : 50.0));
  const prob0 = parseFloat(data.probability_0 !== undefined ? data.probability_0 : (100.0 - prob1));
  const prob1Display = isNaN(prob1) ? '50.00' : prob1.toFixed(2);
  const prob0Display = isNaN(prob0) ? '50.00' : prob0.toFixed(2);
  
  const calc = data.calculation_details || {};
  const zScore = calc.raw_logit_z !== undefined ? calc.raw_logit_z : 0.0;
  const baseMargin = calc.base_margin !== undefined ? calc.base_margin : 0.0;
  const sumTrees = calc.sum_tree_weights !== undefined ? calc.sum_tree_weights : 0.0;
  const numTrees = calc.num_trees || 25;
  const posDrivers = calc.top_positive_drivers || [];
  const protDrivers = calc.top_protective_drivers || [];

  const sym = data.symptom_summary || {};
  const symItems = sym.items || {};
  const symActive = sym.active_count !== undefined ? sym.active_count : 0;
  const symTotal = sym.total_count || 7;
  const symAlert = sym.has_cognitive_alert || symActive >= 2;

  const markers = data.key_markers || {};
  const isUserProfile = data.source === 'user_profile';
  const patientDisplayName = data.patient_name || (isUserProfile ? 'Data Diri Pasien' : `Pasien #${data.patient_id}`);

  const badgeHtml = isUserProfile
    ? `<span class="neura-badge neura-badge--success" style="display:inline-flex;align-items:center;gap:5px;font-size:11px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        Data Diri Pasien Riil (32 Biomarker)
      </span>`
    : `<span class="neura-badge neura-badge--purple" style="display:inline-flex;align-items:center;gap:5px;font-size:11px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        Simulasi Dataset Alzheimer (2.149 Data)
      </span>`;

  const titleText = isUserProfile
    ? `Hasil Skrining XGBoost: ${escapeHtml(patientDisplayName)}`
    : `Simulasi Model XGBoost: ${escapeHtml(String(patientDisplayName))}`;

  // Build 7 Cognitive Symptoms Checklist HTML
  let symptomsListHtml = '';
  const symptomsOrder = [
    { key: 'MemoryComplaints', label: 'Keluhan Memori / Sering Lupa' },
    { key: 'BehavioralProblems', label: 'Gangguan Perilaku / Emosi' },
    { key: 'Confusion', label: 'Kebingungan Mental' },
    { key: 'Disorientation', label: 'Disorientasi Waktu & Tempat' },
    { key: 'PersonalityChanges', label: 'Perubahan Kepribadian' },
    { key: 'DifficultyCompletingTasks', label: 'Sulit Menyelesaikan Tugas' },
    { key: 'Forgetfulness', label: 'Sering Lupa Menaruh Barang' }
  ];

  symptomsListHtml = symptomsOrder.map(s => {
    const itemData = symItems[s.key] || {};
    const isReported = itemData.val === 1;
    const badgeColor = isReported ? 'var(--accent-red, #EF4444)' : 'var(--accent-green, #10B981)';
    const badgeBg = isReported ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.10)';
    const badgeBorder = isReported ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)';
    const icon = isReported ? '⚠️' : '✓';
    const statusText = isReported ? 'Terindikasi' : 'Negatif';

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--bg-tertiary);border-radius:6px;font-size:12px;border:1px solid var(--border-subtle)">
        <span style="color:var(--text-primary);font-weight:500">${escapeHtml(s.label)}</span>
        <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${badgeBg};color:${badgeColor};border:1px solid ${badgeBorder};white-space:nowrap">
          ${icon} ${statusText}
        </span>
      </div>
    `;
  }).join('');

  // Top Feature Drivers HTML
  const posDriversHtml = posDrivers.length > 0 ? posDrivers.map(d => `
    <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0;border-bottom:1px dashed var(--border-subtle)">
      <span style="color:var(--text-secondary)">${escapeHtml(d.feature)}</span>
      <strong style="color:var(--accent-red);font-family:'JetBrains Mono',monospace">+${d.impact}</strong>
    </div>
  `).join('') : '<div style="font-size:11.5px;color:var(--text-muted)">Tidak ada pendorong risiko dominan.</div>';

  const protDriversHtml = protDrivers.length > 0 ? protDrivers.map(d => `
    <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0;border-bottom:1px dashed var(--border-subtle)">
      <span style="color:var(--text-secondary)">${escapeHtml(d.feature)}</span>
      <strong style="color:var(--accent-green);font-family:'JetBrains Mono',monospace">${d.impact}</strong>
    </div>
  `).join('') : '<div style="font-size:11.5px;color:var(--text-muted)">Semua faktor dalam ambang netral.</div>';

  const bmiText = markers.BMI ? `BMI: ${markers.BMI}` : '';
  const bpText = (markers.SystolicBP && markers.DiastolicBP) ? `TD: ${markers.SystolicBP}/${markers.DiastolicBP} mmHg` : '';
  const vitalsText = [bmiText, bpText].filter(Boolean).join(' &bull; ');

  const suggestions = isUserProfile
    ? ['/dokumen', 'Ubah data diri', 'Bagaimana cara mencegah Alzheimer?', 'Simulasikan pasien dataset /predict dataset']
    : ['/dokumen', 'Jalankan prediksi pada Data Diri saya', '/predict dataset', 'Konsultasi'];

  const html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px;">
      <h4 class="neura-title-mid" style="margin:0">${titleText}</h4>
      ${badgeHtml}
    </div>
    
    <div class="neura-card claude-card" style="position:relative;overflow:hidden">
      
      <!-- ModelML Architecture Badge Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;margin-bottom:12px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;gap:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${isPos ? 'var(--accent-red, #EF4444)' : 'var(--accent-green, #10B981)'}"></span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em">
            Spesifikasi Model: XGBoost Tree Booster (${numTrees} Rounds &bull; 10-Fold CV modelML.rmp)
          </span>
        </div>
        <span class="neura-badge ${isPos ? 'neura-badge--warning' : 'neura-badge--success'}" style="font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.04em">
          LABEL RESMI ML: ${escapeHtml(mlLabelBadge)}
        </span>
      </div>

      <!-- Main Decision Stat Grid -->
      <div class="neura-stat-grid claude-stats-grid">
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Label Machine Learning</div>
          <div class="neura-stat-val stat-val ${riskClass}" style="font-size:13.5px;font-weight:700">
            ${escapeHtml(mlLabelName)}
          </div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Tingkat Risiko Klinis</div>
          <div class="neura-stat-val stat-val ${riskClass}" style="font-size:13px">${escapeHtml(riskLevel)}</div>
        </div>
        <div class="neura-stat-pill stat-pill">
          <div class="neura-stat-label stat-label">Probabilitas Positif P(1)</div>
          <div class="neura-stat-val stat-val" style="font-family:'JetBrains Mono',monospace">${prob1Display}%</div>
        </div>
      </div>

      <!-- Dual Probability Distribution Progress Bar -->
      <div style="margin:16px 0 14px;padding:12px 14px;background:var(--bg-tertiary);border-radius:8px;border:1px solid var(--border-subtle)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px">
          <span style="color:var(--accent-green);font-weight:600">P(Diagnosis = 0 / Negatif): <strong>${prob0Display}%</strong></span>
          <span style="font-size:11px;color:var(--text-muted);font-style:italic">Threshold Keputusan: 50.0%</span>
          <span style="color:var(--accent-red);font-weight:600">P(Diagnosis = 1 / Positif): <strong>${prob1Display}%</strong></span>
        </div>
        <div style="height:10px;background:rgba(16, 185, 129, 0.25);border-radius:5px;overflow:hidden;position:relative;display:flex">
          <div style="height:100%;width:${prob0}%;background:var(--accent-green);transition:width 0.4s ease"></div>
          <div style="height:100%;width:${prob1}%;background:var(--accent-red);transition:width 0.4s ease"></div>
        </div>
      </div>

      <!-- Transparent XGBoost Mathematical Calculation Box -->
      <div style="margin-top:14px;padding:12px 14px;background:var(--bg-tertiary);border-radius:8px;border:1px solid rgba(224, 122, 95, 0.25)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11.5px;font-weight:700;text-transform:uppercase;color:var(--accent-terracotta);letter-spacing:0.06em;display:flex;align-items:center;gap:6px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Hasil Kalkulasi Transparan XGBoost (Logit &amp; Sigmoid)
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-muted)">
            z = ${zScore >= 0 ? '+' : ''}${zScore.toFixed(4)}
          </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;font-size:12px;margin-bottom:10px">
          <div style="padding:6px 8px;background:var(--bg-surface);border-radius:5px;border:1px solid var(--border-subtle)">
            <span style="font-size:10px;color:var(--text-muted);display:block">Base Margin (b₀)</span>
            <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-primary)">${baseMargin.toFixed(4)}</strong>
          </div>
          <div style="padding:6px 8px;background:var(--bg-surface);border-radius:5px;border:1px solid var(--border-subtle)">
            <span style="font-size:10px;color:var(--text-muted);display:block">Sum Tree Weights (Σw)</span>
            <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-primary)">${sumTrees >= 0 ? '+' : ''}${sumTrees.toFixed(4)}</strong>
          </div>
          <div style="padding:6px 8px;background:var(--bg-surface);border-radius:5px;border:1px solid var(--border-subtle)">
            <span style="font-size:10px;color:var(--text-muted);display:block">Raw Logit Score (z)</span>
            <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;color:${zScore > 0 ? 'var(--accent-red)' : 'var(--accent-green)'}">${zScore >= 0 ? '+' : ''}${zScore.toFixed(4)}</strong>
          </div>
          <div style="padding:6px 8px;background:var(--bg-surface);border-radius:5px;border:1px solid var(--border-subtle)">
            <span style="font-size:10px;color:var(--text-muted);display:block">Sigmoid σ(z)</span>
            <strong style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent-terracotta)">${prob1Display}%</strong>
          </div>
        </div>

        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-secondary);background:var(--bg-surface);padding:8px 10px;border-radius:6px;border:1px solid var(--border-subtle);line-height:1.5;margin-bottom:10px">
          <div><strong>1. Persamaan Logit:</strong> z = b₀ + Σw = ${baseMargin.toFixed(4)} + (${sumTrees.toFixed(4)}) = ${zScore.toFixed(4)}</div>
          <div><strong>2. Fungsi Sigmoid:</strong> P(Diagnosis=1) = 1 / (1 + e^-(z)) = 1 / (1 + e^-(${zScore.toFixed(4)})) = ${(prob1/100).toFixed(4)} (${prob1Display}%)</div>
          <div><strong>3. Keputusan Label:</strong> ${prob1 >= 50.0 ? 'P(1) ≥ 0.50 ➔ Label: 1 (Positif Alzheimer)' : 'P(1) &lt; 0.50 ➔ Label: 0 (Negatif / Normal)'}</div>
        </div>

        <!-- Drivers Breakdown -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--accent-red);display:block;margin-bottom:4px">▲ Faktor Pendorong Risiko:</span>
            ${posDriversHtml}
          </div>
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--accent-green);display:block;margin-bottom:4px">▼ Faktor Pelindung / Penurun:</span>
            ${protDriversHtml}
          </div>
        </div>

        ${data.rapidminer_tree && data.rapidminer_tree.rule_path ? `
        <!-- RapidMiner modelML.rmp Decision Tree Comparison (implementations.txt) -->
        <div style="margin-top:12px;padding:8px 12px;background:rgba(217,119,87,0.06);border:1px solid rgba(217,119,87,0.25);border-radius:6px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;font-weight:700;color:var(--neura-accent,#d97757)">🌿 RapidMiner Decision Tree (modelML.rmp):</span>
            <span style="font-size:11px;font-weight:600;color:var(--text-secondary)">Keyakinan Daun: ${data.rapidminer_tree.confidence}% &bull; ${data.rapidminer_tree.label}</span>
          </div>
          <code style="font-size:10.5px;color:var(--text-primary);display:block;word-break:break-word;font-family:'JetBrains Mono',monospace;line-height:1.4">${data.rapidminer_tree.rule_path}</code>
          ${data.consensus ? `
          <div style="font-size:10px;margin-top:4px;color:${data.consensus.agreement ? 'var(--accent-green)' : 'var(--accent-red)'}">
            ✓ ${data.consensus.status}
          </div>` : ''}
        </div>` : ''}
      </div>

      <!-- 7 Gejala Kognitif Spesifik Section -->
      <div style="margin-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="neura-title-micro" style="margin:0">Analisis 7 Gejala Kognitif Inti (Feature Set XGBoost)</div>
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;background:${symAlert ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'};color:${symAlert ? 'var(--accent-red)' : 'var(--accent-green)'}">
            ${symActive} dari ${symTotal} Gejala Terindikasi
          </span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:6px">
          ${symptomsListHtml}
        </div>
      </div>

      <!-- Cognitive Scores & Biomarkers Grid -->
      <div style="margin-top:14px">
        <div class="neura-title-micro" style="margin-bottom:8px">Uji Kognitif Baku &amp; Biomarker Klinis</div>
        <div class="biomarkers-grid">
          <div class="biomarker-cell">
            <span class="biomarker-lbl">MMSE Score</span>
            <strong class="biomarker-val" style="color:${(markers.MMSE || 24.5) < 24 ? 'var(--accent-red)' : 'var(--accent-green)'}">
              ${markers.MMSE ?? 24.5} / 30
            </strong>
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
            <span class="biomarker-lbl">Demografi Pasien</span>
            <strong class="biomarker-val">${markers.Age ?? 73} thn &bull; ${markers.Gender ?? 'Male'}</strong>
          </div>
          ${vitalsText ? `
          <div class="biomarker-cell">
            <span class="biomarker-lbl">Vitals &amp; Fisik</span>
            <strong class="biomarker-val">${vitalsText}</strong>
          </div>` : ''}
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-subtle)">
        <button type="button" class="claude-btn primary" onclick="submitCommand('/dokumen')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          <span>Cetak Dokumen Rekam Medis (/dokumen)</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/profile')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span>Ubah Data Diri Pasien</span>
        </button>
        <button type="button" class="claude-btn secondary" onclick="submitCommand('/predict dataset')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Simulasi Sampel Dataset</span>
        </button>
      </div>

    </div>
  `;

  if (typeof appendBotMessage === 'function') {
    appendBotMessage(html, {
      stream: false,
      suggestions: suggestions
    });
  }
  return html;
}
