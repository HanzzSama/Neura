"""
main.py
=======
Neura -- Alzheimer's Disease XGBoost AI Diagnostic System
CLI Entry point for training, evaluation, prediction, and status.

Usage:
    python main.py --mode status
    python main.py --mode train
    python main.py --mode eval
    python main.py --mode predict
    python main.py --mode predict --input datasets/alzheimers_disease_data.csv
"""

import argparse
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

from core.config import Config
from core.logger import get_logger, setup_file_logging

logger = get_logger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="neura",
        description="🧠 Neura -- Alzheimer's Disease XGBoost AI Diagnostic Platform",
    )
    parser.add_argument(
        "--mode",
        choices=["train", "eval", "predict", "status"],
        default="status",
        help="Execution mode (status, train, eval, predict)",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to YAML config file (default: configs/default.yaml)",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="public/checkpoints/xgboost_alzheimers.json",
        help="Path to model checkpoint JSON",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Path to input patient CSV file (for predict mode)",
    )
    return parser.parse_args()


def run_status(config: Config) -> None:
    """Display comprehensive system, dataset, and model status."""
    logger.info("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")
    logger.info("[bold cyan]               NEURA AI SYSTEM STATUS                          [/bold cyan]")
    logger.info("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")

    model_name = config.get("model.name", "AlzheimersXGBoost")
    algorithm = "XGBoost Classifier (Gradient Boosted Decision Trees)"
    checkpoint_path = Path("public/checkpoints/xgboost_alzheimers.json")
    dataset_path = Path(config.get("dataset.train_path", "datasets/alzheimers_disease_data.csv"))
    metrics_path = Path("public/reports/alzheimers_xgboost_metrics.json")

    logger.info(f"Model Name        : [bold white]{model_name}[/bold white]")
    logger.info(f"Algorithm         : [bold green]{algorithm}[/bold green]")
    logger.info(f"Clinical Features : [bold yellow]32 Biomarkers (MMSE, ADL, Memory Complaints, etc.)[/bold yellow]")
    logger.info(f"Target Diagnostic : [bold magenta]Binary (0: Non-Alzheimer's, 1: Alzheimer's Disease)[/bold magenta]")
    logger.info(f"Dataset Path      : {dataset_path} ({'Ready' if dataset_path.exists() else 'Missing'})")
    logger.info(f"Checkpoint Path   : {checkpoint_path} ({'Ready' if checkpoint_path.exists() else 'Not Trained'})")

    if metrics_path.exists():
        try:
            with open(metrics_path, "r", encoding="utf-8") as f:
                report = json.load(f)
            m = report.get("metrics", {})
            logger.info("─── Latest Test Benchmark Metrics ───")
            logger.info(f"  • Accuracy      : [bold green]{m.get('accuracy', 0):.2%}[/bold green]")
            logger.info(f"  • Precision     : [bold green]{m.get('precision', 0):.2%}[/bold green]")
            logger.info(f"  • Recall        : [bold green]{m.get('recall', 0):.2%}[/bold green]")
            logger.info(f"  • F1-Score      : [bold green]{m.get('f1_score', 0):.2%}[/bold green]")
            logger.info(f"  • ROC-AUC       : [bold green]{m.get('roc_auc', 0):.2%}[/bold green]")
        except Exception as e:
            logger.warning(f"Could not load metrics: {e}")
    else:
        logger.info("No training benchmark found yet. Run 'python main.py --mode train' to train.")

    logger.info("[bold cyan]═══════════════════════════════════════════════════════════════[/bold cyan]")


