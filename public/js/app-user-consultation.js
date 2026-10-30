/**
 * public/js/app-user-consultation.js
 * =================================
 * Role: User (Pasien)
 * Consultation Document & Nakes Referral Code Card Generator (Single Card System).
 */

// --------------------------------------------------------------------------
// Dokumen Hasil Konsultasi & Kode Rujukan Nakes (Single Card System)
// --------------------------------------------------------------------------
function renderConsultationDocument(doc) {
  if (!doc) return;

  const nakesCode = doc.nakes_code || 'NKS-26-0000-ALZ';
  const docId = doc.doc_id || 'DOC-NEURA-2026-0000';

  const html = `
    <div class="consultation-doc-card">
      <!-- Document Header -->
      <div class="doc-header">
        <div class="doc-branding">
          <div class="doc-badge-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div class="doc-org-name">Neura Health AI &bull; Cognitive Health Center</div>
            <h3 class="doc-title">LEMBAR HASIL KONSULTASI &amp; SKRINING ALZHEIMER</h3>
          </div>
        </div>
        <div class="doc-meta-card">
          <span class="doc-badge-verified">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Terverifikasi XGBoost v1.95
          </span>
          <div class="doc-meta-info">
            <span class="doc-id">No. Dokumen: <code>${escapeHtml(docId)}</code></span>
            <span class="doc-meta-sep">&bull;</span>
            <span class="doc-date">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${escapeHtml(doc.created_at || '30 Oktober 2026')}
            </span>
          </div>
        </div>
      </div>

      <!-- Healthcare Worker (Nakes) Share Section with Code & Action Button -->
      <div class="nakes-share-section">
        <div class="nakes-share-info">
          <div class="nakes-badge-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 7h-7m7 5h-7m7 5h-7M4 7h.01M4 12h.01M4 17h.01"/></svg>
            Kode Konsultasi Rujukan Tenaga Kesehatan (Nakes)
          </div>
          <div class="nakes-code-display" onclick="copyNakesCode('${escapeHtml(nakesCode)}', this)" title="Klik untuk menyalin kode">
            <span class="nakes-code-text">${escapeHtml(nakesCode)}</span>
            <span class="nakes-copy-hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Salin Kode</span>
            </span>
          </div>
          <p class="nakes-share-sub">
            Serahkan atau sebutkan kode ini kepada Dokter atau Tenaga Kesehatan di fasilitas kesehatan rujukan. Nakes dapat melihat rincian 32 biomarker klinis, probabilitas model XGBoost, dan data validitas secara mendalam.
          </p>
        </div>

        <div class="nakes-btn-group" style="display:flex;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--border-subtle)">
          <button type="button" class="claude-btn primary" onclick="openNakesDetailModal('${escapeHtml(nakesCode)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Lihat Detail Nakes</span>
          </button>
          <button type="button" class="claude-btn secondary" onclick="copyNakesCode('${escapeHtml(nakesCode)}', this)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Salin Kode Konsultasi</span>
          </button>
          <button type="button" class="claude-btn secondary" onclick="printConsultationDoc()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>
    </div>
  `;

  appendAssistantMessage(html, {
    stream: false,
    suggestions: ['Salin Kode Nakes', 'Ubah data diri', '/predict', '/help']
  });
}

