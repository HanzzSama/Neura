/**
 * struktur.js — Neura Architecture Diagram & Folder Explorer
 * Version 2.0 (Folder & File Cards, Code Showcase Drawer, Relations, Minimap, Context Menu)
 */

;(function () {
  'use strict';

  /* =====================================================================
     0. HELPERS
     ===================================================================== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmt_size = (bytes) => {
    if (!bytes && bytes !== 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  /* =====================================================================
     1. ARCHITECTURE DATA (Folder Cards & File Cards)
     ===================================================================== */
  /* =====================================================================
     1A. GENERAL ARCHITECTURE TOPOLOGY (Living Network Data-Flow)
     5 Pillars: UI Pages, Subsystems & Routers, LLM & AI, CSV Lake, Database
     ===================================================================== */
  const GENERAL_NODES = [
    // --- COLUMN 1: CLIENT & UI PAGES (x = 100) ---
    {
      id: 'page-welcome',
      kind: 'page',
      category: 'LANDING & AUTH',
      title: 'welcome.html',
      path: 'public/welcome.html',
      routeUrl: '/',
      previewImage: '/assets/prev-landing.png',
      desc: 'Halaman selamat datang, pengenalan sistem Neura, dan otentikasi onboarding pasien/dokter.',
      iconType: 'globe',
      borderVariant: 'card-border-cyan',
      ports: [{ side: 'right', type: 'green', symbol: '+' }],
      x: 100, y: 120,
    },
    {
      id: 'page-user',
      kind: 'page',
      category: 'PATIENT PORTAL',
      title: 'index.html (Pasien)',
      path: 'public/index.html',
      routeUrl: '/app',
      previewImage: '/assets/prev-dashboard.png',
      desc: 'Portal skrining mandiri Alzheimer, input 35 biomarker, riwayat tes kognitif, dan booking telemedis.',
      iconType: 'user',
      borderVariant: 'card-border-emerald',
      ports: [{ side: 'right', type: 'green', symbol: '+' }],
      x: 100, y: 320,
    },
    {
      id: 'page-nakes',
      kind: 'page',
      category: 'TELEMEDICINE ROOM',
      title: 'nakes (Dokter Room)',
      path: 'api/nakes/',
      routeUrl: '/app#telemedicine',
      previewImage: '/assets/prev-dashboard.png',
      desc: 'Ruang telekonsultasi dokter spesialis saraf, LiveKit video call terenkripsi, dan telaah hasil CDR.',
      iconType: 'doctor',
      borderVariant: 'card-border-teal',
      ports: [{ side: 'right', type: 'green', symbol: '+' }],
      x: 100, y: 520,
    },
    {
      id: 'page-admin',
      kind: 'page',
      category: 'ADMIN CONSOLE',
      title: 'admin (Governance)',
      path: 'api/admin/',
      routeUrl: '/app#admin',
      previewImage: '/assets/prev-dashboard.png',
      desc: 'Manajemen persetujuan lisensi dokter, audit RBAC, monitoring kuota inferensi & system logs.',
      iconType: 'shield',
      borderVariant: 'card-border-coral',
      ports: [{ side: 'right', type: 'green', symbol: '+' }],
      x: 100, y: 720,
    },
    {
      id: 'page-riset',
      kind: 'page',
      category: 'RESEARCH STUDIO',
      title: 'riset.html (Studio)',
      path: 'public/riset.html',
      routeUrl: '/riset',
      previewImage: '/assets/prev-riset.png',
      desc: 'Editor manuskrip publikasi klinis Word-style, format jurnal kedokteran, dan AI text polish.',
      iconType: 'pen',
      borderVariant: 'card-border-purple',
      ports: [{ side: 'right', type: 'green', symbol: '+' }],
      x: 100, y: 920,
    },

    // --- COLUMN 2: SUBSYSTEMS & ROUTERS (x = 520) ---
    {
      id: 'subsys-core',
      kind: 'folder',
      category: 'CORE ENGINE',
      title: 'Neura Core Hub',
      path: 'core/ & server.py',
      desc: 'Server Flask modular, life-cycle manager, pre-warming ML, auth session guard, dan logger.',
      iconType: 'server',
      borderVariant: 'card-border-emerald',
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 520, y: 220,
    },
    {
      id: 'subsys-api',
      kind: 'folder',
      category: 'REST API ROUTER',
      title: 'API Endpoints & Routing',
      path: 'api/',
      desc: 'Blueprint modular pemisah rute user, nakes, admin, shared, status, dan LiveKit token generator.',
      iconType: 'api',
      borderVariant: 'card-border-blue',
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 520, y: 520,
    },
    {
      id: 'subsys-features',
      kind: 'folder',
      category: 'FEATURE PIPELINE',
      title: 'Biomarker Feature Pipeline',
      path: 'features/',
      desc: 'Ekstraksi & normalisasi 35 biomarker (MMSE, eTIV, nWBV, ASF, Age) ke format tensor siap inferensi.',
      iconType: 'pipeline',
      borderVariant: 'card-border-amber',
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'top', type: 'green', symbol: '+' }
      ],
      x: 520, y: 720,
    },

    // --- COLUMN 3: LLM & AI MULTIMODAL ENGINE (x = 940) ---
    {
      id: 'ai-llm',
      kind: 'llm',
      category: 'CLINICAL LLM AGENT',
      title: 'LLM Clinical Reasoning (Gemma 2 2B)',
      path: 'api/user/user_chat.py',
      modelFile: 'gemma-2-2b-it-q4_k_m.gguf',
      modelName: 'Gemma 2 2B Instruct',
      quantization: 'Q4_K_M',
      sizeMb: '1629.4 MB',
      speed: '24 tok/s',
      backend: 'CPU Engine',
      desc: 'Model bahasa medis untuk asistensi diagnosa, konsultasi anamnesis interaktif, dan pemoles naskah riset.',
      iconType: 'brain',
      borderVariant: 'card-border-purple',
      hero: true,
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 940, y: 360,
    },
    {
      id: 'ai-ml',
      kind: 'ai',
      category: 'MULTIMODAL AI SINK',
      title: 'ML Models & Alzheimer Engine',
      path: 'training/',
      desc: 'Ensemble Deep Learning & PyTorch estimasi skor probabilitas CDR (Clinical Dementia Rating).',
      iconType: 'brain',
      borderVariant: 'card-border-cyan',
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'top', type: 'green', symbol: '+' }
      ],
      x: 940, y: 680,
    },

    // --- COLUMN 4: CSV TABULAR DATA LAKE (x = 1360) ---
    {
      id: 'data-csv',
      kind: 'csv',
      category: 'TABULAR DATA LAKE',
      title: 'alzheimers_disease_data.csv',
      path: 'data/alzheimers_disease_data.csv',
      desc: 'Kohort OASIS 2.149 baris rekaman klinis, 35 parameter kognitif & MRI untuk baseline verifikasi.',
      iconType: 'database',
      borderVariant: 'card-border-gold',
      count: '2149 Baris',
      ports: [
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' }
      ],
      x: 1360, y: 520,
    },

    // --- COLUMN 5: FIRESTORE DATABASE & STORAGE (x = 1780) ---
    {
      id: 'db-users',
      kind: 'database',
      category: 'AUTH & PROFILES',
      title: 'Firestore: users',
      name: 'users',
      path: 'firestore/users',
      desc: 'Penyimpanan identitas pasien, profil kredensial dokter terverifikasi, dan hak akses RBAC.',
      iconType: 'users',
      borderVariant: 'card-border-cyan',
      ports: [{ side: 'left', type: 'green', symbol: '+' }],
      x: 1780, y: 160,
    },
    {
      id: 'db-consultations',
      kind: 'database',
      category: 'TELEMEDICINE',
      title: 'Firestore: consultations',
      name: 'consultations',
      path: 'firestore/consultations',
      desc: 'Catatan rekam medis terenkripsi, transkrip telekonsultasi, rekomendasi obat & rujukan dokter.',
      iconType: 'consultations',
      borderVariant: 'card-border-cyan',
      ports: [{ side: 'left', type: 'green', symbol: '+' }],
      x: 1780, y: 340,
    },
    {
      id: 'db-predictions',
      kind: 'database',
      category: 'AI INFERENCE SINK',
      title: 'Firestore: predictions',
      name: 'predictions',
      path: 'firestore/predictions',
      desc: 'Sink riwayat skor probabilitas CDR pasien, confidence level, dan rekomendasi tindak lanjut.',
      iconType: 'predictions',
      borderVariant: 'card-border-cyan',
      ports: [{ side: 'left', type: 'green', symbol: '+' }],
      x: 1780, y: 520,
    },
    {
      id: 'db-sessions',
      kind: 'database',
      category: 'SESSION STORE',
      title: 'Local Disk: sessions',
      name: 'sessions',
      path: 'core/auth_middleware.py',
      desc: 'State session token login aktif, cookie security, dan expiry time guard berbasis disk.',
      iconType: 'sessions',
      borderVariant: 'card-border-neutral',
      ports: [{ side: 'left', type: 'green', symbol: '+' }],
      x: 1780, y: 700,
    },
    {
      id: 'db-ml_logs',
      kind: 'database',
      category: 'AUDIT & TELEMETRY',
      title: 'Firestore: ml_logs',
      name: 'ml_logs',
      path: 'firestore/ml_logs',
      desc: 'Log performa inferensi real-time, latensi ms GPU/CPU, and audit trail komputasi model.',
      iconType: 'ml_logs',
      borderVariant: 'card-border-cyan',
      ports: [{ side: 'left', type: 'green', symbol: '+' }],
      x: 1780, y: 880,
    },
  ];

  const GENERAL_CONNECTIONS = [
    // Halaman -> Subsystems (Fast real-time live packet stream)
    ['page-welcome',     'subsys-core',      'stream',   'Auth Request'],
    ['page-user',        'subsys-api',       'stream',   'Patient Screening'],
    ['page-nakes',       'subsys-api',       'stream',   'Telemedicine Session'],
    ['page-admin',       'subsys-core',      'stream',   'Governance RBAC'],
    ['page-riset',       'ai-llm',           'stream',   'AI Manuskrip Polish'],

    // Subsystems -> Feature Pipeline & AI
    ['subsys-api',       'subsys-features',  'packet',   '35 Biomarkers Stream'],
    ['subsys-api',       'ai-llm',           'stream',   'NLP Dialog Engine'],
    ['subsys-features',  'ai-ml',            'packet',   'Tensor Normalization'],
    ['subsys-core',      'ai-ml',            'core',     'Pre-warm Model Pipe'],

    // AI & Tabular Data Lake
    ['data-csv',         'ai-ml',            'dataflow', 'OASIS Benchmark Feed'],
    ['data-csv',         'subsys-features',  'dataflow', 'Baseline Imputation'],

    // Subsystem & AI -> Database Sink
    ['subsys-core',      'db-sessions',      'auth',     'Token Guard'],
    ['subsys-api',       'db-users',         'packet',   'Profile & Credential'],
    ['page-nakes',       'db-consultations', 'stream',   'E-Prescription & Notes'],
    ['ai-ml',            'db-predictions',   'packet',   'Save CDR Probabilities'],
    ['ai-llm',           'db-consultations', 'stream',   'Clinical Diagnosis Summary'],
    ['ai-ml',            'db-ml_logs',       'core',     'GPU Latency & Telemetry'],
  ];

  const INITIAL_NODES = [
    // --- COLUMN 1 (Frontend & Styles) ---
    {
      id: 'file-style-css',
      kind: 'file',
      category: 'STYLESHEET',
      title: 'style.css',
      path: 'public/css/style.css',
      lang: 'css',
      ext: '.css',
      size: 92800,
      iconType: 'palette',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      previewCode: `:root {\n  --primary: #D97757;\n  --bg-dark: #121110;\n  --text-main: #FAF9F5;\n}\n.admin-room { display: flex; }`,
      x: 120, y: 150,
      parentId: 'node-frontend',
    },
    {
      id: 'node-frontend',
      kind: 'folder',
      category: 'UI / FRONTEND',
      title: 'public/ (Dashboard SPA)',
      path: 'public/',
      desc: 'Semua halaman SPA: Dashboard (index.html), Struktur Folder, Halaman Sambutan (welcome.html), aset & gaya.',
      iconType: 'folder',
      borderVariant: 'card-border-emerald',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 120, y: 260,
    },
    {
      id: 'file-riset-js',
      kind: 'file',
      category: 'JAVASCRIPT',
      title: 'riset.js',
      path: 'public/js/riset.js',
      lang: 'javascript',
      ext: '.js',
      size: 82400,
      iconType: 'code',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' }
      ],
      previewCode: `// riset.js - Word Style Research Editor\n;(function() {\n  'use strict';\n  function formatDoc(cmd, val) {\n    document.execCommand(cmd, false, val);\n  }`,
      x: 120, y: 400,
      parentId: 'node-riset',
    },
    {
      id: 'node-riset',
      kind: 'folder',
      category: 'STUDIO ENGINE',
      title: 'Research Studio Module',
      path: 'public/riset.html',
      desc: 'Editor naskah klinis bergaya Word: format heading, bold, italic, thumbnail, publikasi, dan AI polish.',
      iconType: 'pen',
      borderVariant: 'card-border-purple',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' }
      ],
      x: 120, y: 510,
    },

    // --- COLUMN 2 (Core Server & Logging & Datasets) ---
    {
      id: 'file-server-py',
      kind: 'file',
      category: 'PYTHON ENTRY',
      title: 'server.py',
      path: 'server.py',
      lang: 'python',
      ext: '.py',
      size: 11450,
      iconType: 'python',
      borderVariant: 'card-border-emerald',
      ports: [
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      previewCode: `"""\nserver.py - Modular Flask web server\nBridges frontend SPA to backend ML.\n"""\nfrom flask import Flask\napp = Flask(__name__)`,
      x: 520, y: 150,
      parentId: 'node-core',
    },
    {
      id: 'node-core',
      kind: 'folder',
      category: 'CORE ENGINE',
      title: 'Neura Core Hub',
      path: 'core/ & server.py',
      desc: 'Server Flask modular, router blueprint, secure session, logger, dan pre-warm ML library.',
      iconType: 'server',
      borderVariant: 'card-border-emerald',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' }
      ],
      x: 520, y: 260,
    },
    {
      id: 'file-core-logger',
      kind: 'file',
      category: 'LOGGING UTILITY',
      title: 'logger.py',
      path: 'core/logger.py',
      lang: 'python',
      ext: '.py',
      size: 2048,
      iconType: 'terminal',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      previewCode: `import logging\nimport os\n\ndef get_logger(name):\n    logger = logging.getLogger(name)\n    return logger`,
      x: 520, y: 390,
      parentId: 'node-core',
    },
    {
      id: 'node-data',
      kind: 'folder',
      category: 'DATASETS',
      title: 'Datasets & 32 Biomarkers',
      path: 'datasets/ / data/',
      desc: 'Dataset OASIS multimodal, file JSON riset, 32 fitur biomarker klinis Alzheimer, label validasi.',
      iconType: 'database',
      borderVariant: 'card-border-amber',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'right', type: 'green', symbol: '+' }
      ],
      x: 520, y: 500,
    },
    {
      id: 'file-research-json',
      kind: 'file',
      category: 'DATA JSON',
      title: 'research_updates.json',
      path: 'datasets/research_updates.json',
      lang: 'json',
      ext: '.json',
      size: 15360,
      iconType: 'json',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'top', type: 'green', symbol: '+' }
      ],
      previewCode: `[\n  {\n    "id": "res-001",\n    "title": "Validasi 32 Biomarker",\n    "status": "published"\n  }\n]`,
      x: 520, y: 610,
      parentId: 'node-data',
    },

    // --- COLUMN 3 (REST API, Auth, AI Engine & Scripts) ---
    {
      id: 'file-admin-auth',
      kind: 'file',
      category: 'TRIGGER',
      title: 'admin_auth.py',
      path: 'api/admin/admin_auth.py',
      lang: 'python',
      ext: '.py',
      size: 8192,
      iconType: 'cyclone',
      borderVariant: 'card-border-coral',
      alert: true,
      ports: [
        { side: 'top', type: 'red', symbol: '-' },
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      previewCode: `from flask import Blueprint, request\nadmin_auth_bp = Blueprint("admin_auth", __name__)\n\n@admin_auth_bp.route("/login")\ndef login(): ...`,
      x: 920, y: 150,
      parentId: 'node-api',
    },
    {
      id: 'node-api',
      kind: 'folder',
      category: 'REST API ROUTER',
      title: 'API Endpoints & Routing',
      path: 'api/',
      desc: 'Modular REST API: admin_auth, admin_ml, admin_research, nakes_consultation, user_predict, user_chat, LiveKit.',
      iconType: 'api',
      borderVariant: 'card-border-blue',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      x: 920, y: 260,
    },
    {
      id: 'node-ml',
      kind: 'folder',
      category: 'AI / MULTIMODAL',
      title: 'ML Models & Alzheimer Engine',
      path: 'modelsLLM/ / features/',
      desc: 'Pipeline inferensi multimodal: 32 biomarker, model GGUF LLM bridge, XGBoost, checkpoint PyTorch.',
      iconType: 'brain',
      borderVariant: 'card-border-purple',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      x: 920, y: 400,
    },
    {
      id: 'node-scripts',
      kind: 'folder',
      category: 'AUTOMATION PIPELINE',
      title: 'Scripts & Dev Automation',
      path: 'scripts/ / configs/',
      desc: 'Pipeline setup, pre-training scripts, test suite, seed data, konfigurasi deployment dan environment.',
      iconType: 'terminal',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      x: 920, y: 520,
    },

    // --- COLUMN 4 (App Subsystems, Features & Training) ---
    {
      id: 'node-app',
      kind: 'folder',
      category: 'APP ARCHITECTURE',
      title: 'app/ (Modular Subsystems)',
      path: 'app/',
      desc: 'Submodul internal aplikasi Neura: services, router, dan state management.',
      iconType: 'folder',
      borderVariant: 'card-border-emerald',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 1320, y: 150,
    },
    {
      id: 'node-features',
      kind: 'folder',
      category: 'FEATURE ENGINEERING',
      title: 'features/ (Extraction)',
      path: 'features/',
      desc: 'Feature extraction EEG, pemrosesan audio/suara, dan transformasi dataset 32 biomarker.',
      iconType: 'folder',
      borderVariant: 'card-border-purple',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 1320, y: 270,
    },
    {
      id: 'node-training',
      kind: 'folder',
      category: 'MODEL TRAINING',
      title: 'training/ (PyTorch & Tuning)',
      path: 'training/',
      desc: 'Script pelatihan model, validasi loss k-fold, dan checkpoint ML Alzheimer.',
      iconType: 'folder',
      borderVariant: 'card-border-purple',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 1320, y: 390,
    },
    {
      id: 'node-configs',
      kind: 'folder',
      category: 'SYSTEM CONFIG',
      title: 'configs/ & tests/',
      path: 'configs/ / tests/',
      desc: 'Konfigurasi YAML/JSON runtime, unit test, dan validasi fungsional backend.',
      iconType: 'folder',
      borderVariant: 'card-border-neutral',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' },
        { side: 'bottom', type: 'green', symbol: '+' }
      ],
      x: 1320, y: 510,
    },
    {
      id: 'node-data-raw',
      kind: 'folder',
      category: 'DATA STORAGE',
      title: 'data/ & scratch/',
      path: 'data/ / scratch/',
      desc: 'Penyimpanan data mentah, cache lokal, dan scratch script eksperimental.',
      iconType: 'folder',
      borderVariant: 'card-border-amber',
      ports: [
        { side: 'top', type: 'green', symbol: '+' },
        { side: 'left', type: 'green', symbol: '+' }
      ],
      x: 1320, y: 630,
    },
  ];

  /* Comprehensive Relations: [sourceId, targetId, type, label] */
  const INITIAL_CONNECTIONS = [
    // Column 4 linkages
    ['node-app',      'node-core',          'calls',      'Extends Core'],
    ['node-features', 'node-ml',            'provides',   'Biomarker Feats'],
    ['node-training', 'node-ml',            'provides',   'Weights & Model'],
    ['node-configs',  'node-core',          'provides',   'Environment'],
    ['node-data-raw', 'node-data',          'contains',   'Raw Lake'],

    // Folder to File (contains)
    ['node-core',     'file-server-py',     'contains',   'Entry Point'],
    ['node-core',     'file-core-logger',   'contains',   'Logging Hub'],
    ['node-api',      'file-admin-auth',    'contains',   'Contains'],
    ['node-riset',    'file-riset-js',      'contains',   'Contains'],
    ['node-frontend', 'file-style-css',     'contains',   'Contains'],
    ['node-data',     'file-research-json', 'contains',   'Contains'],

    // File to File / Calls
    ['file-server-py',    'file-core-logger', 'imports',  'get_logger'],
    ['file-server-py',    'node-api',         'calls',    'Blueprint Mount'],
    ['file-admin-auth',   'file-core-logger', 'imports',  'get_logger'],
    ['file-riset-js',     'node-ml',          'calls',    'AI Polish'],

    // High level module to module
    ['node-core',     'node-frontend',  'default', 'Serve HTML'],
    ['node-core',     'node-ml',        'core',    'Warmup Pipe'],
    ['node-api',      'node-ml',        'ml',      'Predict API'],
    ['node-frontend', 'node-riset',     'default', 'Studio Link'],
    ['node-ml',       'node-data',      'ml',      'OASIS Feed'],
    ['node-core',     'node-scripts',   'default', 'Toolchain'],
  ];

  /* Sticky notes — placed in empty space ABOVE the first node row (y=150) with generous gap */
  const STICKY_NOTES = [
    {
      id: 'note-1',
      text: 'Klik kartu berkas (File Card) seperti server.py atau riset.js untuk melihat kode langsung di Code Showcase Drawer!',
      x: 120, y: -170,
      avatar: 'HZ', avatarColor: '#D97757',
      timestamp: 'Baru saja',
    },
    {
      id: 'note-2',
      text: 'Relasi antar file dan folder kini tersambung dinamis (contains, imports, calls, provides).',
      x: 920, y: -170,
      avatar: 'SK', avatarColor: '#7C3AED',
      timestamp: '1 hari lalu',
    },
  ];

  /* =====================================================================
     2. APP STATE
     ===================================================================== */
  const STATE = {
    tx: 0, ty: 0, scale: 1,
    minScale: 0.2, maxScale: 3.0,
    mode: 'select',
    isPanning: false,
    panStartX: 0, panStartY: 0, panStartTx: 0, panStartTy: 0,
    draggingNode: null,
    dragOffX: 0, dragOffY: 0,
    nodes: JSON.parse(JSON.stringify(INITIAL_NODES)),
    connections: [...INITIAL_CONNECTIONS],
    stickies: JSON.parse(JSON.stringify(STICKY_NOTES)),
    treeData: null,
    treeExpanded: new Set(['public', 'api', 'datasets', 'modelsLLM', 'scripts']),
    activeTreeItem: null,
    activeNodeId: null,
    sidebarCollapsed: false,
    activeFilter: 'all',
    searchQuery: '',
    gridMode: 'dot',
    contextTargetNode: null,
    // Connect mode
    connectSource: null,       // { nodeId, side }
    connectType: 'default',
    // Lasso
    lassoStart: null,
    lassoActive: false,
    lassoSelected: new Set(),
    // Undo / Redo
    undoStack: [],
    redoStack: [],
    // â”€â”€ Explorer Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    explorerMode: false,        // true = filesystem explorer; false = architecture diagram
    explorerPath: [],           // current directory path stack e.g. ['api', 'admin']
    explorerTreeCache: null,    // cached /api/project-structure result (tree array)
    explorerCurrentItems: [],   // items currently rendered on canvas
    // â”€â”€ Database Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    databaseMode: false,
    dbCollections: [],
    activeDbCollection: null,
    activeDbDocs: [],
    // ── 3-Canvas View tracker ──────────────────────────────────
    canvasView: 'explorer',       // 'general' | 'explorer' | 'database'
    contextClickCoords: null,
    contextTargetElement: null,
  };

  /* =====================================================================
     3. DOM REFS
     ===================================================================== */
  let viewport, nodesLayer, connSvg, pathsGroup, badgesGroup;
  let canvasContainer, zoomBadge;
  let sidebar, toggleSidebarBtn;
  let treeRootEl, treeSummaryStats;
  let topbarSearch;
  let detailName, detailPath, detailTypeBadge, btnFocusCanvas;
  let statusSyncText, nodeCountEl, relCountEl;
  let canvasBreadcrumb, btnToggleExplorer;
  // Database components refs
  let btnToggleDb, dbDrawer, btnDbDrawerClose, dbDrawerTitle, dbDrawerSubtitle;
  let dbDrawerTypeBadge, dbDrawerCount, dbDrawerSearchInput, dbDrawerSchemaPills;
  let dbRecordsThead, dbRecordsTbody, dbDocInspector, dbInspectorId, dbInspectorCode;
  let btnDbCopyJson, btnCloseInspector;
  let tabBtnFiles, tabBtnDb, paneTabFiles, paneTabDb, sidebarDbList;
  // New components refs
  let codeDrawer, drawerBackdrop, drawerFileName, drawerFilePath, drawerLangBadge;
  let drawerCodeBlock, drawerLineNumbers, drawerOutline, drawerOutlineList, drawerRelationsPills;
  let btnDrawerCopy, btnDrawerClose;
  let contextMenu;
  let minimapCanvas, minimapViewportRect;

  /* =====================================================================
     4. INIT
     ===================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const steps = [
      ['cacheDOMRefs', cacheDOMRefs],
      ['attachCanvasEvents', attachCanvasEvents],
      ['attachToolbarEvents', attachToolbarEvents],
      ['attachTopbarEvents', attachTopbarEvents],
      ['attachSidebarEvents', attachSidebarEvents],
      ['attachCodeDrawerEvents', attachCodeDrawerEvents],
      ['attachDatabaseDrawerEvents', attachDatabaseDrawerEvents],
      ['attachContextMenuEvents', attachContextMenuEvents],
      ['attachFilterBarEvents', attachFilterBarEvents],
      ['attachMinimapEvents', attachMinimapEvents],
      ['attachConnectModeEvents', attachConnectModeEvents],
      ['attachLassoEvents', attachLassoEvents],
      ['initUndoRedo', initUndoRedo],
      ['loadFolderTree', loadFolderTree],
      // Launch into persisted page mode (Database Canvas or Explorer Mode)
      ['initPageMode', initPageMode],
    ];
    for (const [name, fn] of steps) {
      try { fn(); } catch(err) { console.error(`[Init] Error in ${name}:`, err); }
    }
  });

  function initPageMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view') || urlParams.get('mode');
    const colParam  = urlParams.get('col');
    let savedCanvas = null;
    try {
      savedCanvas = localStorage.getItem('neura_active_canvas') || localStorage.getItem('neura_active_mode');
    } catch(e) {}

    const target = viewParam || savedCanvas || 'explorer';

    if (target === 'database') {
      enterDatabaseMode().then(() => {
        if (colParam) setTimeout(() => openDatabaseDrawer(colParam), 250);
      });
    } else if (target === 'general') {
      enterGeneralMode();
    } else {
      enterExplorerMode([]);
    }
  }

  function cacheDOMRefs() {
    viewport        = $('#canvas-viewport');
    nodesLayer      = $('#canvas-nodes-layer');
    connSvg         = $('#canvas-connections-svg');
    pathsGroup      = $('#connections-paths-group');
    badgesGroup     = $('#connections-badges-group');
    canvasContainer = $('#canvas-container');
    zoomBadge       = $('#zoom-badge');
    sidebar         = $('#struktur-tree-sidebar');
    toggleSidebarBtn = $('#btn-toggle-sidebar');
    treeRootEl      = $('#folder-tree-root');
    treeSummaryStats = $('#tree-summary-stats');
    topbarSearch    = $('#topbar-search-input');
    detailName      = $('#detail-item-name');
    detailPath      = $('#detail-item-path');
    detailTypeBadge = $('#detail-type-badge');
    btnFocusCanvas  = $('#btn-focus-in-canvas');
    statusSyncText  = $('#status-sync-text');
    nodeCountEl     = $('#canvas-node-count');
    relCountEl      = $('#canvas-relation-count');

    // Code Drawer
    codeDrawer         = $('#code-preview-drawer');
    drawerBackdrop     = $('#drawer-backdrop');
    drawerFileName     = $('#drawer-file-name');
    drawerFilePath     = $('#drawer-file-path');
    drawerLangBadge    = $('#drawer-lang-badge');
    drawerCodeBlock    = $('#drawer-code-block');
    drawerLineNumbers  = $('#drawer-line-numbers');
    drawerOutline      = $('#drawer-outline');
    drawerOutlineList  = $('#drawer-outline-list');
    drawerRelationsPills = $('#drawer-relations-pills');
    btnDrawerCopy      = $('#btn-drawer-copy');
    btnDrawerClose     = $('#btn-drawer-close');

    // Context menu & minimap
    contextMenu        = $('#node-context-menu');
    minimapCanvas      = $('#minimap-nodes');
    minimapViewportRect = $('#minimap-viewport-rect');

    // Explorer Mode & Database refs
    canvasBreadcrumb   = $('#canvas-breadcrumb');
    btnToggleExplorer  = $('#btn-toggle-explorer');
    btnToggleDb        = $('#btn-toggle-db');
    dbDrawer           = $('#db-showcase-drawer');
    btnDbDrawerClose   = $('#btn-db-drawer-close');
    dbDrawerTitle      = $('#db-drawer-title');
    dbDrawerSubtitle   = $('#db-drawer-subtitle');
    dbDrawerTypeBadge  = $('#db-drawer-type-badge');
    dbDrawerCount      = $('#db-drawer-count');
    dbDrawerSearchInput = $('#db-drawer-search-input');
    dbDrawerSchemaPills = $('#db-drawer-schema-pills');
    dbRecordsThead     = $('#db-records-thead');
    dbRecordsTbody     = $('#db-records-tbody');
    dbDocInspector     = $('#db-doc-inspector');
    dbInspectorId      = $('#db-inspector-id');
    dbInspectorCode    = $('#db-inspector-code');
    btnDbCopyJson      = $('#btn-db-copy-json');
    btnCloseInspector  = $('#btn-close-inspector');
    tabBtnFiles        = $('#tab-btn-files');
    tabBtnDb           = $('#tab-btn-db');
    paneTabFiles       = $('#pane-tab-files');
    paneTabDb          = $('#pane-tab-db');
    sidebarDbList      = $('#sidebar-db-list');
  }

  /* =====================================================================
     5. CANVAS TRANSFORM & PAN/ZOOM
     ===================================================================== */
  function applyTransform(animate = false) {
    viewport.style.transition = animate ? 'transform 0.4s cubic-bezier(.4,0,.2,1)' : 'none';
    viewport.style.transform  = `matrix(${STATE.scale},0,0,${STATE.scale},${STATE.tx},${STATE.ty})`;
    const gs = 24 * STATE.scale;
    canvasContainer.style.backgroundSize = `${gs}px ${gs}px`;
    canvasContainer.style.backgroundPosition = `${STATE.tx}px ${STATE.ty}px`;
    if (STATE.gridMode === 'none') canvasContainer.style.backgroundImage = 'none';
    else if (STATE.gridMode === 'dot') canvasContainer.style.backgroundImage = `radial-gradient(var(--st-grid-dot) 1.2px, transparent 1.2px)`;
    else canvasContainer.style.backgroundImage = `linear-gradient(var(--st-grid-dot) 1px, transparent 1px), linear-gradient(90deg, var(--st-grid-dot) 1px, transparent 1px)`;
    if (zoomBadge) zoomBadge.textContent = `${Math.round(STATE.scale * 100)}%`;
    updateMinimap();
  }

  let spacePressed = false;

  function attachCanvasEvents() {
    // Zoom with mouse wheel or pinch gesture; 2-finger pan on trackpad
    canvasContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect  = canvasContainer.getBoundingClientRect();
      const mx    = e.clientX - rect.left;
      const my    = e.clientY - rect.top;

      // Trackpad 2-finger pan without Ctrl key
      if (!e.ctrlKey && (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 50)) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.4) {
          STATE.tx -= e.deltaX;
          STATE.ty -= e.deltaY;
          applyTransform();
          return;
        }
      }

      const delta = e.deltaY < 0 ? 1.1 : 0.909;
      const newScale = clamp(STATE.scale * delta, STATE.minScale, STATE.maxScale);
      const ratio    = newScale / STATE.scale;
      STATE.tx       = mx - ratio * (mx - STATE.tx);
      STATE.ty       = my - ratio * (my - STATE.ty);
      STATE.scale    = newScale;
      applyTransform();
    }, { passive: false });

    // Prevent default dragstart on container to avoid ghost image
    canvasContainer.addEventListener('dragstart', (e) => e.preventDefault());

    // Context Menu (Right Click) on Canvas & Nodes
    canvasContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetCard = e.target.closest('.canvas-node, .file-card, .canvas-sticky-note');
      if (targetCard) {
        const nodeId = targetCard.id;
        let node = STATE.nodes?.find(n => n.id === nodeId);
        if (!node) {
          if (targetCard.classList.contains('db-card')) {
            const colName = targetCard.dataset.colName || nodeId.replace('db-', '');
            node = STATE.nodes?.find(n => n.name === colName) || { id: nodeId, name: colName, kind: 'database' };
          } else if (targetCard.classList.contains('canvas-sticky-note')) {
            const sNote = STATE.stickies?.find(s => s.id === nodeId);
            node = { id: nodeId, kind: 'sticky', text: sNote ? sNote.text : 'Catatan Tempel' };
          } else {
            node = { id: nodeId, title: targetCard.querySelector('.card-title-main')?.textContent || nodeId, kind: 'node' };
          }
        }
        showCustomContextMenu(e.clientX, e.clientY, node, targetCard);
      } else {
        showCustomContextMenu(e.clientX, e.clientY, null, null);
      }
    });

    // Pointer down handler for panning
    canvasContainer.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return; // Right click handled by context menu
      hideContextMenu();
      const isInteractive = e.target.closest('.canvas-node, .file-card, .canvas-sticky-note, .node-port, .node-action-menu, .node-context-menu, .canvas-minimap, .code-preview-drawer, .sticky-note-btn, .canvas-breadcrumb, .bc-item');
      if (!isInteractive && !spacePressed && e.button !== 1 && STATE.mode !== 'connect') {
        setActiveNode(null);
      }
      if (STATE.mode === 'pan' || e.button === 1 || spacePressed || !isInteractive) {
        startPan(e);
      }
    });

    // Move & Up on both canvasContainer and window for bulletproof capture
    canvasContainer.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });

    canvasContainer.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerup', onPointerUp);

    canvasContainer.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    canvasContainer.addEventListener('lostpointercapture', () => {
      STATE.isPanning = false;
      canvasContainer.classList.remove('is-panning');
    });

    window.addEventListener('blur', () => {
      if (STATE.isPanning) {
        STATE.isPanning = false;
        canvasContainer.classList.remove('is-panning');
      }
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);
  }

  function startPan(e) {
    if (e.button === 2) return;
    try { e.preventDefault(); } catch(err) {}
    STATE.isPanning = true;
    STATE.panStartX = e.clientX;
    STATE.panStartY = e.clientY;
    STATE.panStartTx = STATE.tx;
    STATE.panStartTy = STATE.ty;
    canvasContainer.classList.add('is-panning');
    if (e.pointerId !== undefined) {
      try { canvasContainer.setPointerCapture(e.pointerId); } catch(err) {}
    }
  }

  function onPointerMove(e) {
    if (!STATE.isPanning) return;
    try { e.preventDefault(); } catch(err) {}
    const dx = e.clientX - STATE.panStartX;
    const dy = e.clientY - STATE.panStartY;
    STATE.tx = STATE.panStartTx + dx;
    STATE.ty = STATE.panStartTy + dy;
    applyTransform();
  }

  function onPointerUp(e) {
    if (STATE.isPanning) {
      STATE.isPanning = false;
      canvasContainer.classList.remove('is-panning');
      if (e && e.pointerId !== undefined) {
        try {
          if (canvasContainer.hasPointerCapture(e.pointerId)) {
            canvasContainer.releasePointerCapture(e.pointerId);
          }
        } catch(err) {}
      }
    }
  }

  function onKeyDown(e) {
    if (e.code === 'Space' && !e.target.matches('input,textarea')) {
      e.preventDefault();
      spacePressed = true;
      canvasContainer.classList.add('pan-cursor');
    }
        if (!e.target.matches('input,textarea') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (e.code === 'Digit1') switchCanvasView('general');
      if (e.code === 'Digit2') switchCanvasView('explorer', []);
      if (e.code === 'Digit3') switchCanvasView('database');
    }
    if (e.code === 'KeyV' && !e.target.matches('input,textarea')) setActiveTool('select');
    if (e.code === 'KeyH' && !e.target.matches('input,textarea')) setActiveTool('pan');
    if (e.code === 'KeyL' && !e.target.matches('input,textarea')) setActiveTool('lasso');
    if (e.code === 'KeyC' && !e.target.matches('input,textarea') && !e.ctrlKey && !e.metaKey) setActiveTool('connect');
    if (e.code === 'KeyN' && !e.target.matches('input,textarea') && !e.ctrlKey && !e.metaKey) openAddNodeModal();
    if (e.code === 'KeyS' && !e.target.matches('input,textarea') && !e.ctrlKey && !e.metaKey) addStickyNote();
    if (e.code === 'KeyG' && !e.target.matches('input,textarea')) cycleGrid();
    if ((e.ctrlKey || e.metaKey) && e.code === 'Equal') { e.preventDefault(); zoomStep(1.15); }
    if ((e.ctrlKey || e.metaKey) && e.code === 'Minus') { e.preventDefault(); zoomStep(0.87); }
    if (e.code === 'Digit1' && e.shiftKey) fitView();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      if (!e.target.matches('input,textarea')) { e.preventDefault(); deleteSelectedNodes(); }
    }
    if (e.code === 'Escape') {
      if (STATE.mode === 'connect') { cancelConnectSource(); setActiveTool('select'); }
      else if (STATE.mode === 'lasso') { clearLassoSelection(); setActiveTool('select'); }
      else {
        closeAllModals();
        closeCodeDrawer();
        closeDatabaseDrawer();
        hideContextMenu();
      }
    }
  }

  function onKeyUp(e) {
    if (e.code === 'Space') {
      spacePressed = false;
      if (STATE.mode !== 'pan') {
        canvasContainer.classList.remove('pan-cursor');
      }
    }
  }

  function zoomStep(factor) {
    const rect  = canvasContainer.getBoundingClientRect();
    const mx    = rect.width / 2;
    const my    = rect.height / 2;
    const newScale = clamp(STATE.scale * factor, STATE.minScale, STATE.maxScale);
    const ratio    = newScale / STATE.scale;
    STATE.tx       = mx - ratio * (mx - STATE.tx);
    STATE.ty       = my - ratio * (my - STATE.ty);
    STATE.scale    = newScale;
    applyTransform();
  }

  function fitView(animate = true) {
    if (!STATE.nodes.length) return;
    const pad = 80;
    const allItems = [
      ...STATE.nodes.map(n => ({ x: n.x, y: n.y, w: 244, h: 64 })),
      ...STATE.stickies.map(s => ({ x: s.x, y: s.y, w: 196, h: 100 }))
    ];
    const xs = allItems.map(i => i.x);
    const ys = allItems.map(i => i.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...allItems.map(i => i.x + i.w)) + pad;
    const maxY = Math.max(...allItems.map(i => i.y + i.h)) + pad;

    const viewW  = canvasContainer.offsetWidth  || 800;
    const viewH  = canvasContainer.offsetHeight || 600;
    const scaleX = viewW / (maxX - minX);
    const scaleY = viewH / (maxY - minY);
    const scale  = clamp(Math.min(scaleX, scaleY), STATE.minScale, 1.2);

    STATE.scale = scale;
    STATE.tx    = (viewW - (maxX - minX) * scale) / 2 - minX * scale;
    STATE.ty    = (viewH - (maxY - minY) * scale) / 2 - minY * scale;
    applyTransform(animate);
  }

  function focusNode(nodeId, animate = true) {
    const node = STATE.nodes.find(n => n.id === nodeId);
    if (!node) return;
    const viewW = canvasContainer.offsetWidth  || 800;
    const viewH = canvasContainer.offsetHeight || 600;
    const scale = clamp(STATE.scale, 0.7, 1.3);
    const nodeW = 122;
    const nodeH = 32;
    STATE.scale = scale;
    STATE.tx = viewW / 2 - (node.x + nodeW) * scale;
    STATE.ty = viewH / 2 - (node.y + nodeH) * scale;
    applyTransform(animate);

    const el = $(`#${nodeId}`);
    if (el) {
      el.classList.remove('node-ping');
      void el.offsetWidth;
      el.classList.add('node-ping', 'node-focused');
      setTimeout(() => el.classList.remove('node-ping'), 900);
    }
    STATE.activeNodeId = nodeId;
  }

  /* =====================================================================
     6. NODE RENDERING (Folders & Files)
     ===================================================================== */
  function renderAllNodes() {
    if (!nodesLayer) return;
    nodesLayer.innerHTML = '';
    STATE.nodes.forEach(node => {
      if (node.kind === 'file') {
        renderFileCard(node);
      } else {
        renderFolderCard(node);
      }
    });
  }
  window.showCustomContextMenu = showCustomContextMenu;
  window.showContextMenu = showCustomContextMenu;
  window.hideContextMenu = hideContextMenu;

  function renderAllStickies() {
    STATE.stickies.forEach(renderStickyNote);
  }

  function getNodeSvgIcon(iconType) {
    switch (iconType) {
      case 'cyclone':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2a10 10 0 0 0-7.07 2.93A10 10 0 0 1 12 7a5 5 0 0 1 5 5 10 10 0 0 1-2.93 7.07A10 10 0 0 0 22 12a10 10 0 0 0-10-10z"/><circle cx="12" cy="12" r="2"/></svg>`;
      case 'email':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="3 3 21 12 3 21 7 12 3 3"/><line x1="7" y1="12" x2="21" y2="12"/></svg>`;
      case 'server':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/></svg>`;
      case 'api':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
      case 'python':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2c2.5 0 4.5.5 4.5 2.5v2H11V8h8.5c1.8 0 2.5 1.2 2.5 3.5 0 2.6-.9 3.5-2.5 3.5H18v-1.5c0-1.2-.8-2-2-2h-3v1h4a1 1 0 0 1 1 1v4c0 1.2-.8 2-2 2H9.5C7.8 21 7 19.8 7 17.5V16h5.5v-1.5H4c-1.8 0-2.5-1.2-2.5-3.5C1.5 8.4 2.4 7.5 4 7.5H6V9c0 1.2.8 2 2 2h3V10H7a1 1 0 0 1-1-1V5c0-1.2.8-2 2-2h4z"/><circle cx="9" cy="5" r=".8" fill="currentColor"/><circle cx="15" cy="19" r=".8" fill="currentColor"/></svg>`;
      case 'palette':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/></svg>`;
      case 'code':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
      case 'pen':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
      case 'database':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`;
      case 'brain':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"/></svg>`;
      case 'terminal':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`;
      case 'folder':
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
  }

  function renderPortsHtml(node) {
    const ports = node.ports || [
      { side: 'top', type: 'green', symbol: '+' },
      { side: 'bottom', type: 'green', symbol: '+' },
      { side: 'left', type: 'green', symbol: '+' },
      { side: 'right', type: 'green', symbol: '+' }
    ];
    return ports.map(p =>
      `<div class="node-port port-${p.side} port-${p.type || 'green'}" data-node="${node.id}" data-side="${p.side}">${p.symbol || '+'}</div>`
    ).join('');
  }

  // --- A. FOLDER CARD RENDERING (HORIZONTAL CAPSULE) ---
  function renderFolderCard(node) {
    const el = document.createElement('div');
    el.className = `canvas-node ${node.borderVariant || 'card-border-neutral'}`;
    el.id        = node.id;
    el.style.left = `${node.x}px`;
    el.style.top  = `${node.y}px`;

    const iconHtml = getNodeSvgIcon(node.iconType || 'folder');
    const alertHtml = node.alert ? `<div class="card-alert-badge" title="Warning / Alert">!</div>` : '';
    const portsHtml = renderPortsHtml(node);

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${node.category || 'MODULE'}</div>
        <div class="card-title-main" title="${node.path || node.title}">${node.title}</div>
      </div>
      ${alertHtml}
      ${portsHtml}
    `;

    attachDraggable(el, node);
    attachNodeClick(el, node);
    nodesLayer.appendChild(el);
  }

  // --- B. FILE CARD RENDERING (HORIZONTAL CAPSULE + CODE SHOWCASE) ---
  function renderFileCard(node) {
    const el = document.createElement('div');
    el.className = `file-card ${node.borderVariant || 'card-border-neutral'}`;
    el.id        = node.id;
    el.dataset.lang = (node.lang || 'python').toLowerCase();
    el.style.left = `${node.x}px`;
    el.style.top  = `${node.y}px`;

    const iconHtml = getNodeSvgIcon(node.iconType || (node.lang === 'python' ? 'python' : 'code'));
    const alertHtml = node.alert ? `<div class="card-alert-badge" title="Security trigger / alert">!</div>` : '';
    const portsHtml = renderPortsHtml(node);

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${node.category || (node.lang || 'file').toUpperCase()}</div>
        <div class="card-title-main" title="${node.path || node.title}">${node.title}</div>
      </div>
      <div class="file-card-meta-slot">
        ${alertHtml}
        <span class="card-code-badge" title="Klik untuk showcase kode">&lt;/&gt;</span>
      </div>
      ${portsHtml}
    `;

    el.setAttribute('data-dbl-hint', 'Klik untuk showcase kode');
    attachDraggable(el, node);

    const handleFileOpen = () => {
      setActiveNode(node.id);
      syncTreeToNode(node.id);
      openCodeDrawer(node);
    };

    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      if (e.target.closest('.node-port')) return;
      handleFileOpen();
    });

    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.node-port')) return;
      handleFileOpen();
    });

    nodesLayer.appendChild(el);
  }

  function attachDraggable(el, node) {
    let startX = 0, startY = 0;
    let isMoved = false;

    el.style.touchAction = 'none';
    el.addEventListener('dragstart', (e) => e.preventDefault());

    el.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      if (e.target.closest('.node-port') || e.target.closest('.node-action-menu')) return;
      if (STATE.mode === 'pan' || e.button === 1 || spacePressed) return;
      if (STATE.mode === 'connect' || STATE.mode === 'lasso') return;

      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      isMoved = false;

      const rect = canvasContainer.getBoundingClientRect();
      const wx = (e.clientX - rect.left - STATE.tx) / STATE.scale;
      const wy = (e.clientY - rect.top  - STATE.ty) / STATE.scale;
      STATE.draggingNode = node.id;
      STATE.dragOffX = wx - node.x;
      STATE.dragOffY = wy - node.y;

      try { el.setPointerCapture(e.pointerId); } catch(err) {}
      el.classList.add('node-dragging');
      setActiveNode(node.id);
      snapshotUndo();
    });

    el.addEventListener('pointermove', (e) => {
      if (STATE.draggingNode !== node.id) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 3) {
        isMoved = true;
        el._justDragged = true;
      }
      const rect = canvasContainer.getBoundingClientRect();
      const wx = (e.clientX - rect.left - STATE.tx) / STATE.scale - STATE.dragOffX;
      const wy = (e.clientY - rect.top  - STATE.ty) / STATE.scale - STATE.dragOffY;
      node.x = wx;
      node.y = wy;
      el.style.left = `${wx}px`;
      el.style.top  = `${wy}px`;
      renderAllConnections();
      updateMinimap();
    });

    const finishDrag = (e) => {
      if (STATE.draggingNode === node.id) {
        try { if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); } catch(err) {}
        el.classList.remove('node-dragging');
        STATE.draggingNode = null;
        if (isMoved) {
          setTimeout(() => { el._justDragged = false; }, 60);
          if (STATE.databaseMode) {
            saveDatabaseCardPositions();
          }
        }
      }
    };

    el.addEventListener('pointerup', finishDrag);
    el.addEventListener('pointercancel', finishDrag);

    // Context Menu on right click
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCustomContextMenu(e.clientX, e.clientY, node, el);
    });
  }

  function attachNodeClick(el, node) {
    el.setAttribute('data-dbl-hint', 'Double-click untuk buka folder');

    // Single click: Select node & sync sidebar
    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      if (e.target.closest('.node-port') || e.target.closest('.node-action-menu')) return;
      setActiveNode(node.id);
      syncTreeToNode(node.id);
    });

    // Double click: Drill-down into folder
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest('.node-port') || e.target.closest('.node-action-menu')) return;
      onFolderCardDrillDown(node);
    });
  }

  function onFolderCardDrillDown(node) {
    if (STATE.explorerMode) {
      const folderName = node.name || (node.path ? node.path.split('/').filter(Boolean).pop() : null);
      if (folderName) {
        enterExplorerMode([...STATE.explorerPath, folderName]);
      }
    } else {
      const dir = resolveDirFromArchitectureNode(node);
      if (dir) {
        enterExplorerMode([dir]);
      } else {
        enterExplorerMode([]);
      }
    }
  }

  function resolveDirFromArchitectureNode(node) {
    if (node.path) {
      // Clean path, e.g. "public/" or "api/" or "datasets/ / data/"
      const rawSeg = node.path.split('/')[0].trim();
      const seg = rawSeg.replace(/[^a-zA-Z0-9_-]/g, '');
      if (seg) return seg;
    }
    if (node.id === 'node-frontend' || node.id === 'node-riset') return 'public';
    if (node.id === 'node-api') return 'api';
    if (node.id === 'node-app') return 'app';
    if (node.id === 'node-core') return 'core';
    if (node.id === 'node-data' || node.id === 'node-datasets') return 'datasets';
    if (node.id === 'node-data-raw') return 'data';
    if (node.id === 'node-ml' || node.id === 'node-models-llm') return 'modelsLLM';
    if (node.id === 'node-features') return 'features';
    if (node.id === 'node-scripts') return 'scripts';
    if (node.id === 'node-configs') return 'configs';
    if (node.id === 'node-tests') return 'tests';
    if (node.id === 'node-scratch') return 'scratch';
    if (node.id === 'node-notebooks') return 'notebooks';
    if (node.id === 'node-training') return 'training';
    return null;
  }

  function tagClass(tag) {
    const map = {
      'Core': 'tag-core', 'Flask': 'tag-core',
      'API': 'tag-api', 'REST': 'tag-api', 'Auth': 'tag-api',
      'Frontend': 'tag-frontend', 'UI/UX': 'tag-frontend',
      'Studio': 'tag-ml', 'Editor': 'tag-ml',
      'Model AI': 'tag-ml', 'PyTorch': 'tag-ml',
      'Klinis': 'tag-klinis',
      'Dataset': 'tag-data', 'Multimodal': 'tag-data',
      'Tools': 'tag-tools', 'Automation': 'tag-tools',
    };
    return map[tag] || 'tag-tools';
  }

  function setActiveNode(nodeId) {
    $$('.canvas-node, .file-card').forEach(el => el.classList.remove('node-focused'));
    const el = $(`#${nodeId}`);
    if (el) el.classList.add('node-focused');
    STATE.activeNodeId = nodeId;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* =====================================================================
     7. STICKY NOTES RENDERING
     ===================================================================== */
  function renderStickyNote(note) {
    const el = document.createElement('div');
    el.className = 'canvas-sticky-note';
    el.id = note.id;
    el.style.left = `${note.x}px`;
    el.style.top  = `${note.y}px`;

    el.innerHTML = `
      <div class="sticky-note-header">
        <span class="sticky-note-num">#${note.id.split('-')[1]}</span>
        <div class="sticky-note-actions">
          <button class="sticky-note-btn sticky-btn-check" title="Tandai Selesai">✓</button>
          <button class="sticky-note-btn sticky-btn-close" title="Hapus Catatan">✕</button>
        </div>
      </div>
      <div class="sticky-note-text">${note.text}</div>
      <div class="sticky-note-footer">
        <span class="sticky-mini-avatar" style="background:${note.avatarColor}">${note.avatar}</span>
        <span class="sticky-timestamp">${note.timestamp}</span>
      </div>
    `;

    let dragging = false, offX = 0, offY = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return;
      if (e.target.closest('.sticky-note-btn')) return;
      if (STATE.mode === 'pan' || e.button === 1 || spacePressed) return;
      e.stopPropagation();
      const rect = canvasContainer.getBoundingClientRect();
      const wx = (e.clientX - rect.left - STATE.tx) / STATE.scale;
      const wy = (e.clientY - rect.top  - STATE.ty) / STATE.scale;
      offX = wx - note.x;
      offY = wy - note.y;
      dragging = true;
      el.classList.add('note-dragging');
      try { el.setPointerCapture(e.pointerId); } catch(err) {}
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      note.x = (e.clientX - canvasContainer.getBoundingClientRect().left - STATE.tx) / STATE.scale - offX;
      note.y = (e.clientY - canvasContainer.getBoundingClientRect().top  - STATE.ty) / STATE.scale - offY;
      el.style.left = `${note.x}px`;
      el.style.top  = `${note.y}px`;
    });
    const finishNoteDrag = (e) => {
      if (dragging) {
        dragging = false;
        el.classList.remove('note-dragging');
        if (e && e.pointerId !== undefined) {
          try { if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId); } catch(err) {}
        }
      }
    };
    el.addEventListener('pointerup', finishNoteDrag);
    el.addEventListener('pointercancel', finishNoteDrag);

    el.querySelector('.sticky-btn-close').addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      STATE.stickies = STATE.stickies.filter(s => s.id !== note.id);
    });

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCustomContextMenu(e.clientX, e.clientY, { id: note.id, kind: 'sticky', text: note.text }, el);
    });

    nodesLayer.appendChild(el);
  }

  /* =====================================================================
     8. BEZIER CONNECTIONS
     ===================================================================== */
  function getNodeCenter(nodeId, side = 'right') {
    const node = STATE.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const el = document.getElementById(nodeId);
    const W = (el && el.offsetWidth) ? el.offsetWidth : (node.kind === 'database' || nodeId.startsWith('db-') ? 260 : 252);
    const H = (el && el.offsetHeight) ? el.offsetHeight : 64;
    switch (side) {
      case 'right':  return { x: node.x + W,      y: node.y + H / 2 };
      case 'left':   return { x: node.x,          y: node.y + H / 2 };
      case 'bottom': return { x: node.x + W / 2,  y: node.y + H };
      case 'top':    return { x: node.x + W / 2,  y: node.y };
      default:       return { x: node.x + W,      y: node.y + H / 2 };
    }
  }

  function getBestPorts(srcNode, dstNode) {
    const dx = dstNode.x - srcNode.x;
    if (Math.abs(dx) > 80) {
      return dx > 0 ? ['right', 'left'] : ['left', 'right'];
    }
    const dy = dstNode.y - srcNode.y;
    return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
  }

  function renderAllConnections() {
    pathsGroup.innerHTML  = '';
    badgesGroup.innerHTML = '';

    STATE.connections.forEach(([srcId, dstId, type, label], idx) => {
      const srcNode = STATE.nodes.find(n => n.id === srcId);
      const dstNode = STATE.nodes.find(n => n.id === dstId);
      if (!srcNode || !dstNode) return;

      const [srcSide, dstSide] = getBestPorts(srcNode, dstNode);
      const p1 = getNodeCenter(srcId, srcSide);
      const p2 = getNodeCenter(dstId, dstSide);

      const offset = Math.abs(p2.x - p1.x) * 0.5 || 100;
      let cx1 = p1.x, cy1 = p1.y, cx2 = p2.x, cy2 = p2.y;
      if (srcSide === 'right')  cx1 = p1.x + offset;
      if (srcSide === 'left')   cx1 = p1.x - offset;
      if (srcSide === 'bottom') cy1 = p1.y + offset;
      if (srcSide === 'top')    cy1 = p1.y - offset;
      if (dstSide === 'left')   cx2 = p2.x - offset;
      if (dstSide === 'right')  cx2 = p2.x + offset;
      if (dstSide === 'top')    cy2 = p2.y - offset;
      if (dstSide === 'bottom') cy2 = p2.y + offset;

      const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', `connection-path type-${type}`);
      path.dataset.idx = idx;
      pathsGroup.appendChild(path);

      if (label) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        fo.setAttribute('x', mx - 50);
        fo.setAttribute('y', my - 12);
        fo.setAttribute('width', '100');
        fo.setAttribute('height', '24');
        fo.innerHTML = `<div class="rel-label-badge">${label}</div>`;
        badgesGroup.appendChild(fo);
      }
    });
  }
  window.showCustomContextMenu = showCustomContextMenu;
  window.showContextMenu = showCustomContextMenu;
  window.hideContextMenu = hideContextMenu;

  /* =====================================================================
     9. CODE SHOWCASE DRAWER ENGINE
     ===================================================================== */
  function openCodeDrawer(node) {
    if (!codeDrawer) return;

    drawerFileName.textContent = node.title || node.name || 'Berkas';
    drawerFilePath.textContent = node.path || '—';
    drawerLangBadge.textContent = (node.lang || node.ext || 'Code').replace('.', '').toUpperCase();

    // Show loading state in code block
    drawerCodeBlock.textContent = '// Memuat isi berkas dari server...';
    drawerLineNumbers.innerHTML = '<div class="gutter-line" data-line="1">1</div>';
    drawerOutline.style.display = 'none';

    // Open drawer panel
    drawerBackdrop.classList.add('drawer-open');
    codeDrawer.classList.add('drawer-open');

    // Populate relation pills
    renderDrawerRelations(node);

    // Fetch code from backend API
    const fetchPath = node.path || node.title;
    fetch(`/api/file-content?path=${encodeURIComponent(fetchPath)}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          drawerFileName.textContent = data.name;
          drawerFilePath.textContent = `${data.path} Â· ${data.lines} baris Â· ${fmt_size(data.size)}`;
          drawerLangBadge.textContent = data.language.toUpperCase();

          // Render syntax highlighted code
          drawerCodeBlock.textContent = data.content;
          if (window.hljs) {
            hljs.highlightElement(drawerCodeBlock);
          }

          // Render line numbers
          const numLines = data.lines || data.content.split('\n').length;
          let numsHtml = '';
          for (let i = 1; i <= numLines; i++) {
            numsHtml += `<div class="gutter-line" data-line="${i}">${i}</div>`;
          }
          drawerLineNumbers.innerHTML = numsHtml;

          // Parse code outline (classes and functions)
          parseAndRenderOutline(data.content, data.language);
        } else {
          drawerCodeBlock.textContent = `// Tidak dapat memuat berkas:\n// ${data.message || 'Error'}`;
          drawerLineNumbers.innerHTML = '<div class="gutter-line" data-line="1">1</div><div class="gutter-line" data-line="2">2</div>';
        }
      })
      .catch(err => {
        // Fallback to local preview snippet if server not reachable
        drawerCodeBlock.textContent = node.previewCode || `// File: ${node.title}\n// (Gagal tersambung ke /api/file-content)`;
        if (window.hljs) hljs.highlightElement(drawerCodeBlock);
        const fbLines = (drawerCodeBlock.textContent || '').split('\n').length;
        let fbNums = '';
        for (let i = 1; i <= fbLines; i++) {
          fbNums += `<div class="gutter-line" data-line="${i}">${i}</div>`;
        }
        drawerLineNumbers.innerHTML = fbNums;
      });
  }

  function closeCodeDrawer(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    const drawer = $('#code-preview-drawer') || codeDrawer;
    const backdrop = $('#drawer-backdrop') || drawerBackdrop;
    if (drawer) drawer.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('drawer-open');
  }
  window.closeCodeDrawer = closeCodeDrawer;

  function attachCodeDrawerEvents() {
    const btnClose = $('#btn-drawer-close') || btnDrawerClose;
    const backdrop = $('#drawer-backdrop') || drawerBackdrop;

    if (btnClose) {
      btnClose.addEventListener('click', (e) => {
        closeCodeDrawer(e);
      });
      btnClose.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        closeCodeDrawer(e);
      });
      backdrop.addEventListener('pointerdown', (e) => {
        closeCodeDrawer(e);
      });
    }

    // Auto-close when clicking outside drawer
    document.addEventListener('pointerdown', (e) => {
      const drawer = $('#code-preview-drawer');
      if (drawer && drawer.classList.contains('drawer-open')) {
        if (!e.target.closest('#code-preview-drawer') && !e.target.closest('.canvas-node, .file-card, .ctx-item, .tree-item-row')) {
          closeCodeDrawer(e);
        }
      }
    });

    btnDrawerCopy?.addEventListener('click', (e) => {
      e.stopPropagation();
      const code = drawerCodeBlock.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const origSvg = btnDrawerCopy.innerHTML;
        btnDrawerCopy.innerHTML = `<span style="font-size:11px;color:#22C55E">✓</span>`;
        setTimeout(() => { btnDrawerCopy.innerHTML = origSvg; }, 1500);
      });
    });
  }

  function parseAndRenderOutline(content, language) {
    const lang = (language || '').toLowerCase();
    const items = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      // Python functions/classes
      if (lang.includes('python')) {
        const defMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (defMatch) items.push({ name: `def ${defMatch[1]}()`, line: lineNum });
        const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) items.push({ name: `class ${classMatch[1]}`, line: lineNum });
      }
      // JS/TS functions/classes
      else if (lang.includes('javascript') || lang.includes('typescript')) {
        const fnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/);
        if (fnMatch) items.push({ name: `fn ${fnMatch[1]}()`, line: lineNum });
        const constFn = trimmed.match(/^(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(/);
        if (constFn) items.push({ name: `const ${constFn[1]}`, line: lineNum });
        const classMatch = trimmed.match(/^(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) items.push({ name: `class ${classMatch[1]}`, line: lineNum });
      }
      // CSS selectors
      else if (lang.includes('css')) {
        const selMatch = trimmed.match(/^([.#][a-zA-Z0-9_-]+)\s*\{/);
        if (selMatch) items.push({ name: selMatch[1], line: lineNum });
      }
    });

    if (items.length > 0) {
      drawerOutline.style.display = 'block';
      drawerOutlineList.innerHTML = items.slice(0, 15).map(item => `
        <div class="drawer-outline-item" data-line="${item.line}">
          <span class="drawer-outline-chevron">▸</span>
          <span class="drawer-outline-fn-name">${escapeHtml(item.name)}</span>
          <span class="drawer-outline-line">L${item.line}</span>
        </div>
      `).join('');

      $$('.drawer-outline-item').forEach(el => {
        el.addEventListener('click', () => {
          const l = parseInt(el.dataset.line, 10);
          const lineEl = drawerLineNumbers.children[l - 1];
          if (lineEl) {
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lineEl.classList.add('gutter-line-active');
            setTimeout(() => lineEl.classList.remove('gutter-line-active'), 1800);
          }
        });
      });
    } else {
      drawerOutline.style.display = 'none';
    }
  }

  function renderDrawerRelations(node) {
    if (!drawerRelationsPills) return;
    const related = [];
    STATE.connections.forEach(([src, dst, type, label]) => {
      if (src === node.id) {
        const target = STATE.nodes.find(n => n.id === dst);
        if (target) related.push({ name: target.title, type: label || type, dir: 'out' });
      }
      if (dst === node.id) {
        const source = STATE.nodes.find(n => n.id === src);
        if (source) related.push({ name: source.title, type: label || type, dir: 'in' });
      }
    });

    if (related.length > 0) {
      drawerRelationsPills.innerHTML = related.map(r => `
        <span class="drawer-relation-pill" title="${r.dir === 'in' ? '↓' : '↑'} ${r.name}">
          ${r.dir === 'in' ? '↓' : '↑'} ${escapeHtml(r.name)} (${r.type})
        </span>
      `).join('');
    } else {
      drawerRelationsPills.innerHTML = '<span style="font-size:10.5px;color:var(--st-text-muted)">Tidak ada relasi langsung terdaftar</span>';
    }
  }

  /* =====================================================================
     9B. DATABASE SHOWCASE DRAWER ENGINE
     ===================================================================== */
  function attachDatabaseDrawerEvents() {
    btnDbDrawerClose?.addEventListener('click', (e) => {
      e.preventDefault();
      closeDatabaseDrawer();
    });

    const backdrop = $('#drawer-backdrop') || drawerBackdrop;
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        closeDatabaseDrawer(e);
      });
      backdrop.addEventListener('pointerdown', (e) => {
        closeDatabaseDrawer(e);
      });
    }

    // Auto-close when clicking outside database showcase drawer
    document.addEventListener('pointerdown', (e) => {
      const drawer = $('#db-showcase-drawer') || dbDrawer;
      if (drawer && drawer.classList.contains('drawer-open')) {
        if (!e.target.closest('#db-showcase-drawer') && !e.target.closest('.canvas-node, .file-card, .db-card, .ctx-item, .sidebar-db-item, .quick-chip--db')) {
          closeDatabaseDrawer(e);
        }
      }
    });

    btnCloseInspector?.addEventListener('click', (e) => {
      e.preventDefault();
      if (dbDocInspector) dbDocInspector.style.display = 'none';
    });

    btnDbCopyJson?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!STATE.activeDbDocs || !STATE.activeDbDocs.length) {
        showToast('Tidak ada data untuk disalin.', 2000);
        return;
      }
      const jsonStr = JSON.stringify(STATE.activeDbDocs, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        showToast(`✓ Berhasil menyalin ${STATE.activeDbDocs.length} data JSON ke clipboard!`, 2500);
      }).catch(() => {
        showToast('Gagal menyalin data ke clipboard.', 2000);
      });
    });

    dbDrawerSearchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      filterDatabaseDrawerTable(q);
    });
  }

  function filterDatabaseDrawerTable(query) {
    const rows = $$('#db-records-tbody tr');
    let visibleCount = 0;
    rows.forEach(tr => {
      if (!query) {
        tr.style.display = '';
        visibleCount++;
        return;
      }
      const text = tr.textContent.toLowerCase();
      const match = text.includes(query);
      tr.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    if (dbDrawerCount) {
      dbDrawerCount.textContent = `${visibleCount} dari ${rows.length} Dokumen`;
    }
  }

  // Real-time Firestore & Online Users State
  let activeFirestoreUnsubscribe = null;
  let cachedOnlineUsers = [];
  let onlineUsersTimer = null;

  function updateCanvasAndSidebarColCount(colName, count) {
    // 1. Update Canvas Node Badge
    const nodeEl = document.querySelector(`.canvas-node.db-card[data-col-name="${colName}"]`);
    if (nodeEl) {
      const isDataset = colName.endsWith('.csv');
      const badge = nodeEl.querySelector('.db-card-badge');
      if (badge) badge.textContent = `${count} ${isDataset ? 'Baris' : 'Docs'}`;
    }
    // 2. Update Sidebar Item Badge
    const sideItem = document.querySelector(`.sidebar-db-item[data-col-name="${colName}"] .sdb-count`);
    if (sideItem) {
      const isDataset = colName.endsWith('.csv');
      sideItem.textContent = `${count} ${isDataset ? 'baris' : 'docs'}`;
    }
    // 3. Update State node
    const nodeState = STATE.nodes?.find(n => n.name === colName);
    if (nodeState) nodeState.count = count;
  }

  async function openDatabaseDrawer(colName, colMeta = null) {
    if (!dbDrawer) return;

    // Close code preview drawer if open
    closeCodeDrawer();

    // Detach previous Firestore realtime listener if active
    if (activeFirestoreUnsubscribe) {
      try { activeFirestoreUnsubscribe(); } catch (_) {}
      activeFirestoreUnsubscribe = null;
    }

    const title = colName || 'users';
    if (dbDrawerTitle) dbDrawerTitle.textContent = title;
    if (dbDrawerSubtitle) dbDrawerSubtitle.textContent = colMeta?.description || 'Memuat dokumen dari koleksi...';
    if (dbDrawerTypeBadge) {
      dbDrawerTypeBadge.textContent = (colMeta?.type || (title.endsWith('.csv') ? 'DATASET' : 'FIRESTORE')).toUpperCase();
    }
    if (dbDrawerCount) dbDrawerCount.textContent = 'Memuat data...';

    // Open drawer panel
    if (drawerBackdrop) drawerBackdrop.classList.add('drawer-open');
    dbDrawer.classList.add('drawer-open');

    // Reset table & inspector
    if (dbRecordsThead) dbRecordsThead.innerHTML = '';
    if (dbRecordsTbody) dbRecordsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#6B7280;">Sedang menghubungkan ke Firebase Firestore...</td></tr>`;
    if (dbDocInspector) dbDocInspector.style.display = 'none';
    if (dbDrawerSearchInput) dbDrawerSearchInput.value = '';

    // Helper: fallback fetch via REST API
    async function fallbackFetchDocs() {
      try {
        const res = await fetch(`/api/database/collection/${encodeURIComponent(title)}/docs?limit=60`);
        const data = await res.json();
        if (data.status === 'success') {
          STATE.activeDbCollection = title;
          STATE.activeDbDocs = data.documents || [];
          renderDbDrawerContent(data);
          updateCanvasAndSidebarColCount(title, data.documents?.length || 0);
        } else {
          if (dbRecordsTbody) dbRecordsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#EF4444;">Gagal memuat dokumen: ${data.message || 'Error'}</td></tr>`;
        }
      } catch (err) {
        if (dbRecordsTbody) dbRecordsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:24px;color:#EF4444;">Koneksi error: ${err.message}</td></tr>`;
      }
    }

    // 1. Cek apakah Firebase Firestore Client SDK tersedia & koleksi adalah Firestore (bukan file CSV)
    const isDatasetCsv = title.endsWith('.csv') || (colMeta && colMeta.type === 'dataset');
    const isFirebaseReady = typeof window.firebase !== 'undefined' && typeof window.firebase.firestore === 'function';

    if (isFirebaseReady && !isDatasetCsv) {
      try {
        const db = window.firebase.firestore();
        // Listener REAL-TIME Firestore onSnapshot
        activeFirestoreUnsubscribe = db.collection(title).limit(80).onSnapshot((snapshot) => {
          const docs = [];
          snapshot.forEach(docSnap => {
            docs.push({
              id: docSnap.id,
              data: docSnap.data()
            });
          });

          if (docs.length > 0) {
            STATE.activeDbCollection = title;
            STATE.activeDbDocs = docs;

            // Ekstrak columns dinamis dari seluruh fields
            const colSet = new Set();
            docs.forEach(d => {
              if (d.data && typeof d.data === 'object') {
                Object.keys(d.data).forEach(k => colSet.add(k));
              }
            });
            const columns = Array.from(colSet);

            renderDbDrawerContent({
              collection: title,
              type: 'firestore',
              count: docs.length,
              columns: columns.length ? columns : ['id', 'status'],
              documents: docs
            });

            if (dbDrawerTypeBadge) {
              dbDrawerTypeBadge.innerHTML = `FIRESTORE &bull; <span style="color:#22C55E;font-weight:700;">â— REAL-TIME</span>`;
            }

            updateCanvasAndSidebarColCount(title, docs.length);
            return;
          }

          // Jika snapshot kosong, coba panggil API
          fallbackFetchDocs();
        }, (err) => {
          console.warn('[Firestore Live] onSnapshot error / offline, beralih ke REST API:', err);
          fallbackFetchDocs();
        });
        return;
      } catch (err) {
        console.warn('[Firestore] Error attaching onSnapshot:', err);
      }
    }

    // 2. Fallback fetch via REST API jika SDK belum aktif atau dataset CSV
    await fallbackFetchDocs();
  }
  window.openDatabaseDrawer = openDatabaseDrawer;

  function closeDatabaseDrawer(e) {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    // Detach real-time listener saat drawer ditutup
    if (activeFirestoreUnsubscribe) {
      try { activeFirestoreUnsubscribe(); } catch (_) {}
      activeFirestoreUnsubscribe = null;
    }
    if (dbDrawer) dbDrawer.classList.remove('drawer-open');
    if (drawerBackdrop && (!codeDrawer || !codeDrawer.classList.contains('drawer-open'))) {
      drawerBackdrop.classList.remove('drawer-open');
    }
  }
  window.closeDatabaseDrawer = closeDatabaseDrawer;

  function renderDbDrawerContent(data) {
    const docs = data.documents || [];
    const cols = data.columns || [];

    if (dbDrawerCount) dbDrawerCount.textContent = `${docs.length} Dokumen / Rekaman`;

    // Render schema pills
    if (dbDrawerSchemaPills) {
      if (cols.length) {
        dbDrawerSchemaPills.innerHTML = cols.slice(0, 8).map(c => `<span class="db-schema-pill">${escapeHtml(c)}</span>`).join('');
      } else {
        dbDrawerSchemaPills.innerHTML = '<span style="font-size:11px;color:var(--st-text-muted);">Skema dinamis (NoSQL)</span>';
      }
    }

    // Render Table Header
    if (dbRecordsThead) {
      const displayCols = ['ID / Key', ...cols.slice(0, 4)];
      dbRecordsThead.innerHTML = `
        <tr>
          ${displayCols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}
        </tr>
      `;
    }

    // Render Table Body
    if (dbRecordsTbody) {
      if (!docs.length) {
        dbRecordsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--st-text-muted);">Koleksi ini belum memiliki dokumen.</td></tr>`;
        return;
      }

      dbRecordsTbody.innerHTML = docs.map((doc, idx) => {
        const idVal = doc.id || `doc-${idx+1}`;
        const rowCells = cols.slice(0, 4).map(c => {
          const val = doc.data ? doc.data[c] : '';
          const str = (typeof val === 'object' && val !== null) ? JSON.stringify(val) : String(val ?? '—');
          return `<td title="${escapeHtml(str)}">${escapeHtml(str)}</td>`;
        }).join('');

        return `
          <tr data-doc-idx="${idx}" class="${idx === 0 ? 'active-row' : ''}">
            <td style="font-family:var(--st-font-mono, monospace);font-weight:700;color:#22D3EE;">${escapeHtml(idVal)}</td>
            ${rowCells}
          </tr>
        `;
      }).join('');

      // Auto-inspect first document
      if (docs[0]) {
        inspectDocument(docs[0]);
      }

      // Attach row click listeners
      $$('#db-records-tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
          $$('#db-records-tbody tr').forEach(r => r.classList.remove('active-row'));
          tr.classList.add('active-row');
          const idx = parseInt(tr.dataset.docIdx, 10);
          const doc = docs[idx];
          if (doc) inspectDocument(doc);
        });
      });
    }
  }

  function inspectDocument(doc) {
    if (!dbDocInspector) return;
    dbDocInspector.style.display = 'flex';
    if (dbInspectorId) dbInspectorId.textContent = `Dokumen: ${doc.id || 'Payload'}`;
    if (dbInspectorCode) {
      dbInspectorCode.textContent = JSON.stringify(doc.data || doc, null, 2);
      if (window.hljs) hljs.highlightElement(dbInspectorCode);
    }
  }

  /* =====================================================================
     9C. DATABASE CANVAS MODE ENGINE
     ===================================================================== */
  const DATABASE_CONNECTIONS = [
    ['db-users', 'db-sessions', 'auth', 'Token Guard'],
    ['db-users', 'db-consultations', 'contains', 'Patient History'],
    ['db-consultations', 'db-predictions', 'calls', 'Clinical Eval'],
    ['db-predictions', 'db-ml_logs', 'core', 'Inference Telemetry'],
    ['db-alzheimers_data', 'db-predictions', 'ml', 'OASIS Benchmark'],
    ['db-alzheimers_data', 'db-ml_logs', 'default', 'Feature Sync'],
  ];

  // SVG icons for DB collections — consistent with folder structure SVG system
  const DB_SVG_ICONS = {
    users:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    consultations:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.8 19.8 0 0 1 1.63 3.42 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.29 6.29l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    predictions:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"/></svg>`,
    sessions:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    ml_logs:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    dataset:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    default:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
  };

  function getDbSvgIcon(col) {
    if (!col) return DB_SVG_ICONS.default;
    const name = col.name || col.title || '';
    if (col.type === 'dataset' || name.endsWith('.csv')) return DB_SVG_ICONS.dataset;
    return DB_SVG_ICONS[name] || DB_SVG_ICONS.default;
  }

  const FALLBACK_DB_COLLECTIONS = [
    { id: 'db-users', name: 'users', type: 'firestore', category: 'AUTH & PROFILES', count: 48, description: 'Akun pasien, kredensial autentikasi Firebase, profil nakes & preferensi.' },
    { id: 'db-consultations', name: 'consultations', type: 'firestore', category: 'TELEMEDICINE', count: 36, description: 'Catatan rekam medis, anamnesis, riwayat konsultasi pasien & anjuran dokter.' },
    { id: 'db-predictions', name: 'predictions', type: 'firestore', category: 'AI INFERENCE SINK', count: 82, description: 'Log hasil inferensi model Alzheimer, estimasi probabilitas CDR, dan skor risiko.' },
    { id: 'db-sessions', name: 'sessions', type: 'local', category: 'SESSION STORE', count: 2, description: 'Token sesi login admin aktif, expiry time, dan kontrol akses RBAC berbasis disk.' },
    { id: 'db-ml_logs', name: 'ml_logs', type: 'firestore', category: 'AUDIT & TELEMETRY', count: 128, description: 'Log runtime inferensi model, durasi komputasi (latency ms), throughput & memori GPU.' },
    { id: 'db-alzheimers_data', name: 'alzheimers_disease_data.csv', type: 'dataset', category: 'TABULAR DATA LAKE', count: 2149, description: 'Dataset kohort OASIS dengan 35 parameter demografi, MRI (eTIV, nWBV), dan biomarker MMSE.' }
  ];

  function saveDatabaseCardPositions() {
    try {
      const positions = {};
      STATE.nodes.forEach(n => {
        if (n.kind === 'database' || (n.id && n.id.startsWith('db-'))) {
          positions[n.name] = { x: Math.round(n.x), y: Math.round(n.y) };
        }
      });
      localStorage.setItem('neura_db_card_positions', JSON.stringify(positions));
    } catch(e) {}
  }

  function layoutDatabaseGrid(collections) {
    const coords = [
      { x: 180, y: 120 },
      { x: 520, y: 120 },
      { x: 860, y: 120 },
      { x: 180, y: 270 },
      { x: 520, y: 270 },
      { x: 860, y: 270 },
    ];
    let savedPositions = {};
    try {
      savedPositions = JSON.parse(localStorage.getItem('neura_db_card_positions') || '{}');
    } catch(e) {}

    return collections.map((col, idx) => {
      const defaultPos = coords[idx] || { x: 180 + (idx % 3) * 340, y: 120 + Math.floor(idx / 3) * 150 };
      const pos = savedPositions[col.name] || savedPositions[col.id] || defaultPos;
      return {
        id: col.id || `db-${col.name}`,
        name: col.name,
        type: col.type || 'firestore',
        kind: 'database',
        category: col.category || 'DATABASE',
        count: col.count || 0,
        description: col.description || '',
        x: pos.x,
        y: pos.y,
        fields: col.fields || []
      };
    });
  }

  async function enterDatabaseMode() {
    STATE.databaseMode = true;
    STATE.explorerMode = false;
    STATE.canvasView = 'database';
    closeAllTopbarDropdowns();

    // Persist page mode to localStorage and sync URL for page refreshes
    try {
      localStorage.setItem('neura_active_mode', 'database');
      localStorage.setItem('neura_active_canvas', 'database');
      const url = new URL(window.location);
      url.searchParams.set('view', 'database');
      url.searchParams.delete('mode');
      window.history.replaceState({}, '', url);
    } catch(e) {}

    // Fetch database collections if not yet cached
    if (!STATE.dbCollections || !STATE.dbCollections.length) {
      try {
        const res = await fetch('/api/database/collections');
        const data = await res.json();
        if (data.status === 'success' && data.collections) {
          STATE.dbCollections = data.collections;
        }
      } catch (err) {
        console.error('Failed to fetch db collections:', err);
      }
    }

    if (!STATE.dbCollections || !STATE.dbCollections.length) {
      STATE.dbCollections = FALLBACK_DB_COLLECTIONS;
    }

    // Layout Database Cards on Canvas
    const dbNodes = layoutDatabaseGrid(STATE.dbCollections);
    STATE.nodes = dbNodes;
    STATE.connections = [...DATABASE_CONNECTIONS];

    // Hide stickies & show connections
    $$('.canvas-sticky-note').forEach(el => el.style.display = 'none');
    if (connSvg) connSvg.style.display = 'block';

    // Clear nodes layer and render database cards
    if (nodesLayer) nodesLayer.innerHTML = '';
    dbNodes.forEach(node => renderDatabaseCard(node));
    renderAllConnections();

    // Show database breadcrumb
    if (canvasBreadcrumb) {
      canvasBreadcrumb.style.display = 'flex';
      canvasBreadcrumb.innerHTML = `
        <button class="bc-item bc-root" onclick="window.exitDatabaseMode && window.exitDatabaseMode()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span>General Canvas</span>
        </button>
        <span class="bc-sep">›</span>
        <div class="bc-item bc-current">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <span>Database &amp; Collections Canvas</span>
        </div>
      `;
    }

    // Update Topbar and Dropdown
    if (btnToggleDb) btnToggleDb.classList.add('explorer-active');
    if (btnToggleExplorer) btnToggleExplorer.classList.remove('explorer-active');
    const pTitle = $('#current-project-title');
    if (pTitle) pTitle.textContent = 'Database & Collections Canvas';
    $('#pmenu-item-arch')?.classList.remove('active');
    $('#pmenu-item-exp')?.classList.remove('active');
    $('#pmenu-item-db')?.classList.add('active');
    // Sync 3-canvas segmented buttons
    $$('.mode-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'database'));
    // Sync filter bars
    const fBarGenDb = $('#filter-bar-general');
    const fBarFilesDb = $('#filter-bar-files');
    const fBarDbDb = $('#filter-bar-db');
    if (fBarGenDb) fBarGenDb.style.display = 'none';
    if (fBarFilesDb) fBarFilesDb.style.display = 'none';
    if (fBarDbDb) fBarDbDb.style.display = 'flex';

    // Update status bar
    if (statusSyncText) statusSyncText.textContent = `Kanvas: Koleksi Basis Data & Dataset`;
    if (nodeCountEl) nodeCountEl.textContent = `${dbNodes.length} Koleksi`;
    if (relCountEl) relCountEl.textContent = `${DATABASE_CONNECTIONS.length} Relasi Data`;

    // Switch sidebar tab + ALL adaptive UI to database
    switchSidebarTab('database');

    // Fetch and sync online users badge
    updateOnlineUsersBadge();
    if (!onlineUsersTimer) {
      onlineUsersTimer = setInterval(updateOnlineUsersBadge, 7000);
    }

    setTimeout(() => {
      fitView(true);
    }, 50);
  }
  window.enterDatabaseMode = enterDatabaseMode;

  function exitDatabaseMode() {
    STATE.databaseMode = false;
    closeDatabaseDrawer();

    // Clear online users timer & firestore listener
    if (onlineUsersTimer) {
      clearInterval(onlineUsersTimer);
      onlineUsersTimer = null;
    }
    if (activeFirestoreUnsubscribe) {
      try { activeFirestoreUnsubscribe(); } catch (_) {}
      activeFirestoreUnsubscribe = null;
    }

    // Redirect ke General Canvas
    switchCanvasView('general');
  }
  window.exitDatabaseMode = exitDatabaseMode;

  function renderOnlineUsersStackHtml(users) {
    if (!users || !users.length) return '';
    const MAX_PREVIEW = 3;
    const previews = users.slice(0, MAX_PREVIEW);
    const remaining = users.length - MAX_PREVIEW;

    const avatarsHtml = previews.map(u => {
      const bg = u.color || (u.type === 'admin' ? '#EA580C' : (u.type === 'nakes' ? '#06B6D4' : '#8B5CF6'));
      const tip = `${escapeHtml(u.name || 'User')} (${escapeHtml(u.role || u.type || 'Aktif')}) â€¢ Online`;
      const initials = escapeHtml(u.initials || (u.name ? u.name.substring(0, 2).toUpperCase() : 'US'));
      return `
        <span class="db-online-avatar" style="background:${bg};" title="${tip}">
          ${initials}
          <span class="db-online-dot"></span>
        </span>
      `;
    }).join('');

    const moreHtml = remaining > 0 ? `
      <span class="db-online-avatar db-online-more" title="+${remaining} pengguna lainnya (Admin, Nakes, User)">+${remaining}</span>
    ` : '';

    return `
      <div class="db-card-online-group" id="db-card-online-group-users" title="${users.length} Pengguna Online (Admin, Nakes, User) — Klik untuk rincian data">
        <div class="db-online-avatars">
          ${avatarsHtml}
          ${moreHtml}
        </div>
        <span class="db-online-label"><span class="db-online-pulse"></span>${users.length} Online</span>
      </div>
    `;
  }

  async function updateOnlineUsersBadge() {
    try {
      const res = await fetch('/api/database/online-users');
      const data = await res.json();
      if (data && data.status === 'success' && Array.isArray(data.users)) {
        cachedOnlineUsers = data.users;
      }
    } catch(err) {
      console.warn('[OnlineUsers] Gagal fetch status online:', err);
    }

    if (!cachedOnlineUsers.length) {
      cachedOnlineUsers = [
        { id: "usr_hz_001", name: "Haidar Rifky (Hanzz)", initials: "HZ", role: "Super Admin", type: "admin", status: "online", color: "#EA580C" },
        { id: "usr_sk_002", name: "Dr. Sarah K.", initials: "SK", role: "Nakes / Dokter Spesialis", type: "nakes", status: "online", color: "#06B6D4" },
        { id: "usr_ar_003", name: "Alex R.", initials: "AR", role: "User / ML Core", type: "user", status: "online", color: "#8B5CF6" },
        { id: "usr_bs_004", name: "dr. Budi S., Sp.S", initials: "BS", role: "Nakes / Neurologist", type: "nakes", status: "online", color: "#10B981" },
        { id: "usr_pt_104", name: "Tn. Hartono (68th)", initials: "TH", role: "User / Pasien", type: "user", status: "online", color: "#3B82F6" }
      ];
    }

    // Pasang atau perbarui badge di card users di kanvas
    const userCard = document.querySelector('.canvas-node.db-card[data-col-name="users"]');
    if (userCard) {
      let existingGroup = userCard.querySelector('.db-card-online-group');
      const htmlStr = renderOnlineUsersStackHtml(cachedOnlineUsers);
      if (existingGroup) {
        existingGroup.outerHTML = htmlStr;
      } else {
        const dummy = document.createElement('div');
        dummy.innerHTML = htmlStr;
        if (dummy.firstElementChild) {
          userCard.appendChild(dummy.firstElementChild);
        }
      }

      // Klik pill membuka drawer users
      const onlinePill = userCard.querySelector('.db-card-online-group');
      if (onlinePill) {
        onlinePill.onclick = (e) => {
          e.stopPropagation();
          openDatabaseDrawer('users');
        };
      }
    }
  }

  function renderDatabaseCard(node) {
    const el = document.createElement('div');
    const isDataset = node.type === 'dataset';
    el.className = `canvas-node db-card ${isDataset ? 'db-card-dataset' : ''}`;
    el.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top  = `${node.y}px`;
    el.setAttribute('data-col-name', node.name);
    el.setAttribute('data-dbl-hint', 'Klik 2x untuk lihat isi dokumen');

    const iconBox = `<div class="card-icon-slot">${getDbSvgIcon(node)}</div>`;
    const countBadge = `<div class="db-card-badge ${isDataset ? 'db-card-badge-dataset' : ''}">${node.count} ${isDataset ? 'Baris' : 'Docs'}</div>`;
    const portsHtml = renderPortsHtml(node);
    const isUsersCard = (node.name === 'users' || node.id === 'db-users');
    const onlineHtml = isUsersCard ? renderOnlineUsersStackHtml(cachedOnlineUsers) : '';

    el.innerHTML = `
      ${iconBox}
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label" style="color:${isDataset ? '#F59E0B' : '#06B6D4'};font-weight:700;">${node.category || 'DATABASE'}</div>
        <div class="card-title-main" title="${node.name}">${node.name}</div>
      </div>
      ${countBadge}
      ${onlineHtml}
      ${portsHtml}
    `;

    // Attach drag & drop engine (identical to folder / architecture cards)
    attachDraggable(el, node);

    // Single click: Focus card & sync selection with sidebar
    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      if (e.target.closest('.node-port') || e.target.closest('.db-card-online-group')) return;
      setActiveNode(node.id);
      $$('.sidebar-db-item').forEach(item => {
        item.classList.toggle('active', item.dataset.colName === node.name);
      });
    });

    // Double-click (2x tekan) opens Database Showcase Drawer!
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.db-card-online-group')) return;
      e.preventDefault();
      e.stopPropagation();
      openDatabaseDrawer(node.name, node);
    });

    // Klik pill online di card users membuka drawer users
    if (isUsersCard) {
      setTimeout(() => {
        const onlinePill = el.querySelector('.db-card-online-group');
        if (onlinePill) {
          onlinePill.onclick = (ev) => {
            ev.stopPropagation();
            openDatabaseDrawer('users');
          };
        }
      }, 20);
    }

    nodesLayer.appendChild(el);
  }

  function switchSidebarTab(tab) {
    const isDb = (tab === 'database');
    // --- Tabs ---
    tabBtnFiles?.classList.toggle('active', !isDb);
    tabBtnDb?.classList.add('active');
    if (!isDb) tabBtnDb?.classList.remove('active');
    if (paneTabFiles) paneTabFiles.style.display = isDb ? 'none' : 'flex';
    if (paneTabDb) paneTabDb.style.display = isDb ? 'flex' : 'none';

    // --- Sidebar icon ---
    const iconFolder = $('#sidebar-icon-folder');
    const iconDb     = $('#sidebar-icon-db');
    if (iconFolder) iconFolder.style.display = isDb ? 'none' : 'block';
    if (iconDb)     iconDb.style.display     = isDb ? 'block' : 'none';

    // --- Sidebar title ---
    const sidebarTitle = $('#sidebar-title');
    if (sidebarTitle) sidebarTitle.textContent = isDb ? 'Koleksi Basis Data' : 'Struktur Folder';

    // --- Actions ---
    const actFiles = $('#sidebar-actions-files');
    const actDb    = $('#sidebar-actions-db');
    if (actFiles) actFiles.style.display = isDb ? 'none' : 'flex';
    if (actDb)    actDb.style.display    = isDb ? 'flex' : 'none';

    // --- Search placeholder ---
    const searchInput = $('#tree-search-input');
    if (searchInput) searchInput.placeholder = isDb ? 'Filter koleksi & field schema...' : 'Filter folder & berkas...';

    // --- Quick chips ---
    const chipsFiles = $('#quick-chips-files');
    const chipsDb    = $('#quick-chips-db');
    if (chipsFiles) chipsFiles.style.display = isDb ? 'none' : 'flex';
    if (chipsDb)    chipsDb.style.display    = isDb ? 'flex' : 'none';

    // --- Filter bar in topbar ---
    const filterBarFiles = $('#filter-bar-files');
    const filterBarDb    = $('#filter-bar-db');
    if (filterBarFiles) filterBarFiles.style.display = isDb ? 'none' : 'flex';
    if (filterBarDb)    filterBarDb.style.display    = isDb ? 'flex' : 'none';
    // Reset dropdown label to "Semua" when switching modes (SVG icon stays fixed in HTML)
    if (!isDb) {
      const lbl = $('#filter-label-files');
      if (lbl) lbl.textContent = 'Semua';
      $('#filter-menu-files')?.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
      $('#filter-menu-files')?.querySelector('.filter-option')?.classList.add('active');
    } else {
      const lbl = $('#filter-label-db');
      if (lbl) lbl.textContent = 'Semua Koleksi';
      $('#filter-menu-db')?.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
      $('#filter-menu-db')?.querySelector('.filter-option')?.classList.add('active');
    }
    STATE.activeFilter = 'all';
    applyNodeFilter('all');

    // --- Detail card label ---
    const detailName = $('#detail-item-name');
    const detailPath = $('#detail-item-path');
    if (isDb) {
      if (detailName) detailName.textContent = 'Pilih koleksi atau dokumen';
      if (detailPath) detailPath.textContent = 'Klik kartu koleksi untuk membuka Database Viewer';
    } else {
      if (detailName) detailName.textContent = 'Pilih berkas atau folder';
      if (detailPath) detailPath.textContent = 'Klik salah satu item untuk melihat detail & relasinya';
    }

    if (isDb) loadSidebarDatabaseCollections();
  }

  async function loadSidebarDatabaseCollections() {
    if (!sidebarDbList) return;
    if (STATE.dbCollections && STATE.dbCollections.length) {
      renderSidebarDatabaseList(STATE.dbCollections);
      return;
    }
    try {
      const res = await fetch('/api/database/collections');
      const data = await res.json();
      if (data.status === 'success' && data.collections) {
        STATE.dbCollections = data.collections;
        renderSidebarDatabaseList(data.collections);
      } else {
        renderSidebarDatabaseList(FALLBACK_DB_COLLECTIONS);
      }
    } catch (err) {
      renderSidebarDatabaseList(FALLBACK_DB_COLLECTIONS);
    }
  }

  function renderSidebarDatabaseList(collections) {
    if (!sidebarDbList) return;
    sidebarDbList.innerHTML = collections.map(c => `
      <div class="sidebar-db-item" data-col-id="${c.id}" data-col-name="${c.name}">
        <div class="sdb-icon-box">${getDbSvgIcon(c)}</div>
        <div class="sdb-info">
          <div class="sdb-name">${escapeHtml(c.name)}</div>
          <div class="sdb-meta">
            <span class="sdb-type-pill ${c.type === 'dataset' ? 'sdb-type-dataset' : ''}">${c.type.toUpperCase()}</span>
            <span class="sdb-count">${c.count} ${c.type === 'dataset' ? 'baris' : 'docs'}</span>
          </div>
        </div>
      </div>
    `).join('');

    $$('.sidebar-db-item').forEach(el => {
      el.addEventListener('click', () => {
        const colId = el.dataset.colId;
        const colName = el.dataset.colName;
        if (!STATE.databaseMode) {
          enterDatabaseMode().then(() => {
            setTimeout(() => {
              focusNode(colId);
              openDatabaseDrawer(colName);
            }, 100);
          });
        } else {
          focusNode(colId);
          openDatabaseDrawer(colName);
        }
      });
    });
  }

  /* =====================================================================
     10. CUSTOM CONTEXT MENU (RIGHT-CLICK)
     ===================================================================== */
  function getCtxSvg(icon) {
    const icons = {
      home: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
      file: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
      code: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
      database: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
      dataset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      arch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
      fit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
      grid: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
      sync: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
      copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
      search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
      sticky: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      pan: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>`,
      connect: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      table: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>`
    };
    return icons[icon] || icons.file;
  }

  function showCustomContextMenu(x, y, node, element) {
    if (!contextMenu) contextMenu = $('#node-context-menu');
    if (!contextMenu) return;

    STATE.contextTargetNode = node;
    STATE.contextTargetElement = element;
    STATE.contextClickCoords = { x, y };

    let html = '';

    // KASUS 1: Klik Kanan pada CARD / NODE
    if (node) {
      const isDb = node.kind === 'database' || (element && element.classList.contains('db-card')) || node.id?.startsWith('db-');
      const isSticky = node.kind === 'sticky' || (element && element.classList.contains('canvas-sticky-note'));
      const isFolder = node.kind === 'folder' || (element && element.classList.contains('canvas-node') && !element.classList.contains('db-card') && !element.classList.contains('file-card'));

      if (isDb) {
        const colTitle = escapeHtml(node.name || node.title || 'Koleksi Basis Data');
        const isDataset = (node.name || node.title || '').endsWith('.csv') || node.type === 'dataset';
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg(isDataset ? 'dataset' : 'database')}</span>
            <span class="ctx-header-title">${colTitle}</span>
            <span class="ctx-header-badge">${isDataset ? 'DATASET' : 'FIRESTORE'}</span>
          </div>
          <div class="ctx-item primary" data-action="db-showcase">
            <span class="ctx-item-icon">${getCtxSvg('table')}</span>
            <span class="ctx-item-label">Buka Dokumen (Showcase)</span>
            <span class="ctx-shortcut">2x Klik</span>
          </div>
          <div class="ctx-item" data-action="db-copy-name">
            <span class="ctx-item-icon">${getCtxSvg('copy')}</span>
            <span class="ctx-item-label">Salin Nama Koleksi</span>
          </div>
          <div class="ctx-item" data-action="db-focus-sidebar">
            <span class="ctx-item-icon">${getCtxSvg('search')}</span>
            <span class="ctx-item-label">Sorot di Sidebar Basis Data</span>
          </div>
          <div class="ctx-item" data-action="focus-node">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas di Sini</span>
          </div>
        `;
      } else if (isSticky) {
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('sticky')}</span>
            <span class="ctx-header-title">Catatan Tempel</span>
          </div>
          <div class="ctx-item" data-action="sticky-copy">
            <span class="ctx-item-icon">${getCtxSvg('copy')}</span>
            <span class="ctx-item-label">Salin Isi Catatan</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item danger" data-action="sticky-delete">
            <span class="ctx-item-icon">${getCtxSvg('trash')}</span>
            <span class="ctx-item-label">Hapus Catatan Tempel</span>
          </div>
        `;
      } else if (isFolder) {
        const fTitle = escapeHtml(node.name || node.title || 'Direktori');
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-header-title">${fTitle}</span>
            <span class="ctx-header-badge">FOLDER</span>
          </div>
          <div class="ctx-item primary" data-action="folder-drilldown">
            <span class="ctx-item-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-item-label">Buka & Telusuri Folder</span>
            <span class="ctx-shortcut">2x Klik</span>
          </div>
          <div class="ctx-item" data-action="copy-path">
            <span class="ctx-item-icon">${getCtxSvg('copy')}</span>
            <span class="ctx-item-label">Salin Path Folder</span>
          </div>
          <div class="ctx-item" data-action="focus-tree">
            <span class="ctx-item-icon">${getCtxSvg('search')}</span>
            <span class="ctx-item-label">Tampilkan di File Tree</span>
          </div>
          <div class="ctx-item" data-action="focus-node">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas di Sini</span>
          </div>
        `;
      } else {
        // File / Module Card
        const fTitle = escapeHtml(node.name || node.title || 'Berkas Modul');
        const ext = (node.ext || node.lang || 'file').replace('.', '').toUpperCase();
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('file')}</span>
            <span class="ctx-header-title">${fTitle}</span>
            <span class="ctx-header-badge">${ext}</span>
          </div>
          <div class="ctx-item primary" data-action="file-showcase">
            <span class="ctx-item-icon">${getCtxSvg('code')}</span>
            <span class="ctx-item-label">Lihat Kode (Showcase)</span>
            <span class="ctx-shortcut">Klik</span>
          </div>
          <div class="ctx-item" data-action="copy-path">
            <span class="ctx-item-icon">${getCtxSvg('copy')}</span>
            <span class="ctx-item-label">Salin Path Berkas</span>
          </div>
          <div class="ctx-item" data-action="focus-tree">
            <span class="ctx-item-icon">${getCtxSvg('search')}</span>
            <span class="ctx-item-label">Tampilkan di File Tree</span>
          </div>
          <div class="ctx-item" data-action="focus-node">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas di Sini</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item" data-action="connect-from">
            <span class="ctx-item-icon">${getCtxSvg('connect')}</span>
            <span class="ctx-item-label">Tarik Sambungan Relasi</span>
          </div>
          <div class="ctx-item danger" data-action="hide-node">
            <span class="ctx-item-icon">${getCtxSvg('trash')}</span>
            <span class="ctx-item-label">Sembunyikan dari Kanvas</span>
          </div>
        `;
      }
    } 
    // KASUS 2: Klik Kanan pada KANVAS KOSONG (BLANK CANVAS)
    else {
      if (STATE.databaseMode) {
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('database')}</span>
            <span class="ctx-header-title">Database & Collections</span>
          </div>
          <div class="ctx-item primary" data-action="db-refresh-all">
            <span class="ctx-item-icon">${getCtxSvg('sync')}</span>
            <span class="ctx-item-label">Sinkronkan Data & Dokumen</span>
            <span class="ctx-shortcut">F5</span>
          </div>
          <div class="ctx-item" data-action="canvas-fit-view">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas (Fit View)</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="canvas-cycle-grid">
            <span class="ctx-item-icon">${getCtxSvg('grid')}</span>
            <span class="ctx-item-label">Ganti Pola Kisi (Grid)</span>
            <span class="ctx-shortcut">G</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item" data-action="switch-to-arch">
            <span class="ctx-item-icon">${getCtxSvg('arch')}</span>
            <span class="ctx-item-label">Beralih ke General Canvas</span>
          </div>
          <div class="ctx-item" data-action="switch-to-exp">
            <span class="ctx-item-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-item-label">Beralih ke Project File Explorer</span>
          </div>
        `;
      } else if (STATE.explorerMode) {
        const curPath = (STATE.explorerPath && STATE.explorerPath.length) ? `/${STATE.explorerPath.join('/')}` : '/ (Root)';
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-header-title">Explorer: ${escapeHtml(curPath)}</span>
          </div>
          <div class="ctx-item primary" data-action="exp-go-root">
            <span class="ctx-item-icon">${getCtxSvg('home')}</span>
            <span class="ctx-item-label">Kembali ke Direktori Root</span>
          </div>
          <div class="ctx-item" data-action="canvas-fit-view">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas (Fit View)</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="canvas-cycle-grid">
            <span class="ctx-item-icon">${getCtxSvg('grid')}</span>
            <span class="ctx-item-label">Ganti Pola Kisi (Grid)</span>
            <span class="ctx-shortcut">G</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item" data-action="switch-to-arch">
            <span class="ctx-item-icon">${getCtxSvg('arch')}</span>
            <span class="ctx-item-label">Beralih ke General Canvas</span>
          </div>
          <div class="ctx-item" data-action="switch-to-db">
            <span class="ctx-item-icon">${getCtxSvg('database')}</span>
            <span class="ctx-item-label">Beralih ke Koleksi Basis Data</span>
          </div>
        `;
      } else if (STATE.canvasView === 'general') {
        // General Canvas — topology overview
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('arch')}</span>
            <span class="ctx-header-title">General Architecture Canvas</span>
          </div>
          <div class="ctx-item primary" data-action="canvas-fit-view">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas (Fit View)</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="canvas-cycle-grid">
            <span class="ctx-item-icon">${getCtxSvg('grid')}</span>
            <span class="ctx-item-label">Ganti Pola Kisi (Grid)</span>
            <span class="ctx-shortcut">G</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item" data-action="switch-to-exp">
            <span class="ctx-item-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-item-label">Beralih ke Project File Explorer</span>
            <span class="ctx-shortcut">2</span>
          </div>
          <div class="ctx-item" data-action="switch-to-db">
            <span class="ctx-item-icon">${getCtxSvg('database')}</span>
            <span class="ctx-item-label">Beralih ke Koleksi Basis Data</span>
            <span class="ctx-shortcut">3</span>
          </div>
        `;
      } else {
        // Architecture Mode (Default / Explorer fallback)
        html = `
          <div class="ctx-header">
            <span class="ctx-header-icon">${getCtxSvg('arch')}</span>
            <span class="ctx-header-title">Neura Core Architecture</span>
          </div>
          <div class="ctx-item primary" data-action="canvas-add-sticky-at">
            <span class="ctx-item-icon">${getCtxSvg('sticky')}</span>
            <span class="ctx-item-label">Tambah Catatan di Sini</span>
            <span class="ctx-shortcut">N</span>
          </div>
          <div class="ctx-item" data-action="tool-set-pan">
            <span class="ctx-item-icon">${getCtxSvg('pan')}</span>
            <span class="ctx-item-label">Mode Geser Kanvas (Pan)</span>
            <span class="ctx-shortcut">H</span>
          </div>
          <div class="ctx-item" data-action="tool-set-connect">
            <span class="ctx-item-icon">${getCtxSvg('connect')}</span>
            <span class="ctx-item-label">Mode Sambungan Relasi</span>
            <span class="ctx-shortcut">C</span>
          </div>
          <div class="ctx-item" data-action="canvas-fit-view">
            <span class="ctx-item-icon">${getCtxSvg('fit')}</span>
            <span class="ctx-item-label">Pusatkan Kanvas (Fit View)</span>
            <span class="ctx-shortcut">Space</span>
          </div>
          <div class="ctx-item" data-action="canvas-cycle-grid">
            <span class="ctx-item-icon">${getCtxSvg('grid')}</span>
            <span class="ctx-item-label">Ganti Pola Kisi (Grid)</span>
            <span class="ctx-shortcut">G</span>
          </div>
          <div class="ctx-separator"></div>
          <div class="ctx-item" data-action="switch-to-db">
            <span class="ctx-item-icon">${getCtxSvg('database')}</span>
            <span class="ctx-item-label">Buka Koleksi Basis Data</span>
          </div>
          <div class="ctx-item" data-action="switch-to-exp">
            <span class="ctx-item-icon">${getCtxSvg('folder')}</span>
            <span class="ctx-item-label">Buka Project File Explorer</span>
          </div>
        `;
      }
    }

    contextMenu.innerHTML = html;
    contextMenu.style.display = 'block';

    // Position calculation with viewport boundaries clamp
    const menuW = 230;
    const menuH = contextMenu.offsetHeight || 250;
    const posX = Math.min(x, window.innerWidth - menuW - 14);
    const posY = Math.min(y, window.innerHeight - menuH - 14);
    contextMenu.style.left = `${Math.max(12, posX)}px`;
    contextMenu.style.top  = `${Math.max(12, posY)}px`;
  }

  function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
    STATE.contextTargetNode = null;
    STATE.contextTargetElement = null;
    STATE.contextClickCoords = null;
  }

  function attachContextMenuEvents() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#node-context-menu')) hideContextMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideContextMenu();
    });

    contextMenu?.addEventListener('click', (e) => {
      const item = e.target.closest('.ctx-item');
      if (!item) return;
      const action = item.dataset.action;
      const node = STATE.contextTargetNode;
      const coords = STATE.contextClickCoords;

      hideContextMenu();

      switch(action) {
        // Database card actions
        case 'db-showcase':
          if (node) openDatabaseDrawer(node.name || node.title, node);
          break;
        case 'db-copy-name':
          if (node) {
            const name = node.name || node.title || '';
            navigator.clipboard.writeText(name);
            showToast(`✓ Nama koleksi "${name}" disalin ke clipboard`, 1800);
          }
          break;
        case 'db-focus-sidebar':
          if (node) {
            switchSidebarTab('database');
            const sideItem = document.querySelector(`.sidebar-db-item[data-col-name="${node.name || node.title}"]`);
            if (sideItem) {
              sideItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              sideItem.classList.add('active');
            }
          }
          break;

        // File & Node actions
        case 'file-showcase':
          if (node) openCodeDrawer(node);
          break;
        case 'copy-path':
          if (node) {
            const p = node.path || node.title || node.name || '';
            navigator.clipboard.writeText(p);
            showToast(`✓ Path "${p}" disalin ke clipboard`, 1800);
          }
          break;
        case 'focus-tree':
          if (node) syncTreeToNode(node.name || node.title || node.id);
          break;
        case 'focus-node':
          if (node) focusNode(node.id);
          break;
        case 'connect-from':
          if (node) {
            setActiveTool('connect');
            setActiveNode(node.id);
            showToast('Mode Relasi: Pilih node target untuk menghubungkan', 2500);
          }
          break;
        case 'hide-node':
          if (node) {
            const id = node.id;
            STATE.nodes = STATE.nodes.filter(n => n.id !== id);
            STATE.connections = STATE.connections.filter(([s, d]) => s !== id && d !== id);
            $(`#${CSS.escape(id)}`)?.remove();
            renderAllConnections();
            updateStatusBar();
            updateMinimap();
            showToast('Node disembunyikan dari kanvas', 1500);
          }
          break;

        // Folder actions
        case 'folder-drilldown':
          if (node) {
            const fName = node.name || node.title;
            enterExplorerMode([...(STATE.explorerPath || []), fName]);
          }
          break;

        // Sticky Note actions
        case 'sticky-copy':
          if (node) {
            navigator.clipboard.writeText(node.text || '');
            showToast('✓ Teks catatan disalin ke clipboard', 1500);
          }
          break;
        case 'sticky-delete':
          if (node) {
            const el = $(`#${CSS.escape(node.id)}`);
            if (el) el.remove();
            STATE.stickies = STATE.stickies.filter(s => s.id !== node.id);
            showToast('Catatan tempel dihapus', 1500);
          }
          break;

        // Blank Canvas actions
        case 'db-refresh-all':
          updateOnlineUsersBadge();
          showToast('✓ Data koleksi & status online diperbarui', 1800);
          break;
        case 'canvas-fit-view':
          fitView(true);
          break;
        case 'canvas-cycle-grid':
          cycleGrid();
          break;
        case 'exp-go-root':
          enterExplorerMode([]);
          break;
        case 'canvas-add-sticky-at': {
          const rect = canvasContainer.getBoundingClientRect();
          const wx = ((coords?.x || window.innerWidth / 2) - rect.left - STATE.tx) / STATE.scale;
          const wy = ((coords?.y || window.innerHeight / 2) - rect.top  - STATE.ty) / STATE.scale;
          addStickyNote(wx, wy);
          break;
        }
        case 'tool-set-pan':
          setActiveTool('pan');
          break;
        case 'tool-set-connect':
          setActiveTool('connect');
          break;
        case 'switch-to-arch':
          switchCanvasView('general');
          break;
        case 'switch-to-exp':
          switchCanvasView('explorer', []);
          break;
        case 'switch-to-db':
          switchCanvasView('database');
          break;
      }
    });
  }
  window.showCustomContextMenu = showCustomContextMenu;
  window.showContextMenu = showCustomContextMenu;
  window.hideContextMenu = hideContextMenu;

  /* =====================================================================
     11. FILTER BAR ENGINE
     ===================================================================== */
  /* =====================================================================
     11. FILTER DROPDOWN ENGINE
     ===================================================================== */
  function attachFilterBarEvents() {
    // Helper: setup one dropdown (btn + menu + options)
    function setupDropdown(btnId, menuId, labelId) {
      const btn  = $(btnId);
      const menu = $(menuId);
      const lbl  = $(labelId);
      if (!btn || !menu) return;

      // Toggle open/close
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.classList.contains('open');
        // Close all menus first
        $$('.filter-dropdown-menu').forEach(m => m.classList.remove('open'));
        $$('.filter-dropdown-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
        if (!isOpen) {
          menu.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });

      // Option click
      menu.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          // Update active state
          menu.querySelectorAll('.filter-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');

          // Update button label only (icon stays as SVG in HTML)
          const label = opt.dataset.label || opt.textContent.trim();
          if (lbl) lbl.textContent = label;

          // Apply filter
          const filter = opt.dataset.filter;
          STATE.activeFilter = filter;
          applyNodeFilter(filter);

          // Close menu
          menu.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    }

    setupDropdown('#filter-dropdown-btn-files', '#filter-menu-files', '#filter-label-files');
    setupDropdown('#filter-dropdown-btn-db',    '#filter-menu-db',    '#filter-label-db');

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      $$('.filter-dropdown-menu').forEach(m => m.classList.remove('open'));
      $$('.filter-dropdown-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
    });
  }

  function applyNodeFilter(filter) {
    const dimmedIds = new Set();
    $$('.canvas-node, .file-card').forEach(el => {
      const node = STATE.nodes.find(n => n.id === el.id);
      if (!node) return;
      let match = true;
      if (filter === 'folder') {
        match = (node.kind !== 'file' && node.type !== 'file');
      } else if (filter === 'file') {
        match = (node.kind === 'file' || node.type === 'file');
      } else if (filter === 'python') {
        const ext = (node.ext || '').toLowerCase();
        const name = (node.name || node.title || node.label || '').toLowerCase();
        match = (node.lang === 'python') || ext === '.py' || name.endsWith('.py');
      } else if (filter === 'javascript') {
        const ext = (node.ext || '').toLowerCase();
        const name = (node.name || node.title || node.label || '').toLowerCase();
        match = (node.lang === 'javascript') || ext === '.js' || ext === '.ts' || name.endsWith('.js') || name.endsWith('.ts');
      } else if (filter === 'database') {
        match = (node.kind === 'database') || (node.type === 'firestore' || node.type === 'dataset' || (node.id && node.id.startsWith('db-')));
      } else if (filter === 'firestore') {
        match = node.type === 'firestore' || (node.id && node.id.startsWith('db-') && !node.id.includes('csv'));
      } else if (filter === 'dataset') {
        match = node.type === 'dataset' || (node.name && node.name.endsWith('.csv'));
      } else if (filter === 'auth') {
        match = node.id && (node.id.includes('users') || node.id.includes('sessions') || node.id.includes('admins'));
      } else if (filter === 'clinical') {
        match = node.id && (node.id.includes('consultations') || node.id.includes('predictions') || node.id.includes('ml_logs'));
      } else if (filter === 'page') {
        // General Canvas — UI Page cards
        match = node.kind === 'page';
      } else if (filter === 'llm') {
        // General Canvas — LLM / AI cards
        match = node.kind === 'llm' || node.kind === 'ai' || (node.id && node.id.startsWith('gen-llm'));
      } else if (filter === 'csv') {
        // General Canvas — CSV / Data Lake cards
        match = node.kind === 'csv' || node.type === 'dataset' || (node.id && node.id.startsWith('gen-csv'));
      } else if (filter === 'db') {
        // General Canvas — Database cards
        match = node.kind === 'db' || node.kind === 'database' || (node.id && node.id.startsWith('gen-db'));
      }
      if (match) {
        el.classList.remove('node-dimmed');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        el.style.filter = '';
      } else {
        el.classList.add('node-dimmed');
        dimmedIds.add(node.id);
      }
    });
    _applyConnectionDimming(dimmedIds, filter === 'all');
  }
  function _applyConnectionDimming(dimmedIds, resetAll) {
    $$('.connection-path').forEach(path => {
      if (resetAll) { path.classList.remove('path-dimmed'); return; }
      const idx = parseInt(path.dataset.idx, 10);
      if (isNaN(idx)) return;
      const conn = STATE.connections[idx];
      if (!conn) return;
      path.classList.toggle('path-dimmed', dimmedIds.has(conn[0]) || dimmedIds.has(conn[1]));
    });
    $$('.rel-label-badge').forEach((badge, idx) => {
      if (resetAll) { badge.classList.remove('label-dimmed'); return; }
      const conn = STATE.connections[idx];
      if (!conn) return;
      badge.classList.toggle('label-dimmed', dimmedIds.has(conn[0]) || dimmedIds.has(conn[1]));
    });
  }

  /* =====================================================================
     12. CANVAS MINIMAP ENGINE
     ===================================================================== */
  function attachMinimapEvents() {
    const minimap = $('#canvas-minimap');
    if (!minimap) return;

    minimap.addEventListener('click', (e) => {
      const rect = minimap.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;

      // Map minimap normalized coords back to world canvas
      const xs = STATE.nodes.map(n => n.x);
      const ys = STATE.nodes.map(n => n.y);
      const minX = Math.min(...xs, 0) - 100;
      const maxX = Math.max(...xs, 1400) + 300;
      const minY = Math.min(...ys, 0) - 100;
      const maxY = Math.max(...ys, 900) + 200;

      const targetWx = minX + mx * (maxX - minX);
      const targetWy = minY + my * (maxY - minY);

      const viewW = canvasContainer.offsetWidth || 800;
      const viewH = canvasContainer.offsetHeight || 600;
      STATE.tx = viewW / 2 - targetWx * STATE.scale;
      STATE.ty = viewH / 2 - targetWy * STATE.scale;
      applyTransform(true);
    });
  }

  function updateMinimap() {
    if (!minimapCanvas || !minimapViewportRect) return;

    const xs = STATE.nodes.map(n => n.x);
    const ys = STATE.nodes.map(n => n.y);
    const minX = Math.min(...xs, 0) - 100;
    const maxX = Math.max(...xs, 1400) + 300;
    const minY = Math.min(...ys, 0) - 100;
    const maxY = Math.max(...ys, 900) + 200;

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    // Render node dots on minimap
    minimapCanvas.innerHTML = STATE.nodes.map(node => {
      const nx = clamp(((node.x - minX) / rangeX) * 100, 2, 96);
      const ny = clamp(((node.y - minY) / rangeY) * 100, 2, 96);
      const color = node.kind === 'file' ? (node.lang === 'python' ? '#3B82F6' : '#EAB308') : (node.accentColor || '#D97757');
      return `<div class="minimap-node-dot" style="left:${nx}%;top:${ny}%;background:${color}" title="${node.title}"></div>`;
    }).join('');

    // Update viewport rectangle
    const viewW = canvasContainer.offsetWidth || 800;
    const viewH = canvasContainer.offsetHeight || 600;

    const vLeft = ( -STATE.tx / STATE.scale - minX ) / rangeX * 100;
    const vTop  = ( -STATE.ty / STATE.scale - minY ) / rangeY * 100;
    const vW    = ( viewW / STATE.scale ) / rangeX * 100;
    const vH    = ( viewH / STATE.scale ) / rangeY * 100;

    minimapViewportRect.style.left   = `${clamp(vLeft, 0, 100)}%`;
    minimapViewportRect.style.top    = `${clamp(vTop, 0, 100)}%`;
    minimapViewportRect.style.width  = `${clamp(vW, 2, 100)}%`;
    minimapViewportRect.style.height = `${clamp(vH, 2, 100)}%`;
  }

  /* =====================================================================
     13. TOOLS PALETTE EVENTS
     ===================================================================== */
  function attachToolbarEvents() {
    // Mode buttons (select, pan, lasso, connect)
    $$('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.mode));
    });

    $('#tool-add-node')?.addEventListener('click', () => openAddNodeModal());
    $('#tool-add-note')?.addEventListener('click', addStickyNote);

    $('#tool-zoom-in')?.addEventListener('click',  () => zoomStep(1.15));
    $('#tool-zoom-out')?.addEventListener('click', () => zoomStep(0.87));
    $('#tool-fit-view')?.addEventListener('click', () => fitView());

    // Zoom badge: click = reset 100%
    $('#zoom-badge')?.addEventListener('click', () => {
      const rect  = canvasContainer.getBoundingClientRect();
      const mx    = rect.width  / 2;
      const my    = rect.height / 2;
      const ratio = 1 / STATE.scale;
      STATE.tx    = mx - ratio * (mx - STATE.tx);
      STATE.ty    = my - ratio * (my - STATE.ty);
      STATE.scale = 1;
      applyTransform(true);
    });

    // Grid toggle (toolbar shortcut G)
    $('#tool-toggle-grid')?.addEventListener('click', () => cycleGrid());

    // Delete selected nodes
    $('#tool-delete-sel')?.addEventListener('click', deleteSelectedNodes);

    // Undo / Redo buttons
    $('#tool-undo')?.addEventListener('click', doUndo);
    $('#tool-redo')?.addEventListener('click', doRedo);
  }

  function cycleGrid() {
    const modes = ['dot', 'line', 'none'];
    const labels = { dot: 'Titik (Dot Grid)', line: 'Garis (Square Grid)', none: 'Polos (Blank Canvas)' };
    const idx = modes.indexOf(STATE.gridMode);
    STATE.gridMode = modes[(idx + 1) % modes.length];
    applyTransform();
    // Update toolbar & topbar buttons visual
    const btn = $('#tool-toggle-grid');
    if (btn) btn.classList.toggle('active', STATE.gridMode !== 'none');
    const topbarBtn = $('#btn-toggle-grid');
    if (topbarBtn) topbarBtn.classList.toggle('active', STATE.gridMode !== 'none');
    showToast(`Pola Kanvas: ${labels[STATE.gridMode]}`, 1600);
  }

  function deleteSelectedNodes() {
    const ids = [...STATE.lassoSelected];
    if (!ids.length && STATE.activeNodeId) ids.push(STATE.activeNodeId);
    if (!ids.length) return;
    snapshotUndo();
    ids.forEach(id => {
      STATE.nodes = STATE.nodes.filter(n => n.id !== id);
      STATE.connections = STATE.connections.filter(([s, d]) => s !== id && d !== id);
      $(`#${CSS.escape(id)}`)?.remove();
    });
    STATE.lassoSelected.clear();
    STATE.activeNodeId = null;
    renderAllConnections();
    updateStatusBar();
    updateMinimap();
    updateUndoRedoBtns();
  }

  function setActiveTool(mode) {
    const prevMode = STATE.mode;
    STATE.mode = mode;
    $$('[data-mode]').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));

    // Reset all canvas mode classes
    canvasContainer?.classList.remove('pan-mode', 'pan-cursor', 'connect-mode', 'lasso-mode');

    if (mode === 'pan') {
      canvasContainer?.classList.add('pan-mode', 'pan-cursor');
    } else if (mode === 'connect') {
      canvasContainer?.classList.add('connect-mode');
      showConnTypePicker();
    } else if (mode === 'lasso') {
      canvasContainer?.classList.add('lasso-mode');
    }

    // Hide conn picker when leaving connect mode
    if (prevMode === 'connect' && mode !== 'connect') {
      hideConnTypePicker();
      cancelConnectSource();
    }
    // Clear lasso when switching away
    if (prevMode === 'lasso' && mode !== 'lasso') {
      clearLassoSelection();
    }
  }

  function addStickyNote(customX = null, customY = null) {
    let wx, wy;
    if (customX !== null && customY !== null) {
      wx = customX - 80;
      wy = customY - 40;
    } else {
      const viewW = canvasContainer.offsetWidth  || 800;
      const viewH = canvasContainer.offsetHeight || 600;
      wx = (viewW / 2 - STATE.tx) / STATE.scale - 100;
      wy = (viewH / 2 - STATE.ty) / STATE.scale - 60;
    }
    const note = {
      id: `note-${Date.now()}`,
      text: 'Catatan arsitektur baru... klik untuk mengedit.',
      x: wx, y: wy,
      avatar: 'HZ', avatarColor: '#D97757',
      timestamp: 'Baru saja',
    };
    snapshotUndo();
    STATE.stickies.push(note);
    renderStickyNote(note);
    updateUndoRedoBtns();
    showToast('Catatan tempel ditambahkan', 1500);
  }

  /* =====================================================================
     13B. 3-CANVAS SYSTEM CONTROLLER (General -> Explorer -> Database)
     ===================================================================== */

  // --- GENERAL CARD RENDERER (for General Architecture Canvas) ---
  function renderGeneralCard(node) {
    const el = document.createElement('div');

    // Decide card class based on kind
    const isFile = node.kind === 'file' || node.kind === 'llm' || node.kind === 'csv';
    el.className = `${isFile ? 'file-card' : 'canvas-node'} ${node.borderVariant || 'card-border-neutral'} general-card`;
    el.id        = node.id;
    el.style.left = `${node.x}px`;
    el.style.top  = `${node.y}px`;
    if (node.kind === 'page') el.dataset.nodeKind = 'page';
    if (node.kind === 'llm')  el.dataset.nodeKind = 'llm';
    if (node.kind === 'csv')  el.dataset.nodeKind = 'csv';
    if (node.kind === 'db')   el.dataset.nodeKind = 'db';

    const iconHtml  = getNodeSvgIcon(node.iconType || 'folder');
    const portsHtml = renderPortsHtml(node);

    // Build category + badge chips
    let badgeHtml = '';
    if (node.kind === 'page')   badgeHtml = '<span class="gcard-badge gcard-badge-page">PAGE</span>';
    else if (node.kind === 'llm') badgeHtml = '<span class="gcard-badge gcard-badge-llm">LLM</span>';
    else if (node.kind === 'csv') badgeHtml = '<span class="gcard-badge gcard-badge-csv">CSV</span>';
    else if (node.kind === 'db')  badgeHtml = '<span class="gcard-badge gcard-badge-db">DB</span>';

    // Minimalist page preview thumbnail positioned right above the card
    let previewHtml = '';
    if (node.kind === 'page' && node.previewImage) {
      previewHtml = `
        <div class="gcard-page-preview-top" data-target-url="${node.routeUrl || '#'}" title="Klik untuk membuka/pratinjau ${escapeHtml(node.title)}">
          <div class="gcard-preview-header-mini">
            <div class="gcard-preview-dots">
              <span class="preview-dot dot-red"></span>
              <span class="preview-dot dot-yellow"></span>
              <span class="preview-dot dot-green"></span>
            </div>
            <span class="gcard-preview-path">${escapeHtml(node.title)}</span>
            <span class="gcard-preview-live-badge"><span class="live-dot-pulse"></span>LIVE</span>
          </div>
          <div class="gcard-preview-img-container">
            <img src="${node.previewImage}" alt="Preview ${escapeHtml(node.title)}" loading="lazy" class="gcard-preview-img" onerror="this.closest('.gcard-page-preview-top').style.display='none'" />
            <div class="gcard-preview-overlay">
              <span class="gcard-preview-zoom-btn">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                Buka
              </span>
            </div>
          </div>
        </div>
      `;
    } else if (node.kind === 'llm') {
      // Minimalist LLM streaming dialogue & engine preview positioned right above the card
      const modelFile = node.modelFile || 'gemma-2-2b-it-q4_k_m.gguf';
      const quant = node.quantization || 'Q4_K_M';
      const speed = node.speed || '24 tok/s';
      const backend = node.backend || 'CPU Engine';
      previewHtml = `
        <div class="gcard-llm-preview-top" title="Klik untuk membuka sesi konsultasi Neura Clinical LLM">
          <div class="gcard-preview-header-mini gcard-llm-header">
            <div class="gcard-preview-dots">
              <span class="preview-dot dot-purple"></span>
              <span class="preview-dot dot-cyan"></span>
              <span class="preview-dot dot-green"></span>
            </div>
            <span class="gcard-preview-path" id="gcard-llm-active-filename" title="${escapeHtml(modelFile)}">modelsLLM / ${escapeHtml(modelFile)}</span>
            <span class="gcard-llm-quant-badge" id="gcard-llm-quant-badge">${escapeHtml(quant)}</span>
          </div>
          <div class="gcard-llm-body">
            <div class="gcard-llm-models-row" id="gcard-llm-models-row">
              <span class="gcard-llm-model-pill active" title="Model Aktif: Gemma 2 2B Instruct (1.63 GB)">
                <span class="model-status-dot"></span> Gemma 2 2B (Aktif)
              </span>
              <span class="gcard-llm-model-pill" title="Model Tersedia: Llama 3.2 1B Instruct (770 MB)">
                <span class="model-status-dot"></span> Llama 3.2 1B
              </span>
            </div>
            <div class="gcard-llm-chat-snippet">
              <div class="gcard-llm-bubble user">
                <span class="llm-bubble-sender">Dokter:</span> Pasien MMSE 21, nWBV 0.72. Rekomendasi klinis?
              </div>
              <div class="gcard-llm-bubble ai">
                <span class="llm-bubble-sender" id="gcard-llm-sender-label">Gemma 2:</span> Indikasi awal Mild Cognitive Impairment. Disarankan evaluasi eTIV &amp; konfirmasi MRI.
                <span class="llm-cursor-blink"></span>
              </div>
            </div>
            <div class="gcard-llm-footer-bar">
              <div class="gcard-llm-meta">
                <span class="llm-meta-item">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  ${escapeHtml(speed)}
                </span>
                <span class="llm-meta-item">${escapeHtml(backend)}</span>
              </div>
              <span class="gcard-preview-zoom-btn llm-launch-btn">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Buka Chat
              </span>
            </div>
          </div>
        </div>
      `;
    }

    el.innerHTML = `
      ${previewHtml}
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${node.category || (node.kind || 'module').toUpperCase()}</div>
        <div class="card-title-main" title="${node.path || node.title}">${node.title}</div>
      </div>
      <div class="file-card-meta-slot">
        ${badgeHtml}
      </div>
      ${portsHtml}
    `;

    // Click handler for opening page if preview is clicked
    const previewEl = el.querySelector('.gcard-page-preview-top');
    if (previewEl && node.routeUrl) {
      previewEl.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(node.routeUrl, '_blank');
      });
    }

    // Click handler for opening chat session if LLM preview is clicked
    // Dynamic sync with backend LLM status
    if (node.kind === 'llm') {
      try {
        fetch('/api/features/llm-status')
          .then(r => r.json())
          .then(data => {
            if (!data) return;
            const activeModel = (data.available_models || []).find(m => m.active) || 
                                (data.model_name ? { filename: data.model_name, display_name: data.architecture || data.model_name } : null);
            if (activeModel) {
              const fileEl = el.querySelector('#gcard-llm-active-filename');
              if (fileEl) fileEl.textContent = `modelsLLM / ${activeModel.filename}`;
              const senderEl = el.querySelector('#gcard-llm-sender-label');
              if (senderEl) senderEl.textContent = (activeModel.display_name ? activeModel.display_name.split(' ')[0] : 'Gemma') + ':';
            }
          })
          .catch(() => {});
      } catch (_) {}
    }

    const llmPreviewEl = el.querySelector('.gcard-llm-preview-top');
    if (llmPreviewEl) {
      llmPreviewEl.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open('/app', '_blank');
      });
    }

    el.setAttribute('data-dbl-hint', node.desc || node.title);

    attachDraggable(el, node);

    // Single click: select & show detail
    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      if (e.target.closest('.node-port')) return;
      setActiveNode(node.id);
    });

    // Right-click handled by canvas-level listener
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showCustomContextMenu(e.clientX, e.clientY, node, el);
    });

    nodesLayer.appendChild(el);
  }
  window.renderGeneralCard = renderGeneralCard;

  function enterGeneralMode() {
    STATE.canvasView = 'general';
    STATE.explorerMode = false;
    STATE.databaseMode = false;
    closeAllTopbarDropdowns();

    try {
      localStorage.setItem('neura_active_canvas', 'general');
      localStorage.setItem('neura_active_mode', 'general');
      const url = new URL(window.location);
      url.searchParams.set('view', 'general');
      url.searchParams.delete('col');
      window.history.replaceState({}, '', url);
    } catch(e) {}

    // Update Topbar 3-button segmented control
    $$('.mode-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'general'));

    // Update Project dropdown items
    $('#pmenu-item-arch')?.classList.add('active');
    $('#pmenu-item-exp')?.classList.remove('active');
    $('#pmenu-item-db')?.classList.remove('active');
    const pTitle = $('#current-project-title');
    if (pTitle) pTitle.textContent = 'General Architecture Canvas';

    // Update Filter bars in topbar
    const fBarGen = $('#filter-bar-general');
    const fBarFiles = $('#filter-bar-files');
    const fBarDb = $('#filter-bar-db');
    if (fBarGen) fBarGen.style.display = 'flex';
    if (fBarFiles) fBarFiles.style.display = 'none';
    if (fBarDb) fBarDb.style.display = 'none';

    // Load General Nodes & Connections
    STATE.nodes = JSON.parse(JSON.stringify(GENERAL_NODES));
    STATE.connections = [...GENERAL_CONNECTIONS];

    // Hide stickies & show connections
    $$('.canvas-sticky-note').forEach(el => el.style.display = 'none');
    if (connSvg) connSvg.style.display = 'block';

    // Clear nodes layer and render general cards
    if (nodesLayer) nodesLayer.innerHTML = '';
    STATE.nodes.forEach(node => renderGeneralCard(node));
    renderAllConnections();

    // Hide breadcrumb
    if (canvasBreadcrumb) canvasBreadcrumb.style.display = 'none';

    // Update status bar
    if (statusSyncText) statusSyncText.textContent = 'Topologi Sistem Neura: 5 Kolom End-to-End';
    if (nodeCountEl) nodeCountEl.textContent = `${GENERAL_NODES.length} Entitas`;
    if (relCountEl) relCountEl.textContent = `${GENERAL_CONNECTIONS.length} Jalur Jaringan`;

    // Apply default filter
    applyNodeFilter('all');

    // Smooth fit view
    setTimeout(() => {
      fitView(true);
    }, 40);
  }
  window.enterGeneralMode = enterGeneralMode;

  async function switchCanvasView(viewName, extraPath = []) {
    STATE.canvasView = viewName;
    try {
      localStorage.setItem('neura_active_canvas', viewName);
      const url = new URL(window.location);
      url.searchParams.set('view', viewName);
      if (viewName !== 'database') url.searchParams.delete('col');
      window.history.replaceState({}, '', url);
    } catch(e) {}

    // Update Topbar segmented buttons
    $$('.mode-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === viewName));

    // Update Project dropdown items
    $('#pmenu-item-arch')?.classList.toggle('active', viewName === 'general');
    $('#pmenu-item-exp')?.classList.toggle('active', viewName === 'explorer');
    $('#pmenu-item-db')?.classList.toggle('active', viewName === 'database');

    const pTitle = $('#current-project-title');
    if (pTitle) {
      if (viewName === 'general') pTitle.textContent = 'General Architecture Canvas';
      if (viewName === 'explorer') pTitle.textContent = 'Project File Explorer';
      if (viewName === 'database') pTitle.textContent = 'Database & Collections Canvas';
    }

    // Update Filter bars visibility in topbar
    const fBarGen = $('#filter-bar-general');
    const fBarFiles = $('#filter-bar-files');
    const fBarDb = $('#filter-bar-db');
    if (fBarGen) fBarGen.style.display = (viewName === 'general') ? 'flex' : 'none';
    if (fBarFiles) fBarFiles.style.display = (viewName === 'explorer') ? 'flex' : 'none';
    if (fBarDb) fBarDb.style.display = (viewName === 'database') ? 'flex' : 'none';

    if (viewName === 'database') {
      await enterDatabaseMode();
    } else if (viewName === 'explorer') {
      closeDatabaseDrawer();
      STATE.databaseMode = false;
      await enterExplorerMode(extraPath);
    } else {
      closeDatabaseDrawer();
      STATE.databaseMode = false;
      enterGeneralMode();
    }
  }
  window.switchCanvasView = switchCanvasView;

  /* =====================================================================
     14. TOPBAR EVENTS & INTERACTIVE CONTROLS
     ===================================================================== */
  function closeAllTopbarDropdowns() {
    $('#project-dropdown-menu')?.classList.remove('show');
    $('#project-dropdown')?.classList.remove('dropdown-active');
    $('#collaborators-popup')?.classList.remove('show');
    $('#collaborators-stack')?.classList.remove('active');
    $('#export-dropdown-menu')?.classList.remove('show');
    $('#btn-export-diagram')?.classList.remove('active');
  }

  function updateThemeIcons(theme) {
    const sun = document.querySelector('.theme-icon-sun');
    const moon = document.querySelector('.theme-icon-moon');
    if (theme === 'light') {
      if (sun) sun.style.display = 'none';
      if (moon) moon.style.display = 'block';
    } else {
      if (sun) sun.style.display = 'block';
      if (moon) moon.style.display = 'none';
    }
  }

  function attachTopbarEvents() {
    // Initial Theme Icons Check
    const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    updateThemeIcons(initialTheme);

    // Theme Toggle
    $('#btn-theme-toggle')?.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') !== 'light';
      const next = isDark ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      updateThemeIcons(next);
      try { localStorage.setItem('neura_theme_v1', next); } catch(e) {}
      showToast(next === 'light' ? 'â˜€ï¸ Mode Terang Diaktifkan' : '🌙 Mode Gelap Diaktifkan', 1800);
    });

    // Toggle Grid
    $('#btn-toggle-grid')?.addEventListener('click', cycleGrid);

    // Project Switcher Dropdown
    const projBtn = $('#project-dropdown');
    const projMenu = $('#project-dropdown-menu');
    projBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = projMenu?.classList.contains('show');
      closeAllTopbarDropdowns();
      if (!isOpen) {
        projMenu?.classList.add('show');
        projBtn?.classList.add('dropdown-active');
      }
    });

    $('#pmenu-item-arch')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('general');
    });

    $('#pmenu-item-exp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('explorer', []);
    });

    $('#pmenu-item-db')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('database');
    });

    // ── 3-Canvas Segmented Control Buttons ─────────────────────
    $('#btn-mode-general')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('general');
    });
    $('#btn-mode-explorer')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('explorer', []);
    });
    $('#btn-mode-database')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllTopbarDropdowns();
      switchCanvasView('database');
    });

    // Collaborators Popover
    const collabStack = $('#collaborators-stack');
    const collabPopup = $('#collaborators-popup');
    collabStack?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = collabPopup?.classList.contains('show');
      closeAllTopbarDropdowns();
      if (!isOpen) {
        collabPopup?.classList.add('show');
        collabStack?.classList.add('active');
      }
    });

    // Export Dropdown
    const exportBtn = $('#btn-export-diagram');
    const exportMenu = $('#export-dropdown-menu');
    exportBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = exportMenu?.classList.contains('show');
      closeAllTopbarDropdowns();
      if (!isOpen) {
        exportMenu?.classList.add('show');
        exportBtn?.classList.add('active');
      }
    });

    $('#export-opt-png')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      downloadPngSnapshot();
    });

    $('#export-opt-svg')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      downloadSvgDiagram();
    });

    $('#export-opt-json')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      downloadJsonLayout();
    });

    $('#export-opt-copy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllTopbarDropdowns();
      copyArchitectureSummary();
    });

    // Explorer Mode Toggle Button
    $('#btn-toggle-explorer')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllTopbarDropdowns();
      if (STATE.databaseMode) exitDatabaseMode();
      if (STATE.explorerMode) {
        exitExplorerMode();
      } else {
        enterExplorerMode([]);
      }
    });

    // Database Canvas Toggle Button
    $('#btn-toggle-db')?.addEventListener('click', (e) => {
      e.preventDefault();
      closeAllTopbarDropdowns();
      if (STATE.databaseMode) {
        exitDatabaseMode();
      } else {
        enterDatabaseMode();
      }
    });

    // Search Input, Clear Button, and Enter-to-focus
    const searchClearBtn = $('#search-clear-btn');
    topbarSearch?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      STATE.searchQuery = q;
      if (searchClearBtn) {
        searchClearBtn.style.display = q ? 'block' : 'none';
      }
      filterNodes(q);
    });

    searchClearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (topbarSearch) {
        topbarSearch.value = '';
        searchClearBtn.style.display = 'none';
        topbarSearch.focus();
      }
      STATE.searchQuery = '';
      filterNodes('');
    });

    topbarSearch?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = topbarSearch.value.trim().toLowerCase();
        if (!q) return;
        const matchEl = document.querySelector('.canvas-node:not([style*="opacity: 0.2"]), .file-card:not([style*="opacity: 0.2"])');
        if (matchEl && matchEl.id) {
          focusNode(matchEl.id, true);
          const name = matchEl.querySelector('.card-title-main, .node-module-title, .file-card-name')?.textContent || matchEl.id;
          showToast(`Menyorot: ${name}`, 2200);
        } else {
          showToast('Tidak ada modul yang cocok dengan pencarian.', 2000);
        }
      } else if (e.key === 'Escape') {
        if (topbarSearch) {
          topbarSearch.value = '';
          if (searchClearBtn) searchClearBtn.style.display = 'none';
          topbarSearch.blur();
        }
        STATE.searchQuery = '';
        filterNodes('');
      }
    });

    // Global Dismiss for dropdowns and Ctrl+K search shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        topbarSearch?.focus();
        topbarSearch?.select();
      } else if (e.key === 'Escape') {
        closeAllTopbarDropdowns();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-dropdown-menu, .project-pill-dropdown, .collaborators-wrapper, .export-btn-wrapper')) {
        closeAllTopbarDropdowns();
      }
    });
  }
  window.showCustomContextMenu = showCustomContextMenu;
  window.showContextMenu = showCustomContextMenu;
  window.hideContextMenu = hideContextMenu;

  function filterNodes(query) {
    const dimmedIds = new Set();
    $$('.canvas-node, .file-card').forEach(el => {
      if (!query) {
        el.classList.remove('node-dimmed');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        el.style.filter = '';
        return;
      }
      const title = el.querySelector('.card-title-main, .node-module-title, .file-card-name')?.textContent.toLowerCase() || '';
      const cat   = el.querySelector('.card-category-label, .node-module-path')?.textContent.toLowerCase() || '';
      const match = title.includes(query) || cat.includes(query);
      if (match) {
        el.classList.remove('node-dimmed');
        el.style.opacity = '';
        el.style.pointerEvents = '';
        el.style.filter = '';
      } else {
        el.classList.add('node-dimmed');
        const node = STATE.nodes.find(n => n.id === el.id);
        if (node) dimmedIds.add(node.id);
      }
    });
    _applyConnectionDimming(dimmedIds, !query);
  }

  /* =====================================================================
     14B. EXPORT FUNCTIONS (JSON, SVG, PNG, COPY)
     ===================================================================== */
  function downloadJsonLayout() {
    const data = {
      project: 'Neura Architecture & Canvas Layout',
      exportedAt: new Date().toISOString(),
      viewMode: STATE.explorerMode ? 'explorer' : 'architecture',
      path: STATE.explorerPath,
      nodes: STATE.nodes.map(n => ({
        id: n.id,
        name: n.name || n.label,
        x: n.x,
        y: n.y,
        category: n.category,
        type: n.type || n.kind
      })),
      connections: STATE.connections || []
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neura-canvas-${STATE.explorerMode ? 'explorer' : 'architecture'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a);
    showToast('✓ Berkas JSON tata letak berhasil diunduh!', 2500);
  }

  function downloadSvgDiagram() {
    const nodes = STATE.nodes;
    if (!nodes.length) { showToast('Kanvas kosong, tidak ada yang diekspor.', 2000); return; }
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 320;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 160;
    const width = Math.max(800, maxX - minX);
    const height = Math.max(600, maxY - minY);

    const svgWires = $('#canvas-connections');
    const wiresInner = svgWires ? svgWires.innerHTML : '';

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
    <style>
      text { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      .node-rect { fill: #171614; stroke: rgba(255,255,255,0.12); rx: 12; ry: 12; }
      .node-title { fill: #F4F1EA; font-size: 13px; font-weight: 600; }
      .node-cat { fill: #D97757; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
    </style>
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#0A0908" />
    <g class="wires">${wiresInner}</g>
    <g class="nodes">`;

    nodes.forEach(n => {
      const title = (n.name || n.label || 'Node').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const cat = (n.category || n.type || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      svgContent += `
      <g transform="translate(${n.x}, ${n.y})">
        <rect class="node-rect" width="220" height="60" />
        <text class="node-cat" x="16" y="24">${cat.toUpperCase()}</text>
        <text class="node-title" x="16" y="44">${title}</text>
      </g>`;
    });

    svgContent += `</g></svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neura-architecture-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(a);
    showToast('✓ Berkas SVG diagram berhasil diunduh!', 2500);
  }

  function downloadPngSnapshot() {
    const nodes = STATE.nodes;
    if (!nodes.length) { showToast('Kanvas kosong, tidak ada yang diekspor.', 2000); return; }
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 320;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 160;
    const width = Math.max(1200, maxX - minX);
    const height = Math.max(800, maxY - minY);

    const svgWires = $('#canvas-connections');
    const wiresInner = svgWires ? svgWires.innerHTML : '';

    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">
    <style>
      text { font-family: sans-serif; }
      .node-box { fill: #161513; stroke: #38342E; stroke-width: 1.5; rx: 10; }
      .node-title { fill: #FFFFFF; font-size: 14px; font-weight: bold; }
      .node-cat { fill: #D97757; font-size: 10px; font-weight: bold; }
    </style>
    <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#0D0C0B" />
    <g>${wiresInner}</g>
    <g>`;

    nodes.forEach(n => {
      const title = (n.name || n.label || 'Node').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const cat = (n.category || n.type || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
      svgString += `
      <g transform="translate(${n.x}, ${n.y})">
        <rect class="node-box" width="220" height="64" rx="10" />
        <text class="node-cat" x="16" y="24">${cat.toUpperCase()}</text>
        <text class="node-title" x="16" y="46">${title}</text>
      </g>`;
    });
    svgString += `</g></svg>`;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `neura-canvas-snapshot-${Date.now()}.png`;
        a.click();
        showToast('✓ Gambar PNG resolusi tinggi berhasil disimpan!', 2500);
      } catch (err) {
        downloadSvgDiagram();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      downloadSvgDiagram();
    };
    img.src = url;
  }

  function copyArchitectureSummary() {
    const summary = `# Neura Architecture Overview
Tanggal: ${new Date().toLocaleDateString('id-ID')}
Mode: ${STATE.explorerMode ? 'Project File Explorer' : 'Neura Core Architecture'}
Total Node: ${STATE.nodes.length}
Total Relasi: ${STATE.connections.length}

## Modul Terdaftar:
${STATE.nodes.map(n => `- **${n.name || n.label}** (${n.category || n.type || 'Module'}): koordinat (${Math.round(n.x)}, ${Math.round(n.y)})`).join('\n')}

## Koneksi Antar-Sistem:
${STATE.connections.map(c => `- ${c[0]} --[${c[3] || c[2]}]--> ${c[1]}`).join('\n')}
`;
    navigator.clipboard.writeText(summary).then(() => {
      showToast('✓ Ringkasan markdown arsitektur disalin ke clipboard!', 2500);
    }).catch(() => {
      showToast('Gagal menyalin ke clipboard', 2000);
    });
  }

  /* =====================================================================
     14B. CANVAS DIRECTORY EXPLORER ENGINE
     ===================================================================== */
  let isExplorerNavigating = false;

  // Curated architectural relation connectors for root modules
  const ROOT_EXPLORER_CONNECTIONS = [
    // Web Server Connections (server.py running web application)
    ['exp-server-py', 'exp-api',       'calls',    'Mount API'],
    ['exp-server-py', 'exp-public',    'default',  'Serve Web'],
    ['exp-server-py', 'exp-core',      'contains', 'Core Logger'],
    ['exp-server-py', 'exp-configs',   'imports',  'Load Config'],

    // Agents & Core
    ['exp-main-py',         'exp-core',      'calls',    'Core Hub'],
    ['exp-voice_agent-py',  'exp-modelsLLM', 'ml',       'Voice AI'],

    // AI & Multimodal Pipeline
    ['exp-core',      'exp-modelsLLM', 'core',     'Warmup Pipe'],
    ['exp-modelsLLM', 'exp-features',  'provides', 'Biomarkers'],
    ['exp-modelsLLM', 'exp-datasets',  'ml',       'OASIS Feed'],

    // Terminal Automation & Dev Tools
    ['exp-scripts',   'exp-training',  'default',  'Train Pipe'],
    ['exp-scripts',   'exp-tests',     'default',  'Run Tests'],
    ['exp-training',  'exp-data',      'contains', 'Data Lake'],
    ['exp-training',  'exp-modelsLLM', 'provides', 'Weights'],
  ];

  // Specific architectural layout for root cards (coords + roles)
  const ROOT_ARCHITECTURAL_LAYOUT = {
    // Row 0: Runtime & Web Entrypoints (y = 80)
    'server.py':            { x: 420,  y: 80,  category: '⚡ WEB RUNNER',        icon: 'server',   border: 'card-border-server', hero: true },
    'main.py':              { x: 710,  y: 80,  category: 'CLI RUNNER',          icon: 'terminal', border: 'card-border-emerald' },
    'voice_agent.py':       { x: 1000, y: 80,  category: 'VOICE AGENT',         icon: 'brain',    border: 'card-border-purple' },

    // Row 1: Core Services & Web Frontend (y = 220)
    'public':               { x: 130,  y: 220, category: 'UI / FRONTEND SPA',   icon: 'palette',  border: 'card-border-emerald' },
    'api':                  { x: 420,  y: 220, category: 'REST API ROUTER',     icon: 'api',      border: 'card-border-blue' },
    'core':                 { x: 710,  y: 220, category: 'CORE ENGINE',         icon: 'cyclone',  border: 'card-border-emerald' },
    'configs':              { x: 1000, y: 220, category: 'SYSTEM CONFIG',       icon: 'folder',   border: 'card-border-neutral' },

    // Row 2: AI & Clinical Data Pipeline (y = 360)
    'modelsLLM':            { x: 130,  y: 360, category: 'AI / MULTIMODAL',     icon: 'brain',    border: 'card-border-purple' },
    'features':             { x: 420,  y: 360, category: 'FEATURE PIPELINE',    icon: 'folder',   border: 'card-border-purple' },
    'datasets':             { x: 710,  y: 360, category: 'BIOMARKER DATA',      icon: 'database', border: 'card-border-amber' },
    'data':                 { x: 1000, y: 360, category: 'DATA LAKE',           icon: 'folder',   border: 'card-border-amber' },

    // Row 3: Terminal Automation & Research (y = 500)
    'scripts':              { x: 130,  y: 500, category: 'PROCESSING TERMINAL', icon: 'terminal', border: 'card-border-amber' },
    'training':             { x: 420,  y: 500, category: 'MODEL TRAINING',      icon: 'folder',   border: 'card-border-purple' },
    'tests':                { x: 710,  y: 500, category: 'TEST SUITE',          icon: 'folder',   border: 'card-border-neutral' },
    'notebooks':            { x: 1000, y: 500, category: 'NOTEBOOKS',           icon: 'folder',   border: 'card-border-neutral' },

    // Row 4: Independent Scratch & Project Documents (y = 660)
    'scratch':              { x: 130,  y: 660, category: 'SCRATCH EXPERIMENT',  icon: 'folder',   border: 'card-border-neutral' },
    'about_app.json':       { x: 420,  y: 660, category: 'JSON METADATA',       icon: 'database', border: 'card-border-amber' },
    'README.md':            { x: 710,  y: 660, category: 'DOCUMENTATION',       icon: 'code',     border: 'card-border-neutral' },
    'requirements.txt':     { x: 1000, y: 660, category: 'DEPENDENCIES',        icon: 'code',     border: 'card-border-neutral' },

    // Row 5: Dev Dependencies & Dev Notes (y = 780)
    'requirements-dev.txt': { x: 420,  y: 780, category: 'DEV DEPS',            icon: 'code',     border: 'card-border-neutral' },
    'implementations.txt':  { x: 710,  y: 780, category: 'DEV NOTES',           icon: 'code',     border: 'card-border-neutral' },
  };

  function getItemsAtPath(tree, pathArray) {
    if (!tree || !tree.length) return [];
    if (!pathArray || !pathArray.length) return tree;
    let current = tree;
    for (const seg of pathArray) {
      const cleanSeg = seg.split('/')[0].split('(')[0].trim().toLowerCase();
      const match = current.find(item => {
        const itemName = (item.name || '').toLowerCase().trim();
        return itemName === cleanSeg && item.type === 'directory';
      });
      if (!match || !match.children) return [];
      current = match.children;
    }
    return current;
  }

  function layoutExplorerGrid(items, isRoot = false) {
    const list = Array.isArray(items) ? items : [];

    if (isRoot) {
      // Architectural Root Layout with deliberate positioning & roles
      const placedNames = new Set();
      const result = [];

      list.forEach(item => {
        const layoutMeta = ROOT_ARCHITECTURAL_LAYOUT[item.name];
        const isDir = item.type === 'directory';
        const id = `exp-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

        if (layoutMeta) {
          placedNames.add(item.name);
          result.push({
            id: id,
            kind: isDir ? 'folder' : 'file',
            type: item.type,
            name: item.name,
            title: item.name,
            path: item.path,
            ext: item.ext,
            size: item.size,
            count: item.count !== undefined ? item.count : (item.children ? item.children.length : 0),
            children: item.children,
            category: layoutMeta.category,
            borderVariant: layoutMeta.border,
            iconType: layoutMeta.icon,
            hero: Boolean(layoutMeta.hero),
            x: layoutMeta.x,
            y: layoutMeta.y,
            ports: [
              { side: 'top',    type: 'green', symbol: '+' },
              { side: 'bottom', type: 'green', symbol: '+' },
              { side: 'left',   type: 'green', symbol: '+' },
              { side: 'right',  type: 'green', symbol: '+' },
            ]
          });
        }
      });

      // Any unexpected or extra item in root gets appended cleanly
      const unplaced = list.filter(item => !placedNames.has(item.name));
      unplaced.forEach((item, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const isDir = item.type === 'directory';
        result.push({
          id: `exp-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
          kind: isDir ? 'folder' : 'file',
          type: item.type,
          name: item.name,
          title: item.name,
          path: item.path,
          ext: item.ext,
          size: item.size,
          count: item.count !== undefined ? item.count : (item.children ? item.children.length : 0),
          children: item.children,
          category: isDir ? 'DIREKTORI' : (item.ext ? item.ext.replace('.', '').toUpperCase() : 'BERKAS'),
          borderVariant: 'card-border-neutral',
          iconType: isDir ? 'folder' : 'code',
          x: 130 + col * (244 + 46),
          y: 900 + row * (68 + 40),
          ports: [
            { side: 'top',    type: 'green', symbol: '+' },
            { side: 'bottom', type: 'green', symbol: '+' },
            { side: 'left',   type: 'green', symbol: '+' },
            { side: 'right',  type: 'green', symbol: '+' },
          ]
        });
      });

      return result;
    }

    // Generic subfolder layout (inside public/, api/, etc.)
    const COLS = 4;
    const CARD_W = 244;
    const CARD_H = 68;
    const GAP_X = 44;
    const GAP_Y = 36;
    const START_X = 100;
    const START_Y = 80;

    const dirs = list.filter(i => i.type === 'directory').sort((a,b) => (a.name||'').localeCompare(b.name||''));
    const files = list.filter(i => i.type !== 'directory').sort((a,b) => (a.name||'').localeCompare(b.name||''));

    const result = [];

    // Layout directories
    dirs.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      let borderVariant = 'card-border-neutral';
      const name = (item.name || '').toLowerCase();
      if (name === 'api') borderVariant = 'card-border-blue';
      else if (name === 'public' || name === 'app' || name === 'core') borderVariant = 'card-border-emerald';
      else if (name === 'datasets' || name === 'data') borderVariant = 'card-border-amber';
      else if (name.includes('model') || name === 'features' || name === 'training') borderVariant = 'card-border-purple';
      else if (name === 'scripts' || name === 'configs' || name === 'tests' || name === 'scratch' || name === 'notebooks') borderVariant = 'card-border-neutral';

      result.push({
        id: `exp-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        kind: 'folder',
        type: 'directory',
        name: item.name,
        title: item.name,
        path: item.path,
        count: item.count !== undefined ? item.count : (item.children ? item.children.length : 0),
        children: item.children,
        category: 'DIREKTORI',
        borderVariant: borderVariant,
        iconType: 'folder',
        x: START_X + col * (CARD_W + GAP_X),
        y: START_Y + row * (CARD_H + GAP_Y),
        ports: [
          { side: 'top',    type: 'green', symbol: '+' },
          { side: 'bottom', type: 'green', symbol: '+' },
          { side: 'left',   type: 'green', symbol: '+' },
          { side: 'right',  type: 'green', symbol: '+' },
        ]
      });
    });

    const dirRows = Math.ceil(dirs.length / COLS);
    const filesStartY = dirs.length > 0 ? START_Y + dirRows * (CARD_H + GAP_Y) + 32 : START_Y;

    // Layout files
    files.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const ext = (item.ext || '').toLowerCase();
      let borderVariant = 'card-border-neutral';
      const name = (item.name || '').toLowerCase();
      if (ext === '.py') borderVariant = name.includes('auth') ? 'card-border-coral' : 'card-border-emerald';
      else if (ext === '.js' || ext === '.ts') borderVariant = 'card-border-neutral';
      else if (ext === '.json') borderVariant = 'card-border-amber';
      else if (ext === '.css') borderVariant = 'card-border-neutral';
      else if (ext === '.md' || ext === '.txt') borderVariant = 'card-border-neutral';

      result.push({
        id: `exp-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`,
        kind: 'file',
        type: 'file',
        name: item.name,
        title: item.name,
        path: item.path,
        ext: item.ext,
        size: item.size,
        category: (item.ext ? item.ext.replace('.', '').toUpperCase() : 'BERKAS'),
        borderVariant: borderVariant,
        iconType: (ext === '.py' ? 'python' : (ext === '.css' ? 'palette' : (ext === '.json' ? 'database' : 'code'))),
        x: START_X + col * (CARD_W + GAP_X),
        y: filesStartY + row * (CARD_H + GAP_Y),
        ports: [
          { side: 'top',    type: 'green', symbol: '+' },
          { side: 'bottom', type: 'green', symbol: '+' },
          { side: 'left',   type: 'green', symbol: '+' },
          { side: 'right',  type: 'green', symbol: '+' },
        ]
      });
    });

    return result;
  }

  async function enterExplorerMode(pathArray = []) {
    if (isExplorerNavigating) return;
    isExplorerNavigating = true;

    try {
      // Sanitize pathArray to ensure clean directory names (stripping e.g. "public/ (Dashboard SPA)" -> "public")
      const cleanPath = (Array.isArray(pathArray) ? pathArray : [])
        .map(p => String(p).split('/')[0].split('(')[0].trim().replace(/[^a-zA-Z0-9_.-]/g, ''))
        .filter(Boolean);

      const isRoot = cleanPath.length === 0;
      STATE.explorerMode = true;
      STATE.explorerPath = cleanPath;
      STATE.canvasView = 'explorer';

      // Persist page mode to localStorage & clean database params from URL
      try {
        localStorage.setItem('neura_active_mode', 'explorer');
        localStorage.setItem('neura_active_canvas', 'explorer');
        const url = new URL(window.location);
        url.searchParams.set('view', 'explorer');
        url.searchParams.delete('col');
        window.history.replaceState({}, '', url);
      } catch(e) {}

      // Fetch directory tree if not yet cached or if partial
      if (!STATE.explorerTreeCache || !STATE.explorerTreeCache.length || STATE.explorerTreeCache.length < 10) {
        if (STATE.treeData && STATE.treeData.length >= 10) {
          STATE.explorerTreeCache = STATE.treeData;
        } else {
          try {
            const res = await fetch('/api/project-structure');
            const data = await res.json();
            if (data && data.tree && data.tree.length > 0) {
              STATE.explorerTreeCache = data.tree;
              STATE.treeData = data.tree;
            }
          } catch(e) {
            console.warn('[ExplorerMode] Gagal fetch project-structure, fallback to FALLBACK_TREE:', e);
            STATE.explorerTreeCache = FALLBACK_TREE;
          }
        }
      }

      if (!STATE.explorerTreeCache || !STATE.explorerTreeCache.length) {
        STATE.explorerTreeCache = FALLBACK_TREE;
      }

      const rawItems = getItemsAtPath(STATE.explorerTreeCache, cleanPath);
      const layoutItems = layoutExplorerGrid(rawItems, isRoot);
      STATE.explorerCurrentItems = layoutItems;
      STATE.nodes = layoutItems;

      // Sticky notes are for architecture mode
      $$('.canvas-sticky-note').forEach(el => el.style.display = 'none');

      // Relations in Explorer Mode: Only render on Root where cross-system relations exist
      if (isRoot) {
        STATE.connections = [...ROOT_EXPLORER_CONNECTIONS];
        if (connSvg) connSvg.style.display = 'block';
      } else {
        STATE.connections = [];
        if (connSvg) connSvg.style.display = 'none';
      }

      // Clear nodes layer and render explorer cards
      if (nodesLayer) nodesLayer.innerHTML = '';

      if (!layoutItems.length) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'explorer-empty-state';
        emptyEl.innerHTML = `
          <div class="explorer-empty-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>
          <div class="explorer-empty-text">
            Direktori ini kosong.<br>
            <button class="bc-item bc-root" style="margin-top:10px;display:inline-flex;" onclick="window.enterExplorerMode && window.enterExplorerMode([])">Kembali ke Root</button>
          </div>
        `;
        nodesLayer.appendChild(emptyEl);
      } else {
        layoutItems.forEach(node => {
          if (node.kind === 'file') {
            renderExplorerFileCard(node);
          } else {
            renderExplorerFolderCard(node);
          }
        });
      }

      // Render relations for root
      if (isRoot) {
        renderAllConnections();
      }

      // Render breadcrumb navigation
      renderBreadcrumb();

      // Update topbar button state & project title
      if (btnToggleExplorer) {
        btnToggleExplorer.classList.add('explorer-active');
        const span = btnToggleExplorer.querySelector('span');
        if (span) span.textContent = 'Explorer';
        btnToggleExplorer.setAttribute('title', 'Klik untuk kembali ke General Canvas');
      }
      const pTitle = $('#current-project-title');
      if (pTitle) pTitle.textContent = 'Project File Explorer';
      $('#pmenu-item-arch')?.classList.remove('active');
      $('#pmenu-item-exp')?.classList.add('active');
      // Sync 3-canvas segmented buttons
      $$('.mode-seg-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === 'explorer'));
      // Sync filter bars
      const fBarGen = $('#filter-bar-general');
      const fBarFiles = $('#filter-bar-files');
      const fBarDb = $('#filter-bar-db');
      if (fBarGen) fBarGen.style.display = 'none';
      if (fBarFiles) fBarFiles.style.display = 'flex';
      if (fBarDb) fBarDb.style.display = 'none';

      // Update status bar
      const pathStr = cleanPath.length ? `/${cleanPath.join('/')}` : '/ (Root Proyek)';
      if (statusSyncText) statusSyncText.textContent = `Direktori: ${pathStr}`;
      const dirsCount = rawItems.filter(i => i.type === 'directory').length;
      const filesCount = rawItems.filter(i => i.type !== 'directory').length;
      if (nodeCountEl) nodeCountEl.textContent = `${dirsCount} Folder`;
      if (relCountEl) relCountEl.textContent = isRoot ? `${ROOT_EXPLORER_CONNECTIONS.length} Relasi Sistem` : `${filesCount} Berkas`;

      // Smoothly fit the newly opened folder cards
      setTimeout(() => {
        fitView(true);
      }, 50);
    } finally {
      setTimeout(() => {
        isExplorerNavigating = false;
      }, 120);
    }
  }
  window.enterExplorerMode = enterExplorerMode;

  function exitExplorerMode() {
    STATE.explorerMode = false;
    STATE.explorerPath = [];

    // Redirect ke General Canvas
    switchCanvasView('general');
  }
  window.exitExplorerMode = exitExplorerMode;

  function renderBreadcrumb() {
    if (!canvasBreadcrumb) return;
    canvasBreadcrumb.style.display = 'flex';
    canvasBreadcrumb.innerHTML = '';

    // Prevent breadcrumb interactions from triggering canvas pan or lasso
    canvasBreadcrumb.onpointerdown = (e) => e.stopPropagation();
    canvasBreadcrumb.onmousedown   = (e) => e.stopPropagation();

    // 1. Root button
    const rootBtn = document.createElement('button');
    rootBtn.type = 'button';
    rootBtn.className = `bc-item bc-root ${STATE.explorerPath.length === 0 ? 'bc-current' : ''}`;
    rootBtn.setAttribute('title', 'Kembali ke Direktori Utama (Root)');
    rootBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      </svg>
      <span>Root</span>
    `;
    rootBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    rootBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      enterExplorerMode([]);
    });
    canvasBreadcrumb.appendChild(rootBtn);

    // 2. Path segments
    STATE.explorerPath.forEach((seg, idx) => {
      const sep = document.createElement('span');
      sep.className = 'bc-sep';
      sep.textContent = '›';
      canvasBreadcrumb.appendChild(sep);

      const isLast = idx === STATE.explorerPath.length - 1;
      const segBtn = document.createElement('button');
      segBtn.type = 'button';
      segBtn.className = `bc-item ${isLast ? 'bc-current' : ''}`;
      segBtn.textContent = `${seg}/`;
      segBtn.setAttribute('title', isLast ? `Direktori saat ini: ${seg}/ (klik untuk muat ulang)` : `Beralih ke direktori ${seg}/`);

      segBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      segBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enterExplorerMode(STATE.explorerPath.slice(0, idx + 1));
      });
      canvasBreadcrumb.appendChild(segBtn);
    });

    // 3. Separator & Back to Architecture button
    const archSep = document.createElement('span');
    archSep.className = 'bc-sep';
    archSep.style.margin = '0 4px';
    archSep.textContent = '|';
    canvasBreadcrumb.appendChild(archSep);

    const archBtn = document.createElement('button');
    archBtn.type = 'button';
    archBtn.className = 'bc-item';
    archBtn.title = 'Kembali ke General Canvas';
    archBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span>General Canvas</span>
    `;
    archBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    archBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      exitExplorerMode();
    });
    canvasBreadcrumb.appendChild(archBtn);
  }

  function renderExplorerFolderCard(node) {
    const el = document.createElement('div');
    el.className = `canvas-node explorer-card ${node.borderVariant || 'card-border-neutral'}`;
    el.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.setAttribute('data-dbl-hint', 'Double-click untuk buka folder');

    const iconHtml = getNodeSvgIcon(node.iconType || 'folder');
    const countBadge = node.count !== undefined ? `<div class="file-card-meta-slot"><span class="folder-count-tag" title="${node.count} berkas / sub-item di dalam folder">${node.count} berkas</span></div>` : '';
    const portsHtml = renderPortsHtml(node);

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${node.category || 'DIREKTORI'}</div>
        <div class="card-title-main" title="${node.path}">${node.name}</div>
      </div>
      ${countBadge}
      ${portsHtml}
    `;

    attachDraggable(el, node);

    // Single click: Select node
    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      setActiveNode(node.id);
      syncTreeToNode(node.name);
    });

    // Double click: Drill-down into folder
    el.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      enterExplorerMode([...STATE.explorerPath, node.name]);
    });

    nodesLayer.appendChild(el);
  }

  function renderExplorerFileCard(node) {
    const el = document.createElement('div');
    const isHero = Boolean(node.hero || node.name === 'server.py');
    el.className = `file-card explorer-card ${node.borderVariant || 'card-border-neutral'} ${isHero ? 'file-card-hero' : ''}`;
    el.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.setAttribute('data-dbl-hint', isHero ? '⚡ Web Server Runner — Klik untuk showcase kode' : 'Klik / Double-click untuk lihat isi berkas');

    const extClean = (node.ext || '').replace('.', '').toLowerCase();
    const iconHtml = getNodeSvgIcon(node.iconType || (extClean === 'py' ? 'python' : (extClean === 'css' ? 'palette' : (extClean === 'json' ? 'database' : 'code'))));
    const heroBadge = isHero ? `<div class="hero-server-badge"><span class="hero-live-dot"></span>WEB RUNNER</div>` : '';
    const sizeBadge = node.size !== undefined ? `<span class="file-size-tag" title="Ukuran berkas">${fmt_size(node.size)}</span>` : '';
    const codeBadge = `<span class="card-code-badge" title="Klik untuk showcase kode">&lt;/&gt;</span>`;
    const portsHtml = renderPortsHtml(node);

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label" ${isHero ? 'style="color:#34D399;font-weight:700;"' : ''}>${node.category || extClean.toUpperCase() || 'FILE'}</div>
        <div class="card-title-main" title="${node.path}">${node.name}</div>
      </div>
      <div class="file-card-meta-slot">
        ${sizeBadge}
        ${codeBadge}
      </div>
      ${heroBadge}
      ${portsHtml}
    `;

    attachDraggable(el, node);

    const handleFileOpen = () => {
      setActiveNode(node.id);
      syncTreeToNode(node.name);
      openCodeDrawer({
        title: node.name,
        name: node.name,
        path: node.path,
        ext: node.ext,
        size: node.size,
        lang: extClean,
      });
    };

    el.addEventListener('click', (e) => {
      if (el._justDragged) return;
      handleFileOpen();
    });

    el.addEventListener('dblclick', (e) => {
      handleFileOpen();
    });

    nodesLayer.appendChild(el);
  }

  /* =====================================================================
     15. SIDEBAR & FILE TREE
     ===================================================================== */
  function toggleSidebar(forceState) {
    if (!sidebar) sidebar = $('#struktur-tree-sidebar');
    if (!sidebar) return;
    STATE.sidebarCollapsed = forceState !== undefined ? forceState : !STATE.sidebarCollapsed;
    sidebar.classList.toggle('sidebar-collapsed', STATE.sidebarCollapsed);
    if (!toggleSidebarBtn) toggleSidebarBtn = $('#btn-toggle-sidebar');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.setAttribute('title', STATE.sidebarCollapsed ? 'Buka Sidebar Folder' : 'Tutup Sidebar Folder');
      toggleSidebarBtn.setAttribute('aria-expanded', STATE.sidebarCollapsed ? 'false' : 'true');
    }
    const topbarBtn = $('#btn-topbar-sidebar');
    if (topbarBtn) {
      topbarBtn.classList.toggle('active', !STATE.sidebarCollapsed);
    }
    // Update minimap after flex transition completes
    setTimeout(() => {
      try { updateMinimap(); } catch(e) {}
    }, 340);
  }
  window.toggleSidebar = toggleSidebar;

  function attachSidebarEvents() {
    toggleSidebarBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });

    $('#btn-topbar-sidebar')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSidebar();
    });

    $('#btn-tree-expand-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      expandAllTree();
    });
    $('#btn-tree-collapse-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      collapseAllTree();
    });
    $('#btn-tree-refresh')?.addEventListener('click', (e) => {
      e.preventDefault();
      loadFolderTree();
    });

    // Sidebar tab switcher (Files vs Database)
    tabBtnFiles?.addEventListener('click', (e) => {
      e.preventDefault();
      switchSidebarTab('files');
    });
    tabBtnDb?.addEventListener('click', (e) => {
      e.preventDefault();
      switchSidebarTab('database');
    });

    const searchInput = $('#tree-search-input');
    const searchClear = $('#tree-search-clear');
    searchInput?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (searchClear) searchClear.style.display = q ? 'flex' : 'none';
      filterTree(q);
    });
    searchClear?.addEventListener('click', (e) => {
      e.preventDefault();
      if (searchInput) searchInput.value = '';
      if (searchClear) searchClear.style.display = 'none';
      filterTree('');
    });

    $$('.quick-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = chip.dataset.target;
        expandAndScrollToItem(target);
        if (STATE.explorerMode && target) {
          const cleanTarget = target.replace(/\/$/, '');
          if (!cleanTarget.endsWith('.py')) {
            enterExplorerMode([cleanTarget]);
          }
        }
      });
    });

    btnFocusCanvas?.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.activeNodeId) focusNode(STATE.activeNodeId);
    });
  }

  function loadFolderTree() {
    if (!treeRootEl) treeRootEl = $('#folder-tree-root');
    if (!treeRootEl) return;

    treeRootEl.innerHTML = `
      <div class="tree-loading-state">
        <div class="tree-spinner"></div>
        <span>Memindai direktori Neura...</span>
      </div>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    fetch('/api/project-structure', { signal: controller.signal })
      .then(r => {
        clearTimeout(timeoutId);
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data && data.status === 'success' && Array.isArray(data.tree) && data.tree.length > 0) {
          STATE.treeData = data.tree;
          STATE.explorerTreeCache = data.tree;
          renderTree(STATE.treeData, treeRootEl, 0);
          updateTreeStats(STATE.treeData);
          if (STATE.explorerMode && (!STATE.explorerPath || STATE.explorerPath.length === 0)) {
            enterExplorerMode([]);
          }
        } else {
          throw new Error('Data pohon direktori kosong');
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.warn('[TreeExplorer] Menggunakan FALLBACK_TREE:', err.message || err);
        STATE.treeData = FALLBACK_TREE;
        STATE.explorerTreeCache = FALLBACK_TREE;
        renderTree(FALLBACK_TREE, treeRootEl, 0);
        updateTreeStats(FALLBACK_TREE);
        if (STATE.explorerMode && (!STATE.explorerPath || STATE.explorerPath.length === 0)) {
          enterExplorerMode([]);
        }
      });
  }
  window.loadFolderTree = loadFolderTree;

  function updateTreeStats(tree) {
    let dirs = 0, files = 0;
    const count = (arr) => arr.forEach(item => {
      if (item.type === 'directory') { dirs++; if (item.children) count(item.children); }
      else files++;
    });
    count(tree);
    if (treeSummaryStats) treeSummaryStats.textContent = `${dirs} folder &bull; ${files} berkas di root`;
  }

  function renderTree(items, containerEl, depth) {
    containerEl.innerHTML = '';
    if (!items || !items.length) {
      containerEl.innerHTML = '<div style="padding:8px 16px;color:var(--st-text-muted);font-size:12px;">Direktori kosong</div>';
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = 'tree-item';
      li.dataset.path = item.path;
      li.dataset.type = item.type;

      const row = document.createElement('div');
      row.className = 'tree-item-row';

      for (let i = 0; i < depth; i++) {
        const indent = document.createElement('span');
        indent.className = 'tree-indent';
        row.appendChild(indent);
      }

      const chevron = document.createElement('span');
      chevron.className = `tree-chevron ${item.type === 'file' ? 'leaf' : ''}`;
      chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
      row.appendChild(chevron);

      const iconEl = document.createElement('span');
      iconEl.className = 'tree-file-icon';
      if (item.type === 'directory') {
        iconEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
      } else {
        iconEl.innerHTML = getFileSvgIcon(item.name);
      }
      row.appendChild(iconEl);

      const nameEl = document.createElement('span');
      nameEl.className = 'tree-item-name';
      nameEl.textContent = item.name;
      row.appendChild(nameEl);

      const badges = document.createElement('span');
      badges.className = 'tree-item-badges';
      if (item.type === 'directory' && item.count !== undefined) {
        const countBadge = document.createElement('span');
        countBadge.className = 'tree-item-count';
        countBadge.textContent = item.count;
        badges.appendChild(countBadge);
      }
      if (item.type === 'file' && item.size !== undefined) {
        const dot = document.createElement('span');
        const ext = (item.ext || '').replace('.', '');
        dot.className = `ext-dot ext-${ext}`;
        badges.appendChild(dot);
        const sizeBadge = document.createElement('span');
        sizeBadge.className = 'tree-item-size';
        sizeBadge.textContent = fmt_size(item.size);
        badges.appendChild(sizeBadge);
      }
      row.appendChild(badges);
      li.appendChild(row);

      let childrenUl = null;
      if (item.type === 'directory' && item.children && item.children.length) {
        childrenUl = document.createElement('ul');
        childrenUl.className = 'tree-children-list';
        childrenUl.style.display = STATE.treeExpanded.has(item.name) ? 'block' : 'none';
        if (STATE.treeExpanded.has(item.name)) chevron.classList.add('open');
        renderTree(item.children, childrenUl, depth + 1);
        li.appendChild(childrenUl);
      }

      row.addEventListener('dblclick', (e) => {
        if (item.type === 'directory') {
          e.preventDefault();
          e.stopPropagation();
          const cleanSegs = (item.path || item.name).split(/[\\/]/).filter(Boolean);
          enterExplorerMode(cleanSegs);
        }
      });

      row.addEventListener('click', () => {
        if (item.type === 'directory' && childrenUl) {
          const isOpen = childrenUl.style.display !== 'none';
          childrenUl.style.display = isOpen ? 'none' : 'block';
          chevron.classList.toggle('open', !isOpen);
          if (!isOpen) STATE.treeExpanded.add(item.name);
          else STATE.treeExpanded.delete(item.name);
        }

        $$('.tree-item-row.active').forEach(r => r.classList.remove('active'));
        row.classList.add('active');
        STATE.activeTreeItem = item;

        detailName.textContent = item.name;
        detailPath.textContent = item.path;
        detailTypeBadge.textContent = item.type === 'directory' ? 'Direktori' : (item.ext || 'Berkas').replace('.', '').toUpperCase();

        // If file clicked in tree, open code showcase drawer directly!
        if (item.type === 'file') {
          openCodeDrawer({
            id: `file-${item.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
            title: item.name,
            path: item.path,
            ext: item.ext,
            size: item.size,
          });
        }

        const related = getRelatedNodeId(item.path, item.name);
        if (related) {
          focusNode(related);
        }
      });

      containerEl.appendChild(li);
    });
  }

  function getFileSvgIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'py':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      case 'js':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      case 'ts':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>';
      case 'html':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FB923C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>';
      case 'css':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22D3EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path></svg>';
      case 'json':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>';
      case 'csv':
      case 'tsv':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18M9 21V9"></path></svg>';
      case 'gguf':
      case 'pt':
      case 'pth':
      case 'bin':
      case 'onnx':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C084FC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"></path><path d="M12 6v6l4 2"></path></svg>';
      case 'md':
      case 'txt':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line></svg>';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'gif':
      case 'webp':
      case 'ico':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F472B6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
      case 'env':
      case 'yaml':
      case 'yml':
      case 'toml':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
      default:
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
    }
  }

  function getRelatedNodeId(path, name) {
    const p = path.toLowerCase();
    if (name === 'server.py') return 'file-server-py';
    if (name === 'admin_auth.py') return 'file-admin-auth';
    if (name === 'riset.js') return 'file-riset-js';
    if (name === 'style.css') return 'file-style-css';
    if (name === 'research_updates.json') return 'file-research-json';
    if (name === 'logger.py') return 'file-core-logger';

    if (p.startsWith('public')) return 'node-frontend';
    if (p.startsWith('api'))     return 'node-api';
    if (p.includes('riset'))     return 'node-riset';
    if (p.startsWith('modelsllm') || p.startsWith('training') || p.startsWith('features')) return 'node-ml';
    if (p.startsWith('datasets') || p.startsWith('data'))  return 'node-data';
    if (p.startsWith('scripts') || p.startsWith('configs') || p.startsWith('tests')) return 'node-scripts';
    if (p.startsWith('core')) return 'node-core';
    return null;
  }

  function syncTreeToNode(nodeId) {
    const pathMap = {
      'node-core':     ['server.py', 'core'],
      'file-server-py':['server.py'],
      'file-core-logger':['core'],
      'node-api':      ['api'],
      'file-admin-auth':['admin_auth.py'],
      'node-frontend': ['public'],
      'file-style-css':['style.css'],
      'node-riset':    ['riset.html', 'riset.js'],
      'file-riset-js': ['riset.js'],
      'node-ml':       ['modelsLLM', 'training', 'features'],
      'node-data':     ['datasets', 'data'],
      'file-research-json':['research_updates.json'],
      'node-scripts':  ['scripts', 'configs', 'tests'],
    };
    const targets = pathMap[nodeId] || [];
    if (!targets.length) return;
    const name = targets[0].split('/').pop();
    expandAndScrollToItem(name);
  }

  function expandAndScrollToItem(name) {
    if (!name) return;
    STATE.treeExpanded.add(name);
    const targetName = name.replace(/\/$/, '').toLowerCase();
    const rows = $$('.tree-item-row');
    for (const row of rows) {
      const nameEl = row.querySelector('.tree-item-name');
      const text = nameEl ? nameEl.textContent.trim().toLowerCase() : '';
      if (text === targetName || text.includes(targetName)) {
        // Expand all parents
        let parent = row.parentElement;
        while (parent && parent !== treeRootEl) {
          if (parent.classList.contains('tree-children-list')) {
            parent.style.display = 'block';
            const parentLi = parent.closest('.tree-item');
            parentLi?.querySelector('.tree-chevron')?.classList.add('open');
          }
          parent = parent.parentElement;
        }
        // If it's a directory, open its children
        const li = row.closest('.tree-item');
        const childUl = li?.querySelector('.tree-children-list');
        if (childUl && childUl.style.display === 'none') {
          childUl.style.display = 'block';
          row.querySelector('.tree-chevron')?.classList.add('open');
        }
        row.click();
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }

  function expandAllTree() {
    $$('.tree-children-list').forEach(ul => { ul.style.display = 'block'; });
    $$('.tree-chevron:not(.leaf)').forEach(ch => ch.classList.add('open'));
  }

  function collapseAllTree() {
    $$('.tree-children-list').forEach(ul => { ul.style.display = 'none'; });
    $$('.tree-chevron:not(.leaf)').forEach(ch => ch.classList.remove('open'));
    STATE.treeExpanded.clear();
  }

  function filterTree(query) {
    const q = query.toLowerCase();
    $$('.tree-item').forEach(li => {
      if (!q) {
        li.style.display = 'list-item';
        li.querySelector('.tree-item-row')?.classList.remove('search-match');
        return;
      }
      const name = li.querySelector('.tree-item-name')?.textContent.toLowerCase() || '';
      const match = name.includes(q);
      li.style.display = match ? 'list-item' : 'none';
      li.querySelector('.tree-item-row')?.classList.toggle('search-match', match);
      if (match) {
        let parent = li.parentElement;
        while (parent && parent !== treeRootEl) {
          if (parent.classList.contains('tree-children-list')) parent.style.display = 'block';
          parent = parent.parentElement;
        }
      }
    });
  }
  window.showCustomContextMenu = showCustomContextMenu;
  window.showContextMenu = showCustomContextMenu;
  window.hideContextMenu = hideContextMenu;

  /* =====================================================================
     16. ADD NODE MODAL
     ===================================================================== */
  function openAddNodeModal() {
    $('#modal-add-node').style.display = 'flex';
  }

  function closeAllModals() {
    $('#modal-add-node').style.display = 'none';
  }

  $('#modal-close-node')?.addEventListener('click', closeAllModals);
  $('#btn-cancel-node')?.addEventListener('click',  closeAllModals);
  $('#modal-add-node')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAllModals();
  });

  document.getElementById('btn-save-new-node')?.addEventListener('click', () => {
    const title = $('#new-node-title').value.trim() || 'Modul Baru';
    const desc  = $('#new-node-desc').value.trim()  || 'Deskripsi modul...';
    const tag   = $('input[name="new-node-tag"]:checked')?.value || 'Core';

    const viewW = canvasContainer.offsetWidth  || 800;
    const viewH = canvasContainer.offsetHeight || 600;
    const x = (viewW / 2 - STATE.tx) / STATE.scale - 134;
    const y = (viewH / 2 - STATE.ty) / STATE.scale - 90;

    const node = {
      id: `node-custom-${Date.now()}`,
      kind: 'folder',
      title, path: `custom/${title.toLowerCase().replace(/\s+/g, '-')}/`,
      desc, icon: '📦',
      iconBg: 'rgba(100,116,139,0.14)', accentColor: '#64748B',
      tags: [tag],
      status: 'Active',
      files: 0, comments: 0,
      avatars: ['HZ'], avatarColors: ['#D97757'],
      x, y,
    };

    STATE.nodes.push(node);
    renderFolderCard(node);
    focusNode(node.id);
    closeAllModals();
    updateStatusBar();
    updateMinimap();
    $('#new-node-title').value = '';
    $('#new-node-desc').value  = '';
  });

  /* =====================================================================
     17. STATUS BAR
     ===================================================================== */
  function updateStatusBar() {
    const folders = STATE.nodes.filter(n => n.kind !== 'file').length;
    const files = STATE.nodes.filter(n => n.kind === 'file').length;
    if (nodeCountEl) nodeCountEl.textContent = `${folders} Folder Â· ${files} Berkas`;
    if (relCountEl) relCountEl.textContent = `${STATE.connections.length} Relasi`;
    if (statusSyncText) statusSyncText.textContent = 'Diagram Relasi & Showcase Live';
  }

  /* =====================================================================
     18. FALLBACK STATIC TREE
     ===================================================================== */
  const FALLBACK_TREE = [
    { name: 'api', type: 'directory', path: 'api', count: 5, children: [
      { name: 'admin', type: 'directory', path: 'api/admin', count: 4, children: [
        { name: 'admin_auth.py', type: 'file', path: 'api/admin/admin_auth.py', size: 8192, ext: '.py' },
        { name: 'admin_ml.py', type: 'file', path: 'api/admin/admin_ml.py', size: 6144, ext: '.py' },
        { name: 'admin_nakes.py', type: 'file', path: 'api/admin/admin_nakes.py', size: 5120, ext: '.py' },
        { name: 'admin_research.py', type: 'file', path: 'api/admin/admin_research.py', size: 9216, ext: '.py' },
      ]},
      { name: 'nakes', type: 'directory', path: 'api/nakes', count: 2, children: [
        { name: 'nakes_auth.py', type: 'file', path: 'api/nakes/nakes_auth.py', size: 4096, ext: '.py' },
        { name: 'nakes_consultation.py', type: 'file', path: 'api/nakes/nakes_consultation.py', size: 7168, ext: '.py' },
      ]},
      { name: 'shared', type: 'directory', path: 'api/shared', count: 3, children: [
        { name: 'firebase_routes.py', type: 'file', path: 'api/shared/firebase_routes.py', size: 3072, ext: '.py' },
        { name: 'session_middleware.py', type: 'file', path: 'api/shared/session_middleware.py', size: 2048, ext: '.py' },
        { name: 'status_routes.py', type: 'file', path: 'api/shared/status_routes.py', size: 1536, ext: '.py' },
      ]},
      { name: 'user', type: 'directory', path: 'api/user', count: 6, children: [
        { name: 'user_chat.py', type: 'file', path: 'api/user/user_chat.py', size: 10240, ext: '.py' },
        { name: 'user_predict.py', type: 'file', path: 'api/user/user_predict.py', size: 8192, ext: '.py' },
        { name: 'user_profile.py', type: 'file', path: 'api/user/user_profile.py', size: 5120, ext: '.py' },
        { name: 'user_session.py', type: 'file', path: 'api/user/user_session.py', size: 4096, ext: '.py' },
        { name: 'user_consultation.py', type: 'file', path: 'api/user/user_consultation.py', size: 6144, ext: '.py' },
        { name: 'user_livekit.py', type: 'file', path: 'api/user/user_livekit.py', size: 3072, ext: '.py' },
      ]},
      { name: 'ml', type: 'directory', path: 'api/ml', count: 2, children: [] }
    ]},
    { name: 'app', type: 'directory', path: 'app', count: 5, children: [] },
    { name: 'configs', type: 'directory', path: 'configs', count: 3, children: [] },
    { name: 'core', type: 'directory', path: 'core', count: 9, children: [
      { name: 'logger.py', type: 'file', path: 'core/logger.py', size: 2048, ext: '.py' },
    ]},
    { name: 'data', type: 'directory', path: 'data', count: 7, children: [] },
    { name: 'datasets', type: 'directory', path: 'datasets', count: 7, children: [
      { name: 'research_updates.json', type: 'file', path: 'datasets/research_updates.json', size: 15360, ext: '.json' },
    ]},
    { name: 'features', type: 'directory', path: 'features', count: 7, children: [] },
    { name: 'modelsLLM', type: 'directory', path: 'modelsLLM', count: 2, children: [] },
    { name: 'notebooks', type: 'directory', path: 'notebooks', count: 0, children: [] },
    { name: 'public', type: 'directory', path: 'public', count: 14, children: [
      { name: 'css', type: 'directory', path: 'public/css', count: 5, children: [
        { name: 'style.css', type: 'file', path: 'public/css/style.css', size: 92160, ext: '.css' },
        { name: 'riset.css', type: 'file', path: 'public/css/riset.css', size: 61440, ext: '.css' },
        { name: 'struktur.css', type: 'file', path: 'public/css/struktur.css', size: 24500, ext: '.css' },
        { name: 'welcome.css', type: 'file', path: 'public/css/welcome.css', size: 45056, ext: '.css' },
      ]},
      { name: 'js', type: 'directory', path: 'public/js', count: 4, children: [
        { name: 'riset.js', type: 'file', path: 'public/js/riset.js', size: 81920, ext: '.js' },
        { name: 'struktur.js', type: 'file', path: 'public/js/struktur.js', size: 35000, ext: '.js' },
      ]},
      { name: 'index.html', type: 'file', path: 'public/index.html', size: 204800, ext: '.html' },
      { name: 'riset.html', type: 'file', path: 'public/riset.html', size: 102400, ext: '.html' },
      { name: 'struktur.html', type: 'file', path: 'public/struktur.html', size: 22000, ext: '.html' },
      { name: 'welcome.html', type: 'file', path: 'public/welcome.html', size: 61440, ext: '.html' },
    ]},
    { name: 'scratch', type: 'directory', path: 'scratch', count: 5, children: [] },
    { name: 'scripts', type: 'directory', path: 'scripts', count: 9, children: [] },
    { name: 'tests', type: 'directory', path: 'tests', count: 4, children: [] },
    { name: 'training', type: 'directory', path: 'training', count: 5, children: [] },
    { name: 'server.py', type: 'file', path: 'server.py', size: 11450, ext: '.py' },
    { name: 'main.py', type: 'file', path: 'main.py', size: 4096, ext: '.py' },
    { name: 'voice_agent.py', type: 'file', path: 'voice_agent.py', size: 8192, ext: '.py' },
    { name: 'about_app.json', type: 'file', path: 'about_app.json', size: 2048, ext: '.json' },
    { name: 'README.md', type: 'file', path: 'README.md', size: 6144, ext: '.md' },
    { name: 'requirements.txt', type: 'file', path: 'requirements.txt', size: 2048, ext: '.txt' },
    { name: 'requirements-dev.txt', type: 'file', path: 'requirements-dev.txt', size: 1024, ext: '.txt' },
    { name: 'implementations.txt', type: 'file', path: 'implementations.txt', size: 3072, ext: '.txt' },
  ];

  /* =====================================================================
     19. CONNECT MODE ENGINE
     Allows user to draw a new edge by clicking source port â†’ target port.
     ===================================================================== */
  let wirePreviewSvg = null;
  let wirePreviewPath = null;

  function ensureWirePreview() {
    if (!wirePreviewSvg) {
      wirePreviewSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      wirePreviewSvg.id = 'wire-preview';
      wirePreviewSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      viewport.appendChild(wirePreviewSvg);
    }
    if (!wirePreviewPath) {
      wirePreviewPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      wirePreviewPath.setAttribute('fill', 'none');
      wirePreviewPath.setAttribute('stroke', '#10B981');
      wirePreviewPath.setAttribute('stroke-width', '2');
      wirePreviewPath.setAttribute('stroke-dasharray', '7 4');
      wirePreviewPath.setAttribute('opacity', '0.75');
      wirePreviewPath.setAttribute('stroke-linecap', 'round');
      wirePreviewSvg.appendChild(wirePreviewPath);
    }
  }

  function showConnTypePicker() {
    const picker = $('#conn-type-picker');
    if (picker) picker.style.display = 'flex';
  }

  function hideConnTypePicker() {
    const picker = $('#conn-type-picker');
    if (picker) picker.style.display = 'none';
  }

  function cancelConnectSource() {
    if (STATE.connectSource) {
      const srcEl = document.querySelector(`[data-node="${STATE.connectSource.nodeId}"][data-side="${STATE.connectSource.side}"]`);
      srcEl?.classList.remove('port-connecting-source');
      STATE.connectSource = null;
    }
    if (wirePreviewPath) wirePreviewPath.setAttribute('d', '');
  }

  function attachConnectModeEvents() {
    // Connection type picker
    $$('.conn-type-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        STATE.connectType = opt.dataset.type || 'default';
        $$('.conn-type-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    // Set default selection
    const defaultOpt = document.querySelector('.conn-type-opt[data-type="default"]');
    if (defaultOpt) defaultOpt.classList.add('selected');

    // Port click for connect mode
    document.addEventListener('click', (e) => {
      const port = e.target.closest('.node-port');
      if (!port) return;
      e.stopPropagation();

      const nodeId = port.dataset.node;
      const side   = port.dataset.side;

      if (STATE.mode !== 'connect') {
        // Direct click on a port (+ button): switch to connect mode and start connecting from this port!
        setActiveTool('connect');
        STATE.connectSource = { nodeId, side };
        port.classList.add('port-connecting-source');
        ensureWirePreview();
        showToast('Mode Hubungkan: Klik port tujuan untuk membuat relasiâ€¦', 2200);
        return;
      }

      if (!STATE.connectSource) {
        // First click: pick source
        STATE.connectSource = { nodeId, side };
        port.classList.add('port-connecting-source');
        ensureWirePreview();
        showToast('Klik port tujuan untuk membuat koneksiâ€¦', 2000);
      } else {
        // Second click: pick target — create connection
        if (nodeId === STATE.connectSource.nodeId) {
          cancelConnectSource();
          return;
        }
        const type  = STATE.connectType;
        const srcId = STATE.connectSource.nodeId;
        // Avoid duplicate
        const dup = STATE.connections.find(([s, d]) => s === srcId && d === nodeId);
        if (!dup) {
          snapshotUndo();
          STATE.connections.push([srcId, nodeId, type, '']);
          renderAllConnections();
          updateStatusBar();
          updateUndoRedoBtns();
          showToast('✓ Koneksi berhasil dibuat', 1500);
        } else {
          showToast('Koneksi sudah ada', 1500);
        }
        // Clean up
        const srcPort = document.querySelector(`[data-node="${srcId}"][data-side="${STATE.connectSource.side}"]`);
        srcPort?.classList.remove('port-connecting-source');
        STATE.connectSource = null;
        if (wirePreviewPath) wirePreviewPath.setAttribute('d', '');
      }
    }, true);

    // Wire preview: follow mouse in connect mode
    document.addEventListener('pointermove', (e) => {
      if (STATE.mode !== 'connect' || !STATE.connectSource) return;
      ensureWirePreview();
      const src = STATE.connectSource;
      const srcNode = STATE.nodes.find(n => n.id === src.nodeId);
      if (!srcNode) return;
      const p1 = getNodeCenter(src.nodeId, src.side);
      const rect = canvasContainer.getBoundingClientRect();
      const mx = (e.clientX - rect.left - STATE.tx) / STATE.scale;
      const my = (e.clientY - rect.top  - STATE.ty) / STATE.scale;
      const offset = Math.abs(mx - p1.x) * 0.5 || 80;
      let cx1 = p1.x, cy1 = p1.y;
      if (src.side === 'right')  cx1 = p1.x + offset;
      if (src.side === 'left')   cx1 = p1.x - offset;
      if (src.side === 'bottom') cy1 = p1.y + offset;
      if (src.side === 'top')    cy1 = p1.y - offset;
      const d = `M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${mx} ${my}, ${mx} ${my}`;
      wirePreviewPath.setAttribute('d', d);
    });

    // Port hover styling for target highlight
    document.addEventListener('mouseover', (e) => {
      if (STATE.mode !== 'connect' || !STATE.connectSource) return;
      const port = e.target.closest('.node-port');
      if (port && port.dataset.node !== STATE.connectSource.nodeId) {
        port.classList.add('port-hover-target');
      }
    });
    document.addEventListener('mouseout', (e) => {
      const port = e.target.closest('.node-port');
      port?.classList.remove('port-hover-target');
    });
  }

  /* =====================================================================
     20. LASSO SELECT ENGINE
     Drag on empty canvas in lasso mode to rubber-band select cards.
     ===================================================================== */
  let lassoBox = null;
  let lassoOrigin = { x: 0, y: 0 };

  function ensureLassoBox() {
    if (!lassoBox) {
      lassoBox = document.createElement('div');
      lassoBox.id = 'lasso-box';
      canvasContainer.appendChild(lassoBox);
    }
  }

  function clearLassoSelection() {
    $$('.lasso-selected').forEach(el => el.classList.remove('lasso-selected'));
    STATE.lassoSelected.clear();
    if (lassoBox) lassoBox.style.display = 'none';
  }

  function attachLassoEvents() {
    ensureLassoBox();

    canvasContainer.addEventListener('pointerdown', (e) => {
      if (STATE.mode !== 'lasso') return;
      if (e.target.closest('.canvas-node, .file-card, .canvas-sticky-note, .canvas-floating-toolbar, .canvas-minimap, .canvas-floating-status, .canvas-breadcrumb, .bc-item')) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = canvasContainer.getBoundingClientRect();
      lassoOrigin = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      STATE.lassoActive = true;
      clearLassoSelection();
      lassoBox.style.display = 'block';
      lassoBox.style.left   = `${lassoOrigin.x}px`;
      lassoBox.style.top    = `${lassoOrigin.y}px`;
      lassoBox.style.width  = '0px';
      lassoBox.style.height = '0px';
      try { canvasContainer.setPointerCapture(e.pointerId); } catch(err) {}
    });

    canvasContainer.addEventListener('pointermove', (e) => {
      if (!STATE.lassoActive) return;
      const rect = canvasContainer.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const lx = Math.min(cx, lassoOrigin.x);
      const ly = Math.min(cy, lassoOrigin.y);
      const lw = Math.abs(cx - lassoOrigin.x);
      const lh = Math.abs(cy - lassoOrigin.y);
      lassoBox.style.left   = `${lx}px`;
      lassoBox.style.top    = `${ly}px`;
      lassoBox.style.width  = `${lw}px`;
      lassoBox.style.height = `${lh}px`;

      // Live highlight overlapping nodes
      const selectRect = {
        x: (lx - STATE.tx) / STATE.scale,
        y: (ly - STATE.ty) / STATE.scale,
        w: lw / STATE.scale,
        h: lh / STATE.scale,
      };
      $$('.canvas-node, .file-card').forEach(el => {
        const nx = parseFloat(el.style.left);
        const ny = parseFloat(el.style.top);
        const nw = el.offsetWidth;
        const nh = el.offsetHeight;
        const hit = nx + nw > selectRect.x && nx < selectRect.x + selectRect.w &&
                    ny + nh > selectRect.y && ny < selectRect.y + selectRect.h;
        if (hit) {
          el.classList.add('lasso-selected');
          STATE.lassoSelected.add(el.id);
        } else {
          el.classList.remove('lasso-selected');
          STATE.lassoSelected.delete(el.id);
        }
      });
    });

    const endLasso = (e) => {
      if (!STATE.lassoActive) return;
      STATE.lassoActive = false;
      if (lassoBox) lassoBox.style.display = 'none';
      if (e && e.pointerId !== undefined) {
        try { if (canvasContainer.hasPointerCapture(e.pointerId)) canvasContainer.releasePointerCapture(e.pointerId); } catch(err) {}
      }
      const count = STATE.lassoSelected.size;
      if (count) showToast(`${count} node terpilih`, 1200);
    };

    canvasContainer.addEventListener('pointerup', endLasso);
    window.addEventListener('pointerup', endLasso);
  }

  /* =====================================================================
     21. UNDO / REDO ENGINE
     Snapshots connections + node positions on each mutating action.
     ===================================================================== */
  const MAX_UNDO = 50;

  function snapshotUndo() {
    const snap = {
      connections: STATE.connections.map(c => [...c]),
      nodes: STATE.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
    };
    STATE.undoStack.push(snap);
    if (STATE.undoStack.length > MAX_UNDO) STATE.undoStack.shift();
    STATE.redoStack = [];
    updateUndoRedoBtns();
  }

  function initUndoRedo() {
    updateUndoRedoBtns();
  }

  function doUndo() {
    if (!STATE.undoStack.length) return;
    const snap = {
      connections: STATE.connections.map(c => [...c]),
      nodes: STATE.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
    };
    STATE.redoStack.push(snap);
    const prev = STATE.undoStack.pop();
    applySnapshot(prev);
    updateUndoRedoBtns();
  }

  function doRedo() {
    if (!STATE.redoStack.length) return;
    const snap = {
      connections: STATE.connections.map(c => [...c]),
      nodes: STATE.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })),
    };
    STATE.undoStack.push(snap);
    const next = STATE.redoStack.pop();
    applySnapshot(next);
    updateUndoRedoBtns();
  }

  function applySnapshot(snap) {
    // Restore connections
    STATE.connections = snap.connections.map(c => [...c]);
    // Restore node positions
    snap.nodes.forEach(({ id, x, y }) => {
      const node = STATE.nodes.find(n => n.id === id);
      if (node) {
        node.x = x; node.y = y;
        const el = $(`#${CSS.escape(id)}`);
        if (el) { el.style.left = `${x}px`; el.style.top = `${y}px`; }
      }
    });
    renderAllConnections();
    updateStatusBar();
    updateMinimap();
  }

  function updateUndoRedoBtns() {
    const undoBtn = $('#tool-undo');
    const redoBtn = $('#tool-redo');
    if (undoBtn) undoBtn.classList.toggle('tool-btn-disabled', !STATE.undoStack.length);
    if (redoBtn) redoBtn.classList.toggle('tool-btn-disabled', !STATE.redoStack.length);
  }

  /* =====================================================================
     22. TOAST NOTIFICATION
     ===================================================================== */
  let toastTimer = null;
  function showToast(msg, duration = 2000) {
    let t = $('#st-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'st-toast';
      t.style.cssText = `
        position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
        background:var(--st-bg-surface,#1E1E21); border:1px solid var(--st-border);
        color:var(--st-text-primary); font:500 12px/1.5 var(--st-font-sans,system-ui);
        padding:8px 16px; border-radius:100px; z-index:9999; pointer-events:none;
        box-shadow:0 4px 20px rgba(0,0,0,0.25); white-space:nowrap;
        opacity:0; transition:opacity 0.18s;
      `;
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.opacity = '0'; }, duration);
  }

})();




