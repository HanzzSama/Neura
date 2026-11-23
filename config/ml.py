"""
config/ml.py
============
Machine Learning & Model Storage Configurations.
"""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

STORAGE_DIR = PROJECT_ROOT / "storage"
CHECKPOINTS_DIR = STORAGE_DIR / "checkpoints"
REPORTS_DIR = STORAGE_DIR / "reports"
MODELS_LLM_DIR = STORAGE_DIR / "modelsLLM"
DATASETS_DIR = PROJECT_ROOT / "database" / "datasets"

XGBOOST_MODEL_FILE = CHECKPOINTS_DIR / "xgboost_alzheimers.json"
XGBOOST_METRICS_FILE = REPORTS_DIR / "alzheimers_xgboost_metrics.json"
ALZHEIMER_DATASET_CSV = DATASETS_DIR / "alzheimers_disease_data.csv"
MODELML_RMP_FILE = DATASETS_DIR / "modelML.rmp"
