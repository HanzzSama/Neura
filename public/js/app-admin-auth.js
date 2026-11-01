/**
 * public/js/app-admin-auth.js
 * ===========================
 * Role: Admin (Administrator & ML Engineer)
 * Admin 2FA OTP Authentication & Session Validation (@neura.dr.id).
 */

async function verifyAdminSessionToken() {
  const token = localStorage.getItem('neura_admin_token') || '';

  try {
    // Mengirim cookie sesi neura_session secara otomatis; token dikirim sebagai fallback
    const res = await fetchJSON('/api/admin/verify-session', 'POST', { token });
    if (res && res.valid) {
      localStorage.setItem('neura_admin_authenticated', 'true');
      localStorage.setItem('neura_user_role', 'Admin');
      if (res.admin && res.admin.name) {
        localStorage.setItem('neura_admin_name', res.admin.name);
      }
      return true;
    } else {
      localStorage.removeItem('neura_admin_authenticated');
      localStorage.removeItem('neura_admin_token');
      return false;
    }
  } catch (e) {
    return localStorage.getItem('neura_admin_authenticated') === 'true';
  }
}

async function requestAdminOtp(email) {
  try {
    const res = await fetchJSON('/api/admin/send-otp', 'POST', { email });
    return res;
  } catch (err) {
    return { success: false, error: err.message || 'Gagal mengirim kode OTP.' };
  }
}

async function verifyAdminOtp(email, otp) {
  try {
    const res = await fetchJSON('/api/admin/verify-otp', 'POST', { email, otp });
    if (res && res.success) {
      if (res.token) localStorage.setItem('neura_admin_token', res.token);
      localStorage.setItem('neura_admin_authenticated', 'true');
      localStorage.setItem('neura_user_role', 'Admin');
      if (res.admin && res.admin.name) {
        localStorage.setItem('neura_admin_name', res.admin.name);
      }
      if (typeof syncUserProfileUI === 'function') syncUserProfileUI();
      if (typeof syncAdminNavVisibility === 'function') syncAdminNavVisibility();
      return { success: true };
    }
    return { success: false, error: (res && res.error) || 'Verifikasi OTP gagal.' };
  } catch (err) {
    return { success: false, error: err.message || 'Koneksi ke server gagal.' };
  }
}

async function logoutAdmin() {
  const token = localStorage.getItem('neura_admin_token') || '';
  try {
    // Invalidate session di backend dan hapus HTTPOnly cookie
    await fetchJSON('/api/admin/logout', 'POST', { token });
  } catch (e) { }

  localStorage.removeItem('neura_admin_token');
  localStorage.removeItem('neura_admin_authenticated');
  localStorage.removeItem('neura_admin_name');
  if (localStorage.getItem('neura_user_role') === 'Admin') {
    localStorage.removeItem('neura_user_role');
  }
  if (typeof syncUserProfileUI === 'function') syncUserProfileUI();
  if (typeof syncAdminNavVisibility === 'function') syncAdminNavVisibility();
  if (typeof showToast === 'function') showToast('Sesi Administrator diakhiri.', 'info');
}

window.verifyAdminSessionToken = verifyAdminSessionToken;
window.requestAdminOtp = requestAdminOtp;
window.verifyAdminOtp = verifyAdminOtp;
window.logoutAdmin = logoutAdmin;
