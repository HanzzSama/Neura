"""
training/callbacks.py
======================
Factory for building TensorFlow training callbacks from config.
"""

from __future__ import annotations

from pathlib import Path

import tensorflow as tf

from core.config import Config
from core.logger import get_logger


logger = get_logger(__name__)


def build_callbacks(
    config: Config,
    checkpoint_dir: str,
    log_dir: str,
    model_name: str,
) -> list[tf.keras.callbacks.Callback]:
    """
    Build a list of Keras callbacks from the project config.

    Includes:
      - ModelCheckpoint (always)
      - EarlyStopping   (if enabled)
      - ReduceLROnPlateau (if enabled)
      - TensorBoard     (if enabled)
      - CustomLogging   (always -- prints per-epoch results)
    """
    callbacks: list[tf.keras.callbacks.Callback] = []

    # --- 1. Model Checkpoint ---
    ckpt_path = Path(checkpoint_dir) / model_name / "weights.keras"
    ckpt_path.parent.mkdir(parents=True, exist_ok=True)

    callbacks.append(
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(ckpt_path),
            monitor="val_loss",
            save_best_only=True,
            save_weights_only=False,
            verbose=0,
        )
    )
    logger.debug(f"Checkpoint callback -> {ckpt_path}")

    # --- 2. Early Stopping ---
    if config.get("training.early_stopping.enabled", True):
        callbacks.append(
            tf.keras.callbacks.EarlyStopping(
                monitor=config.get("training.early_stopping.monitor", "val_loss"),
                patience=config.get("training.early_stopping.patience", 10),
                restore_best_weights=config.get(
                    "training.early_stopping.restore_best_weights", True
                ),
                verbose=1,
            )
        )

    # --- 3. Reduce LR on Plateau ---
    if config.get("training.reduce_lr.enabled", True):
        callbacks.append(
            tf.keras.callbacks.ReduceLROnPlateau(
                monitor=config.get("training.reduce_lr.monitor", "val_loss"),
                factor=config.get("training.reduce_lr.factor", 0.5),
                patience=config.get("training.reduce_lr.patience", 5),
                min_lr=config.get("training.reduce_lr.min_lr", 1e-7),
                verbose=1,
            )
        )

    # --- 4. TensorBoard ---
    if config.get("logging.tensorboard", True):
        tb_log_dir = Path(log_dir) / "tensorboard" / model_name
        tb_log_dir.mkdir(parents=True, exist_ok=True)
        callbacks.append(
            tf.keras.callbacks.TensorBoard(
                log_dir=str(tb_log_dir),
                histogram_freq=1,
                write_graph=True,
            )
        )
        logger.debug(f"TensorBoard -> tensorboard --logdir {tb_log_dir}")

    # --- 5. Custom per-epoch logger ---
    callbacks.append(_EpochLogger())

    return callbacks


class _EpochLogger(tf.keras.callbacks.Callback):
    """Custom callback that logs epoch metrics using the Neura logger."""

    def __init__(self) -> None:
        super().__init__()
        self._logger = get_logger("EpochLogger")

    def on_epoch_end(self, epoch: int, logs: dict | None = None) -> None:
        logs = logs or {}
        parts = [f"Epoch {epoch + 1:>3}"]
        for key, val in logs.items():
            parts.append(f"{key}={val:.4f}")
        self._logger.info("  ".join(parts))
