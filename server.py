"""
server.py
=========
Modular Flask web server for Neura AI.
Bridges frontend SPA to backend ML, role-based workflows, and chat services.

Run with:
    python server.py
Then open: http://localhost:5000
"""

import os
import threading
from dotenv import load_dotenv

# Suppress TensorFlow C++ log output
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

load_dotenv()

from flask import Flask, send_from_directory
from flask_cors import CORS
from core.logger import get_logger

logger = get_logger(__name__)

# Pre-warm ML libraries in background so the first prediction / training starts immediately
def _warmup_ml_libs():
    try:
        import xgboost  # noqa
        import pandas   # noqa
        import sklearn  # noqa
    except Exception:
        pass

threading.Thread(target=_warmup_ml_libs, daemon=True).start()

# Flask App Initialization
app = Flask(__name__, static_folder="public", static_url_path="")
CORS(app, supports_credentials=True)

# -----------------------------------------------------------------------
# Session & Secure Cookie Configuration (Remember Me: 30 Hari Aktif)
# -----------------------------------------------------------------------
import secrets
from datetime import timedelta
from flask_session import Session

os.makedirs(".flask_sessions", exist_ok=True)

# Secret key statis fallback agar restart server tidak membatalkan sesi cookie pengguna
_STATIC_SECRET_FALLBACK = "8f7e4bce82d6c87bfea4937b969ebb31baf606dd5415a746991f422f64bb4c5b"
_SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or _STATIC_SECRET_FALLBACK

app.config.update(
    SECRET_KEY=_SECRET_KEY,
    SESSION_TYPE="filesystem",
    SESSION_FILE_DIR=".flask_sessions",
    SESSION_PERMANENT=True,             # Remember Me: cookie memiliki masa berlaku permanen
    SESSION_USE_SIGNER=True,
    SESSION_COOKIE_NAME="neura_session",
    SESSION_COOKIE_HTTPONLY=True,       # JavaScript cannot read session cookie (XSS protection)
    SESSION_COOKIE_SAMESITE="Lax",      # Prevents CSRF while allowing standard navigation
    SESSION_COOKIE_SECURE=False,        # Set to True on production HTTPS
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),  # Remember Me: 30 hari bertahan melewati restart
)
Session(app)

# -----------------------------------------------------------------------
# Register Modular Blueprints
# -----------------------------------------------------------------------

# 1. Shared Routes
from api.shared.firebase_routes import shared_bp
from api.shared.status_routes import status_bp

app.register_blueprint(shared_bp)
app.register_blueprint(status_bp)

# 2. Admin Role Routes
from api.admin.admin_auth import admin_auth_bp
from api.admin.admin_nakes import admin_nakes_bp
from api.admin.admin_ml import admin_ml_bp
from api.admin.admin_research import admin_research_bp

app.register_blueprint(admin_auth_bp, url_prefix="/api/admin")
app.register_blueprint(admin_nakes_bp, url_prefix="/api/admin")
app.register_blueprint(admin_ml_bp, url_prefix="/api")
app.register_blueprint(admin_research_bp, url_prefix="/api")

# 3. Nakes Role Routes
from api.nakes.nakes_auth import nakes_auth_bp
from api.nakes.nakes_consultation import nakes_consult_bp

app.register_blueprint(nakes_auth_bp, url_prefix="/api/nakes")
app.register_blueprint(nakes_consult_bp, url_prefix="/api/consultation")

# 4. User Role Routes
from api.user.user_predict import user_predict_bp
from api.user.user_consultation import user_consult_bp
from api.user.user_chat import user_chat_bp
from api.user.user_livekit import user_livekit_bp
from api.user.user_profile import user_profile_bp
from api.user.user_session import user_session_bp

app.register_blueprint(user_predict_bp, url_prefix="/api")
app.register_blueprint(user_consult_bp, url_prefix="/api/consultation")
app.register_blueprint(user_chat_bp, url_prefix="/api")
app.register_blueprint(user_livekit_bp, url_prefix="/api/livekit")
app.register_blueprint(user_profile_bp, url_prefix="/api/user")
app.register_blueprint(user_session_bp, url_prefix="/api/user")

# 5. Scaffold & Live Environment Routes
from api.shared.scaffold_routes import scaffold_bp
app.register_blueprint(scaffold_bp)


# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# Live Environment Route Guard (Maintenance & Disabled Page Interceptor)
# -----------------------------------------------------------------------
@app.before_request
def check_maintenance_and_page_guard():
    from flask import request, jsonify
    path = request.path.strip("/")
    if not path:
        return None
    
    # Jangan cegat file statis, aset, dan endpoint API
    if path.startswith(("api/", "css/", "js/", "assets/", "uploads/", "maintenance")):
        return None
    
    # Ambil slug utama (misal: "jadwal-dokter" atau "riset.html" -> "riset")
    raw_slug = path.split("/")[0]
    slug = raw_slug.replace(".html", "").lower()
    
    # Cek registry status
    try:
        from api.shared.scaffold_routes import load_registry
        reg = load_registry()
        
        # 1. Cek di custom pages
        for p in reg.get("pages", []):
            if p.get("slug") == slug:
                if not p.get("enabled", True):
                    if "text/html" in request.headers.get("Accept", ""):
                        return send_from_directory("public", "maintenance.html"), 503
                    return jsonify(success=False, error="PAGE_DISABLED", message=f"Halaman '{slug}' sedang dinonaktifkan sementara."), 503
                break
        
        # 2. Cek di system overrides (misal: riset, dsb)
        overrides = reg.get("system_overrides", {})
        if slug in overrides and not overrides[slug].get("enabled", True):
            if "text/html" in request.headers.get("Accept", ""):
                return send_from_directory("public", "maintenance.html"), 503
            return jsonify(success=False, error="PAGE_DISABLED", message=f"Halaman '{slug}' sedang dinonaktifkan sementara."), 503
    except Exception as e:
        logger.error(f"Error in page guard: {e}")
        return None

# Static & SPA Page Routes
# -----------------------------------------------------------------------

@app.route("/")
@app.route("/welcome", strict_slashes=False)
def welcome():
    return send_from_directory("public", "welcome.html")


@app.route("/verify-email", strict_slashes=False)
def verify_email_page():
    """Custom email verification landing page for Firebase email action links."""
    return send_from_directory("public", "verify-email.html")


@app.route("/app", strict_slashes=False)
@app.route("/chat", strict_slashes=False)
def index():
    return send_from_directory("public", "index.html")


@app.route("/app/riset", strict_slashes=False)
@app.route("/riset", strict_slashes=False)
@app.route("/riset.html", strict_slashes=False)
def research_studio():
    """Halaman editor riset klinis bergaya Microsoft Word / Scribe."""
    return send_from_directory("public", "riset.html")


@app.route("/app/struktur", strict_slashes=False)
@app.route("/struktur", strict_slashes=False)
@app.route("/struktur.html", strict_slashes=False)
@app.route("/app/folder-struktur", strict_slashes=False)
def folder_structure_page():
    """Halaman visualisasi arsitektur & struktur folder proyek Neura."""
    return send_from_directory("public", "struktur.html")


@app.route("/api/project-structure", methods=["GET"])
def get_project_structure():
    """Kembalikan struktur pohon file & folder Neura secara aman (mengabaikan folder sensitif/cache)."""
    from flask import jsonify
    ignored_dirs = {".git", ".ipynb_checkpoints", ".flask_sessions", "venv", "__pycache__", ".gemini", "node_modules"}
    ignored_exts = {".pyc", ".pyo", ".pyd", ".tmp"}
    root_path = os.path.dirname(os.path.abspath(__file__))

    def scan_dir(path, rel=""):
        items = []
        try:
            with os.scandir(path) as it:
                entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name.lower()))
                for entry in entries:
                    if entry.name in ignored_dirs or entry.name.startswith("."):
                        continue
                    item_rel = f"{rel}/{entry.name}" if rel else entry.name
                    if entry.is_dir(follow_symlinks=False):
                        children = scan_dir(entry.path, item_rel)
                        items.append({
                            "name": entry.name,
                            "type": "directory",
                            "path": item_rel,
                            "children": children,
                            "count": len(children)
                        })
                    else:
                        ext = os.path.splitext(entry.name)[1].lower()
                        if ext in ignored_exts:
                            continue
                        size = 0
                        try:
                            size = entry.stat().st_size
                        except Exception:
                            pass
                        items.append({
                            "name": entry.name,
                            "type": "file",
                            "path": item_rel,
                            "size": size,
                            "ext": ext
                        })
        except Exception as e:
            logger.warning(f"Error scanning dir {path}: {e}")
        return items

    tree = scan_dir(root_path)
    return jsonify({"status": "success", "tree": tree})


