/**
 * Neura Alzheimer AI - Welcome Page Interactions
 * Includes neural particle simulation, bilingual support, and clinical IDE interactions.
 */

(function () {
  'use strict';



  // -------------------------------------------------------------------------
  // 2. Minimalist Announcement Banner Dismissal & Persistence
  // -------------------------------------------------------------------------
  const announcementClose = document.getElementById('announcement-close');
  const announcementBar = document.getElementById('announcement-bar');
  if (announcementClose && announcementBar) {
    if (sessionStorage.getItem('neura_announcement_dismissed') === 'true') {
      announcementBar.style.display = 'none';
    }
    announcementClose.addEventListener('click', function () {
      announcementBar.classList.add('dismissed');
      sessionStorage.setItem('neura_announcement_dismissed', 'true');
      setTimeout(() => {
        announcementBar.style.display = 'none';
      }, 350);
    });
  }

  // -------------------------------------------------------------------------
  // 2.1 Mobile Nav Drawer Toggle
  // -------------------------------------------------------------------------
  const mobileToggle = document.getElementById('nav-mobile-toggle');
  const mobileDrawer = document.getElementById('nav-mobile-drawer');
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', function () {
      mobileDrawer.classList.toggle('open');
    });
    // Close drawer when any mobile link is clicked
    mobileDrawer.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
      });
    });
  }

  // -------------------------------------------------------------------------
  // 2.2 Active Section Scroll Spy for Main Nav Links
  // -------------------------------------------------------------------------
  const navLinks = document.querySelectorAll('.nav-menu-link');
  const trackedSections = [
    { id: 'about', el: document.getElementById('about') },
    { id: 'pipeline', el: document.getElementById('pipeline') },
    { id: 'security', el: document.getElementById('security') },
    { id: 'specification', el: document.getElementById('specification') }
  ];

  window.addEventListener('scroll', function () {
    const scrollPos = window.scrollY + 140;
    let currentId = '';
    trackedSections.forEach(sec => {
      if (sec.el && sec.el.offsetTop <= scrollPos) {
        currentId = sec.id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === `#${currentId}`) {
        link.classList.add('active');
      } else if (href.startsWith('#')) {
        link.classList.remove('active');
      }
    });
  }, { passive: true });

  // -------------------------------------------------------------------------
  // 3. Clinical Code Tab Switching Demo
  // -------------------------------------------------------------------------
  const ideTabs = document.querySelectorAll('.editor-tab');
  const codeContent = document.getElementById('ide-code-content');

  const files = {
    'patient_eval.py': `
<span class="code-keyword">from</span> neura.clinical <span class="code-keyword">import</span> Alzheimer, PatientProfile
<span class="code-keyword">from</span> neura.analytics <span class="code-keyword">import</span> generate_clinical_report

<span class="code-comment"># Evaluasi rekam medis pasien dengan 32 biomarker klinis</span>
<span class="code-keyword">def</span> <span class="code-fn">evaluate_patient_risk</span>(patient_id: <span class="code-type">str</span>):
    model = Alzheimer.<span class="code-fn">load_checkpoint</span>(<span class="code-string">"xgboost_alzheimers.json"</span>)
    patient = PatientProfile.<span class="code-fn">from_cohort</span>(patient_id, n_biomarkers=<span class="code-prop">32</span>)
    
    <span class="code-comment"># Prediksi risiko penurunan fungsi kognitif &amp; biomarker MMSE</span>
    diagnosis = model.<span class="code-fn">predict_risk</span>(patient)
    
    <span class="code-keyword">return</span> {
<span class="code-diff-added">+       "diagnosis": "Mild Cognitive Impairment (Early Alzheimer Risk)",</span>
<span class="code-diff-added">+       "confidence_score": 0.944,</span>
<span class="code-diff-added">+       "recommended_action": "Early Neurological Intervention &amp; Cognitive Therapy"</span>
<span class="code-diff-removed">-       "status": "Inconclusive screening"</span>
    }`,
    'biomarkers.json': `
{
  <span class="code-prop">"patient_id"</span>: <span class="code-string">"P-104"</span>,
  <span class="code-prop">"age"</span>: <span class="code-prop">72</span>,
  <span class="code-prop">"gender"</span>: <span class="code-string">"Female"</span>,
  <span class="code-prop">"mmse_score"</span>: <span class="code-prop">21.4</span>,
  <span class="code-prop">"functional_assessment"</span>: <span class="code-prop">5.8</span>,
  <span class="code-prop">"memory_complaints"</span>: <span class="code-prop">1</span>,
  <span class="code-prop">"behavioral_problems"</span>: <span class="code-prop">0</span>,
  <span class="code-prop">"adl_score"</span>: <span class="code-prop">6.2</span>,
  <span class="code-prop">"systolic_bp"</span>: <span class="code-prop">138</span>,
  <span class="code-prop">"cholesterol_total"</span>: <span class="code-prop">224</span>,
  <span class="code-prop">"apoe_allele"</span>: <span class="code-prop">1</span>
}`,
    'clinical_pipeline.py': `
<span class="code-keyword">from</span> sklearn.metrics <span class="code-keyword">import</span> roc_auc_score, accuracy_score
<span class="code-keyword">import</span> xgboost <span class="code-keyword">as</span> xgb

<span class="code-comment"># Pipeline validasi performa model Alzheimer</span>
<span class="code-keyword">def</span> <span class="code-fn">benchmark_clinical_model</span>(X_test, y_test):
    clf = xgb.XGBClassifier()
    clf.load_model(<span class="code-string">"public/checkpoints/xgboost_alzheimers.json"</span>)
    preds = clf.predict_proba(X_test)[:, <span class="code-prop">1</span>]
    
    <span class="code-keyword">return</span> {
        <span class="code-string">"accuracy"</span>: <span class="code-fn">accuracy_score</span>(y_test, preds &gt;= <span class="code-prop">0.5</span>),
        <span class="code-string">"roc_auc"</span>: <span class="code-fn">roc_auc_score</span>(y_test, preds)
    }`
  };

  if (ideTabs.length && codeContent) {
    ideTabs.forEach(tab => {
      tab.addEventListener('click', function () {
        ideTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const filename = this.getAttribute('data-file');
        if (files[filename]) {
          codeContent.innerHTML = files[filename].trim();
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // 4. Bilingual Toggle (Indonesian / English Subtitle / Language Engine)
  // -------------------------------------------------------------------------
  const langBtn = document.getElementById('lang-toggle-btn');
  // Normalize: support both 'ID'/'EN' (legacy) and 'id'/'en' (current app.js format)
  let currentLang = 'ID';
  try {
    const saved = localStorage.getItem('neura_lang');
    if (saved && saved.toLowerCase() === 'en') currentLang = 'EN';
    else currentLang = 'ID';
  } catch (e) {
    currentLang = 'ID';
  }

  const translations = {
    ID: {
      // Announcement
      announcement_pill: '✦ RISET KLINIS',
      announcement_text: 'Model Alzheimer tervalidasi dengan 32 biomarker klinis &bull; Akurasi 94.4% (ROC-AUC 0.933)',
      announcement_link: 'Pelajari lebih lanjut &rarr;',

      // Main Navigation
      nav_about: 'Tentang',
      nav_pipeline: 'Alur Analisis',
      nav_security: 'Keamanan',
      nav_specification: 'Spesifikasi',
      nav_workspace: 'Workspace',
      nav_login: 'Masuk',
      btn_consult: 'Mulai Diagnosis',

      // Mobile Drawer
      mobile_about: 'Tentang Platform',
      mobile_pipeline: 'Alur Analisis',
      mobile_security: 'Keamanan Data',
      mobile_specification: 'Spesifikasi Model',
      mobile_workspace: 'Buka Workspace',
      mobile_login: 'Masuk / Registrasi &rarr;',
      mobile_cta: 'Mulai Diagnosis Klinis &rarr;',

      // Hero Section
      hero_headline: 'Mendeteksi Alzheimer<br>Lebih Awal,<br>Lebih Tepat.',
      hero_lead: 'Platform kecerdasan buatan klinis untuk evaluasi dini risiko Alzheimer berbasis 32 biomarker multimodal, dengan akurasi 94.4% yang telah divalidasi pada 430 rekam medis.',
      hero_cta_btn: 'Mulai Diagnosis Klinis',
      hero_sub_btn: 'Buka Workspace Pasien &rarr;',
      hero_stats: '94.4% AKURASI &bull; ROC-AUC 0.933 &bull; 32 BIOMARKER KLINIS &bull; &lt;1.2s INFERENSI',

      // Statement (About)
      statement_eyebrow: 'TENTANG PLATFORM',
      statement_heading: 'Neura<br><span class="statement-heading-italic">Cognitive AI</span>',
      statement_p1: 'Neura adalah sistem kecerdasan buatan klinis mutakhir yang dirancang untuk mendeteksi indikasi awal <strong>Alzheimer, Mild Cognitive Impairment (MCI)</strong>, dan gangguan neurodegeneratif lain sejak stadium paling awal.',
      statement_p2: 'Didukung oleh arsitektur machine learning <strong>XGBoost</strong> berkecepatan tinggi yang telah dilatih menggunakan parameter biomarker klinis komprehensif, Neura mampu memetakan gejala memori, fungsi eksekutif, dan faktor risiko neurologis secara presisi dengan akurasi mencapai <strong>95.8%</strong>.',
      statement_p3: 'Tidak seperti pemeriksaan konvensional yang mahal dan lambat, Neura memberikan analisis terstruktur dalam kurang dari 1.2 detik, langsung dari browser Anda.',

      // Product 1: Pipeline
      pipeline_title: 'Neura Reasoning Pipeline',
      pipeline_desc: 'Sistem penalaran kognitif transparan dari ekstraksi data hingga hasil klinis. Membaca 32 biomarker, menganalisa korelasi risiko, mengolah parameter mentah, menyusun narasi diagnostik, serta menerbitkan output secara presisi.',
      pipeline_step1_sub: '32 biomarker klinis &amp; riwayat kognitif MMSE dimuat',
      pipeline_step2_sub: 'Korelasi multivariat &amp; evaluasi signifikansi klinis',
      pipeline_step3_sub: 'Inferensi ansambel pohon keputusan XGBoost',
      pipeline_step4_sub: 'Normalisasi vektor risiko &amp; pemetaan ambang batas',
      pipeline_step5_sub: 'Sintesis penjelasan medis &amp; rasionalisasi diagnostik',
      pipeline_step6_sub: 'Laporan diagnosis, skor risiko 94.4%, &amp; rekomendasi klinis diterbitkan',

      // Product 2: Security
      security_title: 'Neura Data Security',
      security_desc: 'Perlindungan data medis berstandar klinis dengan enkripsi end-to-end AES-256. Menjamin kerahasiaan rekam medis pasien, anonimisasi biomarker otomatis, serta kepatuhan penuh terhadap regulasi privasi kesehatan HIPAA &amp; GDPR.',
      sec_heading: 'Zero-Knowledge Clinical Vault',
      sec_caption: 'Rekam medis terenkripsi langsung di browser lokal sebelum evaluasi biomarker',
      sec_feat1_title: 'HIPAA Safe Harbor De-Identification',
      sec_feat1_desc: '18 identifier pasien (nama, NIK, kontak) dihilangkan otomatis sebelum evaluasi',
      sec_feat2_title: 'Local Browser Memory Sandbox',
      sec_feat2_desc: 'Inferensi machine learning berjalan lokal di RAM tanpa jejak data di server',
      sec_feat3_title: 'Cryptographic SHA-256 Checksum',
      sec_feat3_desc: 'Validasi integritas dataset 32 biomarker secara tamper-proof',

      // Product 3: NeuraPet
      sdk_title: 'NeuraPet',
      sdk_desc: 'Teman AI interaktif yang hidup di Dynamic Island antarmuka Neura. NeuraPet merespons gerakan kursor secara real-time, berkedip alami, menoleh acak layaknya makhluk hidup, dan bereaksi elastis saat disentuh — menghadirkan nuansa klinis yang personal dan menyenangkan.',

      // Product 4: CLI
      cli_title: 'Neura Specification',
      cli_desc: 'Spesifikasi teknis dan benchmark klinis arsitektur Neura. Divalidasi dengan 32 biomarker neuro-kognitif, akurasi klasifikasi 94.42%, skor ROC-AUC 0.9329, serta latensi inferensi instan pada kohort rekam medis pasien.',

      // Blog
      blog_headline: 'Riset Klinis &amp; Publikasi Terkini',
      blog_see_all: 'Lihat Semua Riset',
      blog_card1_title: 'Validasi Akurasi 94.4% Model XGBoost pada Deteksi Dini Alzheimer',
      blog_card2_title: 'Peran 32 Biomarker Kritis dalam Deteksi Risiko Demensia',
      blog_card3_title: 'Mendeteksi Mild Cognitive Impairment Sebelum Gejala Klinis Akut',
      blog_card4_title: 'AI Sebagai Rekan Analisis Bagi Dokter Spesialis Saraf',
      blog_card5_title: 'Uji Validasi Multimodal pada 430 Rekam Medis Pasien',
      blog_read_link: 'Baca riset',

      // Updates / Newsletter
      sync_title: 'Riset &amp; Publikasi Klinis Neura',
      sync_sub: 'Dapatkan pembaruan berkala evaluasi 32 biomarker, rilis arsitektur Alzheimer, serta telaah kasus kognitif langsung ke inbox Anda.',
      sync_pill_all: 'Semua Riset',
      sync_email_ph: 'Masukkan email institusi atau klinis Anda...',
      sync_btn: 'Langganan Riset',
      sync_consent: 'Saya menyetujui <a href="/app">Kebijakan Privasi</a> dan perlindungan data medis Neura. Berhenti langganan kapan saja.',

      // Bottom CTA
      bottom_headline: 'Mulai Deteksi Dini<br />dengan Neura AI',
      bottom_btn_white: 'Buka Neura Workspace',
      bottom_btn_dark: 'Unduh Aplikasi Klinis',

      // Footer
      footer_desc: 'Infrastruktur kecerdasan buatan klinis untuk deteksi dini risiko Alzheimer dan neurodegenerasi berbasis 32 biomarker multimodal.',
      footer_copy: '&copy; 2026 Neura Health AI. Hak Cipta Dilindungi.',
      footer_tag: 'Model Machine Learning Tervalidasi Klinis • XGBoost 3.x',
      footer_privacy: 'Kebijakan Privasi',
      footer_terms: 'Syarat Layanan',
      footer_sec: 'Keamanan Data',
      footer_col1: 'Platform',
      footer_link_pipeline: 'Reasoning Pipeline',
      footer_link_vault: 'Zero-Knowledge Vault',
      footer_link_neurapet: 'NeuraPet AI Companion',
      footer_link_cli: 'Terminal Klinis CLI',
      footer_link_workspace: 'Neura Workspace',
      footer_col2: 'Model & Riset',
      footer_link_model: 'Model XGBoost 3.x',
      footer_link_biomarkers: '32 Biomarker Multimodal',
      footer_link_validation: 'Kohort Validasi 430 Pasien',
      footer_link_research: 'Publikasi Riset Klinis',
      footer_link_dispatch: 'Clinical Dispatch',
      footer_col3: 'Protokol & Standar',
      footer_link_hipaa: 'HIPAA Safe Harbor',
      footer_link_aes: 'Enkripsi AES-256 GCM',
      footer_link_mmse: 'Protokol Kognitif MMSE',
      footer_link_ethics: 'Etika & Privasi AI Medis',
      footer_col4: 'Navigasi & Layanan',
      footer_link_about: 'Tentang Neura AI',
      footer_link_download: 'Download Clinical Suite',
      footer_link_voice: 'Konsultasi Suara AI',
      footer_link_help: 'Portal Tenaga Medis'
    },
    EN: {
      // Announcement
      announcement_pill: '✦ CLINICAL RESEARCH',
      announcement_text: 'Alzheimer model validated across 32 clinical biomarkers &bull; 94.4% Accuracy (ROC-AUC 0.933)',
      announcement_link: 'Learn more &rarr;',

      // Main Navigation
      nav_about: 'About',
      nav_pipeline: 'Pipeline',
      nav_security: 'Security',
      nav_specification: 'Specifications',
      nav_workspace: 'Workspace',
      nav_login: 'Log in',
      btn_consult: 'Start Diagnosis',

      // Mobile Drawer
      mobile_about: 'About Platform',
      mobile_pipeline: 'Analysis Pipeline',
      mobile_security: 'Data Security',
      mobile_specification: 'Model Specifications',
      mobile_workspace: 'Open Workspace',
      mobile_login: 'Log in / Register &rarr;',
      mobile_cta: 'Start Clinical Diagnosis &rarr;',

      // Hero Section
      hero_headline: "Detecting Alzheimer's<br>Earlier,<br>More Accurately.",
      hero_lead: "Clinical artificial intelligence platform for early evaluation of Alzheimer's risk powered by 32 multimodal biomarkers, achieving 94.4% accuracy validated across 430 clinical records.",
      hero_cta_btn: 'Start Clinical Diagnosis',
      hero_sub_btn: 'Open Patient Workspace &rarr;',
      hero_stats: '94.4% ACCURACY &bull; ROC-AUC 0.933 &bull; 32 CLINICAL BIOMARKERS &bull; &lt;1.2s INFERENCE',

      // Statement (About)
      statement_eyebrow: 'ABOUT PLATFORM',
      statement_heading: 'Neura<br><span class="statement-heading-italic">Cognitive AI</span>',
      statement_p1: "Neura is a cutting-edge clinical artificial intelligence system engineered to detect early indicators of <strong>Alzheimer's, Mild Cognitive Impairment (MCI)</strong>, and neurodegenerative disorders from their earliest stages.",
      statement_p2: 'Powered by high-throughput <strong>XGBoost</strong> machine learning architecture trained on comprehensive clinical biomarkers, Neura accurately maps memory impairment, executive function, and neurological risk factors with up to <strong>95.8%</strong> accuracy.',
      statement_p3: 'Unlike expensive, slow conventional screenings, Neura delivers structured diagnostic evaluations in under 1.2 seconds, directly from your browser.',

      // Product 1: Pipeline
      pipeline_title: 'Neura Reasoning Pipeline',
      pipeline_desc: 'Transparent cognitive reasoning workflow from raw data ingestion to clinical conclusions. Ingests 32 biomarkers, assesses risk correlations, processes raw clinical parameters, builds diagnostic narratives, and delivers high-precision insights.',
      pipeline_step1_sub: '32 clinical biomarkers &amp; MMSE cognitive history loaded',
      pipeline_step2_sub: 'Multivariate correlation &amp; clinical significance evaluation',
      pipeline_step3_sub: 'XGBoost decision tree ensemble inference',
      pipeline_step4_sub: 'Risk vector normalization &amp; threshold mapping',
      pipeline_step5_sub: 'Medical explanation synthesis &amp; diagnostic rationalization',
      pipeline_step6_sub: 'Diagnostic report, 94.4% risk score &amp; clinical recommendations published',

      // Product 2: Security
      security_title: 'Neura Data Security',
      security_desc: 'Clinical-grade medical data protection with end-to-end AES-256 encryption. Guarantees patient record privacy, automated biomarker anonymization, and full compliance with HIPAA &amp; GDPR healthcare regulations.',
      sec_heading: 'Zero-Knowledge Clinical Vault',
      sec_caption: 'Patient records encrypted locally in browser memory before biomarker evaluation',
      sec_feat1_title: 'HIPAA Safe Harbor De-Identification',
      sec_feat1_desc: '18 patient identifiers (names, IDs, contacts) automatically stripped prior to inference',
      sec_feat2_title: 'Local Browser Memory Sandbox',
      sec_feat2_desc: 'Machine learning inference executes client-side in RAM with zero server data retention',
      sec_feat3_title: 'Cryptographic SHA-256 Checksum',
      sec_feat3_desc: 'Tamper-proof dataset integrity validation across all 32 clinical biomarkers',

      // Product 3: NeuraPet
      sdk_title: 'NeuraPet',
      sdk_desc: 'An interactive AI companion living inside the Neura Dynamic Island. NeuraPet tracks your cursor in real-time, blinks naturally, performs random saccadic glances like a living creature, and reacts with elastic squish animations when clicked — adding a personal and delightful touch to the clinical experience.',

      // Product 4: CLI
      cli_title: 'Neura Specifications',
      cli_desc: 'Technical specifications and clinical benchmarks of the Neura architecture. Validated with 32 neuro-cognitive biomarkers, 94.42% classification accuracy, 0.9329 ROC-AUC score, and instant inference latency across patient cohorts.',

      // Blog
      blog_headline: 'Clinical Research &amp; Latest Publications',
      blog_see_all: 'View All Research',
      blog_card1_title: "Validating 94.4% XGBoost Model Accuracy for Early Alzheimer's Detection",
      blog_card2_title: 'The Role of 32 Critical Biomarkers in Dementia Risk Assessment',
      blog_card3_title: 'Detecting Mild Cognitive Impairment Before Acute Clinical Manifestation',
      blog_card4_title: 'AI as a Clinical Decision Support Partner for Neurologists',
      blog_card5_title: 'Multimodal Validation Cohort Across 430 Patient Clinical Records',
      blog_read_link: 'Read study',

      // Updates / Newsletter
      sync_title: 'Neura Clinical Research &amp; Dispatches',
      sync_sub: 'Receive periodic updates on 32 biomarker evaluations, Alzheimer architecture releases, and cognitive case reviews directly in your inbox.',
      sync_pill_all: 'All Research',
      sync_email_ph: 'Enter your institutional or clinical email...',
      sync_btn: 'Subscribe to Research',
      sync_consent: 'I agree to the <a href="/app">Privacy Policy</a> and medical data safeguards of Neura. Unsubscribe at any time.',

      // Bottom CTA
      bottom_headline: 'Experience Early<br />Detection<br />with Neura AI',
      bottom_btn_white: 'Open Neura Workspace',
      bottom_btn_dark: 'Download Clinical Suite',

      // Footer
      footer_desc: "Clinical AI infrastructure for early-stage Alzheimer's and neurodegenerative risk detection based on 32 multimodal biomarkers.",
      footer_copy: '&copy; 2026 Neura Health AI. All Rights Reserved.',
      footer_tag: 'Clinically Validated Machine Learning Architecture • XGBoost 3.x',
      footer_privacy: 'Privacy Policy',
      footer_terms: 'Terms of Service',
      footer_sec: 'Data Security',
      footer_col1: 'Platform',
      footer_link_pipeline: 'Reasoning Pipeline',
      footer_link_vault: 'Zero-Knowledge Vault',
      footer_link_neurapet: 'NeuraPet AI Companion',
      footer_link_cli: 'Clinical Terminal CLI',
      footer_link_workspace: 'Neura Workspace',
      footer_col2: 'Model & Research',
      footer_link_model: 'XGBoost 3.x Model',
      footer_link_biomarkers: '32 Multimodal Biomarkers',
      footer_link_validation: '430 Patient Validation Cohort',
      footer_link_research: 'Clinical Research Studies',
      footer_link_dispatch: 'Clinical Dispatch',
      footer_col3: 'Protocols & Standards',
      footer_link_hipaa: 'HIPAA Safe Harbor',
      footer_link_aes: 'AES-256 GCM Encryption',
      footer_link_mmse: 'MMSE Cognitive Protocol',
      footer_link_ethics: 'Medical AI Ethics & Safety',
      footer_col4: 'Navigation & Services',
      footer_link_about: 'About Neura AI',
      footer_link_download: 'Download Clinical Suite',
      footer_link_voice: 'AI Voice Consultation',
      footer_link_help: 'Clinician Portal & Support'
    }
  };

  function setLanguage(lang) {
    currentLang = lang === 'EN' ? 'EN' : 'ID';
    try {
      // Always write lowercase to stay in sync with app.js
      localStorage.setItem('neura_lang', currentLang === 'EN' ? 'en' : 'id');
    } catch (e) {
      // LocalStorage access failsafe
    }

    // Update Language Toggle Button in Nav
    if (langBtn) {
      langBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>${currentLang}</span>`;
      langBtn.setAttribute('title', currentLang === 'ID' ? 'Ganti Bahasa (Switch to English)' : 'Switch Language (Ganti ke Bahasa Indonesia)');
      langBtn.classList.add('lang-switched');
      setTimeout(() => langBtn.classList.remove('lang-switched'), 350);
    }

    // Update Footer language tag
    document.querySelectorAll('.footer-lang-tag').forEach(tag => {
      tag.textContent = currentLang;
    });

    // Translate all elements with data-i18n
    const dict = translations[currentLang] || translations.ID;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // Translate input placeholders
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (dict[key] !== undefined) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // Update document language attribute
    document.documentElement.lang = currentLang.toLowerCase();
  }

  // Initialize saved or default language
  setLanguage(currentLang);

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      const nextLang = currentLang === 'ID' ? 'EN' : 'ID';
      setLanguage(nextLang);
    });
  }

  // Also hook up footer language tag
  document.querySelectorAll('.footer-lang-tag').forEach(tag => {
    tag.style.cursor = 'pointer';
    tag.setAttribute('title', 'Ganti Bahasa / Switch Language');
    tag.addEventListener('click', function () {
      const nextLang = currentLang === 'ID' ? 'EN' : 'ID';
      setLanguage(nextLang);
    });
  });

  // Cross-tab sync: when app.js changes the language in another tab,
  // welcome.js reflects it instantly via the storage event
  window.addEventListener('storage', function (e) {
    if (e.key === 'neura_lang' && e.newValue) {
      const incoming = e.newValue.toLowerCase() === 'en' ? 'EN' : 'ID';
      if (incoming !== currentLang) setLanguage(incoming);
    }
  });

  // -------------------------------------------------------------------------
  // 5. Play Intro Interaction
  // -------------------------------------------------------------------------
  const playIntroBtn = document.getElementById('play-intro-btn');
  if (playIntroBtn) {
    playIntroBtn.addEventListener('click', function () {
      alert('Selamat datang di Neura! Platform deteksi dini Alzheimer berbasis kecerdasan buatan klinis.');
    });
  }

  // -------------------------------------------------------------------------
  // 6. Stay in Sync (Newsletter & Updates Filter Interactions)
  // -------------------------------------------------------------------------
  window.toggleSyncPill = function (btn) {
    const container = document.getElementById('sync-pills');
    if (!container) return;

    const isAllUpdates = btn.textContent.trim().includes('Semua Riset') || btn.textContent.trim().includes('All Updates');

    if (isAllUpdates) {
      container.querySelectorAll('.sync-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    } else {
      const allUpdatesBtn = container.querySelector('.sync-pill:first-child');
      if (allUpdatesBtn) allUpdatesBtn.classList.remove('active');
      btn.classList.toggle('active');

      const anyActive = container.querySelector('.sync-pill.active');
      if (!anyActive && allUpdatesBtn) {
        allUpdatesBtn.classList.add('active');
      }
    }
  };

  window.handleSyncSubscribe = function (e) {
    e.preventDefault();
    const input = document.getElementById('sync-email-field');
    const email = input ? input.value.trim() : '';

    if (!email) return;

    alert(`Terima kasih! Email (${email}) telah berhasil didaftarkan untuk menerima buletin riset Neura Alzheimer AI.`);
    if (input) input.value = '';
    const consent = document.getElementById('sync-consent-check');
    if (consent) consent.checked = false;
  };

  // -------------------------------------------------------------------------
  // 7. Interactive Magnetic Particles & Celestial Nebula for Download CTA Card
  // (Optimized: Viewport-aware, Squared Distance Physics, Auto-sleep when offscreen)
  // -------------------------------------------------------------------------
  function initCtaStarsCanvas() {
    const canvas = document.getElementById('cta-stars-canvas');
    const container = document.getElementById('bottom-cta-container') || (canvas ? canvas.parentElement : null);
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];
    let mouseX = -999;
    let mouseY = -999;
    let animTime = 0;
    let rafId = null;
    let isVisible = false;

    // Physics parameters matching Welcome Login Card
    const PARTICLE_COUNT = 96;
    const MAX_RADIUS = 2.8;
    const MIN_RADIUS = 0.8;
    const MOUSE_RADIUS = 240;
    const MOUSE_RADIUS_SQ = 240 * 240; // 57600
    const CONNECT_DIST = 105;
    const CONNECT_DIST_SQ = 105 * 105; // 11025
    const BASE_SPEED = 0.28;
    const ATTRACT_FORCE = 0.07;
    const MIN_CURSOR_DIST = 34;
    const REPULSION_DIST = 24;
    const REPULSION_DIST_SQ = 24 * 24; // 576
    const REPULSION_FORCE = 0.12;
    const DAMPING = 0.89;
    const MAX_SPEED = 3.2;

    // 3 Blurred Gradient Bubbles (Luminous Aurora Nebulae positioned on the center-right)
    const blurBubbles = [
      {
        name: 'Electric Azure',
        angle: 0.2,
        speed: 0.0024,
        orbitX: 160,
        orbitY: 90,
        baseRadius: 260,
        stops: [
          [0.0,  'rgba(59, 130, 246, 0.45)'],
          [0.25, 'rgba(96, 165, 250, 0.30)'],
          [0.55, 'rgba(56, 189, 248, 0.14)'],
          [0.80, 'rgba(59, 130, 246, 0.04)'],
          [1.0,  'rgba(59, 130, 246, 0)']
        ],
        phase: 0
      },
      {
        name: 'Soft Cyan Horizon',
        angle: 2.1,
        speed: 0.0028,
        orbitX: 190,
        orbitY: 110,
        baseRadius: 230,
        stops: [
          [0.0,  'rgba(56, 189, 248, 0.40)'],
          [0.30, 'rgba(34, 211, 238, 0.22)'],
          [0.60, 'rgba(14, 165, 233, 0.10)'],
          [0.85, 'rgba(56, 189, 248, 0.03)'],
          [1.0,  'rgba(56, 189, 248, 0)']
        ],
        phase: 1.8
      },
      {
        name: 'Cosmic Violet Terracotta',
        angle: 4.2,
        speed: 0.0020,
        orbitX: 140,
        orbitY: 80,
        baseRadius: 220,
        stops: [
          [0.0,  'rgba(147, 51, 234, 0.32)'],
          [0.25, 'rgba(217, 119, 87, 0.22)'],
          [0.55, 'rgba(168, 85, 247, 0.10)'],
          [0.80, 'rgba(147, 51, 234, 0.03)'],
          [1.0,  'rgba(147, 51, 234, 0)']
        ],
        phase: 3.6
      }
    ];

    const particleColors = [
      'rgba(255, 255, 255, ',   // Pure White
      'rgba(147, 197, 253, ',  // Sky Blue
      'rgba(56, 189, 248, ',   // Vivid Cyan
      'rgba(96, 165, 250, '    // Electric Azure
    ];

    function resize() {
      if (!canvas || !container) return;
      width = canvas.width = container.offsetWidth;
      height = canvas.height = container.offsetHeight;

      const isMobile = width < 768;
      const scale = Math.max(0.65, Math.min(width / 1100, 1.25));

      blurBubbles[0].orbitX = (isMobile ? 90 : 160) * scale;
      blurBubbles[0].orbitY = (isMobile ? 50 : 90) * scale;
      blurBubbles[0].baseRadius = (isMobile ? 160 : 260) * scale;

      blurBubbles[1].orbitX = (isMobile ? 110 : 190) * scale;
      blurBubbles[1].orbitY = (isMobile ? 60 : 110) * scale;
      blurBubbles[1].baseRadius = (isMobile ? 140 : 230) * scale;

      blurBubbles[2].orbitX = (isMobile ? 80 : 140) * scale;
      blurBubbles[2].orbitY = (isMobile ? 45 : 80) * scale;
      blurBubbles[2].baseRadius = (isMobile ? 130 : 220) * scale;

      initParticles();
    }

    function initParticles() {
      particles = [];
      const count = Math.min(PARTICLE_COUNT, Math.max(48, Math.floor(width * 0.1)));
      for (let i = 0; i < count; i++) {
        const baseA = 0.20 + Math.random() * 0.45;
        const color = particleColors[Math.floor(Math.random() * particleColors.length)];
        const r = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * BASE_SPEED,
          vy: (Math.random() - 0.5) * BASE_SPEED,
          r: r,
          drawR: r,
          baseAlpha: baseA,
          alpha: baseA,
          color: color,
          twinkleSpeed: 0.02 + Math.random() * 0.035,
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }

    container.addEventListener('mousemove', function (e) {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }, { passive: true });

    container.addEventListener('mouseenter', function (e) {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }, { passive: true });

    container.addEventListener('mouseleave', function () {
      mouseX = -999;
      mouseY = -999;
    }, { passive: true });

    function loop() {
      if (!canvas || !ctx || !isVisible || document.hidden) {
        rafId = null;
        return;
      }
      ctx.clearRect(0, 0, width, height);

      animTime += 0.015;

      // ---------------------------------------------------------------------
      // 1. Draw 3 Chromatic Ambient Aurora Orbs (Center-Right positioning)
      // ---------------------------------------------------------------------
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const nebulaCenterX = width < 768 ? width * 0.6 : width * 0.68;
      const nebulaCenterY = height * 0.62;

      blurBubbles.forEach(b => {
        b.angle += b.speed;
        const curOrbitX = b.orbitX * (1 + 0.08 * Math.sin(animTime * 1.1 + b.phase));
        const curOrbitY = b.orbitY * (1 + 0.08 * Math.cos(animTime * 0.9 + b.phase));
        const bx = nebulaCenterX + Math.cos(b.angle) * curOrbitX;
        const by = nebulaCenterY + Math.sin(b.angle) * curOrbitY;
        const br = Math.max(30, b.baseRadius + Math.sin(animTime * 1.3 + b.phase) * 16);

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        for (let s = 0; s < b.stops.length; s++) {
          grad.addColorStop(b.stops[s][0], b.stops[s][1]);
        }

        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      ctx.restore();

      // ---------------------------------------------------------------------
      // 2. Interactive Magnetic Physics on Particles (Squared-Distance Optimization)
      // ---------------------------------------------------------------------
      const isMouseActive = mouseX > 0 && mouseY > 0 && mouseX <= width && mouseY <= height;

      // 2a. Magnetic Attraction to Cursor
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.twinkle += p.twinkleSpeed;

        if (isMouseActive) {
          const dx = mouseX - p.x;
          const dy = mouseY - p.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < MOUSE_RADIUS_SQ && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const normX = dx / dist;
            const normY = dy / dist;
            const factor = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;

            if (dist > MIN_CURSOR_DIST) {
              const pull = factor * ATTRACT_FORCE;
              p.vx += normX * pull;
              p.vy += normY * pull;
            } else {
              const pushBack = ((MIN_CURSOR_DIST - dist) / MIN_CURSOR_DIST) * 0.12;
              p.vx -= normX * pushBack;
              p.vy -= normY * pushBack;
            }

            p.alpha = p.baseAlpha + (0.95 - p.baseAlpha) * factor;
            p.drawR = p.r * (1 + factor * 0.45);
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.05;
            p.drawR += (p.r - p.drawR) * 0.05;
            p.vx += (Math.random() - 0.5) * 0.02;
            p.vy += (Math.random() - 0.5) * 0.02;
          }
        } else {
          p.alpha = Math.max(0.12, Math.min(0.85, p.baseAlpha + Math.sin(p.twinkle) * 0.18));
          p.drawR += (p.r - p.drawR) * 0.05;
          p.vx += (Math.random() - 0.5) * 0.012;
          p.vy += (Math.random() - 0.5) * 0.012;
        }
      }

      // 2b. Inter-Particle Repulsion (Fast Squared Distance Check)
      for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const pj = particles[j];
          const pdx = pj.x - pi.x;
          const pdy = pj.y - pi.y;
          const pdistSq = pdx * pdx + pdy * pdy;

          if (pdistSq < REPULSION_DIST_SQ && pdistSq > 0.001) {
            const pdist = Math.sqrt(pdistSq);
            const pnormX = pdx / pdist;
            const pnormY = pdy / pdist;
            const repFactor = (REPULSION_DIST - pdist) / REPULSION_DIST;
            const repForce = repFactor * REPULSION_FORCE;

            pi.vx -= pnormX * repForce;
            pi.vy -= pnormY * repForce;
            pj.vx += pnormX * repForce;
            pj.vy += pnormY * repForce;
          }
        }
      }

      // 2c. Update Positions & Render Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.vx *= DAMPING;
        p.vy *= DAMPING;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        if (!isMouseActive && speed < BASE_SPEED * 0.2) {
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vy += (Math.random() - 0.5) * 0.04;
        }

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around boundaries with comfortable margins
        if (p.x < -14) p.x = width + 14;
        if (p.x > width + 14) p.x = -14;
        if (p.y < -14) p.y = height + 14;
        if (p.y > height + 14) p.y = -14;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.drawR, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.shadowColor = p.color + '0.7)';
        ctx.shadowBlur = p.drawR > 2 ? 8 : 4;
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      // 2d. Draw Dynamic Constellation Connecting Lines (Squared Distance)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const ddx = a.x - b.x, ddy = a.y - b.y;
          const dSq = ddx * ddx + ddy * ddy;
          if (dSq < CONNECT_DIST_SQ) {
            const d = Math.sqrt(dSq);
            let lineAlpha;
            if (isMouseActive) {
              const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
              const mdx = mx - mouseX, mdy = my - mouseY;
              const mdSq = mdx * mdx + mdy * mdy;
              const mRange = MOUSE_RADIUS * 1.1;
              if (mdSq < mRange * mRange) {
                const md = Math.sqrt(mdSq);
                lineAlpha = (1 - d / CONNECT_DIST) * (1 - md / mRange) * 0.38;
              } else {
                lineAlpha = (1 - d / CONNECT_DIST) * 0.04;
              }
            } else {
              lineAlpha = (1 - d / CONNECT_DIST) * 0.035;
            }

            if (lineAlpha > 0.005) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = 'rgba(147, 197, 253, ' + lineAlpha + ')';
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }
        }
      }

      rafId = requestAnimationFrame(loop);
    }

    // Attach click handler to Download Clinical Suite button for smooth feedback
    const btnSuite = document.getElementById('btn-download-suite');
    if (btnSuite) {
      btnSuite.addEventListener('click', function (e) {
        const specSection = document.getElementById('specification');
        if (specSection) {
          e.preventDefault();
          specSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const cliCard = specSection.querySelector('.cli-card-preview');
          if (cliCard) {
            cliCard.style.transition = 'box-shadow 0.4s ease, transform 0.4s ease';
            cliCard.style.boxShadow = '0 0 32px rgba(217, 119, 87, 0.45)';
            cliCard.style.transform = 'scale(1.01)';
            setTimeout(() => {
              cliCard.style.boxShadow = '';
              cliCard.style.transform = '';
            }, 1200);
          }
        }
      });
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Viewport-Aware Observer: Only run when bottom CTA is approaching or in viewport
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        const inView = entries[0].isIntersecting;
        if (inView && !isVisible) {
          isVisible = true;
          if (!rafId) rafId = requestAnimationFrame(loop);
        } else if (!inView && isVisible) {
          isVisible = false;
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        }
      }, { rootMargin: '250px' });
      io.observe(container);
    } else {
      isVisible = true;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      } else if (isVisible && !rafId) {
        rafId = requestAnimationFrame(loop);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCtaStarsCanvas);
  } else {
    initCtaStarsCanvas();
  }

  // -------------------------------------------------------------------------
  // 8. Blog Carousel Navigation
  // -------------------------------------------------------------------------
  window.scrollBlogCarousel = function (direction) {
    const track = document.getElementById('blog-carousel-track');
    if (!track) return;
    const scrollAmount = 309; // card 285px + 24px gap
    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
  };

  // -------------------------------------------------------------------------
  // 8.1 Dynamic Research Updates Loader (from Admin Logs API)
  // -------------------------------------------------------------------------
  function renderPublicResearchCards(items) {
    const track = document.getElementById('blog-carousel-track');
    if (!track || !Array.isArray(items) || items.length === 0) return;

    function esc(s) {
      if (!s) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderThumb(type, cfg) {
      cfg = cfg || {};
      switch (type) {
        case 'mockup_card': {
          const title = esc(cfg.mockupTitle || '32 Profil Biomarker Klinis');
          const desc = esc(cfg.mockupDesc || 'Evaluasi korelasi skor MMSE, ADL, dan riwayat memori pasien');
          const btn = esc(cfg.mockupBtnText || 'Eksplorasi');
          const cursor = cfg.showCursor !== false;
          return `
            <div class="blog-card-media blog-media-plugin">
              <div class="plugin-mockup-card">
                <div class="plugin-card-title">${title}</div>
                <div class="plugin-card-desc">${desc}</div>
                <div class="plugin-card-btn-row">
                  <span class="plugin-customize-btn">${btn}</span>
                  ${cursor ? `<svg class="cursor-pointer-icon" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" stroke-width="1.6"><path d="M3 3l7 18 3-7 7-3L3 3z"/></svg>` : ''}
                </div>
              </div>
            </div>`;
        }
        case 'neon_code': {
          const icon = esc(cfg.badgeIcon || '✦');
          const badge = esc(cfg.badgeText || 'Deteksi MCI');
          const brackets = esc(cfg.codeBrackets || '< >');
          return `
            <div class="blog-card-media blog-media-flash">
              <div class="neon-glow-brackets">${brackets}</div>
              <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
            </div>`;
        }
        case 'collab_widget': {
          const left = esc(cfg.widgetHeaderLeft || '⑂ kolaborasi-medis');
          const right = esc(cfg.widgetHeaderRight || '+ Neura Clinical ⌄');
          const body = esc(cfg.widgetBodyText || 'Clinical Decision Support');
          return `
            <div class="blog-card-media blog-media-dive">
              <div class="dive-mini-widget">
                <div class="dive-widget-header"><span>${left}</span><span>${right}</span></div>
                <div class="dive-widget-body"><span>${body}</span></div>
              </div>
            </div>`;
        }
        case 'vision_glow': {
          const icon = esc(cfg.badgeIcon || '✦');
          const badge = esc(cfg.badgeText || 'Kohort Data');
          return `
            <div class="blog-card-media blog-media-vision">
              <div class="vision-radial-glow"></div>
              <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
            </div>`;
        }
        case 'custom_image': {
          const img = cfg.imageUrl || '/assets/neura_hero.png';
          return `
            <div class="blog-card-media" style="background-image:url('${img}'); background-size:cover; background-position:center; min-height:165px; border-radius:16px; position:relative;">
              <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%);"></div>
            </div>`;
        }
        case 'badge_glow':
        default: {
          const icon = esc(cfg.badgeIcon || '✦');
          const badge = esc(cfg.badgeText || 'Model Klinis');
          return `
            <div class="blog-card-media blog-media-argon">
              <div class="neon-glow-ribbon"></div>
              <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
            </div>`;
        }
      }
    }

    track.innerHTML = items.map(item => {
      const cats = Array.isArray(item.categories) ? item.categories : [item.categories || 'Riset'];
      const catHtml = cats.map(c => `<span>${esc(c)}</span>`).join('');
      const thumbHtml = renderThumb(item.thumbnailType, item.thumbnailConfig);
      const linkUrl = esc(item.linkUrl || '/app');
      const readText = esc(item.readLinkText || 'Baca riset');

      return `
        <article class="blog-card" onclick="window.location.href='${linkUrl}'">
          ${thumbHtml}
          <div class="blog-card-content">
            <h3 class="blog-card-title">${esc(item.title)}</h3>
            <div class="blog-card-meta">
              <span>${esc(item.dateText || '')}</span>
              ${catHtml}
            </div>
            <div class="blog-card-link">
              <span>${readText}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function initDynamicResearchFeed() {
    try {
      const res = await fetch('/api/research');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          try {
            localStorage.setItem('neura_research_updates', JSON.stringify(json.data));
          } catch (e) { }
          renderPublicResearchCards(json.data);
          return;
        }
      }
    } catch (e) {
      console.warn('[Welcome Research] API fetch failed, falling back to cache...', e);
    }

    // Try cache
    try {
      const cached = localStorage.getItem('neura_research_updates');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          renderPublicResearchCards(parsed.filter(it => it.isPublished !== false));
        }
      }
    } catch (err) { }
  }

  document.addEventListener('DOMContentLoaded', initDynamicResearchFeed);

  // -------------------------------------------------------------------------
  // 9. Tools Strip Scroll Parallax
  // -------------------------------------------------------------------------
  (function initToolsParallax() {
    const section = document.getElementById('tools-carousel-section');
    const row1 = document.getElementById('tools-row-1');

    if (!section || !row1) return;

    // Strip starts from the leftmost position
    const ROW1_SPEED = 0.35;   // px horizontal shift per px vertical scroll
    const INITIAL_OFFSET = 0;     // px — start from far left

    let lastScrollY = window.scrollY;
    let currentX1 = INITIAL_OFFSET;
    let targetX1 = INITIAL_OFFSET;
    let rafId = null;
    let ticking = false;

    // Cache bubbles for the scale loop
    const bubbles = Array.from(row1.querySelectorAll('.tool-icon-bubble'));

    // Spotlight constants
    const MAX_SCALE = 1.2;   // scale at dead-centre
    const MIN_SCALE = 0.88;  // scale at outer edges
    const SCALE_ZONE = 280;   // half-width (px) over which scale transitions

    function applySpotlightScale() {
      const viewCX = window.innerWidth / 2;
      bubbles.forEach(b => {
        const rect = b.getBoundingClientRect();
        const bCX = rect.left + rect.width / 2;
        const dist = Math.abs(bCX - viewCX);
        // Linear interpolation: 0 dist → MAX_SCALE, SCALE_ZONE dist → MIN_SCALE
        const t = Math.min(dist / SCALE_ZONE, 1);
        const scale = MAX_SCALE + (MIN_SCALE - MAX_SCALE) * t;
        b.style.transform = `scale(${scale.toFixed(3)})`;
      });
    }

    function applyTransforms() {
      // Lerp toward target for buttery easing
      currentX1 += (targetX1 - currentX1) * 0.08;

      row1.style.transform = `translateX(${currentX1.toFixed(2)}px)`;

      // Update spotlight scale on every frame
      applySpotlightScale();

      // Keep animating until settled
      if (Math.abs(targetX1 - currentX1) > 0.1) {
        rafId = requestAnimationFrame(applyTransforms);
      } else {
        // Final scale pass after motion stops
        applySpotlightScale();
        rafId = null;
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY;
        const sectionCentre = sectionTop - window.innerHeight / 2;
        const progress = window.scrollY - sectionCentre;

        // Row slides LEFT as user scrolls DOWN
        targetX1 = INITIAL_OFFSET - progress * ROW1_SPEED;

        if (!rafId) {
          rafId = requestAnimationFrame(applyTransforms);
        }
      });
    }

    // Apply initial position + scale immediately
    row1.style.transform = `translateX(${INITIAL_OFFSET}px)`;
    // Defer scale pass until layout is painted
    requestAnimationFrame(() => requestAnimationFrame(applySpotlightScale));

    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // -------------------------------------------------------------------------
  // 7. Interactive Parallax Scroller & Thumbnail Scale for Showcase Mockup
  // Scales up smoothly from thumbnail size (~0.86) to normal full size (1.0)
  // as the user scrolls into view.
  // -------------------------------------------------------------------------
  (function initShowcaseParallax() {
    const showcaseSection = document.querySelector('.showcase-section');
    const appWindowFrame = document.querySelector('.sil-window, .app-window-frame');
    if (!showcaseSection || !appWindowFrame) return;

    let ticking = false;

    function renderParallax() {
      const rect = showcaseSection.getBoundingClientRect();
      const vh = window.innerHeight;

      // Extended parallax track: starts before entering viewport (vh * 1.08)
      // and smoothly continues until settled into prime reading position (vh * 0.10)
      const startPoint = vh * 1.08;
      const endPoint = vh * 0.10;
      const rawProgress = (startPoint - rect.top) / (startPoint - endPoint);
      const progress = Math.max(0, Math.min(1, rawProgress));

      // Smooth physical easing curve
      const eased = 1 - Math.pow(1 - progress, 2.2);

      const isMobile = window.innerWidth <= 768;
      // Start visibly small (thumbnail size) and expand to scale(1.0)
      const minScale = isMobile ? 0.78 : 0.65;
      const maxTilt = isMobile ? 4 : 10;
      const maxOffsetY = isMobile ? 48 : 100;

      const scale = minScale + (1 - minScale) * eased;
      const rotateX = (1 - eased) * maxTilt;
      const translateY = (1 - eased) * maxOffsetY;

      appWindowFrame.style.transform = `perspective(1200px) translateY(${translateY.toFixed(2)}px) scale(${scale.toFixed(4)}) rotateX(${rotateX.toFixed(2)}deg)`;

      // Dynamic cinematic depth shadow expanding on approach
      const shadowSpread = 20 + eased * 68;
      const isSil = appWindowFrame.classList.contains('sil-window');
      if (isSil) {
        const shadowAlpha = 0.35 + eased * 0.25;
        appWindowFrame.style.boxShadow = `0 ${shadowSpread.toFixed(0)}px 90px -15px rgba(0, 0, 0, ${shadowAlpha.toFixed(2)}), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.04)`;
      } else {
        const shadowAlpha = 0.08 + eased * 0.12;
        appWindowFrame.style.boxShadow = `0 ${shadowSpread.toFixed(0)}px 84px -16px rgba(31, 30, 29, ${shadowAlpha.toFixed(2)}), 0 0 0 1px var(--color-border)`;
      }

      ticking = false;
    }

    function requestTick() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(renderParallax);
      }
    }

    // Connect with Lenis momentum scroll if available
    if (window.lenis) {
      window.lenis.on('scroll', requestTick);
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });

    // Initial paint
    requestAnimationFrame(renderParallax);
  })();

  // -------------------------------------------------------------------------
  // 8. Continuous Scroll-Driven Parallax for Product Rows (Bidirectional)
  //    Left column starts from left (-100%) -> moves to original position (0)
  //    Right column starts from right (+100%) -> moves to original position (0)
  //    Smoothly follows scroll up and down without locking or clipping.
  // -------------------------------------------------------------------------
  (function initProductRowParallax() {
    const rows = Array.from(document.querySelectorAll('.product-row'));
    if (!rows.length) return;

    // Cache per-row references and progress
    const items = rows.map(row => {
      const left = row.firstElementChild;
      const right = row.lastElementChild;
      return {
        row,
        left,
        right,
        targetProgress: 0,
        currentProgress: -1, // start uninitialized to force first frame paint
        inView: true
      };
    });

    // Viewport-aware observer to prevent layout thrashing on off-screen rows
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const match = items.find(it => it.row === entry.target);
          if (match) {
            match.inView = entry.isIntersecting;
            if (entry.isIntersecting) requestTick();
          }
        });
      }, { rootMargin: '160px' });
      rows.forEach(r => observer.observe(r));
    }

    function clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }

    // Smooth hermite interpolation (smoothstep) for organic acceleration & deceleration
    function smoothstep(val) {
      const x = clamp(val, 0, 1);
      return x * x * (3 - 2 * x);
    }

    /**
     * Compute scroll progress for a row:
     * - Starts sliding in when row top enters viewport near bottom (vh * 0.95)
     * - Reaches 1 (natural 0 offset) when row top reaches comfortable reading position (vh * 0.36)
     * - As user scrolls BACK UP, progress goes back from 1 down to 0, sliding elements back out.
     */
    function computeTargetProgress(row) {
      const rect = row.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.95;
      const end   = vh * 0.36;
      const raw = (start - rect.top) / (start - end);
      return smoothstep(raw);
    }

    function renderItem(item) {
      const p = item.currentProgress;

      // When settled (p >= 0.995), clean up inline styles so text and cards are 100% sharp
      if (p >= 0.995) {
        if (item.left) {
          item.left.style.transform = '';
          item.left.style.opacity = '1';
        }
        if (item.right) {
          item.right.style.transform = '';
          item.right.style.opacity = '1';
        }
        return;
      }

      // Responsive safe parallax horizontal travel (guaranteed inside viewport margins)
      const isMobile = window.innerWidth <= 768;
      const isTablet = window.innerWidth <= 1024;
      let maxShiftX = 50;
      if (isMobile) {
        maxShiftX = 14;
      } else if (isTablet) {
        maxShiftX = 24;
      } else {
        const screenMargin = Math.max(20, (window.innerWidth - 1240) / 2);
        maxShiftX = Math.min(60, Math.max(25, screenMargin * 0.45));
      }

      const factor = (1 - p);
      const shiftX = factor * maxShiftX;
      const shiftY = factor * 18; // subtle vertical depth

      // Bidirectional glide: left child glides from left (-shiftX) -> 0; right child glides from right (+shiftX) -> 0
      const leftTranslateX  = -shiftX;
      const rightTranslateX = +shiftX;
      const opacity = clamp(p * 1.4, 0, 1);

      if (item.left) {
        item.left.style.transform = `translate3d(${leftTranslateX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0)`;
        item.left.style.opacity   = opacity.toFixed(3);
      }
      if (item.right) {
        item.right.style.transform = `translate3d(${rightTranslateX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0)`;
        item.right.style.opacity   = opacity.toFixed(3);
      }
    }

    let rafId = null;

    function tick() {
      let active = false;

      items.forEach(item => {
        // Skip off-screen rows that are already settled
        if (!item.inView && item.currentProgress >= 0 && Math.abs(item.targetProgress - item.currentProgress) < 0.005) {
          return;
        }

        item.targetProgress = computeTargetProgress(item.row);

        if (item.currentProgress < 0) {
          // Initial first frame jump directly to target
          item.currentProgress = item.targetProgress;
          renderItem(item);
          return;
        }

        const delta = item.targetProgress - item.currentProgress;
        if (Math.abs(delta) > 0.001) {
          // Lerp factor 0.12 provides fluid inertial glide
          item.currentProgress += delta * 0.12;
          renderItem(item);
          active = true;
        } else if (item.currentProgress !== item.targetProgress) {
          item.currentProgress = item.targetProgress;
          renderItem(item);
        }
      });

      if (active) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function requestTick() {
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    }

    // Connect with Lenis smooth scroll or native window scroll
    if (window.lenis) {
      window.lenis.on('scroll', requestTick);
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });

    // Initial paint
    requestAnimationFrame(tick);
  })();

  // -------------------------------------------------------------------------
  // 10. Interactive Parallax Scroller for Research Updates, Bottom CTA & Footer
  // -------------------------------------------------------------------------
  (function initBottomSectionsParallax() {
    const syncSection = document.querySelector('.sync-updates-section');
    const ctaSection = document.querySelector('.bottom-cta-section');
    const footerSection = document.querySelector('.site-footer');

    if (!syncSection && !ctaSection && !footerSection) return;

    // Elements cache
    const syncCard = syncSection ? syncSection.querySelector('.sync-updates-card') : null;
    const syncWatermark = syncSection ? syncSection.querySelector('.sync-watermark-text') : null;
    const syncContent = syncSection ? syncSection.querySelector('.sync-content-wrap') : null;

    const ctaContainer = ctaSection ? ctaSection.querySelector('.bottom-cta-container') : null;
    const ctaContent = ctaSection ? ctaSection.querySelector('.download-card-content') : null;
    const ctaCanvas = ctaSection ? document.getElementById('cta-stars-canvas') : null;

    const footerWatermark = footerSection ? footerSection.querySelector('.footer-abstract-watermark') : null;
    const footerTop = footerSection ? footerSection.querySelector('.footer-top') : null;

    let inView = {
      sync: true,
      cta: true,
      footer: true
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.target === syncSection) inView.sync = entry.isIntersecting;
          if (entry.target === ctaSection) inView.cta = entry.isIntersecting;
          if (entry.target === footerSection) inView.footer = entry.isIntersecting;
          if (entry.isIntersecting) requestTick();
        });
      }, { rootMargin: '120px' });

      if (syncSection) io.observe(syncSection);
      if (ctaSection) io.observe(ctaSection);
      if (footerSection) io.observe(footerSection);
    }

    function clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }

    function smoothstep(val) {
      const x = clamp(val, 0, 1);
      return x * x * (3 - 2 * x);
    }

    let rafId = null;

    // Smoothed progress states (for inertial easing)
    let syncProg = 0, targetSyncProg = 0;
    let ctaProg = 0, targetCtaProg = 0;
    let footerProg = 0, targetFooterProg = 0;

    function render() {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const isMobile = window.innerWidth <= 768;

      // ── 1. Sync Updates Section Parallax ──
      if (syncSection && inView.sync) {
        const rect = syncSection.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh + rect.height);
        targetSyncProg = clamp(raw, 0, 1);
        syncProg += (targetSyncProg - syncProg) * 0.12;

        const entrance = smoothstep((vh * 0.95 - rect.top) / (vh * 0.65));

        if (syncCard) {
          const cardScale = isMobile ? 1 : 0.96 + 0.04 * entrance;
          const cardY = (1 - entrance) * (isMobile ? 16 : 32);
          syncCard.style.transform = `translate3d(0, ${cardY.toFixed(1)}px, 0) scale(${cardScale.toFixed(4)})`;
        }

        if (syncWatermark) {
          const maxDriftX = isMobile ? 30 : 75;
          const driftX = (syncProg - 0.5) * maxDriftX;
          const driftY = (syncProg - 0.5) * (isMobile ? 15 : 35);
          syncWatermark.style.transform = `translate3d(calc(-50% + ${driftX.toFixed(1)}px), ${driftY.toFixed(1)}px, 0)`;
        }

        if (syncContent) {
          const contentY = (1 - entrance) * (isMobile ? 10 : 20);
          syncContent.style.transform = `translate3d(0, ${contentY.toFixed(1)}px, 0)`;
        }
      }

      // ── 2. Bottom CTA Section Parallax ──
      if (ctaSection && inView.cta) {
        const rect = ctaSection.getBoundingClientRect();
        const raw = (vh - rect.top) / (vh + rect.height);
        targetCtaProg = clamp(raw, 0, 1);
        ctaProg += (targetCtaProg - ctaProg) * 0.12;

        const entrance = smoothstep((vh * 0.95 - rect.top) / (vh * 0.60));

        if (ctaContainer) {
          const containerScale = isMobile ? 1 : 0.95 + 0.05 * entrance;
          const containerY = (1 - entrance) * (isMobile ? 18 : 36);
          ctaContainer.style.transform = `translate3d(0, ${containerY.toFixed(1)}px, 0) scale(${containerScale.toFixed(4)})`;
        }

        if (ctaContent) {
          const floatY = (ctaProg - 0.5) * (isMobile ? -12 : -26);
          ctaContent.style.transform = `translate3d(0, ${floatY.toFixed(1)}px, 0)`;
        }

        if (ctaCanvas) {
          const canvasY = (ctaProg - 0.5) * (isMobile ? 10 : 22);
          ctaCanvas.style.transform = `translate3d(0, ${canvasY.toFixed(1)}px, 0)`;
        }
      }

      // ── 3. Site Footer Parallax ──
      if (footerSection && inView.footer) {
        const rect = footerSection.getBoundingClientRect();
        const raw = (vh - rect.top) / (rect.height + 60);
        targetFooterProg = clamp(raw, 0, 1);
        footerProg += (targetFooterProg - footerProg) * 0.12;

        if (footerWatermark) {
          const maxDriftX = isMobile ? 35 : 85;
          const driftX = (footerProg - 0.5) * maxDriftX;
          const driftY = (1 - footerProg) * (isMobile ? 15 : 30);
          footerWatermark.style.transform = `translate3d(calc(-50% + ${driftX.toFixed(1)}px), ${driftY.toFixed(1)}px, 0)`;
        }

        if (footerTop) {
          const topY = (1 - smoothstep(footerProg * 1.5)) * (isMobile ? 12 : 24);
          const topOpacity = clamp(0.65 + footerProg * 0.35, 0, 1);
          footerTop.style.transform = `translate3d(0, ${topY.toFixed(1)}px, 0)`;
          footerTop.style.opacity = topOpacity.toFixed(2);
        }
      }

      const isSyncActive = syncSection && inView.sync && Math.abs(targetSyncProg - syncProg) > 0.001;
      const isCtaActive = ctaSection && inView.cta && Math.abs(targetCtaProg - ctaProg) > 0.001;
      const isFooterActive = footerSection && inView.footer && Math.abs(targetFooterProg - footerProg) > 0.001;

      if (isSyncActive || isCtaActive || isFooterActive) {
        rafId = requestAnimationFrame(render);
      } else {
        rafId = null;
      }
    }

    function requestTick() {
      if (!rafId) {
        rafId = requestAnimationFrame(render);
      }
    }

    if (window.lenis) {
      window.lenis.on('scroll', requestTick);
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick, { passive: true });

    // Initial first paint
    requestAnimationFrame(render);
  })();

})();
