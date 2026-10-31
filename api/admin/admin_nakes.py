"""
api/admin/admin_nakes.py
=========================
Admin Nakes Management routes:
  GET    /api/admin/nakes            — Daftar semua nakes terdaftar
  POST   /api/admin/nakes            — Tambah nakes baru (auto-generate ID & email @neura.ns.id)
  DELETE /api/admin/nakes/<nakes_id> — Hapus nakes berdasarkan ID
"""

import re
import time
import random
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

admin_nakes_bp = Blueprint("admin_nakes", __name__)

# -----------------------------------------------------------------------
# Database file path
# -----------------------------------------------------------------------
NAKES_DB_FILE = Path(__file__).resolve().parent.parent.parent / "datasets" / "nakes_directory.json"


def _load_nakes_db():
    """Baca database nakes dari JSON. Kembalikan list kosong jika file tidak ada."""
    if not NAKES_DB_FILE.exists():
        return []
    try:
        with open(NAKES_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Gagal membaca nakes_directory.json: {e}")
        return []


def _save_nakes_db(data):
    """Simpan database nakes ke JSON. Kembalikan True jika berhasil."""
    try:
        NAKES_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(NAKES_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Gagal menyimpan nakes_directory.json: {e}")
        return False


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@admin_nakes_bp.route("/nakes", methods=["GET"])
def api_get_nakes():
    """Mengambil seluruh data tenaga kesehatan profesional terdaftar."""
    items = _load_nakes_db()
    return jsonify({"success": True, "data": items, "total": len(items)})


@admin_nakes_bp.route("/nakes", methods=["POST"])
def api_create_nakes():
    """
    Menambah data tenaga kesehatan profesional baru.
    Auto-generate ID (NKS-YYYY-NNN) dan email @neura.ns.id jika belum diisi.
    """
    body = request.get_json(silent=True) or {}

    name        = (body.get("name") or "").strip()
    profession  = (body.get("profession") or "Dokter Spesialis Neurologi (Sp.N)").strip()
    str_number  = (body.get("str_number") or "").strip()
    sip_number  = (body.get("sip_number") or "").strip()
    institution = (body.get("institution") or "").strip()
    phone       = (body.get("phone") or "").strip()
    real_email  = (body.get("real_email") or "").strip().lower()
    nakes_email = (body.get("nakes_email") or "").strip().lower()
    status      = (body.get("status") or "Terverifikasi KKI").strip()

    if not name:
        return jsonify({"success": False, "error": "Nama lengkap nakes beserta gelar wajib diisi."}), 400
    if not real_email or "@" not in real_email:
        return jsonify({"success": False, "error": "Email asli (pribadi) yang valid wajib diisi."}), 400

    # Auto-generate domain @neura.ns.id jika belum valid
    if not nakes_email or not nakes_email.endswith("@neura.ns.id"):
        username   = real_email.split("@")[0].strip()
        clean_user = re.sub(r"[^a-zA-Z0-9._-]", "", username) or "nakes"
        nakes_email = f"{clean_user}@neura.ns.id"

    items = _load_nakes_db()

    # Cek duplikasi email nakes
    for item in items:
        if item.get("nakes_email", "").lower() == nakes_email:
            return jsonify({"success": False, "error": f"Email nakes {nakes_email} sudah terdaftar."}), 400

    new_id    = f"NKS-{time.strftime('%Y')}-{len(items) + 1:03d}"
    id_parts  = new_id.split("-")           # ['NKS', '2026', '001']
    default_pwd = f"nks{''.join(id_parts[1:])}"   # nks2026001
    password  = (body.get("password") or "").strip() or default_pwd

    record = {
        "id":          new_id,
        "name":        name,
        "profession":  profession,
        "str_number":  str_number or (
            f"{random.randint(10,99)}.{random.randint(1,9)}.{random.randint(1,9)}."
            f"{random.randint(100,999)}.{random.randint(1,9)}.{random.randint(20,26)}."
            f"{random.randint(100000,999999)}"
        ),
        "sip_number":  sip_number or f"503/SIP/{random.randint(100,999)}/Dinkes/{time.strftime('%Y')}",
        "institution": institution or "Fasilitas Kesehatan Mitra Neura",
        "phone":       phone,
        "real_email":  real_email,
        "nakes_email": nakes_email,
        "password":    password,
        "status":      status,
        "created_at":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    items.insert(0, record)
    _save_nakes_db(items)

    return jsonify({
        "success": True,
        "message": "Data tenaga kesehatan profesional berhasil disimpan.",
        "data":    record,
    }), 201


@admin_nakes_bp.route("/nakes/<nakes_id>", methods=["PUT", "PATCH"])
def api_update_nakes(nakes_id):
    """
    Memperbarui data tenaga kesehatan profesional oleh Administrator.
    Mendukung pengubahan nama, profesi, STR, SIP, faskes, email, kata sandi, dan status.
    """
    body = request.get_json(silent=True) or {}
    items = _load_nakes_db()
    matched = None
    for item in items:
        if item.get("id") == nakes_id:
            matched = item
            break

    if not matched:
        return jsonify({"success": False, "error": f"Data nakes {nakes_id} tidak ditemukan."}), 404

    # Update field yang diberikan
    fields = [
        "name", "profession", "str_number", "sip_number",
        "institution", "phone", "real_email", "nakes_email",
        "password", "status", "bio"
    ]
    for key in fields:
        if key in body and body[key] is not None:
            val = str(body[key]).strip()
            if key in ["real_email", "nakes_email"]:
                val = val.lower()
            matched[key] = val

    matched["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _save_nakes_db(items)
    logger.info(f"[Admin Nakes] Nakes {nakes_id} ({matched.get('name')}) berhasil diperbarui oleh Admin.")

    return jsonify({
        "success": True,
        "message": f"Data nakes {nakes_id} ({matched.get('name')}) berhasil diperbarui.",
        "data": matched
    })


@admin_nakes_bp.route("/nakes/<nakes_id>", methods=["DELETE"])
def api_delete_nakes(nakes_id):
    """Menghapus data tenaga kesehatan berdasarkan ID."""
    items        = _load_nakes_db()
    original_len = len(items)
    items        = [it for it in items if it.get("id") != nakes_id]

    if len(items) == original_len:
        return jsonify({"success": False, "error": "Data nakes tidak ditemukan."}), 404

    _save_nakes_db(items)
    return jsonify({"success": True, "message": f"Data nakes {nakes_id} berhasil dihapus."})

