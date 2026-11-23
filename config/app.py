"""
config/app.py
=============
Central Application & Environment Configurations (Neura Clean Architecture).
"""

import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BASE_DIR = PROJECT_ROOT
PUBLIC_DIR = BASE_DIR / "public"
STORAGE_DIR = BASE_DIR / "storage"
STORAGE_PATH = STORAGE_DIR

load_dotenv(PROJECT_ROOT / ".env")

APP_NAME = os.getenv("APP_NAME", "Neura AI")
APP_ENV = os.getenv("APP_ENV", "production")
DEBUG = os.getenv("APP_DEBUG", "false").lower() in ("true", "1", "yes")

# Secret key statis fallback
STATIC_SECRET_FALLBACK = "8f7e4bce82d6c87bfea4937b969ebb31baf606dd5415a746991f422f64bb4c5b"
SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or STATIC_SECRET_FALLBACK

# Storage paths
SESSIONS_PATH = STORAGE_DIR / "framework" / "sessions"
LOGS_PATH = STORAGE_DIR / "logs"

SESSIONS_PATH.mkdir(parents=True, exist_ok=True)
LOGS_PATH.mkdir(parents=True, exist_ok=True)

# LiveKit & Voice
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "https://your-project.livekit.cloud")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")

# Session configurations
SESSION_TYPE = "filesystem"
SESSION_FILE_DIR = SESSIONS_PATH
SESSION_PERMANENT = True
PERMANENT_SESSION_LIFETIME = timedelta(days=30)
SESSION_COOKIE_NAME = "neura_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = False

SESSION_CONFIG = {
    "SECRET_KEY": SECRET_KEY,
    "SESSION_TYPE": SESSION_TYPE,
    "SESSION_FILE_DIR": str(SESSION_FILE_DIR),
    "SESSION_PERMANENT": SESSION_PERMANENT,
    "PERMANENT_SESSION_LIFETIME": PERMANENT_SESSION_LIFETIME,
    "SESSION_COOKIE_NAME": SESSION_COOKIE_NAME,
    "SESSION_COOKIE_HTTPONLY": SESSION_COOKIE_HTTPONLY,
    "SESSION_COOKIE_SAMESITE": SESSION_COOKIE_SAMESITE,
    "SESSION_COOKIE_SECURE": SESSION_COOKIE_SECURE,
}
