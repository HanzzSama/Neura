"""
scripts/predict_xgboost_alzheimer.py
====================================
Inference and Prediction Pipeline for Alzheimer's Disease using trained XGBoost Model.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict

# Ensure UTF-8 output encoding for Windows PowerShell/CMD
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import numpy as np
import pandas as pd
import xgboost as xgb


class AlzheimersPredictor:
    """Predictor wrapper for trained Alzheimer's XGBoost Classifier."""

    def __init__(
        self,
        model_path: str = "public/checkpoints/xgboost_alzheimers.json",
        metrics_path: str = "public/reports/alzheimers_xgboost_metrics.json",
    ):
        self.model_path = Path(model_path)
        self.metrics_path = Path(metrics_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Trained model not found at '{self.model_path}'. "
                f"Please run 'python scripts/train_xgboost_alzheimer.py' first."
            )

        self.model = xgb.XGBClassifier()
        self.model.load_model(str(self.model_path))

        # Load feature metadata (from trained model attributes or metrics file)
        if hasattr(self.model, "feature_names_in_") and self.model.feature_names_in_ is not None:
            self.feature_names = [str(col) for col in self.model.feature_names_in_]
        elif self.metrics_path.exists():
            with open(self.metrics_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            self.feature_names = self.metadata.get("features", [])
        else:
            self.metadata = {}
            self.feature_names = []

        if not self.feature_names:
            self.feature_names = [
                "Age", "Gender", "Ethnicity", "EducationLevel", "BMI",
                "Smoking", "AlcoholConsumption", "PhysicalActivity", "DietQuality", "SleepQuality",
                "FamilyHistoryAlzheimers", "CardiovascularDisease", "Diabetes", "Depression", "HeadInjury", "Hypertension",
                "SystolicBP", "DiastolicBP", "CholesterolTotal", "CholesterolLDL", "CholesterolHDL", "CholesterolTriglycerides",
                "MMSE", "FunctionalAssessment", "MemoryComplaints", "BehavioralProblems", "ADL",
                "Confusion", "Disorientation", "PersonalityChanges", "DifficultyCompletingTasks", "Forgetfulness"
            ]

    def predict_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Run predictions on a pandas DataFrame."""
        clean_df = df.copy()
        for drop_col in ["PatientID", "DoctorInCharge", "Diagnosis"]:
            if drop_col in clean_df.columns:
                clean_df = clean_df.drop(columns=[drop_col])

        # Ensure correct feature ordering
        if self.feature_names:
            for f in self.feature_names:
                if f not in clean_df.columns:
                    clean_df[f] = 0.0
            clean_df = clean_df[self.feature_names]

        probabilities = self.model.predict_proba(clean_df)[:, 1]
        predictions = (probabilities >= 0.5).astype(int)

        results = df.copy()
        results["Alzheimers_Probability"] = np.round(probabilities * 100, 2)
        results["Predicted_Diagnosis"] = predictions
        results["Risk_Level"] = [
            "High Risk (Positive)" if p >= 0.60 else
            "Moderate Risk" if p >= 0.35 else
            "Low Risk (Negative)"
            for p in probabilities
        ]
        return results

    def predict_patient(self, patient_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Run prediction on a single patient dictionary."""
        df_single = pd.DataFrame([patient_dict])
        res_df = self.predict_dataframe(df_single)
        row = res_df.iloc[0]

        prob = float(row["Alzheimers_Probability"])
        pred = int(row["Predicted_Diagnosis"])
        risk = str(row["Risk_Level"])

        return {
            "prediction": pred,
            "diagnosis_label": "Alzheimer's Disease" if pred == 1 else "Non-Alzheimer's",
            "probability_percent": prob,
            "risk_level": risk,
            "confidence": f"{max(prob, 100 - prob):.1f}%",
        }


def run_demo():
    print("=" * 65)
    print("🧠 NEURA AI — ALZHEIMER'S XGBOOST PREDICTION DEMO")
    print("=" * 65)

    predictor = AlzheimersPredictor()
    dataset_file = "datasets/alzheimers_disease_data.csv"

    if os.path.exists(dataset_file):
        df = pd.read_csv(dataset_file).head(5)
        print(f"\nEvaluating first 5 sample patients from: {dataset_file}")
        results = predictor.predict_dataframe(df)

        for i, (_, row) in enumerate(results.iterrows(), start=1):
            actual = int(row["Diagnosis"]) if "Diagnosis" in row else "?"
            pred = int(row["Predicted_Diagnosis"])
            prob = row["Alzheimers_Probability"]
            risk = row["Risk_Level"]
            pid = row.get("PatientID", f"#{i}")
            match_icon = "✅" if actual == pred else "⚠️"

            print(
                f"  Patient {pid} | Actual: {actual} | Pred: {pred} ({match_icon}) "
                f"| Prob: {prob:5.1f}% | Risk: {risk}"
            )


if __name__ == "__main__":
    run_demo()
