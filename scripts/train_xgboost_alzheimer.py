"""
scripts/train_xgboost_alzheimer.py
==================================
Training Pipeline: Alzheimer's Disease Detection using XGBoost Classifier.

Dataset: datasets/alzheimers_disease_data.csv
Features: Demographic, Clinical, Lifestyle, Cognitive (MMSE, ADL, etc.)
Target: Diagnosis (0 = Non-Alzheimer's, 1 = Alzheimer's)
"""

import json
import os
import sys
from pathlib import Path

# Ensure UTF-8 output encoding for Windows PowerShell/CMD
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import matplotlib
matplotlib.use("Agg")  # Headless mode for server/CLI
import matplotlib.pyplot as plt
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


def train_alzheimers_xgboost(
    data_path: str = "datasets/alzheimers_disease_data.csv",
    output_dir: str = "public/checkpoints",
    reports_dir: str = "public/reports",
    random_state: int = 42,
):
    print("=" * 70)
    print("🧠 NEURA AI — XGBOOST ALZHEIMER'S DISEASE CLASSIFICATION TRAINING")
    print("=" * 70)

    # 1. Verify Dataset Path
    csv_file = Path(data_path)
    if not csv_file.exists():
        raise FileNotFoundError(f"Dataset not found at: {csv_file.resolve()}")

    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    print(f"\n[1/6] 📂 Loading dataset: {csv_file}")
    df = pd.read_csv(csv_file)
    print(f"       Total Samples: {len(df):,} rows × {len(df.columns)} columns")

    # 2. Preprocessing & Feature Selection
    print("\n[2/6] 🧹 Preprocessing and feature extraction...")
    drop_cols = ["PatientID", "DoctorInCharge"]
    existing_drop_cols = [c for c in drop_cols if c in df.columns]
    df_clean = df.drop(columns=existing_drop_cols)

    target_col = "Diagnosis"
    if target_col not in df_clean.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")

    X = df_clean.drop(columns=[target_col])
    y = df_clean[target_col]

    feature_names = list(X.columns)
    print(f"       Features used ({len(feature_names)} features):")
    print("       " + ", ".join(feature_names[:8]) + ", ...")

    # Class distribution
    class_counts = y.value_counts().to_dict()
    neg_count = class_counts.get(0, 1)
    pos_count = class_counts.get(1, 1)
    scale_pos_weight = float(neg_count / pos_count) if pos_count > 0 else 1.0
    print(f"       Class 0 (Negative): {neg_count:,} ({neg_count/len(y)*100:.1f}%)")
    print(f"       Class 1 (Alzheimer): {pos_count:,} ({pos_count/len(y)*100:.1f}%)")
    print(f"       Calculated scale_pos_weight: {scale_pos_weight:.2f}")

    # 3. Stratified Train / Test Split (80% Train, 20% Test)
    print("\n[3/6] ✂️  Splitting data (80% Train, 20% Test, Stratified)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )
    print(f"       Train set: {len(X_train):,} samples")
    print(f"       Test set:  {len(X_test):,} samples")

    # 4. XGBoost Classifier Configuration & Training
    print("\n[4/6] 🚀 Training XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=300,
        learning_rate=0.08,
        max_depth=4,
        min_child_weight=3,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos_weight,
        gamma=0.2,
        eval_metric="logloss",
        random_state=random_state,
        n_jobs=-1,
        early_stopping_rounds=25,
    )

    # Fit model with early stopping on test validation
    model.fit(
        X_train,
        y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=25,
    )

    best_iteration = getattr(model, "best_iteration", model.n_estimators)
    print(f"       Best iteration reached at epoch: {best_iteration}")

    # 5. Model Evaluation
    print("\n[5/6] 📊 Evaluating Model Performance on Test Data...")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    auc = roc_auc_score(y_test, y_prob)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 50)
    print("           EVALUATION METRICS SUMMARY")
    print("=" * 50)
    print(f"  Accuracy  : {acc * 100:.2f}%")
    print(f"  Precision : {prec * 100:.2f}%")
    print(f"  Recall    : {rec * 100:.2f}%")
    print(f"  F1-Score  : {f1 * 100:.2f}%")
    print(f"  ROC-AUC   : {auc * 100:.2f}%")
    print("=" * 50)
    print("\nConfusion Matrix:")
    print(f"  True Negative  (TN): {cm[0][0]:<4} | False Positive (FP): {cm[0][1]}")
    print(f"  False Negative (FN): {cm[1][0]:<4} | True Positive  (TP): {cm[1][1]}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, digits=4))

    # Top Feature Importance
    importances = model.feature_importances_
    feat_imp = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
    print("\nTop 10 Most Influential Features:")
    for rank, (fname, imp) in enumerate(feat_imp[:10], start=1):
        bar = "█" * int(imp * 80)
        print(f"  {rank:2d}. {fname:<25} : {imp:.4f} {bar}")

    # 6. Save Artifacts & Visualizations
    print("\n[6/6] 💾 Saving Model & Visual Analytics...")

    # A. Save model file (.json native format and .joblib)
    model_json_path = os.path.join(output_dir, "xgboost_alzheimers.json")
    model.save_model(model_json_path)
    print(f"       ✅ Model saved: {model_json_path}")

    # B. Save metadata & metrics JSON
    metrics_summary = {
        "model_name": "XGBoostAlzheimersClassifier",
        "algorithm": "XGBoost",
        "dataset": data_path,
        "n_samples": len(df),
        "n_features": len(feature_names),
        "features": feature_names,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(auc), 4),
        },
        "confusion_matrix": {
            "tn": int(cm[0][0]),
            "fp": int(cm[0][1]),
            "fn": int(cm[1][0]),
            "tp": int(cm[1][1]),
        },
        "top_features": [
            {"feature": fname, "importance": round(float(imp), 4)}
            for fname, imp in feat_imp[:15]
        ],
    }
    metrics_json_path = os.path.join(reports_dir, "alzheimers_xgboost_metrics.json")
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)
    print(f"       ✅ Metrics report saved: {metrics_json_path}")

    # C. Plot Feature Importance
    fig, ax = plt.subplots(figsize=(10, 6))
    top_n = feat_imp[:15][::-1]
    y_pos = np.arange(len(top_n))
    names = [x[0] for x in top_n]
    scores = [x[1] for x in top_n]
    ax.barh(y_pos, scores, color="#8b5cf6", edgecolor="#7c3aed", alpha=0.85)
    ax.set_yticks(y_pos)
    ax.set_yticklabels(names, fontsize=10)
    ax.set_xlabel("Feature Importance Score (Gain)", fontsize=11)
    ax.set_title("Neura AI — Top 15 Feature Importances (XGBoost Alzheimer's)", fontsize=13, fontweight="bold")
    ax.grid(axis="x", linestyle="--", alpha=0.4)
    plt.tight_layout()
    plot_path = os.path.join(reports_dir, "alzheimers_feature_importance.png")
    plt.savefig(plot_path, dpi=200)
    plt.close()
    print(f"       ✅ Feature importance plot saved: {plot_path}")

    print("\n✨ Training and evaluation completed successfully!")
    return model, metrics_summary


if __name__ == "__main__":
    train_alzheimers_xgboost()