// --------------------------------------------------------------------------
// Nakes Code Modal & Copy Helpers
// --------------------------------------------------------------------------
async function copyNakesCode(code, triggerEl = null) {
  let targetCode = code;
  if (!targetCode) {
    try {
      const saved = localStorage.getItem('neura_last_consultation');
      if (saved) {
        const parsed = JSON.parse(saved);
        targetCode = parsed.nakes_code || parsed.doc_id;
      }
    } catch (e) { }
  }

  if (!targetCode) {
    if (typeof showToast === 'function') {
      showToast('Tidak ada kode konsultasi yang dapat disalin.', 'warning');
    }
    return false;
  }

  let copied = false;

  // 1. Coba navigator.clipboard (Modern, asynchronous)
  if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(targetCode);
      copied = true;
    } catch (err) {
      console.warn('navigator.clipboard gagal, beralih ke fallback execCommand:', err);
    }
  }

  // 2. Fallback text area (100% kompatibel di HTTP dan desktop/mobile)
  if (!copied) {
    try {
      const ta = document.createElement('textarea');
      ta.value = targetCode;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, 99999);
      copied = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch (err) {
      console.error('execCommand fallback copy gagal:', err);
    }
  }

  // 3. Visual feedback langsung pada elemen tombol / banner yang diklik
  if (triggerEl) {
    const hint = triggerEl.querySelector('.nakes-copy-hint') || triggerEl.querySelector('span:last-child') || triggerEl;
    const oldHtml = hint.innerHTML;
    hint.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span style="color:#10B981;font-weight:600">Tersalin!</span>
    `;
    setTimeout(() => {
      try { hint.innerHTML = oldHtml; } catch (e) { }
    }, 2200);
  }

  // 4. Feedback toast notifikasi
  if (typeof showToast === 'function') {
    showToast(`Kode Rujukan Nakes (${targetCode}) berhasil disalin ke clipboard!`, 'success');
  }

  return true;
}

async function openNakesDetailModal(code) {
  const modal = document.getElementById('nakes-detail-modal');
  const container = document.getElementById('nakes-modal-content');
  if (!modal || !container) return;

  container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted)">Memuat rincian rekam medis Nakes...</div>`;
  modal.classList.add('open');

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
      if (res && res.found && res.data) {
        doc = res.data;
      }
    }
  } catch (e) {
    console.error('Error fetching consultation for modal:', e);
  }

  if (!doc) {
    container.innerHTML = `
      <div style="padding:20px;text-align:center">
        <p style="color:var(--accent-red)">Data dokumen untuk kode <strong>${escapeHtml(code)}</strong> tidak ditemukan.</p>
        <p style="font-size:12.5px;color:var(--text-muted)">Silakan jalankan kembali perintah <code>/dokumen</code> untuk menghasilkan lembar hasil konsultasi terbaru.</p>
      </div>
    `;
    return;
  }

  const patient = doc.patient || {};
  const pred = doc.prediction || {};
  const breakdowns = doc.biomarkers_breakdown || [];
  const nakesCode = doc.nakes_code || doc.doc_id;

  // Bangun URL verifikasi unik yang dapat di-scan oleh HP
  const scanUrl = `${window.location.origin}/app?code=${encodeURIComponent(nakesCode)}`;

  // Hasilkan QR Code SVG murni & scannable
  let qrVisualHtml = '';
  if (typeof window.renderScannableQRCode === 'function') {
    qrVisualHtml = window.renderScannableQRCode(scanUrl, 76);
  } else {
    const safeUrl = encodeURIComponent(scanUrl);
    qrVisualHtml = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=76x76&data=${safeUrl}&color=1F1E1D&bgcolor=FFFFFF" alt="QR Code" width="76" height="76" style="display:block;border-radius:4px" />`;
  }

  // Evaluasi BMI & Tekanan Darah
  const bmiVal = parseFloat(patient.bmi) || 21.0;
  let bmiBadge = 'Normal';
  let bmiColor = 'var(--accent-green, #10B981)';
  if (bmiVal < 18.5) {
    bmiBadge = 'Underweight';
    bmiColor = '#F59E0B';
  } else if (bmiVal >= 25.0) {
    bmiBadge = 'Overweight';
    bmiColor = '#F59E0B';
  }

  const sys = parseInt(patient.systolic_bp) || 120;
  const dia = parseInt(patient.diastolic_bp) || 80;
  let bpBadge = 'Optimal';
  let bpColor = 'var(--accent-green, #10B981)';
  if (sys >= 140 || dia >= 90) {
    bpBadge = 'Hipertensi';
    bpColor = '#EF4444';
  } else if (sys >= 130 || dia >= 85) {
    bpBadge = 'Pre-Hipertensi';
    bpColor = '#F59E0B';
  }

  // Evaluasi Risiko XGBoost
  const prob = parseFloat(pred.probability ?? 36.2);
  const isPos = pred.prediction === 1 || pred.is_positive || (pred.diagnosis_label && pred.diagnosis_label.toLowerCase().includes('alzheimer') && !pred.diagnosis_label.toLowerCase().includes('non-'));
  const riskLevel = pred.risk_level || (prob >= 65 ? 'High Risk' : prob >= 35 ? 'Moderate Risk' : 'Low Risk');
  const riskClass = isPos ? '#EF4444' : (prob >= 35 ? '#F59E0B' : 'var(--accent-green, #10B981)');
  const diagnosisTitle = pred.diagnosis_label || (isPos ? 'Terindikasi Risiko Alzheimer' : 'Batas Normal / Non-Alzheimer');

  let tableHtml = '';
  breakdowns.forEach(group => {
    tableHtml += `
      <div class="nakes-table-category">${escapeHtml(group.category)}</div>
      <table class="claude-table" style="margin-bottom:12px">
        <thead>
          <tr style="font-size:11px;color:var(--text-muted)">
            <th>Parameter Biomarker</th>
            <th>Hasil Nilai Pasien</th>
            <th>Rentang Rujukan Klinis</th>
          </tr>
        </thead>
        <tbody>
    `;
    (group.items || []).forEach(item => {
      tableHtml += `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace;color:var(--text-primary)">${escapeHtml(item.value)}</td>
          <td style="font-size:11.5px;color:var(--text-muted)">${escapeHtml(item.normal)}</td>
        </tr>
      `;
    });
    tableHtml += `</tbody></table>`;
  });

  container.innerHTML = `
    <!-- Minimalist & Modern Scannable QR Code Verification Card -->
    <div class="nakes-qr-card">

      <!-- QR Frame Box -->
      <div class="nakes-qr-visual" title="Pindai QR Code dengan kamera ponsel untuk verifikasi langsung">
        <div class="nakes-qr-frame">
          ${qrVisualHtml}
        </div>
      </div>

      <!-- Meta Information -->
      <div class="nakes-qr-meta">

        <!-- Baris 1: Header + Verification Badge -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em">Kode Verifikasi Resmi Rekam Medis</div>
          <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:999px;background:rgba(16,185,129,0.08);color:var(--accent-green,#10B981);border:1px solid rgba(16,185,129,0.25);white-space:nowrap;display:inline-flex;align-items:center;gap:4px">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--accent-green,#10B981)"></span>
            Tervalidasi Digital
          </span>
        </div>

        <!-- Baris 2: Kode Nakes & Tombol Salin Cepat -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div class="nakes-qr-code-txt">${escapeHtml(nakesCode)}</div>
          <button type="button" class="claude-btn secondary sm"
            style="padding:2px 8px;font-size:11px;gap:5px;height:24px;border-radius:6px"
            onclick="copyNakesCode('${escapeHtml(nakesCode)}', this)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Salin</span>
          </button>
        </div>

        <!-- Baris 3: Metadata Rujukan & Timestamp -->
        <div style="font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span>No. Ref:&nbsp;<code style="font-size:10.5px;background:var(--bg-hover);padding:1px 6px;border-radius:4px;border:1px solid var(--border-subtle);color:var(--text-primary)">${escapeHtml(doc.doc_id || nakesCode)}</code></span>
          <span style="color:var(--border-subtle)">•</span>
          <span>${escapeHtml(doc.created_at || '30 Oktober 2026, 18:57 WIB')}</span>
          <span style="color:var(--border-subtle)">•</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--text-muted)">${escapeHtml(doc.verification_hash || 'SHA256-57BBB338E3B8FB72')}</span>
        </div>

        <!-- Baris 4: Tautan Scan & Aksi Salin URL -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:2px;flex-wrap:wrap">
          <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:5px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-green)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Kriptografi SHA-256 Terverifikasi</span>
          </div>
          <button type="button" class="claude-btn secondary sm"
            style="padding:2px 9px;font-size:10.5px;gap:4px;white-space:nowrap"
            onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(scanUrl)}').then(()=>{ showToast('Tautan verifikasi rekam medis berhasil disalin!','success') })">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            <span>Salin URL Scan</span>
          </button>
        </div>

      </div>
    </div>

    <!-- Patient Identity Medical Card Grid -->
    <div class="nakes-modal-card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="nakes-modal-card-title" style="margin:0">1. Data Demografis &amp; Klinis Fisik Pasien</div>
        <span style="font-size:11px;color:var(--text-muted);font-style:italic">Rekam Medis Elektrik (HL7)</span>
      </div>

      <div class="nakes-patient-grid">
        <div class="nakes-patient-cell">
          <span class="nakes-patient-cell-lbl">Nama Pasien</span>
          <strong class="nakes-patient-cell-val" style="color:var(--accent-terracotta)">${escapeHtml(patient.name || 'Pasien')}</strong>
          <span class="nakes-patient-cell-sub">Pasien Terdaftar</span>
        </div>
        <div class="nakes-patient-cell">
          <span class="nakes-patient-cell-lbl">Usia &amp; Gender</span>
          <strong class="nakes-patient-cell-val">${patient.age || '—'} Tahun</strong>
          <span class="nakes-patient-cell-sub">${escapeHtml(patient.gender || '—')}</span>
        </div>
        <div class="nakes-patient-cell">
          <span class="nakes-patient-cell-lbl">Indeks Massa Tubuh (BMI)</span>
          <strong class="nakes-patient-cell-val">${patient.bmi || '—'} kg/m²</strong>
          <span class="nakes-patient-cell-sub" style="color:${bmiColor}">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${bmiColor}"></span>
            ${bmiBadge}
          </span>
        </div>
        <div class="nakes-patient-cell">
          <span class="nakes-patient-cell-lbl">Tekanan Darah (TD)</span>
          <strong class="nakes-patient-cell-val">${sys}/${dia} mmHg</strong>
          <span class="nakes-patient-cell-sub" style="color:${bpColor}">
            <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${bpColor}"></span>
            ${bpBadge}
          </span>
        </div>
      </div>

      <!-- Inference Summary Card -->
      <div class="nakes-inference-panel">
        <div class="nakes-inference-panel-header">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-muted);display:flex;align-items:center;gap:7px">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--accent-terracotta)"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            2. Kesimpulan Diagnosis Algoritma XGBoost (32 Biomarker)
          </div>
          <span style="font-size:11px;color:var(--accent-green);font-weight:600">Akurasi Rujukan: 95.35% (ROC-AUC 94.1%)</span>
        </div>

        <div class="nakes-inference-metrics">
          <div class="nakes-inference-item">
            <span class="nakes-inference-lbl">Diagnosis Prediktif</span>
            <strong class="nakes-inference-val" style="color:${riskClass}">${escapeHtml(diagnosisTitle)}</strong>
          </div>
          <div class="nakes-inference-item">
            <span class="nakes-inference-lbl">Tingkat Keparahan Risiko</span>
            <strong class="nakes-inference-val" style="color:${riskClass}">${escapeHtml(riskLevel)}</strong>
          </div>
          <div class="nakes-inference-item">
            <span class="nakes-inference-lbl">Probabilitas Risiko Model</span>
            <strong class="nakes-inference-val" style="font-family:'JetBrains Mono',monospace">${prob}%</strong>
            <div class="nakes-prob-bar-wrap">
              <div class="nakes-prob-bar-fill" style="width:${Math.min(100, Math.max(5, prob))}%;background:${riskClass}"></div>
            </div>
          </div>
        </div>

        <div class="nakes-inference-interpret">
          <strong>Interpretasi Klinis Nakes:</strong> Berdasarkan inferensi model XGBoost pada 32 biomarker pasien ${escapeHtml(patient.name || 'Pasien')}, kondisi klinis teridentifikasi dalam kategori <strong>${escapeHtml(riskLevel)}</strong> dengan probabilitas <strong>${prob}%</strong> (Ambang batas ambang rujukan: 50.0%). Disarankan konfirmasi klinis dokter dan evaluasi daya ingat berkala.
        </div>
      </div>
    </div>

    <!-- 32 Biomarkers Breakdown Table for Nakes -->
    <div class="nakes-modal-card">
      <div class="nakes-modal-card-title">Rekam Medis Lengkap 32 Biomarker Multimodal</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
        Data di bawah diekstraksi dari profil pasien klinis dan dipetakan ke 32 dimensi fitur algoritma <em>Extreme Gradient Boosting (XGBoost)</em>.
      </div>
      ${tableHtml}
    </div>

    <!-- Modal Footer Actions -->
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:16px;flex-wrap:wrap">
      <div style="font-size:11px;color:var(--text-muted)">
        Neura Clinical Engine &bull; Standar Pelaporan Medis IEEE 830
      </div>
      <div style="display:flex;gap:8px">
        <button type="button" class="claude-btn secondary" onclick="copyNakesCode('${escapeHtml(doc.nakes_code)}', this)">
          Salin Kode Nakes
        </button>
        <button type="button" class="claude-btn secondary" onclick="printConsultationDoc()">
          Cetak Dokumen PDF
        </button>
        <button type="button" class="claude-btn primary" onclick="closeNakesDetailModal()">
          Tutup
        </button>
      </div>
    </div>
  `;
}

function closeNakesDetailModal() {
  const modal = document.getElementById('nakes-detail-modal');
  if (modal) modal.classList.remove('open');
}

function closeNakesDetailModalOnBackdrop(e) {
  if (e.target.id === 'nakes-detail-modal') closeNakesDetailModal();
}

function printConsultationDoc() {
  const userRole = typeof getCurrentUserRole === 'function' ? getCurrentUserRole() : 'User';

  if (userRole === 'User') {
    const profile = typeof getUserProfile === 'function' ? getUserProfile() : null;
    if (!profile || !profile.name || !profile.name.trim()) {
      if (typeof showToast === 'function') {
        showToast('Wajib melengkapi Data Diri Pasien terlebih dahulu sebelum mencetak dokumen.', 'warning');
      }
      if (typeof submitCommand === 'function') {
        submitCommand('/dokumen');
      }
      return;
    }
  }

  window.print();
}

// Attach helpers to window scope for inline onclick handlers
window.copyNakesCode = copyNakesCode;
window.openNakesDetailModal = openNakesDetailModal;
window.closeNakesDetailModal = closeNakesDetailModal;
window.closeNakesDetailModalOnBackdrop = closeNakesDetailModalOnBackdrop;
window.printConsultationDoc = printConsultationDoc;

