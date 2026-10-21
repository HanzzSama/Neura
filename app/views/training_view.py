"""
app/views/training_view.py
===========================
View for displaying training progress, metrics, and final reports.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for saving plots
import matplotlib.pyplot as plt

from rich.table import Table
from rich.panel import Panel
from rich.text import Text

from app.models.schemas.data_schema import TrainingReport
from app.views.base_view import BaseView


class TrainingView(BaseView):
    """
    Renders training results to the terminal and saves metric plots.

    Responsibilities:
      - Show epoch-by-epoch metrics table
      - Display final training report summary
      - Save loss/accuracy plots to public/assets/
    """

    def __init__(self, assets_dir: str = "public/assets") -> None:
        super().__init__(title="🧠 Neura -- Training")
        self.assets_dir = Path(assets_dir)
        self.assets_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # BaseView implementation
    # ------------------------------------------------------------------

    def render(self, data: TrainingReport) -> None:
        """Render a full training report."""
        self.render_header()
        self._render_summary_table(data)
        self._render_history_table(data)

    # ------------------------------------------------------------------
    # Specific render methods
    # ------------------------------------------------------------------

    def render_epoch_result(self, epoch: int, logs: dict[str, float]) -> None:
        """Display a single epoch result line (called each epoch)."""
        parts = [f"[dim]Epoch {epoch:>3}[/dim]"]
        for key, val in logs.items():
            color = "green" if "acc" in key else "yellow"
            parts.append(f"[{color}]{key}=[/{color}][bold]{val:.4f}[/bold]")
        self.console.print("  " + "  ".join(parts))

    def render_final_report(self, report: TrainingReport) -> None:
        """Display a styled final summary panel."""
        lines = [
            f"[bold]Model:[/bold]        {report.model_name}",
            f"[bold]Epochs run:[/bold]   {report.epochs_run}",
            f"[bold]Best val loss:[/bold] [yellow]{report.best_val_loss:.4f}[/yellow]",
        ]
        if report.best_val_acc is not None:
            lines.append(f"[bold]Best val acc:[/bold]  [green]{report.best_val_acc:.4f}[/green]")
        if report.checkpoint_path:
            lines.append(f"[bold]Checkpoint:[/bold]   [cyan]{report.checkpoint_path}[/cyan]")

        self.console.print(
            Panel(
                "\n".join(lines),
                title="[bold bright_blue]Training Complete[/bold bright_blue]",
                border_style="bright_blue",
            )
        )

    def save_plots(self, report: TrainingReport) -> list[Path]:
        """Save loss and accuracy plots to the assets directory."""
        saved = []
        history = report.history

        # --- Loss plot ---
        if "loss" in history:
            fig, ax = plt.subplots(figsize=(8, 5))
            ax.plot(history["loss"], label="Train Loss", color="#5E81F4")
            if "val_loss" in history:
                ax.plot(history["val_loss"], label="Val Loss", color="#FF6B6B", linestyle="--")
            ax.set_xlabel("Epoch")
            ax.set_ylabel("Loss")
            ax.set_title(f"{report.model_name} -- Loss")
            ax.legend()
            ax.grid(alpha=0.3)
            fig.tight_layout()
            loss_path = self.assets_dir / f"{report.model_name}_loss.png"
            fig.savefig(loss_path, dpi=120)
            plt.close(fig)
            saved.append(loss_path)

        # --- Accuracy plot ---
        if "accuracy" in history:
            fig, ax = plt.subplots(figsize=(8, 5))
            ax.plot(history["accuracy"], label="Train Acc", color="#5E81F4")
            if "val_accuracy" in history:
                ax.plot(history["val_accuracy"], label="Val Acc", color="#FF6B6B", linestyle="--")
            ax.set_xlabel("Epoch")
            ax.set_ylabel("Accuracy")
            ax.set_title(f"{report.model_name} -- Accuracy")
            ax.legend()
            ax.grid(alpha=0.3)
            fig.tight_layout()
            acc_path = self.assets_dir / f"{report.model_name}_accuracy.png"
            fig.savefig(acc_path, dpi=120)
            plt.close(fig)
            saved.append(acc_path)

        return saved

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _render_summary_table(self, report: TrainingReport) -> None:
        table = Table(title="Training Summary", border_style="blue")
        table.add_column("Metric", style="dim")
        table.add_column("Value", style="bold")

        table.add_row("Model", report.model_name)
        table.add_row("Epochs Run", str(report.epochs_run))
        table.add_row("Best Val Loss", f"{report.best_val_loss:.4f}")
        if report.best_val_acc is not None:
            table.add_row("Best Val Accuracy", f"{report.best_val_acc:.4f}")

        self.console.print(table)

    def _render_history_table(self, report: TrainingReport, max_rows: int = 10) -> None:
        if not report.history:
            return

        history = report.history
        n_epochs = len(next(iter(history.values())))
        table = Table(title="Epoch History (last rows)", border_style="dim")
        table.add_column("Epoch", style="dim", justify="right")
        for key in history:
            table.add_column(key, justify="right")

        start = max(0, n_epochs - max_rows)
        for i in range(start, n_epochs):
            row = [str(i + 1)] + [f"{history[k][i]:.4f}" for k in history]
            table.add_row(*row)

        self.console.print(table)
