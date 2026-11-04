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
import threading
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

admin_auth_bp = Blueprint("admin_auth", __name__)

# -----------------------------------------------------------------------
# In-memory stores (diakses juga oleh status_routes untuk verify)
# -----------------------------------------------------------------------
_admin_otp_store = {}   # { email: { "otp": str, "expires_at": float, "attempts": int, "last_sent_at": float } }
_admin_sessions   = {}  # { token: { "email": str, "name": str, "role": str, "created_at": float } }
_otp_lock = threading.Lock()
_otp_in_flight = set()


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


@admin_auth_bp.route("/all-admins", methods=["GET"])
def api_admin_all():
    """Mengembalikan seluruh daftar akun admin terdaftar (beserta deskripsi & real_emails)."""
    from core.admin_config import ADMIN_ACCOUNTS
    admins_list = []
    for email_addr, data in ADMIN_ACCOUNTS.items():
        admins_list.append({
            "id": email_addr.replace("@", "_at_").replace(".", "_"),
            "custom_email": email_addr,
            "name": data.get("name", "Administrator"),
            "role": data.get("role", "Admin"),
            "description": data.get("description", ""),
            "real_emails": data.get("real_emails", []),
            "created_at": "2024-01-01T00:00:00Z"
        })
    return jsonify({"success": True, "admins": admins_list, "total": len(admins_list)})



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
    yang ada dalam array real_emails admin (dengan proteksi rate-limit & anti-duplikasi).
    """
    from core.admin_config import get_admin_by_custom_email, mask_email
    from core.email_sender import send_admin_otp_email, is_smtp_configured

    body  = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    admin = get_admin_by_custom_email(email)
    if not admin:
        return jsonify({"success": False, "error": "Email bukan merupakan akun admin terdaftar."}), 404

    # 1. Deduplikasi email asli
    real_emails = list(dict.fromkeys(admin.get("real_emails", [])))
    if not real_emails:
        return jsonify({"success": False, "error": "Tidak ada email asli terhubung untuk admin ini."}), 400

    now = time.time()

    # 2. Proteksi Cooldown: Jika OTP baru saja dikirim dalam 45 detik terakhir,
    # jangan kirim email baru untuk mencegah spam email berganda (3x send).
    existing = _admin_otp_store.get(email)
    if existing:
        last_sent = existing.get("last_sent_at", 0)
        time_elapsed = now - last_sent
        if time_elapsed < 45:
            remaining = int(45 - time_elapsed)
            logger.info(f"[Admin OTP] Cooldown aktif untuk {email} ({remaining}s tersisa). Menggunakan sesi OTP yang aktif.")
            masked_list = [mask_email(e) for e in real_emails]
            return jsonify({
                "success":            True,
                "message":            f"Kode OTP telah dikirimkan ke email terhubung. Mohon tunggu {remaining} detik sebelum meminta ulang.",
                "custom_email":       email,
                "name":               admin.get("name", "Administrator"),
                "masked_emails":      masked_list,
                "smtp_sent":          True,
                "cooldown_remaining": remaining,
                "expires_in_seconds": int(max(0, existing.get("expires_at", now) - now)),
            })

    # 3. In-flight Lock: Cegah request paralel bersamaan mengirim email lebih dari sekali
    with _otp_lock:
        if email in _otp_in_flight:
            logger.warning(f"[Admin OTP] Request paralel terdeteksi untuk {email}. Ditolak.")
            return jsonify({
                "success": False,
                "error": "Permintaan pengiriman OTP sedang diproses, mohon tunggu beberapa saat."
            }), 429
        _otp_in_flight.add(email)

    try:
        otp_code   = f"{random.randint(100000, 999999):06d}"
        expires_at = now + 300  # 5 menit

        _admin_otp_store[email] = {
            "otp":          otp_code,
            "expires_at":   expires_at,
            "attempts":     0,
            "last_sent_at": now,
        }

        send_result = send_admin_otp_email(
            to_emails=real_emails,
            admin_name=admin.get("name", "Administrator"),
            otp_code=otp_code,
            custom_email=email,
        )

        logger.info(f"[Admin OTP] Generated SINGLE OTP for {email} -> dest: {real_emails}")

        smtp_ok = bool(send_result.get("success", False))
        if not smtp_ok:
            error_msg = send_result.get("error", "Gagal mengirimkan email OTP.")
            logger.error(f"[Admin OTP] Gagal mengirim OTP ke {real_emails}: {error_msg}")
            return jsonify({
                "success": False,
                "error": f"Gagal mengirimkan kode OTP ke email admin: {error_msg}."
            }), 500

        masked_list = [mask_email(e) for e in real_emails]
        response_data = {
            "success":          True,
            "message":          "Kode OTP telah dikirimkan ke email terhubung.",
            "custom_email":     email,
            "name":             admin.get("name", "Administrator"),
            "masked_emails":    masked_list,
            "smtp_sent":        True,
            "expires_in_seconds": 300,
        }

        return jsonify(response_data)
    finally:
        with _otp_lock:
            _otp_in_flight.discard(email)


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

    # 1. Simpan ke Flask server-side session & set HTTPOnly cookie
    from api.shared.session_middleware import set_admin_session, get_current_admin, clear_session
    set_admin_session(
        email=email,
        name=admin.get("name", "Administrator"),
        role="Admin",
        real_emails=admin.get("real_emails", []),
    )

    # 2. Dual compatibility: pertahankan token in-memory untuk client lama jika ada
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
    """Validasi sesi admin via HTTPOnly cookie atau token yang dikirim (berlaku 24 jam)."""
    from api.shared.session_middleware import get_current_admin, set_admin_session

    # 1. Cek sesi HTTPOnly cookie terlebih dahulu (metode paling aman)
    current_admin = get_current_admin()
    if current_admin:
        return jsonify({
            "valid": True,
            "admin": {
                "email": current_admin["email"],
                "name":  current_admin["name"],
                "role":  current_admin["role"],
                "real_emails": current_admin.get("real_emails", []),
            },
        })

    # 2. Fallback: cek token manual di body, query params, atau headers
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
        s_data = _admin_sessions[token]
        if (time.time() - s_data["created_at"]) < 86400:
            # Upgrade ke cookie session juga
            set_admin_session(
                email=s_data["email"],
                name=s_data["name"],
                role=s_data["role"],
            )
            return jsonify({
                "valid": True,
                "admin": {
                    "email": s_data["email"],
                    "name":  s_data["name"],
                    "role":  s_data["role"],
                },
            })
        else:
            _admin_sessions.pop(token, None)

    return jsonify({"valid": False, "error": "Sesi admin tidak valid atau telah kedaluwarsa."}), 401


@admin_auth_bp.route("/logout", methods=["POST"])
def api_admin_logout():
    """Hapus sesi admin di server dan hapus cookie HTTPOnly."""
    from api.shared.session_middleware import clear_session
    clear_session()

    body  = request.get_json(silent=True) or {}
    token = str(body.get("token") or "").strip()
    if token and token in _admin_sessions:
        _admin_sessions.pop(token, None)
    return jsonify({"success": True, "message": "Sesi admin berhasil diakhiri."})
