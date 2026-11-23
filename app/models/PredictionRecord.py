"""
app/Models/PredictionRecord.py
==============================
Data Model representing the 'prediction_records' table (XGBoost 25 trees & RapidMiner consensus).
"""

import json
from typing import Optional, Dict, Any, List
from app.Services.Database.DatabaseManager import execute_query, execute_insert, execute_update


class PredictionRecord:
    table = "prediction_records"

    @classmethod
    def find_by_id(cls, record_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `id` = %s LIMIT 1"
        rows = execute_query(query, (record_id,))
        return rows[0] if rows else None

    @classmethod
    def find_by_consultation_id(cls, consultation_id: int) -> Optional[Dict[str, Any]]:
        query = f"SELECT * FROM `{cls.table}` WHERE `consultation_id` = %s ORDER BY `id` DESC LIMIT 1"
        rows = execute_query(query, (consultation_id,))
        return rows[0] if rows else None

    @classmethod
    def create(cls, data: Dict[str, Any]) -> int:
        query = f"""
            INSERT INTO `{cls.table}` (
                `consultation_id`, `user_id`, `patient_name`, `source`,
                `ml_label`, `ml_label_name`, `ml_label_badge`, `is_positive`,
                `risk_level`, `risk_level_id`, `probability_1`, `probability_0`, `confidence`,
                `raw_logit_z`, `base_margin`, `sum_tree_weights`, `num_trees`, `active_symptoms_count`,
                `calculation_details`, `symptom_summary`, `all_32_biomarkers`
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data.get("consultation_id"),
            data.get("user_id"),
            data.get("patient_name", "Anonymous"),
            data.get("source", "user_profile"),
            data.get("ml_label", 0),
            data.get("ml_label_name", "Non-Alzheimer's"),
            data.get("ml_label_badge", "success"),
            1 if data.get("is_positive") else 0,
            data.get("risk_level", "LOW"),
            data.get("risk_level_id", "Rendah"),
            data.get("probability_1", 0.0),
            data.get("probability_0", 1.0),
            data.get("confidence", "99.0%"),
            data.get("raw_logit_z", 0.0),
            data.get("base_margin", -0.9694),
            data.get("sum_tree_weights", 0.0),
            data.get("num_trees", 25),
            data.get("active_symptoms_count", 0),
            json.dumps(data.get("calculation_details", {})),
            json.dumps(data.get("symptom_summary", {})),
            json.dumps(data.get("all_32_biomarkers", {})),
        )
        return execute_insert(query, params)
