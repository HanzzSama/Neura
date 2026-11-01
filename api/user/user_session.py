"""
api/user/user_session.py
========================
User session management endpoints:
  POST /api/user/session         — Sinkronisasi sesi login user (Firebase token / credential) ke server session & cookie
  GET  /api/user/session         — Cek status sesi login user saat ini
  POST /api/user/logout-session  — Hapus sesi login user di server
"""

from flask import Blueprint, request, jsonify
from api.shared.session_middleware import (
    set_user_session,
    get_current_user,
    clear_session,
)
from api.shared.firebase_routes import get_firebase_admin_auth
from core.logger import get_logger

logger = get_logger(__name__)

user_session_bp = Blueprint("user_session", __name__)


@user_session_bp.route("/session", methods=["POST"])
def api_set_user_session():
    """
    Menerima token autentikasi (Firebase ID Token atau info user),
    memverifikasi dengan Firebase Admin jika tersedia,
    dan menyimpan sesi pengguna ke dalam HTTPOnly cookie & server-side session.
    """
    body = request.get_json(silent=True) or {}
    id_token = body.get("idToken") or body.get("token") or ""
    uid = body.get("uid") or ""
    email = body.get("email") or ""
    name = body.get("displayName") or body.get("name") or ""

    # Jika Firebase Admin tersedia dan idToken diberikan, lakukan verifikasi kriptografis
    fb_auth = get_firebase_admin_auth()
    if fb_auth and id_token:
        try:
            decoded_token = fb_auth.verify_id_token(id_token)
            uid = decoded_token.get("uid", uid)
            email = decoded_token.get("email", email)
            name = decoded_token.get("name", name)
            logger.info(f"[UserSession] Firebase ID token verified for uid={uid}")
        except Exception as e:
            logger.warning(f"[UserSession] Gagal verifikasi Firebase ID token: {e}. Fallback ke client-provided UID jika ada.")

    if not uid and not email:
        return jsonify({
            "success": False,
            "error": "Data autentikasi pengguna tidak valid."
        }), 400

    set_user_session(
        uid=uid or email,
        email=email,
        name=name,
        role="user",
    )

    return jsonify({
        "success": True,
        "message": "Sesi pengguna berhasil dibuat.",
        "user": {
            "uid": uid,
            "email": email,
            "name": name,
            "role": "user",
        }
    })


@user_session_bp.route("/session", methods=["GET"])
def api_get_user_session():
    """Mengembalikan informasi sesi pengguna saat ini berdasarkan HTTPOnly cookie."""
    user = get_current_user()
    if user:
        return jsonify({
            "authenticated": True,
            "user": user,
        })
    return jsonify({
        "authenticated": False,
        "user": None,
    })


@user_session_bp.route("/logout-session", methods=["POST"])
def api_logout_user_session():
    """Menghapus sesi server-side dan membersihkan cookie."""
    clear_session()
    return jsonify({
        "success": True,
        "message": "Sesi pengguna telah diakhiri."
    })
