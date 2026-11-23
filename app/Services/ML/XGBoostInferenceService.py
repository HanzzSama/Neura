"""
app/Services/ML/XGBoostInferenceService.py
==========================================
Inference and Prediction Service for Alzheimer's Disease using trained XGBoost Model
AND RapidMiner Decision Tree Rule Classifier (implementations.txt alignment).

Compute Policy:
  - Clinical Dataset (XGBoost + PureTreeEvaluator + RapidMiner Tree): SELALU CPU-only (~1 ms).
  - VRAM GPU bebas untuk LLM (Llama/Gemma GGUF).
"""

import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, List
import numpy as np
import pandas as pd

from config.ml import XGBOOST_MODEL_FILE, XGBOOST_METRICS_FILE
from app.Services.ML.RapidMinerTreeService import predict_rapidminer_tree

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
os.environ.setdefault("OMP_NUM_THREADS", str(min(os.cpu_count() or 4, 8)))


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

    def evaluate_detailed(self, row_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluasi inferensi mendalam dengan pelacakan pohon, skor logit (z), dan atribusi fitur."""
        x_vec = []
        for feat in self.feature_names:
            val = row_dict.get(feat, 0.0)
            try:
                x_vec.append(float(val))
            except (ValueError, TypeError):
                x_vec.append(0.0)

        score = self.base_margin
        tree_weights = []
        feature_impacts = {f: 0.0 for f in self.feature_names}

        for tree in self.trees:
            left = tree["left_children"]
            right = tree["right_children"]
            split_feat = tree["split_indices"]
            split_cond = tree["split_conditions"]
            weights = tree["base_weights"]

            node = 0
            visited_features = set()
            while node >= 0 and left[node] != -1 and right[node] != -1:
                f_idx = split_feat[node]
                val = x_vec[f_idx]
                if 0 <= f_idx < len(self.feature_names):
                    visited_features.add(self.feature_names[f_idx])

                if math.isnan(val) or val < split_cond[node]:
                    node = left[node]
                else:
                    node = right[node]

            leaf_w = float(weights[node])
            tree_weights.append(leaf_w)
            score += leaf_w

            if visited_features:
                split_share = leaf_w / len(visited_features)
                for vf in visited_features:
                    feature_impacts[vf] += split_share

        try:
            prob_1 = 1.0 / (1.0 + math.exp(-score))
        except OverflowError:
            prob_1 = 0.0 if score < 0 else 1.0

        prob_0 = 1.0 - prob_1
        pred = 1 if prob_1 >= 0.50 else 0

        sorted_impacts = sorted(feature_impacts.items(), key=lambda kv: abs(kv[1]), reverse=True)
        top_positive_drivers = [
            {"feature": k, "impact": round(v, 4), "impact_abs": round(abs(v), 4)}
            for k, v in sorted_impacts if v > 0.01
        ][:6]
        top_protective_drivers = [
            {"feature": k, "impact": round(v, 4), "impact_abs": round(abs(v), 4)}
            for k, v in sorted_impacts if v < -0.01
        ][:4]

        return {
            "prediction": pred,
            "prob_1": round(prob_1, 4),
            "prob_0": round(prob_0, 4),
            "probability_percent_1": round(prob_1 * 100.0, 2),
            "probability_percent_0": round(prob_0 * 100.0, 2),
            "raw_logit_z": round(score, 4),
            "base_margin": round(self.base_margin, 4),
            "sum_tree_weights": round(score - self.base_margin, 4),
            "num_trees": len(self.trees),
            "tree_weights": [round(w, 4) for w in tree_weights],
            "top_positive_drivers": top_positive_drivers,
            "top_protective_drivers": top_protective_drivers,
        }

    def predict_proba_df(self, df: pd.DataFrame) -> np.ndarray:
        n_samples = len(df)
        probs = np.zeros(n_samples, dtype=float)
        matrix = df[self.feature_names].values
        n_trees = len(self.trees)

        for i in range(n_samples):
            x = matrix[i]
            score = self.base_margin
            for t_idx in range(n_trees):
                tree = self.trees[t_idx]
                left = tree["left_children"]
                right = tree["right_children"]
                split_feat = tree["split_indices"]
                split_cond = tree["split_conditions"]
                weights = tree["base_weights"]

                node = 0
                while node >= 0 and left[node] != -1 and right[node] != -1:
                    val = x[split_feat[node]]
                    if math.isnan(val) or val < split_cond[node]:
                        node = left[node]
                    else:
                        node = right[node]
                score += weights[node]

            try:
                probs[i] = 1.0 / (1.0 + math.exp(-score))
            except OverflowError:
                probs[i] = 0.0 if score < 0 else 1.0

        return probs


class AlzheimersPredictor:
    """Production Inference Manager for Neura AI."""

    def __init__(self, model_path: Path = None, metrics_path: Path = None):
        self.model_path = model_path or XGBOOST_MODEL_FILE
        self.metrics_path = metrics_path or XGBOOST_METRICS_FILE

        if not self.model_path.exists():
            pub_fallback = Path("public/checkpoints/xgboost_alzheimers.json")
            if pub_fallback.exists():
                self.model_path = pub_fallback
            else:
                raise FileNotFoundError(f"Model XGBoost checkpoint tidak ditemukan: {self.model_path}")

        self._evaluator = PureTreeEvaluator(self.model_path)
        self.feature_names = self._evaluator.feature_names
        self.metadata = {}

        if self.metrics_path.exists():
            try:
                with open(self.metrics_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception:
                pass

    def predict_patient(self, patient_dict: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Evaluasi XGBoost
        eval_res = self._evaluator.evaluate_detailed(patient_dict)
        pred = eval_res["prediction"]
        prob_1 = eval_res["prob_1"]
        prob_0 = eval_res["prob_0"]
        prob_percent_1 = eval_res["probability_percent_1"]
        prob_percent_0 = eval_res["probability_percent_0"]
        z_logit = eval_res["raw_logit_z"]
        base_m = eval_res["base_margin"]
        sum_w = eval_res["sum_tree_weights"]

        # 2. Evaluasi Pohon Keputusan Asli RapidMiner (implementations.txt)
        rm_result = predict_rapidminer_tree(patient_dict)

        # 3. Analisis Konsensus Ensemble (XGBoost vs RapidMiner)
        agreement = (pred == rm_result["diagnosis"])
        consensus_status = "Konsisten (XGBoost & RapidMiner sejalan)" if agreement else "Divergen (Evaluasi klinis lanjutan disarankan)"

        if prob_percent_1 >= 60.0:
            risk_level = "High Risk (Positive)"
            risk_level_id = "Risiko Tinggi (Positif)"
        elif prob_percent_1 >= 35.0:
            risk_level = "Moderate Risk"
            risk_level_id = "Risiko Sedang"
        else:
            risk_level = "Low Risk (Negative)"
            risk_level_id = "Risiko Rendah (Negatif)"

        def _get_sym(key: str) -> int:
            val = patient_dict.get(key, 0)
            try:
                return 1 if int(float(val)) == 1 else 0
            except (ValueError, TypeError):
                return 0

        symptoms_map = {
            "MemoryComplaints": {
                "name": "Keluhan Memori / Sering Lupa",
                "val": _get_sym("MemoryComplaints"),
                "desc": "Kesulitan mengingat informasi baru atau percakapan baru-baru ini"
            },
            "BehavioralProblems": {
                "name": "Gangguan Perilaku / Emosi",
                "val": _get_sym("BehavioralProblems"),
                "desc": "Agitasi, kecemasan, atau respon emosional tak biasa"
            },
            "Confusion": {
                "name": "Kebingungan Mental",
                "val": _get_sym("Confusion"),
                "desc": "Sulit memproses instruksi atau bingung dalam alur berpikir"
            },
            "Disorientation": {
                "name": "Disorientasi Waktu & Tempat",
                "val": _get_sym("Disorientation"),
                "desc": "Lupa tanggal, musim, atau tersesat di tempat yang dikenal"
            },
            "PersonalityChanges": {
                "name": "Perubahan Kepribadian",
                "val": _get_sym("PersonalityChanges"),
                "desc": "Penarikan diri dari sosial atau perubahan watak drastis"
            },
            "DifficultyCompletingTasks": {
                "name": "Sulit Menyelesaikan Tugas Rutin",
                "val": _get_sym("DifficultyCompletingTasks"),
                "desc": "Kesulitan menyusun rencana atau mengurus keuangan/tugas rumah"
            },
            "Forgetfulness": {
                "name": "Sering Lupa Menaruh Barang",
                "val": _get_sym("Forgetfulness"),
                "desc": "Menaruh barang di tempat janggal dan tidak dapat menelusuri kembali"
            },
        }

        active_symptoms_count = sum(item["val"] for item in symptoms_map.values())
        active_symptoms_pct = round((active_symptoms_count / 7.0) * 100.0, 1)

        z_sign = "+" if sum_w >= 0 else "-"
        math_formula_str = (
            f"z = base_margin + Σ(w_tree) = {base_m:.4f} {z_sign} {abs(sum_w):.4f} = {z_logit:.4f}\n"
            f"P(Diagnosis=1) = σ(z) = 1 / (1 + e^(-({z_logit:.4f}))) = {prob_1:.4f} ({prob_percent_1:.2f}%)\n"
            f"P(Diagnosis=0) = 1 - P(Diagnosis=1) = {prob_0:.4f} ({prob_percent_0:.2f}%)"
        )

        return {
            "prediction": pred,
            "diagnosis_label": "Alzheimer's Disease" if pred == 1 else "Non-Alzheimer's",
            "ml_label": pred,
            "ml_label_name": "Diagnosis = 1 (Alzheimer's Disease Detected)" if pred == 1 else "Diagnosis = 0 (Non-Alzheimer's / Negative)",
            "ml_label_badge": "Diagnosis = 1" if pred == 1 else "Diagnosis = 0",
            "probability_percent": prob_percent_1,
            "probability_percent_1": prob_percent_1,
            "probability_percent_0": prob_percent_0,
            "risk_level": risk_level,
            "risk_level_id": risk_level_id,
            "confidence": f"{max(prob_percent_1, prob_percent_0):.1f}%",
            "rapidminer_tree": {
                "diagnosis": rm_result["diagnosis"],
                "label": rm_result["label"],
                "confidence": round(rm_result["confidence"] * 100.0, 2),
                "leaf_counts": rm_result["leaf_counts"],
                "rule_path": rm_result["rule_path"],
                "source": rm_result.get("source", "RapidMiner modelML.rmp"),
            },
            "consensus": {
                "agreement": agreement,
                "status": consensus_status,
                "xgboost_prediction": pred,
                "rapidminer_prediction": rm_result["diagnosis"],
            },
            "calculation_details": {
                "raw_logit_z": z_logit,
                "base_margin": base_m,
                "sum_tree_weights": sum_w,
                "num_trees": eval_res["num_trees"],
                "formula": "σ(z) = 1 / (1 + exp(-z))",
                "latex_formula": r"P(\text{Diagnosis}=1) = \frac{1}{1 + e^{-z}}",
                "formula_evaluated": f"P(1) = 1 / (1 + e^(-{z_logit:.4f})) = {prob_percent_1:.2f}%",
                "math_steps": math_formula_str,
                "top_positive_drivers": eval_res["top_positive_drivers"],
                "top_protective_drivers": eval_res["top_protective_drivers"],
            },
            "symptom_summary": {
                "items": symptoms_map,
                "active_count": active_symptoms_count,
                "total_count": 7,
                "active_percentage": active_symptoms_pct,
                "has_cognitive_alert": active_symptoms_count >= 2,
            }
        }