def run_train(config: Config) -> None:
    """Run the Alzheimer's XGBoost training pipeline."""
    from scripts.train_xgboost_alzheimer import train_alzheimers_xgboost

    logger.info("[bold green]Starting Alzheimer's Disease XGBoost Training Pipeline...[/bold green]")
    dataset_path = config.get("dataset.train_path", "datasets/alzheimers_disease_data.csv")

    model, summary = train_alzheimers_xgboost(csv_path=dataset_path)

    metrics = summary.get("metrics", {})
    logger.info("[bold green]✓ Training completed successfully![/bold green]")
    logger.info(f"  Test Accuracy : [bold cyan]{metrics.get('accuracy', 0):.2%}[/bold cyan]")
    logger.info(f"  Test Precision: [bold cyan]{metrics.get('precision', 0):.2%}[/bold cyan]")
    logger.info(f"  Test Recall   : [bold cyan]{metrics.get('recall', 0):.2%}[/bold cyan]")
    logger.info(f"  Test F1-Score : [bold cyan]{metrics.get('f1_score', 0):.2%}[/bold cyan]")
    logger.info(f"  Test ROC-AUC  : [bold cyan]{metrics.get('roc_auc', 0):.2%}[/bold cyan]")
    logger.info(f"Checkpoint saved: [bold white]{summary.get('model_path')}[/bold white]")


