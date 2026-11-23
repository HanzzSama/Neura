"""
app/Models/ResearchDispatch.py
==============================
Data Model for research_dispatches and research_subscribers tables.
"""

from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class ResearchDispatch:
    table = "research_dispatches"

    @classmethod
    def all_published(cls, limit: int = 50) -> List[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` ORDER BY `published_at` DESC LIMIT %s"
        return execute_query(query, (limit,))

    @classmethod
    def find_by_id(cls, dispatch_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `id` = %s LIMIT 1"
        rows = execute_query(query, (dispatch_id,))
        return rows[0] if rows else None

    @classmethod
    def create(cls, title: str, category: str, abstract: str, content: str, author: str = "Neura Clinical Research Team", badge_label: str = "Peer Reviewed", is_featured: int = 0) -> int:
        query = f"""
            INSERT INTO `{cls.table}` (`title`, `category`, `abstract`, `content`, `author`, `badge_label`, `is_featured`)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        return execute_insert(query, (title, category, abstract, content, author, badge_label, is_featured))