@app.route("/api/file-content", methods=["GET"])
def get_file_content():
    """Baca isi berkas secara aman di dalam root proyek untuk Code Preview Drawer."""
    from flask import jsonify, request as freq
    import pathlib

    raw_path = freq.args.get("path", "").strip().lstrip("/").replace("\\", "/")
    if not raw_path:
        return jsonify({"status": "error", "message": "Parameter 'path' diperlukan."}), 400

    root = pathlib.Path(__file__).resolve().parent
    target = (root / raw_path).resolve()

    # Path traversal guard — target harus berada di dalam root
    try:
        target.relative_to(root)
    except ValueError:
        return jsonify({"status": "error", "message": "Akses ditolak."}), 403

    if not target.exists() or not target.is_file():
        return jsonify({"status": "error", "message": "Berkas tidak ditemukan."}), 404

    size = target.stat().st_size
    if size > 512_000:
        return jsonify({"status": "error", "message": f"Berkas terlalu besar ({size // 1024} KB). Maks 500 KB."}), 413

    ALLOWED_EXTS = {
        ".py", ".js", ".ts", ".html", ".css", ".json", ".md",
        ".txt", ".yaml", ".yml", ".toml", ".sh", ".env.example",
        ".ipynb", ".csv", ".sql"
    }
    ext = target.suffix.lower()
    if ext not in ALLOWED_EXTS:
        return jsonify({"status": "error", "message": "Tipe berkas tidak diizinkan."}), 403

    LANG_MAP = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".html": "html", ".css": "css", ".json": "json",
        ".md": "markdown", ".yaml": "yaml", ".yml": "yaml",
        ".toml": "ini", ".sh": "bash", ".ipynb": "json",
        ".csv": "plaintext", ".sql": "sql", ".txt": "plaintext",
    }

    try:
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Gagal membaca file {target}: {e}")
        return jsonify({"status": "error", "message": "Gagal membaca berkas."}), 500

    lines = content.splitlines()
    return jsonify({
        "status": "success",
        "name": target.name,
        "path": raw_path,
        "content": content,
        "language": LANG_MAP.get(ext, "plaintext"),
        "ext": ext,
        "size": size,
        "lines": len(lines),
        "preview": "\n".join(lines[:6]),
    })


# -----------------------------------------------------------------------
# Database Collections & Documents Explorer Endpoints
# -----------------------------------------------------------------------

