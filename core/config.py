"""
core/config.py
==============
Configuration loader for the Neura project.

Loads and merges YAML configs with environment overrides.
Priority: ENV vars > env-specific YAML > default.yaml
"""

import os
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

from core.exceptions import ConfigError


class Config:
    """
    Centralized configuration manager.

    Usage:
        config = Config()                              # auto-detect env
        config = Config("configs/development.yaml")   # explicit path
        lr = config.get("training.optimizer.learning_rate", default=0.001)
    """

    def __init__(self, config_path: str | None = None) -> None:
        load_dotenv()  # Load .env file if present

        self._data: dict[str, Any] = {}

        # Load base config
        base_path = Path("configs/default.yaml")
        if base_path.exists():
            self._data = self._load_yaml(base_path)

        # Load environment-specific override
        env = os.getenv("NEURA_ENV", self._data.get("project", {}).get("environment", "development"))
        env_config_path = config_path or f"configs/{env}.yaml"
        override_path = Path(env_config_path)
        if override_path.exists():
            self._deep_merge(self._data, self._load_yaml(override_path))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Retrieve a config value using dot-notation.

        Example:
            config.get("training.optimizer.learning_rate")
        """
        keys = key_path.split(".")
        value = self._data
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default

    def set(self, key_path: str, value: Any) -> None:
        """Set a config value at runtime (not persisted to file)."""
        keys = key_path.split(".")
        d = self._data
        for k in keys[:-1]:
            d = d.setdefault(k, {})
        d[keys[-1]] = value

    def as_dict(self) -> dict[str, Any]:
        """Return full config as a plain dictionary."""
        return dict(self._data)

    def __repr__(self) -> str:
        env = self._data.get("project", {}).get("environment", "unknown")
        return f"<Config env={env}>"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _load_yaml(path: Path) -> dict[str, Any]:
        try:
            with open(path, encoding="utf-8") as f:
                data = yaml.safe_load(f)
                return data if isinstance(data, dict) else {}
        except yaml.YAMLError as e:
            raise ConfigError(f"Failed to parse YAML at {path}: {e}") from e

    def _deep_merge(self, base: dict, override: dict) -> None:
        """Recursively merge override into base (modifies base in-place)."""
        for key, value in override.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
