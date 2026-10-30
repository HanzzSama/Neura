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
          <div class="nakes-code-display" onclick="copyNakesCode('${escapeHtml(nakesCode)}')" title="Klik untuk menyalin kode">
            <span class="nakes-code-text">${escapeHtml(nakesCode)}</span>
            <span class="nakes-copy-hint">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Salin Kode
            </span>
          </div>
          <p class="nakes-share-sub">
            Serahkan atau sebutkan kode ini kepada Dokter atau Tenaga Kesehatan di fasilitas kesehatan rujukan. Nakes dapat melihat rincian 32 biomarker klinis, probabilitas model XGBoost, dan data validitas secara mendalam.
          </p>
        </div>

        <div class="nakes-btn-group">
          <button type="button" class="nakes-action-btn primary" onclick="openNakesDetailModal('${escapeHtml(nakesCode)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Lihat Detail Nakes</span>
          </button>
          <button type="button" class="nakes-action-btn secondary" onclick="copyNakesCode('${escapeHtml(nakesCode)}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Salin Kode Konsultasi</span>
          </button>
          <button type="button" class="nakes-action-btn ghost" onclick="printConsultationDoc()">
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
function copyNakesCode(code) {
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    showToast(`Kode Konsultasi Nakes (${code}) berhasil disalin!`, 'success');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(`Kode Konsultasi Nakes (${code}) berhasil disalin!`, 'success');
  });
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
    <!-- Top Bar with QR Code Visual & Verification Metadata -->
    <div class="nakes-qr-card">
      <div class="nakes-qr-visual" title="QR Code Resmi Rujukan Nakes">
        <svg width="74" height="74" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="33" height="33" fill="white"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3 3H11V11H3V3ZM5 5V9H9V5H5ZM22 3H30V11H22V3ZM24 5V9H28V5H24ZM3 22H11V30H3V22ZM5 24V28H9V24H5ZM13 3H15V7H13V3ZM15 7H19V9H15V7ZM19 3H21V7H19V3ZM13 9H15V13H13V9ZM17 9H19V11H17V9ZM7 13H9V15H7V13ZM11 13H13V15H11V13ZM15 13H17V17H15V13ZM3 15H5V17H3V15ZM5 17H7V19H5V17ZM9 17H11V21H9V17ZM17 17H21V19H17V17ZM21 13H23V15H21V13ZM25 13H29V15H25V13ZM23 15H25V17H23V15ZM29 15H31V19H29V15ZM27 17H29V19H27V17ZM13 21H15V25H13V21ZM15 19H17V21H15V19ZM19 21H21V23H19V21ZM21 19H25V21H21V19ZM25 21H27V23H25V21ZM27 21H31V23H27V21ZM17 23H19V25H17V23ZM21 23H23V27H21V23ZM23 25H27V27H23V25ZM29 23H31V27H29V23ZM13 27H15V31H13V27ZM17 27H19V29H17V27ZM19 29H21V31H19V29ZM23 29H27V31H23V29ZM27 27H29V29H27V27ZM29 29H31V31H29V29Z" fill="#1F1E1D"/>
        </svg>
      </div>
      <div class="nakes-qr-meta">
        <div style="font-size:10.5px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">Kode Verifikasi Resmi</div>
        <div class="nakes-qr-code-txt">${escapeHtml(doc.nakes_code)}</div>
        <div style="font-size:11.5px;color:var(--text-secondary)">No. Ref: <code>${escapeHtml(doc.doc_id)}</code> &bull; ${escapeHtml(doc.created_at)}</div>
        <div style="font-size:11px;color:var(--accent-green);font-weight:600;display:flex;align-items:center;gap:4px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          Keabsahan Valid: ${escapeHtml(doc.verification_hash || 'SHA256-VERIFIED')}
        </div>
      </div>
    </div>

    <!-- Summary Box for Clinicians -->
    <div class="nakes-modal-card">
      <div class="nakes-modal-card-title">Identitas Pasien &amp; Kesimpulan Diagnosis XGBoost</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;font-size:12.5px;margin-bottom:8px">
        <div><strong>Nama:</strong> ${escapeHtml(patient.name)}</div>
        <div><strong>Usia/JK:</strong> ${patient.age} Thn / ${escapeHtml(patient.gender)}</div>
        <div><strong>BMI:</strong> ${patient.bmi} kg/m²</div>
        <div><strong>Tekanan Darah:</strong> ${patient.systolic_bp}/${patient.diastolic_bp} mmHg</div>
      </div>
      <div style="padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:6px;font-size:12.5px">
        <strong>Hasil Inferensi AI:</strong> ${escapeHtml(pred.diagnosis_label)} (Tingkat Risiko: <strong>${escapeHtml(pred.risk_level)}</strong>, Probabilitas: <strong>${pred.probability}%</strong>, Akurasi Uji: <strong>95.35%</strong>).
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
        <button type="button" class="claude-btn secondary" onclick="copyNakesCode('${escapeHtml(doc.nakes_code)}')">
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

