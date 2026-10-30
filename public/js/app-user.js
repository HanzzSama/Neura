/**
 * public/js/app-user.js
 * =====================
 * Coordinator module for Role: User (Pasien).
 * Aggregates User Profile, Prediction, Consultation Document, and Voice Session modules.
 */

window.NeuraUser = {
  // Profile
  getProfile: () => typeof getUserProfile === 'function' ? getUserProfile() : null,
  saveProfile: (p) => typeof saveUserProfile === 'function' ? saveUserProfile(p) : null,
  renderProfileCard: (opts) => typeof renderProfileSlideCard === 'function' ? renderProfileSlideCard(opts) : null,

  // Prediction
  renderPrediction: (data) => typeof renderPredictionOutput === 'function' ? renderPredictionOutput(data) : null,

  // Consultation Document
  renderDocument: (doc) => typeof renderConsultationDocument === 'function' ? renderConsultationDocument(doc) : null,
  copyNakesCode: (code) => typeof copyNakesCode === 'function' ? copyNakesCode(code) : null,

  // History
  getHistory: () => typeof getUserScreeningHistory === 'function' ? getUserScreeningHistory() : [],
};

console.log('[Neura Modular] User Role Module initialized.');
