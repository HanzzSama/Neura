"""
bootstrap/app.py
================
Application Bootstrap & Factory for Neura AI (Neura Clean Architecture).
"""

import os
import sys
import threading
from pathlib import Path
from flask import Flask
from flask_cors import CORS
from flask_session import Session

# Load configuration
from config.app import (
    APP_NAME,
    SECRET_KEY,
    SESSION_TYPE,
    SESSION_FILE_DIR,
    SESSION_PERMANENT,
    PERMANENT_SESSION_LIFETIME,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_HTTPONLY,
    SESSION_COOKIE_SAMESITE,
    SESSION_COOKIE_SECURE,
    PUBLIC_DIR,
    BASE_DIR,
)
from app.Services.Logger.LoggerService import get_logger

logger = get_logger("neura.app")


def _run_background_checks():
    """Background thread to test MySQL connection and pre-warm ML evaluator."""
    try:
        from app.Services.Database.DatabaseManager import test_connection
        connected, msg = test_connection()
        if connected:
            logger.info(f"[Bootstrap] Database MySQL OK: {msg}")
            try:
                from app.Services.Database.UserSyncService import seed_default_admins_and_users
                seed_default_admins_and_users()
            except Exception as seed_err:
                logger.warning(f"[Bootstrap] UserSync default seeding warning: {seed_err}")
        else:
            logger.warning(f"[Bootstrap] Database MySQL Warning: {msg}")
    except Exception as e:
        logger.warning(f"[Bootstrap] Database check error: {e}")

    try:
        from app.Services.ML.XGBoostInferenceService import AlzheimersPredictor
        _ = AlzheimersPredictor()
        logger.info("[Bootstrap] XGBoost Inference Engine pre-warmed.")
    except Exception as e:
        logger.warning(f"[Bootstrap] ML pre-warm warning: {e}")


def create_app() -> Flask:
    """Create and configure the Flask application instance."""
    app = Flask(
        APP_NAME,
        static_folder=str(PUBLIC_DIR),
        template_folder=str(PUBLIC_DIR),
    )

    # App Secrets and Session Configuration
    app.secret_key = SECRET_KEY
    app.config.update(
        SESSION_TYPE=SESSION_TYPE,
        SESSION_FILE_DIR=str(SESSION_FILE_DIR),
        SESSION_PERMANENT=SESSION_PERMANENT,
        PERMANENT_SESSION_LIFETIME=PERMANENT_SESSION_LIFETIME,
        SESSION_COOKIE_NAME=SESSION_COOKIE_NAME,
        SESSION_COOKIE_HTTPONLY=SESSION_COOKIE_HTTPONLY,
        SESSION_COOKIE_SAMESITE=SESSION_COOKIE_SAMESITE,
        SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
    )

    # Enable CORS
    CORS(app, supports_credentials=True)

    # Initialize Session
    os.makedirs(SESSION_FILE_DIR, exist_ok=True)
    Session(app)

    # Register Routes
    from routes import register_routes
    register_routes(app)

    @app.after_request
    def _inject_global_loadscreen(response):
        try:
            from flask import request as _req
            if (
                response.mimetype == "text/html"
                and not _req.path.startswith("/api/")
            ):
                response.direct_passthrough = False
                html = response.get_data(as_text=True)
                lower_html = html.lower()
                head_idx = lower_html.rfind("</head>")
                if "global-loadscreen.css" not in html and head_idx != -1:
                    inject_head = (
                        '  <link rel="stylesheet" href="/css/global-loadscreen.css?v=2.0" />\n'
                        '  <script src="/js/global-loadscreen.js?v=2.0"></script>\n'
                    )
                    html = html[:head_idx] + inject_head + html[head_idx:]
                elif "global-loadscreen.js" not in html:
                    body_idx = html.lower().rfind("</body>")
                    if body_idx != -1:
                        html = html[:body_idx] + '  <script src="/js/global-loadscreen.js?v=2.0"></script>\n' + html[body_idx:]
                response.set_data(html)
        except Exception:
            pass
        return response

    # Run non-blocking background initialization
    threading.Thread(target=_run_background_checks, daemon=True).start()

    logger.info(f"[Bootstrap] {APP_NAME} initialized successfully (Neura Clean Architecture).")
    return app