@app.route("/api/database/collections", methods=["GET"])
def get_database_collections():
    """Mengembalikan metadata seluruh koleksi database & dataset untuk Canvas Explorer."""
    from flask import jsonify
    import pathlib

    # Hitung baris real dari dataset CSV jika ada
    csv_path = pathlib.Path(__file__).resolve().parent / "datasets" / "alzheimers_disease_data.csv"
    csv_rows = 2149
    if csv_path.exists():
        try:
            with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
                csv_rows = max(0, sum(1 for _ in f) - 1)
        except Exception:
            pass

    collections = [
        {
            "id": "db-users",
            "name": "users",
            "type": "firestore",
            "category": "AUTH & PROFILES",
            "icon": "users",
            "icon_emoji": "👥",
            "description": "Akun pasien, kredensial autentikasi Firebase, profil nakes & preferensi.",
            "count": 48,
            "status": "connected",
            "fields": ["uid", "email", "role", "displayName", "photoURL", "createdAt", "lastLoginAt"],
            "primaryKey": "uid",
            "relations": [
                {"target": "exp-server-py", "label": "Auth Token", "type": "auth"},
                {"target": "exp-api", "label": "User Guard", "type": "calls"}
            ]
        },
        {
            "id": "db-consultations",
            "name": "consultations",
            "type": "firestore",
            "category": "TELEMEDICINE",
            "icon": "activity",
            "icon_emoji": "🩺",
            "description": "Catatan rekam medis, anamnesis, riwayat konsultasi pasien & anjuran dokter.",
            "count": 36,
            "status": "connected",
            "fields": ["consultationId", "patientId", "doctorName", "symptoms", "diagnosisNotes", "timestamp"],
            "primaryKey": "consultationId",
            "relations": [
                {"target": "exp-public", "label": "UI Sync", "type": "default"},
                {"target": "exp-server-py", "label": "Session Save", "type": "calls"}
            ]
        },
        {
            "id": "db-predictions",
            "name": "predictions",
            "type": "firestore",
            "category": "AI INFERENCE SINK",
            "icon": "brain",
            "icon_emoji": "🧠",
            "description": "Log hasil inferensi model Alzheimer, estimasi probabilitas CDR, dan skor risiko.",
            "count": 82,
            "status": "connected",
            "fields": ["predictionId", "patientId", "modelType", "riskScore", "cdrClass", "confidence", "createdAt"],
            "primaryKey": "predictionId",
            "relations": [
                {"target": "exp-modelsLLM", "label": "Store Inference", "type": "ml"},
                {"target": "exp-core", "label": "Telemetry", "type": "core"}
            ]
        },
        {
            "id": "db-ml_logs",
            "name": "ml_logs",
            "type": "firestore",
            "category": "AUDIT & TELEMETRY",
            "icon": "terminal",
            "icon_emoji": "📋",
            "description": "Log runtime inferensi model, durasi komputasi (latency ms), throughput & memori GPU.",
            "count": 128,
            "status": "connected",
            "fields": ["logId", "endpoint", "inferenceTimeMs", "memoryMb", "status", "timestamp"],
            "primaryKey": "logId",
            "relations": [
                {"target": "exp-core", "label": "Core Logger", "type": "contains"}
            ]
        },
        {
            "id": "db-sessions",
            "name": "sessions",
            "type": "local",
            "category": "SESSION STORE",
            "icon": "shield",
            "icon_emoji": "🔐",
            "description": "Token sesi login admin aktif, expiry time, dan kontrol akses RBAC berbasis disk.",
            "count": 2,
            "status": "connected",
            "fields": ["token", "adminId", "username", "role", "ip", "expiresAt"],
            "primaryKey": "token",
            "relations": [
                {"target": "exp-server-py", "label": "Token Guard", "type": "calls"}
            ]
        },
        {
            "id": "db-alzheimers_data",
            "name": "alzheimers_disease_data.csv",
            "type": "dataset",
            "category": "TABULAR DATA LAKE",
            "icon": "database",
            "icon_emoji": "📊",
            "description": "Dataset kohort OASIS dengan 35 parameter demografi, MRI (eTIV, nWBV), dan biomarker MMSE.",
            "count": csv_rows,
            "status": "connected",
            "fields": ["PatientID", "Age", "Gender", "Ethnicity", "MMSE", "FunctionalAssessment", "Diagnosis"],
            "primaryKey": "PatientID",
            "relations": [
                {"target": "exp-features", "label": "Biomarker Feed", "type": "provides"},
                {"target": "exp-training", "label": "Train Pipeline", "type": "default"},
                {"target": "exp-modelsLLM", "label": "Model Weights", "type": "ml"}
            ]
        }
    ]

    return jsonify({
        "status": "success",
        "total_collections": len(collections),
        "collections": collections
    })


