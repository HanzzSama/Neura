"""
app/Models/Consultation.py
==========================
Data Model representing the 'consultations' table.
"""

from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class Consultation:
    table = "consultations"

    @classmethod
    def find_by_doc_id(cls, doc_id: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `doc_id` = %s LIMIT 1"
        rows = execute_query(query, (doc_id.strip(),))
        return rows[0] if rows else None

    @classmethod
    def find_by_nakes_code(cls, nakes_code: str) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `nakes_code` = %s LIMIT 1"
        rows = execute_query(query, (nakes_code.strip(),))
        return rows[0] if rows else None

    @classmethod
    def create(cls, doc_id: str, nakes_code: str, patient_name: str, verification_hash: str,
               patient_id_label: Optional[str] = None, user_id: Optional[int] = None,
               created_at_label: Optional[str] = None, status: str = "VALID_ACTIVE") -> int:
        query = f"""
            INSERT INTO `{cls.table}`
            (`doc_id`, `nakes_code`, `patient_name`, `patient_id_label`, `user_id`, `status`, `verification_hash`, `created_at_label`)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        return execute_insert(query, (doc_id, nakes_code, patient_name, patient_id_label, user_id, status, verification_hash, created_at_label))

    @classmethod
    def update_status(cls, doc_id: str, new_status: str, validated_by_nakes_id: Optional[int] = None) -> int:
        if validated_by_nakes_id:
            query = f"UPDATE `{cls.table}` SET `status` = %s, `validated_by_nakes_id` = %s WHERE `doc_id` = %s"
            return execute_update(query, (new_status, validated_by_nakes_id, doc_id))
        else:
            query = f"UPDATE `{cls.table}` SET `status` = %s WHERE `doc_id` = %s"
            return execute_update(query, (new_status, doc_id))
