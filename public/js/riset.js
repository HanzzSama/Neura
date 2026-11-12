/**
 * public/js/riset.js
 * =============================================================================
 * Neura Research Studio — Precision Minimalist Clinical Editor
 * Handles document canvas, floating formatting toolbar, modular right widgets,
 * and dual persistence (REST API + Firestore).
 * =============================================================================
 */

(function () {
  'use strict';

  let _allDocs = [];
  let _activeDocId = null;
  let _currentThumbType = 'badge_glow';

  // ── Helper: Escape HTML ────────────────────────────────────────────────────
  function esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Helper: Render Thumbnail HTML according to Type & Config ───────────────
  const DEFAULT_CLEAN_PAGE_HTML = ``;

  let _activePageIndex = 0;
  let _pageScrollObserver = null;

  function renderThumbnailHTML(type, cfg) {
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
      case 'custom_image': {
        const img = cfg.imageUrl || '/assets/neura_hero.png';
        return `
          <div class="blog-card-media" style="background-image:url('${img}'); background-size:cover; background-position:center; min-height:125px; border-radius:12px; position:relative;">
            <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 60%);"></div>
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
      case 'vision_glow': {
        const icon = esc(cfg.badgeIcon || '✦');
        const badge = esc(cfg.badgeText || 'Kohort Data');
        return `
          <div class="blog-card-media blog-media-vision">
            <div class="vision-radial-glow"></div>
            <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
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

    // ── Auto-Save System (Local Persistence on Refresh) ─────────────────────
  const DRAFT_STORAGE_KEY = 'neura_riset_active_draft_v1';
  let _autoSaveTimer = null;

  function updateAutoSyncUI(status) {
    const el = document.getElementById('auto-sync-indicator');
    if (!el) return;
    if (status === 'saving') {
      el.textContent = 'Menyimpan...';
      el.style.color = 'var(--riset-accent)';
    } else if (status === 'saved') {
      el.textContent = 'Tersimpan otomatis';
      el.style.color = 'var(--riset-text-muted)';
    }
  }

  function triggerAutoSave() {
    updateAutoSyncUI('saving');
    clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
      saveActiveDraft();
      updateAutoSyncUI('saved');
    }, 500);
  }

  function saveActiveDraft() {
    const doc = getActiveDoc();
    if (!doc) return;

    // Collect DOM contents for all pages
    if (doc.pages && Array.isArray(doc.pages)) {
      doc.pages.forEach((_, i) => {
        const el = document.getElementById(`doc-rich-body-${i}`);
        if (el) doc.pages[i] = el.innerHTML;
      });
    }

    const titleEl = document.getElementById('doc-title-input');
    if (titleEl) {
      doc.title = titleEl.value;
    }

    const draftPayload = {
      id: doc.id,
      title: doc.title || '',
      pages: doc.pages && doc.pages.length ? doc.pages : [''],
      summaryText: doc.summaryText || '',
      dateText: document.getElementById('insp-date')?.value || doc.dateText || 'Okt 2026',
      categories: document.getElementById('insp-cats')?.value || doc.categories || 'Model AI, Riset Klinis',
      activePageIndex: _activePageIndex || 0,
      thumbnailType: _currentThumbType || doc.thumbnailType || 'badge_glow',
      paperTint: doc.paperTint || 'pure',
      pageMargin: doc.pageMargin || 'normal',
      watermark: doc.watermark || 'none',
      isPublished: doc.isPublished || false,
      _savedToDb: doc._savedToDb || false,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {
      console.warn('[AutoSave] Failed to save draft to localStorage:', e);
    }
  }

  function restoreActiveDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft || !draft.id) return false;

      // Has user actually typed anything or added pages?
      const hasTitle = draft.title && draft.title.trim().length > 0;
      const hasContent = draft.pages && draft.pages.some(p => p && p.trim().length > 0);
      const hasMultiplePages = draft.pages && draft.pages.length > 1;

      if (!hasTitle && !hasContent && !hasMultiplePages) {
        return false; // Blank/trivial, create clean doc instead
      }

      // Check if this draft matches an existing doc in _allDocs or is a new uncommitted doc
      const existingIdx = _allDocs.findIndex(d => d.id === draft.id);
      if (existingIdx !== -1) {
        _allDocs[existingIdx] = { ..._allDocs[existingIdx], ...draft };
        _activeDocId = draft.id;
      } else {
        _allDocs.unshift(draft);
        _activeDocId = draft.id;
      }

      _activePageIndex = draft.activePageIndex || 0;

      renderSidebarDocs();
      renderCanvasPages();
      renderPageCards();

      // Sync breadcrumb
      const crumb = document.getElementById('breadcrumb-doc-title');
      if (crumb) crumb.textContent = (draft.title && draft.title.trim()) ? draft.title : 'Utility';

      // Inspector settings
      const inpDate = document.getElementById('insp-date');
      const inpCats = document.getElementById('insp-cats');
      if (inpDate) inpDate.value = draft.dateText || 'Okt 2026';
      if (inpCats) inpCats.value = draft.categories || 'Model AI, Riset Klinis';
      setPublishStatus(draft.isPublished || false);
      setThumbnailType(draft.thumbnailType || 'badge_glow');
      if (draft.paperTint) setPaperTint(draft.paperTint);
      if (draft.pageMargin) setPageMargin(draft.pageMargin);
      if (draft.watermark) setDocumentWatermark(draft.watermark);
      updateInspectorPreview();

      updateAutoSyncUI('saved');
      return true;
    } catch (err) {
      console.warn('[AutoSave] Error restoring draft:', err);
      return false;
    }
  }

  // ── 1. Fetch & Init Research Documents ─────────────────────────────────────
  async function loadResearchDocs() {
    try {
      const res = await fetch('/api/admin/research');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          _allDocs = json.data.map(d => ({ ...d, _savedToDb: true }));
          try {
            localStorage.setItem('neura_research_updates', JSON.stringify(json.data));
          } catch (e) { }
          // Cek apakah ada draf aktif yang sedang dikerjakan agar konten tidak hilang saat refresh
          if (restoreActiveDraft()) {
            return;
          }
          createNewDoc();
          return;
        }
      }
    } catch (e) {
      console.warn('[Riset Studio] Gagal fetch dari server, memeriksa cache lokal...', e);
    }

    // Cache fallback
    try {
      const local = localStorage.getItem('neura_research_updates');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          _allDocs = parsed.map(d => ({ ...d, _savedToDb: true }));
          if (restoreActiveDraft()) {
            return;
          }
          createNewDoc();
          return;
        }
      }
    } catch (err) {}

    // Default clean start with new "Utility" research
    createNewDoc();
  }

  // Helper to get active document safely
  function getActiveDoc() {
    let doc = _allDocs.find(d => d.id === _activeDocId);
    if (!doc && _allDocs.length > 0) {
      doc = _allDocs[0];
      _activeDocId = doc.id;
    }
    return doc;
  }

  // ── 2. Render Sidebar Document List (Daftar Riset) ─────────────────────────
  function renderSidebarDocs() {
    const listEl = document.getElementById('riset-doc-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const q = (document.getElementById('riset-search-input')?.value || '').toLowerCase().trim();
    const filtered = _allDocs.filter(d => !q || (d.title || 'Utility').toLowerCase().includes(q));

    filtered.forEach(doc => {
      const isAct = doc.id === _activeDocId;
      const isPub = doc.isPublished !== false;
      const displayTitle = (doc.title && doc.title.trim()) ? doc.title : 'Utility';
      const pageCount = (doc.pages && Array.isArray(doc.pages) && doc.pages.length) ? doc.pages.length : 1;

      const itemEl = document.createElement('div');
      itemEl.className = `riset-doc-item ${isAct ? 'active' : ''}`;
      itemEl.onclick = () => selectDoc(doc.id);
      itemEl.innerHTML = `
        <div class="riset-doc-title">${esc(displayTitle)}</div>
        <div class="riset-doc-meta">
          <span class="doc-status-dot ${isPub ? 'dot-pub' : 'dot-draft'}"></span>
          ${esc(doc.dateText || 'Okt 2026')}
          ${Array.isArray(doc.categories) && doc.categories[0] ? ' &bull; ' + esc(doc.categories[0]) : (typeof doc.categories === 'string' && doc.categories ? ' &bull; ' + esc(doc.categories.split(',')[0].trim()) : '')}
          &bull; ${pageCount} Hal.
        </div>
      `;
      listEl.appendChild(itemEl);
    });
  }

  // ── 3. Render Continuous Multi-Page Canvas & Thumbnails ───────────────────
  function onPageContentChange(idx) {
    const doc = getActiveDoc();
    if (!doc || !doc.pages) return;
    const bodyEl = document.getElementById(`doc-rich-body-${idx}`);
    if (bodyEl) {
      doc.pages[idx] = bodyEl.innerHTML;
    }
    triggerAutoSave();
  }

  // ── Auto-highlight sidebar thumbnail when scrolling canvas ──────────────
  function setupPageScrollObserver() {
    // Disconnect old observer first
    if (_pageScrollObserver) {
      _pageScrollObserver.disconnect();
      _pageScrollObserver = null;
    }

    const canvasEl = document.getElementById('col-center-canvas');
    if (!canvasEl) return;

    _pageScrollObserver = new IntersectionObserver((entries) => {
      // Find the entry with highest intersection ratio (most visible)
      let bestEntry = null;
      let bestRatio = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          bestEntry = entry;
        }
      });

      if (bestEntry) {
        const idx = parseInt(bestEntry.target.getAttribute('data-page-index'), 10);
        if (!isNaN(idx) && idx !== _activePageIndex) {
          _activePageIndex = idx;
          // Update sidebar thumbnail highlights
          document.querySelectorAll('.layer-page-card').forEach((card, i) => {
            card.classList.toggle('active', i === idx);
          });
        }
      }
    }, {
      root: canvasEl,
      threshold: [0.1, 0.3, 0.5, 0.7],
      rootMargin: '0px'
    });

    // Observe all page sheets
    document.querySelectorAll('.clean-paper-sheet').forEach(sheet => {
      _pageScrollObserver.observe(sheet);
    });
  }

  function renderCanvasPages() {
    const stackEl = document.getElementById('pages-canvas-stack');
    if (!stackEl) return;
    stackEl.innerHTML = '';

    const doc = getActiveDoc();
    if (!doc) return;

    if (!doc.pages || !Array.isArray(doc.pages) || doc.pages.length === 0) {
      // Build initial page content from whatever data we have
      let initialContent = '';
      if (doc.bodyHtml && doc.bodyHtml.trim()) {
        initialContent = doc.bodyHtml;
      } else if (doc.summaryText && doc.summaryText.trim()) {
        // Render summaryText as a readable first page
        const cats = Array.isArray(doc.categories)
          ? doc.categories.join(', ')
          : (doc.categories || '');
        initialContent = `<p>${esc(doc.summaryText)}</p>`;
      }
      doc.pages = [initialContent];
    }

    const totalPages = doc.pages.length;
    const displayTitle = (doc.title && doc.title.trim()) ? doc.title : '';

    doc.pages.forEach((pageContent, idx) => {
      const pageEl = document.createElement('article');
      const tintClass = doc.paperTint ? ('tint-' + doc.paperTint) : 'tint-pure';
      const marginClass = doc.pageMargin === 'compact' ? 'margin-compact' : (doc.pageMargin === 'wide' ? 'margin-wide' : '');
      pageEl.className = `clean-paper-sheet ${tintClass} ${marginClass}`.trim();
      pageEl.id = `paper-page-${idx}`;
      pageEl.setAttribute('data-page-index', idx);
      if (doc.watermark) {
        pageEl.setAttribute('data-watermark', doc.watermark);
      }

      if (idx === 0) {
        // First Page: Header with document title & meta byline
        pageEl.innerHTML = `
          <div class="sheet-page-badge">Hal. 1</div>
          <textarea id="doc-title-input" class="paper-title-input" rows="1" placeholder="Judul Riset Klinis...">${esc(displayTitle)}</textarea>
          
          <div class="paper-meta-byline">
            <span>Tim Peneliti AI Neura</span>
            <span>&bull;</span>
            <span id="doc-meta-date">${esc(doc.dateText || 'Okt 2026')}</span>
            <span>&bull;</span>
            <span style="color:var(--riset-accent);">Validasi 94.4%</span>
            <span>&bull;</span>
            <span class="doc-page-indicator">Hal. 1 dari ${totalPages}</span>
          </div>

          <div class="doc-rich-body" id="doc-rich-body-0" contenteditable="true" spellcheck="false" data-placeholder="Mulai menulis riset Anda di sini..." oninput="onPageContentChange(0)">${pageContent || ''}</div>
        `;
      } else {
        // Subsequent Pages: Distinct Running Header with title and page number
        pageEl.innerHTML = `
          <div class="sheet-page-badge">Hal. ${idx + 1}</div>
          <div class="paper-sheet-header">
            <span class="sheet-header-title" id="sheet-header-title-${idx}">${esc(displayTitle || 'Utility')}</span>
            <span class="sheet-header-page">Hal. ${idx + 1} dari ${totalPages}</span>
          </div>

          <div class="doc-rich-body" id="doc-rich-body-${idx}" contenteditable="true" spellcheck="false" data-placeholder="Lanjutkan riset Anda di halaman ini..." oninput="onPageContentChange(${idx})">${pageContent || ''}</div>
        `;
      }

      stackEl.appendChild(pageEl);
    });

    // Re-bind title input live sync
    bindTitleInputListener();

    // Re-setup scroll observer for new sheets
    setTimeout(() => setupPageScrollObserver(), 100);
  }

  function bindTitleInputListener() {
    const titleInput = document.getElementById('doc-title-input');
    if (!titleInput) return;

    titleInput.oninput = () => {
      const val = titleInput.value;
      const displayTitle = val.trim() ? val : 'Utility';
      const crumbTitle = document.getElementById('breadcrumb-doc-title');
      if (crumbTitle) crumbTitle.textContent = displayTitle;

      // Update headers on subsequent pages
      const doc = getActiveDoc();
      if (doc) {
        doc.title = val;
        doc.pages.forEach((_, i) => {
          if (i > 0) {
            const hTitle = document.getElementById(`sheet-header-title-${i}`);
            if (hTitle) hTitle.textContent = displayTitle;
          }
        });
        renderSidebarDocs();
      }
      updateInspectorPreview();
      triggerAutoSave();
    };
  }

  // ── Render Sidebar Thumbnail Cards with Distinct Mockups per Page ──────────
  function renderPageCards() {
    const stackEl = document.getElementById('page-cards-stack');
    if (!stackEl) return;
    stackEl.innerHTML = '';

    const doc = getActiveDoc();
    if (!doc) return;

    if (!doc.pages || !Array.isArray(doc.pages) || doc.pages.length === 0) {
      doc.pages = [doc.bodyHtml || DEFAULT_CLEAN_PAGE_HTML];
    }

    const totalPages = doc.pages.length;
    if (_activePageIndex >= totalPages) _activePageIndex = totalPages - 1;
    if (_activePageIndex < 0) _activePageIndex = 0;

    doc.pages.forEach((pContent, idx) => {
      const isAct = idx === _activePageIndex;
      const cardEl = document.createElement('div');
      cardEl.className = `layer-page-card ${isAct ? 'active' : ''}`;
      cardEl.id = `layer-thumb-card-${idx}`;
      cardEl.onclick = () => selectDocPage(idx);

      let deleteBtnHtml = '';
      if (totalPages > 1) {
        deleteBtnHtml = `<button type="button" class="page-card-remove-btn" onclick="removePage(event, ${idx})" title="Hapus halaman ${idx + 1}">×</button>`;
      }

      // Generate distinct visual mockup according to page index & content
      let mockupHtml = '';
      if (idx === 0) {
        // Page 1 Mockup: Title bar + standard paragraph lines
        mockupHtml = `
          <div class="mock-line mock-title"></div>
          <div class="mock-line mock-p l1"></div>
          <div class="mock-line mock-p l2"></div>
          <div class="mock-line mock-p l3"></div>
        `;
      } else if (idx === 1) {
        // Page 2 Mockup: Heading 2 + paragraph + mini block/chart
        mockupHtml = `
          <div class="mock-line mock-h2"></div>
          <div class="mock-line mock-p l1"></div>
          <div class="mock-line mock-block"></div>
          <div class="mock-line mock-p l2"></div>
        `;
      } else {
        // Page 3+ Mockup: Heading + quote bar + paragraph lines
        mockupHtml = `
          <div class="mock-line mock-h2"></div>
          <div class="mock-line mock-quote"></div>
          <div class="mock-line mock-p l1"></div>
          <div class="mock-line mock-p l3"></div>
        `;
      }

      cardEl.innerHTML = `
        ${deleteBtnHtml}
        <div class="page-card-mockup">
          ${mockupHtml}
        </div>
        <span class="page-number-tag">Hal. ${idx + 1} dari ${totalPages}</span>
      `;

      stackEl.appendChild(cardEl);
    });
  }

  function addNewPage() {
    const doc = getActiveDoc();
    if (!doc) return;

    // Save existing pages content
    doc.pages.forEach((_, i) => {
      const el = document.getElementById(`doc-rich-body-${i}`);
      if (el) doc.pages[i] = el.innerHTML;
    });

    const newPageContent = ``;

    doc.pages.push(newPageContent);
    _activePageIndex = doc.pages.length - 1;
    doc.activePageIndex = _activePageIndex;

    // Render continuous sheets & thumbnails
    renderCanvasPages();
    renderPageCards();
    renderSidebarDocs();

    // Scroll directly to the newly appended sheet below
    setTimeout(() => {
      scrollToPage(_activePageIndex);
    }, 50);
    triggerAutoSave();
  }

  function removePage(event, idx) {
    if (event) event.stopPropagation();
    const doc = getActiveDoc();
    if (!doc || !doc.pages || doc.pages.length <= 1) return;

    if (!confirm(`Hapus Halaman ${idx + 1}?`)) return;

    // Save current pages before splice
    doc.pages.forEach((_, i) => {
      const el = document.getElementById(`doc-rich-body-${i}`);
      if (el) doc.pages[i] = el.innerHTML;
    });

    doc.pages.splice(idx, 1);
    if (_activePageIndex >= doc.pages.length) {
      _activePageIndex = doc.pages.length - 1;
    }
    doc.activePageIndex = _activePageIndex;

    renderCanvasPages();
    renderPageCards();
    renderSidebarDocs();

    setTimeout(() => {
      scrollToPage(_activePageIndex);
    }, 50);
    triggerAutoSave();
  }

  function selectDocPage(idx) {
    _activePageIndex = idx;

    // Highlight active thumbnail
    document.querySelectorAll('.layer-page-card').forEach((c, i) => {
      c.classList.toggle('active', i === idx);
    });

    // Scroll canvas to the target sheet
    scrollToPage(idx);
  }

  function scrollToPage(idx) {
    const pageSheet = document.getElementById(`paper-page-${idx}`);
    if (pageSheet) {
      pageSheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Focus to rich body inside this sheet
      const bodyEl = document.getElementById(`doc-rich-body-${idx}`);
      if (bodyEl) {
        setTimeout(() => bodyEl.focus(), 250);
      }
    }
  }

  // ── 4. Select Document & Populate Editor Canvas ────────────────────────────
  function selectDoc(docId) {
    _activeDocId = docId;
    const doc = _allDocs.find(d => d.id === docId);
    if (!doc) return;

    if (!doc.pages || !Array.isArray(doc.pages) || doc.pages.length === 0) {
      doc.pages = [doc.bodyHtml || DEFAULT_CLEAN_PAGE_HTML];
    }
    _activePageIndex = doc.activePageIndex || 0;
    if (_activePageIndex >= doc.pages.length) _activePageIndex = 0;

    renderSidebarDocs();
    renderCanvasPages();
    renderPageCards();

    // Auto-switch to Pages tab so user can see page thumbnails
    switchLeftTab('pages');

    // Inspector settings
    const inpDate = document.getElementById('insp-date');
    const inpCats = document.getElementById('insp-cats');
    const inpLinkText = document.getElementById('insp-link-text');
    const inpLinkUrl = document.getElementById('insp-link-url');

    if (inpDate) inpDate.value = doc.dateText || 'Okt 2026';
    if (inpCats) inpCats.value = Array.isArray(doc.categories) ? doc.categories.join(', ') : (doc.categories || 'Model AI, Riset Klinis');
    if (inpLinkText) inpLinkText.value = doc.readLinkText || 'Baca riset';
    if (inpLinkUrl) inpLinkUrl.value = doc.linkUrl || '/app';

    // Sync breadcrumb title
    const crumb = document.getElementById('breadcrumb-doc-title');
    if (crumb) {
      const displayTitle = (doc.title && doc.title.trim()) ? doc.title : 'Utility';
      crumb.textContent = displayTitle;
    }

    setPublishStatus(doc.isPublished !== false);
    setThumbnailType(doc.thumbnailType || 'badge_glow', doc.thumbnailConfig);
    updateInspectorPreview();
    triggerAutoSave();
  }

  // ── 5. Create New Blank Document (Default: Utility & Clean Canvas) ─────────
  function createNewDoc() {
    const newDoc = {
      id: 'res-' + Date.now(),
      title: '', // Teks input judul kosong bersih
      summaryText: '',
      dateText: 'Okt 2026',
      categories: 'Model AI, Riset Klinis',
      readLinkText: 'Baca riset',
      linkUrl: '/app',
      thumbnailType: 'badge_glow',
      thumbnailConfig: { badgeIcon: '✦', badgeText: 'Model Klinis' },
      bodyHtml: DEFAULT_CLEAN_PAGE_HTML,
      pages: [DEFAULT_CLEAN_PAGE_HTML],
      activePageIndex: 0,
      isPublished: false
    };

    _allDocs.unshift(newDoc);
    _activeDocId = newDoc.id;
    _activePageIndex = 0;

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch(e) {}

    renderSidebarDocs();
    renderCanvasPages();
    renderPageCards();

    // Reset breadcrumb
    const crumb = document.getElementById('breadcrumb-doc-title');
    if (crumb) crumb.textContent = 'Utility';

    // Reset settings
    const inpDate = document.getElementById('insp-date');
    const inpCats = document.getElementById('insp-cats');
    if (inpDate) inpDate.value = 'Okt 2026';
    if (inpCats) inpCats.value = 'Model AI, Riset Klinis';
    setPublishStatus(false);

    setThumbnailType('badge_glow', { badgeIcon: '✦', badgeText: 'Model Klinis' });
    setPageMargin('normal');
    setDocumentWatermark('none');
    updateInspectorPreview();

    const titleInput = document.getElementById('doc-title-input');
    if (titleInput) titleInput.focus();
  }

    // ── 5. Thumbnail Type & Config Management ───────────────────────────────────
  function setThumbnailType(type, cfg) {
    _currentThumbType = type;
    document.querySelectorAll('.thumb-style-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-type') === type);
    });

    const gBadge = document.getElementById('cfg-group-badge');
    const gMockup = document.getElementById('cfg-group-mockup');
    const gCollab = document.getElementById('cfg-group-collab');
    const gImage = document.getElementById('cfg-group-image');

    if (gBadge) gBadge.style.display = (type === 'badge_glow' || type === 'neon_code' || type === 'vision_glow') ? 'flex' : 'none';
    if (gMockup) gMockup.style.display = (type === 'mockup_card') ? 'flex' : 'none';
    if (gCollab) gCollab.style.display = (type === 'collab_widget') ? 'flex' : 'none';
    if (gImage) gImage.style.display = (type === 'custom_image') ? 'flex' : 'none';

    cfg = cfg || {};
    if (cfg.badgeText && document.getElementById('cfg-badge-text')) {
      document.getElementById('cfg-badge-text').value = cfg.badgeText;
    }
    if (cfg.mockupTitle && document.getElementById('cfg-mockup-title')) {
      document.getElementById('cfg-mockup-title').value = cfg.mockupTitle;
    }
    if (cfg.mockupDesc && document.getElementById('cfg-mockup-desc')) {
      document.getElementById('cfg-mockup-desc').value = cfg.mockupDesc;
    }
    if (cfg.mockupBtnText && document.getElementById('cfg-mockup-btn')) {
      document.getElementById('cfg-mockup-btn').value = cfg.mockupBtnText;
    }
    if (cfg.imageUrl && document.getElementById('cfg-custom-url')) {
      document.getElementById('cfg-custom-url').value = cfg.imageUrl;
    }

    updateInspectorPreview();
  }

  function setPublishStatus(isPub) {
    const sel = document.getElementById('insp-publish-select');
    if (sel) sel.value = isPub ? 'true' : 'false';

    const btnDraft = document.getElementById('btn-status-draft');
    const btnPub = document.getElementById('btn-status-publish');
    if (btnDraft && btnPub) {
      if (isPub) {
        btnDraft.classList.remove('active');
        btnPub.classList.add('active');
      } else {
        btnDraft.classList.add('active');
        btnPub.classList.remove('active');
      }
    }

    // Sync Settings Panel Toggle Buttons
    const cardDraft = document.getElementById('btn-pub-toggle-draft');
    const cardPub = document.getElementById('btn-pub-toggle-pub');
    if (cardDraft && cardPub) {
      cardDraft.classList.toggle('active', !isPub);
      cardPub.classList.toggle('active', isPub);
    }

    const doc = getActiveDoc();
    if (doc) doc.isPublished = isPub;
    if (window.triggerAutoSave) triggerAutoSave();
  }

  // ── 6. Live Welcome Preview Thumbnail Renderer ─────────────────────────────
  function updateInspectorPreview() {
    const slot = document.getElementById('inspector-preview-thumbnail-slot');
    if (!slot) return;

    const typeLabels = {
      badge_glow: 'thumbnail - model klinis',
      mockup_card: 'thumbnail - biomarker box',
      neon_code: 'thumbnail - deteksi mci',
      collab_widget: 'thumbnail - decision support',
      vision_glow: 'thumbnail - kohort data',
      custom_image: 'thumbnail - custom banner'
    };

    const typeText = document.getElementById('showcase-card-type-text');
    if (typeText) {
      typeText.textContent = typeLabels[_currentThumbType] || 'thumbnail - model klinis';
    }

    const cfg = {};
    if (_currentThumbType === 'badge_glow' || _currentThumbType === 'neon_code' || _currentThumbType === 'vision_glow') {
      cfg.badgeIcon = document.getElementById('cfg-badge-icon')?.value || '✦';
      cfg.badgeText = document.getElementById('cfg-badge-text')?.value || 'Model Klinis';
    } else if (_currentThumbType === 'mockup_card') {
      cfg.mockupTitle = document.getElementById('cfg-mockup-title')?.value || '32 Profil Biomarker Klinis';
      cfg.mockupDesc = document.getElementById('cfg-mockup-desc')?.value || 'Evaluasi korelasi skor MMSE, ADL...';
      cfg.mockupBtnText = document.getElementById('cfg-mockup-btn')?.value || 'Eksplorasi';
      cfg.showCursor = true;
    } else if (_currentThumbType === 'collab_widget') {
      cfg.widgetHeaderLeft = '⑂ kolaborasi-medis';
      cfg.widgetHeaderRight = '+ Neura Clinical ⌄';
      cfg.widgetBodyText = document.getElementById('cfg-collab-body')?.value || 'Clinical Decision Support';
    } else if (_currentThumbType === 'custom_image') {
      cfg.imageUrl = document.getElementById('cfg-custom-url')?.value || '';
    }

    slot.innerHTML = renderThumbnailHTML(_currentThumbType, cfg);
  }

  // ── 7. Toolbar & Canvas Formatting (Modular Power Capsule) ────────────────
  function formatDoc(cmd, val) {
    document.execCommand(cmd, false, val || null);
    const richBody = document.getElementById('doc-rich-body-' + _activePageIndex)
      || document.querySelector('.doc-rich-body');
    if (richBody) richBody.focus();
    updateToolbarActiveStates();
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function formatBlockToggle(tag) {
    tag = (tag || 'p').toLowerCase();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      document.execCommand('formatBlock', false, `<${tag}>`);
      return;
    }
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    const currentBlock = node ? node.closest(tag) : null;
    if (currentBlock && tag !== 'p') {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${tag}>`);
    }
    const richBody = document.getElementById('doc-rich-body-' + _activePageIndex)
      || document.querySelector('.doc-rich-body');
    if (richBody) richBody.focus();
    updateToolbarActiveStates();
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function toggleInlineCode() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    let parent = range.commonAncestorContainer;
    if (parent && parent.nodeType === 3) parent = parent.parentNode;
    const codeEl = parent ? parent.closest('code') : null;
    if (codeEl) {
      const parentNode = codeEl.parentNode;
      while (codeEl.firstChild) {
        parentNode.insertBefore(codeEl.firstChild, codeEl);
      }
      parentNode.removeChild(codeEl);
    } else {
      const selectedText = range.toString();
      if (selectedText) {
        const code = document.createElement('code');
        code.className = 'canvas-inline-code';
        code.textContent = selectedText;
        range.deleteContents();
        range.insertNode(code);
      } else {
        document.execCommand('fontName', false, 'monospace');
      }
    }
    const richBody = document.getElementById('doc-rich-body-' + _activePageIndex)
      || document.querySelector('.doc-rich-body');
    if (richBody) richBody.focus();
    updateToolbarActiveStates();
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function clearTextFormatting() {
    document.execCommand('removeFormat', false, null);
    document.execCommand('formatBlock', false, '<p>');
    const richBody = document.getElementById('doc-rich-body-' + _activePageIndex)
      || document.querySelector('.doc-rich-body');
    if (richBody) richBody.focus();
    updateToolbarActiveStates();
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function updateToolbarActiveStates() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Standard boolean formatting states
    const cmds = {
      'btn-fmt-bold': 'bold',
      'btn-fmt-italic': 'italic',
      'btn-fmt-underline': 'underline',
      'btn-fmt-strike': 'strikeThrough',
      'btn-fmt-bullet': 'insertUnorderedList',
      'btn-fmt-number': 'insertOrderedList'
    };

    for (const [btnId, cmd] of Object.entries(cmds)) {
      const btn = document.getElementById(btnId);
      if (btn) {
        try {
          const isActive = document.queryCommandState(cmd);
          btn.classList.toggle('active', !!isActive);
        } catch (e) {}
      }
    }

    // Block tags hierarchy (H1, H2, H3, P, Blockquote, Code)
    let node = sel.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;

    const btnH1 = document.getElementById('btn-fmt-h1');
    const btnH2 = document.getElementById('btn-fmt-h2');
    const btnH3 = document.getElementById('btn-fmt-h3');
    const btnP = document.getElementById('btn-fmt-p');
    const btnQuote = document.getElementById('btn-fmt-quote');
    const btnCode = document.getElementById('btn-fmt-code');

    const inCanvas = node ? !!node.closest('.doc-rich-body') : false;
    const h1El = inCanvas && node ? node.closest('h1') : null;
    const h2El = inCanvas && node ? node.closest('h2') : null;
    const h3El = inCanvas && node ? node.closest('h3') : null;
    const quoteEl = inCanvas && node ? node.closest('blockquote') : null;
    const codeEl = inCanvas && node ? node.closest('code, pre') : null;
    const isP = inCanvas && !h1El && !h2El && !h3El && !quoteEl && !codeEl;

    if (btnH1) btnH1.classList.toggle('active', !!h1El);
    if (btnH2) btnH2.classList.toggle('active', !!h2El);
    if (btnH3) btnH3.classList.toggle('active', !!h3El);
    if (btnP) btnP.classList.toggle('active', !!isP);
    if (btnQuote) btnQuote.classList.toggle('active', !!quoteEl);
    if (btnCode) btnCode.classList.toggle('active', !!codeEl);
  }

  function handleAiPolish(mode) {
    const richBody = document.getElementById('doc-rich-body-' + _activePageIndex)
      || document.querySelector('.doc-rich-body');
    if (!richBody) return;

    formatDoc('hiliteColor', '#fef08a');
    setTimeout(() => formatDoc('hiliteColor', 'transparent'), 800);
    alert('✦ Neura AI: Tata bahasa medis dan struktur kalimat klinis telah disempurnakan!');
  }


  // ── Color Palette Studio Controls ─────────────────────────────────────────
  let _currentColorMode = 'text';

  function toggleColorControls() {
    const controls = document.getElementById('color-active-controls');
    if (!controls) return;
    const isHidden = controls.style.display === 'none' || window.getComputedStyle(controls).display === 'none';
    controls.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      // Ensure wheel handle is positioned accurately on opening
      const currentHex = document.getElementById('custom-color-hex')?.value || 'D97757';
      requestAnimationFrame(() => {
        if (typeof updateWheelHandleFromHex === 'function') {
          updateWheelHandleFromHex('#' + currentHex);
        }
      });
    }
  }

  function switchColorMode(mode) {
    _currentColorMode = mode || 'text';
    const btnText = document.getElementById('btn-colormode-text');
    const btnHl = document.getElementById('btn-colormode-highlight');
    const btnPaper = document.getElementById('btn-colormode-paper');

    const secText = document.getElementById('section-color-text');
    const secHl = document.getElementById('section-color-highlight');
    const secPaper = document.getElementById('section-color-paper');

    if (btnText) btnText.classList.toggle('active', mode === 'text');
    if (btnHl) btnHl.classList.toggle('active', mode === 'highlight');
    if (btnPaper) btnPaper.classList.toggle('active', mode === 'paper');

    if (secText) secText.style.display = (mode === 'text') ? 'flex' : 'none';
    if (secHl) secHl.style.display = (mode === 'highlight') ? 'flex' : 'none';
    if (secPaper) secPaper.style.display = (mode === 'paper') ? 'flex' : 'none';
  }

  function applyTextColor(hex) {
    formatDoc('foreColor', hex);
    updateCustomColorInputs(hex);
    document.querySelectorAll('#section-color-text .color-swatch-circle').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('style')?.includes(hex));
    });
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function applyCustomTextColor(hex) {
    if (!hex) return;
    if (!hex.startsWith('#')) hex = '#' + hex;
    formatDoc('foreColor', hex);
    updateCustomColorInputs(hex);
    document.querySelectorAll('#section-color-text .color-swatch-circle').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('style')?.includes(hex));
    });
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function onHexColorInput(val) {
    val = (val || '').trim();
    if (val.startsWith('#')) {
      val = val.substring(1);
      const hexInput = document.getElementById('custom-color-hex');
      if (hexInput) hexInput.value = val;
    }
    if (val.match(/^[0-9a-fA-F]{6}$/)) {
      updateCustomColorInputs('#' + val);
    }
  }

    function openColorPicker() {
    const picker = document.getElementById('native-color-picker');
    if (!picker) return;
    if (typeof picker.showPicker === 'function') {
      try {
        picker.showPicker();
        return;
      } catch (e) {}
    }
    picker.click();
  }

    // ── Interactive Chromatic Color Wheel Studio Logic ───────────────────────
  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, '0').toUpperCase();
    return '#' + toHex(r) + toHex(g) + toHex(b);
  }

  function hexToHsv(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const diff = max - min;
    let h = 0;
    if (diff === 0) h = 0;
    else if (max === r) h = ((60 * ((g - b) / diff)) + 360) % 360;
    else if (max === g) h = ((60 * ((b - r) / diff)) + 120) % 360;
    else if (max === b) h = ((60 * ((r - g) / diff)) + 240) % 360;
    const s = max === 0 ? 0 : diff / max;
    const v = max;
    return { h, s, v };
  }

  function updateWheelHandleFromHex(hex) {
    if (!hex) return;
    try {
      const hsv = hexToHsv(hex);
      const wheel = document.getElementById('interactive-color-wheel');
      const handle = document.getElementById('wheel-picker-handle');
      if (!wheel || !handle) return;
      const rect = wheel.getBoundingClientRect();
      const radius = (rect.width || 164) / 2;
      const dist = hsv.s * radius;
      const rad = ((hsv.h - 90) * Math.PI) / 180;
      const cx = radius;
      const cy = radius;
      const x = cx + dist * Math.cos(rad);
      const y = cy + dist * Math.sin(rad);
      const leftPct = (x / (radius * 2)) * 100;
      const topPct = (y / (radius * 2)) * 100;
      handle.style.left = leftPct.toFixed(1) + '%';
      handle.style.top = topPct.toFixed(1) + '%';
      handle.style.backgroundColor = hex.startsWith('#') ? hex : '#' + hex;
    } catch(e) {}
  }

  function setupInteractiveColorWheel() {
    const wheel = document.getElementById('interactive-color-wheel');
    const handle = document.getElementById('wheel-picker-handle');
    if (!wheel || !handle) return;

    let isDragging = false;

    function handleInteraction(clientX, clientY) {
      const rect = wheel.getBoundingClientRect();
      const radius = rect.width / 2;
      const cx = rect.left + radius;
      const cy = rect.top + radius;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, radius);

      // Angle in degrees from 12 o'clock (0 to 360)
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
      const sat = Math.max(0.05, clampedDist / radius);
      const hex = hsvToHex(angle, sat, 0.95);

      // Update handle
      const rad = ((angle - 90) * Math.PI) / 180;
      const hx = radius + clampedDist * Math.cos(rad);
      const hy = radius + clampedDist * Math.sin(rad);
      handle.style.left = ((hx / rect.width) * 100).toFixed(1) + '%';
      handle.style.top = ((hy / rect.height) * 100).toFixed(1) + '%';
      handle.style.backgroundColor = hex;

      // Update inputs & indicators
      updateCustomColorInputs(hex);
    }

    wheel.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleInteraction(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      handleInteraction(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) isDragging = false;
    });

    // Touch Support
    wheel.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        isDragging = true;
        handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length === 0) return;
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    });

    window.addEventListener('touchend', () => {
      if (isDragging) isDragging = false;
    });

    // Init handle position for default #D97757
    setTimeout(() => {
      updateWheelHandleFromHex('#D97757');
    }, 100);
  }

  function onNativePickerChange(hex) {
    if (!hex) return;
    updateCustomColorInputs(hex);
  }

  function updateCustomColorInputs(hex) {
    if (!hex) return;
    if (!hex.startsWith('#')) hex = '#' + hex;
    const cleanHex = hex.replace('#', '');
    const dot = document.getElementById('custom-color-dot');
    const picker = document.getElementById('native-color-picker');
    const hexInput = document.getElementById('custom-color-hex');
    if (dot) dot.style.backgroundColor = hex;
    if (picker) picker.value = hex;
    if (hexInput && hexInput !== document.activeElement) hexInput.value = cleanHex;

    // Pulse preview dot on color update
    const previewDot = document.getElementById('custom-color-dot');
    if (previewDot) {
      previewDot.style.transform = 'scale(1.15)';
      setTimeout(() => { previewDot.style.transform = 'scale(1)'; }, 150);
    }
    updateWheelHandleFromHex(hex);
  }

  function applyHighlightColor(hex) {
    formatDoc('hiliteColor', hex);
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function setPaperTint(tintName) {
    tintName = tintName || 'pure';
    document.querySelectorAll('.paper-tint-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === 'tint-' + tintName);
    });

    const tints = ['tint-pure', 'tint-ivory', 'tint-warm', 'tint-slate'];
    document.querySelectorAll('.clean-paper-sheet').forEach(sheet => {
      sheet.classList.remove(...tints);
      sheet.classList.add('tint-' + tintName);
    });

    const doc = getActiveDoc();
    if (doc) doc.paperTint = tintName;
    if (window.triggerAutoSave) triggerAutoSave();
  }

  // ── Document Settings Hub Controls ────────────────────────────────────────
  let _currentSettingsTab = 'layout';

  function toggleSettingsControls() {
    const controls = document.getElementById('settings-active-controls');
    if (!controls) return;
    const isHidden = controls.style.display === 'none' || window.getComputedStyle(controls).display === 'none';
    controls.style.display = isHidden ? 'flex' : 'none';
  }

  function switchSettingsTab(tab) {
    _currentSettingsTab = tab || 'layout';
    const btnL = document.getElementById('btn-st-layout');
    const btnT = document.getElementById('btn-st-thumbnail');
    const btnM = document.getElementById('btn-st-meta');

    const panL = document.getElementById('panel-settings-layout');
    const panT = document.getElementById('panel-settings-thumbnail');
    const panM = document.getElementById('panel-settings-meta');

    if (btnL) btnL.classList.toggle('active', tab === 'layout');
    if (btnT) btnT.classList.toggle('active', tab === 'thumbnail');
    if (btnM) btnM.classList.toggle('active', tab === 'meta');

    if (panL) panL.style.display = (tab === 'layout') ? 'flex' : 'none';
    if (panT) panT.style.display = (tab === 'thumbnail') ? 'flex' : 'none';
    if (panM) panM.style.display = (tab === 'meta') ? 'flex' : 'none';
  }

  function setPageMargin(preset) {
    preset = preset || 'normal';
    ['margin-normal', 'margin-compact', 'margin-wide'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('active', id === 'margin-' + preset);
    });

    const badge = document.getElementById('margin-val-badge');
    if (badge) {
      const labels = { normal: '72px', compact: '48px', wide: '96px' };
      badge.textContent = labels[preset] || '72px';
    }

    document.querySelectorAll('.clean-paper-sheet').forEach(sheet => {
      sheet.classList.remove('margin-compact', 'margin-wide');
      if (preset === 'compact') sheet.classList.add('margin-compact');
      if (preset === 'wide') sheet.classList.add('margin-wide');
    });

    const doc = getActiveDoc();
    if (doc) doc.pageMargin = preset;
    if (window.triggerAutoSave) triggerAutoSave();
  }

  function setDocumentWatermark(val) {
    val = val || 'none';
    document.querySelectorAll('.clean-paper-sheet').forEach(sheet => {
      sheet.setAttribute('data-watermark', val);
    });

    const select = document.getElementById('setting-watermark-select');
    if (select) select.value = val;

    const doc = getActiveDoc();
    if (doc) doc.watermark = val;
    if (window.triggerAutoSave) triggerAutoSave();
  }
  // ── 8. Drawers & Accordion Handling ────────────────────────────────────────
  let _currentHelpTab = 'shortcuts';

  function toggleHelpControls() {
    const controls = document.getElementById('help-active-controls');
    if (!controls) return;
    const isHidden = controls.style.display === 'none' || window.getComputedStyle(controls).display === 'none';
    controls.style.display = isHidden ? 'flex' : 'none';
  }

  function switchHelpTab(tab) {
    _currentHelpTab = tab || 'shortcuts';
    const btnS = document.getElementById('btn-ht-shortcuts');
    const btnG = document.getElementById('btn-ht-guide');
    const panS = document.getElementById('panel-help-shortcuts');
    const panG = document.getElementById('panel-help-guide');

    if (btnS) btnS.classList.toggle('active', tab === 'shortcuts');
    if (btnG) btnG.classList.toggle('active', tab === 'guide');

    if (panS) panS.style.display = (tab === 'shortcuts') ? 'flex' : 'none';
    if (panG) panG.style.display = (tab === 'guide') ? 'flex' : 'none';
  }

  function toggleDrawer(name) {
    if (name === 'help') {
      toggleHelpControls();
      return;
    }
    const drawer = document.getElementById('drawer-' + name);
    if (!drawer) return;
    const isShowing = drawer.style.display !== 'none';

    document.querySelectorAll('.widget-drawer-panel, .widget-drawer-content').forEach(d => {
      d.style.display = 'none';
    });

    if (!isShowing) {
      drawer.style.display = 'block';
    }
  }

  let _currentFontSize = 27;
  const _fontFamilyList = ['Poppins', 'Inter', 'Newsreader', 'JetBrains Mono', 'Cinzel'];
  let _fontFamilyIdx = 0;

  function toggleFontControls() {
    const controls = document.getElementById('font-active-controls');
    if (!controls) return;
    const isHidden = controls.style.display === 'none' || window.getComputedStyle(controls).display === 'none';
    if (isHidden) {
      controls.style.display = 'flex';
      controls.classList.add('open');
    } else {
      controls.style.display = 'none';
      controls.classList.remove('open');
      const fontMenu = document.getElementById('font-family-menu');
      const fontChevron = document.getElementById('font-dropdown-chevron');
      if (fontMenu) fontMenu.style.display = 'none';
      if (fontChevron) fontChevron.classList.remove('open');
    }
  }

  function toggleFontDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('font-family-menu');
    const chevron = document.getElementById('font-dropdown-chevron');
    if (!menu) return;

    const isHidden = menu.style.display === 'none';
    menu.style.display = isHidden ? 'flex' : 'none';
    if (chevron) {
      chevron.classList.toggle('open', isHidden);
    }
  }

  function selectSpecificFont(fontName) {
    const nameEl = document.getElementById('current-font-name');
    if (nameEl) nameEl.textContent = fontName;

    const title = document.getElementById('doc-title-input');

    // Update active class in dropdown items
    document.querySelectorAll('.font-menu-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-font') === fontName);
    });

    // Close dropdown
    const menu = document.getElementById('font-family-menu');
    const chevron = document.getElementById('font-dropdown-chevron');
    if (menu) menu.style.display = 'none';
    if (chevron) chevron.classList.remove('open');

    // Apply font
    let cssFont = `"${fontName}", sans-serif`;
    if (fontName === 'Newsreader' || fontName === 'Cinzel') {
      cssFont = `"${fontName}", serif`;
      setDocFontCardsActive('serif');
    } else if (fontName === 'JetBrains Mono') {
      cssFont = `"${fontName}", monospace`;
      setDocFontCardsActive('mono');
    } else {
      cssFont = `"${fontName}", sans-serif`;
      setDocFontCardsActive('sans');
    }

    if (title) title.style.fontFamily = cssFont;

    // Apply to all page bodies
    document.querySelectorAll('.doc-rich-body').forEach(el => {
      el.style.fontFamily = cssFont;
    });

    _fontFamilyIdx = _fontFamilyList.indexOf(fontName);
  }

  function setDocFontCardsActive(type) {
    const cardSerif = document.getElementById('type-card-serif');
    const cardSans = document.getElementById('type-card-sans');
    const cardMono = document.getElementById('type-card-mono');
    if (cardSerif) cardSerif.classList.toggle('active', type === 'serif');
    if (cardSans) cardSans.classList.toggle('active', type === 'sans');
    if (cardMono) cardMono.classList.toggle('active', type === 'mono');
  }

  function setDocFont(fontType) {
    if (fontType === 'serif') {
      selectSpecificFont('Newsreader');
    } else if (fontType === 'mono') {
      selectSpecificFont('JetBrains Mono');
    } else {
      selectSpecificFont('Poppins');
    }
  }

  function cycleFontFamily() {
    _fontFamilyIdx = (_fontFamilyIdx + 1) % _fontFamilyList.length;
    selectSpecificFont(_fontFamilyList[_fontFamilyIdx]);
  }

  function onFontSizeInputChange(val) {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 8 && parsed <= 96) {
      _currentFontSize = parsed;
      const title = document.getElementById('doc-title-input');
      if (title) title.style.fontSize = _currentFontSize + 'px';
    }
  }

  function adjustDocFontSize(delta) {
    _currentFontSize = Math.max(10, Math.min(72, _currentFontSize + delta));
    const inputEl = document.getElementById('font-size-input');
    if (inputEl) inputEl.value = _currentFontSize;

    const title = document.getElementById('doc-title-input');
    if (title) title.style.fontSize = _currentFontSize + 'px';
  }

  // ── Media Insertion System (Image, GIF, Video, Embed, Link) ──────────────
  let _currentModalMediaType = 'image'; // 'image' | 'video' | 'link'
  let _currentModalTab = 'upload';      // 'upload' | 'url'
  let _selectedModalFile = null;
  let _modalPreviewDataUrl = null;

  function openMediaModal(type) {
    _currentModalMediaType = type || 'image';
    _selectedModalFile = null;
    _modalPreviewDataUrl = null;

    const modal = document.getElementById('riset-media-modal');
    if (!modal) return;

    // Reset inputs
    const fileInp = document.getElementById('modal-hidden-file-input');
    if (fileInp) fileInp.value = '';
    const urlInp = document.getElementById('media-url-input');
    if (urlInp) urlInp.value = '';
    const capInp = document.getElementById('media-caption-input');
    if (capInp) capInp.value = '';

    const previewBox = document.getElementById('modal-media-preview-box');
    if (previewBox) {
      previewBox.innerHTML = '';
      previewBox.style.display = 'none';
    }

    const titleIcon = document.getElementById('modal-title-icon');
    const titleText = document.getElementById('modal-title-text');
    const tabsNav = document.getElementById('media-modal-tabs');
    const dropzoneSub = document.getElementById('dropzone-sub');
    const urlLabel = document.getElementById('media-url-label');
    const capLabel = document.getElementById('media-caption-label');

    if (_currentModalMediaType === 'image') {
      if (titleIcon) titleIcon.textContent = '🖼';
      if (titleText) titleText.textContent = 'Sisipkan Gambar atau GIF';
      if (tabsNav) tabsNav.style.display = 'flex';
      if (fileInp) fileInp.accept = 'image/*,.gif,.webp,.svg,.bmp';
      if (dropzoneSub) dropzoneSub.textContent = 'Mendukung PNG, JPG, GIF animasi, WebP, SVG';
      if (urlLabel) urlLabel.textContent = 'Alamat URL Gambar / GIF Web';
      if (urlInp) urlInp.placeholder = 'https://media.giphy.com/... atau https://domain.com/photo.png';
      if (capLabel) capLabel.textContent = 'Keterangan Gambar / GIF (Opsional)';
      if (capInp) capInp.placeholder = 'Contoh: Gambar 1. Distribusi korelasi biomarker klinis';
      switchMediaModalTab('upload');
    } else if (_currentModalMediaType === 'video') {
      if (titleIcon) titleIcon.textContent = '▶';
      if (titleText) titleText.textContent = 'Sisipkan Video';
      if (tabsNav) tabsNav.style.display = 'flex';
      if (fileInp) fileInp.accept = 'video/*,.mp4,.webm,.ogg,.mov';
      if (dropzoneSub) dropzoneSub.textContent = 'Mendukung video MP4, WebM, OGG, atau tautan YouTube';
      if (urlLabel) urlLabel.textContent = 'Alamat URL Video / Tautan YouTube';
      if (urlInp) urlInp.placeholder = 'https://youtube.com/watch?v=... atau https://domain.com/video.mp4';
      if (capLabel) capLabel.textContent = 'Keterangan Video (Opsional)';
      if (capInp) capInp.placeholder = 'Contoh: Video simulasi penilaian EEG pasien';
      switchMediaModalTab('upload');
    } else { // 'link'
      if (titleIcon) titleIcon.textContent = '🔗';
      if (titleText) titleText.textContent = 'Sisipkan Tautan / Bookmark Klinis';
      if (tabsNav) tabsNav.style.display = 'none'; // Only URL mode for links
      if (urlLabel) urlLabel.textContent = 'Alamat URL Tujuan';
      if (urlInp) urlInp.placeholder = 'https://kemenkes.go.id/... atau https://nih.gov/...';
      if (capLabel) capLabel.textContent = 'Judul Tautan / Sumber Referensi';
      if (capInp) capInp.placeholder = 'Contoh: Pedoman Klinis Deteksi MCI Kemenkes RI';
      switchMediaModalTab('url');
    }

    modal.classList.add('open');
  }

  function closeMediaModal() {
    const modal = document.getElementById('riset-media-modal');
    if (modal) modal.classList.remove('open');
    _selectedModalFile = null;
    _modalPreviewDataUrl = null;
  }

  function switchMediaModalTab(tab) {
    _currentModalTab = tab;
    const btnUpload = document.getElementById('modal-tab-upload');
    const btnUrl = document.getElementById('modal-tab-url');
    const panelUpload = document.getElementById('media-tab-panel-upload');
    const panelUrl = document.getElementById('media-tab-panel-url');

    if (btnUpload) btnUpload.classList.toggle('active', tab === 'upload');
    if (btnUrl) btnUrl.classList.toggle('active', tab === 'url');
    if (panelUpload) panelUpload.style.display = (tab === 'upload') ? 'block' : 'none';
    if (panelUrl) panelUrl.style.display = (tab === 'url') ? 'block' : 'none';
  }

  function handleModalFileSelected(files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    _selectedModalFile = file;

    const previewBox = document.getElementById('modal-media-preview-box');
    if (!previewBox) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      _modalPreviewDataUrl = e.target.result;
      previewBox.style.display = 'flex';
      if (file.type.startsWith('video/')) {
        previewBox.innerHTML = `<video controls src="${_modalPreviewDataUrl}" style="max-height:180px; max-width:100%;"></video>`;
      } else {
        previewBox.innerHTML = `<img src="${_modalPreviewDataUrl}" alt="Preview" style="max-height:180px; max-width:100%; object-fit:contain;" />`;
      }
    };
    reader.readAsDataURL(file);
  }

  function onMediaUrlInput(val) {
    val = (val || '').trim();
    const previewBox = document.getElementById('modal-media-preview-box');
    if (!previewBox) return;

    if (!val) {
      previewBox.innerHTML = '';
      previewBox.style.display = 'none';
      return;
    }

    previewBox.style.display = 'flex';
    // Check if YouTube
    const ytMatch = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      const ytId = ytMatch[1];
      previewBox.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}" style="width:100%; height:180px; border:none;" allowfullscreen></iframe>`;
    } else if (val.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      previewBox.innerHTML = `<video controls src="${val}" style="max-height:180px; max-width:100%;"></video>`;
    } else if (_currentModalMediaType === 'link') {
      previewBox.innerHTML = `<div style="padding:16px; color:#fff; font-size:12px; text-align:center;">🔗 Tautan akan disisipkan sebagai kartu bookmark klinis interaktif.</div>`;
    } else {
      previewBox.innerHTML = `<img src="${val}" alt="Preview" onerror="this.onerror=null; this.parentElement.style.display='none';" style="max-height:180px; max-width:100%; object-fit:contain;" />`;
    }
  }

  async function confirmInsertMedia() {
    const btn = document.getElementById('btn-insert-media-confirm');
    if (btn) btn.disabled = true;

    try {
      const caption = (document.getElementById('media-caption-input')?.value || '').trim();
      let mediaUrl = '';
      let mediaType = _currentModalMediaType;

      if (_currentModalMediaType === 'link') {
        const linkUrl = (document.getElementById('media-url-input')?.value || '').trim();
        if (!linkUrl) {
          alert('Mohon masukkan alamat URL tautan terlebih dahulu.');
          if (btn) btn.disabled = false;
          return;
        }
        insertMediaToActivePage({
          type: 'link',
          url: linkUrl,
          caption: caption || linkUrl
        });
        closeMediaModal();
        if (btn) btn.disabled = false;
        return;
      }

      // If uploading file
      if (_currentModalTab === 'upload') {
        if (!_selectedModalFile && !_modalPreviewDataUrl) {
          alert('Silakan pilih file media dari perangkat terlebih dahulu.');
          if (btn) btn.disabled = false;
          return;
        }

        // Try upload to backend API
        if (_selectedModalFile) {
          try {
            const formData = new FormData();
            formData.append('file', _selectedModalFile);
            const res = await fetch('/api/admin/research/upload-media', {
              method: 'POST',
              body: formData
            });
            if (res.ok) {
              const json = await res.json();
              if (json.status === 'success' && json.url) {
                mediaUrl = json.url;
                if (json.mediaType) mediaType = json.mediaType;
              }
            }
          } catch (uploadErr) {
            console.warn('[Riset Studio] Gagal upload ke server, fallback ke Base64 data...', uploadErr);
          }
        }

        // Fallback to data URL if offline
        if (!mediaUrl && _modalPreviewDataUrl) {
          mediaUrl = _modalPreviewDataUrl;
        }
      } else {
        // Tab URL
        mediaUrl = (document.getElementById('media-url-input')?.value || '').trim();
        if (!mediaUrl) {
          alert('Mohon masukkan URL media terlebih dahulu.');
          if (btn) btn.disabled = false;
          return;
        }
      }

      if (!mediaUrl) {
        alert('Gagal memproses media. Silakan coba kembali.');
        if (btn) btn.disabled = false;
        return;
      }

      insertMediaToActivePage({
        type: mediaType,
        url: mediaUrl,
        caption: caption
      });

      closeMediaModal();
      showToast('✓ Media berhasil disisipkan ke halaman!');
    } catch (e) {
      console.error('Error inserting media:', e);
      alert('Terjadi kesalahan saat menyisipkan media: ' + e.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function insertMediaToActivePage(opts) {
    let body = document.getElementById(`doc-rich-body-${_activePageIndex}`);
    if (!body) body = document.getElementById('doc-rich-body-0') || document.querySelector('.doc-rich-body');
    if (!body) return;

    const type = opts.type || 'image';
    const url = opts.url || '';
    const caption = opts.caption || '';
    let html = '';

    if (type === 'image') {
      const figCapHtml = caption
        ? `<figcaption contenteditable="true">${esc(caption)}</figcaption>`
        : `<figcaption contenteditable="true" placeholder="Tuliskan keterangan gambar atau sumber data..."></figcaption>`;
      html = `
        <figure class="canvas-media-block canvas-media-image" contenteditable="false">
          <div class="media-container">
            <img src="${url}" alt="${esc(caption || 'Media riset')}" loading="lazy" />
            <button type="button" class="media-delete-btn" onclick="this.closest('figure').remove(); if(window.onPageContentChange) onPageContentChange(${_activePageIndex});" title="Hapus Media">×</button>
          </div>
          ${figCapHtml}
        </figure><p></p>`;
    } else if (type === 'video') {
      const figCapHtml = caption
        ? `<figcaption contenteditable="true">${esc(caption)}</figcaption>`
        : `<figcaption contenteditable="true" placeholder="Tuliskan keterangan video..."></figcaption>`;
      
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      let playerHtml = '';
      if (ytMatch) {
        playerHtml = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe>`;
      } else {
        playerHtml = `<video controls playsinline src="${url}"></video>`;
      }

      html = `
        <figure class="canvas-media-block canvas-media-video" contenteditable="false">
          <div class="media-container">
            ${playerHtml}
            <button type="button" class="media-delete-btn" onclick="this.closest('figure').remove(); if(window.onPageContentChange) onPageContentChange(${_activePageIndex});" title="Hapus Video">×</button>
          </div>
          ${figCapHtml}
        </figure><p></p>`;
    } else { // link
      html = `
        <div class="canvas-media-link" contenteditable="false">
          <a href="${esc(url)}" target="_blank" rel="noopener noreferrer" class="canvas-link-card">
            <span class="link-icon">🔗</span>
            <div class="link-info">
              <span class="link-title">${esc(caption || url)}</span>
              <span class="link-url">${esc(url)}</span>
            </div>
          </a>
          <button type="button" class="link-delete-btn" onclick="this.closest('.canvas-media-link').remove(); if(window.onPageContentChange) onPageContentChange(${_activePageIndex});" title="Hapus Tautan">×</button>
        </div><p></p>`;
    }

    body.focus();
    // Insert into contenteditable
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && body.contains(selection.anchorNode)) {
      document.execCommand('insertHTML', false, html);
    } else {
      // Append if no selection inside active body
      body.insertAdjacentHTML('beforeend', html);
    }

    onPageContentChange(_activePageIndex);
  }

  // Backward compatibility wrapper
  function insertMediaBlock(type) {
    openMediaModal(type);
  }

  // ── Drag & Drop & Paste Media Handler on Canvas ───────────────────────────
  function setupCanvasDragDrop() {
    const canvasWrap = document.getElementById('col-center-canvas');
    if (!canvasWrap) return;

    ['dragenter', 'dragover'].forEach(evName => {
      canvasWrap.addEventListener(evName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        const activeSheet = document.getElementById(`paper-page-${_activePageIndex}`) || document.querySelector('.clean-paper-sheet');
        if (activeSheet) activeSheet.classList.add('drag-active');
      });
    });

    ['dragleave', 'drop'].forEach(evName => {
      canvasWrap.addEventListener(evName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.querySelectorAll('.clean-paper-sheet').forEach(sheet => sheet.classList.remove('drag-active'));
      });
    });

    canvasWrap.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImg = file.type.startsWith('image/');
        const isVid = file.type.startsWith('video/');

        if (!isImg && !isVid) continue;

        // Upload or read as data URL
        let mediaUrl = '';
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/admin/research/upload-media', { method: 'POST', body: formData });
          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.url) mediaUrl = json.url;
          }
        } catch (err) {
          console.warn('[DragDrop] Upload error, reading as dataURL:', err);
        }

        if (!mediaUrl) {
          mediaUrl = await new Promise(resolve => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(file);
          });
        }

        if (mediaUrl) {
          insertMediaToActivePage({
            type: isVid ? 'video' : 'image',
            url: mediaUrl,
            caption: file.name ? file.name.replace(/\.[^/.]+$/, '') : ''
          });
          showToast(`✓ Berhasil menyisipkan ${file.name}`);
        }
      }
    });

    // Clipboard Paste Listener (Ctrl + V image from clipboard)
    window.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const activeEl = document.activeElement;
      const isInsideCanvas = activeEl && (activeEl.classList?.contains('doc-rich-body') || activeEl.closest?.('.clean-paper-sheet'));
      if (!isInsideCanvas) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          let mediaUrl = '';
          try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/research/upload-media', { method: 'POST', body: formData });
            if (res.ok) {
              const json = await res.json();
              if (json.status === 'success' && json.url) mediaUrl = json.url;
            }
          } catch (err) {}

          if (!mediaUrl) {
            mediaUrl = await new Promise(resolve => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.readAsDataURL(file);
            });
          }

          if (mediaUrl) {
            insertMediaToActivePage({
              type: 'image',
              url: mediaUrl,
              caption: 'Gambar tangkapan layar'
            });
            showToast('✓ Gambar dari clipboard berhasil disisipkan!');
          }
          break;
        }
      }
    });
  }

  function switchLeftTab(tab) {
    const tabPages = document.getElementById('tab-layer-pages');
    const tabRiset = document.getElementById('tab-daftar-riset');
    const tabData = document.getElementById('tab-data-rel');

    const panePages = document.getElementById('pane-layer-pages');
    const paneRiset = document.getElementById('pane-daftar-riset');
    const paneData = document.getElementById('pane-data-rel');

    if (tabPages) tabPages.classList.toggle('active', tab === 'pages');
    if (tabRiset) tabRiset.classList.toggle('active', tab === 'riset');
    if (tabData) tabData.classList.toggle('active', tab === 'data');

    if (panePages) panePages.style.display = tab === 'pages' ? 'flex' : 'none';
    if (paneRiset) paneRiset.style.display = tab === 'riset' ? 'flex' : 'none';
    if (paneData) paneData.style.display = tab === 'data' ? 'flex' : 'none';

    if (tab === 'riset') {
      renderSidebarDocs();
    }
  }

  // ── Elegant Toast Notification ───────────────────────────────────────────
  function showToast(message, type) {
    type = type || 'success';
    let toast = document.getElementById('riset-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'riset-toast';
      document.body.appendChild(toast);
    }
    toast.className = 'riset-toast riset-toast-' + type;
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, 3000);
  }

  // ── 9. Save & Publish Document ─────────────────────────────────────────────
  async function saveDocument(isPublishedOverride) {
    const titleEl = document.getElementById('doc-title-input');
    const title = titleEl ? titleEl.value.trim() : (getActiveDoc()?.title || '').trim();
    if (!title) {
      alert('Mohon isi judul riset terlebih dahulu.');
      if (titleEl) titleEl.focus();
      return;
    }

    const dateText = document.getElementById('insp-date')?.value?.trim() || 'Okt 2026';
    const catsRaw = document.getElementById('insp-cats')?.value?.trim() || 'Model AI, Validasi';
    const categories = catsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const readLinkText = document.getElementById('insp-link-text')?.value?.trim() || 'Baca riset';
    const linkUrl = document.getElementById('insp-link-url')?.value?.trim() || '/app';
    const doc = getActiveDoc();
    if (doc) {
      doc.pages.forEach((_, i) => {
        const el = document.getElementById(`doc-rich-body-${i}`);
        if (el) doc.pages[i] = el.innerHTML;
      });
    }
    const currentPages = (doc && doc.pages && doc.pages.length) ? doc.pages : [document.getElementById('doc-rich-body-0')?.innerHTML || ''];
    const bodyHtml = currentPages.join('<hr class="page-break" style="margin:40px 0; border:none; border-top:1px dashed #ccc;">');

    let isPublished = true;
    if (isPublishedOverride !== undefined) {
      isPublished = isPublishedOverride;
    } else {
      const sel = document.getElementById('insp-publish-select');
      isPublished = sel ? sel.value === 'true' : true;
    }

    const cfg = {};
    if (_currentThumbType === 'badge_glow' || _currentThumbType === 'neon_code' || _currentThumbType === 'vision_glow') {
      cfg.badgeIcon = '✦';
      cfg.badgeText = document.getElementById('cfg-badge-text')?.value?.trim() || 'Model Klinis';
    } else if (_currentThumbType === 'mockup_card') {
      cfg.mockupTitle = document.getElementById('cfg-mockup-title')?.value?.trim() || '32 Profil Biomarker Klinis';
      cfg.mockupDesc = document.getElementById('cfg-mockup-desc')?.value?.trim() || 'Evaluasi korelasi skor MMSE...';
      cfg.mockupBtnText = document.getElementById('cfg-mockup-btn')?.value?.trim() || 'Eksplorasi';
      cfg.showCursor = true;
    } else if (_currentThumbType === 'collab_widget') {
      cfg.widgetHeaderLeft = '⑂ kolaborasi-medis';
      cfg.widgetHeaderRight = '+ Neura Clinical ⌄';
      cfg.widgetBodyText = document.getElementById('cfg-collab-body')?.value?.trim() || 'Clinical Decision Support';
    } else if (_currentThumbType === 'custom_image') {
      cfg.imageUrl = document.getElementById('cfg-custom-url')?.value?.trim() || '';
    }

    const payload = {
      title,
      summaryText: bodyHtml.replace(/<[^>]*>/g, ' ').substring(0, 160).trim() + '...',
      dateText,
      categories,
      readLinkText,
      linkUrl,
      thumbnailType: _currentThumbType,
      thumbnailConfig: cfg,
      bodyHtml,
      pages: currentPages,
      isPublished
    };

    // Determine POST vs PUT:
    // New docs (created locally, not yet in DB) start with 'res-' + 13-digit timestamp
    // DB docs have IDs like 'res-001', 'res-002', or already-saved res-{13digits}
    const isNewDoc = !doc || doc._savedToDb !== true;
    let url = '/api/admin/research';
    let method = 'POST';
    if (_activeDocId && !isNewDoc) {
      url += '/' + _activeDocId;
      method = 'PUT';
    }

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const json = await res.json();
        const savedDoc = json.data;

        // Update active doc ID with server-generated ID (for new docs)
        if (method === 'POST' && savedDoc && savedDoc.id) {
          const oldId = _activeDocId;
          _activeDocId = savedDoc.id;
          // Update the doc in _allDocs
          const docIdx = _allDocs.findIndex(d => d.id === oldId);
          if (docIdx !== -1) {
            _allDocs[docIdx] = { ..._allDocs[docIdx], ...savedDoc, _savedToDb: true };
          }
        } else if (method === 'PUT') {
          // Mark as saved to DB
          const docIdx = _allDocs.findIndex(d => d.id === _activeDocId);
          if (docIdx !== -1) {
            _allDocs[docIdx] = { ..._allDocs[docIdx], ...payload, _savedToDb: true };
          }
        }

        // Update localStorage cache
        try {
          localStorage.setItem('neura_research_updates', JSON.stringify(_allDocs));
        } catch (e) {}

        renderSidebarDocs();
        saveActiveDraft();
        updateAutoSyncUI('saved');
        showToast(isPublished ? '✓ Riset dipublikasikan ke Welcome!' : '✓ Draf berhasil disimpan.');
        return;
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[Riset Studio] API error:', errJson.message || res.status);
        showToast('Gagal menyimpan: ' + (errJson.message || 'Server error'), 'error');
      }
    } catch (e) {
      console.warn('[Riset Studio] API gagal, menyimpan di memori lokal...', e);
    }

    // Local fallback (offline mode)
    const docFb = getActiveDoc();
    if (docFb) {
      Object.assign(docFb, payload);
    } else {
      payload.id = 'res-' + Date.now();
      _allDocs.unshift(payload);
      _activeDocId = payload.id;
    }

    try {
      localStorage.setItem('neura_research_updates', JSON.stringify(_allDocs));
    } catch (e) {}

    renderSidebarDocs();
    showToast(isPublished ? '✓ Disimpan (Mode Offline)' : '✓ Draf disimpan (Offline)', 'warn');
  }

  // ── Expose Global Functions ─────────────────────────────────────────────────
  window.createNewDoc = createNewDoc;
  window.selectDoc = selectDoc;
  window.setThumbnailType = setThumbnailType;
  window.setPublishStatus = setPublishStatus;
  window.updateInspectorPreview = updateInspectorPreview;
  window.formatDoc = formatDoc;
  window.formatBlockToggle = formatBlockToggle;
  window.toggleInlineCode = toggleInlineCode;
  window.clearTextFormatting = clearTextFormatting;
  window.updateToolbarActiveStates = updateToolbarActiveStates;
  window.handleAiPolish = handleAiPolish;
  window.saveDocument = saveDocument;
  window.toggleDrawer = toggleDrawer;
  window.setDocFont = setDocFont;
  window.toggleFontControls = toggleFontControls;
  window.cycleFontFamily = cycleFontFamily;
  window.adjustDocFontSize = adjustDocFontSize;
  window.toggleFontDropdown = toggleFontDropdown;
  window.selectSpecificFont = selectSpecificFont;
  window.onFontSizeInputChange = onFontSizeInputChange;
  window.insertMediaBlock = insertMediaBlock;
  window.openMediaModal = openMediaModal;
  window.closeMediaModal = closeMediaModal;
  window.switchMediaModalTab = switchMediaModalTab;
  window.handleModalFileSelected = handleModalFileSelected;
  window.onMediaUrlInput = onMediaUrlInput;
  window.confirmInsertMedia = confirmInsertMedia;
  window.insertMediaToActivePage = insertMediaToActivePage;
  window.setupCanvasDragDrop = setupCanvasDragDrop;
  window.triggerAutoSave = triggerAutoSave;
  window.saveActiveDraft = saveActiveDraft;
  window.restoreActiveDraft = restoreActiveDraft;
  window.toggleColorControls = toggleColorControls;
  window.switchColorMode = switchColorMode;
  window.applyTextColor = applyTextColor;
  window.openColorPicker = openColorPicker;
  window.setupInteractiveColorWheel = setupInteractiveColorWheel;
  window.updateWheelHandleFromHex = updateWheelHandleFromHex;
  window.applyCustomTextColor = applyCustomTextColor;
  window.onHexColorInput = onHexColorInput;
  window.onNativePickerChange = onNativePickerChange;
  window.applyHighlightColor = applyHighlightColor;
  window.setPaperTint = setPaperTint;
  window.toggleSettingsControls = toggleSettingsControls;
  window.switchSettingsTab = switchSettingsTab;
  window.setPageMargin = setPageMargin;
  window.setDocumentWatermark = setDocumentWatermark;
  window.toggleHelpControls = toggleHelpControls;
  window.switchHelpTab = switchHelpTab;
  window.switchLeftTab = switchLeftTab;
  window.selectDocPage = selectDocPage;
  window.addNewPage = addNewPage;
  window.removePage = removePage;
  window.renderPageCards = renderPageCards;
  window.renderCanvasPages = renderCanvasPages;
  window.onPageContentChange = onPageContentChange;
  window.scrollToPage = scrollToPage;
  window.renderSidebarDocs = renderSidebarDocs;
  window.setupPageScrollObserver = setupPageScrollObserver;

  // Initialize on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    // Synchronous save on beforeunload so no keystroke is lost on instant F5
    window.addEventListener('beforeunload', () => {
      saveActiveDraft();
    });

    loadResearchDocs();
    setupCanvasDragDrop();
    setupInteractiveColorWheel();

    // Close font family dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const wrap = document.getElementById('font-family-dropdown-wrap');
      const menu = document.getElementById('font-family-menu');
      const chevron = document.getElementById('font-dropdown-chevron');
      if (wrap && menu && !wrap.contains(e.target)) {
        menu.style.display = 'none';
        if (chevron) chevron.classList.remove('open');
      }
    });

    // Live sync title
    const titleInput = document.getElementById('doc-title-input');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        const val = titleInput.value;
        const displayTitle = val.trim() ? val : 'Utility';
        const crumbTitle = document.getElementById('breadcrumb-doc-title');
        if (crumbTitle) crumbTitle.textContent = displayTitle;

        // Live sync with active doc
        const doc = getActiveDoc();
        if (doc) {
          doc.title = val;
          renderSidebarDocs();
        }
        updateInspectorPreview();
      });
    }

    // Toggle theme restore
    try {
      const savedTheme = localStorage.getItem('neura_theme_v1');
      if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (e) { }

    // ── Real-Time Selection Spy for Modular Power Capsule Active States ────
    document.addEventListener('selectionchange', () => {
      requestAnimationFrame(updateToolbarActiveStates);
    });
    document.addEventListener('keyup', () => {
      requestAnimationFrame(updateToolbarActiveStates);
    });
    document.addEventListener('mouseup', () => {
      requestAnimationFrame(updateToolbarActiveStates);
    });

    // ── Block Chrome Extension Injected Images ─────────────────────────────
    (function blockExtensionImages() {
      function removeExtImgs(root) {
        (root || document).querySelectorAll('img[src^="chrome-extension://"]').forEach(img => img.remove());
      }
      removeExtImgs(document);
      const obs = new MutationObserver(mutations => {
        mutations.forEach(m => m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'IMG' && node.src && node.src.startsWith('chrome-extension://')) {
            node.remove();
          } else {
            removeExtImgs(node);
          }
        }));
      });
      obs.observe(document.body, { childList: true, subtree: true });
    })();
  });

})();
