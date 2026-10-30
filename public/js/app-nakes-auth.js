/**
 * public/js/app-nakes-auth.js
 * ===========================
 * Role: Nakes (Tenaga Kesehatan)
 * Nakes Session Management & Authentication Helpers (@neura.ns.id).
 */

function getNakesSession() {
  try {
    const raw = localStorage.getItem('neura_nakes_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isNakesLoggedIn() {
  const session = getNakesSession();
  return session !== null && session.is_authenticated === true;
}

async function loginNakes(email, password) {
  try {
    const res = await fetchJSON('/api/nakes/login', 'POST', { email, password });
    if (res && res.success && res.nakes) {
      const sessionData = {
        is_authenticated: true,
        nakes_id: res.nakes.nakes_id,
        name: res.nakes.name,
        title: res.nakes.title,
        sip: res.nakes.sip,
        institution: res.nakes.institution,
        nakes_email: res.nakes.nakes_email,
        logged_in_at: new Date().toISOString()
      };
      localStorage.setItem('neura_nakes_session', JSON.stringify(sessionData));
      localStorage.setItem('neura_user_role', 'Nakes');
      if (typeof syncUserProfileUI === 'function') syncUserProfileUI();
      if (typeof showToast === 'function') showToast(`Selamat datang, ${res.nakes.name}!`, 'success');
      return { success: true, data: sessionData };
    } else {
      const errMsg = (res && res.error) || 'Login nakes gagal.';
      if (typeof showToast === 'function') showToast(errMsg, 'error');
      return { success: false, error: errMsg };
    }
  } catch (err) {
    const msg = err.message || 'Koneksi ke server gagal.';
    if (typeof showToast === 'function') showToast(msg, 'error');
    return { success: false, error: msg };
  }
}

function logoutNakes() {
  localStorage.removeItem('neura_nakes_session');
  if (localStorage.getItem('neura_user_role') === 'Nakes') {
    localStorage.removeItem('neura_user_role');
  }
  if (typeof clearActivePatientDoc === 'function') clearActivePatientDoc();
  if (typeof syncUserProfileUI === 'function') syncUserProfileUI();
  if (typeof showToast === 'function') showToast('Sesi Nakes diakhiri.', 'info');
}

window.getNakesSession = getNakesSession;
window.isNakesLoggedIn = isNakesLoggedIn;
window.loginNakes = loginNakes;
window.logoutNakes = logoutNakes;
