"""
api/shared/status_routes.py
============================
Shared route:
  GET /api/status  — Status model, training, dan dataset
"""

from pathlib import Path
from flask import Blueprint, jsonify
from core.config import Config
from core.logger import get_logger

logger = get_logger(__name__)
config = Config()

status_bp = Blueprint("status", __name__)


@status_bp.route("/api/status", methods=["GET"])
def api_status():
    """Status model XGBoost, training state, dan jumlah dataset."""
    # Import training state dari admin_ml (lazy import untuk hindari circular)
    try:
        from api.admin.admin_ml import get_training_status
        training_running = get_training_status()["running"]
    except Exception:
        training_running = False

    checkpoint_path = (
        Path(config.get("paths.checkpoints", "public/checkpoints")) / "xgboost_alzheimers.json"
    )
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
        from features.chat_manager import ChatDatasetManager
        mgr = ChatDatasetManager()
        intents_count = mgr.get_statistics().get("total_percakapan", 241)
    except Exception:
        pass

    return jsonify({
        "model_name":       config.get("model.name", "Alzheimer"),
        "algorithm":        "XGBoost Classifier",
        "environment":      config.get("project.environment", "development"),
        "model_ready":      model_ready,
        "checkpoint":       str(checkpoint_path) if model_ready else None,
        "training_running": training_running,
        "features_count":   32,
        "intents_count":    intents_count,
        "dataset":          "alzheimers_disease_data.csv",
        "metrics":          metrics,
    })
