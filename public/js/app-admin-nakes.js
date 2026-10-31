/**
 * public/js/app-admin-nakes.js
 * ============================
 * Role: Admin (Administrator)
 * Admin Nakes Management & Registration Controller (@neura.ns.id).
 */

// ==========================================================================
// Admin Nakes Management & Registration Controller (@neura.ns.id)
// ==========================================================================
let _nakesDirectoryCache = [];
let _nakesActiveView = 'table';

function syncAdminNavVisibility() {
  try {
    const isAdmin = typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin();
    const adminNavIds = [
      'sidebar-nakes-admin-link',
      'sidebar-database-link',
      'sidebar-stats-link',
      'sidebar-files-link'
    ];
    adminNavIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = isAdmin ? 'flex' : 'none';
    });
  } catch (e) { }
}
window.syncAdminNavVisibility = syncAdminNavVisibility;

async function openNakesAdminModal() {
  if (typeof isCurrentUserAdmin === 'function' && !isCurrentUserAdmin()) {
    if (typeof showToast === 'function') {
      showToast('Akses terbatas. Menu ini khusus Administrator Neura AI.', 'warning');
    } else {
      alert('Akses terbatas. Menu ini khusus Administrator Neura AI.');
    }
    return;
  }
  if (window.switchAdminRoom) {
    window.switchAdminRoom('nakes');
  } else {
    const room = document.getElementById('admin-room-nakes');
    if (room) room.style.display = 'flex';
    switchNakesAdminView('table');
    await fetchAndRenderNakesTable();
  }
}
window.openNakesAdminModal = openNakesAdminModal;

function closeNakesAdminModal() {
  if (window.switchAdminRoom) {
    window.switchAdminRoom('chat');
  } else {
    const room = document.getElementById('admin-room-nakes');
    if (room) room.style.display = 'none';
  }
}
window.closeNakesAdminModal = closeNakesAdminModal;

function closeNakesAdminModalOnBackdrop(e) {
  if (e && e.target && (e.target.id === 'admin-nakes-modal' || e.target.id === 'admin-room-nakes')) {
    closeNakesAdminModal();
  }
}
window.closeNakesAdminModalOnBackdrop = closeNakesAdminModalOnBackdrop;

function switchNakesAdminView(view) {
  _nakesActiveView = view;
  const tablePanel = document.getElementById('nakes-view-table');
  const formPanel = document.getElementById('nakes-view-form');
  const tabBtnTable = document.getElementById('nakes-tab-btn-table');
  const tabBtnForm = document.getElementById('nakes-tab-btn-form');

  if (view === 'form') {
    if (tablePanel) tablePanel.style.display = 'none';
    if (formPanel) formPanel.style.display = 'block';
    if (tabBtnTable) tabBtnTable.classList.remove('active');
    if (tabBtnForm) tabBtnForm.classList.add('active');
    const nameInput = document.getElementById('nakes-input-name');
    if (nameInput) setTimeout(() => nameInput.focus(), 80);
  } else {
    if (tablePanel) tablePanel.style.display = 'block';
    if (formPanel) formPanel.style.display = 'none';
    if (tabBtnTable) tabBtnTable.classList.add('active');
    if (tabBtnForm) tabBtnForm.classList.remove('active');
  }
}
window.switchNakesAdminView = switchNakesAdminView;

/**
 * Auto-generate Email Nakes Resmi dengan domain @neura.ns.id
 * Mengambil nama atau username dari Email Asli pribadi nakes.
 */
