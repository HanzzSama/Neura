"""
api/user/user_predict.py
========================
User / Pasien AI Alzheimer's Prediction:
  POST/GET /api/predict — Prediksi risiko Alzheimer menggunakan model XGBoost (32 biomarker).
"""

import traceback
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

user_predict_bp = Blueprint("user_predict", __name__)


def map_user_profile_to_features(p: dict) -> dict:
    """Konversi dictionary profil pengguna (camelCase / snake_case) ke 32 biomarker dataset XGBoost."""
    gender_raw = str(p.get("gender", "")).lower()
    gender_val = 1 if gender_raw in ["female", "perempuan", "1"] else 0

    bmi = p.get("bmi")
    if not bmi:
        try:
            h = float(p.get("height", 0)) / 100.0
            w = float(p.get("weight", 0))
            if h > 0 and w > 0:
                bmi = round(w / (h * h), 2)
        except Exception:
            bmi = None
    if not bmi:
        bmi = 22.5

    def get_num(keys, default):
        for k in keys:
            if k in p and p[k] is not None:
                try:
                    return float(p[k])
                except Exception:
                    pass
        return default

    def get_int(keys, default):
        for k in keys:
            if k in p and p[k] is not None:
                try:
                    return int(float(p[k]))
                except Exception:
                    pass
        return default

    return {
        "Age": get_int(["age", "Age"], 65),
        "Gender": gender_val,
        "Ethnicity": get_int(["ethnicity", "Ethnicity"], 0),
        "EducationLevel": get_int(["educationLevel", "education_level", "EducationLevel"], 1),
        "BMI": float(bmi),
        "Smoking": get_int(["smoking", "Smoking"], 0),
        "AlcoholConsumption": get_num(["alcoholConsumption", "alcohol_consumption", "AlcoholConsumption"], 5.0),
        "PhysicalActivity": get_num(["physicalActivity", "physical_activity", "PhysicalActivity"], 5.0),
        "DietQuality": get_num(["dietQuality", "diet_quality", "DietQuality"], 5.0),
        "SleepQuality": get_num(["sleepQuality", "sleep_quality", "SleepQuality"], 7.0),
        "FamilyHistoryAlzheimers": get_int(["familyHistoryAlzheimers", "family_history_alzheimers", "FamilyHistoryAlzheimers"], 1 if p.get("familyHistory") == "yes" else 0),
        "CardiovascularDisease": get_int(["cardiovascularDisease", "cardiovascular_disease", "CardiovascularDisease"], 0),
        "Diabetes": get_int(["diabetes", "Diabetes"], 0),
        "Depression": get_int(["depression", "Depression"], 0),
        "HeadInjury": get_int(["headInjury", "head_injury", "HeadInjury"], 0),
        "Hypertension": get_int(["hypertension", "Hypertension"], 0),
        "SystolicBP": get_int(["systolicBP", "systolic_bp", "SystolicBP"], 120),
        "DiastolicBP": get_int(["diastolicBP", "diastolic_bp", "DiastolicBP"], 80),
        "CholesterolTotal": get_num(["cholesterolTotal", "cholesterol_total", "CholesterolTotal"], 200.0),
        "CholesterolLDL": get_num(["cholesterolLDL", "cholesterol_ldl", "CholesterolLDL"], 100.0),
        "CholesterolHDL": get_num(["cholesterolHDL", "cholesterol_hdl", "CholesterolHDL"], 50.0),
        "CholesterolTriglycerides": get_num(["cholesterolTriglycerides", "cholesterol_triglycerides", "CholesterolTriglycerides"], 150.0),
        "MMSE": get_num(["mmse", "MMSE"], 24.0),
        "FunctionalAssessment": get_num(["functionalAssessment", "functional_assessment", "FunctionalAssessment"], 7.0),
        "MemoryComplaints": get_int(["memoryComplaints", "memory_complaints", "MemoryComplaints"], 0),
        "BehavioralProblems": get_int(["behavioralProblems", "behavioral_problems", "BehavioralProblems"], 0),
        "ADL": get_num(["adl", "ADL"], 7.0),
        "Confusion": get_int(["confusion", "Confusion"], 0),
        "Disorientation": get_int(["disorientation", "Disorientation"], 0),
        "PersonalityChanges": get_int(["personalityChanges", "personality_changes", "PersonalityChanges"], 0),
        "DifficultyCompletingTasks": get_int(["difficultyCompletingTasks", "difficulty_completing_tasks", "DifficultyCompletingTasks"], 0),
        "Forgetfulness": get_int(["forgetfulness", "Forgetfulness"], 0),
    }


