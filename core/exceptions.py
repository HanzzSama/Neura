"""
core/exceptions.py
==================
Custom exception hierarchy for the Neura project.
"""


class NeuraError(Exception):
    """Base exception for all Neura errors."""

    def __init__(self, message: str = "", *args) -> None:
        super().__init__(message, *args)
        self.message = message

    def __str__(self) -> str:
        return self.message


class ConfigError(NeuraError):
    """Raised for configuration loading or validation errors."""


class ModelError(NeuraError):
    """Raised for model definition, build, or loading errors."""


class DataError(NeuraError):
    """Raised for data loading, preprocessing, or validation errors."""


class TrainingError(NeuraError):
    """Raised for errors during the training loop."""


class PredictionError(NeuraError):
    """Raised for errors during inference / prediction."""


class CheckpointError(NeuraError):
    """Raised when saving or loading model checkpoints fails."""
