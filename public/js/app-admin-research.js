/**
 * public/js/app-admin-research.js
 * =============================================================================
 * Neura Clinical AI — Research Update Log & Publication Admin Controller
 * Manages research update logs, thumbnail customization (Style 1-6),
 * real-time live preview, and dual synchronization (REST API + Firestore).
 * =============================================================================
 */

(function () {
  'use strict';

  let _researchLogsCache = [];
  let _activeView = 'table';

  // ── Helper: Render Thumbnail HTML according to Type & Config ───────────────
  function renderThumbnailHTML(type, cfg) {
    cfg = cfg || {};
    switch (type) {
      case 'mockup_card': {
        const title = escapeHtml(cfg.mockupTitle || '32 Profil Biomarker Klinis');
        const desc = escapeHtml(cfg.mockupDesc || 'Evaluasi korelasi skor MMSE, ADL, dan riwayat memori pasien');
        const btnText = escapeHtml(cfg.mockupBtnText || 'Eksplorasi');
        const showCursor = cfg.showCursor !== false;
        return `
          <div class="blog-card-media blog-media-plugin" style="border-radius:14px; overflow:hidden; position:relative;">
            <div class="plugin-mockup-card">
              <div class="plugin-card-title">${title}</div>
              <div class="plugin-card-desc">${desc}</div>
              <div class="plugin-card-btn-row">
                <span class="plugin-customize-btn">${btnText}</span>
                ${showCursor ? `
                  <svg class="cursor-pointer-icon" width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" stroke-width="1.6">
                    <path d="M3 3l7 18 3-7 7-3L3 3z" />
                  </svg>` : ''}
              </div>
            </div>
          </div>`;
      }

      case 'neon_code': {
        const icon = escapeHtml(cfg.badgeIcon || '✦');
        const badge = escapeHtml(cfg.badgeText || 'Deteksi MCI');
        const brackets = escapeHtml(cfg.codeBrackets || '< >');
        return `
          <div class="blog-card-media blog-media-flash" style="border-radius:14px; overflow:hidden; position:relative;">
            <div class="neon-glow-brackets">${brackets}</div>
            <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
          </div>`;
      }

      case 'collab_widget': {
        const left = escapeHtml(cfg.widgetHeaderLeft || '⑂ kolaborasi-medis');
        const right = escapeHtml(cfg.widgetHeaderRight || '+ Neura Clinical ⌄');
        const body = escapeHtml(cfg.widgetBodyText || 'Clinical Decision Support');
        return `
          <div class="blog-card-media blog-media-dive" style="border-radius:14px; overflow:hidden; position:relative;">
            <div class="dive-mini-widget">
              <div class="dive-widget-header">
                <span>${left}</span>
                <span>${right}</span>
              </div>
              <div class="dive-widget-body">
                <span>${body}</span>
              </div>
            </div>
          </div>`;
      }

      case 'vision_glow': {
        const icon = escapeHtml(cfg.badgeIcon || '✦');
        const badge = escapeHtml(cfg.badgeText || 'Kohort Data');
        return `
          <div class="blog-card-media blog-media-vision" style="border-radius:14px; overflow:hidden; position:relative;">
            <div class="vision-radial-glow"></div>
            <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
          </div>`;
      }

      case 'custom_image': {
        const imgUrl = cfg.imageUrl || '/assets/neura_hero.png';
        return `
          <div class="blog-card-media" style="border-radius:14px; overflow:hidden; position:relative; background-image:url('${imgUrl}'); background-size:cover; background-position:center; min-height:165px;">
            <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 70%);"></div>
          </div>`;
      }

      case 'badge_glow':
      default: {
        const icon = escapeHtml(cfg.badgeIcon || '✦');
        const badge = escapeHtml(cfg.badgeText || 'Model Klinis');
        return `
          <div class="blog-card-media blog-media-argon" style="border-radius:14px; overflow:hidden; position:relative;">
            <div class="neon-glow-ribbon"></div>
            <span class="blog-media-badge"><span class="sparkle-google">${icon}</span> ${badge}</span>
          </div>`;
      }
    }
  }

  // ── 1. Switch View (Table vs Form) ──────────────────────────────────────────
  function switchResearchAdminView(view) {
    _activeView = view;
    const tablePanel = document.getElementById('research-view-table');
    const formPanel = document.getElementById('research-view-form');
    const tabBtnTable = document.getElementById('research-tab-btn-table');
    const tabBtnForm = document.getElementById('research-tab-btn-form');

    if (view === 'form') {
      if (tablePanel) tablePanel.style.display = 'none';
      if (formPanel) formPanel.style.display = 'block';
      if (tabBtnTable) tabBtnTable.classList.remove('active');
      if (tabBtnForm) tabBtnForm.classList.add('active');
      updateResearchLivePreview();
    } else {
      if (tablePanel) tablePanel.style.display = 'block';
      if (formPanel) formPanel.style.display = 'none';
      if (tabBtnTable) tabBtnTable.classList.add('active');
      if (tabBtnForm) tabBtnForm.classList.remove('active');
    }
  }

  // ── 2. Handle Thumbnail Type Selection Change ──────────────────────────────
  function handleThumbnailTypeChange() {
    const select = document.getElementById('research-input-thumb-type');
    if (!select) return;
    const val = select.value;

    const gBadge = document.getElementById('cfg-badge-glow');
    const gMockup = document.getElementById('cfg-mockup-card');
    const gCollab = document.getElementById('cfg-collab-widget');
    const gCustom = document.getElementById('cfg-custom-image');

    if (gBadge) gBadge.style.display = val === 'badge_glow' || val === 'neon_code' || val === 'vision_glow' ? 'block' : 'none';
    if (gMockup) gMockup.style.display = val === 'mockup_card' ? 'block' : 'none';
    if (gCollab) gCollab.style.display = val === 'collab_widget' ? 'block' : 'none';
    if (gCustom) gCustom.style.display = val === 'custom_image' ? 'block' : 'none';

    updateResearchLivePreview();
  }

  // ── 3. Real-Time Live Preview Renderer ─────────────────────────────────────
  function updateResearchLivePreview() {
    const previewBox = document.getElementById('research-live-preview-box');
    if (!previewBox) return;

    const title = document.getElementById('research-input-title')?.value || 'Judul Publikasi Riset Klinis';
    const dateText = document.getElementById('research-input-date')?.value || 'Okt 2026';
    const categoriesRaw = document.getElementById('research-input-categories')?.value || 'Model AI';
    const linkText = document.getElementById('research-input-link-text')?.value || 'Baca riset';
    const thumbType = document.getElementById('research-input-thumb-type')?.value || 'badge_glow';

    // Build categories spans
    const cats = categoriesRaw.split(',').map(c => c.trim()).filter(Boolean);
    const catSpans = cats.map(c => `<span>${escapeHtml(c)}</span>`).join('');

    // Thumbnail Config Object
    const cfg = {};
    if (thumbType === 'badge_glow' || thumbType === 'neon_code' || thumbType === 'vision_glow') {
      cfg.badgeIcon = document.getElementById('research-badge-icon')?.value || '✦';
      cfg.badgeText = document.getElementById('research-badge-text')?.value || 'Model Klinis';
    } else if (thumbType === 'mockup_card') {
      cfg.mockupTitle = document.getElementById('research-mockup-title')?.value || '32 Profil Biomarker Klinis';
      cfg.mockupDesc = document.getElementById('research-mockup-desc')?.value || 'Evaluasi korelasi skor MMSE, ADL, dan riwayat memori pasien';
      cfg.mockupBtnText = document.getElementById('research-mockup-btn')?.value || 'Eksplorasi';
      cfg.showCursor = document.getElementById('research-mockup-cursor')?.value === 'true';
    } else if (thumbType === 'collab_widget') {
      cfg.widgetHeaderLeft = document.getElementById('research-widget-left')?.value || '⑂ kolaborasi-medis';
      cfg.widgetHeaderRight = document.getElementById('research-widget-right')?.value || '+ Neura Clinical ⌄';
      cfg.widgetBodyText = document.getElementById('research-widget-body')?.value || 'Clinical Decision Support';
    } else if (thumbType === 'custom_image') {
      cfg.imageUrl = document.getElementById('research-image-url')?.value || '';
    }

    const thumbHtml = renderThumbnailHTML(thumbType, cfg);

    previewBox.innerHTML = `
      ${thumbHtml}
      <div class="blog-card-content" style="padding:14px 12px 10px 12px;">
        <h3 class="blog-card-title" style="font-size:14px; line-height:1.35; margin-bottom:8px;">${escapeHtml(title)}</h3>
        <div class="blog-card-meta" style="font-size:11px; margin-bottom:8px;">
          <span>${escapeHtml(dateText)}</span>
          ${catSpans}
        </div>
        <div class="blog-card-link" style="font-size:12px; color:var(--accent-terracotta);">
          <span>${escapeHtml(linkText)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    `;
  }

  // ── 4. Load Research Logs from API / Cache ──────────────────────────────────
  async function loadAdminResearchLogs() {
    try {
      const res = await fetch('/api/admin/research');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data)) {
          _researchLogsCache = json.data;
          try {
            localStorage.setItem('neura_research_updates', JSON.stringify(json.data));
          } catch (e) { }
          renderResearchTable(_researchLogsCache);
          return;
        }
      }
    } catch (err) {
      console.warn('[Research Admin] Failed to fetch from backend, trying localStorage cache...', err);
    }

    // Fallback cache
    try {
      const local = localStorage.getItem('neura_research_updates');
      if (local) {
        _researchLogsCache = JSON.parse(local);
        renderResearchTable(_researchLogsCache);
      }
    } catch (e) { }
  }

  // ── 5. Render Admin Table ───────────────────────────────────────────────────
  function renderResearchTable(items) {
    const tbody = document.getElementById('research-table-tbody');
    const emptyBox = document.getElementById('research-table-empty');
    const counterBadge = document.getElementById('research-total-counter');

    if (counterBadge) counterBadge.textContent = items.length;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
      if (emptyBox) emptyBox.style.display = 'block';
      return;
    }
    if (emptyBox) emptyBox.style.display = 'none';

    items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      const cats = Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || '-');
      const isPub = item.isPublished !== false;
      const thumbTypeLabel = {
        badge_glow: 'Style 1 (Glow Badge)',
        mockup_card: 'Style 2 (Mockup Card)',
        neon_code: 'Style 3 (Neon Code)',
        collab_widget: 'Style 4 (Mini Widget)',
        vision_glow: 'Style 5 (Vision Glow)',
        custom_image: 'Style 6 (Custom Image)'
      }[item.thumbnailType] || item.thumbnailType;

      tr.innerHTML = `
        <td style="color:var(--text-muted); font-weight:600;">${idx + 1}</td>
        <td>
          <div style="width:72px; height:44px; border-radius:8px; overflow:hidden; transform:scale(0.9); transform-origin:left center; pointer-events:none;">
            ${renderThumbnailHTML(item.thumbnailType, item.thumbnailConfig)}
          </div>
        </td>
        <td>
          <div style="font-weight:600; font-size:13px; color:var(--text-primary); max-width:280px; line-height:1.3;">${escapeHtml(item.title)}</div>
          ${item.summaryText ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(item.summaryText)}</div>` : ''}
        </td>
        <td>
          <span style="display:inline-block; font-size:11.5px; font-weight:600; color:var(--text-primary);">${escapeHtml(item.dateText || '-')}</span>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${escapeHtml(cats)}</div>
        </td>
        <td>
          <span class="ml-tag" style="font-size:10px; background:rgba(255,255,255,0.06);">${escapeHtml(thumbTypeLabel)}</span>
        </td>
        <td>
          <button type="button" class="nakes-status-pill ${isPub ? 'status-active' : 'status-inactive'}" onclick="toggleResearchPublish('${item.id}')" title="Klik untuk mengubah status publish" style="cursor:pointer; border:none;">
            <span class="status-indicator-dot"></span>
            <span>${isPub ? 'Published' : 'Draft'}</span>
          </button>
        </td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:6px;">
            <button class="nakes-row-action-btn" onclick="editResearchLog('${item.id}')" title="Edit Log Riset">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button class="nakes-row-action-btn nakes-row-action-btn--delete" onclick="deleteResearchLog('${item.id}')" title="Hapus Log Riset">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ── 6. Filter / Search Table ────────────────────────────────────────────────
  function handleResearchTableSearch() {
    const q = (document.getElementById('research-search-input')?.value || '').toLowerCase().trim();
    if (!q) {
      renderResearchTable(_researchLogsCache);
      return;
    }
    const filtered = _researchLogsCache.filter(item => {
      const titleMatch = (item.title || '').toLowerCase().includes(q);
      const catMatch = Array.isArray(item.categories) && item.categories.some(c => c.toLowerCase().includes(q));
      const typeMatch = (item.thumbnailType || '').toLowerCase().includes(q);
      return titleMatch || catMatch || typeMatch;
    });
    renderResearchTable(filtered);
  }

  // ── 7. Reset Form ───────────────────────────────────────────────────────────
  function resetResearchForm() {
    const f = document.getElementById('research-edit-form');
    if (f) f.reset();
    document.getElementById('research-input-id').value = '';
    document.getElementById('research-form-tab-title').textContent = 'Tambah Log Riset Baru';
    document.getElementById('research-btn-save-text').textContent = 'Simpan & Publikasikan';
    handleThumbnailTypeChange();
    updateResearchLivePreview();
  }

  // ── 8. Edit Research Log ────────────────────────────────────────────────────
  function editResearchLog(id) {
    const item = _researchLogsCache.find(it => it.id === id);
    if (!item) return;

    document.getElementById('research-input-id').value = item.id;
    document.getElementById('research-input-title').value = item.title || '';
    document.getElementById('research-input-date').value = item.dateText || 'Okt 2026';
    document.getElementById('research-input-categories').value = Array.isArray(item.categories) ? item.categories.join(', ') : (item.categories || '');
    document.getElementById('research-input-thumb-type').value = item.thumbnailType || 'badge_glow';
    document.getElementById('research-input-summary').value = item.summaryText || '';
    document.getElementById('research-input-link-text').value = item.readLinkText || 'Baca riset';
    document.getElementById('research-input-link-url').value = item.linkUrl || '/app';
    document.getElementById('research-input-published').value = item.isPublished !== false ? 'true' : 'false';

    const cfg = item.thumbnailConfig || {};
    if (item.thumbnailType === 'badge_glow' || item.thumbnailType === 'neon_code' || item.thumbnailType === 'vision_glow') {
      document.getElementById('research-badge-icon').value = cfg.badgeIcon || '✦';
      document.getElementById('research-badge-text').value = cfg.badgeText || 'Model Klinis';
    } else if (item.thumbnailType === 'mockup_card') {
      document.getElementById('research-mockup-title').value = cfg.mockupTitle || '32 Profil Biomarker Klinis';
      document.getElementById('research-mockup-desc').value = cfg.mockupDesc || 'Evaluasi korelasi skor MMSE, ADL...';
      document.getElementById('research-mockup-btn').value = cfg.mockupBtnText || 'Eksplorasi';
      document.getElementById('research-mockup-cursor').value = cfg.showCursor !== false ? 'true' : 'false';
    } else if (item.thumbnailType === 'collab_widget') {
      document.getElementById('research-widget-left').value = cfg.widgetHeaderLeft || '⑂ kolaborasi-medis';
      document.getElementById('research-widget-right').value = cfg.widgetHeaderRight || '+ Neura Clinical ⌄';
      document.getElementById('research-widget-body').value = cfg.widgetBodyText || 'Clinical Decision Support';
    } else if (item.thumbnailType === 'custom_image') {
      document.getElementById('research-image-url').value = cfg.imageUrl || '';
    }

    document.getElementById('research-form-tab-title').textContent = 'Edit Log Riset';
    document.getElementById('research-btn-save-text').textContent = 'Perbarui Log Riset';

    handleThumbnailTypeChange();
    switchResearchAdminView('form');
  }

  // ── 9. Form Submit Handler (Create / Update) ────────────────────────────────
  async function handleResearchFormSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();

    const id = document.getElementById('research-input-id').value;
    const title = document.getElementById('research-input-title').value.trim();
    const dateText = document.getElementById('research-input-date').value.trim();
    const categoriesRaw = document.getElementById('research-input-categories').value.trim();
    const thumbType = document.getElementById('research-input-thumb-type').value;
    const summaryText = document.getElementById('research-input-summary').value.trim();
    const readLinkText = document.getElementById('research-input-link-text').value.trim();
    const linkUrl = document.getElementById('research-input-link-url').value.trim();
    const isPublished = document.getElementById('research-input-published').value === 'true';

    const categories = categoriesRaw.split(',').map(s => s.trim()).filter(Boolean);

    // Build Thumbnail Config
    const thumbnailConfig = {};
    if (thumbType === 'badge_glow' || thumbType === 'neon_code' || thumbType === 'vision_glow') {
      thumbnailConfig.badgeIcon = document.getElementById('research-badge-icon').value.trim() || '✦';
      thumbnailConfig.badgeText = document.getElementById('research-badge-text').value.trim() || 'Model Klinis';
    } else if (thumbType === 'mockup_card') {
      thumbnailConfig.mockupTitle = document.getElementById('research-mockup-title').value.trim() || '32 Profil Biomarker Klinis';
      thumbnailConfig.mockupDesc = document.getElementById('research-mockup-desc').value.trim() || 'Evaluasi korelasi skor MMSE, ADL, dan riwayat memori pasien';
      thumbnailConfig.mockupBtnText = document.getElementById('research-mockup-btn').value.trim() || 'Eksplorasi';
      thumbnailConfig.showCursor = document.getElementById('research-mockup-cursor').value === 'true';
    } else if (thumbType === 'collab_widget') {
      thumbnailConfig.widgetHeaderLeft = document.getElementById('research-widget-left').value.trim() || '⑂ kolaborasi-medis';
      thumbnailConfig.widgetHeaderRight = document.getElementById('research-widget-right').value.trim() || '+ Neura Clinical ⌄';
      thumbnailConfig.widgetBodyText = document.getElementById('research-widget-body').value.trim() || 'Clinical Decision Support';
    } else if (thumbType === 'custom_image') {
      thumbnailConfig.imageUrl = document.getElementById('research-image-url').value.trim();
    }

    const payload = {
      title,
      dateText,
      categories,
      thumbnailType: thumbType,
      thumbnailConfig,
      summaryText,
      readLinkText,
      linkUrl,
      isPublished
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `/api/admin/research/${encodeURIComponent(id)}` : '/api/admin/research';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        const savedItem = data.data || payload;
        const targetId = isEdit ? id : savedItem.id;

        // Sync Firestore
        if (window.firebase && window.firebase.firestore) {
          try {
            const db = window.firebase.firestore();
            await db.collection('research_updates').doc(targetId).set({
              ...savedItem,
              syncedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
          } catch (fsErr) {
            console.warn('[Firestore Research Sync Warning]:', fsErr);
          }
        }

        if (typeof showToast === 'function') {
          showToast(`Log riset "${title}" berhasil ${isEdit ? 'diperbarui' : 'disimpan & dipublikasikan'}!`, 'success');
        }

        resetResearchForm();
        switchResearchAdminView('table');
        loadAdminResearchLogs();
      } else {
        if (typeof showToast === 'function') showToast(data.message || 'Gagal menyimpan log riset', 'error');
      }
    } catch (err) {
      console.error('[Research Save Error]:', err);
      if (typeof showToast === 'function') showToast('Terjadi kesalahan jaringan saat menyimpan', 'error');
    }
  }

  // ── 10. Toggle Publish Status ───────────────────────────────────────────────
  async function toggleResearchPublish(id) {
    const item = _researchLogsCache.find(it => it.id === id);
    if (!item) return;
    const nextState = !item.isPublished;

    try {
      const res = await fetch(`/api/admin/research/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: nextState })
      });
      if (res.ok) {
        item.isPublished = nextState;
        renderResearchTable(_researchLogsCache);
        if (typeof showToast === 'function') {
          showToast(`Status publikasi diubah ke: ${nextState ? 'Published' : 'Draft'}`, 'info');
        }
      }
    } catch (e) {
      console.warn('Gagal toggle status publish:', e);
    }
  }

  // ── 11. Delete Research Log ─────────────────────────────────────────────────
  async function deleteResearchLog(id) {
    const item = _researchLogsCache.find(it => it.id === id);
    const title = item ? item.title : id;
    if (!confirm(`Apakah Anda yakin ingin menghapus log riset: "${title}"?`)) return;

    try {
      const res = await fetch(`/api/admin/research/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        // Hapus dari Firestore
        if (window.firebase && window.firebase.firestore) {
          try {
            await window.firebase.firestore().collection('research_updates').doc(id).delete();
          } catch (fsErr) {
            console.warn('[Firestore Delete Warning]:', fsErr);
          }
        }
        if (typeof showToast === 'function') showToast('Log riset berhasil dihapus', 'success');
        loadAdminResearchLogs();
      } else {
        if (typeof showToast === 'function') showToast(data.message || 'Gagal menghapus log', 'error');
      }
    } catch (err) {
      console.error('Gagal menghapus log:', err);
      if (typeof showToast === 'function') showToast('Kesalahan koneksi saat menghapus', 'error');
    }
  }

  // ── 12. Sync All to Firestore ───────────────────────────────────────────────
  async function syncAllResearchToFirestore(notify) {
    if (!window.firebase || !window.firebase.firestore) {
      if (notify && typeof showToast === 'function') showToast('Firebase Firestore belum terhubung', 'warning');
      return;
    }
    try {
      const db = window.firebase.firestore();
      const batch = db.batch();
      _researchLogsCache.forEach(it => {
        const ref = db.collection('research_updates').doc(it.id);
        batch.set(ref, it);
      });
      await batch.commit();
      if (notify && typeof showToast === 'function') {
        showToast('Seluruh data riset berhasil disinkronkan ke Cloud Firestore!', 'success');
      }
    } catch (err) {
      console.error('Sync Firestore error:', err);
      if (notify && typeof showToast === 'function') showToast('Gagal sinkronisasi ke Firestore', 'error');
    }
  }

  // ── Expose to Window ────────────────────────────────────────────────────────
  window.loadAdminResearchLogs = loadAdminResearchLogs;
  window.switchResearchAdminView = switchResearchAdminView;
  window.handleThumbnailTypeChange = handleThumbnailTypeChange;
  window.updateResearchLivePreview = updateResearchLivePreview;
  window.handleResearchFormSubmit = handleResearchFormSubmit;
  window.editResearchLog = editResearchLog;
  window.deleteResearchLog = deleteResearchLog;
  window.toggleResearchPublish = toggleResearchPublish;
  window.syncAllResearchToFirestore = syncAllResearchToFirestore;
  window.resetResearchForm = resetResearchForm;
  window.handleResearchTableSearch = handleResearchTableSearch;

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    updateResearchLivePreview();
  });

})();

