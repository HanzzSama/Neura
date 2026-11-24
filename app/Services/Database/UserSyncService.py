"""
app/Services/Database/UserSyncService.py
========================================
Service for synchronizing Admin, Nakes, and User authentication records
directly into the relational MySQL database `neura_db.users` (InnoDB).
Ensures data persistence across all authentication methods (Email, Google OAuth, Admin 2FA).
"""

import secrets
from typing import Any, Dict, List, Optional, Tuple
from werkzeug.security import generate_password_hash, check_password_hash

from app.Services.Database.DatabaseManager import (
    execute_query,
    execute_one,
    execute_insert,
    execute_update,
    is_mysql_available,
)
from app.Services.Logger.LoggerService import get_logger

logger = get_logger("neura.usersync")


def normalize_role(role: Optional[str]) -> str:
    """Menstandarkan role sesuai ENUM('User', 'Nakes', 'Admin') di MySQL schema."""
    r = (role or "").strip().lower()
    if r == "admin":
        return "Admin"
    elif r == "nakes":
        return "Nakes"
    return "User"


def is_admin_email(email: str) -> bool:
    """Mengecek apakah email terdaftar sebagai admin (custom atau real)."""
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return False
    try:
        from config.admin import ADMIN_ACCOUNTS, get_admin_by_custom_email
        if get_admin_by_custom_email(email_clean):
            return True
        for _, data in ADMIN_ACCOUNTS.items():
            for re in data.get("real_emails", []):
                if re.strip().lower() == email_clean:
                    return True
    except Exception:
        pass
    return False


def is_nakes_email(email: str) -> bool:
    """Mengecek apakah email terdaftar sebagai Nakes."""
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return False
    if email_clean.endswith("@neura.ns.id"):
        return True
    try:
        from app.Http.Controllers.Nakes.nakes_auth import _load_nakes_db
        for item in _load_nakes_db():
            if (
                item.get("nakes_email", "").strip().lower() == email_clean
                or item.get("real_email", "").strip().lower() == email_clean
            ):
                return True
    except Exception:
        pass
    return False


