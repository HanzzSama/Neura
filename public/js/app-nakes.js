/**
 * public/js/app-nakes.js
 * ======================
 * Coordinator module for Role: Nakes (Tenaga Kesehatan).
 * Aggregates Nakes Auth, Patient Lookup, Clinical Validation, and Dossier workflows.
 */

window.NeuraNakes = {
  // Auth
  getSession: () => typeof getNakesSession === 'function' ? getNakesSession() : null,
  isLoggedIn: () => typeof isNakesLoggedIn === 'function' ? isNakesLoggedIn() : false,

  // Patient Context
  getActivePatient: () => typeof getActivePatientDoc === 'function' ? getActivePatientDoc() : null,
  setActivePatient: (doc) => typeof setActivePatientDoc === 'function' ? setActivePatientDoc(doc) : null,
  clearActivePatient: () => typeof clearActivePatientDoc === 'function' ? clearActivePatientDoc() : null,

  // Lookup & Review
  lookupPatient: (code) => typeof lookupAndRenderPatientDocument === 'function' ? lookupAndRenderPatientDocument(code) : null,
  openValidationModal: (code) => typeof openConsultationValidationModal === 'function' ? openConsultationValidationModal(code) : null,

  // Dossier
  printDossier: () => typeof printPatientDossier === 'function' ? printPatientDossier() : null,
  downloadDossier: () => typeof downloadPatientDossierJson === 'function' ? downloadPatientDossierJson() : null,
};

console.log('[Neura Modular] Nakes Role Module initialized.');
