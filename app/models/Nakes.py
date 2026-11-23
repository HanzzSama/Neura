"""
app/Models/Nakes.py
===================
Data Model representing the 'nakes' (Tenaga Kesehatan) table.
"""

from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class Nakes:
    table = "nakes"

    @classmethod
    def find_by_id(cls, nakes_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `id` = %s LIMIT 1"
        rows = execute_query(query, (nakes_id,))
        return rows[0] if rows else None

    @classmethod
    def find_by_sip(cls, sip: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `sip` = %s LIMIT 1"
        rows = execute_query(query, (sip.strip(),))
        return rows[0] if rows else None

    @classmethod
    def find_by_str(cls, str_num: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `str` = %s LIMIT 1"
        rows = execute_query(query, (str_num.strip(),))
        return rows[0] if rows else None

    @classmethod
    def all_active(cls) -> List[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `status_validation` = 'ACTIVE' ORDER BY `full_name` ASC"
        return execute_query(query)

    @classmethod
    def create(cls, data: Dict[str, Any]) -> int:
        query = f"""
            INSERT INTO `{cls.table}`
            (`user_id`, `sip`, `str`, `nip`, `full_name`, `specialization`, `facility_name`, `phone_number`, `email`, `status_validation`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data.get("user_id"),
            data.get("sip"),
            data.get("str"),
            data.get("nip"),
            data.get("full_name"),
            data.get("specialization", "Dokter Spesialis Saraf (Sp.S / Sp.N)"),
            data.get("facility_name"),
            data.get("phone_number"),
            data.get("email"),
            data.get("status_validation", "ACTIVE"),
        )
        return execute_insert(query, params)
