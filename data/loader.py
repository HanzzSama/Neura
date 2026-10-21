"""
data/loader.py
==============
Dataset loader -- handles CSV, numpy, and TFRecord sources.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from core.config import Config
from core.exceptions import DataError
from core.logger import get_logger


logger = get_logger(__name__)


class DataLoader:
    """
    Loads datasets from various sources defined in the config.

    Supported sources: csv, numpy
    """

    def __init__(self, config: Config) -> None:
        self.config = config

    def load_train(self) -> pd.DataFrame:
        """Load training data."""
        path = self.config.get("data.train_path", "")
        return self._load(path, label="train")

    def load_test(self) -> pd.DataFrame:
        """Load test / holdout data."""
        path = self.config.get("data.test_path", "")
        return self._load(path, label="test")

    def load_from_path(self, path: str) -> pd.DataFrame:
        """Load from an arbitrary path."""
        return self._load(path, label="custom")

    def load_numpy(
        self, X: np.ndarray, y: np.ndarray | None = None
    ) -> pd.DataFrame:
        """
        Wrap numpy arrays into a DataFrame.
        Useful when data comes from external pipelines.
        """
        target_col = self.config.get("data.target_column", "label")
        df = pd.DataFrame(X, columns=[f"feature_{i}" for i in range(X.shape[1])])
        if y is not None:
            df[target_col] = y
        return df

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load(self, path: str, label: str = "data") -> pd.DataFrame:
        if not path:
            raise DataError(f"No path configured for {label} dataset.")

        file_path = Path(path)
        source: str = self.config.get("data.source", "csv")

        if not file_path.exists():
            raise DataError(f"Dataset file not found: {file_path.resolve()}")

        if source == "csv" or file_path.suffix == ".csv":
            df = pd.read_csv(file_path)
        elif file_path.suffix in (".npy",):
            arr = np.load(file_path)
            df = pd.DataFrame(arr)
        elif file_path.suffix in (".parquet",):
            df = pd.read_parquet(file_path)
        else:
            raise DataError(
                f"Unsupported file format: {file_path.suffix}. "
                f"Supported: .csv, .npy, .parquet"
            )

        logger.info(
            f"Loaded {label} dataset: {file_path.name} "
            f"({len(df):,} rows × {len(df.columns)} cols)"
        )
        return df