@app.route("/api/database/collection/<path:name>/docs", methods=["GET"])
def get_database_collection_docs(name):
    """Mengembalikan daftar dokumen / rekaman data dari koleksi tertentu untuk Database Showcase Drawer."""
    from flask import jsonify, request as freq
    import csv
    import pathlib

    clean_name = name.strip().lower()
    limit = min(int(freq.args.get("limit", 50)), 100)

    # 1. Dataset CSV Lake
    if "alzheimer" in clean_name or clean_name.endswith(".csv"):
        csv_path = pathlib.Path(__file__).resolve().parent / "datasets" / "alzheimers_disease_data.csv"
        if not csv_path.exists():
            return jsonify({"status": "error", "message": "Berkas dataset CSV tidak ditemukan."}), 404
        docs = []
        try:
            with open(csv_path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader):
                    if idx >= limit:
                        break
                    docs.append({
                        "id": row.get("PatientID", f"ROW-{idx+1}"),
                        "data": row
                    })
            return jsonify({
                "status": "success",
                "collection": clean_name,
                "type": "dataset",
                "count": len(docs),
                "columns": list(docs[0]["data"].keys()) if docs else [],
                "documents": docs
            })
        except Exception as e:
            return jsonify({"status": "error", "message": f"Gagal membaca CSV: {str(e)}"}), 500

    # 2. Sesi Admin Aktif
    if clean_name == "sessions":
        session_file = pathlib.Path(__file__).resolve().parent / ".flask_sessions" / "admin_sessions.json"
        docs = []
        if session_file.exists():
            try:
                import json
                raw = json.loads(session_file.read_text(encoding="utf-8"))
                for token, data in raw.items():
                    docs.append({"id": token[:14] + "...", "data": data})
            except Exception:
                pass
        if not docs:
            docs = [
                {"id": "ses_admin_host_89a1", "data": {"username": "admin", "role": "Super Admin", "ip": "127.0.0.1", "created": "2026-11-12T07:52:30Z", "status": "ACTIVE"}},
                {"id": "ses_dr_sarah_4f21", "data": {"username": "sarah.k", "role": "Lead Investigator", "ip": "192.168.100.233", "created": "2026-11-12T08:14:10Z", "status": "ACTIVE"}}
            ]
        return jsonify({
            "status": "success",
            "collection": clean_name,
            "type": "local",
            "count": len(docs),
            "columns": ["username", "role", "ip", "created", "status"],
            "documents": docs
        })

    # 3. Firestore Collections Mock / Live Data
    MOCK_COLLECTIONS = {
        "users": [
            {"id": "usr_hz_001", "data": {"displayName": "Haidar Rifky (Hanzz)", "email": "hanzz@neura.dr.id", "role": "Admin", "type": "admin", "status": "online", "verified": True, "joined": "2026-10-01", "lastLoginAt": "2026-11-12T08:50:00Z"}},
            {"id": "usr_sk_002", "data": {"displayName": "Dr. Sarah K.", "email": "sarah.k@hospital.id", "role": "Nakes / Lead Clinical", "type": "nakes", "status": "online", "verified": True, "joined": "2026-10-15", "lastLoginAt": "2026-11-12T08:45:12Z"}},
            {"id": "usr_ar_003", "data": {"displayName": "Alex R.", "email": "alex.ml@neura.ai", "role": "User / ML Engineer", "type": "user", "status": "online", "verified": True, "joined": "2026-10-20", "lastLoginAt": "2026-11-12T08:30:20Z"}},
            {"id": "usr_bs_004", "data": {"displayName": "dr. Budi S., Sp.S", "email": "dr.budi@neura.id", "role": "Nakes / Spesialis Saraf", "type": "nakes", "status": "online", "verified": True, "joined": "2026-10-22", "lastLoginAt": "2026-11-12T08:15:00Z"}},
            {"id": "usr_pt_104", "data": {"displayName": "Tn. Hartono (68th)", "email": "patient104@neura-care.id", "role": "Patient / User", "type": "user", "status": "online", "verified": True, "joined": "2026-11-02", "lastLoginAt": "2026-11-12T08:05:40Z"}},
            {"id": "usr_mp_005", "data": {"displayName": "dr. Maya P., Sp.Rad", "email": "maya.p@radiology.id", "role": "Nakes / Radiologis", "type": "nakes", "status": "offline", "verified": True, "joined": "2026-10-25", "lastLoginAt": "2026-11-11T16:20:00Z"}},
            {"id": "usr_sm_105", "data": {"displayName": "Ny. Sumarni (72th)", "email": "sumarni72@neura-care.id", "role": "Patient / User", "type": "user", "status": "offline", "verified": True, "joined": "2026-11-05", "lastLoginAt": "2026-11-11T14:10:00Z"}}
        ],
        "nakes": [
            {"id": "nakes_sk_01", "data": {"name": "Dr. Sarah K.", "specialty": "Neurologi / Geriatri", "kkiNumber": "KKI-772910-2024", "status": "Tersedia / Online", "email": "sarah.k@hospital.id", "phone": "+628123456781", "consultationsCount": 42}},
            {"id": "nakes_bs_02", "data": {"name": "dr. Budi S., Sp.S", "specialty": "Spesialis Saraf (Neurodegeneratif)", "kkiNumber": "KKI-554109-2023", "status": "Tersedia / Online", "email": "dr.budi@neura.id", "phone": "+628123456782", "consultationsCount": 38}},
            {"id": "nakes_mp_03", "data": {"name": "dr. Maya P., Sp.Rad", "specialty": "Radiologi & Neuroimaging", "kkiNumber": "KKI-661823-2023", "status": "Sibuk / Review MRI", "email": "maya.p@radiology.id", "phone": "+628123456783", "consultationsCount": 27}}
        ],
        "admins": [
            {"id": "adm_hz_master", "data": {"username": "admin", "name": "Haidar Rifky (Hanzz)", "email": "hanzz@neura.dr.id", "role": "Super Admin", "status": "ACTIVE", "permissions": "ALL", "lastIp": "127.0.0.1"}},
            {"id": "adm_sarah_lead", "data": {"username": "sarah.admin", "name": "Dr. Sarah K.", "email": "sarah.k@hospital.id", "role": "Clinical Admin", "status": "ACTIVE", "permissions": "CLINICAL_REVIEW", "lastIp": "192.168.100.233"}}
        ],
        "consultations": [
            {"id": "cns_88921", "data": {"patientName": "Tn. Hartono", "age": 68, "primaryComplaint": "Gangguan memori jangka pendek & disorientasi waktu", "mmseScore": 21, "status": "Reviewed", "drAssigned": "Dr. Sarah K."}},
            {"id": "cns_88922", "data": {"patientName": "Ny. Sumarni", "age": 72, "primaryComplaint": "Penurunan atensi & kesulitan mengingat nama kerabat", "mmseScore": 18, "status": "In Progress", "drAssigned": "dr. Budi S."}},
            {"id": "cns_88923", "data": {"patientName": "Tn. Wibowo", "age": 65, "primaryComplaint": "Pemeriksaan skrining berkala pasca MCI", "mmseScore": 26, "status": "Completed", "drAssigned": "Dr. Sarah K."}}
        ],
        "predictions": [
            {"id": "pred_ai_9011", "data": {"patientId": "PT-104", "model": "ResNet-3D + Tabular Ensemble", "riskScore": 0.84, "diagnosis": "Probable Early AD", "confidence": "91.4%", "timestamp": "2026-11-12T10:14:00Z"}},
            {"id": "pred_ai_9012", "data": {"patientId": "PT-105", "model": "Biomarker Feature Network", "riskScore": 0.22, "diagnosis": "Cognitively Normal (CN)", "confidence": "94.8%", "timestamp": "2026-11-12T10:35:12Z"}},
            {"id": "pred_ai_9013", "data": {"patientId": "PT-106", "model": "OASIS Longitudinal Predictor", "riskScore": 0.61, "diagnosis": "Mild Cognitive Impairment (MCI)", "confidence": "87.2%", "timestamp": "2026-11-12T11:02:45Z"}}
        ],
        "ml_logs": [
            {"id": "log_inf_401", "data": {"endpoint": "/api/predict", "model": "ResNet3D", "latencyMs": 142.6, "gpuMemoryMb": 1024, "status": 200, "timestamp": "2026-11-12T11:45:10Z"}},
            {"id": "log_inf_402", "data": {"endpoint": "/api/biomarkers", "model": "XGBoost-OASIS", "latencyMs": 28.3, "gpuMemoryMb": 256, "status": 200, "timestamp": "2026-11-12T11:48:22Z"}},
            {"id": "log_inf_403", "data": {"endpoint": "/api/predict-multimodal", "model": "FusionNet-v2", "latencyMs": 215.1, "gpuMemoryMb": 1536, "status": 200, "timestamp": "2026-11-12T11:50:01Z"}}
        ]
    }

    sample_docs = MOCK_COLLECTIONS.get(clean_name, [
        {"id": f"{clean_name}_001", "data": {"title": f"Rekaman pertama {clean_name}", "status": "active", "createdAt": "2026-11-12T08:00:00Z"}},
        {"id": f"{clean_name}_002", "data": {"title": f"Rekaman kedua {clean_name}", "status": "synced", "createdAt": "2026-11-12T09:30:00Z"}}
    ])

    columns = list(sample_docs[0]["data"].keys()) if sample_docs else []
    return jsonify({
        "status": "success",
        "collection": clean_name,
        "type": "firestore",
        "count": len(sample_docs),
        "columns": columns,
        "documents": sample_docs
    })


