"""
app/controllers/base_controller.py
====================================
Abstract base class for all Controllers.

Controllers are the orchestrators of the MVC pipeline:
  - They receive inputs (from scripts or API)
  - They coordinate Model and Data layers
  - They pass structured results to Views
  - They contain NO display/formatting logic (that lives in Views)
  - They contain NO architecture logic (that lives in Models)
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from core.config import Config
from core.logger import get_logger


logger = get_logger(__name__)


class BaseController(ABC):
    """
    Abstract base for all Neura controllers.

    Attributes:
        config: Project Config instance
    """

    def __init__(self, config: Config) -> None:
        self.config = config
        self.logger = get_logger(self.__class__.__name__)

    @abstractmethod
    def run(self, **kwargs) -> None:
        """
        Execute the controller's primary action.
        Must be implemented by all subclasses.
        """
        ...

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}>"
