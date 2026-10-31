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

import math
import re
import numpy as np
import pandas as pd
try:
    import xgboost as xgb
except Exception:
    xgb = None


class PureTreeEvaluator:
    """Zero-dependency pure Python/NumPy decision tree evaluator for XGBoost JSON models."""

    def __init__(self, model_path: Path):
        with open(model_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        learner = data.get("learner", {})
        self.trees = learner.get("gradient_booster", {}).get("model", {}).get("trees", [])
        self.feature_names = learner.get("feature_names", [])
        raw_base = learner.get("learner_model_param", {}).get("base_score", "0.5")
        clean_base = float(re.sub(r"[\[\]]", "", str(raw_base)))
        if 0 < clean_base < 1:
            self.base_margin = math.log(clean_base / (1.0 - clean_base))
        else:
            self.base_margin = 0.0

    def predict_proba_single(self, row_dict: Dict[str, Any]) -> float:
        x_vec = []
        for feat in self.feature_names:
            val = row_dict.get(feat, 0.0)
            try:
                x_vec.append(float(val))
            except (ValueError, TypeError):
                x_vec.append(0.0)

        score = self.base_margin
        for tree in self.trees:
            left = tree["left_children"]
            right = tree["right_children"]
            split_feat = tree["split_indices"]
            split_cond = tree["split_conditions"]
            weights = tree["base_weights"]

            node = 0
            while node >= 0 and left[node] != -1 and right[node] != -1:
                f_idx = split_feat[node]
                val = x_vec[f_idx]
                if math.isnan(val) or val < split_cond[node]:
                    node = left[node]
                else:
                    node = right[node]
            score += weights[node]

        try:
            return 1.0 / (1.0 + math.exp(-score))
        except OverflowError:
            return 0.0 if score < 0 else 1.0

    def predict_proba_df(self, df: pd.DataFrame) -> np.ndarray:
        probs = [self.predict_proba_single(row.to_dict()) for _, row in df.iterrows()]
        return np.array(probs)


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

        # Use robust, zero-dependency PureTreeEvaluator (fast & immune to Windows/Python 3.14 DLL crash)
        self._evaluator = PureTreeEvaluator(self.model_path)
        self.feature_names = self._evaluator.feature_names
        self.model = None

        if not self.feature_names:
            if self.metrics_path.exists():
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

        probabilities = self._evaluator.predict_proba_df(clean_df)
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