function handleNakesNameOrEmailInput() {
  const realEmailInput = document.getElementById('nakes-input-real-email');
  const nameInput = document.getElementById('nakes-input-name');
  const domainUserInput = document.getElementById('nakes-input-domain-user');
  const previewText = document.getElementById('nakes-preview-text');

  if (!domainUserInput) return;

  const realEmail = (realEmailInput?.value || '').trim().toLowerCase();
  const name = (nameInput?.value || '').trim();

  let generatedUsername = '';

  if (realEmail && realEmail.includes('@')) {
    // Ekstrak bagian lokal email asli (e.g. citra.anindita92 dari citra.anindita92@gmail.com)
    const localPart = realEmail.split('@')[0];
    generatedUsername = localPart.replace(/[^a-z0-9._-]/g, '');
  } else if (name) {
    // Generate slug dari nama (e.g. dr. Citra Anindita, Sp.N -> citra.anindita)
    let clean = name.toLowerCase();
    clean = clean.replace(/^(dr\.|dr|dokter|ns\.|ners|prof\.|apt\.)\s*/i, '');
    clean = clean.replace(/,\s*(sp\.[a-z()]+|s\.kep|m\.kes|ph\.d|m\.biomed).*$/i, '');
    clean = clean.replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '.');
    generatedUsername = clean || 'nakes';
  }

  if (generatedUsername) {
    domainUserInput.value = generatedUsername;
    if (previewText) {
      previewText.textContent = `${generatedUsername}@neura.ns.id`;
    }
  } else {
    domainUserInput.value = '';
    if (previewText) {
      previewText.textContent = '... @neura.ns.id';
    }
  }
}
window.handleNakesNameOrEmailInput = handleNakesNameOrEmailInput;

async function fetchAndRenderNakesTable() {
  const tbody = document.getElementById('nakes-table-tbody');
  const counter = document.getElementById('nakes-total-counter');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">Memuat direktori data Nakes...</td></tr>`;

  try {
    const res = await fetch('/api/admin/nakes');
    if (res.ok) {
      const json = await res.json();
      _nakesDirectoryCache = Array.isArray(json.data) ? json.data : [];
    } else {
      const local = localStorage.getItem('neura_nakes_directory');
      _nakesDirectoryCache = local ? JSON.parse(local) : [];
    }
  } catch (e) {
    const local = localStorage.getItem('neura_nakes_directory');
    _nakesDirectoryCache = local ? JSON.parse(local) : [];
  }

  if (counter) counter.textContent = _nakesDirectoryCache.length;
  renderNakesTableRows(_nakesDirectoryCache);

  // Otomatis sinkronkan cache data nakes ke Firestore
  setTimeout(() => {
    if (typeof syncAllNakesToFirestore === 'function') {
      syncAllNakesToFirestore(false);
    }
  }, 500);
}
window.fetchAndRenderNakesTable = fetchAndRenderNakesTable;

