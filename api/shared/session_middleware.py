"""
api/shared/session_middleware.py
================================
Session and cookie authentication middleware for Neura.
Provides helper decorators and session state management for Admin and User roles.
"""

import time
from functools import wraps
from flask import session, jsonify, request
from core.logger import get_logger

logger = get_logger(__name__)


def set_admin_session(email: str, name: str = "Administrator", role: str = "Admin", real_emails: list = None):
    """Set server-side session for an authenticated Admin."""
    session.permanent = True
    session["is_admin"] = True
    session["admin_email"] = email
    session["admin_name"] = name
    session["admin_role"] = role
    session["admin_real_emails"] = real_emails or []
    session["admin_login_at"] = time.time()
    logger.info(f"[Session] Admin session established for {email}")


def set_user_session(uid: str, email: str = "", name: str = "", role: str = "user"):
    """Set server-side session for an authenticated User (via Firebase or email)."""
    session.permanent = True
    session["user_uid"] = uid
    session["user_email"] = email
    session["user_name"] = name
    session["user_role"] = role
    session["user_login_at"] = time.time()
    logger.info(f"[Session] User session established for uid={uid} ({email})")


def get_current_admin():
    """Retrieve current admin session data if present."""
    if session.get("is_admin") and session.get("admin_email"):
        return {
            "email": session.get("admin_email"),
            "name": session.get("admin_name", "Administrator"),
            "role": session.get("admin_role", "Admin"),
            "real_emails": session.get("admin_real_emails", []),
            "login_at": session.get("admin_login_at"),
        }
    return None


def get_current_user():
    """Retrieve current user session data if present."""
    if session.get("user_uid"):
        return {
            "uid": session.get("user_uid"),
            "email": session.get("user_email", ""),
            "name": session.get("user_name", ""),
            "role": session.get("user_role", "user"),
            "login_at": session.get("user_login_at"),
        }
    return None


def clear_session():
    """Clear all session data and invalidate session cookie."""
    session.clear()
    logger.info("[Session] Current session cleared.")


def require_admin_session(f):
    """
    Decorator to protect admin routes.
    Checks Flask session cookie first; falls back to checking legacy X-Admin-Token or JSON token if needed.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        admin = get_current_admin()
        if admin:
            return f(*args, **kwargs)

        # Legacy fallback check (token in headers or body)
        from api.admin.admin_auth import get_admin_sessions
        token = (
            request.headers.get("X-Admin-Token")
            or request.args.get("token")
            or ""
        ).strip()
        if not token and request.is_json:
            token = str((request.get_json(silent=True) or {}).get("token") or "").strip()

        sessions = get_admin_sessions()
        if token and token in sessions:
            s_data = sessions[token]
            if (time.time() - s_data.get("created_at", 0)) < 86400:
                # Also promote to Flask session for future requests
                set_admin_session(
                    email=s_data.get("email", ""),
                    name=s_data.get("name", "Administrator"),
                    role=s_data.get("role", "Admin"),
                )
                return f(*args, **kwargs)

        return jsonify({
            "success": False,
            "error": "Sesi admin tidak valid atau belum login. Akses ditolak."
        }), 401

    return decorated


def require_user_session(f):
    """
    Decorator to protect user routes requiring session authentication.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({
                "success": False,
                "error": "Sesi pengguna tidak ditemukan. Silakan masuk terlebih dahulu."
            }), 401
        return f(*args, **kwargs)

    return decorated
