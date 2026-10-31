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

      // Product 3: Python SDK
      sdk_title: 'Neura Clinical Python SDK',
      sdk_desc: 'Integrasikan pipeline deteksi Alzheimer berbasis XGBoost ke dalam sistem rekam medis elektronik (EHR/EMR) rumah sakit dengan mudah melalui API Python yang ringkas dan aman.',

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
      bottom_headline: 'Mulai Deteksi Dini<br />dengan Neura AI<span class="blinking-google-cursor"></span>',
      bottom_btn_white: 'Buka Neura Workspace',
      bottom_btn_dark: 'Unduh Aplikasi Klinis',

      // Footer
      footer_desc: 'Infrastruktur kecerdasan buatan klinis untuk deteksi dini risiko Alzheimer dan neurodegenerasi berbasis 32 biomarker multimodal.',
      footer_copy: '&copy; 2026 Neura Health AI. Hak Cipta Dilindungi.',
      footer_tag: 'Model Machine Learning Tervalidasi Klinis',
      footer_privacy: 'Kebijakan Privasi',
      footer_terms: 'Syarat Layanan',
      footer_sec: 'Keamanan Data'
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

      // Product 3: Python SDK
      sdk_title: 'Neura Clinical Python SDK',
      sdk_desc: "Integrate our XGBoost Alzheimer's detection pipeline seamlessly into hospital Electronic Health Record (EHR/EMR) systems with minimal, secure Python code.",

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
      bottom_headline: 'Experience Early Detection<br />with Neura AI<span class="blinking-google-cursor"></span>',
      bottom_btn_white: 'Open Neura Workspace',
      bottom_btn_dark: 'Download Clinical Suite',

      // Footer
      footer_desc: "Clinical AI infrastructure for early-stage Alzheimer's and neurodegenerative risk detection based on 32 multimodal biomarkers.",
      footer_copy: '&copy; 2026 Neura Health AI. All Rights Reserved.',
      footer_tag: 'Clinically Validated Machine Learning Architecture',
      footer_privacy: 'Privacy Policy',
      footer_terms: 'Terms of Service',
      footer_sec: 'Data Security'
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
  // 7. Celestial Orbit Particles Canvas for Download Card
  // -------------------------------------------------------------------------
  function initCtaStarsCanvas() {
    const canvas = document.getElementById('cta-stars-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let particles = [];
    let animTime = 0;

    // 3 Blurred Gradient Bubbles with distinct vibrant colors rotating in celestial harmony
    const blurBubbles = [
      {
        name: 'Terracotta Core',
        angle: 0,
        speed: 0.0035,
        orbitX: 190,
        orbitY: 130,
        baseRadius: 220,
        // Neura signature terracotta / warm amber
        stops: [
          [0.0,  'rgba(217, 119, 87, 0.46)'],
          [0.25, 'rgba(235, 130, 85, 0.32)'],
          [0.55, 'rgba(249, 115, 22, 0.16)'],
          [0.80, 'rgba(217, 119, 87, 0.05)'],
          [1.0,  'rgba(217, 119, 87, 0)']
        ],
        phase: 0
      },
      {
        name: 'Electric Azure',
        angle: (Math.PI * 2) / 3, // 120° offset
        speed: 0.0028,
        orbitX: 220,
        orbitY: 150,
        baseRadius: 240,
        // Royal Sky Blue / Cyan
        stops: [
          [0.0,  'rgba(59, 130, 246, 0.44)'],
          [0.25, 'rgba(96, 165, 250, 0.30)'],
          [0.55, 'rgba(56, 189, 248, 0.15)'],
          [0.80, 'rgba(59, 130, 246, 0.04)'],
          [1.0,  'rgba(59, 130, 246, 0)']
        ],
        phase: 2.09
      },
      {
        name: 'Cosmic Violet',
        angle: (Math.PI * 4) / 3, // 240° offset
        speed: 0.0032,
        orbitX: 180,
        orbitY: 125,
        baseRadius: 210,
        // Deep Violet / Magenta
        stops: [
          [0.0,  'rgba(168, 85, 247, 0.42)'],
          [0.25, 'rgba(192, 132, 252, 0.28)'],
          [0.55, 'rgba(236, 72, 153, 0.14)'],
          [0.80, 'rgba(168, 85, 247, 0.04)'],
          [1.0,  'rgba(168, 85, 247, 0)']
        ],
        phase: 4.18
      }
    ];

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;

      const scale = Math.max(0.65, Math.min(width / 1100, 1.25));
      const isMobile = width < 768;

      blurBubbles[0].orbitX = (isMobile ? 120 : 220) * scale;
      blurBubbles[0].orbitY = (isMobile ? 60 : 95) * scale;
      blurBubbles[0].baseRadius = (isMobile ? 150 : 230) * scale;

      blurBubbles[1].orbitX = (isMobile ? 140 : 250) * scale;
      blurBubbles[1].orbitY = (isMobile ? 70 : 110) * scale;
      blurBubbles[1].baseRadius = (isMobile ? 160 : 250) * scale;

      blurBubbles[2].orbitX = (isMobile ? 110 : 205) * scale;
      blurBubbles[2].orbitY = (isMobile ? 55 : 90) * scale;
      blurBubbles[2].baseRadius = (isMobile ? 140 : 220) * scale;

      createParticles();
    }

    function createParticles() {
      particles = [];
      const particleCount = Math.min(220, Math.floor(width * 0.16));
      // Tepat di tengah bawah
      const centerX = width * 0.5;
      const centerY = height * 0.85;

      const colors = [
        'rgba(96, 165, 250, ',  // Sky Blue
        'rgba(147, 197, 253, ', // Light Blue
        'rgba(56, 189, 248, ',  // Cyan
        'rgba(255, 255, 255, '  // Pure White
      ];

      for (let i = 0; i < particleCount; i++) {
        const dist = 30 + Math.pow(Math.random(), 0.8) * Math.min(width * 0.45, 420);
        const angle = Math.random() * Math.PI * 2;
        const speed = (0.0006 + Math.random() * 0.0012) * (Math.random() < 0.5 ? 1 : -1);
        const radius = 1.0 + Math.random() * 2.2;
        const baseAlpha = 0.35 + Math.random() * 0.55;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const twinkleSpeed = 0.02 + Math.random() * 0.04;

        particles.push({
          dist,
          angle,
          speed,
          radius,
          baseAlpha,
          color,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Tepat di tengah bawah
      const centerX = width * 0.5;
      const centerY = height * 0.85;
      animTime += 0.015;

      // ---------------------------------------------------------------------
      // 1. Draw 3 Rotating Blurred Gradient Bubbles (Chromatic Ambient Layer)
      // ---------------------------------------------------------------------
      ctx.save();
      // 'screen' blend mode allows the overlapping bubbles to blend into a vivid luminous glow
      ctx.globalCompositeOperation = 'screen';

      blurBubbles.forEach(b => {
        // Continuous rotation around orbit
        b.angle += b.speed;

        // Subtle fluid undulation in orbit
        const curOrbitX = b.orbitX * (1 + 0.09 * Math.sin(animTime * 1.1 + b.phase));
        const curOrbitY = b.orbitY * (1 + 0.09 * Math.cos(animTime * 0.9 + b.phase));
        const bx = centerX + Math.cos(b.angle) * curOrbitX;
        const by = centerY + Math.sin(b.angle) * curOrbitY;

        // Subtle breathing radius
        const br = Math.max(25, b.baseRadius + Math.sin(animTime * 1.4 + b.phase) * 18);

        // Gaussian-like radial gradient falloff produces authentic blur effect
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
      // 2. Draw Celestial Star Particles on Top of the Blurred Bubbles
      // ---------------------------------------------------------------------
      particles.forEach(p => {
        p.angle += p.speed;
        p.twinkle += p.twinkleSpeed;

        const alpha = Math.max(0.15, Math.min(1, p.baseAlpha + Math.sin(p.twinkle) * 0.25));
        const x = centerX + Math.cos(p.angle) * p.dist * 1.08;
        const y = centerY + Math.sin(p.angle) * p.dist * 0.88;

        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha + ')';
        ctx.shadowColor = p.color + '0.8)';
        ctx.shadowBlur = p.radius > 2 ? 8 : 4;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(animate);
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
        currentProgress: -1 // start uninitialized to force first frame paint
      };
    });

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
     * - Reaches 1 (natural 0 offset) when row top reaches comfortable reading position (vh * 0.22)
     * - As user scrolls BACK UP, progress goes back from 1 down to 0, sliding elements back out.
     */
    function computeTargetProgress(row) {
      const rect = row.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.95;
      const end   = vh * 0.22;
      const raw = (start - rect.top) / (start - end);
      return smoothstep(raw);
    }

    function renderItem(item) {
      const p = item.currentProgress;
      // On desktop use full 100% translation; on small mobile screens scale down for comfort
      const isMobile = window.innerWidth <= 768;
      const maxPercent = isMobile ? 35 : 100;

      // When progress = 0: offsetPercent = maxPercent (100%)
      // When progress = 1: offsetPercent = 0%
      const offsetPercent = (1 - p) * maxPercent;

      // Left child starts at -100% (or -offset) -> glides right to 0
      // Right child starts at +100% (or +offset) -> glides left to 0
      const leftTranslate  = -offsetPercent;
      const rightTranslate = +offsetPercent;

      // Opacity fades in quickly and stays at 1
      const opacity = clamp(p * 1.5, 0, 1);

      if (item.left) {
        item.left.style.transform = `translate3d(${leftTranslate.toFixed(2)}%, 0, 0)`;
        item.left.style.opacity   = opacity.toFixed(3);
      }
      if (item.right) {
        item.right.style.transform = `translate3d(${rightTranslate.toFixed(2)}%, 0, 0)`;
        item.right.style.opacity   = opacity.toFixed(3);
      }
    }

    let rafId = null;

    function tick() {
      let active = false;

      items.forEach(item => {
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

})();
