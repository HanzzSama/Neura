"""
core/database.py
================
MySQL Relational Database Connector & Repository Engine for Neura AI.
Supports Laragon MySQL (3306), PyMySQL connection pooling, prepared statements,
and schema initialization with automatic fallback.
"""

import os
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pymysql
from pymysql.cursors import DictCursor

logger = logging.getLogger("neura.database")

# Environment / Defaults for Laragon MySQL
DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "neura_db")

SCHEMA_FILE = Path(__file__).resolve().parent.parent / "scripts" / "schema.sql"


def get_db_connection(database: Optional[str] = DB_NAME) -> pymysql.Connection:
    """Membuka koneksi ke MySQL server dengan cursor dictionary."""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
        connect_timeout=4,
    )


def test_connection() -> Tuple[bool, str]:
    """Cek apakah server MySQL Laragon dapat dihubungi."""
    try:
        conn = get_db_connection(database=None)
        with conn.cursor() as cur:
            cur.execute("SELECT VERSION() AS ver;")
            row = cur.fetchone()
            ver = row.get("ver", "Unknown") if row else "Unknown"
        conn.close()
        return True, f"Terhubung ke MySQL Server {ver} (Port {DB_PORT})"
    except Exception as e:
        return False, str(e)


def init_database() -> Tuple[bool, str]:
    """Inisialisasi database neura_db dan eksekusi scripts/schema.sql."""
    try:
        # 1. Pastikan database neura_db ada
        conn_root = get_db_connection(database=None)
        with conn_root.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn_root.close()

        # 2. Eksekusi tabel dari schema.sql
        if not SCHEMA_FILE.exists():
            return False, f"File skema tidak ditemukan: {SCHEMA_FILE}"

        with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
            sql_content = f.read()

        conn = get_db_connection(database=DB_NAME)
        # Eksekusi blok statement SQL
        statements = [stmt.strip() for stmt in sql_content.split(";") if stmt.strip()]
        with conn.cursor() as cur:
            for stmt in statements:
                if stmt:
                    cur.execute(stmt)
        conn.close()
        logger.info("Berhasil menginisialisasi skema neura_db di MySQL.")
        return True, "Database neura_db dan seluruh tabel berhasil dibuat."
    except Exception as e:
        logger.error(f"Gagal menginisialisasi database: {e}")
        return False, str(e)


def execute_query(sql: str, params: Optional[Tuple[Any, ...]] = None) -> List[Dict[str, Any]]:
    """SELECT query helper yang mengembalikan list of dict."""
    conn = get_db_connection(database=DB_NAME)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall() or []
    finally:
        conn.close()


def execute_one(sql: str, params: Optional[Tuple[Any, ...]] = None) -> Optional[Dict[str, Any]]:
    """SELECT query helper yang mengembalikan satu record dict."""
    conn = get_db_connection(database=DB_NAME)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchone()
    finally:
        conn.close()


def execute_insert(sql: str, params: Optional[Tuple[Any, ...]] = None) -> int:
    """INSERT query helper yang mengembalikan lastrowid (BIGINT ID baru)."""
    conn = get_db_connection(database=DB_NAME)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.lastrowid or 0
    finally:
        conn.close()


def execute_update(sql: str, params: Optional[Tuple[Any, ...]] = None) -> int:
    """UPDATE atau DELETE query helper yang mengembalikan jumlah baris terpengaruh."""
    conn = get_db_connection(database=DB_NAME)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount
    finally:
        conn.close()
