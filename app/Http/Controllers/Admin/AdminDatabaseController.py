"""
app/Http/Controllers/Admin/AdminDatabaseController.py
====================================================
Admin Database & Schema Explorer Controller for MySQL neura_db (Laragon).
Provides live collections/tables metadata and document/row queries for the Admin Canvas.
"""

import os
import csv
import json
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from flask import Blueprint, request, jsonify

from app.Services.Database.DatabaseManager import execute_query
from app.Services.Logger.LoggerService import get_logger
from config.app import BASE_DIR, STORAGE_DIR

logger = get_logger(__name__)

admin_database_bp = Blueprint("admin_database", __name__)

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

    for cfg in MYSQL_TABLE_CONFIGS:
        t_name = cfg["name"]
        item = dict(cfg)

        if cfg["type"] == "local":
            item["count"] = session_count
        elif cfg["type"] == "dataset":
            item["count"] = dataset_rows
        else:
            # Query count langsung dari MySQL
            try:
                rows = execute_query(f"SELECT COUNT(*) as cnt FROM `{t_name}`")
                item["count"] = int(rows[0]["cnt"]) if rows else 0
            except Exception as e:
                logger.warning(f"[AdminDatabase] Error counting {t_name}: {e}")
                item["count"] = 0

        collections.append(item)

    return jsonify({
        "status": "success",
        "database": "neura_db",
        "engine": "MySQL 8.4 (Laragon)",
        "host": "127.0.0.1:3306",
        "total_tables": len(collections),
        "collections": collections,
    })


@admin_database_bp.route("/collection/<col_name>/docs", methods=["GET"])
def api_get_collection_docs(col_name):
    """
    Mengambil data baris/rekaman dari tabel MySQL, sesi, atau CSV dataset.
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
            "collection": clean_name,
            "type": "local",
            "columns": columns,
            "documents": docs
        })

    # 3. Tabel MySQL
    valid_tables = {c["table"]: c for c in MYSQL_TABLE_CONFIGS if c["type"] == "mysql"}
    if clean_name not in valid_tables:
        return jsonify({"status": "error", "message": f"Tabel '{clean_name}' tidak dikenal."}), 404

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
            "collection": clean_name,
            "table": clean_name,
            "type": "mysql",
            "columns": columns,
            "documents": docs
        })
    except Exception as e:
        logger.error(f"[AdminDatabase] Error fetching docs from {clean_name}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_database_bp.route("/online-users", methods=["GET"])
def api_get_online_users():
    """
    Mengembalikan daftar pengguna dan nakes aktif dari MySQL users
    untuk avatar stack di kartu users kanvas database.
    """
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
        if not users:
            users = [
                {"id": "1", "name": "Admin Neura", "initials": "AN", "role": "Super Admin", "type": "admin", "status": "online", "color": "#EA580C"}
            ]
        return jsonify({"status": "success", "users": users})
    except Exception as e:
        logger.warning(f"[AdminDatabase] Error fetching online users: {e}")
        return jsonify({"status": "success", "users": []})
