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
CORS(app)

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

app.register_blueprint(admin_auth_bp, url_prefix="/api/admin")
app.register_blueprint(admin_nakes_bp, url_prefix="/api/admin")
app.register_blueprint(admin_ml_bp, url_prefix="/api")

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

app.register_blueprint(user_predict_bp, url_prefix="/api")
app.register_blueprint(user_consult_bp, url_prefix="/api/consultation")
app.register_blueprint(user_chat_bp, url_prefix="/api")
app.register_blueprint(user_livekit_bp, url_prefix="/api/livekit")


# -----------------------------------------------------------------------
# Static & SPA Page Routes
# -----------------------------------------------------------------------

@app.route("/")
@app.route("/welcome")
def welcome():
    return send_from_directory("public", "welcome.html")


@app.route("/verify-email")
def verify_email_page():
    """Custom email verification landing page for Firebase email action links."""
    return send_from_directory("public", "verify-email.html")


@app.route("/app")
@app.route("/chat")
def index():
    return send_from_directory("public", "index.html")


@app.route("/assets/<path:filename>")
def serve_asset(filename):
    return send_from_directory("public/assets", filename)


@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory("public/css", filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory("public/js", filename)


# -----------------------------------------------------------------------
# Server Entrypoint
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Neura Web Server (Modular Architecture)")
    print("  Open: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