function renderNakesTableRows(list) {
  const tbody = document.getElementById('nakes-table-tbody');
  const emptyState = document.getElementById('nakes-table-empty');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  let html = '';
  list.forEach((item, idx) => {
    const initials = (item.name || 'N')
      .replace(/^(dr\.|dr|ns\.|apt\.)\s*/i, '')
      .trim()
      .charAt(0)
      .toUpperCase();

    html += `
      <tr>
        <td style="color:var(--text-muted);font-weight:600;">${idx + 1}</td>
        <td>
          <div class="nakes-user-cell">
            <div class="nakes-avatar-initials">${escapeHtml(initials)}</div>
            <div class="nakes-user-info">
              <span class="nakes-user-name">${escapeHtml(item.name || '—')}</span>
              <span class="nakes-user-id">${escapeHtml(item.id || 'NKS')}</span>
            </div>
          </div>
        </td>
        <td><span class="nakes-badge-prof">${escapeHtml(item.profession || 'Tenaga Medis')}</span></td>
        <td>
          <div style="display:flex;flex-direction:column;gap:3px;">
            <span class="nakes-str-badge" title="STR">${escapeHtml(item.str_number || '—')}</span>
            <span style="font-size:10.5px;color:var(--text-muted);">${escapeHtml(item.sip_number || '—')}</span>
          </div>
        </td>
        <td style="font-size:12px;color:var(--text-muted);">${escapeHtml(item.institution || '—')}</td>
        <td style="font-size:12px;font-family:monospace;color:var(--text-muted);">${escapeHtml(item.real_email || '—')}</td>
        <td>
          <div class="nakes-domain-pill" onclick="copyNakesEmail('${escapeHtml(item.nakes_email || '')}')" title="Klik untuk menyalin email resmi nakes">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>${escapeHtml(item.nakes_email || '—')}</span>
          </div>
        </td>
        <td>
          <div class="nakes-pwd-cell">
            <span class="nakes-pwd-text" id="nakes-pwd-text-${idx}" data-pwd="${escapeHtml(item.password || 'nks')}" data-visible="false">••••</span>
            <button class="nakes-pwd-eye-btn" onclick="toggleNakesPwdVisibility(${idx})" title="Tampilkan/sembunyikan kata sandi">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </td>
        <td>
          <span class="nakes-status-tag">
            <span class="nakes-status-dot"></span>
            <span>${escapeHtml(item.status || 'Terverifikasi')}</span>
          </span>
        </td>
        <td style="text-align:center;white-space:nowrap;">
          <div style="display:inline-flex;gap:6px;align-items:center;">
            <button class="nakes-edit-btn" onclick="openEditNakesAdminModal('${escapeHtml(item.id)}')" title="Edit Data Nakes & Kata Sandi">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="nakes-del-btn" onclick="deleteNakesAdmin('${escapeHtml(item.id)}', '${escapeHtml(item.name)}')" title="Hapus Data Nakes">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function toggleNakesPwdVisibility(idx) {
  const el = document.getElementById(`nakes-pwd-text-${idx}`);
  if (!el) return;
  const visible = el.getAttribute('data-visible') === 'true';
  if (visible) {
    el.textContent = '••••';
    el.setAttribute('data-visible', 'false');
  } else {
    el.textContent = el.getAttribute('data-pwd') || 'nks';
    el.setAttribute('data-visible', 'true');
  }
}
window.toggleNakesPwdVisibility = toggleNakesPwdVisibility;

function handleNakesTableSearch() {
  const query = (document.getElementById('nakes-search-input')?.value || '').toLowerCase().trim();
  const profFilter = (document.getElementById('nakes-filter-profession')?.value || '').toLowerCase().trim();

  let filtered = _nakesDirectoryCache.filter(item => {
    const matchQuery = !query ||
      (item.name || '').toLowerCase().includes(query) ||
      (item.str_number || '').toLowerCase().includes(query) ||
      (item.institution || '').toLowerCase().includes(query) ||
      (item.real_email || '').toLowerCase().includes(query) ||
      (item.nakes_email || '').toLowerCase().includes(query);

    const matchProf = !profFilter ||
      (item.profession || '').toLowerCase().includes(profFilter);

    return matchQuery && matchProf;
  });

  renderNakesTableRows(filtered);
}
window.handleNakesTableSearch = handleNakesTableSearch;

async function handleNakesFormSubmit(event) {
  if (event) event.preventDefault();

  const name = (document.getElementById('nakes-input-name')?.value || '').trim();
  const profession = document.getElementById('nakes-input-profession')?.value || 'Dokter Spesialis Neurologi (Sp.N)';
  const strNumber = (document.getElementById('nakes-input-str')?.value || '').trim();
  const sipNumber = (document.getElementById('nakes-input-sip')?.value || '').trim();
  const institution = (document.getElementById('nakes-input-institution')?.value || '').trim();
  const phone = (document.getElementById('nakes-input-phone')?.value || '').trim();
  const realEmail = (document.getElementById('nakes-input-real-email')?.value || '').trim().toLowerCase();
  let domainUser = (document.getElementById('nakes-input-domain-user')?.value || '').trim().toLowerCase();
  const status = document.getElementById('nakes-input-status')?.value || 'Terverifikasi KKI';

  if (!name) {
    if (typeof showToast === 'function') showToast('Nama nakes wajib diisi lengkap beserta gelar.', 'warning');
    return;
  }
  if (!realEmail || !realEmail.includes('@')) {
    if (typeof showToast === 'function') showToast('Email asli pribadi nakes wajib diisi dengan format valid.', 'warning');
    return;
  }

  // Normalisasi username nakes domain
  domainUser = domainUser.replace(/[^a-z0-9._-]/g, '') || realEmail.split('@')[0].replace(/[^a-z0-9._-]/g, '');
  const nakesEmail = `${domainUser}@neura.ns.id`;

  const payload = {
    name,
    profession,
    str_number: strNumber,
    sip_number: sipNumber,
    institution,
    phone,
    real_email: realEmail,
    nakes_email: nakesEmail,
    status
  };

  const submitBtn = document.getElementById('nakes-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Menyimpan Data Nakes...</span>`;
  }

  try {
    const res = await fetch('/api/admin/nakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok && data.success) {
      if (typeof showToast === 'function') {
        showToast(`Sukses! Data nakes ${name} berhasil didaftarkan dengan email resmi ${nakesEmail}.`, 'success');
      }

      // Reset form
      document.getElementById('nakes-create-form')?.reset();
      handleNakesNameOrEmailInput();

      // Sinkronkan data nakes baru ke Firestore collection 'nakes'
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const docId = data.data?.id || payload.id;
          await db.collection('nakes').doc(docId).set({
            ...payload,
            id: docId,
            password: data.data?.password || payload.password,
            role: 'Nakes',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (fsErr) {
          console.warn('[Firestore Nakes Sync Error]:', fsErr);
        }
      }

      // Switch ke view table dan reload data
      switchNakesAdminView('table');
      await fetchAndRenderNakesTable();
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || 'Gagal menyimpan data nakes.', 'error');
      }
    }
  } catch (err) {
    console.error('Error creating nakes:', err);
    // Offline local fallback
    payload.id = `NKS-${new Date().getFullYear()}-${_nakesDirectoryCache.length + 1}`;
    _nakesDirectoryCache.unshift(payload);
    localStorage.setItem('neura_nakes_directory', JSON.stringify(_nakesDirectoryCache));
    if (typeof showToast === 'function') {
      showToast(`Data nakes ${name} tersimpan lokal (${nakesEmail}).`, 'success');
    }
    document.getElementById('nakes-create-form')?.reset();
    switchNakesAdminView('table');
    renderNakesTableRows(_nakesDirectoryCache);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Simpan &amp; Daftarkan Data Nakes</span>
      `;
    }
  }
}
window.handleNakesFormSubmit = handleNakesFormSubmit;

// ==========================================================================
// Edit Nakes Modal & Action Handlers (Admin Controller)
// ==========================================================================
function openEditNakesAdminModal(id) {
  const item = _nakesDirectoryCache.find(it => it.id === id);
  if (!item) {
    if (typeof showToast === 'function') showToast('Data nakes tidak ditemukan.', 'warning');
    return;
  }

  const modal = document.getElementById('edit-nakes-admin-modal');
  if (!modal) return;

  const idBadge = document.getElementById('edit-nakes-modal-id-badge');
  const hiddenId = document.getElementById('edit-nakes-hidden-id');
  const nameInput = document.getElementById('edit-nakes-name');
  const profSelect = document.getElementById('edit-nakes-profession');
  const strInput = document.getElementById('edit-nakes-str');
  const sipInput = document.getElementById('edit-nakes-sip');
  const instInput = document.getElementById('edit-nakes-institution');
  const phoneInput = document.getElementById('edit-nakes-phone');
  const realEmailInput = document.getElementById('edit-nakes-real-email');
  const nakesEmailInput = document.getElementById('edit-nakes-email');
  const pwdInput = document.getElementById('edit-nakes-password');
  const statusSelect = document.getElementById('edit-nakes-status');

  if (idBadge) idBadge.textContent = item.id || 'NKS';
  if (hiddenId) hiddenId.value = item.id || '';
  if (nameInput) nameInput.value = item.name || '';
  if (profSelect) profSelect.value = item.profession || 'Dokter Spesialis Neurologi (Sp.N)';
  if (strInput) strInput.value = item.str_number || '';
  if (sipInput) sipInput.value = item.sip_number || '';
  if (instInput) instInput.value = item.institution || '';
  if (phoneInput) phoneInput.value = item.phone || '';
  if (realEmailInput) realEmailInput.value = item.real_email || '';
  if (nakesEmailInput) nakesEmailInput.value = item.nakes_email || '';
  if (pwdInput) pwdInput.value = item.password || '';
  if (statusSelect) statusSelect.value = item.status || 'Terverifikasi KKI';

  modal.classList.add('open');
}
window.openEditNakesAdminModal = openEditNakesAdminModal;

function closeEditNakesAdminModal() {
  const modal = document.getElementById('edit-nakes-admin-modal');
  if (modal) modal.classList.remove('open');
}
window.closeEditNakesAdminModal = closeEditNakesAdminModal;

function closeEditNakesAdminModalOnBackdrop(e) {
  if (e && e.target && e.target.id === 'edit-nakes-admin-modal') {
    closeEditNakesAdminModal();
  }
}
window.closeEditNakesAdminModalOnBackdrop = closeEditNakesAdminModalOnBackdrop;

function generateRandomNakesPwd() {
  const hiddenId = document.getElementById('edit-nakes-hidden-id');
  const pwdInput = document.getElementById('edit-nakes-password');
  if (!pwdInput) return;
  const parts = (hiddenId?.value || 'NKS-2026-001').split('-');
  const year = parts[1] || new Date().getFullYear();
  const num = parts[2] || Math.floor(Math.random() * 900 + 100);
  pwdInput.value = `nks${year}${num}`;
  if (typeof showToast === 'function') {
    showToast(`Kata sandi di-reset ke format default: ${pwdInput.value}`, 'info');
  }
}
window.generateRandomNakesPwd = generateRandomNakesPwd;

async function handleEditNakesAdminSubmit(event) {
  if (event) event.preventDefault();

  const id = (document.getElementById('edit-nakes-hidden-id')?.value || '').trim();
  if (!id) return;

  const name = (document.getElementById('edit-nakes-name')?.value || '').trim();
  const profession = document.getElementById('edit-nakes-profession')?.value || '';
  const strNumber = (document.getElementById('edit-nakes-str')?.value || '').trim();
  const sipNumber = (document.getElementById('edit-nakes-sip')?.value || '').trim();
  const institution = (document.getElementById('edit-nakes-institution')?.value || '').trim();
  const phone = (document.getElementById('edit-nakes-phone')?.value || '').trim();
  const realEmail = (document.getElementById('edit-nakes-real-email')?.value || '').trim().toLowerCase();
  const nakesEmail = (document.getElementById('edit-nakes-email')?.value || '').trim().toLowerCase();
  const password = (document.getElementById('edit-nakes-password')?.value || '').trim();
  const status = document.getElementById('edit-nakes-status')?.value || 'Terverifikasi KKI';

  if (!name) {
    if (typeof showToast === 'function') showToast('Nama lengkap nakes wajib diisi.', 'warning');
    return;
  }
  if (!password || password.length < 6) {
    if (typeof showToast === 'function') showToast('Kata sandi nakes minimal 6 karakter.', 'warning');
    return;
  }

  const payload = {
    name,
    profession,
    str_number: strNumber,
    sip_number: sipNumber,
    institution,
    phone,
    real_email: realEmail,
    nakes_email: nakesEmail,
    password,
    status
  };

  const saveBtn = document.getElementById('btn-save-edit-nakes');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>Menyimpan Perubahan...</span>`;
  }

  try {
    // 1. Kirim update ke endpoint backend
    const res = await fetch(`/api/admin/nakes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Gagal menyimpan perubahan nakes ke server.');
    }

    // 2. Simpan juga ke Cloud Firestore (collection 'nakes')
    if (window.firebase && window.firebase.firestore) {
      try {
        const db = window.firebase.firestore();
        await db.collection('nakes').doc(id).set({
          id,
          ...payload,
          role: 'Nakes',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (fsErr) {
        console.warn('[Firestore Nakes Edit Sync Warning]:', fsErr);
      }
    }

    if (typeof showToast === 'function') {
      showToast(`Data nakes ${name} berhasil diperbarui dan disinkronkan ke server & Firestore!`, 'success');
    }

    closeEditNakesAdminModal();
    await fetchAndRenderNakesTable();

  } catch (err) {
    console.error('Error editing nakes:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Gagal memperbarui data nakes.', 'error');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Simpan Perubahan Nakes</span>
      `;
    }
  }
}
window.handleEditNakesAdminSubmit = handleEditNakesAdminSubmit;

