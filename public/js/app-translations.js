/**
 * public/js/app-translations.js
 * ==============================
 * Bilingual Translation Dictionary & Localization System (ID / EN).
 */

const APP_TRANSLATIONS = {
  id: {
    // Sidebar nav (keys match data-i18n in index.html)
    nav_new_chat: 'Obrolan Baru',
    nav_dashboard: 'Dasbor',
    nav_recent_chats: 'Percakapan Terakhir',
    nav_ml_commands: 'Perintah ML',
    user_role: 'User',
    checking_model: 'Memeriksa model...',
    // ML command items
    cmd_status: 'Cek Status',
    cmd_profile: 'Data Diri Pasien',
    cmd_train: 'Latih 5 Epoch',
    cmd_eval: 'Evaluasi Model',
    cmd_predict: 'Jalankan Prediksi',
    cmd_dokumen: 'Dokumen Konsultasi',
    cmd_progress: 'Progress Live',
    cmd_help: 'Daftar Perintah',
    cmd_intro: 'Pengenalan Neura',
    // Greeting
    greet_morning: 'Selamat pagi',
    greet_afternoon: 'Selamat siang',
    greet_evening: 'Selamat sore',
    greet_night: 'Selamat malam',
    hero_subhead_nakes: 'Selamat datang, Tenaga Kesehatan. Akses dossier medis pasien, validasi klinis, dan inferensi XGBoost.',
    hero_subhead_user: 'Selamat datang. Saya siap membantu skrining daya ingat dan deteksi dini risiko Alzheimer Anda.',
    // Hero cards — Admin
    card_train_title: 'Latih Model XGBoost',
    card_train_desc: 'Latih gradient boosted decision trees pada dataset Alzheimer’s (2.149 data pasien)',
    card_predict_title: 'Diagnosa Alzheimer',
    card_predict_desc: 'Prediksi risiko Alzheimer dari biomarker klinis (MMSE, ADL, Memory Complaints)',
    card_eval_title: 'Evaluasi Metrik Medis',
    card_eval_desc: 'Uji performa: 95.4% Akurasi, 94.6% Precision, 92.1% Recall & 94.1% ROC-AUC',
    card_specs_title: 'Spesifikasi Model Klinis',
    card_specs_desc: 'Lihat spesifikasi XGBoost, 32 biomarker klinis, dan bobot feature importance',
    // Hero cards — Nakes
    card_nakes_lookup_title: 'Buka Berkas Pasien',
    card_nakes_lookup_desc: 'Masukkan Kode Dokumen pasien untuk menelaah rekam medis & hasil prediksi klinis',
    card_nakes_predict_title: 'Inferensi Klinis XGBoost',
    card_nakes_predict_desc: 'Jalankan prediksi Alzheimer pada data biomarker pasien aktif yang sedang diperiksa',
    card_nakes_eval_title: 'Evaluasi Klinis Pasien',
    card_nakes_eval_desc: 'Tinjau metrik model (Akurasi 95.4%, Sensitivitas, Spesifisitas, AUC-ROC)',
    card_nakes_dokumen_title: 'Validasi & Dossier Medis',
    card_nakes_dokumen_desc: 'Sahkan rekam medis elektronik, cetak dossier, dan terbitkan Kode Rujukan Nakes',
    // Hero cards — User (Pasien)
    card_user_profile_title: 'Lengkapi Data Diri',
    card_user_profile_desc: 'Isi formulir 32 Biomarker Klinis Anda agar Neura dapat melakukan skrining akurat',
    card_user_predict_title: 'Skrining Risiko Alzheimer',
    card_user_predict_desc: 'Analisis risiko kognitif Alzheimer berbasis 32 biomarker klinis data diri Anda',
    card_user_dokumen_title: 'Cetak Dokumen Konsultasi',
    card_user_dokumen_desc: 'Dapatkan lembar hasil konsultasi medis resmi dan Kode Rujukan ke Tenaga Kesehatan',
    card_user_konsul_title: 'Mulai Konsultasi',
    card_user_konsul_desc: 'Konsultasikan keluhan daya ingat, tanda Alzheimer, atau panduan caregiver lansia',
    // Input placeholder
    placeholder: 'Tanya sesuatu atau ketik / untuk perintah ML...',
    // Disclaimer
    disclaimer: 'Neura dapat membuat kesalahan. Selalu verifikasi keputusan klinis dengan profesional medis yang berkualifikasi.',
    // Model modal
    model_modal_title: 'Pilih Model AI',
    model_cancel: 'Batal',
  },
  en: {
    // Sidebar nav
    nav_new_chat: 'New Chat',
    nav_dashboard: 'Dashboard',
    nav_recent_chats: 'Recent Chats',
    nav_ml_commands: 'ML Commands',
    user_role: 'User',
    checking_model: 'Checking model...',
    // ML command items
    cmd_status: 'Check Status',
    cmd_profile: 'Patient Profile',
    cmd_train: 'Train 5 Epochs',
    cmd_eval: 'Evaluate Model',
    cmd_predict: 'Run Prediction',
    cmd_dokumen: 'Consultation Document',
    cmd_progress: 'Live Progress',
    cmd_help: 'Command List',
    cmd_intro: 'Neura Introduction',
    // Greeting
    greet_morning: 'Good morning',
    greet_afternoon: 'Good afternoon',
    greet_evening: 'Good evening',
    greet_night: 'Good night',
    hero_subhead_nakes: 'Welcome, Healthcare Professional. Access patient medical records, clinical validation, and XGBoost inference.',
    hero_subhead_user: 'Welcome. I\'m ready to assist you with memory screening and early Alzheimer\'s risk detection.',
    // Hero cards — Admin
    card_train_title: 'Train XGBoost Model',
    card_train_desc: 'Train gradient boosted decision trees on the Alzheimer\'s dataset (2,149 patient records)',
    card_predict_title: 'Run Alzheimer Diagnosis',
    card_predict_desc: 'Predict Alzheimer\'s risk from clinical biomarkers (MMSE, ADL, Memory Complaints)',
    card_eval_title: 'Evaluate Medical Metrics',
    card_eval_desc: 'Test performance: 95.4% Accuracy, 94.6% Precision, 92.1% Recall & 94.1% ROC-AUC',
    card_specs_title: 'Clinical Model Specs',
    card_specs_desc: 'View XGBoost specs, 32 clinical biomarkers, and feature importance weights',
    // Hero cards — Nakes
    card_nakes_lookup_title: 'Open Patient File',
    card_nakes_lookup_desc: 'Enter patient Document Code to review medical records & clinical prediction results',
    card_nakes_predict_title: 'XGBoost Clinical Inference',
    card_nakes_predict_desc: 'Run Alzheimer prediction on biomarker data of the active patient being examined',
    card_nakes_eval_title: 'Patient Clinical Evaluation',
    card_nakes_eval_desc: 'Review model metrics (95.4% Accuracy, Sensitivity, Specificity, AUC-ROC)',
    card_nakes_dokumen_title: 'Validate & Medical Dossier',
    card_nakes_dokumen_desc: 'Endorse electronic medical records, print dossier, and issue Nakes Referral Code',
    // Hero cards — User (Pasien)
    card_user_profile_title: 'Complete Your Profile',
    card_user_profile_desc: 'Fill in your 32 Clinical Biomarker form so Neura can perform accurate screening',
    card_user_predict_title: 'Alzheimer Risk Screening',
    card_user_predict_desc: 'Analyze your cognitive Alzheimer risk based on 32 clinical biomarkers',
    card_user_dokumen_title: 'Print Consultation Document',
    card_user_dokumen_desc: 'Get your official medical consultation summary and Nakes Referral Code',
    card_user_konsul_title: 'Start Consultation',
    card_user_konsul_desc: 'Consult about memory complaints, Alzheimer signs, or caregiver guidance for elderly',
    // Input placeholder
    placeholder: 'Ask something or type / for ML commands...',
    // Disclaimer
    disclaimer: 'Neura can make mistakes. Always verify clinical decisions with a qualified medical professional.',
    // Model modal
    model_modal_title: 'Select AI Model',
    model_cancel: 'Cancel',
  }
};

