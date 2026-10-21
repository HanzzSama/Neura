"""
app/controllers/training_controller.py
=======================================
Orchestrates the end-to-end training pipeline.

Pipeline:
  1. Load & preprocess data  (data layer)
  2. Build & compile model   (model layer)
  3. Run training loop       (training layer)
  4. Save best checkpoint    (model layer)
  5. Display results         (view layer)
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import tensorflow as tf

from app.controllers.base_controller import BaseController
from app.models.base_model import BaseModel
from app.models.schemas.data_schema import TrainingReport
from app.views.training_view import TrainingView
from core.config import Config
from core.exceptions import TrainingError
from training.callbacks import build_callbacks


class TrainingController(BaseController):
    """
    Manages the complete model training workflow.

    Usage:
        config = Config()
        model = NeuralNetwork(config).initialize()
        controller = TrainingController(config, model)
        controller.run(X_train, y_train)
    """

    def __init__(self, config: Config, model: BaseModel) -> None:
        super().__init__(config)
        self.model = model
        self.view = TrainingView(
            assets_dir=config.get("paths.assets", "public/assets")
        )

    def run(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray | None = None,
        y_val: np.ndarray | None = None,
    ) -> TrainingReport:
        """
        Execute training and return a TrainingReport.

        Args:
            X_train: Training features
            y_train: Training labels
            X_val:   Validation features (optional; uses val_split if None)
            y_val:   Validation labels (optional)

        Returns:
            TrainingReport with full training history
        """
        self.logger.info("Starting training pipeline...")
        self.view.render_header()

        epochs: int = self.config.get("training.epochs", 50)
        batch_size: int = self.config.get("training.batch_size", 32)
        val_split: float = self.config.get("training.validation_split", 0.2)
        checkpoint_dir: str = self.config.get("paths.checkpoints", "public/checkpoints")
        log_dir: str = self.config.get("paths.logs", "public/logs")

        keras_model = self.model.get_keras_model()

        # Build training callbacks
        callbacks = build_callbacks(
            config=self.config,
            checkpoint_dir=checkpoint_dir,
            log_dir=log_dir,
            model_name=self.model.name,
        )

        # Prepare validation data
        validation_data = None
        if X_val is not None and y_val is not None:
            validation_data = (X_val, y_val)
            val_split = 0.0  # Don't split if explicit val provided

        try:
            history = keras_model.fit(
                X_train,
                y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=val_split if validation_data is None else 0.0,
                validation_data=validation_data,
                callbacks=callbacks,
                verbose=0,  # We handle display ourselves
            )
        except Exception as e:
            raise TrainingError(f"Training failed: {e}") from e

        # Build report
        hist = history.history
        report = TrainingReport(
            model_name=self.model.name,
            epochs_run=len(hist.get("loss", [])),
            best_val_loss=float(min(hist.get("val_loss", [float("inf")]))),
            best_val_acc=float(max(hist.get("val_accuracy", [0.0])))
            if "val_accuracy" in hist else None,
            history=hist,
            checkpoint_path=str(Path(checkpoint_dir) / self.model.name),
        )

        # Save model
        self.model.save(checkpoint_dir)

        # Render results
        self.view.render_final_report(report)
        plot_paths = self.view.save_plots(report)
        for p in plot_paths:
            self.logger.info(f"Plot saved -> {p}")

        return report
