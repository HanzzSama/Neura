/**
 * public/js/app-auth.js
 * =====================
 * User Profile & Authentication Synchronization with Firebase Auth & Local Storage.
 * Manages user roles (Admin, Nakes, User), logout flow, and UI profile badges.
 */

function isCurrentUserAdmin() {
  try {
    const isAdminAuth = localStorage.getItem('neura_admin_authenticated') === 'true' ||
      sessionStorage.getItem('neura_admin_session') === 'true';
    if (isAdminAuth) return true;

    const rawUser = localStorage.getItem('neura_auth_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      const email = (u.email || '').toLowerCase().trim();
      const role = u.role || localStorage.getItem('neura_user_role') || '';
      if (role === 'Admin' || (role && role.toLowerCase() === 'admin') || email.endsWith('@neura.dr.id') || email === 'muhammadhasan.cg@gmail.com') {
        return true;
      }
    }
  } catch (e) { }
  return false;
}

function getCurrentUserRole() {
  try {
    if (typeof isCurrentUserAdmin === 'function' && isCurrentUserAdmin()) {
      return 'Admin';
    }
    const savedRole = localStorage.getItem('neura_user_role');
    if (savedRole) {
      const lower = savedRole.toLowerCase().trim();
      if (lower === 'admin') return 'Admin';
      if (lower === 'nakes' || lower === 'dokter') return 'Nakes';
      if (lower === 'user' || lower === 'pasien') return 'User';
    }
    const rawUser = localStorage.getItem('neura_auth_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      const uRole = (u.role || '').toLowerCase().trim();
      if (uRole === 'admin') return 'Admin';
      if (uRole === 'nakes' || uRole === 'dokter') return 'Nakes';
      const email = (u.email || '').toLowerCase().trim();
      if (email.endsWith('@neura.ns.id')) return 'Nakes';
      if (email.endsWith('@neura.dr.id') || email === 'muhammadhasan.cg@gmail.com') return 'Admin';
    }
    if (localStorage.getItem('neura_nakes_session')) {
      return 'Nakes';
    }
  } catch (e) { }
  return 'User';
}

function syncUserProfileUI() {
  try {
    const raw = localStorage.getItem('neura_auth_user');
    let user = null;
    if (raw) {
      user = JSON.parse(raw);
    }

    if (!user && window.NeuraFirebase && window.NeuraFirebase.auth) {
      const fbUser = window.NeuraFirebase.auth().currentUser;
      if (fbUser) {
        user = {
          name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Pengguna'),
          email: fbUser.email,
          uid: fbUser.uid,
          photoURL: fbUser.photoURL || ''
        };
      }
    }

    if (!user) return;

    const displayName = user.name || (user.email ? user.email.split('@')[0] : 'Pengguna');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl) nameEl.textContent = displayName;
    const savedRole = getCurrentUserRole();
    if (roleEl) {
      const label = typeof formatRoleLabel === 'function' ? formatRoleLabel(savedRole) : savedRole;
      roleEl.textContent = label;
      roleEl.setAttribute('data-role', savedRole.toLowerCase());
    }
    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" onerror="this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'">`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    const isAdmin = typeof isCurrentUserAdmin === 'function' ? isCurrentUserAdmin() : (savedRole === 'Admin');
    const dotProfileLabel = document.getElementById('dot-edit-profile-label');
    if (dotProfileLabel) {
      dotProfileLabel.textContent = isAdmin ? 'Edit Profil Admin' : 'Edit Profil & Password';
    }
    const changePwdBtn = document.getElementById('stg-change-pwd-btn');
    if (changePwdBtn) {
      changePwdBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    }
    const tabSecBtn = document.getElementById('tab-btn-edit-security');
    if (tabSecBtn) {
      tabSecBtn.style.display = isAdmin ? 'none' : 'inline-flex';
    }
  } catch (err) {
    console.warn('[Neura UI] syncUserProfileUI failed:', err);
  } finally {
    if (typeof syncAdminNavVisibility === 'function') {
      syncAdminNavVisibility();
    }
    if (typeof renderRoleMLCommands === 'function') {
      renderRoleMLCommands();
    }
  }
}

function initAuthListeners() {
  // Sync profile info immediately from localStorage if available
  syncUserProfileUI();
  if (typeof syncAdminNavVisibility === 'function') {
    syncAdminNavVisibility();
  }

  // Hook Firebase Auth state change if initialized
  function hookFirebase() {
    if (window.NeuraFirebase && window.NeuraFirebase.auth) {
      try {
        window.NeuraFirebase.auth().onAuthStateChanged(function (user) {
          if (user) {
            syncUserProfileUI();
          }
        });
      } catch (e) { }
    }
  }

  if (window.NeuraFirebase && window.NeuraFirebase.auth) {
    hookFirebase();
  } else if (window.NeuraFirebase && window.NeuraFirebase.init) {
    window.NeuraFirebase.init().then(hookFirebase).catch(function () { });
  }
}

async function handleLogout() {
  const confirmed = window.confirm('Apakah Anda yakin ingin keluar dari akun Neura AI?');
  if (!confirmed) return;

  try {
    if (typeof showToast === 'function') {
      showToast('Sedang keluar dari akun...', 'info');
    }

    let auth = null;
    if (window.NeuraFirebase) {
      if (typeof window.NeuraFirebase.getAuth === 'function') {
        auth = window.NeuraFirebase.getAuth();
      }
      if (!auth && window.NeuraFirebase.auth) {
        auth = typeof window.NeuraFirebase.auth === 'function'
          ? window.NeuraFirebase.auth()
          : window.NeuraFirebase.auth;
      }
      if (!auth && typeof window.NeuraFirebase.init === 'function') {
        const fb = await window.NeuraFirebase.init();
        if (fb && fb.auth) auth = fb.auth;
      }
    }

    if (!auth && typeof firebase !== 'undefined' && typeof firebase.auth === 'function') {
      try { auth = firebase.auth(); } catch (e) { }
    }

    if (auth && typeof auth.signOut === 'function') {
      await auth.signOut();
      console.log('[Neura Auth] Firebase sign out sukses.');
    }
  } catch (err) {
    console.warn('[Neura Auth] Sign out error:', err);
  } finally {
    if (typeof window.clearAllUserSessionData === 'function') {
      window.clearAllUserSessionData();
    } else {
      try {
        localStorage.removeItem('neura_auth_user');
        localStorage.removeItem('neura_user_profile');
        localStorage.removeItem('neura_user_role');
        localStorage.removeItem('neura_nakes_session');
        localStorage.removeItem('neura_admin_authenticated');
        localStorage.removeItem('neura_admin_token');
        localStorage.removeItem('neura_active_session_id_v2');
        localStorage.removeItem('neura_recent_chats_v2');
        localStorage.removeItem('neura_last_consultation');
        localStorage.removeItem('neura_active_patient_doc');
        localStorage.removeItem('neura_draft_chat_input_v2');
        sessionStorage.clear();
      } catch (e) { }
    }

    window.location.replace('/welcome?logged_out=true');
  }
}

// Window exports
window.isCurrentUserAdmin = isCurrentUserAdmin;
window.getCurrentUserRole = getCurrentUserRole;
window.syncUserProfileUI = syncUserProfileUI;
window.initAuthListeners = initAuthListeners;
window.handleLogout = handleLogout;
