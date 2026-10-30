"""
api/admin/admin_ml.py
======================
Admin ML Training & Evaluation routes:
  POST /api/train           — Jalankan training XGBoost (Admin only)
  GET  /api/train/progress  — Poll progress training berjalan
  GET  /api/evaluate        — Hasil evaluasi model terakhir
  POST /api/evaluate        — (sama, terima body juga)
"""

import os
import json
import threading
import traceback
from pathlib import Path
from flask import Blueprint, request, jsonify
from core.config import Config
from core.logger import get_logger

logger   = get_logger(__name__)
config   = Config()

admin_ml_bp = Blueprint("admin_ml", __name__)

# -----------------------------------------------------------------------
# Global training state — dibaca juga oleh status_routes
# -----------------------------------------------------------------------
_training_status = {
    "running":      False,
    "progress":     [],
    "report":       None,
    "total_epochs": 0,
    "error":        None,
}


def get_training_status():
    """Expose training state ke modul lain (mis. status_routes)."""
    return _training_status


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@admin_ml_bp.route("/train", methods=["POST"])
def api_train():
    """
    Mulai training XGBoost Alzheimer di background thread.
    Hanya Administrator / ML Engineer yang diizinkan.
    """
    global _training_status

    if _training_status["running"]:
        return jsonify({"error": "Training already running."}), 409

    body     = request.get_json(silent=True) or {}
    req_role = (request.headers.get("X-Neura-Role") or body.get("role") or "").strip().lower()

    if req_role and req_role not in ["admin", "administrator"]:
        return jsonify({
            "error": "Akses ditolak: Hanya Administrator / ML Engineer yang berwenang melatih ulang model."
        }), 403

    epochs = int(body.get("epochs", config.get("training.epochs", 50)))

    _training_status = {
        "running":      True,
        "progress":     [],
        "report":       None,
        "total_epochs": epochs,
        "error":        None,
    }

    def _run_training():
        global _training_status
        try:
            import xgboost as xgb
            import pandas as pd
            import time as _time
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import (
                accuracy_score, precision_score, recall_score,
                f1_score, roc_auc_score, confusion_matrix,
            )

            df       = pd.read_csv("datasets/alzheimers_disease_data.csv")
            drop_cols = [c for c in ["PatientID", "DoctorInCharge"] if c in df.columns]
            df_clean = df.drop(columns=drop_cols)
            X        = df_clean.drop(columns=["Diagnosis"])
            y        = df_clean["Diagnosis"]

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.20, random_state=42, stratify=y
            )

            class ProgressCallback(xgb.callback.TrainingCallback):
                def after_iteration(self, model, epoch, evals_log):
                    train_loss = evals_log["validation_0"]["logloss"][-1]
                    val_loss   = evals_log["validation_1"]["logloss"][-1]
                    _training_status["progress"].append({
                        "epoch":        epoch + 1,
                        "loss":         round(float(train_loss), 4),
                        "val_loss":     round(float(val_loss), 4),
                        "accuracy":     round(float(max(0.0, 1.0 - train_loss)), 4),
                        "val_accuracy": round(float(max(0.0, 1.0 - val_loss)), 4),
                    })
                    # ~80ms pacing → live UI renders fluid animated progress bar
                    _time.sleep(0.08)
                    return False

            model = xgb.XGBClassifier(
                n_estimators=epochs,
                learning_rate=0.08,
                max_depth=4,
                min_child_weight=3,
                subsample=0.85,
                colsample_bytree=0.85,
                scale_pos_weight=1.83,
                gamma=0.2,
                eval_metric="logloss",
                random_state=42,
                n_jobs=-1,
                callbacks=[ProgressCallback()],
            )

            model.fit(
                X_train, y_train,
                eval_set=[(X_train, y_train), (X_test, y_test)],
                verbose=False,
            )

            os.makedirs("public/checkpoints", exist_ok=True)
            model.save_model("public/checkpoints/xgboost_alzheimers.json")

            y_pred = model.predict(X_test)
            y_prob = model.predict_proba(X_test)[:, 1]
            cm     = confusion_matrix(y_test, y_pred)

            report = {
                "accuracy":  round(float(accuracy_score(y_test, y_pred)), 4),
                "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
                "recall":    round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
                "f1_score":  round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
                "roc_auc":   round(float(roc_auc_score(y_test, y_prob)), 4),
            }
            _training_status["report"] = report

            os.makedirs("public/reports", exist_ok=True)
            with open("public/reports/alzheimers_xgboost_metrics.json", "w", encoding="utf-8") as f:
                json.dump({
                    "model_name": "AlzheimersXGBoost",
                    "algorithm":  "XGBoost",
                    "metrics":    report,
                    "confusion_matrix": {
                        "tn": int(cm[0][0]), "fp": int(cm[0][1]),
                        "fn": int(cm[1][0]), "tp": int(cm[1][1]),
                    },
                }, f, indent=2)

        except Exception as e:
            _training_status["error"] = str(e)
            logger.error(f"XGBoost training error: {traceback.format_exc()}")
        finally:
            _training_status["running"] = False

    threading.Thread(target=_run_training, daemon=True).start()
    return jsonify({"message": f"Training started for {epochs} boosting rounds.", "epochs": epochs})


@admin_ml_bp.route("/train/progress", methods=["GET"])
def api_train_progress():
    """Poll status dan log progres training yang sedang berjalan."""
    return jsonify({
        "running":  _training_status["running"],
        "progress": _training_status["progress"],
        "report":   _training_status.get("report"),
        "error":    _training_status.get("error"),
    })


@admin_ml_bp.route("/evaluate", methods=["GET", "POST"])
def api_evaluate():
    """
    Kembalikan metrik evaluasi model terakhir dari file JSON.
    Jika file belum ada, jalankan training singkat untuk menghasilkannya.
    """
    try:
        metrics_file = Path("public/reports/alzheimers_xgboost_metrics.json")
        if metrics_file.exists():
            with open(metrics_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify({
                "model":            "AlzheimersXGBoost",
                "algorithm":        "XGBoost Classifier",
                "metrics":          data.get("metrics", {}),
                "confusion_matrix": data.get("confusion_matrix", {}),
                "top_features":     data.get("top_features", []),
            })
        else:
            from scripts.train_xgboost_alzheimer import train_alzheimers_xgboost
            _, metrics_summary = train_alzheimers_xgboost()
            return jsonify({
                "model":            "AlzheimersXGBoost",
                "algorithm":        "XGBoost Classifier",
                "metrics":          metrics_summary.get("metrics", {}),
                "confusion_matrix": metrics_summary.get("confusion_matrix", {}),
                "top_features":     metrics_summary.get("top_features", []),
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
