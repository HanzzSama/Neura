"""
api/admin/admin_auth.py
========================
Admin 2FA OTP Authentication routes:
  GET  /api/admin/emails          — Daftar email custom admin
  POST /api/admin/check-email     — Periksa apakah email adalah admin
  POST /api/admin/send-otp        — Generate & kirim OTP ke email asli admin
  POST /api/admin/verify-otp      — Verifikasi OTP, buat session token
  POST /api/admin/verify-session  — Validasi token sesi admin
  GET  /api/admin/verify-session  — Validasi token via query param / header
  POST /api/admin/logout          — Hapus sesi admin di server
"""

import time
import uuid
import random
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

admin_auth_bp = Blueprint("admin_auth", __name__)

# -----------------------------------------------------------------------
# In-memory stores (diakses juga oleh status_routes untuk verify)
# -----------------------------------------------------------------------
_admin_otp_store = {}   # { email: { "otp": str, "expires_at": float, "attempts": int } }
_admin_sessions   = {}  # { token: { "email": str, "name": str, "role": str, "created_at": float } }


def get_admin_sessions():
    """Expose session store ke modul lain (mis. status_routes)."""
    return _admin_sessions


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@admin_auth_bp.route("/emails", methods=["GET"])
def api_admin_emails():
    """Daftar email custom admin terdaftar untuk deteksi instan (0ms) di browser."""
    from core.admin_config import get_all_admin_custom_emails
    return jsonify({
        "admin_emails":  get_all_admin_custom_emails(),
        "admin_domains": ["neura.dr.id"],
    })


@admin_auth_bp.route("/check-email", methods=["POST"])
def api_admin_check_email():
    """
    Periksa apakah email yang dimasukkan adalah email custom admin
    (contoh: hanzz@neura.dr.id).
    """
    from core.admin_config import get_admin_by_custom_email, mask_email

    body  = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    admin = get_admin_by_custom_email(email)
    if not admin:
        return jsonify({"is_admin": False})

    real_emails = admin.get("real_emails", [])
    masked = [mask_email(e) for e in real_emails]

    return jsonify({
        "is_admin":          True,
        "custom_email":      email,
        "name":              admin.get("name", "Administrator"),
        "role":              admin.get("role", "Admin"),
        "masked_emails":     masked,
        "real_emails_count": len(real_emails),
    })


@admin_auth_bp.route("/send-otp", methods=["POST"])
def api_admin_send_otp():
    """
    Generate kode OTP 6-digit dan kirim ke seluruh alamat email asli
    yang ada dalam array real_emails admin.
    """
    from core.admin_config import get_admin_by_custom_email, mask_email
    from core.email_sender import send_admin_otp_email, is_smtp_configured

    body  = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    admin = get_admin_by_custom_email(email)
    if not admin:
        return jsonify({"success": False, "error": "Email bukan merupakan akun admin terdaftar."}), 404

    real_emails = admin.get("real_emails", [])
    if not real_emails:
        return jsonify({"success": False, "error": "Tidak ada email asli terhubung untuk admin ini."}), 400

    otp_code   = f"{random.randint(100000, 999999):06d}"
    expires_at = time.time() + 300  # 5 menit

    _admin_otp_store[email] = {"otp": otp_code, "expires_at": expires_at, "attempts": 0}

    send_result = send_admin_otp_email(
        to_emails=real_emails,
        admin_name=admin.get("name", "Administrator"),
        otp_code=otp_code,
        custom_email=email,
    )

    logger.info(f"[Admin OTP] Generated OTP for {email} → dest: {real_emails}")

    masked_list = [mask_email(e) for e in real_emails]
    smtp_ok     = bool(send_result.get("success", False))

    response_data = {
        "success":          True,
        "message":          "Kode OTP telah dikirimkan ke email terhubung.",
        "custom_email":     email,
        "masked_emails":    masked_list,
        "smtp_sent":        smtp_ok,
        "expires_in_seconds": 300,
    }

    # Dev fallback: sertakan OTP plaintext jika SMTP belum dikonfigurasi
    if not smtp_ok or not is_smtp_configured():
        response_data["dev_otp"]  = otp_code
        response_data["dev_note"] = (
            "SMTP belum dikonfigurasi di .env; kode OTP disimulasikan untuk pengujian lokal."
        )

    return jsonify(response_data)


@admin_auth_bp.route("/verify-otp", methods=["POST"])
def api_admin_verify_otp():
    """
    Verifikasi kode OTP yang dimasukkan admin.
    Jika valid → buat server-side session token (berlaku 24 jam).
    """
    from core.admin_config import get_admin_by_custom_email

    body      = request.get_json(silent=True) or {}
    email     = (body.get("email") or "").strip().lower()
    input_otp = str(body.get("otp") or "").strip()

    admin = get_admin_by_custom_email(email)
    if not admin:
        return jsonify({"success": False, "error": "Email bukan akun admin terdaftar."}), 404

    record = _admin_otp_store.get(email)
    if not record:
        return jsonify({"success": False, "error": "Kode OTP belum diminta atau sudah kedaluwarsa. Silakan minta kode baru."}), 400

    if time.time() > record["expires_at"]:
        _admin_otp_store.pop(email, None)
        return jsonify({"success": False, "error": "Kode OTP telah kedaluwarsa (lebih dari 5 menit). Silakan minta kode baru."}), 400

    if record["attempts"] >= 5:
        _admin_otp_store.pop(email, None)
        return jsonify({"success": False, "error": "Batas percobaan OTP terlampaui. Silakan minta kode baru."}), 429

    if input_otp != record["otp"]:
        record["attempts"] += 1
        sisa = max(0, 5 - record["attempts"])
        return jsonify({"success": False, "error": f"Kode OTP salah. Sisa kesempatan: {sisa} kali."}), 400

    # ✅ Sukses — hapus OTP (sekali pakai) dan buat session token
    _admin_otp_store.pop(email, None)

    admin_token = str(uuid.uuid4())
    _admin_sessions[admin_token] = {
        "email":      email,
        "name":       admin.get("name", "Administrator"),
        "role":       "Admin",
        "created_at": time.time(),
    }

    return jsonify({
        "success": True,
        "message": "Autentikasi Dua Faktor Admin berhasil!",
        "token":   admin_token,
        "admin": {
            "custom_email": email,
            "name":         admin.get("name", "Administrator"),
            "role":         "Admin",
            "real_emails":  admin.get("real_emails", []),
        },
    })


@admin_auth_bp.route("/verify-session", methods=["POST", "GET"])
def api_admin_verify_session():
    """Validasi token sesi admin yang disimpan di browser (berlaku 24 jam)."""
    token = ""
    if request.method == "POST":
        body  = request.get_json(silent=True) or {}
        token = str(body.get("token") or "").strip()
    if not token:
        token = (
            request.args.get("token")
            or request.headers.get("X-Admin-Token")
            or ""
        ).strip()

    if token and token in _admin_sessions:
        session = _admin_sessions[token]
        if (time.time() - session["created_at"]) < 86400:
            return jsonify({
                "valid": True,
                "admin": {
                    "email": session["email"],
                    "name":  session["name"],
                    "role":  session["role"],
                },
            })
        else:
            _admin_sessions.pop(token, None)

    return jsonify({"valid": False, "error": "Sesi admin tidak valid atau telah kedaluwarsa."}), 401


@admin_auth_bp.route("/logout", methods=["POST"])
def api_admin_logout():
    """Hapus sesi admin di server (invalidate token)."""
    body  = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    if token and token in _admin_sessions:
        _admin_sessions.pop(token, None)
    return jsonify({"success": True})
