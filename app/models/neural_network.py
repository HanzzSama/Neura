"""
app/models/neural_network.py
============================
Configurable Dense Neural Network -- the default General Template model.

Registered as "neural_network" in the ModelRegistry so it can be
instantiated by name:

    from core.registry import ModelRegistry
    ModelClass = ModelRegistry.get("neural_network")
    model = ModelClass(config).initialize()

Architecture is fully driven by configs/default.yaml:
    model:
      architecture:
        hidden_layers:
          - units: 256
            activation: relu
            dropout: 0.3
          ...
"""

from __future__ import annotations

import tensorflow as tf

from app.models.base_model import BaseModel
from core.config import Config
from core.logger import get_logger
from core.registry import ModelRegistry


logger = get_logger(__name__)


@ModelRegistry.register("neural_network")
class NeuralNetwork(BaseModel):
    """
    Fully-connected (Dense) Neural Network.

    Reads architecture from config and builds a sequential model.
    Easily swappable with CNN, RNN, or Transformer subclasses.
    """

    def __init__(self, config: Config) -> None:
        super().__init__(config, name="NeuralNetwork")

    # ------------------------------------------------------------------
    # Build -- Abstract method implementation
    # ------------------------------------------------------------------

    def build(self) -> tf.keras.Model:
        """Construct the Keras model from config."""
        input_shape: list[int] = self.config.get("model.input_shape", [128])
        output_units: int = self.config.get("model.output_units", 10)
        output_activation: str = self.config.get("model.output_activation", "softmax")
        hidden_layers: list[dict] = self.config.get(
            "model.architecture.hidden_layers",
            [{"units": 128, "activation": "relu", "dropout": 0.3}],
        )

        inputs = tf.keras.Input(shape=tuple(input_shape), name="input")
        x = inputs

        # --- Hidden layers ---
        for i, layer_cfg in enumerate(hidden_layers):
            units: int = layer_cfg.get("units", 64)
            activation: str = layer_cfg.get("activation", "relu")
            dropout_rate: float = layer_cfg.get("dropout", 0.0)

            x = tf.keras.layers.Dense(
                units=units,
                activation=activation,
                name=f"dense_{i + 1}",
                kernel_initializer="he_uniform",
            )(x)

            if dropout_rate > 0:
                x = tf.keras.layers.Dropout(rate=dropout_rate, name=f"dropout_{i + 1}")(x)

        # --- Output layer ---
        outputs = tf.keras.layers.Dense(
            units=output_units,
            activation=output_activation,
            name="output",
        )(x)

        model = tf.keras.Model(inputs=inputs, outputs=outputs, name=self.name)

        logger.info(
            f"Built [bold green]NeuralNetwork[/bold green] | "
            f"input={input_shape} | layers={len(hidden_layers)} | "
            f"output={output_units} ({output_activation})"
        )
        return model
