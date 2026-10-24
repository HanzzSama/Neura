"""
server.py
=========
Flask web server that bridges the HTML chat UI to the TensorFlow backend.

Run with:
    python server.py
Then open: http://localhost:5000
"""

import os
import sys
import json
import threading
import traceback
from pathlib import Path

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # Suppress TF C++ logs
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from core.config import Config
from core.logger import get_logger

logger = get_logger(__name__)

app = Flask(__name__, static_folder="public", static_url_path="")
CORS(app)

# -----------------------------------------------------------------------
# Globals — model loaded lazily on first use
# -----------------------------------------------------------------------
_model = None
_model_lock = threading.Lock()
_training_status = {"running": False, "progress": [], "report": None}

config = Config()


def get_model():
    """Lazy-load the model (thread-safe)."""
    global _model
    with _model_lock:
        if _model is None:
            from app.models.neural_network import NeuralNetwork
            checkpoint = str(
                Path(config.get("paths.checkpoints", "public/checkpoints")) / "NeuralNetwork"
            )
            _model = NeuralNetwork(config)
            try:
                _model.load(checkpoint)
                logger.info("Model loaded from checkpoint.")
            except Exception:
                logger.warning("No checkpoint found, model not initialized.")
                _model = None
    return _model


# -----------------------------------------------------------------------
# Routes — serve the SPA
# -----------------------------------------------------------------------

@app.route("/")
@app.route("/welcome")
def welcome():
    return send_from_directory("public", "welcome.html")


@app.route("/app")
@app.route("/chat")
def index():
    return send_from_directory("public", "index.html")


@app.route("/assets/<path:filename>")
def serve_asset(filename):
    return send_from_directory("public/assets", filename)


@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory("public/css", filename)


@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory("public/js", filename)


@app.route("/api/firebase-config", methods=["GET"])
def api_firebase_config():
    """Returns Firebase project credentials from .env to the client."""
    return jsonify({
        "apiKey": os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", ""),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", "")
    })


# -----------------------------------------------------------------------
# API — Status
# -----------------------------------------------------------------------

@app.route("/api/status", methods=["GET"])
def api_status():
    checkpoint_path = (
        Path(config.get("paths.checkpoints", "public/checkpoints")) / "xgboost_alzheimers.json"
    )
    model_ready = checkpoint_path.exists()

    metrics = {}
    metrics_path = Path("public/reports/alzheimers_xgboost_metrics.json")
    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f).get("metrics", {})
        except Exception:
            pass

    return jsonify({
        "model_name": config.get("model.name", "AlzheimersXGBoost"),
        "algorithm": "XGBoost Classifier",
        "environment": config.get("project.environment", "development"),
        "model_ready": model_ready,
        "checkpoint": str(checkpoint_path) if model_ready else None,
        "training_running": _training_status["running"],
        "features_count": 32,
        "dataset": "alzheimers_disease_data.csv",
        "metrics": metrics,
    })


# -----------------------------------------------------------------------
# API — Train
# -----------------------------------------------------------------------