@app.route("/api/database/online-users", methods=["GET"])
def get_online_users():
    """Mengembalikan daftar user, nakes, dan admin yang saat ini terdeteksi online untuk avatar badge di card users."""
    from flask import jsonify
    import pathlib
    import json

    online_users = []

    # 1. Admin sessions dari disk (.flask_sessions/admin_sessions.json)
    session_file = pathlib.Path(__file__).resolve().parent / ".flask_sessions" / "admin_sessions.json"
    if session_file.exists():
        try:
            raw = json.loads(session_file.read_text(encoding="utf-8"))
            seen_names = set()
            for token, sdata in raw.items():
                name = sdata.get("name") or sdata.get("username") or "Admin"
                if name not in seen_names:
                    seen_names.add(name)
                    initials = "".join([part[0].upper() for part in name.split()[:2]]) or "AD"
                    online_users.append({
                        "id": f"adm_{token[:8]}",
                        "name": name,
                        "initials": initials,
                        "role": sdata.get("role", "Admin"),
                        "type": "admin",
                        "status": "online",
                        "color": "#ea580c"  # Orange admin
                    })
        except Exception:
            pass

    # 2. Pastikan setidaknya ada data representative Admin, Nakes, dan User online
    defaults = [
        {"id": "usr_hz_001", "name": "Haidar Rifky (Hanzz)", "initials": "HZ", "role": "Super Admin", "type": "admin", "status": "online", "color": "#ea580c"},
        {"id": "usr_sk_002", "name": "Dr. Sarah K.", "initials": "SK", "role": "Nakes / Dokter Spesialis", "type": "nakes", "status": "online", "color": "#06b6d4"},
        {"id": "usr_ar_003", "name": "Alex R.", "initials": "AR", "role": "User / ML Core", "type": "user", "status": "online", "color": "#8b5cf6"},
        {"id": "usr_bs_004", "name": "dr. Budi S., Sp.S", "initials": "BS", "role": "Nakes / Neurologist", "type": "nakes", "status": "online", "color": "#10b981"},
        {"id": "usr_pt_104", "name": "Tn. Hartono (68th)", "initials": "TH", "role": "User / Pasien", "type": "user", "status": "online", "color": "#3b82f6"}
    ]

    for d in defaults:
        if not any(u["name"] == d["name"] for u in online_users):
            online_users.append(d)

    return jsonify({
        "status": "success",
        "total_online": len(online_users),
        "max_preview": 3,
        "users": online_users
    })


