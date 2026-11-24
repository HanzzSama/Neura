"""
app/Http/Controllers/Admin/AdminDatabaseController.py
====================================================
Admin Database & Schema Explorer Controller for MySQL neura_db (Laragon).
Provides live collections/tables metadata and document/row queries for the Admin Canvas.
Includes intelligent fallback when MySQL service in Laragon is not yet started.
"""

import os
import csv
import json
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from flask import Blueprint, request, jsonify

from app.Services.Database.DatabaseManager import execute_query, is_mysql_available
from app.Services.Logger.LoggerService import get_logger
from config.app import BASE_DIR, STORAGE_DIR

logger = get_logger(__name__)

admin_database_bp = Blueprint("admin_database", __name__)

SCHEMA_COLUMNS = {
    "users": ["id", "uuid", "email", "full_name", "phone", "role", "avatar_url", "status", "email_verified_at", "created_at"],
    "patient_profiles": ["id", "user_id", "full_name", "nik", "date_of_birth", "gender", "phone", "avatar_url", "emergency_contact_name", "updated_at"],
    "oauth_identities": ["id", "user_id", "provider", "provider_uid", "provider_email", "last_login_at", "created_at"],
    "nakes_profiles": ["id", "user_id", "sip", "str", "nip", "specialization", "facility_name", "validation_status", "verified_at", "created_at"],
    "admin_profiles": ["id", "user_id", "custom_email", "real_notification_emails", "department", "security_clearance", "created_at"],
    "medical_documents": ["id", "doc_number", "patient_user_id", "patient_name", "document_title", "status", "qr_verification_token", "integrity_hash", "created_at"],
    "consultation_sessions": ["id", "document_id", "nakes_code", "assigned_nakes_id", "session_channel", "scheduled_at", "completed_at", "created_at"],
    "clinical_validations": ["id", "document_id", "validator_nakes_id", "icd10_code", "diagnosis_name", "clinical_notes", "signed_at"],
    "patient_biomarkers": ["id", "patient_user_id", "age", "gender", "bmi", "systolic_bp", "diastolic_bp", "mmse", "functional_assessment", "adl", "memory_complaints", "biomarker_hash", "recorded_at"],
    "prediction_runs": ["id", "document_id", "biomarker_id", "model_version", "ml_label", "ml_label_name", "risk_level", "probability_positive", "raw_logit_z", "created_at"],
    "auth_sessions": ["session_token", "user_id", "role", "ip_address", "user_agent", "last_activity_at", "expires_at"],
    "auth_otp_codes": ["id", "identifier", "otp_code", "purpose", "attempts", "expires_at", "consumed_at", "created_at"],
    "system_notifications": ["id", "target_user_id", "target_role", "title", "body", "category", "urgency", "is_read", "created_at"],
    "system_cache": ["cache_key", "tag", "expires_at"],
    "audit_logs": ["id", "actor_user_id", "actor_email", "action", "entity_type", "entity_id", "ip_address", "created_at"],
    "research_articles": ["id", "slug", "title", "category", "author_name", "badge_label", "is_featured", "published_at"],
    "research_subscribers": ["id", "email", "subscribed_categories", "is_active", "subscribed_at"],
    # Legacy compat
    "user_profiles": ["id", "user_id", "patient_name", "age", "gender", "bmi", "mmse", "created_at"],
    "nakes": ["id", "user_id", "sip", "str", "full_name", "facility_name", "status_validation"],
    "consultations": ["id", "doc_id", "nakes_code", "patient_name", "status", "verification_hash", "created_at"],
    "prediction_records": ["id", "consultation_id", "ml_label", "ml_label_name", "probability_1", "raw_logit_z", "created_at"],
    "research_dispatches": ["id", "title", "category", "author", "is_featured", "published_at"],
}

