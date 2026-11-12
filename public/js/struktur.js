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
    // ── Explorer Mode ──────────────────────────────
    explorerMode: false,        // true = filesystem explorer; false = architecture diagram
    explorerPath: [],           // current directory path stack e.g. ['api', 'admin']
    explorerTreeCache: null,    // cached /api/project-structure result (tree array)
    explorerCurrentItems: [],   // items currently rendered on canvas
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
      ['attachContextMenuEvents', attachContextMenuEvents],
      ['attachFilterBarEvents', attachFilterBarEvents],
      ['attachMinimapEvents', attachMinimapEvents],
      ['attachConnectModeEvents', attachConnectModeEvents],
      ['attachLassoEvents', attachLassoEvents],
      ['initUndoRedo', initUndoRedo],
      ['loadFolderTree', loadFolderTree],
      // Launch into Explorer Mode at Root displaying all root directories!
      ['enterExplorerMode', () => enterExplorerMode([])],
    ];
    for (const [name, fn] of steps) {
      try { fn(); } catch(err) { console.error(`[Init] Error in ${name}:`, err); }
    }
  });

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

    // Explorer Mode refs
    canvasBreadcrumb   = $('#canvas-breadcrumb');
    btnToggleExplorer  = $('#btn-toggle-explorer');
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

    // Pointer down handler for panning
    canvasContainer.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return; // Right click handled by context menu
      hideContextMenu();
      const isInteractive = e.target.closest('.canvas-node, .file-card, .canvas-sticky-note, .node-port, .node-action-menu, .node-context-menu, .canvas-minimap, .code-preview-drawer, .sticky-note-btn, .canvas-breadcrumb, .bc-item');
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
    const codeBadge = `<div class="card-code-badge" title="Klik untuk showcase kode">&lt;/&gt;</div>`;
    const portsHtml = renderPortsHtml(node);

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${node.category || (node.lang || 'file').toUpperCase()}</div>
        <div class="card-title-main" title="${node.path || node.title}">${node.title}</div>
      </div>
      ${alertHtml}
      ${codeBadge}
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
        }
      }
    };

    el.addEventListener('pointerup', finishDrag);
    el.addEventListener('pointercancel', finishDrag);

    // Context Menu on right click
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showContextMenu(e.clientX, e.clientY, node);
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

    nodesLayer.appendChild(el);
  }

  /* =====================================================================
     8. BEZIER CONNECTIONS
     ===================================================================== */
  function getNodeCenter(nodeId, side = 'right') {
    const node = STATE.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const W = 244;
    const H = 64;
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
    drawerLineNumbers.innerHTML = '1';
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
          drawerFilePath.textContent = `${data.path} · ${data.lines} baris · ${fmt_size(data.size)}`;
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
            numsHtml += `<div>${i}</div>`;
          }
          drawerLineNumbers.innerHTML = numsHtml;

          // Parse code outline (classes and functions)
          parseAndRenderOutline(data.content, data.language);
        } else {
          drawerCodeBlock.textContent = `// Tidak dapat memuat berkas:\n// ${data.message || 'Error'}`;
        }
      })
      .catch(err => {
        // Fallback to local preview snippet if server not reachable
        drawerCodeBlock.textContent = node.previewCode || `// File: ${node.title}\n// (Gagal tersambung ke /api/file-content)`;
        if (window.hljs) hljs.highlightElement(drawerCodeBlock);
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
          if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        <span class="drawer-relation-pill" title="${r.dir === 'in' ? 'Diimpor/Dipanggil oleh' : 'Mengarah ke'} ${r.name}">
          ${r.dir === 'in' ? '📥' : '📤'} ${escapeHtml(r.name)} (${r.type})
        </span>
      `).join('');
    } else {
      drawerRelationsPills.innerHTML = '<span style="font-size:10.5px;color:var(--st-text-muted)">Tidak ada relasi langsung terdaftar</span>';
    }
  }

  /* =====================================================================
     10. CONTEXT MENU (RIGHT-CLICK)
     ===================================================================== */
  function showContextMenu(x, y, node) {
    STATE.contextTargetNode = node;
    contextMenu.style.display = 'block';
    const menuW = 190, menuH = 180;
    const posX = clamp(x, 10, window.innerWidth - menuW - 10);
    const posY = clamp(y, 10, window.innerHeight - menuH - 10);
    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top  = `${posY}px`;
  }

  function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
    STATE.contextTargetNode = null;
  }

  function attachContextMenuEvents() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#node-context-menu')) hideContextMenu();
    });

    $('#ctx-view-code')?.addEventListener('click', () => {
      if (STATE.contextTargetNode) openCodeDrawer(STATE.contextTargetNode);
      hideContextMenu();
    });

    $('#ctx-copy-path')?.addEventListener('click', () => {
      if (STATE.contextTargetNode) {
        navigator.clipboard.writeText(STATE.contextTargetNode.path || STATE.contextTargetNode.title);
      }
      hideContextMenu();
    });

    $('#ctx-focus-tree')?.addEventListener('click', () => {
      if (STATE.contextTargetNode) syncTreeToNode(STATE.contextTargetNode.id);
      hideContextMenu();
    });

    $('#ctx-focus-node')?.addEventListener('click', () => {
      if (STATE.contextTargetNode) focusNode(STATE.contextTargetNode.id);
      hideContextMenu();
    });

    $('#ctx-delete-node')?.addEventListener('click', () => {
      if (STATE.contextTargetNode) {
        const id = STATE.contextTargetNode.id;
        STATE.nodes = STATE.nodes.filter(n => n.id !== id);
        STATE.connections = STATE.connections.filter(([s, d]) => s !== id && d !== id);
        $(`#${id}`)?.remove();
        renderAllConnections();
        updateStatusBar();
        updateMinimap();
      }
      hideContextMenu();
    });
  }

  /* =====================================================================
     11. FILTER BAR ENGINE
     ===================================================================== */
  function attachFilterBarEvents() {
    $$('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        STATE.activeFilter = filter;
        applyNodeFilter(filter);
      });
    });
  }

  function applyNodeFilter(filter) {
    $$('.canvas-node, .file-card').forEach(el => {
      const node = STATE.nodes.find(n => n.id === el.id);
      if (!node) return;

      let match = true;
      if (filter === 'folder') match = node.kind !== 'file';
      else if (filter === 'file') match = node.kind === 'file';
      else if (filter === 'python') match = (node.lang === 'python') || (node.tags && node.tags.includes('Core'));
      else if (filter === 'javascript') match = (node.lang === 'javascript') || (node.tags && node.tags.includes('Frontend'));

      el.style.opacity = match ? '1' : '0.15';
      el.style.pointerEvents = match ? 'auto' : 'none';
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
    const idx = modes.indexOf(STATE.gridMode);
    STATE.gridMode = modes[(idx + 1) % modes.length];
    applyTransform();
    // Update grid toggle button visual
    const btn = $('#tool-toggle-grid');
    if (btn) btn.classList.toggle('active', STATE.gridMode !== 'none');
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

  function addStickyNote() {
    const viewW = canvasContainer.offsetWidth  || 800;
    const viewH = canvasContainer.offsetHeight || 600;
    const wx = (viewW / 2 - STATE.tx) / STATE.scale - 100;
    const wy = (viewH / 2 - STATE.ty) / STATE.scale - 60;
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
  }

  /* =====================================================================
     14. TOPBAR EVENTS
     ===================================================================== */
  function attachTopbarEvents() {
    $('#btn-theme-toggle')?.addEventListener('click', () => {
      const html = document.documentElement;
      const isDark = html.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      try { localStorage.setItem('neura_theme_v1', next); } catch(e) {}
    });

    $('#btn-toggle-grid')?.addEventListener('click', cycleGrid);

    $('#btn-export-diagram')?.addEventListener('click', exportDiagram);

    // Explorer Mode Toggle
    $('#btn-toggle-explorer')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (STATE.explorerMode) {
        exitExplorerMode();
      } else {
        enterExplorerMode([]);
      }
    });

    topbarSearch?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      STATE.searchQuery = q;
      filterNodes(q);
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        topbarSearch?.focus();
        topbarSearch?.select();
      }
    });
  }

  function filterNodes(query) {
    $$('.canvas-node, .file-card').forEach(el => {
      if (!query) { el.style.opacity = '1'; return; }
      const title = el.querySelector('.card-title-main, .node-module-title, .file-card-name')?.textContent.toLowerCase() || '';
      const cat   = el.querySelector('.card-category-label, .node-module-path')?.textContent.toLowerCase() || '';
      const match = title.includes(query) || cat.includes(query);
      el.style.opacity = match ? '1' : '0.2';
    });
  }

  function exportDiagram() {
    alert('Ekspor Diagram: Menyiapkan snapshot diagram arsitektur Neura (SVG/JSON).');
  }

  /* =====================================================================
     14B. CANVAS DIRECTORY EXPLORER ENGINE
     ===================================================================== */
  let isExplorerNavigating = false;

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

  function layoutExplorerGrid(items) {
    const COLS = 4;
    const CARD_W = 244;
    const CARD_H = 68;
    const GAP_X = 44;
    const GAP_Y = 36;
    const START_X = 100;
    const START_Y = 80;

    const list = Array.isArray(items) ? items : [];
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
          { side: 'top', type: 'green', symbol: '+' },
          { side: 'bottom', type: 'green', symbol: '+' }
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
          { side: 'top', type: 'green', symbol: '+' },
          { side: 'bottom', type: 'green', symbol: '+' }
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

      STATE.explorerMode = true;
      STATE.explorerPath = cleanPath;

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
      const layoutItems = layoutExplorerGrid(rawItems);
      STATE.explorerCurrentItems = layoutItems;
      STATE.nodes = layoutItems;

      // Hide SVG connections & stickies in explorer mode
      if (connSvg) connSvg.style.display = 'none';
      $$('.canvas-sticky-note').forEach(el => el.style.display = 'none');

      // Clear nodes layer and render explorer cards
      if (nodesLayer) nodesLayer.innerHTML = '';

      if (!layoutItems.length) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'explorer-empty-state';
        emptyEl.innerHTML = `
          <div class="explorer-empty-icon">📁</div>
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

      // Render breadcrumb navigation
      renderBreadcrumb();

      // Update topbar button state
      if (btnToggleExplorer) {
        btnToggleExplorer.classList.add('explorer-active');
        const span = btnToggleExplorer.querySelector('span');
        if (span) span.textContent = 'Mode: Explorer';
        btnToggleExplorer.setAttribute('title', 'Klik untuk kembali ke Diagram Arsitektur');
      }

      // Update status bar
      const pathStr = cleanPath.length ? `/${cleanPath.join('/')}` : '/ (Root Proyek)';
      if (statusSyncText) statusSyncText.textContent = `Direktori: ${pathStr}`;
      const dirsCount = rawItems.filter(i => i.type === 'directory').length;
      const filesCount = rawItems.filter(i => i.type !== 'directory').length;
      if (nodeCountEl) nodeCountEl.textContent = `${dirsCount} Folder`;
      if (relCountEl) relCountEl.textContent = `${filesCount} Berkas`;

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

    // Restore architecture diagram nodes
    STATE.nodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    STATE.connections = [...INITIAL_CONNECTIONS];
    STATE.stickies = JSON.parse(JSON.stringify(STICKY_NOTES));

    // Show SVG connections and stickies
    if (connSvg) connSvg.style.display = 'block';

    // Render original architecture
    renderAllNodes();
    renderAllStickies();
    renderAllConnections();

    // Hide breadcrumb
    if (canvasBreadcrumb) canvasBreadcrumb.style.display = 'none';

    // Update topbar button state
    if (btnToggleExplorer) {
      btnToggleExplorer.classList.remove('explorer-active');
      const span = btnToggleExplorer.querySelector('span');
      if (span) span.textContent = 'Explorer';
      btnToggleExplorer.setAttribute('title', 'Beralih ke Explorer Mode (telusuri folder real)');
    }

    // Update status bar
    updateStatusBar();

    // Smoothly refit view to architecture
    setTimeout(() => {
      fitView(true);
    }, 40);
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
    archBtn.title = 'Kembali ke Diagram Arsitektur';
    archBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
      <span>Diagram Arsitektur</span>
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

    const iconHtml = getNodeSvgIcon('folder');
    const countBadge = node.count !== undefined ? `<div class="explorer-count-badge" title="${node.count} item di dalam folder">${node.count} item</div>` : '';

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">DIREKTORI</div>
        <div class="card-title-main" title="${node.path}">${node.name}</div>
      </div>
      ${countBadge}
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
    el.className = `file-card explorer-card ${node.borderVariant || 'card-border-neutral'}`;
    el.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.setAttribute('data-dbl-hint', 'Klik / Double-click untuk lihat isi berkas');

    const extClean = (node.ext || '').replace('.', '').toLowerCase();
    const iconHtml = getNodeSvgIcon(extClean === 'py' ? 'python' : (extClean === 'css' ? 'palette' : (extClean === 'json' ? 'database' : 'code')));
    const codeBadge = `<div class="card-code-badge" title="Klik untuk showcase kode">&lt;/&gt;</div>`;
    const sizeBadge = node.size !== undefined ? `<div class="explorer-count-badge">${fmt_size(node.size)}</div>` : '';

    el.innerHTML = `
      <div class="card-icon-slot">${iconHtml}</div>
      <div class="card-divider-v"></div>
      <div class="card-text-slot">
        <div class="card-category-label">${extClean.toUpperCase() || 'FILE'}</div>
        <div class="card-title-main" title="${node.path}">${node.name}</div>
      </div>
      ${codeBadge}
      ${sizeBadge}
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
    if (treeSummaryStats) treeSummaryStats.textContent = `${dirs} folder • ${files} berkas di root`;
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
      iconEl.textContent = item.type === 'directory' ? '📁' : getFileIcon(item.name);
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

  function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const map = {
      py: '🐍', js: '☕', ts: '📘', html: '🌐', css: '🎨', json: '📋',
      md: '📄', txt: '📄', pt: '🧠', pth: '🧠', csv: '📊', ipynb: '📓',
      jpg: '🖼️', png: '🖼️', svg: '🖼️', gif: '🖼️', env: '🔑',
      sh: '🔧', bat: '🔧', toml: '⚙️', yaml: '⚙️', yml: '⚙️',
    };
    return map[ext] || '📄';
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
    if (nodeCountEl) nodeCountEl.textContent = `${folders} Folder · ${files} Berkas`;
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
     Allows user to draw a new edge by clicking source port → target port.
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
      if (STATE.mode !== 'connect') return;
      const port = e.target.closest('.node-port');
      if (!port) return;
      e.stopPropagation();

      const nodeId = port.dataset.node;
      const side   = port.dataset.side;

      if (!STATE.connectSource) {
        // First click: pick source
        STATE.connectSource = { nodeId, side };
        port.classList.add('port-connecting-source');
        ensureWirePreview();
        showToast('Klik port tujuan untuk membuat koneksi…', 2000);
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
