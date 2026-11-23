"""
app/Services/ML/XGBoostTrainerService.py
========================================
Service pelatihan XGBoost Classifier untuk deteksi dini risiko Alzheimer.
Disesuaikan 1:1 dengan spesifikasi RapidMiner / datasets/modelML.rmp:
- 10-Fold Stratified Cross-Validation
- Tree booster, 25 estimators / rounds
- Grid search learning_rate [0.1, 0.2] & max_depth [4, 5]
- Output disimpan ke storage/checkpoints dan storage/reports (dan mirror public/ jika diperlukan).
"""

import json
import os
import sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
import xgboost as xgb

from config.ml import (
    ALZHEIMER_DATASET_CSV,
    CHECKPOINTS_DIR,
    REPORTS_DIR,
    FEATURE_NAMES,
    LABEL_MAPPING,
)
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)


class XGBoostTrainerService:
    @classmethod
    def train(
        cls,
        data_path: str = str(ALZHEIMER_DATASET_CSV),
        output_dir: str = str(CHECKPOINTS_DIR),
        reports_dir: str = str(REPORTS_DIR),
        random_state: int = 2001,
    ) -> dict:
        csv_file = Path(data_path)
        if not csv_file.exists():
            raise FileNotFoundError(f"Dataset tidak ditemukan di: {csv_file}")

        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(reports_dir, exist_ok=True)

        logger.info(f"[XGBoostTrainer] Loading dataset: {csv_file}")
        df = pd.read_csv(csv_file)

        drop_cols = ["PatientID", "DoctorInCharge"]
        existing_drop = [c for c in drop_cols if c in df.columns]
        df_clean = df.drop(columns=existing_drop)

        target_col = "Diagnosis"
        if target_col not in df_clean.columns:
            raise ValueError(f"Kolom target '{target_col}' tidak ada dalam dataset.")

        X = df_clean.drop(columns=[target_col])
        y = df_clean[target_col]
        feature_names = list(X.columns)

        class_counts = y.value_counts().to_dict()
        neg_count = class_counts.get(0, 1)
        pos_count = class_counts.get(1, 1)
        scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0

        # Grid search over 10-fold CV
        param_grid = [
            {"learning_rate": 0.1, "max_depth": 4},
            {"learning_rate": 0.15, "max_depth": 4},
            {"learning_rate": 0.2, "max_depth": 4},
            {"learning_rate": 0.1, "max_depth": 5},
            {"learning_rate": 0.15, "max_depth": 5},
            {"learning_rate": 0.2, "max_depth": 5},
        ]

        skf = StratifiedKFold(n_splits=10, shuffle=True, random_state=random_state)
        best_auc = -1.0
        best_params = param_grid[0]

        for p in param_grid:
            fold_aucs = []
            for train_idx, val_idx in skf.split(X, y):
                X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
                X_va, y_va = X.iloc[val_idx], y.iloc[val_idx]

                clf = xgb.XGBClassifier(
                    n_estimators=25,
                    max_depth=p["max_depth"],
                    learning_rate=p["learning_rate"],
                    booster="gbtree",
                    scale_pos_weight=scale_pos_weight,
                    eval_metric="logloss",
                    random_state=random_state,
                    tree_method="hist",
                    device="cpu",
                )
                clf.fit(X_tr, y_tr)
                val_probs = clf.predict_proba(X_va)[:, 1]
                fold_aucs.append(roc_auc_score(y_va, val_probs))

            mean_auc = float(np.mean(fold_aucs))
            if mean_auc > best_auc:
                best_auc = mean_auc
                best_params = p

        logger.info(f"[XGBoostTrainer] Best params: {best_params} with 10-fold CV AUC: {best_auc:.4f}")

        # Final Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, stratify=y, random_state=random_state
        )

        final_model = xgb.XGBClassifier(
            n_estimators=25,
            max_depth=best_params["max_depth"],
            learning_rate=best_params["learning_rate"],
            booster="gbtree",
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=random_state,
            tree_method="hist",
            device="cpu",
        )
        final_model.fit(X_train, y_train)

        y_pred = final_model.predict(X_test)
        y_prob = final_model.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred))
        rec = float(recall_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))
        auc = float(roc_auc_score(y_test, y_prob))
        cm = confusion_matrix(y_test, y_pred).tolist()

        # Save model JSON
        model_out = Path(output_dir) / "xgboost_alzheimers.json"
        final_model.save_model(str(model_out))

        # Save metrics
        metrics = {
            "algorithm": "XGBoost Classifier (modelML.rmp Aligned)",
            "n_estimators": 25,
            "max_depth": best_params["max_depth"],
            "learning_rate": best_params["learning_rate"],
            "ten_fold_cv_auc": best_auc,
            "test_accuracy": acc,
            "test_precision": prec,
            "test_recall": rec,
            "test_f1": f1,
            "test_roc_auc": auc,
            "confusion_matrix": cm,
            "feature_names": feature_names,
            "model_path": str(model_out),
        }

        metrics_out = Path(reports_dir) / "alzheimers_xgboost_metrics.json"
        with open(metrics_out, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2)

        # Mirror to public/ for backward compatibility if present
        pub_ckpt = Path("public/checkpoints/xgboost_alzheimers.json")
        pub_rep = Path("public/reports/alzheimers_xgboost_metrics.json")
        if pub_ckpt.parent.exists():
            final_model.save_model(str(pub_ckpt))
        if pub_rep.parent.exists():
            with open(pub_rep, "w", encoding="utf-8") as f:
                json.dump(metrics, f, indent=2)

        return metrics

    @classmethod
    def train_pipeline_implementations_txt(
        cls,
        dataset_csv: str = str(ALZHEIMER_DATASET_CSV),
        save_model_path: str = str(CHECKPOINTS_DIR / "xgboost_alzheimers.json")
    ):
        """Implementasi 2: Algoritma XGBoost Lengkap persis dari implementations.txt Bagian 3."""
        if not os.path.exists(dataset_csv):
            dataset_csv = "datasets/alzheimers_disease_data.csv"

        df = pd.read_csv(dataset_csv)
        drop_cols = ["PatientID", "DoctorInCharge"]
        df_clean = df.drop(columns=[col for col in drop_cols if col in df.columns])
        target_col = "Diagnosis"
        X = df_clean.drop(columns=[target_col])
        y = df_clean[target_col]

        neg_count = int((y == 0).sum())
        pos_count = int((y == 1).sum())
        scale_pos_weight = neg_count / pos_count if pos_count > 0 else 1.0

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        model = xgb.XGBClassifier(
            n_estimators=120,
            learning_rate=0.08,
            max_depth=4,
            min_child_weight=2,
            gamma=0.1,
            subsample=0.85,
            colsample_bytree=0.85,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42,
            tree_method="hist",
            device="cpu"
        )
        model.fit(
            X_train, y_train,
            eval_set=[(X_train, y_train), (X_test, y_test)],
            verbose=False
        )
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred))
        rec = float(recall_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred))
        auc = float(roc_auc_score(y_test, y_prob))

        os.makedirs(os.path.dirname(save_model_path), exist_ok=True)
        model.save_model(save_model_path)
        pub_ckpt = Path("public/checkpoints/xgboost_alzheimers.json")
        if pub_ckpt.parent.exists():
            model.save_model(str(pub_ckpt))

        return {
            "model": model,
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "roc_auc": auc
        }
