"""
app/controllers/evaluation_controller.py
=========================================
Handles model evaluation against a test/holdout dataset.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from rich.table import Table
from rich.console import Console

from app.controllers.base_controller import BaseController
from app.models.base_model import BaseModel
from core.config import Config


console = Console()


class EvaluationController(BaseController):
    """
    Evaluates a trained model and generates a metrics report.

    Usage:
        controller = EvaluationController(config, model)
        metrics = controller.run(X_test, y_test)
    """

    def __init__(self, config: Config, model: BaseModel) -> None:
        super().__init__(config)
        self.model = model

    def run(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray,
        save_report: bool = True,
    ) -> dict[str, float]:
        """
        Evaluate the model and return a metrics dictionary.

        Args:
            X_test:      Test features
            y_test:      Test labels
            save_report: If True, save JSON report to public/reports/

        Returns:
            Dictionary mapping metric names to float values
        """
        self.logger.info("Running evaluation...")
        keras_model = self.model.get_keras_model()

        results = keras_model.evaluate(X_test, y_test, verbose=0)
        metric_names = keras_model.metrics_names

        metrics: dict[str, float] = dict(zip(metric_names, results))

        # Render to terminal
        self._render_metrics(metrics)

        # Save report
        if save_report:
            self._save_report(metrics)

        return metrics

    def _render_metrics(self, metrics: dict[str, float]) -> None:
        table = Table(title="Evaluation Metrics", border_style="cyan")
        table.add_column("Metric", style="dim")
        table.add_column("Value", style="bold green", justify="right")

        for name, value in metrics.items():
            table.add_row(name, f"{value:.4f}")

        console.print(table)

    def _save_report(self, metrics: dict[str, float]) -> Path:
        report_dir = Path(self.config.get("paths.reports", "public/reports"))
        report_dir.mkdir(parents=True, exist_ok=True)
        report_path = report_dir / f"{self.model.name}_eval.json"

        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=2)

        self.logger.info(f"Evaluation report saved -> [cyan]{report_path}[/cyan]")
        return report_path
