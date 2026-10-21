"""
app/models/base_model.py
========================
Abstract base class for all ML models in the Neura project.

Every model MUST:
  1. Inherit from BaseModel
  2. Implement `build()` to return a tf.keras.Model
  3. Optionally override `compile()` for custom optimizer/loss setup

Design:
  - BaseModel wraps a tf.keras.Model internally
  - It decouples model architecture from training logic
  - All path and logging concerns are handled via core utilities
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import tensorflow as tf

from core.config import Config
from core.exceptions import CheckpointError, ModelError
from core.logger import get_logger


logger = get_logger(__name__)


class BaseModel(ABC):
    """
    Abstract base for all Neura ML models.

    Attributes:
        config:   Project Config instance
        model:    The underlying tf.keras.Model (set after build)
        name:     Human-readable model name
    """

    def __init__(self, config: Config, name: str = "BaseModel") -> None:
        self.config = config
        self.name = name
        self.model: tf.keras.Model | None = None
        self._is_built: bool = False
        self._is_compiled: bool = False

    # ------------------------------------------------------------------
    # Abstract Interface
    # ------------------------------------------------------------------

    @abstractmethod
    def build(self) -> tf.keras.Model:
        """
        Define and return the tf.keras.Model architecture.

        Must be implemented by every subclass.
        """
        ...

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def initialize(self) -> "BaseModel":
        """Build and compile the model. Returns self for chaining."""
        logger.info(f"[bold]Initializing model:[/bold] {self.name}")
        self.model = self.build()
        self._is_built = True
        self.compile()
        return self

    def compile(self) -> None:
        """
        Compile the model using config settings.
        Override this in subclasses for custom compile logic.
        """
        if self.model is None:
            raise ModelError("Cannot compile -- model not built yet.")

        optimizer_name: str = self.config.get("training.optimizer.name", "adam")
        lr: float = self.config.get("training.optimizer.learning_rate", 0.001)
        loss: str = self.config.get("training.loss", "categorical_crossentropy")
        metrics: list[str] = self.config.get("training.metrics", ["accuracy"])

        optimizer_map = {
            "adam": tf.keras.optimizers.Adam,
            "sgd": tf.keras.optimizers.SGD,
            "rmsprop": tf.keras.optimizers.RMSprop,
            "adamw": tf.keras.optimizers.AdamW,
        }

        optimizer_cls = optimizer_map.get(optimizer_name.lower())
        if optimizer_cls is None:
            raise ModelError(f"Unknown optimizer: '{optimizer_name}'")

        optimizer = optimizer_cls(learning_rate=lr)

        self.model.compile(optimizer=optimizer, loss=loss, metrics=metrics)
        self._is_compiled = True
        logger.info(f"Compiled with optimizer={optimizer_name}, lr={lr}, loss={loss}")

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, path: str | None = None) -> Path:
        """Save the model in native Keras format (.keras)."""
        self._require_built()
        save_dir = Path(path or self.config.get("paths.checkpoints", "public/checkpoints"))
        save_dir.mkdir(parents=True, exist_ok=True)
        save_path = save_dir / f"{self.name}.keras"
        try:
            self.model.save(str(save_path))  # type: ignore[union-attr]
            logger.info(f"Model saved -> [cyan]{save_path}[/cyan]")
            return save_path
        except Exception as e:
            raise CheckpointError(f"Failed to save model: {e}") from e

    def load(self, path: str) -> "BaseModel":
        """Load a previously saved .keras model."""
        load_path = Path(path)
        # Accept bare directory/name -- auto-resolve to .keras file
        if not load_path.suffix:
            load_path = Path(str(load_path) + ".keras")
        if not load_path.exists():
            raise CheckpointError(f"Checkpoint not found: {load_path}")
        try:
            self.model = tf.keras.models.load_model(str(load_path))
            self._is_built = True
            self._is_compiled = True
            logger.info(f"Model loaded <- [cyan]{load_path}[/cyan]")
            return self
        except Exception as e:
            raise CheckpointError(f"Failed to load model: {e}") from e

    def export_tflite(self, path: str | None = None) -> Path:
        """Export the model to TFLite format."""
        self._require_built()
        export_dir = Path(path or self.config.get("paths.exports", "public/exports"))
        export_dir.mkdir(parents=True, exist_ok=True)
        tflite_path = export_dir / f"{self.name}.tflite"

        converter = tf.lite.TFLiteConverter.from_keras_model(self.model)  # type: ignore
        tflite_model = converter.convert()

        tflite_path.write_bytes(tflite_model)
        logger.info(f"TFLite exported -> [cyan]{tflite_path}[/cyan]")
        return tflite_path

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def summary(self) -> None:
        """Print model architecture summary."""
        self._require_built()
        self.model.summary()  # type: ignore[union-attr]

    def get_keras_model(self) -> tf.keras.Model:
        """Return the underlying Keras model."""
        self._require_built()
        return self.model  # type: ignore[return-value]

    def _require_built(self) -> None:
        if not self._is_built or self.model is None:
            raise ModelError(f"Model '{self.name}' has not been built yet. Call initialize() first.")

    def __repr__(self) -> str:
        status = "built" if self._is_built else "not built"
        return f"<{self.__class__.__name__} name={self.name!r} status={status}>"