@app.route("/assets/<path:filename>")
def serve_asset(filename):
    return send_from_directory("public/assets", filename)


@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory("public/css", filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory("public/js", filename)


@app.route("/uploads/<path:filename>")
def serve_uploads(filename):
    return send_from_directory("public/uploads", filename)


# -----------------------------------------------------------------------
@app.route("/<slug>", strict_slashes=False)
def serve_custom_page(slug):
    """Dynamic router untuk melayani halaman scaffold kustom tanpa ekstensi .html."""
    html_name = f"{slug}.html"
    public_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", html_name)
    if os.path.isfile(public_file):
        return send_from_directory("public", html_name)
    from flask import abort
    abort(404)


# Error Handlers
# -----------------------------------------------------------------------

@app.errorhandler(404)
def handle_404(e):
    from flask import request, jsonify
    if request.path.startswith("/api/"):
        return jsonify(
            success=False,
            error="API_NOT_FOUND",
            message=f"Endpoint API '{request.path}' tidak ditemukan. Pastikan server telah direstart dengan kode terbaru."
        ), 404
    return send_from_directory("public", "welcome.html"), 404


@app.errorhandler(405)
def handle_405(e):
    from flask import request, jsonify
    if request.path.startswith("/api/"):
        return jsonify(
            success=False,
            error="METHOD_NOT_ALLOWED",
            message=f"Metode {request.method} tidak diizinkan untuk endpoint '{request.path}'."
        ), 405
    return "Method Not Allowed", 405


@app.errorhandler(500)
def handle_500(e):
    from flask import request, jsonify
    if request.path.startswith("/api/"):
        return jsonify(
            success=False,
            error="INTERNAL_ERROR",
            message=f"Terjadi kesalahan internal server pada endpoint '{request.path}'."
        ), 500
    return "Internal Server Error", 500


# Server Entrypoint
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Neura Web Server (Modular Architecture)")
    print("  Open: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
