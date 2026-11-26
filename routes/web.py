"""
routes/web.py
=============
Web, static assets, SPA landing pages, and explorer endpoints for Neura AI.
"""

import os
from pathlib import Path
from flask import Flask, send_from_directory, jsonify, request, abort
from config.app import PUBLIC_DIR, BASE_DIR, STORAGE_DIR
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)


def register_web_routes(app: Flask):
    """Register static views, landing pages, and developer explorer routes."""

    @app.before_request
    def check_maintenance_and_page_guard():
        path = request.path.strip("/")
        if not path:
            return None
        if path.startswith(("api/", "css/", "js/", "assets/", "uploads/", "maintenance")):
            return None

        raw_slug = path.split("/")[0]
        slug = raw_slug.replace(".html", "").lower()
        try:
            from app.Http.Controllers.Shared.scaffold_routes import load_registry
            reg = load_registry()
            for p in reg.get("pages", []):
                if p.get("slug") == slug and not p.get("enabled", True):
                    if "text/html" in request.headers.get("Accept", ""):
                        return send_from_directory("public", "maintenance.html"), 503
                    return jsonify(success=False, error="PAGE_DISABLED", message=f"Halaman '{slug}' sedang dinonaktifkan sementara."), 503

            overrides = reg.get("system_overrides", {})
            if slug in overrides and not overrides[slug].get("enabled", True):
                if "text/html" in request.headers.get("Accept", ""):
                    return send_from_directory("public", "maintenance.html"), 503
                return jsonify(success=False, error="PAGE_DISABLED", message=f"Halaman '{slug}' sedang dinonaktifkan sementara."), 503
        except Exception:
            return None

    @app.route("/")
    @app.route("/welcome", strict_slashes=False)
    def welcome():
        return send_from_directory(PUBLIC_DIR, "welcome.html")

    @app.route("/verify-email", strict_slashes=False)
    def verify_email_page():
        return send_from_directory(PUBLIC_DIR, "verify-email.html")

    @app.route("/app", strict_slashes=False)
    @app.route("/chat", strict_slashes=False)
    def index():
        return send_from_directory(PUBLIC_DIR, "index.html")

    @app.route("/app/riset", strict_slashes=False)
    @app.route("/riset", strict_slashes=False)
    @app.route("/riset.html", strict_slashes=False)
    def research_studio():
        return send_from_directory(PUBLIC_DIR, "riset.html")

    @app.route("/app/struktur", strict_slashes=False)
    @app.route("/struktur", strict_slashes=False)
    @app.route("/struktur.html", strict_slashes=False)
    @app.route("/app/folder-struktur", strict_slashes=False)
    def folder_structure_page():
        return send_from_directory(PUBLIC_DIR, "struktur.html")

    @app.route("/admin", strict_slashes=False)
    @app.route("/app/admin", strict_slashes=False)
    @app.route("/admin.html", strict_slashes=False)
    def admin_hub_page():
        return send_from_directory(PUBLIC_DIR, "admin.html")

    @app.route("/welcome/nakes/qr-code", strict_slashes=False)
    def nakes_qr_invite_page():
        return send_from_directory(PUBLIC_DIR, "nakes-qr.html")

    @app.route("/nakes/register", strict_slashes=False)
    def nakes_self_register_page():
        return send_from_directory(PUBLIC_DIR, "nakes-register.html")

    @app.route("/nakes/code-res", strict_slashes=False)
    def nakes_code_res_page():
        return send_from_directory(PUBLIC_DIR, "nakes-code-res.html")

    @app.route("/nakes", strict_slashes=False)
    @app.route("/nakes.html", strict_slashes=False)
    def nakes_hub_page():
        return send_from_directory(PUBLIC_DIR, "nakes.html")

    @app.route("/api/project-structure", methods=["GET"])
    def get_project_structure():
        ignored_dirs = {".git", ".ipynb_checkpoints", ".flask_sessions", "venv", "__pycache__", ".gemini", "node_modules"}
        ignored_exts = {".pyc", ".pyo", ".pyd", ".tmp"}
        root_path = str(BASE_DIR)

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
                            try:
                                size = entry.stat().st_size
                            except Exception:
                                size = 0
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
        raw_path = request.args.get("path", "").strip().lstrip("/").replace("\\", "/")
        if not raw_path:
            return jsonify({"status": "error", "message": "Parameter 'path' diperlukan."}), 400

        target = (BASE_DIR / raw_path).resolve()
        try:
            target.relative_to(BASE_DIR)
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
            return jsonify({"status": "error", "message": str(e)}), 500

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
        return send_from_directory(PUBLIC_DIR / "assets", filename)

    @app.route("/css/<path:filename>")
    def serve_css(filename):
        return send_from_directory(PUBLIC_DIR / "css", filename)

    @app.route("/js/<path:filename>")
    def serve_js(filename):
        return send_from_directory(PUBLIC_DIR / "js", filename)

    @app.route("/uploads/<path:filename>")
    def serve_uploads(filename):
        return send_from_directory(PUBLIC_DIR / "uploads", filename)

    @app.route("/checkpoints/<path:filename>")
    def serve_checkpoints(filename):
        return send_from_directory(STORAGE_DIR / "checkpoints", filename)

    @app.route("/reports/<path:filename>")
    def serve_reports(filename):
        return send_from_directory(STORAGE_DIR / "reports", filename)

    @app.route("/<slug>", strict_slashes=False)
    def serve_custom_page(slug):
        html_name = f"{slug}.html"
        public_file = PUBLIC_DIR / html_name
        if public_file.is_file():
            return send_from_directory(PUBLIC_DIR, html_name)
        abort(404)

    @app.errorhandler(404)
    def handle_404(e):
        if request.path.startswith("/api/"):
            return jsonify(
                success=False,
                error="API_NOT_FOUND",
                message=f"Endpoint API '{request.path}' tidak ditemukan."
            ), 404
        return send_from_directory(PUBLIC_DIR, "welcome.html"), 404

    @app.errorhandler(405)
    def handle_405(e):
        if request.path.startswith("/api/"):
            return jsonify(
                success=False,
                error="METHOD_NOT_ALLOWED",
                message=f"Metode {request.method} tidak diizinkan untuk endpoint '{request.path}'."
            ), 405
        return "Method Not Allowed", 405

    @app.errorhandler(500)
    def handle_500(e):
        if request.path.startswith("/api/"):
            return jsonify(
                success=False,
                error="INTERNAL_ERROR",
                message=f"Terjadi kesalahan internal server pada endpoint '{request.path}'."
            ), 500
        return "Internal Server Error", 500
