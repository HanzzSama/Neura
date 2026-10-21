"""
tests/test_models.py
====================
Unit tests for the Model layer.
"""

import numpy as np
import pytest


def get_config():
    from core.config import Config
    config = Config.__new__(Config)
    config._data = {
        "model": {
            "name": "NeuralNetwork",
            "input_shape": [20],
            "output_units": 3,
            "output_activation": "softmax",
            "architecture": {
                "hidden_layers": [
                    {"units": 32, "activation": "relu", "dropout": 0.1}
                ]
            },
        },
        "training": {
            "optimizer": {"name": "adam", "learning_rate": 0.001},
            "loss": "categorical_crossentropy",
            "metrics": ["accuracy"],
        },
        "paths": {"checkpoints": "public/checkpoints"},
    }
    return config


class TestNeuralNetwork:
    def test_build(self):
        from app.models.neural_network import NeuralNetwork
        config = get_config()
        model = NeuralNetwork(config)
        model.initialize()
        assert model._is_built
        assert model._is_compiled

    def test_forward_pass(self):
        from app.models.neural_network import NeuralNetwork
        config = get_config()
        model = NeuralNetwork(config).initialize()
        X = np.random.randn(5, 20).astype(np.float32)
        output = model.get_keras_model().predict(X, verbose=0)
        assert output.shape == (5, 3)

    def test_summary_no_error(self):
        from app.models.neural_network import NeuralNetwork
        config = get_config()
        model = NeuralNetwork(config).initialize()
        model.summary()  # should not raise

    def test_registry(self):
        from core.registry import ModelRegistry
        import app.models.neural_network  # noqa: ensure registered
        assert "neural_network" in ModelRegistry.list_models()
