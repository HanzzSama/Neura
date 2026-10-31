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


def _save_nakes_db(data):
    """Simpan perubahan data nakes ke file JSON."""
    try:
        NAKES_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(NAKES_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Gagal menyimpan nakes_directory.json: {e}")
        return False


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


@nakes_auth_bp.route("/update-profile", methods=["POST", "PUT"])
def api_nakes_update_profile():
    """
    Update profil mandiri tenaga kesehatan (nama, instansi, telepon, bio, dsb)
    dari modal Edit Profil di halaman app.
    """
    import time
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    nakes_id = (body.get("id") or "").strip()
    name = (body.get("name") or "").strip()
    institution = (body.get("institution") or "").strip()
    phone = (body.get("phone") or "").strip()
    bio = (body.get("bio") or "").strip()
    profession = (body.get("profession") or "").strip()

    if not email and not nakes_id:
        return jsonify({"success": False, "error": "Email atau ID Nakes wajib disertakan."}), 400
    if not name:
        return jsonify({"success": False, "error": "Nama lengkap tidak boleh kosong."}), 400

    items = _load_nakes_db()
    updated_item = None
    for item in items:
        if (nakes_id and item.get("id") == nakes_id) or (
            email and (
                item.get("nakes_email", "").lower() == email
                or item.get("real_email", "").lower() == email
            )
        ):
            item["name"] = name
            if institution:
                item["institution"] = institution
            if phone:
                item["phone"] = phone
            if bio:
                item["bio"] = bio
            if profession:
                item["profession"] = profession
            item["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            updated_item = item
            break

    if not updated_item:
        return jsonify({"success": False, "error": "Data nakes tidak ditemukan di direktori."}), 404

    _save_nakes_db(items)
    logger.info(f"[Nakes Profile] Profil {updated_item.get('id')} ({name}) berhasil diperbarui.")

    return jsonify({
        "success": True,
        "message": "Profil tenaga kesehatan berhasil diperbarui.",
        "data": updated_item,
        "user": {
            "uid":         updated_item.get("id"),
            "name":        updated_item.get("name"),
            "displayName": updated_item.get("name"),
            "email":       updated_item.get("nakes_email"),
            "real_email":  updated_item.get("real_email"),
            "role":        "Nakes",
            "profession":  updated_item.get("profession"),
            "institution": updated_item.get("institution"),
            "phone":       updated_item.get("phone"),
            "status":      updated_item.get("status"),
        }
    })


@nakes_auth_bp.route("/update-password", methods=["POST"])
def api_nakes_update_password():
    """
    Update kata sandi login tenaga kesehatan dari form ganti sandi di app.
    Memverifikasi kecocokan sandi lama sebelum mengubah ke sandi baru.
    """
    import time
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    nakes_id = (body.get("id") or "").strip()
    old_password = str(body.get("old_password") or "").strip()
    new_password = str(body.get("new_password") or "").strip()

    if not email and not nakes_id:
        return jsonify({"success": False, "error": "Email atau ID Nakes wajib disertakan."}), 400
    if not old_password:
        return jsonify({"success": False, "error": "Kata sandi saat ini wajib diisi."}), 400
    if not new_password or len(new_password) < 6:
        return jsonify({"success": False, "error": "Kata sandi baru minimal 6 karakter."}), 400

    items = _load_nakes_db()
    updated_item = None
    for item in items:
        if (nakes_id and item.get("id") == nakes_id) or (
            email and (
                item.get("nakes_email", "").lower() == email
                or item.get("real_email", "").lower() == email
            )
        ):
            stored_pwd = item.get("password") or ""
            if not stored_pwd:
                parts = (item.get("id") or "NKS-2024-001").split("-")
                stored_pwd = f"nks{''.join(parts[1:])}"

            if old_password != stored_pwd.strip():
                return jsonify({"success": False, "error": "Kata sandi saat ini yang Anda masukkan salah."}), 401

            item["password"] = new_password
            item["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            updated_item = item
            break

    if not updated_item:
        return jsonify({"success": False, "error": "Data nakes tidak ditemukan di direktori."}), 404

    _save_nakes_db(items)
    logger.info(f"[Nakes Password] Kata sandi {updated_item.get('id')} ({updated_item.get('name')}) berhasil diubah.")

    return jsonify({
        "success": True,
        "message": "Kata sandi Nakes berhasil diperbarui. Silakan gunakan kata sandi baru untuk login berikutnya."
    })
