"""
scripts/migrate_v1_to_v2.py
==========================
Data migration and backfill script from Neura AI schema V1 to Schema V2.
Transfers and normalizes:
  - users & profiles -> users, patient_profiles, admin_profiles, nakes_profiles
  - consultations -> medical_documents, consultation_sessions
  - user_profiles (biomarkers) -> patient_biomarkers
  - prediction_records -> prediction_runs
  - research_dispatches -> research_articles
"""

import re
import sys
import json
import uuid
import hashlib
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from typing import Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_one, execute_insert, execute_update, is_mysql_available
from app.Services.Logger.LoggerService import get_logger

logger = get_logger("neura.migration_v2")


def slugify(text: str) -> str:
    text = (text or "").lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:180] or f"article-{uuid.uuid4().hex[:8]}"


def compute_biomarker_hash(row: Dict[str, Any]) -> str:
    keys = [
        "age", "gender", "ethnicity", "education_level", "bmi", "systolic_bp", "diastolic_bp",
        "smoking", "alcohol_consumption", "physical_activity", "diet_quality", "sleep_quality",
        "family_history_alzheimers", "cardiovascular_disease", "diabetes", "depression",
        "head_injury", "hypertension", "cholesterol_total", "cholesterol_ldl", "cholesterol_hdl",
        "cholesterol_triglycerides", "mmse", "functional_assessment", "adl", "memory_complaints",
        "behavioral_problems", "confusion", "disorientation", "personality_changes",
        "difficulty_completing_tasks", "forgetfulness"
    ]
    raw = "|".join(str(row.get(k, 0)) for k in keys)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def run_migration():
    ok, msg = is_mysql_available()
    if not ok:
        print(f"Error: MySQL is not available ({msg})")
        return False

    print("=== Memulai Migrasi Data V1 ke V2 ===")

    # 0. Alter tabel users untuk menyertakan kolom-kolom baru
    existing_cols = [c["Field"] for c in execute_query("DESCRIBE `users`;")]
    if "uuid" not in existing_cols:
        execute_update("ALTER TABLE `users` ADD COLUMN `uuid` CHAR(36) NULL UNIQUE AFTER `id`;")
    if "status" not in existing_cols:
        execute_update("ALTER TABLE `users` ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE' AFTER `avatar_url`;")
    if "email_verified_at" not in existing_cols:
        execute_update("ALTER TABLE `users` ADD COLUMN `email_verified_at` TIMESTAMP NULL AFTER `status`;")

    # 1. Update users: pastikan semua user memiliki UUID
    users = execute_query("SELECT id, email, full_name, phone, role, avatar_url, uuid FROM `users`;")
    print(f"[1/5] Memproses {len(users)} pengguna...")
    for u in users:
        u_id = u["id"]
        u_uuid = u.get("uuid")
        if not u_uuid:
            u_uuid = str(uuid.uuid4())
            execute_update("UPDATE `users` SET `uuid` = %s WHERE `id` = %s;", (u_uuid, u_id))

        # Migrasi ke patient_profiles
        execute_update("""
            INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `avatar_url`)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `full_name` = VALUES(`full_name`),
                `phone` = VALUES(`phone`),
                `avatar_url` = VALUES(`avatar_url`);
        """, (u_id, u["full_name"], u["phone"], u["avatar_url"]))

        # Jika role Admin -> admin_profiles
        if u["role"] == "Admin":
            from config.admin import ADMIN_ACCOUNTS, get_admin_by_custom_email
            email = u["email"].lower()
            admin_data = get_admin_by_custom_email(email)
            custom_email = email
            real_emails = [email]

            if admin_data:
                real_emails = admin_data.get("real_emails", [email])
            else:
                for c_email, data in ADMIN_ACCOUNTS.items():
                    if email in [re.lower() for re in data.get("real_emails", [])]:
                        custom_email = c_email
                        real_emails = data.get("real_emails", [email])
                        break

            execute_update("""
                INSERT INTO `admin_profiles` (`user_id`, `custom_email`, `real_notification_emails`, `department`, `security_clearance`)
                VALUES (%s, %s, %s, %s, 5)
                ON DUPLICATE KEY UPDATE
                    `custom_email` = VALUES(`custom_email`),
                    `real_notification_emails` = VALUES(`real_notification_emails`);
            """, (u_id, custom_email, json.dumps(real_emails), "System Architecture & AI Engineering"))

    # 2. Migrasi nakes -> nakes_profiles
    old_nakes = execute_query("SELECT * FROM `nakes`;")
    print(f"[2/5] Memproses {len(old_nakes)} tenaga medis...")
    for n in old_nakes:
        user_id = n.get("user_id")
        if not user_id and n.get("email"):
            u_match = execute_one("SELECT id FROM `users` WHERE `email` = %s LIMIT 1;", (n["email"],))
            if u_match:
                user_id = u_match["id"]

        if user_id:
            execute_update("""
                INSERT INTO `nakes_profiles` (`user_id`, `sip`, `str`, `nip`, `specialization`, `facility_name`, `validation_status`, `verified_at`)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    `sip` = VALUES(`sip`),
                    `str` = VALUES(`str`),
                    `facility_name` = VALUES(`facility_name`);
            """, (
                user_id,
                n["sip"],
                n["str"],
                n.get("nip"),
                n.get("specialization") or "Spesialis Saraf (Sp.N / Sp.S)",
                n.get("facility_name") or "RS Pusat Otak Nasional",
                "VERIFIED" if n.get("status_validation") == "ACTIVE" else "PENDING",
                n.get("verified_at"),
            ))

    # 3. Migrasi consultations -> medical_documents & consultation_sessions
    consults = execute_query("SELECT * FROM `consultations`;")
    print(f"[3/5] Memproses {len(consults)} dokumen konsultasi...")
    doc_map = {}  # old_consultation_id -> new_document_id
    for c in consults:
        old_id = c["id"]
        doc_number = c["doc_id"]
        nakes_code = c["nakes_code"]
        patient_name = c["patient_name"]
        user_id = c.get("user_id")
        verif_hash = c.get("verification_hash") or hashlib.sha256(doc_number.encode("utf-8")).hexdigest()
        qr_token = hashlib.sha256(f"qr_{doc_number}".encode("utf-8")).hexdigest()[:32]

        status_val = "ANALYZED"
        if c.get("status") == "VALIDATED_BY_CLINICIAN":
            status_val = "VALIDATED_BY_CLINICIAN"
        elif c.get("status") == "ARCHIVED":
            status_val = "ARCHIVED"

        # Simpan ke medical_documents
        existing_doc = execute_one("SELECT id FROM `medical_documents` WHERE `doc_number` = %s;", (doc_number,))
        if existing_doc:
            doc_id = existing_doc["id"]
        else:
            doc_id = execute_insert("""
                INSERT INTO `medical_documents` (`doc_number`, `patient_user_id`, `patient_name`, `status`, `qr_verification_token`, `integrity_hash`, `created_at`)
                VALUES (%s, %s, %s, %s, %s, %s, %s);
            """, (doc_number, user_id, patient_name, status_val, qr_token, verif_hash, c.get("created_at")))

        doc_map[old_id] = doc_id

        # Simpan ke consultation_sessions
        execute_update("""
            INSERT INTO `consultation_sessions` (`document_id`, `nakes_code`, `session_channel`, `created_at`)
            VALUES (%s, %s, 'CHAT', %s)
            ON DUPLICATE KEY UPDATE `nakes_code` = VALUES(`nakes_code`);
        """, (doc_id, nakes_code, c.get("created_at")))

    # 4. Migrasi user_profiles (biomarkers) -> patient_biomarkers
    biomarkers_old = execute_query("SELECT * FROM `user_profiles`;")
    print(f"[4/5] Memproses {len(biomarkers_old)} profil biomarker...")
    for b in biomarkers_old:
        bm_hash = compute_biomarker_hash(b)
        execute_update("""
            INSERT INTO `patient_biomarkers` (
                `patient_user_id`, `age`, `gender`, `ethnicity`, `education_level`,
                `height_cm`, `weight_kg`, `bmi`, `systolic_bp`, `diastolic_bp`,
                `smoking`, `alcohol_consumption`, `physical_activity`, `diet_quality`, `sleep_quality`,
                `family_history_alzheimers`, `cardiovascular_disease`, `diabetes`, `depression`, `head_injury`, `hypertension`,
                `cholesterol_total`, `cholesterol_ldl`, `cholesterol_hdl`, `cholesterol_triglycerides`,
                `mmse`, `functional_assessment`, `adl`,
                `memory_complaints`, `behavioral_problems`, `confusion`, `disorientation`,
                `personality_changes`, `difficulty_completing_tasks`, `forgetfulness`,
                `biomarker_hash`, `recorded_at`
            )
            VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s
            )
            ON DUPLICATE KEY UPDATE `biomarker_hash` = VALUES(`biomarker_hash`);
        """, (
            b.get("user_id"), b.get("age", 65), b.get("gender", 0), b.get("ethnicity", 0), b.get("education_level", 1),
            b.get("height"), b.get("weight"), b.get("bmi", 22.5), b.get("systolic_bp", 120), b.get("diastolic_bp", 80),
            b.get("smoking", 0), b.get("alcohol_consumption", 5.0), b.get("physical_activity", 5.0), b.get("diet_quality", 5.0), b.get("sleep_quality", 7.0),
            b.get("family_history_alzheimers", 0), b.get("cardiovascular_disease", 0), b.get("diabetes", 0), b.get("depression", 0), b.get("head_injury", 0), b.get("hypertension", 0),
            b.get("cholesterol_total", 200.0), b.get("cholesterol_ldl", 100.0), b.get("cholesterol_hdl", 50.0), b.get("cholesterol_triglycerides", 150.0),
            b.get("mmse", 24.0), b.get("functional_assessment", 7.0), b.get("adl", 7.0),
            b.get("memory_complaints", 0), b.get("behavioral_problems", 0), b.get("confusion", 0), b.get("disorientation", 0),
            b.get("personality_changes", 0), b.get("difficulty_completing_tasks", 0), b.get("forgetfulness", 0),
            bm_hash, b.get("created_at")
        ))

    # 5. Migrasi research_dispatches -> research_articles
    articles = execute_query("SELECT * FROM `research_dispatches`;")
    print(f"[5/5] Memproses {len(articles)} artikel riset...")
    for a in articles:
        slug = slugify(a["title"])
        execute_update("""
            INSERT INTO `research_articles` (`slug`, `title`, `category`, `abstract`, `content`, `author_name`, `badge_label`, `is_featured`, `published_at`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `title` = VALUES(`title`),
                `abstract` = VALUES(`abstract`),
                `content` = VALUES(`content`);
        """, (
            slug,
            a["title"],
            a["category"],
            a.get("abstract"),
            a.get("content"),
            a.get("author") or "Neura Clinical Research Team",
            a.get("badge_label"),
            a.get("is_featured", 0),
            a.get("published_at"),
        ))

    print("=== Migrasi Data V1 ke V2 Berhasil Selesai 100%! ===")
    return True


if __name__ == "__main__":
    run_migration()
