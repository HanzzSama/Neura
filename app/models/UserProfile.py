"""
app/Models/UserProfile.py
=========================
Data Model representing the 'user_profiles' table (32 Biomarkers & Symptoms).
"""

from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class UserProfile:
    table = "user_profiles"

    @classmethod
    def find_by_id(cls, profile_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `id` = %s LIMIT 1"
        rows = execute_query(query, (profile_id,))
        return rows[0] if rows else None

    @classmethod
    def find_by_user_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `user_id` = %s ORDER BY `id` DESC LIMIT 1"
        rows = execute_query(query, (user_id,))
        return rows[0] if rows else None

    @classmethod
    def create(cls, data: Dict[str, Any]) -> int:
        fields = [
            "user_id", "patient_name", "age", "gender", "ethnicity", "education_level",
            "height", "weight", "bmi", "systolic_bp", "diastolic_bp",
            "smoking", "alcohol_consumption", "physical_activity", "diet_quality", "sleep_quality",
            "family_history_alzheimers", "cardiovascular_disease", "diabetes", "depression",
            "head_injury", "hypertension", "cholesterol_total", "cholesterol_ldl", "cholesterol_hdl",
            "cholesterol_triglycerides", "mmse", "functional_assessment", "adl",
            "memory_complaints", "behavioral_problems", "confusion", "disorientation",
            "personality_changes", "difficulty_completing_tasks", "forgetfulness"
        ]
        present_fields = [f for f in fields if f in data]
        if not present_fields:
            raise ValueError("No valid profile fields provided")
        cols = ", ".join([f"`{f}`" for f in present_fields])
        placeholders = ", ".join(["%s"] * len(present_fields))
        values = [data[f] for f in present_fields]
        query = f"INSERT INTO `{cls.table}` ({cols}) VALUES ({placeholders})"
        return execute_insert(query, tuple(values))
