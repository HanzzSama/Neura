"""
scripts/predict_xgboost_alzheimer.py
====================================
Inference and Prediction Pipeline for Alzheimer's Disease using trained XGBoost Model
AND RapidMiner Decision Tree Rule Classifier (implementations.txt alignment).
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.Services.ML.RapidMinerTreeService import predict_rapidminer_tree
from app.Services.ML.XGBoostInferenceService import PureTreeEvaluator, AlzheimersPredictor

__all__ = ["predict_rapidminer_tree", "PureTreeEvaluator", "AlzheimersPredictor"]

if __name__ == "__main__":
    test_patient = {
        "Age": 74,
        "Gender": 1,
        "Ethnicity": 0,
        "EducationLevel": 1,
        "BMI": 24.5,
        "Smoking": 0,
        "AlcoholConsumption": 4.2,
        "PhysicalActivity": 2.1,
        "DietQuality": 6.0,
        "SleepQuality": 7.0,
        "SystolicBP": 138,
        "DiastolicBP": 84,
        "CholesterolTotal": 215.0,
        "CholesterolLDL": 130.0,
        "CholesterolHDL": 48.0,
        "CholesterolTriglycerides": 160.0,
        "MMSE": 14.5,
        "FunctionalAssessment": 4.2,
        "MemoryComplaints": 1,
        "BehavioralProblems": 1,
        "ADL": 3.8
    }

    print("\n" + "=" * 65)
    print("🧠 NEURA AI — BENCHMARK UJI COBA (implementations.txt Section 5)")
    print("=" * 65)

    print("\n--- 1. PREDIKSI MENGGUNAKAN ATURAN RAPIDMINER ---")
    rm_result = predict_rapidminer_tree(test_patient)
    print(f"Hasil Diagnosis: {rm_result['label']} (Kode: {rm_result['diagnosis']})")
    print(f"Keyakinan Daun : {rm_result['confidence'] * 100:.1f}%")
    print(f"Aturan Daun    : {rm_result['leaf_counts']}")
    print(f"Jalur Aturan   : {rm_result['rule_path']}")

    print("\n--- 2. INFERENSI XGBOOST CLASSIFIER ---")
    predictor = AlzheimersPredictor()
    xgb_res = predictor.predict_patient(test_patient)
    print(f"Hasil Diagnosis XGBoost: {xgb_res['diagnosis_label']} (Kode: {xgb_res['prediction']})")
    print(f"Probabilitas Risiko    : {xgb_res['probability_percent_1']:.2f}%")
    print(f"Konsensus Model        : {xgb_res['consensus']['status']}")
    print("=" * 65 + "\n")
