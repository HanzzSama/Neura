"""
app/Services/Database/DatabaseManager.py
=======================================
MySQL Relational Database Service & Connection Pool for Neura AI.
Configured via config.database (Laragon MySQL 8.4 on Port 3306).
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pymysql
from pymysql.cursors import DictCursor

from config.database import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, SCHEMA_FILE
from app.Services.Logger.LoggerService import get_logger

logger = get_logger("neura.database")


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
        connect_timeout=2,
    )


import time

_last_check_time = 0.0
_cached_availability = (False, "Belum diperiksa")


def is_mysql_available(cache_ttl_sec: int = 4) -> Tuple[bool, str]:
    """Cek cepat ketersediaan MySQL dengan cache TTL agar request API tidak blocking."""
    global _last_check_time, _cached_availability
    now = time.time()
    if _cached_availability[0] and (now - _last_check_time) < cache_ttl_sec:
        return _cached_availability
    if not _cached_availability[0] and (now - _last_check_time) < 2.5:
        return _cached_availability
    ok, msg = test_connection()
    _cached_availability = (ok, msg)
    _last_check_time = now
    return _cached_availability


def test_connection() -> Tuple[bool, str]:
    """Cek koneksi ke server MySQL Laragon."""
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
    """Inisialisasi database neura_db dan eksekusi database/migrations/schema.sql."""
    try:
        # 1. Pastikan database neura_db ada
        conn_root = get_db_connection(database=None)
        with conn_root.cursor() as cur:
            cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
        conn_root.close()

        # 2. Eksekusi file skema SQL
        target_schema = SCHEMA_FILE
        if not target_schema.exists():
            fallback_schema = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "schema.sql"
            if fallback_schema.exists():
                target_schema = fallback_schema
            else:
                return False, f"File skema tidak ditemukan di {SCHEMA_FILE}"

        with open(target_schema, "r", encoding="utf-8") as f:
            sql_content = f.read()

        conn = get_db_connection(database=DB_NAME)
        statements = [stmt.strip() for stmt in sql_content.split(";") if stmt.strip()]
        with conn.cursor() as cur:
            for stmt in statements:
                if stmt:
                    cur.execute(stmt)
        conn.close()
        logger.info("Berhasil menginisialisasi skema neura_db di MySQL.")
        return True, "Database neura_db dan seluruh tabel berhasil dibuat."
    except Exception as e:
        logger.error(f"Gagal inisialisasi database: {e}")
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
