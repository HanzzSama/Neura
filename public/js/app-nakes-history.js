/**
 * public/js/app-nakes-history.js
 * ==============================
 * Role: Nakes (Tenaga Kesehatan)
 * Log & Riwayat Validasi Dokumen Pasien oleh Tenaga Medis.
 */

const NAKES_VALIDATION_HISTORY_KEY = 'neura_nakes_validation_history_v1';

function getNakesValidationHistory() {
  try {
    const raw = localStorage.getItem(NAKES_VALIDATION_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function recordNakesValidation(docCode, patientName, status, notes) {
  try {
    const history = getNakesValidationHistory();
    const entry = {
      code: docCode,
      patient_name: patientName,
      status: status,
      notes: notes,
      timestamp: new Date().toISOString()
    };
    history.unshift(entry);
    if (history.length > 50) history.pop();
    localStorage.setItem(NAKES_VALIDATION_HISTORY_KEY, JSON.stringify(history));
  } catch (e) { }
}

window.getNakesValidationHistory = getNakesValidationHistory;
window.recordNakesValidation = recordNakesValidation;
