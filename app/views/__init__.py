"""
app/views/__init__.py
"""

from app.views.training_view import TrainingView
from app.views.prediction_view import PredictionView

__all__ = ["TrainingView", "PredictionView"]
