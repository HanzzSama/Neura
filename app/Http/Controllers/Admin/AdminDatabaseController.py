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
    "users": ["id", "email", "full_name", "phone", "role", "avatar_url", "created_at", "updated_at"],
    "user_profiles": [
        "id", "user_id", "patient_name", "age", "gender", "ethnicity", "education_level",
        "height", "weight", "bmi", "systolic_bp", "diastolic_bp", "smoking", "alcohol_consumption",
        "physical_activity", "diet_quality", "sleep_quality", "family_history_alzheimers",
        "cardiovascular_disease", "diabetes", "depression", "head_injury", "hypertension",
        "cholesterol_total", "cholesterol_ldl", "cholesterol_hdl", "cholesterol_triglycerides",
        "mmse", "functional_assessment", "adl", "memory_complaints", "behavioral_problems",
        "confusion", "disorientation", "personality_changes", "difficulty_completing_tasks",
        "forgetfulness", "created_at"
    ],
    "nakes": [
        "id", "user_id", "sip", "str", "nip", "full_name", "specialization",
        "facility_name", "phone_number", "email", "status_validation", "verified_at"
    ],
    "consultations": [
        "id", "doc_id", "nakes_code", "patient_name", "patient_id_label", "user_id",
        "validated_by_nakes_id", "status", "verification_hash", "created_at_label", "created_at"
    ],
    "prediction_records": [
        "id", "consultation_id", "user_id", "patient_name", "source", "ml_label",
        "ml_label_name", "ml_label_badge", "is_positive", "risk_level", "probability_1",
        "probability_0", "confidence", "raw_logit_z", "sum_tree_weights", "created_at"
    ],
    "research_dispatches": [
        "id", "title", "category", "abstract", "content", "author", "badge_label",
        "is_featured", "published_at"
    ],
    "research_subscribers": [
        "id", "email", "subscribed_categories", "is_active", "subscribed_at"
    ]
}

MYSQL_TABLE_CONFIGS = [
    {
        "id": "db-users",
        "name": "users",
        "table": "users",
        "type": "mysql",
        "category": "AUTH & PROFILES",
        "description": "Tabel akun pengguna, kredensial autentikasi, dan hak akses RBAC (User, Nakes, Admin)."
    },
    {
        "id": "db-user_profiles",
        "name": "user_profiles",
        "table": "user_profiles",
        "type": "mysql",
        "category": "CLINICAL BIOMARKERS",
        "description": "32 Biomarker klinis pasien, MMSE, ADL, dan 7 keluhan kognitif spesifik Alzheimer."
    },
    {
        "id": "db-nakes",
        "name": "nakes",
        "table": "nakes",
        "type": "mysql",
        "category": "HEALTHCARE DIRECTORY",
        "description": "Direktori tenaga medis & dokter spesialis saraf terverifikasi (SIP, STR, Faskes)."
    },
    {
        "id": "db-consultations",
        "name": "consultations",
        "table": "consultations",
        "type": "mysql",
        "category": "TELEMEDICINE",
        "description": "Catatan rekam medis terenkripsi, kode rujukan dokter (NKS-26-XXXX-ALZ), dan status."
    },
    {
        "id": "db-prediction_records",
        "name": "prediction_records",
        "table": "prediction_records",
        "type": "mysql",
        "category": "AI INFERENCE SINK",
        "description": "Log inferensi XGBoost (25 trees), logit z, label resmi ML (0/1), dan tingkat risiko."
    },
    {
        "id": "db-research_dispatches",
        "name": "research_dispatches",
        "table": "research_dispatches",
        "type": "mysql",
        "category": "RESEARCH PUBLICATIONS",
        "description": "Buletin riset klinis Alzheimer, telaah ilmiah, dan publikasi penelitian berkala."
    },
    {
        "id": "db-research_subscribers",
        "name": "research_subscribers",
        "table": "research_subscribers",
        "type": "mysql",
        "category": "SUBSCRIBERS",
        "description": "Daftar email dokter dan peneliti pelanggan buletin riset klinis Neura."
    },
    {
        "id": "db-sessions",
        "name": "sessions",
        "table": "sessions",
        "type": "local",
        "category": "SESSION STORE",
        "description": "Token sesi login admin & pengguna aktif, masa berlaku, dan kontrol akses berbasis disk."
    },
    {
        "id": "db-alzheimers_data",
        "name": "alzheimers_disease_data.csv",
        "table": "alzheimers_disease_data.csv",
        "type": "dataset",
        "category": "TABULAR DATA LAKE",
        "description": "Dataset kohort Alzheimer 2.149 baris dengan 35 parameter demografi, klinis & MMSE."
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
