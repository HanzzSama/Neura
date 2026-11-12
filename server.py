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


# -----------------------------------------------------------------------
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
# Server Entrypoint
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Neura Web Server (Modular Architecture)")
    print("  Open: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
