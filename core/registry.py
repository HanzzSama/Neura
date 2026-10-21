"""
core/registry.py
================
Model registry -- maps string names to model classes.

Usage:
    from core.registry import ModelRegistry

    @ModelRegistry.register("my_model")
    class MyModel(BaseModel):
        ...

    # Later:
    ModelClass = ModelRegistry.get("my_model")
    model = ModelClass(config)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Type

from core.exceptions import ModelError

if TYPE_CHECKING:
    from app.models.base_model import BaseModel


class ModelRegistry:
    """Global registry for ML model classes."""

    _registry: dict[str, Type["BaseModel"]] = {}

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    @classmethod
    def register(cls, name: str):
        """
        Decorator to register a model class under a given name.

        Example:
            @ModelRegistry.register("dense_net")
            class DenseNet(BaseModel):
                ...
        """
        def decorator(model_cls: Type["BaseModel"]) -> Type["BaseModel"]:
            if name in cls._registry:
                raise ModelError(
                    f"Model '{name}' is already registered. "
                    f"Use a unique name."
                )
            cls._registry[name] = model_cls
            return model_cls

        return decorator

    # ------------------------------------------------------------------
    # Lookup
    # ------------------------------------------------------------------

    @classmethod
    def get(cls, name: str) -> Type["BaseModel"]:
        """Retrieve a model class by its registered name."""
        if name not in cls._registry:
            available = list(cls._registry.keys())
            raise ModelError(
                f"Model '{name}' not found in registry. "
                f"Available models: {available}"
            )
        return cls._registry[name]

    @classmethod
    def list_models(cls) -> list[str]:
        """Return all registered model names."""
        return list(cls._registry.keys())

    @classmethod
    def clear(cls) -> None:
        """Clear the registry (useful for testing)."""
        cls._registry.clear()