def sync_user_to_db(
    email: str,
    full_name: Optional[str] = None,
    role: Optional[str] = None,
    password: Optional[str] = None,
    avatar_url: Optional[str] = None,
    phone: Optional[str] = None,
    provider: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sinkronisasi akun pengguna (User, Nakes, Admin) ke tabel MySQL `users`.
    Jika belum ada -> INSERT.
    Jika sudah ada -> UPDATE identitas, avatar, dan data terbaru.
    """
    email_clean = (email or "").strip().lower()
    if not email_clean:
        return {"success": False, "error": "Email wajib diisi."}

    # Cek ketersediaan MySQL
    ok, err_msg = is_mysql_available()
    if not ok:
        logger.warning(f"[UserSync] MySQL tidak dapat dihubungi: {err_msg}. Melakukan fallback sesi in-memory.")
        return {
            "success": True,
            "is_fallback": True,
            "email": email_clean,
            "full_name": full_name or email_clean.split("@")[0].capitalize(),
            "role": normalize_role(role),
            "avatar_url": avatar_url,
            "phone": phone,
        }

    # Tentukan role yang tepat
    if is_admin_email(email_clean):
        target_role = "Admin"
    elif is_nakes_email(email_clean):
        target_role = "Nakes"
    else:
        target_role = normalize_role(role)

    # Nama default jika kosong
    target_name = (full_name or "").strip()
    if not target_name:
        target_name = email_clean.split("@")[0].replace(".", " ").title()

    try:
        existing = execute_one("SELECT * FROM `users` WHERE `email` = %s LIMIT 1;", (email_clean,))
        if existing:
            # Proteksi hak akses role Admin
            current_db_role = existing.get("role", "User")
            if current_db_role == "Admin":
                final_role = "Admin"
            elif current_db_role == "Nakes" and target_role == "User":
                final_role = "Nakes"
            else:
                final_role = target_role

            final_name = target_name or existing.get("full_name") or "User"
            final_avatar = avatar_url if (avatar_url and avatar_url.strip()) else existing.get("avatar_url")
            final_phone = phone if (phone and phone.strip()) else existing.get("phone")

            # Update password jika diberikan
            if password and password.strip():
                final_pwd_hash = generate_password_hash(password.strip())
            else:
                final_pwd_hash = existing.get("password_hash") or generate_password_hash("oauth_" + secrets.token_hex(16))

            execute_update(
                """
                UPDATE `users`
                SET `full_name` = %s,
                    `avatar_url` = %s,
                    `phone` = %s,
                    `role` = %s,
                    `password_hash` = %s,
                    `updated_at` = NOW()
                WHERE `id` = %s;
                """,
                (final_name, final_avatar, final_phone, final_role, final_pwd_hash, existing["id"]),
            )

            # Dual write ke patient_profiles & oauth_identities V2
            try:
                execute_update("""
                    INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `avatar_url`)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        `full_name` = VALUES(`full_name`),
                        `phone` = VALUES(`phone`),
                        `avatar_url` = VALUES(`avatar_url`);
                """, (existing["id"], final_name, final_phone, final_avatar))
                if provider == "google":
                    execute_update("""
                        INSERT INTO `oauth_identities` (`user_id`, `provider`, `provider_uid`, `provider_email`, `last_login_at`)
                        VALUES (%s, 'google', %s, %s, CURRENT_TIMESTAMP)
                        ON DUPLICATE KEY UPDATE `last_login_at` = CURRENT_TIMESTAMP;
                    """, (existing["id"], f"google_{email_clean}", email_clean))
            except Exception:
                pass

            logger.info(f"[UserSync] Berhasil memperbarui user di MySQL: id={existing['id']}, email={email_clean}, role={final_role}")
            return {
                "success": True,
                "id": existing["id"],
                "email": email_clean,
                "full_name": final_name,
                "role": final_role,
                "avatar_url": final_avatar,
                "phone": final_phone,
                "action": "updated",
            }
        else:
            # Buat akun baru
            if password and password.strip():
                new_pwd_hash = generate_password_hash(password.strip())
            else:
                # Akun Google OAuth atau Admin OTP tanpa password lokal
                new_pwd_hash = generate_password_hash("oauth_" + secrets.token_hex(20))

            new_id = execute_insert(
                """
                INSERT INTO `users` (`email`, `password_hash`, `full_name`, `phone`, `role`, `avatar_url`)
                VALUES (%s, %s, %s, %s, %s, %s);
                """,
                (email_clean, new_pwd_hash, target_name, phone or None, target_role, avatar_url or None),
            )

            # Dual write ke patient_profiles & oauth_identities V2
            try:
                execute_update("""
                    INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `avatar_url`)
                    VALUES (%s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        `full_name` = VALUES(`full_name`),
                        `phone` = VALUES(`phone`),
                        `avatar_url` = VALUES(`avatar_url`);
                """, (new_id, target_name, phone or None, avatar_url or None))
                if provider == "google":
                    execute_update("""
                        INSERT INTO `oauth_identities` (`user_id`, `provider`, `provider_uid`, `provider_email`, `last_login_at`)
                        VALUES (%s, 'google', %s, %s, CURRENT_TIMESTAMP)
                        ON DUPLICATE KEY UPDATE `last_login_at` = CURRENT_TIMESTAMP;
                    """, (new_id, f"google_{email_clean}", email_clean))
            except Exception:
                pass

            logger.info(f"[UserSync] Berhasil menyimpan user baru ke MySQL: id={new_id}, email={email_clean}, role={target_role}")
            return {
                "success": True,
                "id": new_id,
                "email": email_clean,
                "full_name": target_name,
                "role": target_role,
                "avatar_url": avatar_url,
                "phone": phone,
                "action": "created",
            }
    except Exception as e:
        logger.error(f"[UserSync] Gagal menyimpan user {email_clean} ke MySQL: {e}")
        return {
            "success": False,
            "error": str(e),
            "email": email_clean,
            "full_name": target_name,
            "role": target_role,
        }


def sync_admin_to_db(
    email: str,
    full_name: Optional[str] = None,
    real_emails: Optional[List[str]] = None,
    phone: Optional[str] = None,
    avatar_url: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Sinkronisasi admin (custom email & seluruh real emails) ke MySQL neura_db.users."""
    results = []
    # 1. Custom admin email
    res1 = sync_user_to_db(
        email=email,
        full_name=full_name or "Administrator",
        role="Admin",
        avatar_url=avatar_url,
        phone=phone,
    )
    results.append(res1)

    # 2. Seluruh real emails terkait
    if real_emails:
        for r_email in real_emails:
            if r_email and r_email.strip() and r_email.strip().lower() != email.strip().lower():
                res_r = sync_user_to_db(
                    email=r_email.strip(),
                    full_name=full_name or "Administrator",
                    role="Admin",
                    avatar_url=avatar_url,
                    phone=phone,
                )
                results.append(res_r)
    return results


def seed_default_admins_and_users() -> int:
    """
    Mengisi otomatis seluruh akun Admin dari config/admin.py
    dan Nakes dari datasets/nakes_directory.json ke dalam MySQL neura_db.users.
    """
    ok, _ = is_mysql_available()
    if not ok:
        logger.warning("[UserSync] MySQL belum siap untuk seeding default accounts.")
        return 0

    count = 0
    # 1. Admins
    try:
        from config.admin import ADMIN_ACCOUNTS
        for admin_email, data in ADMIN_ACCOUNTS.items():
            sync_admin_to_db(
                email=admin_email,
                full_name=data.get("name", "Administrator"),
                real_emails=data.get("real_emails", []),
            )
            count += 1
    except Exception as e:
        logger.warning(f"[UserSync] Gagal seeding akun admin: {e}")

    # 2. Nakes
    try:
        from app.Http.Controllers.Nakes.nakes_auth import _load_nakes_db
        nakes_list = _load_nakes_db()
        for item in nakes_list:
            if item.get("nakes_email"):
                sync_user_to_db(
                    email=item.get("nakes_email"),
                    full_name=item.get("name"),
                    role="Nakes",
                    phone=item.get("phone"),
                )
                count += 1
            if item.get("real_email"):
                sync_user_to_db(
                    email=item.get("real_email"),
                    full_name=item.get("name"),
                    role="Nakes",
                    phone=item.get("phone"),
                )
                count += 1
    except Exception as e:
        logger.warning(f"[UserSync] Gagal seeding akun nakes: {e}")

    logger.info(f"[UserSync] Berhasil mensinkronisasi {count} akun default ke MySQL neura_db.users.")
    return count
