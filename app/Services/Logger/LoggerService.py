"""
app/Services/Logger/LoggerService.py
===================================
Centralized rich logging service.
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
    if name in _loggers:
        return _loggers[name]

    log_level_str = level or os.getenv("NEURA_LOG_LEVEL", "INFO")
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    logger = logging.getLogger(name)
    logger.setLevel(log_level)

    if not logger.handlers:
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
        formatter = logging.Formatter("%(message)s", datefmt="[%X]")
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        if log_file:
            log_path = Path(log_file)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            file_handler = logging.FileHandler(str(log_path), encoding="utf-8")
            file_handler.setLevel(log_level)
            file_formatter = logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
            )
            file_handler.setFormatter(file_formatter)
            logger.addHandler(file_handler)

    _loggers[name] = logger
    return logger