@app.route("/api/train", methods=["POST"])
def api_train():
    global _training_status

    if _training_status["running"]:
        return jsonify({"error": "Training already running."}), 409

    body = request.get_json(silent=True) or {}
    epochs = int(body.get("epochs", config.get("training.epochs", 50)))

    # Initialize running state IMMEDIATELY before starting the background thread
    _training_status = {
        "running": True,
        "progress": [],
        "report": None,
        "total_epochs": epochs,
        "error": None,
    }

    def _run_training():
        global _training_status
        try:
            import xgboost as xgb
            import pandas as pd
            import time
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import (
                accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
            )

            df = pd.read_csv("datasets/alzheimers_disease_data.csv")
            drop_cols = [c for c in ["PatientID", "DoctorInCharge"] if c in df.columns]
            df_clean = df.drop(columns=drop_cols)
            X = df_clean.drop(columns=["Diagnosis"])
            y = df_clean["Diagnosis"]

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.20, random_state=42, stratify=y
            )

            class ProgressCallback(xgb.callback.TrainingCallback):
                def after_iteration(self, model, epoch, evals_log):
                    train_loss = evals_log["validation_0"]["logloss"][-1]
                    val_loss = evals_log["validation_1"]["logloss"][-1]
                    _training_status["progress"].append({
                        "epoch": epoch + 1,
                        "loss": round(float(train_loss), 4),
                        "val_loss": round(float(val_loss), 4),
                        "accuracy": round(float(max(0.0, 1.0 - train_loss)), 4),
                        "val_accuracy": round(float(max(0.0, 1.0 - val_loss)), 4),
                    })
                    # Pacing (~35ms per round) so live client UI can render fluid progress bar animation
                    time.sleep(0.035)
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
            model_save_path = "public/checkpoints/xgboost_alzheimers.json"
            model.save_model(model_save_path)

            y_pred = model.predict(X_test)
            y_prob = model.predict_proba(X_test)[:, 1]
            cm = confusion_matrix(y_test, y_pred)

            report = {
                "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
                "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
                "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
                "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
                "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            }
            _training_status["report"] = report

            os.makedirs("public/reports", exist_ok=True)
            with open("public/reports/alzheimers_xgboost_metrics.json", "w", encoding="utf-8") as f:
                json.dump({
                    "model_name": "AlzheimersXGBoost",
                    "algorithm": "XGBoost",
                    "metrics": report,
                    "confusion_matrix": {
                        "tn": int(cm[0][0]), "fp": int(cm[0][1]),
                        "fn": int(cm[1][0]), "tp": int(cm[1][1])
                    }
                }, f, indent=2)

        except Exception as e:
            _training_status["error"] = str(e)
            logger.error(f"XGBoost training error: {traceback.format_exc()}")
        finally:
            _training_status["running"] = False

    thread = threading.Thread(target=_run_training, daemon=True)
    thread.start()

    return jsonify({"message": f"Training started for {epochs} boosting rounds.", "epochs": epochs})


@app.route("/api/train/progress", methods=["GET"])
def api_train_progress():
    return jsonify({
        "running": _training_status["running"],
        "progress": _training_status["progress"],
        "report": _training_status.get("report"),
        "error": _training_status.get("error"),
    })


# -----------------------------------------------------------------------
# API — Evaluate
# -----------------------------------------------------------------------

@app.route("/api/evaluate", methods=["GET", "POST"])
def api_evaluate():
    try:
        metrics_file = Path("public/reports/alzheimers_xgboost_metrics.json")
        if metrics_file.exists():
            with open(metrics_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify({
                "model": "AlzheimersXGBoost",
                "algorithm": "XGBoost Classifier",
                "metrics": data.get("metrics", {}),
                "confusion_matrix": data.get("confusion_matrix", {}),
                "top_features": data.get("top_features", []),
            })
        else:
            from scripts.train_xgboost_alzheimer import train_alzheimers_xgboost
            _, metrics_summary = train_alzheimers_xgboost()
            return jsonify({
                "model": "AlzheimersXGBoost",
                "algorithm": "XGBoost Classifier",
                "metrics": metrics_summary.get("metrics", {}),
                "confusion_matrix": metrics_summary.get("confusion_matrix", {}),
                "top_features": metrics_summary.get("top_features", []),
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------
# API — Predict
# -----------------------------------------------------------------------

@app.route("/api/predict", methods=["GET", "POST"])
def api_predict():
    try:
        import random
        import pandas as pd
        from scripts.predict_xgboost_alzheimer import AlzheimersPredictor

        predictor = AlzheimersPredictor()
        body = request.get_json(silent=True) or {}
        patient_input = body.get("input", None)

        df_raw = pd.read_csv("datasets/alzheimers_disease_data.csv")

        if patient_input is not None and isinstance(patient_input, dict):
            res = predictor.predict_patient(patient_input)
            patient_data = patient_input
        else:
            rand_idx = random.randint(0, len(df_raw) - 1)
            sample_row = df_raw.iloc[rand_idx].to_dict()
            res = predictor.predict_patient(sample_row)
            patient_data = sample_row

        pid = patient_data.get("PatientID", f"#{random.randint(1000, 9999)}")
        actual = patient_data.get("Diagnosis", None)

        key_markers = {
            "Age": int(patient_data.get("Age", 72)),
            "Gender": "Male" if int(patient_data.get("Gender", 0)) == 0 else "Female",
            "MMSE": round(float(patient_data.get("MMSE", 20.0)), 1),
            "ADL": round(float(patient_data.get("ADL", 5.0)), 1),
            "FunctionalAssessment": round(float(patient_data.get("FunctionalAssessment", 5.0)), 1),
            "MemoryComplaints": "Yes" if int(patient_data.get("MemoryComplaints", 0)) == 1 else "No",
            "BehavioralProblems": "Yes" if int(patient_data.get("BehavioralProblems", 0)) == 1 else "No",
        }

        prob_pos = round(float(res["probability_percent"]), 2)
        prob_neg = round(float(100.0 - prob_pos), 2)

        return jsonify({
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
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------
# API — Features & Chat Dataset
# -----------------------------------------------------------------------

@app.route("/api/features/categories", methods=["GET"])
def api_chat_categories():
    try:
        from features.chat_manager import ChatDatasetManager
        mgr = ChatDatasetManager()
        return jsonify({
            "categories": mgr.get_categories(),
            "stats": mgr.get_statistics(),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/features/chat-dataset", methods=["GET"])
def api_chat_dataset():
    try:
        from features.chat_manager import ChatDatasetManager
        mgr = ChatDatasetManager()
        category = request.args.get("category", None)
        query = request.args.get("q", None)

        if query:
            results = mgr.search(query, category=category)
            return jsonify({"query": query, "count": len(results), "results": results})

        if category:
            data = mgr.get_by_category(category)
            return jsonify({"category": category, "count": len(data), "items": data})

        return jsonify({
            "stats": mgr.get_statistics(),
            "data": mgr.dataset,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def api_chat_message():
    try:
        from features.chat_manager import ChatDatasetManager
        body = request.get_json(silent=True) or {}
        message = body.get("message", "").strip()

        if not message:
            return jsonify({"error": "Empty message"}), 400

        mgr = ChatDatasetManager()
        res = mgr.find_consultation_response(message)

        return jsonify({
            "matched": res.get("matched", False),
            "reply": res.get("reply", ""),
            "category": res.get("category", "konsultasi_skrining"),
            "topic": res.get("topic", "Konsultasi Neura AI"),
            "suggestions": res.get("suggestions", []),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------
# API — LiveKit Voice AI Consultation
# -----------------------------------------------------------------------

@app.route("/api/livekit/config", methods=["GET"])
def api_livekit_config():
    """Check LiveKit and Voice AI configuration status."""
    lk_url = os.environ.get("LIVEKIT_URL", "").strip()
    lk_key = os.environ.get("LIVEKIT_API_KEY", "").strip()
    lk_secret = os.environ.get("LIVEKIT_API_SECRET", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "").strip()

    missing = []
    if not lk_url or "your-project" in lk_url:
        missing.append("LIVEKIT_URL")
    if not lk_key or "your_livekit" in lk_key:
        missing.append("LIVEKIT_API_KEY")
    if not lk_secret or "your_livekit" in lk_secret:
        missing.append("LIVEKIT_API_SECRET")
    if not openai_key or "your_openai" in openai_key:
        missing.append("OPENAI_API_KEY")
    if not deepgram_key or "your_deepgram" in deepgram_key:
        missing.append("DEEPGRAM_API_KEY")

    is_configured = len(missing) == 0

    return jsonify({
        "is_configured": is_configured,
        "livekit_url": lk_url if is_configured else None,
        "missing_keys": missing,
        "instructions": (
            "Siapkan LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY, "
            "dan DEEPGRAM_API_KEY di file .env untuk mengaktifkan agen suara LiveKit."
            if not is_configured else "LiveKit Voice Agent siap digunakan."
        )
    })


@app.route("/api/livekit/token", methods=["GET", "POST"])
def api_livekit_token():
    """Generate LiveKit Room Access Token for the clinical voice consultation."""
    import uuid

    lk_url = os.environ.get("LIVEKIT_URL", "").strip()
    lk_key = os.environ.get("LIVEKIT_API_KEY", "").strip()
    lk_secret = os.environ.get("LIVEKIT_API_SECRET", "").strip()

    is_configured = (
        bool(lk_url) and "your-project" not in lk_url and
        bool(lk_key) and "your_livekit" not in lk_key and
        bool(lk_secret) and "your_livekit" not in lk_secret
    )

    room_name = request.args.get("room") or f"neura-room-{str(uuid.uuid4())[:8]}"
    participant_name = request.args.get("name") or "Pasien Neura"
    identity = f"patient_{str(uuid.uuid4())[:8]}"

    if not is_configured:
        return jsonify({
            "is_configured": False,
            "error": "LiveKit credentials belum dikonfigurasi di file .env.",
            "instructions": "Buka file .env dan isi LIVEKIT_URL, LIVEKIT_API_KEY, dan LIVEKIT_API_SECRET.",
            "demo_available": True
        }), 400

    try:
        from livekit import api

        token = (
            api.AccessToken(lk_key, lk_secret)
            .with_identity(identity)
            .with_name(participant_name)
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_subscribe=True,
                )
            )
        )

        jwt_token = token.to_jwt()

        return jsonify({
            "is_configured": True,
            "token": jwt_token,
            "url": lk_url,
            "room": room_name,
            "identity": identity,
            "participant_name": participant_name,
        })
    except Exception as e:
        logger.error(f"Error generating LiveKit token: {traceback.format_exc()}")
        return jsonify({"error": str(e), "is_configured": False}), 500


# -----------------------------------------------------------------------
# Run
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Neura Web Server")
    print("  Open: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
