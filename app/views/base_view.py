"""
app/views/base_view.py
======================
Abstract base class for all Views.

Views are responsible for presenting data to the user -- they receive
structured data (schemas) from Controllers and format/render them.
They contain NO business logic and NO ML code.
"""

from __future__ import annotations

import sys
from abc import ABC, abstractmethod
from typing import Any

from rich.console import Console
from rich.panel import Panel
from rich.text import Text


# Force UTF-8 mode on Windows; disable legacy renderer that uses cp1252
console = Console(
    legacy_windows=False,
    force_terminal=True,
    file=open(sys.stdout.fileno(), mode="w", encoding="utf-8", closefd=False),
)


class BaseView(ABC):
    """
    Abstract base for all Neura Views.

    All views use Rich for beautiful terminal output.
    """

    def __init__(self, title: str = "Neura") -> None:
        self.title = title
        self.console = console

    def render_header(self) -> None:
        """Render a styled header panel."""
        # Strip emoji from title to avoid Windows cp1252 fallback issues
        safe_title = self.title.encode("ascii", errors="replace").decode("ascii")
        self.console.print(
            Panel(
                Text(safe_title, style="bold cyan", justify="center"),
                border_style="bright_blue",
                padding=(0, 4),
            )
        )

    def render_error(self, message: str) -> None:
        """Display an error message."""
        self.console.print(f"[bold red]✗ Error:[/bold red] {message}")

    def render_success(self, message: str) -> None:
        """Display a success message."""
        self.console.print(f"[bold green]✓[/bold green] {message}")

    def render_info(self, message: str) -> None:
        """Display an info message."""
        self.console.print(f"[bold blue]ℹ[/bold blue] {message}")

    @abstractmethod
    def render(self, data: Any) -> None:
        """Render the primary view output. Must be implemented by subclasses."""
        ...
