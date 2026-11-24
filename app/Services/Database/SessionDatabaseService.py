"""
app/Services/Database/SessionDatabaseService.py
===============================================
MySQL-backed Session, 2FA OTP, Notification & Audit Trail Service for Neura AI.
Ensures zero data loss across server restarts and provides persistent compliance logging.
"""

import time
import json
from typing import Any, Dict, List, Optional, Tuple
from app.Services.Database.DatabaseManager import (
    execute_query,
    execute_one,
    execute_insert,
    execute_update,
    is_mysql_available,
)
from app.Services.Logger.LoggerService import get_logger

logger = get_logger("neura.session_db")


# -----------------------------------------------------------------------------
# 1. AUTH SESSIONS (Database-backed Session Store)
# -----------------------------------------------------------------------------

def save_auth_session(
    token: str,
    user_id: int,
    role: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    lifetime_sec: int = 86400 * 30,  # 30 hari (Remember Me)
) -> bool:
    """Menyimpan sesi login pengguna ke tabel auth_sessions di MySQL."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        now = time.time()
        expires_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now + lifetime_sec))
        payload_str = json.dumps(payload or {})

        execute_update("""
            INSERT INTO `auth_sessions` (`session_token`, `user_id`, `role`, `ip_address`, `user_agent`, `payload`, `expires_at`)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `payload` = VALUES(`payload`),
                `ip_address` = VALUES(`ip_address`),
                `user_agent` = VALUES(`user_agent`),
                `expires_at` = VALUES(`expires_at`),
                `last_activity_at` = CURRENT_TIMESTAMP;
        """, (token, user_id, role, ip_address, (user_agent or "")[:250], payload_str, expires_time))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal menyimpan sesi ke MySQL: {e}")
        return False


def get_auth_session(token: str) -> Optional[Dict[str, Any]]:
    """Memvalidasi dan mengambil sesi aktif dari tabel auth_sessions."""
    ok, _ = is_mysql_available()
    if not ok:
        return None
    try:
        row = execute_one("""
            SELECT s.*, u.email, u.full_name
            FROM `auth_sessions` s
            JOIN `users` u ON u.id = s.user_id
            WHERE s.session_token = %s AND s.expires_at > CURRENT_TIMESTAMP
            LIMIT 1;
        """, (token,))
        if not row:
            return None
        payload = {}
        if row.get("payload"):
            try:
                payload = json.loads(row["payload"])
            except Exception:
                pass
        return {
            "token": row["session_token"],
            "user_id": row["user_id"],
            "email": row["email"],
            "name": row["full_name"],
            "role": row["role"],
            "payload": payload,
            "expires_at": str(row["expires_at"]),
        }
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal memvalidasi sesi dari MySQL: {e}")
        return None


def delete_auth_session(token: str) -> bool:
    """Menghapus sesi dari tabel auth_sessions saat logout."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        execute_update("DELETE FROM `auth_sessions` WHERE `session_token` = %s;", (token,))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal menghapus sesi: {e}")
        return False


def touch_auth_session(
    token: str,
    current_page: Optional[str] = None,
    page_title: Optional[str] = None,
    canvas_view: Optional[str] = None,
    action: Optional[str] = None,
) -> bool:
    """Memperbarui last_activity_at dan data halaman terkini di tabel auth_sessions MySQL."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        row = execute_one("SELECT `payload` FROM `auth_sessions` WHERE `session_token` = %s LIMIT 1;", (token,))
        payload = {}
        if row and row.get("payload"):
            try:
                payload = json.loads(row["payload"])
            except Exception:
                pass
        if current_page:
            payload["current_page"] = current_page
        if page_title:
            payload["page_title"] = page_title
        if canvas_view:
            payload["canvas_view"] = canvas_view
        if action:
            payload["action"] = action
        payload["last_seen_ts"] = time.time()

        execute_update("""
            UPDATE `auth_sessions`
            SET `payload` = %s, `last_activity_at` = CURRENT_TIMESTAMP
            WHERE `session_token` = %s;
        """, (json.dumps(payload), token))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal touch sesi di MySQL: {e}")
        return False


def get_all_active_admin_sessions() -> List[Dict[str, Any]]:
    """Mengambil seluruh sesi admin aktif dari tabel auth_sessions MySQL dengan profil lengkap."""
    ok, _ = is_mysql_available()
    if not ok:
        return []
    try:
        rows = execute_query("""
            SELECT 
                s.`session_token`,
                s.`user_id`,
                s.`role`,
                s.`ip_address`,
                s.`user_agent`,
                s.`payload`,
                s.`last_activity_at`,
                s.`expires_at`,
                u.`email`,
                u.`full_name`,
                u.`avatar_url`,
                ap.`department`,
                ap.`custom_email`
            FROM `auth_sessions` s
            JOIN `users` u ON u.`id` = s.`user_id`
            LEFT JOIN `admin_profiles` ap ON ap.`user_id` = u.`id`
            WHERE s.`role` = 'Admin' AND s.`expires_at` > CURRENT_TIMESTAMP
            ORDER BY s.`last_activity_at` DESC;
        """)
        results = []
        for r in rows:
            payload = {}
            if r.get("payload"):
                try:
                    payload = json.loads(r["payload"])
                except Exception:
                    pass
            results.append({
                "session_token": r["session_token"],
                "user_id": r["user_id"],
                "role": r["role"],
                "ip_address": r["ip_address"],
                "user_agent": r["user_agent"],
                "payload": payload,
                "last_activity_at": r["last_activity_at"],
                "expires_at": r["expires_at"],
                "email": r["email"],
                "full_name": r["full_name"],
                "avatar_url": r["avatar_url"],
                "department": r.get("department") or "System Architecture & AI Engineering",
                "custom_email": r.get("custom_email") or r["email"],
            })
        return results
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal get_all_active_admin_sessions: {e}")
        return []


# -----------------------------------------------------------------------------
# 2. AUTH OTP CODES (Database-backed 2FA OTP Store)
# -----------------------------------------------------------------------------

def save_auth_otp(
    identifier: str,
    otp_code: str,
    purpose: str = "ADMIN_2FA",
    expires_sec: int = 300,
) -> bool:
    """Menyimpan kode OTP 2FA ke tabel auth_otp_codes."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        ident_clean = identifier.strip().lower()
        now = time.time()
        expires_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now + expires_sec))

        # Batalkan OTP lama yang belum dikonsumsi untuk identifier & purpose ini
        execute_update("""
            UPDATE `auth_otp_codes`
            SET `consumed_at` = CURRENT_TIMESTAMP
            WHERE `identifier` = %s AND `purpose` = %s AND `consumed_at` IS NULL;
        """, (ident_clean, purpose))

        execute_insert("""
            INSERT INTO `auth_otp_codes` (`identifier`, `otp_code`, `purpose`, `expires_at`)
            VALUES (%s, %s, %s, %s);
        """, (ident_clean, otp_code, purpose, expires_time))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal menyimpan OTP ke MySQL: {e}")
        return False


