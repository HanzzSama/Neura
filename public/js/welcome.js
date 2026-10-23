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
<span class="code-keyword">from</span> neura.clinical <span class="code-keyword">import</span> AlzheimersXGBoost, PatientProfile
<span class="code-keyword">from</span> neura.analytics <span class="code-keyword">import</span> generate_clinical_report

<span class="code-comment"># Evaluasi rekam medis pasien dengan 32 biomarker klinis</span>
<span class="code-keyword">def</span> <span class="code-fn">evaluate_patient_risk</span>(patient_id: <span class="code-type">str</span>):
    model = AlzheimersXGBoost.<span class="code-fn">load_checkpoint</span>(<span class="code-string">"xgboost_alzheimers.json"</span>)
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
  // 4. Bilingual Toggle (Indonesian / English)
  // -------------------------------------------------------------------------
  const langBtn = document.getElementById('lang-toggle-btn');
  let currentLang = 'ID';

  const translations = {
    ID: {
      nav_products: 'Platform',
      nav_usecases: 'Kasus Klinis',
      nav_pricing: 'Biomarker',
      nav_enterprise: 'Rumah Sakit',
      nav_resources: 'Riset',
      btn_download: 'Download',
      btn_consult: 'Mulai Diagnosis',
      hero_headline: 'Deteksi Dini Risiko Alzheimer dengan AI Berbasis 32 Biomarker Klinis',
      hero_sub_btn: 'Buka Neura Workspace ➔',
      intro_btn: 'Simulasi Diagnostik ▶',
      statement_eyebrow: 'TENTANG PLATFORM',
      statement_p1: 'Neura adalah sistem kecerdasan buatan klinis mutakhir yang dirancang untuk mendeteksi indikasi awal <strong>Alzheimer, Mild Cognitive Impairment (MCI)</strong>, dan gangguan neurodegeneratif lain sejak stadium paling awal.',
      statement_p2: 'Didukung oleh arsitektur machine learning <strong>XGBoost</strong> berkecepatan tinggi yang telah dilatih menggunakan parameter biomarker klinis komprehensif, Neura mampu memetakan gejala memori, fungsi eksekutif, dan faktor risiko neurologis secara presisi dengan akurasi mencapai <strong>95.8%</strong>.',
      statement_p3: 'Tidak seperti pemeriksaan konvensional yang mahal dan lambat, Neura memberikan analisis terstruktur dalam kurang dari 1.2 detik, langsung dari browser Anda.',
      app_title: 'Neura Clinical App',
      app_desc: 'Pusat komando klinis untuk mengevaluasi pasien, memonitor 32 biomarker neuro-kognitif, dan mengalkulasi probabilitas risiko penyakit Alzheimer secara instan melalui antarmuka interaktif.',
      ide_title: 'Neura Diagnostic Studio',
      ide_desc: 'Lingkungan diagnostik interaktif untuk tenaga medis. Dilengkapi kalkulator 32 biomarker, kurva presisi ROC-AUC 93.3%, serta ringkasan riwayat kognitif terstruktur.',
      sdk_title: 'Neura Clinical Python SDK',
      sdk_desc: 'Integrasikan pipeline deteksi Alzheimer berbasis XGBoost ke dalam sistem rekam medis elektronik (EHR/EMR) rumah sakit dengan mudah melalui API Python yang ringkas dan aman.',
      cli_title: 'Neura Clinical CLI',
      cli_desc: 'Antarmuka terminal berkecepatan tinggi untuk evaluasi massal ribuan data pasien, validasi matriks konfusi, dan pengujian model XGBoost langsung dari keyboard.',
      blog_headline: 'Riset Klinis & Publikasi Terkini',
      blog_see_all: 'Lihat Semua Riset',
      bottom_headline: 'Mulai Deteksi Dini dengan Neura AI',
      bottom_sub: 'Buka aplikasi web interaktif kami atau integrasikan SDK klinis langsung ke sistem rekam medis Anda.'
    },
    EN: {
      nav_products: 'Platform',
      nav_usecases: 'Clinical Use Cases',
      nav_pricing: 'Biomarkers',
      nav_enterprise: 'Hospitals',
      nav_resources: 'Research',
      btn_download: 'Download',
      btn_consult: 'Start Diagnosis',
      hero_headline: "Early Alzheimer's Detection Powered by 32 Clinical Biomarkers & AI",
      hero_sub_btn: 'Open Neura Workspace ➔',
      intro_btn: 'Diagnostic Demo ▶',
      statement_eyebrow: 'ABOUT PLATFORM',
      statement_p1: "Neura is a cutting-edge clinical artificial intelligence system designed to detect early indicators of <strong>Alzheimer's, Mild Cognitive Impairment (MCI)</strong>, and other neurodegenerative conditions from their earliest stages.",
      statement_p2: 'Powered by high-throughput <strong>XGBoost</strong> machine learning architecture trained on comprehensive clinical biomarkers, Neura accurately maps memory impairment, executive function, and neurological risk factors with up to <strong>95.8%</strong> accuracy.',
      statement_p3: 'Unlike expensive, time-consuming conventional screenings, Neura delivers structured diagnostic evaluations in under 1.2 seconds, directly from your browser.',
      app_title: 'Neura Clinical App',
      app_desc: "Your clinical mission control to evaluate patient records, track 32 neuro-cognitive biomarkers, and assess Alzheimer's risk probability in real time via an interactive UI.",
      ide_title: 'Neura Diagnostic Studio',
      ide_desc: 'An end-to-end clinical diagnostic studio for doctors and researchers. Equipped with a 32-biomarker calculator, ROC-AUC 93.3% precision curves, and structured cognitive decline timelines.',
      sdk_title: 'Neura Clinical Python SDK',
      sdk_desc: "Integrate our XGBoost Alzheimer's detection pipeline seamlessly into hospital Electronic Health Record (EHR/EMR) systems with minimal Python code.",
      cli_title: 'Neura Clinical CLI',
      cli_desc: 'The high-throughput terminal engine for bulk patient evaluation, confusion matrix validation, and clinical model testing directly from your keyboard.',
      blog_headline: 'Latest Clinical Research & Publications',
      blog_see_all: 'View all research',
      bottom_headline: "Experience Early Detection with Neura AI",
      bottom_sub: "Launch our web workspace or deploy the clinical SDK directly into your neurological healthcare pipeline."
    }
  };

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      currentLang = currentLang === 'ID' ? 'EN' : 'ID';
      langBtn.innerHTML = `🌐 ${currentLang} <svg class="chevron" viewBox="0 0 24 24" width="16" height="16"><path d="M12 15L7.05 10.05L8.45 8.65L12 12.2L15.55 8.65L16.95 10.05L12 15Z"></path></svg>`;

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
          el.innerHTML = translations[currentLang][key];
        }
      });
    });
  }

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

    function resize() {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
      createParticles();
    }

    function createParticles() {
      particles = [];
      const particleCount = Math.min(220, Math.floor(width * 0.16));
      const centerX = width * 0.72;
      const centerY = height * 0.5;

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

      const centerX = width * 0.72;
      const centerY = height * 0.5;

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
    const section  = document.getElementById('tools-carousel-section');
    const row1     = document.getElementById('tools-row-1');

    if (!section || !row1) return;

    // Strip starts from the leftmost position
    const ROW1_SPEED   =  0.35;   // px horizontal shift per px vertical scroll
    const INITIAL_OFFSET = 0;     // px — start from far left

    let lastScrollY  = window.scrollY;
    let currentX1    = INITIAL_OFFSET;
    let targetX1     = INITIAL_OFFSET;
    let rafId        = null;
    let ticking      = false;

    // Cache bubbles for the scale loop
    const bubbles = Array.from(row1.querySelectorAll('.tool-icon-bubble'));

    // Spotlight constants
    const MAX_SCALE   = 1.2;   // scale at dead-centre
    const MIN_SCALE   = 0.88;  // scale at outer edges
    const SCALE_ZONE  = 280;   // half-width (px) over which scale transitions

    function applySpotlightScale() {
      const viewCX = window.innerWidth / 2;
      bubbles.forEach(b => {
        const rect  = b.getBoundingClientRect();
        const bCX   = rect.left + rect.width / 2;
        const dist  = Math.abs(bCX - viewCX);
        // Linear interpolation: 0 dist → MAX_SCALE, SCALE_ZONE dist → MIN_SCALE
        const t     = Math.min(dist / SCALE_ZONE, 1);
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
        const sectionTop    = section.getBoundingClientRect().top + window.scrollY;
        const sectionCentre = sectionTop - window.innerHeight / 2;
        const progress      = window.scrollY - sectionCentre;

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

})();
