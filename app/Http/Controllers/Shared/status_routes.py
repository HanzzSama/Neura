"""
api/shared/status_routes.py
============================
Shared routes:
  GET /api/status         — Status model, training, dan dataset
  GET /api/device-status  — Status komputasi GPU/CPU (device_manager)
"""

import traceback
from pathlib import Path
from flask import Blueprint, jsonify
from app.Services.Logger.LoggerService import get_logger
from config.app import APP_ENV
from config.ml import XGBOOST_MODEL_FILE

logger = get_logger(__name__)

status_bp = Blueprint("status", __name__)


@status_bp.route("/api/status", methods=["GET"])
def api_status():
    """Status model XGBoost, training state, dan jumlah dataset."""
    # Import training state dari admin_ml (lazy import untuk hindari circular)
    try:
        from app.Http.Controllers.Admin.admin_ml import get_training_status
        training_running = get_training_status()["running"]
    except Exception:
        training_running = False

    checkpoint_path = XGBOOST_MODEL_FILE
    model_ready = checkpoint_path.exists()

    metrics = {}
    metrics_path = Path("public/reports/alzheimers_xgboost_metrics.json")
    if metrics_path.exists():
        try:
            import json
            with open(metrics_path, "r", encoding="utf-8") as f:
                metrics = json.load(f).get("metrics", {})
        except Exception:
            pass

    intents_count = 241
    try:
        from app.Services.LLM.ChatManagerService import ChatDatasetManager
        mgr = ChatDatasetManager()
        intents_count = mgr.get_statistics().get("total_percakapan", 241)
    except Exception:
        pass

    return jsonify({
        "model_name":       "Alzheimer",
        "algorithm":        "XGBoost Classifier",
        "environment":      APP_ENV,
        "model_ready":      model_ready,
        "checkpoint":       str(checkpoint_path) if model_ready else None,
        "training_running": training_running,
        "features_count":   32,
        "intents_count":    intents_count,
        "dataset":          "alzheimers_disease_data.csv",
        "metrics":          metrics,
    })


@status_bp.route("/api/device-status", methods=["GET"])
def api_device_status():
    """
    Status komputasi GPU/CPU Neura AI.

    Kebijakan alokasi:
      - Clinical dataset (XGBoost): CPU-only (menjaga VRAM bebas untuk LLM)
      - LLM (GGUF Llama/Gemma):    GPU dedicated → iGPU → CPU (fallback)
    """
    try:
        from app.Services.ML.DeviceManager import get_device_summary
        summary = get_device_summary()
        return jsonify({"ok": True, **summary})
    except Exception as e:
        logger.error(f"Error in api_device_status: {traceback.format_exc()}")
        return jsonify({"ok": False, "error": str(e)}), 500
