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


# -----------------------------------------------------------------------
# API — Status
# -----------------------------------------------------------------------

@app.route("/api/status", methods=["GET"])
def api_status():
    checkpoint_path = (
        Path(config.get("paths.checkpoints", "public/checkpoints")) / "NeuralNetwork.keras"
    )
    model_ready = checkpoint_path.exists()
    return jsonify({
        "model_name": config.get("model.name", "NeuralNetwork"),
        "environment": config.get("project.environment", "development"),
        "model_ready": model_ready,
        "checkpoint": str(checkpoint_path) if model_ready else None,
        "training_running": _training_status["running"],
    })


# -----------------------------------------------------------------------
# API — Train
# -----------------------------------------------------------------------

@app.route("/api/train", methods=["POST"])
def api_train():
    global _model, _training_status

    if _training_status["running"]:
        return jsonify({"error": "Training already running."}), 409

    body = request.get_json(silent=True) or {}
    epochs = int(body.get("epochs", config.get("training.epochs", 5)))

    def _run_training():
        global _model, _training_status
        _training_status = {"running": True, "progress": [], "report": None}

        try:
            import numpy as np
            from sklearn.datasets import make_classification
            from sklearn.model_selection import train_test_split
            from app.models.neural_network import NeuralNetwork
            from app.controllers.training_controller import TrainingController

            n_features = config.get("model.input_shape", [128])[0]
            n_classes = config.get("model.output_units", 10)

            X, y = make_classification(
                n_samples=2000, n_features=n_features,
                n_classes=n_classes, n_informative=min(n_features, 15),
                random_state=42,
            )
            y_onehot = np.eye(n_classes)[y].astype("float32")
            X = X.astype("float32")
            X_train, X_val, y_train, y_val = train_test_split(
                X, y_onehot, test_size=0.2, random_state=42
            )

            # Patch config epochs
            config.set("training.epochs", epochs)

            model_instance = NeuralNetwork(config).initialize()

            # Custom callback to capture progress
            import tensorflow as tf

            class ProgressCapture(tf.keras.callbacks.Callback):
                def on_epoch_end(self, epoch, logs=None):
                    logs = logs or {}
                    _training_status["progress"].append({
                        "epoch": epoch + 1,
                        "loss": round(float(logs.get("loss", 0)), 4),
                        "val_loss": round(float(logs.get("val_loss", 0)), 4),
                        "accuracy": round(float(logs.get("accuracy", 0)), 4),
                        "val_accuracy": round(float(logs.get("val_accuracy", 0)), 4),
                    })

            keras_model = model_instance.get_keras_model()
            history = keras_model.fit(
                X_train, y_train, epochs=epochs, batch_size=32,
                validation_data=(X_val, y_val),
                callbacks=[ProgressCapture()], verbose=0,
            )

            model_instance.save(config.get("paths.checkpoints", "public/checkpoints"))
            _model = model_instance

            hist = history.history
            _training_status["report"] = {
                "epochs_run": len(hist.get("loss", [])),
                "best_val_loss": round(float(min(hist.get("val_loss", [0]))), 4),
                "best_val_acc": round(float(max(hist.get("val_accuracy", [0]))), 4),
                "final_train_acc": round(float(hist.get("accuracy", [0])[-1]), 4),
            }
        except Exception as e:
            _training_status["error"] = str(e)
            logger.error(f"Training error: {traceback.format_exc()}")
        finally:
            _training_status["running"] = False

    thread = threading.Thread(target=_run_training, daemon=True)
    thread.start()

    return jsonify({"message": f"Training started for {epochs} epochs.", "epochs": epochs})


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

@app.route("/api/evaluate", methods=["POST"])
def api_evaluate():
    try:
        import numpy as np
        from sklearn.datasets import make_classification
        from app.controllers.evaluation_controller import EvaluationController

        model = get_model()
        if model is None:
            return jsonify({"error": "No trained model found. Run /train first."}), 400

        n_features = config.get("model.input_shape", [128])[0]
        n_classes = config.get("model.output_units", 10)

        X, y = make_classification(
            n_samples=500, n_features=n_features,
            n_classes=n_classes, n_informative=min(n_features, 15),
            random_state=99,
        )
        y_onehot = np.eye(n_classes)[y].astype("float32")
        X = X.astype("float32")

        ctrl = EvaluationController(config, model)
        metrics = ctrl.run(X, y_onehot, save_report=True)

        return jsonify({"metrics": {k: round(float(v), 4) for k, v in metrics.items()}})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------
# API — Predict
# -----------------------------------------------------------------------

@app.route("/api/predict", methods=["POST"])
def api_predict():
    try:
        import numpy as np
        from app.controllers.prediction_controller import PredictionController

        model = get_model()
        if model is None:
            return jsonify({"error": "No trained model found. Run /train first."}), 400

        body = request.get_json(silent=True) or {}
        input_data = body.get("input", None)

        n_features = config.get("model.input_shape", [128])[0]
        n_classes = config.get("model.output_units", 10)

        if input_data is not None:
            sample = np.array(input_data, dtype="float32")
        else:
            sample = np.random.randn(n_features).astype("float32")

        class_names = [f"Class_{i}" for i in range(n_classes)]
        ctrl = PredictionController(config, model, class_names=class_names)
        result = ctrl.predict(sample, display=False)

        return jsonify({
            "predicted_class": result.predicted_label,
            "confidence": round(result.confidence, 4),
            "probabilities": [
                {"class": class_names[i], "prob": round(float(p), 4)}
                for i, p in enumerate(result.raw_output)
            ],
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
        matched_reply = mgr.find_best_response(message)

        return jsonify({
            "matched": matched_reply is not None,
            "reply": matched_reply,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------
# Run
# -----------------------------------------------------------------------

if __name__ == "__main__":
    print("\n  Neura Web Server")
    print("  Open: http://localhost:5000\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
