"""
features package
================
Modular feature extensions for Neura AI.
Includes conversational datasets, intent management, and ML utilities.
"""

from .chat_dataset import CHAT_DATASET, CATEGORIES
from .chat_manager import ChatDatasetManager

__all__ = ["CHAT_DATASET", "CATEGORIES", "ChatDatasetManager"]