async function deleteNakesAdmin(id, name) {
  if (!confirm(`Apakah Anda yakin ingin menghapus data tenaga kesehatan ${name || id}?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/nakes/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      if (typeof showToast === 'function') {
        showToast(`Data nakes ${name || id} berhasil dihapus.`, 'info');
      }

      // Hapus juga dari Cloud Firestore
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          await db.collection('nakes').doc(id).delete();
        } catch (fsErr) {
          console.warn('[Firestore Nakes Delete Warning]:', fsErr);
        }
      }
    } else {
      if (typeof showToast === 'function') {
        showToast(data.error || 'Gagal menghapus nakes.', 'error');
      }
    }
  } catch (e) {
    // Local fallback
    _nakesDirectoryCache = _nakesDirectoryCache.filter(item => item.id !== id);
    localStorage.setItem('neura_nakes_directory', JSON.stringify(_nakesDirectoryCache));
    if (typeof showToast === 'function') {
      showToast(`Data nakes ${name || id} dihapus dari penyimpanan lokal.`, 'info');
    }
  }

  await fetchAndRenderNakesTable();
}
window.deleteNakesAdmin = deleteNakesAdmin;

/**
 * Sinkronisasi Seluruh Direktori Nakes & Akun Admin ke Cloud Firestore
 */
async function syncAllNakesToFirestore(showFeedback = false) {
  if (!window.firebase || !window.firebase.firestore) {
    if (showFeedback && typeof showToast === 'function') {
      showToast('Firebase Firestore belum siap atau belum diinisialisasi.', 'warning');
    }
    return;
  }

  try {
    const db = window.firebase.firestore();

    // 1. Sinkronkan seluruh data nakes
    if (_nakesDirectoryCache && _nakesDirectoryCache.length > 0) {
      const batch = db.batch();
      _nakesDirectoryCache.forEach(item => {
        if (!item.id) return;
        const ref = db.collection('nakes').doc(item.id);
        batch.set(ref, {
          id: item.id,
          name: item.name || '',
          profession: item.profession || '',
          str_number: item.str_number || '',
          sip_number: item.sip_number || '',
          institution: item.institution || '',
          phone: item.phone || '',
          real_email: item.real_email || '',
          nakes_email: item.nakes_email || '',
          password: item.password || '',
          status: item.status || 'Terverifikasi',
          role: 'Nakes',
          syncedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
    }

    // 2. Sinkronkan seluruh akun Admin ke collection 'admins'
    await syncAdminsToFirestore(false);

    if (showFeedback && typeof showToast === 'function') {
      showToast(`Sinkronisasi Firestore berhasil! ${_nakesDirectoryCache.length} data nakes & seluruh akun admin telah tersimpan.`, 'success');
    }
  } catch (err) {
    console.warn('[Firestore Batch Sync Error]:', err);
    if (showFeedback && typeof showToast === 'function') {
      showToast('Gagal sinkronisasi ke Firestore: ' + (err.message || err), 'error');
    }
  }
}
window.syncAllNakesToFirestore = syncAllNakesToFirestore;

/**
 * Sinkronisasi seluruh akun Administrator Neura AI ke Firestore collection 'admins'
 */
async function syncAdminsToFirestore(showFeedback = false) {
  if (!window.firebase || !window.firebase.firestore) return;
  try {
    const res = await fetch('/api/admin/all-admins');
    if (!res.ok) return;
    const json = await res.json();
    if (!json.success || !Array.isArray(json.admins)) return;

    const db = window.firebase.firestore();
    const batch = db.batch();
    json.admins.forEach(adm => {
      const docId = adm.id || (adm.custom_email ? adm.custom_email.replace(/[^a-zA-Z0-9_-]/g, '_') : 'admin_default');
      const ref = db.collection('admins').doc(docId);
      batch.set(ref, {
        ...adm,
        syncedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore Admins Sync Warning]:', err);
  }
}
window.syncAdminsToFirestore = syncAdminsToFirestore;

function copyNakesEmail(email) {
  if (!email) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email).then(() => {
      if (typeof showToast === 'function') {
        showToast(`Email nakes ${email} berhasil disalin ke clipboard!`, 'success');
      }
    }).catch(() => {
      prompt('Salin email nakes:', email);
    });
  } else {
    prompt('Salin email nakes:', email);
  }
}
window.copyNakesEmail = copyNakesEmail;

// Eksekusi sync visibility pada saat file selesai dimuat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', syncAdminNavVisibility);
} else {
  syncAdminNavVisibility();
}
