"""
app/models/schemas/data_schema.py
==================================
Data schemas / dataclasses used across the MVC layers.

These are plain Python dataclasses (no TF dependency) used to pass
structured data between Controllers and Views.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class DataBatch:
    """
    Represents a batch of data passed through the pipeline.

    Attributes:
        X:          Feature matrix (numpy array)
        y:          Labels / targets (numpy array, optional)
        metadata:   Optional dict with extra info (file paths, IDs, etc.)
    """

    X: np.ndarray
    y: np.ndarray | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def num_samples(self) -> int:
        return len(self.X)

    @property
    def feature_dim(self) -> tuple:
        return self.X.shape[1:]

    def __repr__(self) -> str:
        label_info = f", y={self.y.shape}" if self.y is not None else ""
        return f"<DataBatch samples={self.num_samples}, X={self.X.shape}{label_info}>"


@dataclass
class PredictionResult:
    """
    Encapsulates a single prediction result.

    Attributes:
        raw_output:     Raw model output (softmax / logits)
        predicted_class: Predicted class index
        confidence:     Confidence score of predicted class
        class_names:    Optional mapping from index to label name
        input_data:     Original input (for reference)
    """

    raw_output: np.ndarray
    predicted_class: int
    confidence: float
    class_names: list[str] | None = None
    input_data: np.ndarray | None = None

    @property
    def predicted_label(self) -> str:
        if self.class_names and 0 <= self.predicted_class < len(self.class_names):
            return self.class_names[self.predicted_class]
        return str(self.predicted_class)

    def __repr__(self) -> str:
        return (
            f"<PredictionResult class={self.predicted_label!r} "
            f"confidence={self.confidence:.2%}>"
        )


@dataclass
class TrainingReport:
    """
    Summary report produced after a training run.

    Attributes:
        model_name:     Name of the model
        epochs_run:     How many epochs were completed
        best_val_loss:  Best validation loss achieved
        best_val_acc:   Best validation accuracy achieved
        history:        Full Keras training history dict
        checkpoint_path: Where the best model was saved
    """

    model_name: str
    epochs_run: int
    best_val_loss: float
    best_val_acc: float | None = None
    history: dict[str, list[float]] = field(default_factory=dict)
    checkpoint_path: str | None = None

    def __repr__(self) -> str:
        acc_str = f", best_val_acc={self.best_val_acc:.4f}" if self.best_val_acc else ""
        return (
            f"<TrainingReport model={self.model_name!r} "
            f"epochs={self.epochs_run} "
            f"best_val_loss={self.best_val_loss:.4f}{acc_str}>"
        )
