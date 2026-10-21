"""
core/logger.py
==============
Centralized logging setup using Python's logging module + Rich handler.

Usage:
    from core.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Training started")
"""

import logging
import os
from pathlib import Path

from rich.console import Console
from rich.logging import RichHandler


_loggers: dict[str, logging.Logger] = {}


def get_logger(
    name: str,
    level: str | None = None,
    log_file: str | None = None,
) -> logging.Logger:
    """
    Get or create a named logger with Rich console output.

    Args:
        name:     Logger name, typically __name__
        level:    Log level string (DEBUG, INFO, WARNING, ERROR)
        log_file: Optional path to a log file

    Returns:
        Configured Logger instance
    """
    if name in _loggers:
        return _loggers[name]

    log_level_str = level or os.getenv("NEURA_LOG_LEVEL", "INFO")
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    logger = logging.getLogger(name)
    logger.setLevel(log_level)

    if not logger.handlers:
        # --- Rich console handler ---
        console_handler = RichHandler(
            rich_tracebacks=True,
            markup=True,
            show_path=False,
            console=Console(
                legacy_windows=False,
                force_terminal=True,
                stderr=False,
            ),
        )
        console_handler.setLevel(log_level)
        logger.addHandler(console_handler)

        # --- File handler (optional) ---
        if log_file:
            _setup_file_handler(logger, log_file, log_level)

    logger.propagate = False
    _loggers[name] = logger
    return logger


def setup_file_logging(log_file: str, level: str = "INFO") -> None:
    """Configure file logging for all existing loggers."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    _setup_file_handler(root_logger, log_file, log_level)


def _setup_file_handler(
    logger: logging.Logger,
    log_file: str,
    level: int,
) -> None:
    """Add a file handler to a logger."""
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setLevel(level)
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
