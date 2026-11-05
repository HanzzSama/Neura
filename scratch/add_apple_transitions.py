import re

# =========================================================================
# 1. Update public/js/auth-hero.js
# Update setAdminModeUI with smooth classes and setButtonLoading with spinner & text
# =========================================================================
with open("public/js/auth-hero.js", "r", encoding="utf-8") as f:
    js = f.read()

# Update setButtonLoading to be rock-solid with apple style feel
old_btn_loading = """  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    }
  }"""

new_btn_loading = """  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
  }"""

if old_btn_loading in js:
    js = js.replace(old_btn_loading, new_btn_loading, 1)
    print("[JS] Updated setButtonLoading")
else:
    old_crlf = old_btn_loading.replace('\n', '\r\n')
    new_crlf = new_btn_loading.replace('\n', '\r\n')
    if old_crlf in js:
        js = js.replace(old_crlf, new_crlf, 1)
        print("[JS] Updated setButtonLoading (CRLF)")
    else:
        print("[JS] Note: setButtonLoading already modified or different formatting")

# Update setAdminModeUI for Apple-like smooth transition
old_admin_mode = """    if (active) {
      if (emailPill) emailPill.classList.add('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'inline-flex';

      // Hide password capsule, and display admin notice pill exactly where password was
      if (passPill) passPill.style.setProperty('display', 'none', 'important');
      if (passInput) {
        passInput.disabled = true;
        passInput.removeAttribute('required');
        passInput.value = '';
      }
      if (notice) {
        notice.style.setProperty('display', 'flex', 'important');
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Verifikasi 2FA';
        submitBtn.title = 'Lanjut ke Verifikasi Admin 2FA';
        submitBtn.classList.add('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Kode OTP 6-digit akan dikirimkan ke email terhubung untuk memverifikasi sesi administrator.';
      }
    } else {
      if (emailPill) emailPill.classList.remove('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'none';

      // Restore password capsule and hide admin notice
      if (passPill) passPill.style.removeProperty('display');
      if (passInput) {
        passInput.disabled = false;
        passInput.setAttribute('required', '');
        passInput.placeholder = 'password';
      }
      if (notice) {
        notice.style.setProperty('display', 'none', 'important');
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Login';
        submitBtn.title = 'Masuk ke Workspace';
        submitBtn.classList.remove('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Tidak semua keputusan klinis mudah, evaluasi 32 biomarker Neura hadir membantu ketepatan diagnosis presisi.';
      }
    }"""

new_admin_mode = """    var loginForm = document.getElementById('auth-login-form');
    if (active) {
      if (emailPill) emailPill.classList.add('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'inline-flex';

      if (loginForm) loginForm.classList.add('is-admin-mode');

      // Apple smooth transition: hide password pill, reveal admin notice
      if (passPill) {
        passPill.classList.add('is-collapsed');
        setTimeout(function() {
          if (loginForm && loginForm.classList.contains('is-admin-mode')) {
            passPill.style.setProperty('display', 'none', 'important');
          }
        }, 280);
      }
      if (passInput) {
        passInput.disabled = true;
        passInput.removeAttribute('required');
        passInput.value = '';
      }
      if (notice) {
        notice.style.removeProperty('display');
        notice.style.display = 'flex';
        // Force reflow for smooth animation
        void notice.offsetWidth;
        notice.classList.add('is-visible');
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Verifikasi 2FA';
        submitBtn.title = 'Lanjut ke Verifikasi Admin 2FA';
        submitBtn.classList.add('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Kode OTP 6-digit akan dikirimkan ke email terhubung untuk memverifikasi sesi administrator.';
      }
    } else {
      if (emailPill) emailPill.classList.remove('is-admin-verified');
      if (emailAdminIcon) emailAdminIcon.style.display = 'none';

      if (loginForm) loginForm.classList.remove('is-admin-mode');

      // Restore password capsule and hide admin notice smoothly
      if (notice) {
        notice.classList.remove('is-visible');
        setTimeout(function() {
          if (loginForm && !loginForm.classList.contains('is-admin-mode')) {
            notice.style.setProperty('display', 'none', 'important');
          }
        }, 240);
      }
      if (passPill) {
        passPill.style.removeProperty('display');
        void passPill.offsetWidth;
        passPill.classList.remove('is-collapsed');
      }
      if (passInput) {
        passInput.disabled = false;
        passInput.setAttribute('required', '');
        passInput.placeholder = 'password';
      }
      if (submitBtn) {
        var label = submitBtn.querySelector('.submit-btn-label') || submitBtn.querySelector('.comp1-submit-label');
        if (label) label.textContent = 'Login';
        submitBtn.title = 'Masuk ke Workspace';
        submitBtn.classList.remove('is-admin-action');
      }
      if (descText) {
        descText.textContent = 'Tidak semua keputusan klinis mudah, evaluasi 32 biomarker Neura hadir membantu ketepatan diagnosis presisi.';
      }
    }"""

if old_admin_mode in js:
    js = js.replace(old_admin_mode, new_admin_mode, 1)
    print("[JS] Updated setAdminModeUI with Apple smooth transition")
else:
    old_crlf = old_admin_mode.replace('\n', '\r\n')
    new_crlf = new_admin_mode.replace('\n', '\r\n')
    if old_crlf in js:
        js = js.replace(old_crlf, new_crlf, 1)
        print("[JS] Updated setAdminModeUI with Apple smooth transition (CRLF)")
    else:
        print("[JS] WARNING: Could not find old_admin_mode!")

with open("public/js/auth-hero.js", "w", encoding="utf-8") as f:
    f.write(js)

# =========================================================================
# 2. Update public/css/auth-hero.css
# Add Apple-style spring animations & smooth loading effects
# =========================================================================
with open("public/css/auth-hero.css", "r", encoding="utf-8") as f:
    css = f.read()