MYSQL_TABLE_CONFIGS = [
    # --- DOMAIN 1: IAM & PROFILES ---
    {
        "id": "db-users",
        "name": "users",
        "table": "users",
        "type": "mysql",
        "category": "IAM & PROFILES",
        "description": "Tabel akun pengguna, kredensial autentikasi, UUID, dan hak akses RBAC (User, Nakes, Admin)."
    },
    {
        "id": "db-patient_profiles",
        "name": "patient_profiles",
        "table": "patient_profiles",
        "type": "mysql",
        "category": "IAM & PROFILES",
        "description": "Profil demografi pasien, kontak darurat keluarga, NIK, dan preferensi akun."
    },
    {
        "id": "db-oauth_identities",
        "name": "oauth_identities",
        "table": "oauth_identities",
        "type": "mysql",
        "category": "IAM & PROFILES",
        "description": "Mapping kredensial pihak ketiga OAuth Google & Firebase Authentication."
    },
    {
        "id": "db-admin_profiles",
        "name": "admin_profiles",
        "table": "admin_profiles",
        "type": "mysql",
        "category": "IAM & PROFILES",
        "description": "Konfigurasi khusus administrator, routing notifikasi email asli, dan security clearance."
    },
    {
        "id": "db-nakes_profiles",
        "name": "nakes_profiles",
        "table": "nakes_profiles",
        "type": "mysql",
        "category": "KLINIS & NAKES",
        "description": "Direktori tenaga medis & dokter spesialis saraf terverifikasi (SIP, STR KKI, Faskes)."
    },

    # --- DOMAIN 2: REKAM MEDIS & DOKUMEN ELEKTRONIK (EMR) ---
    {
        "id": "db-medical_documents",
        "name": "medical_documents",
        "table": "medical_documents",
        "type": "mysql",
        "category": "REKAM MEDIS & DOKUMEN",
        "description": "Master berkas rekam medis pasien (DOC-NEURA-2026-XXXX), status, dan hash integritas SHA-256."
    },
    {
        "id": "db-consultation_sessions",
        "name": "consultation_sessions",
        "table": "consultation_sessions",
        "type": "mysql",
        "category": "REKAM MEDIS & DOKUMEN",
        "description": "Sesi telemedisin & konsultasi klinis berisikan kode rujukan dokter (NKS-26-XXXX-ALZ)."
    },
    {
        "id": "db-clinical_validations",
        "name": "clinical_validations",
        "table": "clinical_validations",
        "type": "mysql",
        "category": "REKAM MEDIS & DOKUMEN",
        "description": "Catatan validasi dokter spesialis, diagnosa ICD-10 (G30.9), dan digital signature."
    },

    # --- DOMAIN 3: AI ENGINE & 32 BIOMARKER ---
    {
        "id": "db-patient_biomarkers",
        "name": "patient_biomarkers",
        "table": "patient_biomarkers",
        "type": "mysql",
        "category": "AI & BIOMARKER",
        "description": "32 Parameter biomarker klinis pasien presisi tinggi sesuai model RapidMiner modelML.rmp."
    },
    {
        "id": "db-prediction_runs",
        "name": "prediction_runs",
        "table": "prediction_runs",
        "type": "mysql",
        "category": "AI & BIOMARKER",
        "description": "Riwayat inferensi model XGBoost 25 Trees, kalkulasi logit z, dan probabilitas risiko Alzheimer."
    },

    # --- DOMAIN 4: SESI, 2FA OTP & CACHE PERFORMA TINGGI ---
    {
        "id": "db-auth_sessions",
        "name": "auth_sessions",
        "table": "auth_sessions",
        "type": "mysql",
        "category": "SESI & CACHE",
        "description": "Penyimpanan sesi server-side persisten di database MySQL & token Remember Me."
    },
    {
        "id": "db-auth_otp_codes",
        "name": "auth_otp_codes",
        "table": "auth_otp_codes",
        "type": "mysql",
        "category": "SESI & CACHE",
        "description": "Pusat kode 2FA OTP admin dengan proteksi rate limit, cooldown 45s, dan validasi sekali pakai."
    },
    {
        "id": "db-system_cache",
        "name": "system_cache",
        "table": "system_cache",
        "type": "mysql",
        "category": "SESI & CACHE",
        "description": "Key-value cache sistem berbasis MySQL InnoDB untuk akselerasi respon endpoint."
    },

    # --- DOMAIN 5 & 6: AUDIT TRAIL, NOTIFIKASI & RISET ---
    {
        "id": "db-system_notifications",
        "name": "system_notifications",
        "table": "system_notifications",
        "type": "mysql",
        "category": "AUDIT & NOTIFIKASI",
        "description": "Pusat notifikasi persisten real-time untuk pasien, dokter, dan administrator."
    },
    {
        "id": "db-audit_logs",
        "name": "audit_logs",
        "table": "audit_logs",
        "type": "mysql",
        "category": "AUDIT & NOTIFIKASI",
        "description": "Audit trail kepatuhan Permenkes RME, mutasi data medis, dan log keamanan login."
    },
    {
        "id": "db-research_articles",
        "name": "research_articles",
        "table": "research_articles",
        "type": "mysql",
        "category": "RISET & PUSTAKA",
        "description": "Publikasi berkala telaah ilmiah dan buletin riset klinis Alzheimer."
    },
    {
        "id": "db-research_subscribers",
        "name": "research_subscribers",
        "table": "research_subscribers",
        "type": "mysql",
        "category": "RISET & PUSTAKA",
        "description": "Daftar email dokter dan peneliti pelanggan buletin riset klinis Neura."
    },
    {
        "id": "db-alzheimers_data",
        "name": "alzheimers_disease_data.csv",
        "table": "alzheimers_disease_data.csv",
        "type": "dataset",
        "category": "TABULAR DATA LAKE",
        "description": "Dataset kohort Alzheimer 2.149 baris dengan 35 parameter demografi, klinis & MMSE."
    },

    # --- LEGACY REFERENCES (Backwards Compatibility) ---
    {
        "id": "db-consultations",
        "name": "consultations",
        "table": "consultations",
        "type": "mysql",
        "category": "LEGACY COMPAT",
        "description": "Tabel konsultasi v1 (telah tersinkronisasi otomatis ke medical_documents)."
    },
    {
        "id": "db-nakes",
        "name": "nakes",
        "table": "nakes",
        "type": "mysql",
        "category": "LEGACY COMPAT",
        "description": "Tabel direktori nakes v1 (telah tersinkronisasi ke nakes_profiles)."
    }
]


