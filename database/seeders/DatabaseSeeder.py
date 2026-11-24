"""
scripts/migrate_json_to_mysql.py
================================
Data Seeder & Migration Script:
Imports JSON datasets (nakes_directory.json, research_updates.json, consultations_records.json)
into the relational MySQL database `neura_db`.
"""

import sys
import json
import logging
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.Services.Database.DatabaseManager import (
    init_database,
    execute_insert,
    execute_query,
    execute_update,
    test_connection
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("neura.migrate")

DATASETS_DIR = PROJECT_ROOT / "database" / "datasets"


def migrate_nakes():
    file_path = DATASETS_DIR / "nakes_directory.json"
    if not file_path.exists():
        logger.warning(f"File {file_path} tidak ditemukan, lewati migrasi nakes.")
        return 0

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for item in data:
        sip = item.get("sip_number") or item.get("sip") or f"SIP-{item.get('id')}"
        str_num = item.get("str_number") or item.get("str") or f"STR-{item.get('id')}"
        email = item.get("nakes_email") or item.get("real_email") or f"{item.get('id').lower()}@neura.ns.id"
        name = item.get("name") or "Tenaga Medis Neura"
        spec = item.get("profession") or "Dokter Spesialis Neurologi (Sp.N)"
        inst = item.get("institution") or "Faskes Mitra Neura"
        phone = item.get("phone") or ""

        # Check existing
        existing = execute_query("SELECT id FROM nakes WHERE sip = %s OR str = %s", (sip, str_num))
        if existing:
            continue

        # Create user account for nakes
        user_id = execute_insert(
            "INSERT INTO users (email, password_hash, full_name, phone, role) VALUES (%s, %s, %s, %s, 'Nakes') "
            "ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)",
            (email, "pbkdf2:sha256:default_hash", name, phone)
        )
        if not user_id:
            u_row = execute_query("SELECT id FROM users WHERE email = %s", (email,))
            user_id = u_row[0]["id"] if u_row else None

        execute_insert(
            "INSERT INTO nakes (user_id, sip, str, nip, full_name, specialization, facility_name, phone_number, email, status_validation) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'ACTIVE')",
            (user_id, sip, str_num, item.get("id"), name, spec, inst, phone, email)
        )
        count += 1

    logger.info(f"Berhasil memigrasikan {count} data nakes ke MySQL.")
    return count


def migrate_research():
    file_path = DATASETS_DIR / "research_updates.json"
    if not file_path.exists():
        logger.warning(f"File {file_path} tidak ditemukan, lewati migrasi riset.")
        return 0

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for item in data:
        title = item.get("title") or "Riset Neura"
        cats = item.get("categories") or ["Model AI"]
        category_str = ", ".join(cats)
        abstract = item.get("summaryText") or ""
        badge = item.get("thumbnailConfig", {}).get("badgeText") or ""
        order_idx = item.get("order", 0)

        existing = execute_query("SELECT id FROM research_dispatches WHERE title = %s", (title,))
        if existing:
            continue

        execute_insert(
            "INSERT INTO research_dispatches (title, category, abstract, content, badge_label, is_featured) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (title, category_str, abstract, abstract, badge, 1 if order_idx == 1 else 0)
        )
        count += 1

    logger.info(f"Berhasil memigrasikan {count} buletin riset ke MySQL.")
    return count


def migrate_consultations():
    file_path = DATASETS_DIR / "consultations_records.json"
    if not file_path.exists():
        logger.warning(f"File {file_path} tidak ditemukan, lewati migrasi konsultasi.")
        return 0

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for key, doc in data.items():
        if not isinstance(doc, dict):
            continue

        doc_id = doc.get("doc_id") or key
        nakes_code = doc.get("nakes_code") or key
        p = doc.get("patient") or {}
        patient_name = p.get("name") or "Pasien"
        pid_label = p.get("patient_id") or ""
        v_hash = doc.get("verification_hash") or "SHA256-RECORD"
        status_val = "VALIDATED_BY_CLINICIAN" if doc.get("status") == "VALIDATED_BY_CLINICIAN" else "VALID_ACTIVE"
        created_label = doc.get("created_at") or ""

        existing = execute_query("SELECT id FROM consultations WHERE doc_id = %s OR nakes_code = %s", (doc_id, nakes_code))
        if existing:
            continue

        c_id = execute_insert(
            "INSERT INTO consultations (doc_id, nakes_code, patient_name, patient_id_label, status, verification_hash, created_at_label) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (doc_id, nakes_code, patient_name, str(pid_label), status_val, v_hash, created_label)
        )

        pred = doc.get("prediction") or {}
        ml_label = 1 if (pred.get("is_positive") or pred.get("ml_label") == 1 or "Alzheimer" in str(pred.get("diagnosis_label", ""))) else 0
        ml_label_name = pred.get("ml_label_name") or ("Diagnosis = 1 (Alzheimer's)" if ml_label == 1 else "Diagnosis = 0 (Non-Alzheimer's)")
        ml_badge = pred.get("ml_label_badge") or (f"Diagnosis = {ml_label}")
        prob_1 = float(pred.get("probability_positive") or pred.get("probability") or 50.0)
        prob_0 = float(pred.get("probability_negative") or (100.0 - prob_1))
        risk_lvl = pred.get("risk_level") or "Moderate Risk"
        risk_lvl_id = pred.get("risk_level_id") or "Risiko Sedang"
        conf = pred.get("confidence") or f"{max(prob_1, prob_0):.1f}%"

        calc = doc.get("calculation_details") or pred.get("calculation_details") or {}
        z_score = float(calc.get("raw_logit_z") or 0.0)
        b_margin = float(calc.get("base_margin") or 0.0)
        s_trees = float(calc.get("sum_tree_weights") or 0.0)
        num_trees = int(calc.get("num_trees") or 25)

        sym = doc.get("symptom_summary") or pred.get("symptom_summary") or {}
        sym_count = int(sym.get("active_count") or 0)

        calc_json = json.dumps(calc) if calc else None
        sym_json = json.dumps(sym) if sym else None
        bio_json = json.dumps(doc.get("all_32_biomarkers") or {}) if doc.get("all_32_biomarkers") else None

        execute_insert(
            "INSERT INTO prediction_records ("
            "consultation_id, patient_name, source, ml_label, ml_label_name, ml_label_badge, "
            "is_positive, risk_level, risk_level_id, probability_1, probability_0, confidence, "
            "raw_logit_z, base_margin, sum_tree_weights, num_trees, active_symptoms_count, "
            "calculation_details, symptom_summary, all_32_biomarkers"
            ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                c_id, patient_name, doc.get("source", "user_profile"),
                ml_label, ml_label_name, ml_badge,
                1 if ml_label == 1 else 0, risk_lvl, risk_lvl_id,
                prob_1, prob_0, conf,
                z_score, b_margin, s_trees, num_trees, sym_count,
                calc_json, sym_json, bio_json
            )
        )
        count += 1

    logger.info(f"Berhasil memigrasikan {count} rekam medis konsultasi ke MySQL.")
    return count