function getAppLanguage() {
  try { return localStorage.getItem('neura_lang') === 'en' ? 'en' : 'id'; } catch (e) { return 'id'; }
}

function setAppLanguage(lang, notify = false) {
  try { localStorage.setItem('neura_lang', lang); } catch (e) { }
  const t = APP_TRANSLATIONS[lang] || APP_TRANSLATIONS.id;

  // Update lang label buttons
  const labelEl = document.getElementById('app-lang-label');
  if (labelEl) labelEl.textContent = lang === 'en' ? 'EN' : 'ID';

  // Translate all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key] !== undefined) el.textContent = t[key];
  });

  // Textarea placeholder
  const textarea = document.getElementById('chat-input-textarea');
  if (textarea) textarea.placeholder = t.placeholder;

  // Model modal title & cancel btn
  const modalTitle = document.getElementById('model-modal-title');
  if (modalTitle) modalTitle.textContent = t.model_modal_title;
  const cancelBtn = document.getElementById('model-modal-cancel-btn');
  if (cancelBtn) cancelBtn.textContent = t.model_cancel;

  // Re-run greeting with new language
  if (typeof setupGreeting === 'function') {
    setupGreeting();
  }

  // Re-render hero if visible (new chat state)
  const heroEl = document.getElementById('claude-hero');
  if (heroEl) {
    const container = document.getElementById('chat-content-container');
    if (container && typeof getHeroHtml === 'function') {
      container.innerHTML = getHeroHtml();
      if (typeof setupGreeting === 'function') setupGreeting();
    }
  }

  if (notify && typeof showToast === 'function') {
    showToast(lang === 'en' ? 'Language: English' : 'Bahasa: Indonesia', 'info');
  }

  // Sync dot menu labels if open
  if (typeof syncDotMenuState === 'function') {
    syncDotMenuState();
  }
  if (typeof renderRoleMLCommands === 'function') {
    renderRoleMLCommands();
  }
}

function toggleAppLanguage() {
  const current = getAppLanguage();
  setAppLanguage(current === 'id' ? 'en' : 'id', true);
}

// Global exports
window.APP_TRANSLATIONS = APP_TRANSLATIONS;
window.getAppLanguage = getAppLanguage;
window.setAppLanguage = setAppLanguage;
window.toggleAppLanguage = toggleAppLanguage;
