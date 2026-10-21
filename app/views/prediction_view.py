"""
app/views/prediction_view.py
=============================
View for displaying prediction results.
"""

from __future__ import annotations

from typing import Any

from rich.table import Table
from rich.panel import Panel

from app.models.schemas.data_schema import PredictionResult
from app.views.base_view import BaseView


class PredictionView(BaseView):
    """
    Renders prediction results to the terminal.
    """

    def __init__(self) -> None:
        super().__init__(title="🔮 Neura -- Prediction")

    def render(self, data: PredictionResult) -> None:
        """Render a single prediction result."""
        self.render_header()
        self._render_prediction_panel(data)
        self._render_probabilities_table(data)

    def render_batch(self, results: list[PredictionResult]) -> None:
        """Render a batch of prediction results as a table."""
        table = Table(title="Batch Predictions", border_style="blue")
        table.add_column("#", style="dim", justify="right")
        table.add_column("Predicted Class", style="bold green")
        table.add_column("Confidence", justify="right")

        for i, result in enumerate(results):
            table.add_row(
                str(i + 1),
                result.predicted_label,
                f"{result.confidence:.2%}",
            )
        self.console.print(table)

    def _render_prediction_panel(self, result: PredictionResult) -> None:
        self.console.print(
            Panel(
                f"[bold]Predicted:[/bold]  [green]{result.predicted_label}[/green]\n"
                f"[bold]Confidence:[/bold] [yellow]{result.confidence:.2%}[/yellow]",
                title="[bold]Prediction Result[/bold]",
                border_style="green",
            )
        )

    def _render_probabilities_table(self, result: PredictionResult) -> None:
        """Show top-5 class probabilities."""
        table = Table(title="Class Probabilities (Top 5)", border_style="dim")
        table.add_column("Class", style="dim")
        table.add_column("Probability", justify="right")
        table.add_column("", width=30)

        # Sort by probability descending
        probs = [(i, float(p)) for i, p in enumerate(result.raw_output)]
        probs.sort(key=lambda x: x[1], reverse=True)

        for rank, (cls_idx, prob) in enumerate(probs[:5]):
            label = (
                result.class_names[cls_idx]
                if result.class_names and cls_idx < len(result.class_names)
                else str(cls_idx)
            )
            bar_len = int(prob * 25)
            bar = "█" * bar_len + "░" * (25 - bar_len)
            color = "green" if rank == 0 else "dim"
            table.add_row(
                f"[{color}]{label}[/{color}]",
                f"[{color}]{prob:.4f}[/{color}]",
                f"[{color}]{bar}[/{color}]",
            )

        self.console.print(table)
