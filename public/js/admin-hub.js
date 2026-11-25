/**
 * public/js/admin-hub.js
 * Controller utama untuk Neura Admin Hub:
 * - Render Featured Core Workspace cards & 2-col Compact cards
 * - Expandable Sidebar 2 berdasarkan menu Sidebar 1
 * - Instant Search (Ctrl+K), Theme Switch, & Live Dataset Summary
 */
(function () {
  const ICONS = {
    welcome: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    chat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    riset: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>',
    struktur: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
    db: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>',
    train: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    test: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 3h6v5l4 8a2 2 0 0 1-1.7 3H6.7A2 2 0 0 1 5 16l4-8V3z"/></svg>',
    intents: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    chart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    nakes: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    doc: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  const FEATURED_CARDS = [
    {
      id: 'welcome',
      category: 'platform',
      title: 'Welcome',
      tag: '/welcome',
      desc: 'Halaman landing utama Neura AI, showcase fitur klinis, dan gerbang masuk pengguna.',
      icon: ICONS.welcome,
      href: '/welcome',
      actionLabel: 'Buka Welcome Page',
    },
    {
      id: 'neura-chat',
      category: 'platform',
      title: 'Neura Chat',
      tag: '/chat',
      desc: 'Workspace konsultasi AI klinis, voice assistant, dan eksekusi ML commands.',
      icon: ICONS.chat,
      href: '/chat',
      actionLabel: 'Buka Neura Chat',
    },
    {
      id: 'riset',
      category: 'platform',
      title: 'Studio Riset',
      tag: '/app/riset',
      desc: 'Editor publikasi riset klinis Alzheimer, manajemen pembaruan & dokumen ilmiah.',
      icon: ICONS.riset,
      href: '/app/riset',
      actionLabel: 'Buka Studio Riset',
    },
    {
      id: 'manajemen-struktur',
      category: 'platform',
      title: 'Manajemen Struktur',
      tag: '/app/struktur',
      desc: 'Canvas arsitektur proyek Neura, explorer direktori, dan peta skema database.',
      icon: ICONS.struktur,
      href: '/app/struktur',
      actionLabel: 'Buka Manajemen Struktur',
    },
  ];

  const BENTO_DATASETS = [
    {
      id: 'dataset-original',
      category: 'datasets',
      title: 'Dataset Original',
      badge: 'CSV',
      desc: 'alzheimers_disease_data.csv — Data klinis mentah lengkap sebelum pemecahan.',
      icon: ICONS.db,
      accent: true,
      previewType: 'dataset',
      actionLabel: 'Buka di Struktur Database',
      href: '/app/struktur',
    },
    {
      id: 'dataset-training',
      category: 'datasets',
      title: 'Dataset Training',
      badge: '80% Split',
      desc: 'Subset pelatihan model XGBoost & Neural Network (80% sampel awal).',
      icon: ICONS.train,
      accent: true,
      previewType: 'dataset',
      actionLabel: 'Jalankan /train di Chat',
      href: '/chat',
    },
    {
      id: 'dataset-testing',
      category: 'datasets',
      title: 'Dataset Testing',
      badge: '20% Split',
      desc: 'Subset evaluasi akurasi & validasi generalisasi model (20% sampel uji).',
      icon: ICONS.test,
      accent: true,
      previewType: 'dataset',
      actionLabel: 'Jalankan /eval di Chat',
      href: '/chat',
    },
  ];

  const DATASET_CARDS = [
    {
      id: 'dataset-intents',
      category: 'datasets',
      title: 'Chat & Voice Intents',
      badge: 'JSON',
      desc: 'chat_dataset.json & voice_dataset.json — Korpus percakapan asisten AI.',
      icon: ICONS.intents,
      previewType: 'dataset',
      actionLabel: 'Buka Neura Chat',
      href: '/chat',
    },
    {
      id: 'ml-model',
      category: 'datasets',
      title: 'Model ML & Evaluasi',
      badge: 'TensorBoard',
      desc: 'Grafik akurasi & loss Neural Network serta metrik pelatihan model aktif.',
      icon: ICONS.chart,
      previewType: 'ml',
      actionLabel: 'Buka ML Commands',
      href: '/chat',
    },
  ];

  const OPERATION_CARDS = [
    {
      id: 'data-nakes',
      category: 'nakes',
      title: 'Data Nakes',
      badge: 'Directory',
      desc: 'Kelola daftar dokter & tenaga kesehatan terverifikasi beserta sinkronisasi akun.',
      icon: ICONS.nakes,
      previewType: 'nakes',
      actionLabel: 'Kelola di Neura Chat',
      href: '/chat',
    },
    {
      id: 'statistik-analytics',
      category: 'operations',
      title: 'Statistik & Analytics',
      badge: 'KPIs',
      desc: 'Ringkasan pengguna, pasien, tenaga kesehatan, dan total dokumen konsultasi.',
      icon: ICONS.chart,
      previewType: 'stats',
      actionLabel: 'Buka Room Statistik',
      href: '/chat',
    },
    {
      id: 'database-explorer',
      category: 'operations',
      title: 'Database & Collections',
      badge: 'Inspector',
      desc: 'Inspeksi koleksi MySQL & JSON store serta monitoring pengguna online.',
      icon: ICONS.db,
      previewType: 'database',
      actionLabel: 'Buka Database Canvas',
      href: '/app/struktur',
    },
    {
      id: 'konsultasi-records',
      category: 'nakes',
      title: 'Dokumen Konsultasi (NKS)',
      badge: 'Records',
      desc: 'Arsip hasil skrining pasien dan validasi kode konsultasi klinis.',
      icon: ICONS.doc,
      previewType: 'info',
      detail: 'Dokumen konsultasi pasien tersimpan pada consultations_records.json dan dapat diperiksa melalui kode NKS di Neura Chat.',
      actionLabel: 'Buka Neura Chat',
      href: '/chat',
    },
    {
      id: 'audit-presence',
      category: 'operations',
      title: 'Audit Log & Presence',
      badge: 'Live',
      desc: 'Pantau administrator yang sedang aktif dan riwayat aktivitas sistem.',
      icon: ICONS.shield,
      previewType: 'presence',
      actionLabel: 'Kembali ke App',
      href: '/chat',
    },
    {
      id: 'system-settings',
      category: 'operations',
      title: 'System & Maintenance',
      badge: 'Config',
      desc: 'Kontrol halaman maintenance, status model, dan konfigurasi portal Neura.',
      icon: ICONS.settings,
      previewType: 'info',
      detail: 'Gunakan toggle Test Mode di pojok kiri bawah sidebar untuk simulasi atau uji coba administratif, dan kelola maintenance dari konfigurasi sistem.',
      actionLabel: 'Lihat Maintenance Page',
      href: '/maintenance.html',
    },
  ];

  const SIDEBAR2_MENUS = {
    datasets: {
      title: 'Datasets & ML',
      items: [
        { id: 'dataset-original', label: 'dataset-original', tag: 'CSV' },
        { id: 'dataset-training', label: 'dataset-training', tag: '80%' },
        { id: 'dataset-testing', label: 'dataset-testing', tag: '20%' },
        { id: 'dataset-intents', label: 'Chat & Voice Intents', tag: 'JSON' },
        { id: 'ml-model', label: 'Model & Evaluasi', tag: 'Charts' },
      ],
    },
    platform: {
      title: 'Platform & Pages',
      items: [
        { id: 'welcome', label: 'Welcome Page', tag: '/welcome' },
        { id: 'neura-chat', label: 'Neura Chat', tag: '/chat' },
        { id: 'riset', label: 'Studio Riset', tag: '/riset' },
        { id: 'manajemen-struktur', label: 'Manajemen Struktur', tag: '/struktur' },
      ],
    },
    nakes: {
      title: 'Nakes & Users',
      items: [
        { id: 'data-nakes', label: 'Direktori Nakes', tag: 'Admin' },
        { id: 'konsultasi-records', label: 'Dokumen Konsultasi', tag: 'NKS' },
      ],
    },
    operations: {
      title: 'Operations & System',
      items: [
        { id: 'statistik-analytics', label: 'Statistik & Analytics', tag: 'KPIs' },
        { id: 'database-explorer', label: 'Database & Collections', tag: 'DB' },
        { id: 'audit-presence', label: 'Audit Log & Presence', tag: 'Live' },
        { id: 'system-settings', label: 'System & Maintenance', tag: 'Config' },
      ],
    },
  };

  let activeCategory = 'all';
  let searchQuery = '';

  function allCompactCards() {
    return [...BENTO_DATASETS, ...DATASET_CARDS, ...OPERATION_CARDS];
  }

  function findCardById(id) {
    return [...FEATURED_CARDS, ...allCompactCards()].find(c => c.id === id);
  }

  function getEcosystemArt(id) {
    if (id === 'welcome') {
      return `
        <div class="eco-browser" aria-hidden="true">
          <div class="eco-browser-dots"><span></span><span></span><span></span></div>
          <div class="eco-browser-hero"><div class="eco-browser-pill"></div></div>
        </div>
      `;
    }
    if (id === 'riset') {
      return `
        <div class="eco-editorial" aria-hidden="true">
          <div class="eco-doc eco-doc-back"></div>
          <div class="eco-doc eco-doc-front">
            <div class="eco-doc-line eco-doc-line--accent"></div>
            <div class="eco-doc-line"></div>
            <div class="eco-doc-line" style="width:72%"></div>
          </div>
        </div>
      `;
    }
    if (id === 'manajemen-struktur') {
      return `
        <svg class="eco-nodes-svg" viewBox="0 0 150 76" fill="none" aria-hidden="true">
          <line x1="28" y1="24" x2="75" y2="38" stroke="currentColor" stroke-width="1.4" opacity="0.45" />
          <line x1="75" y1="38" x2="122" y2="20" stroke="currentColor" stroke-width="1.4" opacity="0.45" />
          <line x1="75" y1="38" x2="118" y2="58" stroke="currentColor" stroke-width="1.4" opacity="0.45" />
          <line x1="28" y1="24" x2="36" y2="56" stroke="currentColor" stroke-width="1.4" opacity="0.35" />
          <circle class="node-circle" cx="28" cy="24" r="6" fill="var(--hub-bg)" stroke="currentColor" stroke-width="1.6" />
          <circle class="node-circle" cx="36" cy="56" r="5" fill="var(--hub-bg)" stroke="currentColor" stroke-width="1.5" />
          <circle class="node-circle node-accent" cx="75" cy="38" r="7" />
          <circle class="node-circle" cx="122" cy="20" r="5.5" fill="var(--hub-bg)" stroke="currentColor" stroke-width="1.5" />
          <circle class="node-circle" cx="118" cy="58" r="5.5" fill="var(--hub-bg)" stroke="currentColor" stroke-width="1.5" />
        </svg>
      `;
    }
    return '';
  }

  function renderFeatured() {
    const grid = document.getElementById('hub-featured-grid');
    if (!grid) return;
    const q = searchQuery.trim().toLowerCase();
    const list = FEATURED_CARDS.filter(c => {
      if (c.id === 'neura-chat') return false;
      const catMatch = activeCategory === 'all' || activeCategory === c.category;
      const qMatch = !q || c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.id.includes(q);
      return catMatch && qMatch;
    });

    const sec = grid.closest('.hub-section');
    if (sec) sec.style.display = list.length ? '' : 'none';

    grid.innerHTML = list.map(c => `
      <a href="${c.href}" class="eco-card" data-card-id="${c.id}">
        <div class="eco-art-box">
          <span class="eco-tag" id="eco-tag-${c.id}">${c.tag}</span>
          ${getEcosystemArt(c.id)}
        </div>
        <div class="featured-title">${c.title}</div>
        <div class="featured-desc">${c.desc}</div>
      </a>
    `).join('');
  }

  function renderCompactGrid(containerId, items) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    const q = searchQuery.trim().toLowerCase();
    const filtered = items.filter(c => {
      const catMatch = activeCategory === 'all' || activeCategory === c.category;
      const qMatch = !q || c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.id.includes(q);
      return catMatch && qMatch;
    });

    const sec = grid.closest('.hub-section');
    if (sec) sec.style.display = filtered.length ? '' : 'none';

    grid.innerHTML = filtered.map(c => `
      <div class="compact-card" data-card-id="${c.id}">
        <div class="compact-icon ${c.accent ? 'compact-icon--accent' : ''}">
          ${c.icon}
        </div>
        <div class="compact-body">
          <div class="compact-title-row">
            <span class="compact-title">${c.title}</span>
            <span class="compact-badge" id="badge-${c.id}">${c.badge}</span>
          </div>
          <div class="compact-desc" title="${c.desc}">${c.desc}</div>
        </div>
        <button class="compact-view-btn" data-view-id="${c.id}">View</button>
      </div>
    `).join('');

    grid.querySelectorAll('[data-view-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = findCardById(btn.dataset.viewId);
        if (item) window.AdminHubDrawer.open(item);
      });
    });
  }

  function renderAll() {
    const q = searchQuery.trim().toLowerCase();
    const welcomeBanner = document.getElementById('hub-welcome-banner');
    if (welcomeBanner) {
      welcomeBanner.style.display = (activeCategory === 'all' && !q) ? '' : 'none';
    }

    const bentoSection = document.getElementById('hub-dataset-bento-section');
    if (bentoSection) {
      const showBento = (activeCategory === 'all' || activeCategory === 'datasets') &&
        (!q || 'dataset original training testing alzheimers csv'.includes(q) || q.includes('dataset'));
      bentoSection.style.display = showBento ? '' : 'none';
    }

    const aiBentoSection = document.getElementById('hub-ai-bento-section');
    if (aiBentoSection) {
      const showAi = (activeCategory === 'all' || activeCategory === 'datasets' || activeCategory === 'platform') &&
        (!q || 'ai engine train eval neura chat commands status predict progress'.includes(q));
      aiBentoSection.style.display = showAi ? '' : 'none';
    }

    const telemetrySection = document.getElementById('hub-telemetry-bento-section');
    if (telemetrySection) {
      const showTel = (activeCategory === 'all' || activeCategory === 'nakes' || activeCategory === 'operations') &&
        (!q || 'nakes telemetry system health presence mysql radar'.includes(q));
      telemetrySection.style.display = showTel ? '' : 'none';
    }

    renderFeatured();
    renderCompactGrid('hub-datasets-grid', DATASET_CARDS);
    renderCompactGrid('hub-operations-grid', OPERATION_CARDS);

    const activeBar = document.getElementById('hub-active-bar');
    const activeLabel = document.getElementById('hub-active-label');
    if (activeBar && activeLabel) {
      if (activeCategory !== 'all' || searchQuery.trim()) {
        activeBar.style.display = 'flex';
        const parts = [];
        if (activeCategory !== 'all') parts.push(`Kategori: ${SIDEBAR2_MENUS[activeCategory]?.title || activeCategory}`);
        if (searchQuery.trim()) parts.push(`Pencarian: "${searchQuery.trim()}"`);
        activeLabel.textContent = parts.join(' • ');
      } else {
        activeBar.style.display = 'none';
      }
    }
  }

  function openSidebar2(expandKey) {
    const sb2 = document.getElementById('hub-sidebar-2');
    const sb2Title = document.getElementById('sb2-title');
    const sb2List = document.getElementById('sb2-list');
    if (!sb2 || !sb2Title || !sb2List) return;

    const menu = SIDEBAR2_MENUS[expandKey];
    if (!menu) {
      closeSidebar2();
      return;
    }

    sb2Title.textContent = menu.title;
    sb2List.innerHTML = menu.items.map(it => `
      <button class="sb2-item" data-sb2-id="${it.id}">
        <span>${it.label}</span>
        <span class="sb2-tag">${it.tag}</span>
      </button>
    `).join('');

    sb2List.querySelectorAll('.sb2-item').forEach(btn => {
      btn.addEventListener('click', () => {
        sb2List.querySelectorAll('.sb2-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const id = btn.dataset.sb2Id;
        const targetCard = document.querySelector(`[data-card-id="${id}"], [data-bento-id="${id}"], [data-bento-open="${id}"]`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetCard.classList.add('hub-card-focus');
          setTimeout(() => targetCard.classList.remove('hub-card-focus'), 1200);
        }
        const item = findCardById(id);
        if (!item) return;
        if (item.previewType) {
          window.AdminHubDrawer.open(item);
        } else if (item.href) {
          window.location.href = item.href;
        }
      });
    });

    sb2.classList.add('is-open');
    activeCategory = expandKey;
    renderAll();
  }

  function closeSidebar2() {
    document.getElementById('hub-sidebar-2')?.classList.remove('is-open');
    document.querySelectorAll('.sb1-item[data-expand]').forEach(el => el.classList.remove('expanded'));
  }

  function resetFilters() {
    activeCategory = 'all';
    searchQuery = '';
    const searchInput = document.getElementById('hub-search-input');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.sb1-item').forEach(el => el.classList.remove('active', 'expanded'));
    document.querySelector('.sb1-item[data-nav="overview"]')?.classList.add('active');
    closeSidebar2();
    renderAll();
  }

  async function hydrateLiveDatasetBadges() {
    try {
      const res = await fetch('/api/admin/datasets/summary');
      const data = await res.json();
      if (!data.success || !data.datasets) return;
      Object.entries(data.datasets).forEach(([key, info]) => {
        const badge = document.getElementById(`badge-${key}`);
        if (badge && typeof info.rows === 'number') {
          badge.textContent = `${info.rows.toLocaleString()} rows`;
        }
        const bentoBadge = document.getElementById(`bento-badge-${key}`);
        if (bentoBadge && typeof info.rows === 'number') {
          bentoBadge.textContent = `${info.rows.toLocaleString()} rows`;
        }
        const card = [...BENTO_DATASETS, ...DATASET_CARDS].find(d => d.id === key);
        if (card && info.columns) {
          card.badge = `${info.rows.toLocaleString()} rows`;
        }
      });
      const orig = data.datasets['dataset-original'];
      const insightDs = document.getElementById('insight-datasets-val');
      if (insightDs && orig && typeof orig.rows === 'number') {
        insightDs.textContent = `${orig.rows.toLocaleString()} · 80/20`;
      }
    } catch (e) {
      // Keep default badges silently
    }
  }

  function initThemeToggle() {
    const btn = document.getElementById('hub-theme-btn');
    btn?.addEventListener('click', () => {
      const curr = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = curr === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('neura_theme_v1', next); } catch (e) {}
    });
  }

  function initEvents() {
    // Sidebar 1 expand / filter
    document.querySelectorAll('.sb1-item[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const expandKey = btn.dataset.expand;
        document.querySelectorAll('.sb1-item[data-nav]').forEach(el => {
          el.classList.remove('active');
          if (el !== btn) el.classList.remove('expanded');
        });
        btn.classList.add('active');

        if (!expandKey || expandKey === 'none') {
          activeCategory = 'all';
          closeSidebar2();
          renderAll();
          return;
        }

        const wasExpanded = btn.classList.contains('expanded');
        if (wasExpanded) {
          btn.classList.remove('expanded');
          closeSidebar2();
          activeCategory = 'all';
          renderAll();
        } else {
          btn.classList.add('expanded');
          openSidebar2(expandKey);
        }
      });
    });

    document.getElementById('sb2-close-btn')?.addEventListener('click', () => {
      closeSidebar2();
    });

    document.getElementById('sb2-reset-filter')?.addEventListener('click', resetFilters);
    document.getElementById('hub-clear-filter-btn')?.addEventListener('click', resetFilters);

    // Browse all triggers in sections
    document.querySelectorAll('[data-expand-trigger]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.expandTrigger;
        const sb1Target = document.querySelector(`.sb1-item[data-expand="${key}"]`);
        if (sb1Target) sb1Target.click();
      });
    });

    // Global Search + Ctrl+K
    const searchInput = document.getElementById('hub-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderAll();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput?.focus();
      }
    });

    // Mobile sidebar toggle
    document.getElementById('hub-mobile-menu-btn')?.addEventListener('click', () => {
      document.getElementById('hub-sidebar-1')?.classList.toggle('mobile-open');
    });

    // Presence quick view
    document.getElementById('hub-presence-btn')?.addEventListener('click', () => {
      const item = findCardById('audit-presence');
      if (item) window.AdminHubDrawer.open(item);
    });

    // Bento dataset cards & Open button
    document.querySelectorAll('[data-bento-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = findCardById(btn.dataset.bentoOpen);
        if (item) window.AdminHubDrawer.open(item);
      });
    });

    // Settings quick view
    document.getElementById('sb1-settings-btn')?.addEventListener('click', () => {
      const item = findCardById('system-settings');
      if (item) window.AdminHubDrawer.open(item);
    });

    // Logout admin
    document.getElementById('hub-logout-btn')?.addEventListener('click', async () => {
      const token = localStorage.getItem('neura_admin_token') || sessionStorage.getItem('neura_admin_token') || '';
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch (e) {}
      try {
        localStorage.removeItem('neura_admin_token');
        localStorage.removeItem('neura_admin_authenticated');
        localStorage.removeItem('neura_admin_name');
        localStorage.removeItem('neura_user_role');
        localStorage.removeItem('neura_auth_user');
        sessionStorage.removeItem('neura_admin_session');
        sessionStorage.removeItem('neura_admin_token');
      } catch (e) {}
      window.location.replace('/welcome?logged_out=true');
    });
  }

  function hydrateAdminAvatar() {
    try {
      const raw = localStorage.getItem('neura_auth_user');
      const user = raw ? JSON.parse(raw) : null;
      const name = (user && user.displayName) || localStorage.getItem('neura_admin_name') || 'Admin';
      const el = document.getElementById('hub-admin-avatar');
      if (el) {
        el.textContent = String(name).trim().charAt(0).toUpperCase() || 'A';
        el.title = name;
      }
      const heroNameEl = document.getElementById('hub-welcome-name');
      if (heroNameEl) {
        heroNameEl.textContent = name;
      }
    } catch (e) {}
  }

  let _trainPollTimer = null;

  function setInlineAiStatus(visible, msg, pct) {
    const box = document.getElementById('ai-inline-status');
    const msgEl = document.getElementById('ai-inline-msg');
    const pctEl = document.getElementById('ai-inline-pct');
    const fillEl = document.getElementById('ai-progress-fill');
    if (!box) return;
    box.style.display = visible ? 'block' : 'none';
    if (msgEl && msg !== undefined) msgEl.textContent = msg;
    if (pctEl && pct !== undefined) pctEl.textContent = `${pct}%`;
    if (fillEl && pct !== undefined) fillEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  }

  async function runInlineEvaluate() {
    setInlineAiStatus(true, 'Menjalankan evaluasi model...', 45);
    try {
      const res = await fetch('/api/evaluate');
      const data = await res.json();
      const acc = data.accuracy ?? data.test_accuracy ?? data.metrics?.accuracy;
      if (acc !== undefined) {
        const pct = Number(acc) <= 1 ? (Number(acc) * 100).toFixed(2) : Number(acc).toFixed(2);
        const badge = document.getElementById('ai-accuracy-badge');
        if (badge) badge.textContent = `${pct}% Acc`;
        setInlineAiStatus(true, `Evaluasi selesai: Akurasi ${pct}%`, 100);
      } else {
        setInlineAiStatus(true, data.message || 'Evaluasi selesai.', 100);
      }
    } catch (err) {
      setInlineAiStatus(true, `Gagal evaluasi: ${err.message}`, 0);
    }
  }

  function pollTrainProgress() {
    if (_trainPollTimer) clearInterval(_trainPollTimer);
    _trainPollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/train/progress');
        const data = await res.json();
        const prog = Array.isArray(data.progress) ? data.progress : [];
        const total = data.total_epochs || 5;
        const pct = total > 0 ? Math.min(100, Math.round((prog.length / total) * 100)) : 50;
        if (data.running) {
          setInlineAiStatus(true, `Training Epoch ${prog.length}/${total}...`, pct);
        } else {
          clearInterval(_trainPollTimer);
          _trainPollTimer = null;
          setInlineAiStatus(true, data.error ? `Error: ${data.error}` : 'Training selesai!', data.error ? 0 : 100);
        }
      } catch (e) {
        clearInterval(_trainPollTimer);
        _trainPollTimer = null;
      }
    }, 1200);
  }

  async function runInlineTrain() {
    setInlineAiStatus(true, 'Memulai training 5 epochs...', 10);
    try {
      const res = await fetch('/api/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Neura-Role': 'admin' },
        body: JSON.stringify({ epochs: 5, role: 'admin' }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setInlineAiStatus(true, 'Training sedang berjalan, memantau progress...', 35);
        pollTrainProgress();
        return;
      }
      if (!res.ok) {
        setInlineAiStatus(true, data.error || 'Gagal memulai training.', 0);
        return;
      }
      pollTrainProgress();
    } catch (err) {
      setInlineAiStatus(true, `Gagal memulai training: ${err.message}`, 0);
    }
  }

  async function hydrateTelemetryAndRadar(showToastFeedback = false) {
    const onlineBadge = document.getElementById('radar-online-badge');
    if (onlineBadge) onlineBadge.textContent = 'Checking...';

    // 1. Platform Stats & Donut Ring
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      const kpis = data.platform_kpis || {};
      const bd = data.user_breakdown || {};
      const total = Math.max(1, Number(kpis.total_users || 0));
      const pasien = Number(bd.pasien || 0);
      const nakes = Number(bd.nakes || 0);

      const totalEl = document.getElementById('telemetry-total-users');
      if (totalEl) totalEl.textContent = kpis.total_users ?? '--';

      const docsEl = document.getElementById('telemetry-docs-badge');
      if (docsEl) docsEl.textContent = `${kpis.total_consultation_docs ?? 0} docs`;

      const textEl = document.getElementById('telemetry-breakdown-text');
      if (textEl) textEl.textContent = `${pasien} Pasien · ${nakes} Nakes · ${bd.admin ?? 0} Admin`;

      const accBadge = document.getElementById('ai-accuracy-badge');
      if (accBadge && kpis.ai_model_accuracy) accBadge.textContent = `${kpis.ai_model_accuracy} Acc`;

      const insightModel = document.getElementById('insight-model-val');
      if (insightModel && kpis.ai_model_accuracy) insightModel.textContent = kpis.ai_model_accuracy;

      const insightNakes = document.getElementById('insight-nakes-val');
      if (insightNakes) insightNakes.textContent = `${kpis.total_verified_nakes ?? nakes} aktif`;

      const circ = 188.5;
      const pLen = (pasien / total) * circ;
      const nLen = (nakes / total) * circ;
      const segP = document.getElementById('donut-seg-pasien');
      const segN = document.getElementById('donut-seg-nakes');
      if (segP && segN) {
        segP.setAttribute('stroke-dasharray', `${pLen.toFixed(1)} ${circ}`);
        segN.setAttribute('stroke-dasharray', `${nLen.toFixed(1)} ${circ}`);
        segN.setAttribute('stroke-dashoffset', `${(-pLen).toFixed(1)}`);
      }
    } catch (e) {}

    // 2. Research Articles Count
    try {
      const res = await fetch('/api/research');
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.articles || data.data || []);
      const ecoTag = document.getElementById('eco-tag-riset');
      if (ecoTag && items.length) ecoTag.textContent = `${items.length} artikel`;
    } catch (e) {}

    // 3. Database & Active Admins Radar
    try {
      const [colRes, presRes] = await Promise.all([
        fetch('/api/database/collections').then(r => r.json()).catch(() => null),
        fetch('/api/admin/active-collaborators').then(r => r.json()).catch(() => null),
      ]);

      const dbVal = document.getElementById('radar-val-db');
      if (dbVal && colRes?.collections) {
        dbVal.textContent = `${colRes.collections.length} collections`;
      }

      const admins = presRes?.collaborators || presRes?.active || [];
      const adminsVal = document.getElementById('radar-val-admins');
      if (adminsVal) adminsVal.textContent = `${Math.max(1, admins.length)} online`;

      if (onlineBadge) onlineBadge.textContent = 'All Systems OK';
      const insightInfra = document.getElementById('insight-infra-val');
      if (insightInfra) insightInfra.textContent = 'MySQL & API OK';
      if (showToastFeedback) showHubToast('System Health & Telemetry diperbarui');
    } catch (e) {
      if (onlineBadge) onlineBadge.textContent = 'Partial';
    }
  }

  function showHubToast(message) {
    const container = document.getElementById('hub-toast-container');
    if (!container || !message) return;
    const toast = document.createElement('div');
    toast.className = 'hub-toast';
    toast.innerHTML = `<span class="hub-toast-dot"></span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s';
      setTimeout(() => toast.remove(), 220);
    }, 2800);
  }

  let _cmdSelectedIdx = 0;
  let _cmdFilteredItems = [];

  function getCommandPaletteItems() {
    return [
      { group: 'Quick Actions', title: 'Run /eval (Evaluasi Model)', meta: 'API', run: () => runInlineEvaluate() },
      { group: 'Quick Actions', title: 'Train 5 Epochs (XGBoost)', meta: 'ML', run: () => runInlineTrain() },
      { group: 'Quick Actions', title: 'Refresh System Health Radar', meta: 'Check', run: () => hydrateTelemetryAndRadar(true) },
      { group: 'Quick Actions', title: 'Ganti Tema (Light / Dark)', meta: 'UI', run: () => document.getElementById('hub-theme-btn')?.click() },
      { group: 'Datasets', title: 'Inspect dataset-original', meta: 'CSV', run: () => window.AdminHubDrawer.open(findCardById('dataset-original')) },
      { group: 'Datasets', title: 'Inspect dataset-training (80%)', meta: 'Split', run: () => window.AdminHubDrawer.open(findCardById('dataset-training')) },
      { group: 'Datasets', title: 'Inspect dataset-testing (20%)', meta: 'Split', run: () => window.AdminHubDrawer.open(findCardById('dataset-testing')) },
      { group: 'Datasets', title: 'Inspect Chat & Voice Intents', meta: 'JSON', run: () => window.AdminHubDrawer.open(findCardById('dataset-intents')) },
      { group: 'Navigation', title: 'Buka Neura Chat Admin', meta: '/chat', run: () => { window.location.href = '/chat'; } },
      { group: 'Navigation', title: 'Buka Studio Riset', meta: '/app/riset', run: () => { window.location.href = '/app/riset'; } },
      { group: 'Navigation', title: 'Buka Manajemen Struktur', meta: '/app/struktur', run: () => { window.location.href = '/app/struktur'; } },
      { group: 'Navigation', title: 'Buka Welcome Page', meta: '/welcome', run: () => { window.location.href = '/welcome'; } },
    ];
  }

  function renderCommandPaletteList(query) {
    const listEl = document.getElementById('cmd-palette-list');
    if (!listEl) return;
    const q = (query || '').trim().toLowerCase();
    const all = getCommandPaletteItems();
    _cmdFilteredItems = q
      ? all.filter(it => it.title.toLowerCase().includes(q) || it.group.toLowerCase().includes(q) || it.meta.toLowerCase().includes(q))
      : all;

    if (_cmdSelectedIdx >= _cmdFilteredItems.length) _cmdSelectedIdx = 0;

    let lastGroup = '';
    let html = '';
    _cmdFilteredItems.forEach((it, idx) => {
      if (it.group !== lastGroup) {
        lastGroup = it.group;
        html += `<div class="cmd-palette-group">${it.group}</div>`;
      }
      html += `
        <button type="button" class="cmd-palette-item ${idx === _cmdSelectedIdx ? 'is-selected' : ''}" data-cmd-idx="${idx}">
          <span class="cmd-palette-title">${it.title}</span>
          <span class="cmd-palette-meta">${it.meta}</span>
        </button>
      `;
    });

    listEl.innerHTML = html || '<div class="cmd-palette-group">Tidak ada perintah yang cocok</div>';
    listEl.querySelectorAll('[data-cmd-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.cmdIdx);
        executeCommandPaletteItem(idx);
      });
    });
  }

  function openCommandPalette() {
    const bd = document.getElementById('cmd-palette-backdrop');
    const inp = document.getElementById('cmd-palette-input');
    if (!bd) return;
    bd.classList.add('open');
    bd.setAttribute('aria-hidden', 'false');
    _cmdSelectedIdx = 0;
    if (inp) {
      inp.value = '';
      renderCommandPaletteList('');
      setTimeout(() => inp.focus(), 20);
    }
  }

  function closeCommandPalette() {
    const bd = document.getElementById('cmd-palette-backdrop');
    if (!bd) return;
    bd.classList.remove('open');
    bd.setAttribute('aria-hidden', 'true');
  }

  function executeCommandPaletteItem(idx) {
    const item = _cmdFilteredItems[idx];
    closeCommandPalette();
    if (item && typeof item.run === 'function') item.run();
  }

  function initCommandPalette() {
    const bd = document.getElementById('cmd-palette-backdrop');
    const inp = document.getElementById('cmd-palette-input');
    bd?.addEventListener('click', (e) => {
      if (e.target === bd) closeCommandPalette();
    });
    inp?.addEventListener('input', (e) => {
      _cmdSelectedIdx = 0;
      renderCommandPaletteList(e.target.value);
    });
    inp?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_cmdFilteredItems.length) {
          _cmdSelectedIdx = (_cmdSelectedIdx + 1) % _cmdFilteredItems.length;
          renderCommandPaletteList(inp.value);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_cmdFilteredItems.length) {
          _cmdSelectedIdx = (_cmdSelectedIdx - 1 + _cmdFilteredItems.length) % _cmdFilteredItems.length;
          renderCommandPaletteList(inp.value);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommandPaletteItem(_cmdSelectedIdx);
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const bd = document.getElementById('cmd-palette-backdrop');
      if (bd?.classList.contains('open')) closeCommandPalette();
      else openCommandPalette();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    window.AdminHubDrawer.init();
    initThemeToggle();
    initEvents();
    initCommandPalette();
    hydrateAdminAvatar();
    renderAll();
    hydrateLiveDatasetBadges();
    hydrateTelemetryAndRadar();

    document.getElementById('btn-inline-eval')?.addEventListener('click', runInlineEvaluate);
    document.getElementById('insight-eval-chip')?.addEventListener('click', runInlineEvaluate);
    document.getElementById('btn-inline-train')?.addEventListener('click', runInlineTrain);
    document.getElementById('btn-radar-refresh')?.addEventListener('click', () => hydrateTelemetryAndRadar(true));
    document.getElementById('hub-test-mode-toggle')?.addEventListener('change', (e) => {
      showHubToast(e.target.checked ? 'Test mode diaktifkan' : 'Test mode dinonaktifkan');
    });

    document.querySelectorAll('.cmd-chip[data-cmd]').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.cmd;
        if (cmd === 'eval') {
          runInlineEvaluate();
        } else if (cmd === 'progress') {
          setInlineAiStatus(true, 'Memeriksa progress training...', 50);
          pollTrainProgress();
        } else {
          window.location.href = '/chat';
        }
      });
    });
  });
})();
