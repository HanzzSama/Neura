"""
app/Models/User.py
==================
Data Model representing the 'users' table in MySQL (Neura Clean Architecture).
"""

from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class User:
    table = "users"

    @classmethod
    def find_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `id` = %s LIMIT 1"
        rows = execute_query(query, (user_id,))
        return rows[0] if rows else None

    @classmethod
    def find_by_email(cls, email: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE LOWER(`email`) = LOWER(%s) LIMIT 1"
        rows = execute_query(query, (email.strip(),))
        return rows[0] if rows else None

    @classmethod
    def create(cls, email: str, password_hash: str, full_name: str, phone: Optional[str] = None, role: str = "User", avatar_url: Optional[str] = None) -> int:
        query = f"""
            INSERT INTO `{cls.table}` (`email`, `password_hash`, `full_name`, `phone`, `role`, `avatar_url`)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        return execute_insert(query, (email, password_hash, full_name, phone, role, avatar_url))

    @classmethod
    def all(cls, limit: int = 100) -> List[Dict[str, Any]]:
        query = f"SELECT `id`, `email`, `full_name`, `phone`, `role`, `avatar_url`, `created_at` FROM `{cls.table}` ORDER BY `id` DESC LIMIT %s"
        return execute_query(query, (limit,))
