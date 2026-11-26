"""
api/nakes/nakes_auth.py
========================
Nakes Authentication route:
  POST /api/nakes/login — Login dengan email @neura.ns.id / email asli + password
"""

from flask import Blueprint, request, jsonify
from app.Services.Logger.LoggerService import get_logger
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

    # Inisialisasi sesi HTTPOnly cookie server untuk nakes (Remember Me: 30 hari aktif)
    try:
        from app.Http.Controllers.Shared.session_middleware import set_user_session
        set_user_session(
            uid=matched.get("id"),
            email=matched.get("nakes_email"),
            name=matched.get("name"),
            role="Nakes",
        )
    except Exception as sess_err:
        logger.warning(f"[NakesAuth] Gagal set user session: {sess_err}")

    # Sinkronisasi nakes ke database MySQL neura_db.users
    try:
        from app.Services.Database.UserSyncService import sync_user_to_db
        sync_user_to_db(
            email=matched.get("nakes_email"),
            full_name=matched.get("name"),
            role="Nakes",
            phone=matched.get("phone"),
            provider="password",
        )
        if matched.get("real_email"):
            sync_user_to_db(
                email=matched.get("real_email"),
                full_name=matched.get("name"),
                role="Nakes",
                phone=matched.get("phone"),
                provider="password",
            )
    except Exception as sync_err:
        logger.warning(f"[NakesAuth] Gagal sinkronisasi nakes ke MySQL: {sync_err}")

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


# -----------------------------------------------------------------------
# Public QR Invite Session & Self-Registration Endpoints
# -----------------------------------------------------------------------

@nakes_auth_bp.route("/qr-session", methods=["GET"])
def api_nakes_qr_session():
    """Mengambil sesi QR & kode unik 3-menit berdasarkan parameter ?live=."""
    from app.Services.NakesInviteService import get_qr_session
    live_id = (request.args.get("live") or "").strip()
    session_data = get_qr_session(live_id)
    base = (request.host_url or "").rstrip("/")
    register_url = (
        f"{base}/nakes/register?code={session_data['code']}"
        if session_data.get("active") and session_data.get("code")
        else ""
    )
    return jsonify({
        "success": True,
        "data": {
            **session_data,
            "register_url": register_url,
        },
    })


@nakes_auth_bp.route("/invite/verify", methods=["GET"])
def api_nakes_invite_verify():
    """Memverifikasi apakah kode undangan 3-menit masih aktif dan valid."""
    from app.Services.NakesInviteService import verify_invite_code
    code = (request.args.get("code") or "").strip()
    result = verify_invite_code(code)
    return jsonify({
        "success": True,
        "data": result,
    })


@nakes_auth_bp.route("/register", methods=["POST"])
def api_nakes_self_register():
    """
    Registrasi mandiri Nakes melalui QR Code / kode undangan 3-menit.
    Membuat akun Nakes baru di direktori (JSON + MySQL) setelah memvalidasi kode.
    """
    import re
    import time
    import random
    from app.Services.NakesInviteService import verify_invite_code, increment_registration_count

    body = request.get_json(silent=True) or {}
    invite_code = (body.get("invite_code") or body.get("code") or "").strip()
    verification = verify_invite_code(invite_code)
    if not verification.get("valid"):
        return jsonify({
            "success": False,
            "error": verification.get("reason") or "Kode undangan tidak valid atau telah kedaluwarsa.",
        }), 403

    name        = (body.get("name") or "").strip()
    profession  = (body.get("profession") or "Dokter Spesialis Neurologi (Sp.N)").strip()
    str_number  = (body.get("str_number") or "").strip()
    sip_number  = (body.get("sip_number") or "").strip()
    institution = (body.get("institution") or "").strip()
    phone       = (body.get("phone") or "").strip()
    real_email  = (body.get("real_email") or "").strip().lower()
    custom_pwd  = str(body.get("password") or "").strip()

    if not name:
        return jsonify({"success": False, "error": "Nama lengkap beserta gelar wajib diisi."}), 400
    if not real_email or "@" not in real_email:
        return jsonify({"success": False, "error": "Email pribadi yang valid wajib diisi."}), 400
    if not str_number:
        return jsonify({"success": False, "error": "Nomor STR wajib diisi untuk verifikasi klinis."}), 400
    if not institution:
        return jsonify({"success": False, "error": "Nama instansi / faskes wajib diisi."}), 400
    if custom_pwd and len(custom_pwd) < 6:
        return jsonify({"success": False, "error": "Kata sandi minimal 6 karakter."}), 400

    username   = real_email.split("@")[0].strip()
    clean_user = re.sub(r"[^a-zA-Z0-9._-]", "", username) or "nakes"
    nakes_email = f"{clean_user}@neura.ns.id"

    items = _load_nakes_db()
    for item in items:
        if item.get("real_email", "").lower() == real_email:
            return jsonify({"success": False, "error": f"Email {real_email} sudah terdaftar di direktori Nakes."}), 400
        if item.get("nakes_email", "").lower() == nakes_email:
            nakes_email = f"{clean_user}.{random.randint(10, 99)}@neura.ns.id"

    new_id = f"NKS-{time.strftime('%Y')}-{len(items) + 1:03d}"
    id_parts = new_id.split("-")
    default_pwd = f"nks{''.join(id_parts[1:])}"
    password = custom_pwd or default_pwd

    record = {
        "id":          new_id,
        "name":        name,
        "profession":  profession,
        "str_number":  str_number,
        "sip_number":  sip_number or f"503/SIP/{random.randint(100,999)}/Dinkes/{time.strftime('%Y')}",
        "institution": institution,
        "phone":       phone,
        "real_email":  real_email,
        "nakes_email": nakes_email,
        "password":    password,
        "status":      "Terverifikasi KKI",
        "registered_via": "QR-INVITE",
        "created_at":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    items.insert(0, record)
    _save_nakes_db(items)

    try:
        from app.Services.Database.DatabaseManager import execute_insert
        if execute_insert:
            execute_insert(
                "INSERT INTO nakes (sip, str, nip, full_name, specialization, facility_name, phone_number, email, status_validation) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE') "
                "ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), facility_name=VALUES(facility_name)",
                (record["sip_number"], record["str_number"], record["id"], record["name"], record["profession"], record["institution"], record["phone"], record["nakes_email"])
            )
    except Exception as e:
        logger.warning(f"MySQL self-register nakes warning: {e}")

    increment_registration_count()
    logger.info(f"[Nakes Register] Nakes baru {new_id} ({name}) terdaftar via QR invite.")

    return jsonify({
        "success": True,
        "message": "Registrasi Nakes berhasil. Kredensial akses telah dibuat.",
        "data": {
            "id":          record["id"],
            "name":        record["name"],
            "profession":  record["profession"],
            "institution": record["institution"],
            "nakes_email": record["nakes_email"],
            "password":    record["password"],
            "status":      record["status"],
        },
    }), 201

