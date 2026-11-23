"""
config/database.py
==================
MySQL Database Configurations (Laragon default).
"""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "neura_db")

SCHEMA_FILE = PROJECT_ROOT / "database" / "migrations" / "schema.sql"