apple_transitions_css = """
/* --------------------------------------------------------------------------
   APPLE-INSPIRED SMOOTH MOTION & LOADING SUITE
   Curve: cubic-bezier(0.16, 1, 0.3, 1) (Apple fluid spring)
   -------------------------------------------------------------------------- */

/* 1. Ultra-smooth Form Pane Transition */
.auth-view-pane {
  display: none;
  width: 100%;
  opacity: 0;
  transform: scale(0.98) translateY(10px);
  transform-origin: 50% 0%;
  transition: opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.38s cubic-bezier(0.16, 1, 0.3, 1) !important;
  will-change: transform, opacity;
}

.auth-view-pane.active {
  display: block !important;
  opacity: 1 !important;
  transform: scale(1) translateY(0) !important;
  animation: applePaneEntrance 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
}

@keyframes applePaneEntrance {
  0% {
    opacity: 0;
    transform: scale(0.975) translateY(12px);
    filter: blur(4px);
  }
  60% {
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0);
  }
}

/* 2. Apple Title & Subtitle Transition */
.auth-card-title,
.auth-card-subtitle {
  transition: opacity 0.28s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.32s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* 3. Smooth Password Pill Collapse / Expand */
#login-password-pill {
  overflow: hidden !important;
  max-height: 80px !important;
  opacity: 1 !important;
  transform: translateY(0) scale(1) !important;
  transition: max-height 0.36s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.26s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              margin-bottom 0.36s cubic-bezier(0.16, 1, 0.3, 1),
              padding 0.36s cubic-bezier(0.16, 1, 0.3, 1) !important;
  will-change: max-height, opacity, transform;
}

#login-password-pill.is-collapsed {
  max-height: 0 !important;
  opacity: 0 !important;
  margin-bottom: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-width: 0 !important;
  transform: translateY(-8px) scale(0.96) !important;
  pointer-events: none !important;
}

/* 4. Smooth Admin Notice Entrance (Replacing Password Pill) */
.neura-auth-flow-container #admin-detected-notice {
  opacity: 0 !important;
  max-height: 0 !important;
  transform: translateY(8px) scale(0.96) !important;
  overflow: hidden !important;
  transition: max-height 0.38s cubic-bezier(0.16, 1, 0.3, 1),
              opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.36s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.36s ease !important;
}

.neura-auth-flow-container #admin-detected-notice.is-visible {
  opacity: 1 !important;
  max-height: 80px !important;
  transform: translateY(0) scale(1) !important;
  overflow: visible !important;
}

/* 5. Apple Premium Button Loading State */
.neura-auth-submit-btn,
.sub-stack-capsule-btn,
.otp-submit-btn {
  position: relative !important;
  transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.24s ease,
              border-color 0.24s ease,
              box-shadow 0.24s ease,
              opacity 0.24s ease !important;
}

.neura-auth-submit-btn .submit-btn-label,
.otp-submit-btn .submit-btn-label {
  display: inline-block !important;
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.24s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* When loading: Smooth label fade & elevation */
.neura-auth-submit-btn.is-loading,
.otp-submit-btn.is-loading {
  cursor: wait !important;
  pointer-events: none !important;
  transform: scale(0.98) !important;
  opacity: 0.88 !important;
}

.neura-auth-submit-btn.is-loading .submit-btn-label,
.otp-submit-btn.is-loading .submit-btn-label {
  opacity: 0 !important;
  transform: translateY(-4px) scale(0.94) !important;
}

/* Apple-style Smooth Circular Spinner */
.neura-auth-submit-btn .auth-btn-spinner,
.otp-submit-btn .auth-btn-spinner {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  margin-top: -10px !important;
  margin-left: -10px !important;
  width: 20px !important;
  height: 20px !important;
  border-radius: 50% !important;
  border: 2.2px solid rgba(255, 255, 255, 0.2) !important;
  border-top-color: #D97757 !important;
  border-right-color: rgba(217, 119, 87, 0.8) !important;
  display: block !important;
  opacity: 0 !important;
  transform: scale(0.6) rotate(0deg) !important;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
  pointer-events: none !important;
}

.neura-auth-submit-btn.is-loading .auth-btn-spinner,
.otp-submit-btn.is-loading .auth-btn-spinner {
  opacity: 1 !important;
  transform: scale(1) rotate(0deg) !important;
  animation: appleSmoothSpin 0.75s linear infinite !important;
}

@keyframes appleSmoothSpin {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1) rotate(360deg); }
}

/* Google Capsule Loading Effect */
.sub-stack-capsule-btn.is-loading {
  pointer-events: none !important;
  opacity: 0.65 !important;
  transform: scale(0.985) !important;
}

.sub-stack-capsule-btn.is-loading .capsule-leading-circle {
  animation: applePulseIcon 1.2s ease-in-out infinite alternate !important;
}

@keyframes applePulseIcon {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.88); opacity: 0.5; }
}

/* Smooth Top Pill Tabs */
.top-pill-btn {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}
.top-pill-btn.active {
  transform: scale(1.08) !important;
}
"""

css += apple_transitions_css

with open("public/css/auth-hero.css", "w", encoding="utf-8") as f:
    f.write(css)

print("[CSS] Added Apple motion & loading animations")

# =========================================================================
# 3. Bump cache-busters in welcome.html
# =========================================================================
html = re.sub(r'auth-hero\.css\?v=\d+', 'auth-hero.css?v=80', html)
html = re.sub(r'auth-hero\.js\?v=\d+', 'auth-hero.js?v=80', html)

with open("public/welcome.html", "w", encoding="utf-8") as f:
    f.write(html)

print("[HTML] Bumped cache-busters to v=80")

