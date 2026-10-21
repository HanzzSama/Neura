"""
tests/test_controllers.py
==========================
Unit tests for the Controller layer.
"""

import numpy as np
import pytest


def get_config():
    from core.config import Config
    config = Config.__new__(Config)
    config._data = {
        "model": {
            "input_shape": [10],
            "output_units": 2,
            "output_activation": "softmax",
            "architecture": {
                "hidden_layers": [{"units": 16, "activation": "relu", "dropout": 0.0}]
            },
        },
        "training": {
            "epochs": 2,
            "batch_size": 8,
            "validation_split": 0.2,
            "optimizer": {"name": "adam", "learning_rate": 0.01},
            "loss": "categorical_crossentropy",
            "metrics": ["accuracy"],
            "early_stopping": {"enabled": False},
            "reduce_lr": {"enabled": False},
        },
        "logging": {"tensorboard": False, "log_to_file": False},
        "paths": {
            "checkpoints": "public/checkpoints",
            "logs": "public/logs",
            "reports": "public/reports",
            "assets": "public/assets",
        },
    }
    return config


class TestTrainingController:
    def test_run_returns_report(self):
        from app.models.neural_network import NeuralNetwork
        from app.controllers.training_controller import TrainingController

        config = get_config()
        model = NeuralNetwork(config).initialize()
        ctrl = TrainingController(config, model)

        X = np.random.randn(50, 10).astype(np.float32)
        y = np.eye(2)[np.random.randint(0, 2, 50)].astype(np.float32)
        report = ctrl.run(X, y)

        assert report.model_name == "NeuralNetwork"
        assert report.epochs_run >= 1
        assert report.best_val_loss < float("inf")


class TestPredictionController:
    def test_predict_single(self):
        from app.models.neural_network import NeuralNetwork
        from app.controllers.prediction_controller import PredictionController

        config = get_config()
        model = NeuralNetwork(config).initialize()
        ctrl = PredictionController(config, model, display=False)

        sample = np.random.randn(10).astype(np.float32)
        result = ctrl.predict(sample, display=False)

        assert result.predicted_class in (0, 1)
        assert 0.0 <= result.confidence <= 1.0
