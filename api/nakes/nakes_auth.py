"""
api/nakes/nakes_auth.py
========================
Nakes Authentication route:
  POST /api/nakes/login — Login dengan email @neura.ns.id / email asli + password
"""

from flask import Blueprint, request, jsonify
from core.logger import get_logger
import json
from pathlib import Path

logger = get_logger(__name__)

nakes_auth_bp = Blueprint("nakes_auth", __name__)

NAKES_DB_FILE = Path(__file__).resolve().parent.parent.parent / "datasets" / "nakes_directory.json"


def _load_nakes_db():
    if not NAKES_DB_FILE.exists():
        return []
    try:
        with open(NAKES_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Gagal membaca nakes_directory.json: {e}")
        return []


@nakes_auth_bp.route("/login", methods=["POST"])
def api_nakes_login():
    """
    Autentikasi login tenaga kesehatan profesional.
    Menerima email @neura.ns.id atau email asli + password.
    Password default: nks{tahun}{urutan} (contoh: nks2026001).
    """
    body     = request.get_json(silent=True) or {}
    email    = (body.get("email") or "").strip().lower()
    password = str(body.get("password") or "").strip()

    if not email:
        return jsonify({"success": False, "error": "Email nakes wajib diisi."}), 400
    if not password:
        return jsonify({"success": False, "error": "Kata sandi wajib diisi."}), 400

    items   = _load_nakes_db()
    matched = None
    for item in items:
        if (
            item.get("nakes_email", "").lower() == email
            or item.get("real_email", "").lower() == email
        ):
            matched = item
            break

    if not matched:
        return jsonify({
            "success": False,
            "error": "Akun tenaga kesehatan tidak terdaftar dalam direktori Neura.",
        }), 404

    # Derive password default dari ID jika kolom password belum ada (backward compat)
    stored_pwd = matched.get("password") or ""
    if not stored_pwd:
        parts      = (matched.get("id") or "NKS-2024-001").split("-")
        stored_pwd = f"nks{''.join(parts[1:])}"

    if password != stored_pwd.strip():
        return jsonify({
            "success": False,
            "error": "Kata sandi nakes salah. Format default: nks{tahun}{urutan}, contoh nks2026001.",
        }), 401

    return jsonify({
        "success": True,
        "message": f"Selamat datang, {matched.get('name')}!",
        "user": {
            "uid":         matched.get("id"),
            "name":        matched.get("name"),
            "displayName": matched.get("name"),
            "email":       matched.get("nakes_email"),
            "real_email":  matched.get("real_email"),
            "role":        "Nakes",
            "profession":  matched.get("profession"),
            "str_number":  matched.get("str_number"),
            "sip_number":  matched.get("sip_number"),
            "institution": matched.get("institution"),
            "phone":       matched.get("phone"),
            "status":      matched.get("status"),
        },
    })
