"""
data/preprocessor.py
=====================
Data preprocessing pipeline -- normalization, encoding, missing value handling.
All methods are stateless (fit/transform pattern using sklearn).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler, StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer

from core.config import Config
from core.exceptions import DataError
from core.logger import get_logger


logger = get_logger(__name__)


class Preprocessor:
    """
    Preprocessing pipeline configured from YAML config.

    Usage:
        preprocessor = Preprocessor(config)
        X_train, y_train = preprocessor.fit_transform(df_train, target_col="label")
        X_test, y_test   = preprocessor.transform(df_test, target_col="label")
    """

    def __init__(self, config: Config) -> None:
        self.config = config
        self._fitted: bool = False

        # Scalers / encoders (set during fit)
        self._feature_scaler: MinMaxScaler | StandardScaler | None = None
        self._label_encoder: LabelEncoder | None = None
        self._imputer: SimpleImputer | None = None
        self._feature_columns: list[str] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit_transform(
        self,
        df: pd.DataFrame,
        target_col: str | None = None,
    ) -> tuple[np.ndarray, np.ndarray | None]:
        """
        Fit on and transform training data.

        Returns:
            (X, y) numpy arrays. y is None if target_col not provided.
        """
        df = df.copy()
        y = None

        # Separate target
        if target_col and target_col in df.columns:
            y_raw = df.pop(target_col)
        else:
            y_raw = None

        # Determine feature columns
        feat_cols: list[str] = self.config.get("data.feature_columns", [])
        if feat_cols:
            df = df[feat_cols]
        self._feature_columns = list(df.columns)

        # Fit & transform features
        X = self._fit_transform_features(df)

        # Fit & transform labels
        if y_raw is not None:
            y = self._fit_transform_labels(y_raw)

        self._fitted = True
        logger.info(f"Fit-transform complete: X={X.shape}, y={y.shape if y is not None else None}")
        return X, y

    def transform(
        self,
        df: pd.DataFrame,
        target_col: str | None = None,
    ) -> tuple[np.ndarray, np.ndarray | None]:
        """Transform new data using fitted scalers."""
        if not self._fitted:
            raise DataError("Preprocessor not fitted. Call fit_transform first.")

        df = df.copy()
        y = None

        if target_col and target_col in df.columns:
            y_raw = df.pop(target_col)
            if self._label_encoder:
                y = self._label_encoder.transform(y_raw)
        else:
            y_raw = None

        if self._feature_columns:
            available = [c for c in self._feature_columns if c in df.columns]
            df = df[available]

        # Handle missing values
        if self._imputer:
            X = self._imputer.transform(df)
        else:
            X = df.values.astype(np.float32)

        # Scale
        if self._feature_scaler:
            X = self._feature_scaler.transform(X).astype(np.float32)

        return X, y

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fit_transform_features(self, df: pd.DataFrame) -> np.ndarray:
        # Handle missing values
        missing_strategy: str = self.config.get("data.preprocessing.handle_missing", "mean")
        if missing_strategy in ("mean", "median", "most_frequent"):
            self._imputer = SimpleImputer(strategy=missing_strategy)
            X = self._imputer.fit_transform(df).astype(np.float32)
        elif missing_strategy == "drop":
            df = df.dropna()
            X = df.values.astype(np.float32)
        else:
            X = df.values.astype(np.float32)

        # Normalize
        should_normalize: bool = self.config.get("data.preprocessing.normalize", True)
        if should_normalize:
            method: str = self.config.get("data.preprocessing.normalization_method", "minmax")
            if method == "minmax":
                self._feature_scaler = MinMaxScaler()
            elif method == "zscore":
                self._feature_scaler = StandardScaler()

            if self._feature_scaler:
                X = self._feature_scaler.fit_transform(X).astype(np.float32)

        return X

    def _fit_transform_labels(self, y_raw: pd.Series) -> np.ndarray:
        from tensorflow.keras.utils import to_categorical

        self._label_encoder = LabelEncoder()
        y_encoded = self._label_encoder.fit_transform(y_raw)
        n_classes = len(self._label_encoder.classes_)

        # One-hot encode for multi-class
        if n_classes > 2:
            return to_categorical(y_encoded, num_classes=n_classes).astype(np.float32)
        return y_encoded.astype(np.float32)
