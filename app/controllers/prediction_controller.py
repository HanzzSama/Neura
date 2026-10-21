"""
app/controllers/prediction_controller.py
==========================================
Handles single-sample and batch inference.
"""

from __future__ import annotations

import numpy as np

from app.controllers.base_controller import BaseController
from app.models.base_model import BaseModel
from app.models.schemas.data_schema import PredictionResult
from app.views.prediction_view import PredictionView
from core.config import Config
from core.exceptions import PredictionError


class PredictionController(BaseController):
    """
    Runs inference using a trained model and passes results to the View.

    Usage:
        controller = PredictionController(config, model, class_names=["cat","dog"])
        result = controller.predict(sample)
        results = controller.predict_batch(batch)
    """

    def __init__(
        self,
        config: Config,
        model: BaseModel,
        class_names: list[str] | None = None,
    ) -> None:
        super().__init__(config)
        self.model = model
        self.class_names = class_names
        self.view = PredictionView()

    def run(self, input_data: np.ndarray) -> PredictionResult:
        """Alias for predict() -- satisfies BaseController.run()."""
        return self.predict(input_data)

    def predict(self, input_data: np.ndarray, display: bool = True) -> PredictionResult:
        """
        Run inference on a single sample.

        Args:
            input_data: Input numpy array (will be expanded to batch dim if needed)
            display:    Whether to render the result to terminal

        Returns:
            PredictionResult with class, confidence, and raw output
        """
        if input_data.ndim == 1:
            input_data = np.expand_dims(input_data, axis=0)

        try:
            keras_model = self.model.get_keras_model()
            raw_output: np.ndarray = keras_model.predict(input_data, verbose=0)[0]
        except Exception as e:
            raise PredictionError(f"Prediction failed: {e}") from e

        predicted_class = int(np.argmax(raw_output))
        confidence = float(raw_output[predicted_class])

        result = PredictionResult(
            raw_output=raw_output,
            predicted_class=predicted_class,
            confidence=confidence,
            class_names=self.class_names,
            input_data=input_data,
        )

        if display:
            self.view.render(result)

        return result

    def predict_batch(
        self,
        batch: np.ndarray,
        display: bool = True,
    ) -> list[PredictionResult]:
        """
        Run inference on a batch of samples.

        Args:
            batch:   2D numpy array of samples
            display: Whether to render batch results

        Returns:
            List of PredictionResult objects
        """
        try:
            keras_model = self.model.get_keras_model()
            raw_outputs: np.ndarray = keras_model.predict(batch, verbose=0)
        except Exception as e:
            raise PredictionError(f"Batch prediction failed: {e}") from e

        results = []
        for raw in raw_outputs:
            predicted_class = int(np.argmax(raw))
            confidence = float(raw[predicted_class])
            results.append(
                PredictionResult(
                    raw_output=raw,
                    predicted_class=predicted_class,
                    confidence=confidence,
                    class_names=self.class_names,
                )
            )

        if display:
            self.view.render_batch(results)

        return results