@user_predict_bp.route("/predict", methods=["GET", "POST"])
def api_predict():
    try:
        import random
        import pandas as pd
        from scripts.predict_xgboost_alzheimer import AlzheimersPredictor

        predictor = AlzheimersPredictor()
        body = request.get_json(silent=True) or {}
        patient_input = body.get("input", None)
        mode = body.get("mode", "")

        df_raw = pd.read_csv("datasets/alzheimers_disease_data.csv")

        # Prioritize real patient Data Diri if provided and mode is not explicit dataset simulation
        if patient_input is not None and isinstance(patient_input, dict) and mode != "dataset":
            mapped_patient = map_user_profile_to_features(patient_input)
            res = predictor.predict_patient(mapped_patient)
            patient_data = mapped_patient
            source = "user_profile"
            patient_name = patient_input.get("name", "Pasien").strip() or "Pasien"
            pid = patient_name
            actual = None
        else:
            # Benchmark simulation using a random patient sample from the 2,149 dataset rows
            rand_idx = random.randint(0, len(df_raw) - 1)
            sample_row = df_raw.iloc[rand_idx].to_dict()
            res = predictor.predict_patient(sample_row)
            patient_data = sample_row
            source = "dataset_sample"
            pid = patient_data.get("PatientID", rand_idx + 1)
            patient_name = f"Pasien #{pid}"
            actual = patient_data.get("Diagnosis", None)

        key_markers = {
            "Age": int(patient_data.get("Age", 72)),
            "Gender": "Male" if int(patient_data.get("Gender", 0)) == 0 else "Female",
            "MMSE": round(float(patient_data.get("MMSE", 20.0)), 1),
            "ADL": round(float(patient_data.get("ADL", 5.0)), 1),
            "FunctionalAssessment": round(float(patient_data.get("FunctionalAssessment", 5.0)), 1),
            "MemoryComplaints": "Yes" if int(patient_data.get("MemoryComplaints", 0)) == 1 else "No",
            "BehavioralProblems": "Yes" if int(patient_data.get("BehavioralProblems", 0)) == 1 else "No",
            "BMI": round(float(patient_data.get("BMI", 22.5)), 1),
            "SystolicBP": int(patient_data.get("SystolicBP", 120)),
            "DiastolicBP": int(patient_data.get("DiastolicBP", 80)),
        }

        prob_pos = round(float(res["probability_percent"]), 2)
        prob_neg = round(float(100.0 - prob_pos), 2)

        return jsonify({
            "source": source,
            "patient_name": patient_name,
            "patient_id": int(pid) if isinstance(pid, (int, float)) else str(pid),
            "actual_diagnosis": int(actual) if actual is not None else None,
            "predicted_class": res["diagnosis_label"],
            "is_positive": res["prediction"] == 1,
            "risk_level": res["risk_level"],
            "probability": prob_pos,
            "confidence": res["confidence"],
            "key_markers": key_markers,
            "probabilities": [
                {"class": "Non-Alzheimer's", "prob": round(prob_neg / 100.0, 4)},
                {"class": "Alzheimer's Disease", "prob": round(prob_pos / 100.0, 4)},
            ]
        })
    except Exception as e:
        logger.error(f"Error in api_predict: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