def run_eval(config: Config, checkpoint: str | None) -> None:
    """Evaluate trained Alzheimer's XGBoost model and display test metrics."""
    logger.info("[bold yellow]═══════════════════════════════════════════════════════════════[/bold yellow]")
    logger.info("[bold yellow]          ALZHEIMER'S XGBOOST EVALUATION REPORT                [/bold yellow]")
    logger.info("[bold yellow]═══════════════════════════════════════════════════════════════[/bold yellow]")

    metrics_file = Path("public/reports/alzheimers_xgboost_metrics.json")
    if not metrics_file.exists():
        logger.warning("Metrics file not found. Running evaluation by training/evaluating...")
        from scripts.train_xgboost_alzheimer import train_alzheimers_xgboost
        _, summary = train_alzheimers_xgboost()
        metrics = summary.get("metrics", {})
        cm = summary.get("confusion_matrix", {})
        top_features = summary.get("top_features", [])
    else:
        with open(metrics_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        metrics = data.get("metrics", {})
        cm = data.get("confusion_matrix", {})
        top_features = data.get("top_features", [])

    logger.info("Classification Performance on Stratified Test Set (20% Holdout):")
    logger.info(f"  • Test Accuracy  : [bold green]{metrics.get('accuracy', 0):.2%}[/bold green] (Optimal clinical diagnosis rate)")
    logger.info(f"  • Precision      : [bold green]{metrics.get('precision', 0):.2%}[/bold green] (True positive precision)")
    logger.info(f"  • Recall (Sens.) : [bold green]{metrics.get('recall', 0):.2%}[/bold green] (Sensitivity in detecting Alzheimer's)")
    logger.info(f"  • F1-Score       : [bold green]{metrics.get('f1_score', 0):.2%}[/bold green] (Harmonic mean of precision & recall)")
    logger.info(f"  • ROC-AUC        : [bold green]{metrics.get('roc_auc', 0):.2%}[/bold green] (Area under the ROC Curve)")

    tn = cm.get("tn", cm.get("true_negatives", 0))
    fp = cm.get("fp", cm.get("false_positives", 0))
    fn = cm.get("fn", cm.get("false_negatives", 0))
    tp = cm.get("tp", cm.get("true_positives", 0))

    if cm:
        logger.info("\nConfusion Matrix Breakdown:")
        logger.info(f"  [TN] True Negatives  : {tn}")
        logger.info(f"  [FP] False Positives : {fp}")
        logger.info(f"  [FN] False Negatives : {fn}")
        logger.info(f"  [TP] True Positives  : {tp}")

    if top_features:
        logger.info("\nTop Predictive Clinical Biomarkers (Feature Importance):")
        for i, feat in enumerate(top_features[:6], 1):
            logger.info(f"  {i}. {feat.get('feature')}: weight = {feat.get('importance', 0):.4f}")

    logger.info("[bold yellow]═══════════════════════════════════════════════════════════════[/bold yellow]")


def run_predict(config: Config, input_path: str | None) -> None:
    """Run inference for Alzheimer's diagnosis on a patient record."""
    import random
    import pandas as pd
    from scripts.predict_xgboost_alzheimer import AlzheimersPredictor

    logger.info("[bold green]═══════════════════════════════════════════════════════════════[/bold green]")
    logger.info("[bold green]          ALZHEIMER'S CLINICAL DIAGNOSIS PREDICTION            [/bold green]")
    logger.info("[bold green]═══════════════════════════════════════════════════════════════[/bold green]")

    predictor = AlzheimersPredictor()

    if input_path and Path(input_path).exists():
        logger.info(f"Loading custom input from: {input_path}")
        df = pd.read_csv(input_path)
        sample = df.iloc[0].to_dict()
    else:
        dataset_path = config.get("dataset.train_path", "datasets/alzheimers_disease_data.csv")
        df = pd.read_csv(dataset_path)
        rand_idx = random.randint(0, len(df) - 1)
        sample = df.iloc[rand_idx].to_dict()
        logger.info(f"Randomly selected patient record #{sample.get('PatientID', rand_idx)} from dataset.")

    result = predictor.predict_patient(sample)

    pid = sample.get("PatientID", "N/A")
    actual = sample.get("Diagnosis", None)
    actual_label = "Alzheimer's Disease" if actual == 1 else "Non-Alzheimer's" if actual == 0 else "Unknown"

    prob_pos = result["probability_percent"]
    risk = result["risk_level"]
    pred_label = result["diagnosis_label"]

    style_tag = "bold red" if result["prediction"] == 1 else "bold green"

    logger.info(f"Patient ID       : [bold white]#{pid}[/bold white]")
    if actual is not None:
        logger.info(f"Actual Diagnosis : [bold]{actual_label}[/bold] (Ground Truth: {actual})")
    logger.info(f"Prediction Result: [{style_tag}]{pred_label}[/]")
    logger.info(f"Probability      : [{style_tag}]{prob_pos:.2f}%[/] likelihood of Alzheimer's")
    logger.info(f"Risk Level       : [{style_tag}]{risk}[/]")

    logger.info("\nKey Clinical Biomarkers:")
    logger.info(f"  • Age                 : {sample.get('Age', 'N/A')} years")
    gender_str = "Male" if int(sample.get('Gender', 0)) == 0 else "Female"
    logger.info(f"  • Gender              : {gender_str}")
    logger.info(f"  • MMSE Score          : {sample.get('MMSE', 'N/A')} / 30.0 (Mini-Mental State Exam)")
    logger.info(f"  • ADL Score           : {sample.get('ADL', 'N/A')} / 10.0 (Activities of Daily Living)")
    logger.info(f"  • Functional Assess.  : {sample.get('FunctionalAssessment', 'N/A')} / 10.0")
    mem = "Yes" if int(sample.get('MemoryComplaints', 0)) == 1 else "No"
    logger.info(f"  • Memory Complaints   : {mem}")
    beh = "Yes" if int(sample.get('BehavioralProblems', 0)) == 1 else "No"
    logger.info(f"  • Behavioral Problems : {beh}")

    logger.info("[bold green]═══════════════════════════════════════════════════════════════[/bold green]")


def main() -> None:
    args = parse_args()

    # Load config
    config = Config(args.config)

    # Setup file logging
    log_file = config.get("logging.log_file", "public/logs/neura.log")
    log_level = config.get("logging.level", "INFO")
    if config.get("logging.log_to_file", True):
        setup_file_logging(log_file, level=log_level)

    # Dispatch commands
    mode = args.mode
    if mode == "status":
        run_status(config)
    elif mode == "train":
        run_train(config)
    elif mode == "eval":
        run_eval(config, args.checkpoint)
    elif mode == "predict":
        run_predict(config, args.input)
    else:
        logger.error(f"Unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()
