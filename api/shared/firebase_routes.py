"""
api/shared/firebase_routes.py
==============================
Shared routes:
  GET  /api/firebase-config          — Kirim konfigurasi Firebase ke client
  POST /api/send-verification-email  — Kirim email verifikasi via Firebase Admin + SMTP
  GET  /api/about                    — Baca about_app.json (dengan cache mtime)
"""

import os
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

shared_bp = Blueprint("shared", __name__)

# -----------------------------------------------------------------------
# Firebase Admin SDK — lazy init (shared dengan admin_auth juga)
# -----------------------------------------------------------------------
_firebase_admin_initialized = False


def get_firebase_admin_auth():
    """Lazy-init Firebase Admin SDK menggunakan kredensial dari .env."""
    global _firebase_admin_initialized
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth, credentials

        if not _firebase_admin_initialized:
            sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
            if sa_path and os.path.exists(sa_path):
                cred = credentials.Certificate(sa_path)
            else:
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": os.getenv("FIREBASE_PROJECT_ID", ""),
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL", ""),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                })

            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _firebase_admin_initialized = True

        return fb_auth
    except Exception as e:
        logger.warning(f"[Firebase Admin] Tidak dapat diinisialisasi: {e}")
        return None


# -----------------------------------------------------------------------
# About cache
# -----------------------------------------------------------------------
_about_cache = None
_about_cache_mtime = 0


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@shared_bp.route("/api/firebase-config", methods=["GET"])
def api_firebase_config():
    """Returns Firebase project credentials from .env to the client."""
    return jsonify({
        "apiKey":            os.getenv("FIREBASE_API_KEY", ""),
        "authDomain":        os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId":         os.getenv("FIREBASE_PROJECT_ID", ""),
        "storageBucket":     os.getenv("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId":             os.getenv("FIREBASE_APP_ID", ""),
    })


@shared_bp.route("/api/about", methods=["GET"])
def api_about():
    """
    Returns the full app metadata from about_app.json.
    Auto-reloads whenever about_app.json is modified on disk.
    """
    global _about_cache, _about_cache_mtime

    about_path = Path("about_app.json")
    if not about_path.exists():
        return jsonify({"error": "about_app.json not found"}), 404

    try:
        current_mtime = about_path.stat().st_mtime
        if _about_cache is not None and current_mtime == _about_cache_mtime:
            return jsonify(_about_cache)

        with open(about_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        _about_cache = {k: v for k, v in data.items() if not k.startswith("_comment")}
        _about_cache_mtime = current_mtime
        return jsonify(_about_cache)
    except Exception as e:
        logger.error(f"[about] Failed to read about_app.json: {e}")
        return jsonify({"error": "Failed to read about_app.json"}), 500


@shared_bp.route("/api/send-verification-email", methods=["POST"])
def api_send_verification_email():
    """
    Generate Firebase email verification link dan kirim custom HTML email
    via Gmail SMTP.

    Body JSON: { "email": str, "displayName": str, "continueUrl": str (optional) }
    """
    from core.email_sender import send_verification_email, is_smtp_configured

    body         = request.get_json(silent=True) or {}
    email        = (body.get("email") or "").strip()
    display_name = (body.get("displayName") or email.split("@")[0]).strip()
    continue_url = (body.get("continueUrl") or "http://localhost:5000/verify-email").strip()

    if not email or "@" not in email:
        return jsonify({"success": False, "error": "Email tidak valid."}), 400

    if not is_smtp_configured():
        return jsonify({
            "success": False,
            "error": "SMTP belum dikonfigurasi. Isi SMTP_EMAIL dan SMTP_PASSWORD di .env",
            "smtp_required": True,
        }), 503

    verify_link = None
    fb_auth = get_firebase_admin_auth()
    if fb_auth:
        try:
            action_settings = fb_auth.ActionCodeSettings(
                url=continue_url,
                handle_code_in_app=False,
            )
            verify_link = fb_auth.generate_email_verification_link(email, action_code_settings=action_settings)
        except Exception as e:
            logger.warning(f"[Firebase Admin] Gagal generate link: {e}")

    if not verify_link:
        return jsonify({
            "success": False,
            "error": "Firebase Admin SDK belum dikonfigurasi. Tambahkan kredensial service account di .env",
            "admin_required": True,
        }), 503

    result = send_verification_email(email, display_name, verify_link)
    status_code = 200 if result["success"] else 500
    return jsonify(result), status_code