def verify_auth_otp(
    identifier: str,
    input_otp: str,
    purpose: str = "ADMIN_2FA",
) -> Tuple[bool, str]:
    """Memverifikasi kode OTP dari tabel auth_otp_codes."""
    ok, _ = is_mysql_available()
    if not ok:
        return False, "MySQL tidak tersedia."
    try:
        ident_clean = identifier.strip().lower()
        row = execute_one("""
            SELECT * FROM `auth_otp_codes`
            WHERE `identifier` = %s AND `purpose` = %s AND `consumed_at` IS NULL
            ORDER BY `id` DESC LIMIT 1;
        """, (ident_clean, purpose))

        if not row:
            return False, "Kode OTP belum diminta atau sudah kedaluwarsa."

        # Cek batas percobaan
        if row["attempts"] >= row["max_attempts"]:
            execute_update("UPDATE `auth_otp_codes` SET `consumed_at` = CURRENT_TIMESTAMP WHERE `id` = %s;", (row["id"],))
            return False, "Batas percobaan OTP terlampaui. Silakan minta kode baru."

        # Cek kecocokan kode
        if str(row["otp_code"]).strip() != str(input_otp).strip():
            execute_update("UPDATE `auth_otp_codes` SET `attempts` = `attempts` + 1 WHERE `id` = %s;", (row["id"],))
            sisa = max(0, row["max_attempts"] - (row["attempts"] + 1))
            return False, f"Kode OTP salah. Sisa kesempatan: {sisa} kali."

        # Tandai OTP telah dikonsumsi (sekali pakai)
        execute_update("UPDATE `auth_otp_codes` SET `consumed_at` = CURRENT_TIMESTAMP WHERE `id` = %s;", (row["id"],))
        return True, "Verifikasi OTP berhasil."
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal verifikasi OTP di MySQL: {e}")
        return False, str(e)


# -----------------------------------------------------------------------------
# 3. AUDIT TRAIL LOGGING (Permenkes RME Compliance)
# -----------------------------------------------------------------------------

def record_audit_log(
    actor_email: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    actor_user_id: Optional[int] = None,
) -> bool:
    """Mencatat rekam jejak audit mutasi data & autentikasi ke tabel audit_logs."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        details_str = json.dumps(details or {})
        execute_insert("""
            INSERT INTO `audit_logs` (`actor_user_id`, `actor_email`, `action`, `entity_type`, `entity_id`, `ip_address`, `user_agent`, `details`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            actor_user_id,
            actor_email or "system",
            action,
            entity_type,
            str(entity_id) if entity_id else None,
            ip_address,
            (user_agent or "")[:250],
            details_str,
        ))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal mencatat audit log: {e}")
        return False


# -----------------------------------------------------------------------------
# 4. SYSTEM NOTIFICATIONS
# -----------------------------------------------------------------------------

def save_system_notification(
    title: str,
    body: str,
    target_role: str = "ALL",
    target_user_id: Optional[int] = None,
    category: str = "SYSTEM",
    urgency: str = "NORMAL",
    action_url: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> bool:
    """Menyimpan notifikasi sistem ke tabel system_notifications."""
    ok, _ = is_mysql_available()
    if not ok:
        return False
    try:
        meta_str = json.dumps(metadata or {})
        execute_insert("""
            INSERT INTO `system_notifications` (`target_user_id`, `target_role`, `title`, `body`, `category`, `urgency`, `action_url`, `metadata`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            target_user_id,
            target_role.upper(),
            title[:150],
            body,
            category.upper(),
            urgency.upper(),
            action_url,
            meta_str,
        ))
        return True
    except Exception as e:
        logger.warning(f"[SessionDB] Gagal menyimpan notifikasi sistem: {e}")
        return False