def _serialize_val(val):
    """Serialize MySQL types (datetime, date, Decimal) to JSON-friendly format."""
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    return val


def _get_fallback_documents(clean_name: str, limit: int = 60):
    """Memuat data cadangan lokal saat MySQL belum dinyalakan di Laragon."""
    columns = SCHEMA_COLUMNS.get(clean_name, ["id", "name", "created_at"])
    docs = []

    if clean_name == "consultations":
        candidates = [
            BASE_DIR / "database" / "datasets" / "consultations_records.json",
            STORAGE_DIR / "app" / "consultations_records.json",
        ]
        for p in candidates:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        raw_data = json.load(f)
                    items_list = list(raw_data.values()) if isinstance(raw_data, dict) else raw_data
                    for i, item in enumerate(items_list[:limit]):
                        if not isinstance(item, dict):
                            continue
                        docs.append({
                            "id": item.get("id") or item.get("doc_id") or item.get("nakes_code") or f"cons-{i+1}",
                            "data": item,
                            **item
                        })
                    if docs:
                        break
                except Exception:
                    pass

    elif clean_name == "nakes":
        nakes_file = BASE_DIR / "database" / "datasets" / "nakes_directory.json"
        if nakes_file.exists():
            try:
                with open(nakes_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for i, item in enumerate(data[:limit]):
                    docs.append({
                        "id": item.get("id") or f"nakes-{i+1}",
                        "data": item,
                        **item
                    })
            except Exception:
                pass

    elif clean_name == "research_dispatches":
        res_file = BASE_DIR / "database" / "datasets" / "research_updates.json"
        if res_file.exists():
            try:
                with open(res_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for i, item in enumerate(data[:limit]):
                    docs.append({
                        "id": item.get("id") or f"res-{i+1}",
                        "data": item,
                        **item
                    })
            except Exception:
                pass

    elif clean_name == "users":
        docs = [
            {
                "id": "1",
                "email": "haidarandrianno098@gmail.com",
                "full_name": "Haidar Andrianno (Admin)",
                "role": "Admin",
                "phone": "081234567890",
                "created_at": datetime.now().isoformat()
            },
            {
                "id": "2",
                "email": "dr.sarah@neura.ns.id",
                "full_name": "dr. Sarah Sp.N",
                "role": "Nakes",
                "phone": "081298765432",
                "created_at": datetime.now().isoformat()
            },
            {
                "id": "3",
                "email": "pasien.budi@neura.id",
                "full_name": "Budi Santoso",
                "role": "User",
                "phone": "081311223344",
                "created_at": datetime.now().isoformat()
            }
        ]

    elif clean_name == "user_profiles":
        csv_path = BASE_DIR / "database" / "datasets" / "alzheimers_disease_data.csv"
        if csv_path.exists():
            try:
                with open(csv_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for i, r in enumerate(reader):
                        if i >= min(limit, 30):
                            break
                        p_obj = {
                            "id": i + 1,
                            "user_id": i + 1,
                            "patient_name": f"Pasien Kohort #{r.get('PatientID', i+1)}",
                            "age": int(float(r.get("Age", 68))),
                            "gender": "Laki-laki" if r.get("Gender") == "0" else "Perempuan",
                            "education_level": r.get("EducationLevel", "Sarjana"),
                            "bmi": float(r.get("BMI", 24.5)),
                            "smoking": int(float(r.get("Smoking", 0))),
                            "systolic_bp": int(float(r.get("SystolicBP", 125))),
                            "diastolic_bp": int(float(r.get("DiastolicBP", 82))),
                            "mmse": float(r.get("MMSE", 23.4)),
                            "functional_assessment": float(r.get("FunctionalAssessment", 6.8)),
                            "adl": float(r.get("ADL", 7.2)),
                            "memory_complaints": int(float(r.get("MemoryComplaints", 1))),
                            "confusion": int(float(r.get("Confusion", 0))),
                            "created_at": datetime.now().isoformat()
                        }
                        docs.append({
                            "id": str(p_obj["id"]),
                            "data": p_obj,
                            **p_obj
                        })
            except Exception:
                pass

    elif clean_name == "research_subscribers":
        docs = [
            {
                "id": "1",
                "email": "dr.sarah@neura.ns.id",
                "subscribed_categories": "Clinical Research, Neurologi, Biomarkers",
                "is_active": 1,
                "subscribed_at": datetime.now().isoformat()
            },
            {
                "id": "2",
                "email": "peneliti.alzheimer@ui.ac.id",
                "subscribed_categories": "AI Inference, OASIS Dataset",
                "is_active": 1,
                "subscribed_at": datetime.now().isoformat()
            },
            {
                "id": "3",
                "email": "klinik.saraf@mitra-neura.id",
                "subscribed_categories": "Telemedicine, Buletin Bulanan",
                "is_active": 1,
                "subscribed_at": datetime.now().isoformat()
            }
        ]

    elif clean_name == "prediction_records":
        cons_file = BASE_DIR / "database" / "datasets" / "consultations_records.json"
        if cons_file.exists():
            try:
                with open(cons_file, "r", encoding="utf-8") as f:
                    raw_cons = json.load(f)
                items_list = list(raw_cons.values()) if isinstance(raw_cons, dict) else raw_cons
                for i, item in enumerate(items_list[:limit]):
                    if not isinstance(item, dict):
                        continue
                    prob = float(item.get("probability", 0.75))
                    pred_obj = {
                        "id": f"pred-{i+1}",
                        "consultation_id": item.get("doc_id") or item.get("nakes_code") or f"CONS-{i+1}",
                        "patient_name": item.get("patient_name", "Pasien"),
                        "source": "xgboost_inference",
                        "ml_label": 1 if prob >= 0.5 else 0,
                        "ml_label_name": "Positif Risiko Alzheimer" if prob >= 0.5 else "Negatif / Risiko Rendah",
                        "risk_level": "High Risk" if prob >= 0.7 else ("Moderate Risk" if prob >= 0.4 else "Low Risk"),
                        "probability_1": prob,
                        "confidence": float(item.get("confidence", 0.88)),
                        "created_at": item.get("timestamp") or datetime.now().isoformat()
                    }
                    docs.append({
                        "id": pred_obj["id"],
                        "data": pred_obj,
                        **pred_obj
                    })
            except Exception:
                pass

    return columns, docs


@admin_database_bp.route("/collections", methods=["GET"])
def api_get_database_collections():
    """
    Mengembalikan daftar tabel relasional MySQL neura_db, jumlah baris riil,
    dan metadata canvas untuk Admin Database Canvas.
    """
    collections = []
    sessions_dir = STORAGE_DIR / "framework" / "sessions"
    dataset_csv = BASE_DIR / "database" / "datasets" / "alzheimers_disease_data.csv"

    # Hitung sesi disk
    session_count = 0
    if sessions_dir.exists():
        session_count = len([f for f in sessions_dir.glob("*") if f.is_file()])

    # Hitung dataset baris
    dataset_rows = 2149
    if dataset_csv.exists():
        try:
            with open(dataset_csv, "r", encoding="utf-8") as f:
                dataset_rows = max(0, sum(1 for _ in f) - 1)
        except Exception:
            dataset_rows = 2149

    is_online, mysql_msg = is_mysql_available()

    for cfg in MYSQL_TABLE_CONFIGS:
        t_name = cfg["name"]
        item = dict(cfg)

        if cfg["type"] == "local":
            item["count"] = session_count
        elif cfg["type"] == "dataset":
            item["count"] = dataset_rows
        else:
            if is_online:
                try:
                    rows = execute_query(f"SELECT COUNT(*) as cnt FROM `{t_name}`")
                    item["count"] = int(rows[0]["cnt"]) if rows else 0
                except Exception as e:
                    logger.warning(f"[AdminDatabase] Error counting {t_name}: {e}")
                    item["count"] = 0
            else:
                # Bila MySQL offline, tampilkan jumlah perkiraan fallback seeder
                fallback_counts = {
                    "users": 3,
                    "user_profiles": 0,
                    "nakes": 3,
                    "consultations": 23,
                    "prediction_records": 23,
                    "research_dispatches": 5,
                    "research_subscribers": 0
                }
                item["count"] = fallback_counts.get(t_name, 0)

        collections.append(item)

    return jsonify({
        "status": "success",
        "mysql_connected": is_online,
        "database": "neura_db",
        "engine": "MySQL 8.4 (Laragon)",
        "host": "127.0.0.1:3306",
        "total_tables": len(collections),
        "collections": collections,
        "message": mysql_msg if not is_online else "Terhubung ke MySQL neura_db"
    })


@admin_database_bp.route("/collection/<col_name>/docs", methods=["GET"])
def api_get_collection_docs(col_name):
    """
    Mengambil data baris/rekaman dari tabel MySQL, sesi, atau CSV dataset.
    Dilengkapi fallback otomatis jika MySQL Laragon belum dihidupkan.
    """
    limit = int(request.args.get("limit", 60))
    limit = min(max(1, limit), 200)

    clean_name = col_name.strip()
    dataset_csv = BASE_DIR / "database" / "datasets" / "alzheimers_disease_data.csv"
    sessions_dir = STORAGE_DIR / "framework" / "sessions"

    # 1. Dataset CSV
    if clean_name.endswith(".csv") or clean_name == "alzheimers_disease_data.csv":
        if not dataset_csv.exists():
            return jsonify({"status": "error", "message": "File CSV dataset tidak ditemukan."}), 404

        docs = []
        columns = []
        try:
            with open(dataset_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                columns = reader.fieldnames or []
                for i, row in enumerate(reader):
                    if i >= limit:
                        break
                    doc_id = row.get("PatientID") or f"row-{i+1}"
                    docs.append({
                        "id": str(doc_id),
                        "data": row,
                        **row
                    })
            return jsonify({
                "status": "success",
                "mysql_connected": True,
                "collection": clean_name,
                "type": "dataset",
                "columns": columns,
                "documents": docs
            })
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500

    # 2. Local Sessions Store
    if clean_name == "sessions":
        docs = []
        columns = ["session_id", "modified_time", "size_bytes"]
        if sessions_dir.exists():
            for f in sorted(sessions_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
                if f.is_file():
                    st = f.stat()
                    data_obj = {
                        "session_id": f.name[:16] + "...",
                        "full_id": f.name,
                        "modified_time": datetime.fromtimestamp(st.st_mtime).isoformat(),
                        "size_bytes": st.st_size
                    }
                    docs.append({
                        "id": f.name[:16],
                        "data": data_obj,
                        **data_obj
                    })
        return jsonify({
            "status": "success",
            "mysql_connected": True,
            "collection": clean_name,
            "type": "local",
            "columns": columns,
            "documents": docs
        })

    # 3. Tabel MySQL
    valid_tables = {c["table"]: c for c in MYSQL_TABLE_CONFIGS if c["type"] == "mysql"}
    if clean_name not in valid_tables:
        return jsonify({"status": "error", "message": f"Tabel '{clean_name}' tidak dikenal."}), 404

    is_online, mysql_msg = is_mysql_available()
    if not is_online:
        # Fallback graceful tanpa 500
        fallback_cols, fallback_docs = _get_fallback_documents(clean_name, limit)
        return jsonify({
            "status": "warning",
            "mysql_connected": False,
            "is_fallback": True,
            "collection": clean_name,
            "table": clean_name,
            "type": "mysql",
            "columns": fallback_cols,
            "documents": fallback_docs,
            "message": f"Layanan MySQL (Laragon) pada 127.0.0.1:3306 belum berjalan. Menampilkan data cadangan lokal. Silakan buka Laragon lalu klik 'Start All'."
        }), 200

    try:
        # Ambil kolom tabel
        col_rows = execute_query(f"SHOW COLUMNS FROM `{clean_name}`")
        columns = [r["Field"] for r in col_rows] if col_rows else []

        # Ambil data rekaman
        order_col = "id" if "id" in columns else columns[0]
        rows = execute_query(f"SELECT * FROM `{clean_name}` ORDER BY `{order_col}` DESC LIMIT %s", (limit,))

        docs = []
        for i, row in enumerate(rows):
            serialized_row = {}
            for k, v in row.items():
                if isinstance(v, str) and (v.startswith("{") or v.startswith("[")):
                    try:
                        serialized_row[k] = json.loads(v)
                    except Exception:
                        serialized_row[k] = _serialize_val(v)
                else:
                    serialized_row[k] = _serialize_val(v)

            doc_id = serialized_row.get("id") or serialized_row.get("doc_id") or serialized_row.get("email") or f"row-{i+1}"
            docs.append({
                "id": str(doc_id),
                "data": serialized_row,
                **serialized_row
            })

        return jsonify({
            "status": "success",
            "mysql_connected": True,
            "is_fallback": False,
            "collection": clean_name,
            "table": clean_name,
            "type": "mysql",
            "columns": columns,
            "documents": docs
        })
    except Exception as e:
        logger.warning(f"[AdminDatabase] Error fetching docs from MySQL {clean_name}, returning fallback: {e}")
        fallback_cols, fallback_docs = _get_fallback_documents(clean_name, limit)
        return jsonify({
            "status": "warning",
            "mysql_connected": False,
            "is_fallback": True,
            "collection": clean_name,
            "table": clean_name,
            "type": "mysql",
            "columns": fallback_cols,
            "documents": fallback_docs,
            "message": f"Koneksi MySQL terputus: {e}. Menampilkan data cadangan lokal. Silakan periksa status Laragon MySQL."
        }), 200


@admin_database_bp.route("/online-users", methods=["GET"])
def api_get_online_users():
    """
    Mengembalikan daftar pengguna dan nakes aktif dari MySQL users
    untuk avatar stack di kartu users kanvas database.
    """
    is_online, _ = is_mysql_available()
    if is_online:
        try:
            rows = execute_query("SELECT id, full_name, email, role, avatar_url FROM users ORDER BY id ASC LIMIT 10")
            users = []
            role_colors = {
                "admin": "#EA580C",
                "nakes": "#06B6D4",
                "user": "#3B82F6"
            }
            for r in rows:
                role = (r.get("role") or "user").lower()
                name = r.get("full_name") or r.get("email", "User")
                parts = [p for p in name.split() if p]
                initials = "".join([p[0].upper() for p in parts[:2]]) if parts else "U"
                users.append({
                    "id": str(r.get("id")),
                    "name": name,
                    "initials": initials,
                    "role": role.capitalize(),
                    "type": role,
                    "status": "online",
                    "color": role_colors.get(role, "#3B82F6"),
                    "avatar": r.get("avatar_url") or ""
                })
            if users:
                return jsonify({"status": "success", "mysql_connected": True, "users": users})
        except Exception as e:
            logger.warning(f"[AdminDatabase] Error fetching online users: {e}")

    # Fallback default online users saat offline
    fallback_users = [
        {"id": "1", "name": "Admin Neura", "initials": "AN", "role": "Super Admin", "type": "admin", "status": "online", "color": "#EA580C"},
        {"id": "2", "name": "dr. Sarah Sp.N", "initials": "DS", "role": "Nakes", "type": "nakes", "status": "online", "color": "#06B6D4"},
        {"id": "3", "name": "Budi Santoso", "initials": "BS", "role": "Pasien", "type": "user", "status": "online", "color": "#3B82F6"}
    ]
    return jsonify({"status": "success", "mysql_connected": is_online, "users": fallback_users})