def run_migration():
    print("=" * 65)
    print("🧠 NEURA AI — MIGRASI DATASET JSON KE DATABASE MYSQL LARAGON")
    print("=" * 65)

    is_ok, msg = test_connection()
    if not is_ok:
        print(f"❌ Gagal terhubung ke MySQL Server: {msg}")
        print("💡 Pastikan Laragon telah dijalankan (klik 'Start All' di Laragon).")
        return False

    print(f"✅ {msg}")

    # Init database schema
    print("\n[1/4] 🛠️ Inisialisasi skema tabel neura_db...")
    init_ok, init_msg = init_database()
    if not init_ok:
        print(f"❌ Gagal inisialisasi skema: {init_msg}")
        return False
    print(f"✅ {init_msg}")

    # Migrate datasets
    print("\n[2/4] 👨‍⚕️ Memigrasikan direktori Tenaga Medis (nakes_directory.json)...")
    migrate_nakes()

    print("\n[3/4] 📄 Memigrasikan buletin riset klinis (research_updates.json)...")
    migrate_research()

    print("\n[4/4] 🏥 Memigrasikan rekam medis konsultasi (consultations_records.json)...")
    migrate_consultations()

    print("\n" + "=" * 65)
    print("✨ Migrasi ke MySQL neura_db selesai dengan sukses!")
    print("🔗 Anda dapat memeriksa tabel dan data langsung di phpMyAdmin:")
    print("   http://localhost/phpmyadmin/index.php?route=/database/structure&db=neura_db")
    print("=" * 65)
    return True


def run_seeder():
    """Entry point for nterli seed."""
    return run_migration()


if __name__ == "__main__":
    run_migration()
