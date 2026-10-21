"""
main.py
=======
Neura -- TensorFlow MVC Machine Learning Project
Entry point for training, evaluation, and prediction.

Usage:
    python main.py --mode train   --config configs/development.yaml
    python main.py --mode eval    --checkpoint public/checkpoints/NeuralNetwork
    python main.py --mode predict --input data/sample.csv
"""

import argparse
import sys

from core.config import Config
from core.logger import get_logger, setup_file_logging

logger = get_logger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="neura",
        description="🧠 Neura -- TensorFlow MVC ML Project",
    )
    parser.add_argument(
        "--mode",
        choices=["train", "eval", "predict"],
        default="train",
        help="Execution mode",
    )
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to YAML config file (default: auto-detect from NEURA_ENV)",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=None,
        help="Path to model checkpoint (for eval/predict modes)",
    )
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Path to input data file (for predict mode)",
    )
    return parser.parse_args()


def run_train(config: Config) -> None:
    """Run the training pipeline using synthetic demo data."""
    import numpy as np
    from sklearn.datasets import make_classification
    from sklearn.model_selection import train_test_split

    from app.models.neural_network import NeuralNetwork
    from app.controllers.training_controller import TrainingController

    logger.info("[bold cyan]Mode: TRAIN[/bold cyan]")

    # Generate demo data (replace with DataLoader for real datasets)
    n_features = config.get("model.input_shape", [128])[0]
    n_classes = config.get("model.output_units", 10)

    X, y = make_classification(
        n_samples=2000,
        n_features=n_features,
        n_classes=n_classes,
        n_informative=min(n_features, 15),
        random_state=42,
    )
    y_onehot = np.eye(n_classes)[y].astype(np.float32)
    X = X.astype(np.float32)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y_onehot, test_size=0.2, random_state=42
    )

    # Build MVC pipeline
    model = NeuralNetwork(config).initialize()
    controller = TrainingController(config, model)
    report = controller.run(X_train, y_train, X_val, y_val)

    logger.info(f"Training complete! Best val_loss: {report.best_val_loss:.4f}")


def run_eval(config: Config, checkpoint: str | None) -> None:
    """Run model evaluation."""
    import numpy as np
    from sklearn.datasets import make_classification

    from app.models.neural_network import NeuralNetwork
    from app.controllers.evaluation_controller import EvaluationController

    logger.info("[bold yellow]Mode: EVALUATE[/bold yellow]")

    if not checkpoint:
        checkpoint = f"{config.get('paths.checkpoints', 'public/checkpoints')}/NeuralNetwork"
        logger.info(f"No checkpoint specified, using default: {checkpoint}")

    n_features = config.get("model.input_shape", [128])[0]
    n_classes = config.get("model.output_units", 10)

    X, y = make_classification(
        n_samples=500, n_features=n_features, n_classes=n_classes,
        n_informative=min(n_features, 15), random_state=99
    )
    y_onehot = np.eye(n_classes)[y].astype(np.float32)
    X = X.astype(np.float32)

    model = NeuralNetwork(config)
    model.load(checkpoint)

    controller = EvaluationController(config, model)
    metrics = controller.run(X, y_onehot)

    for name, value in metrics.items():
        logger.info(f"  {name}: {value:.4f}")


def run_predict(config: Config, input_path: str | None) -> None:
    """Run inference."""
    import numpy as np

    from app.models.neural_network import NeuralNetwork
    from app.controllers.prediction_controller import PredictionController

    logger.info("[bold green]Mode: PREDICT[/bold green]")

    n_features = config.get("model.input_shape", [128])[0]
    n_classes = config.get("model.output_units", 10)

    # Demo: random input
    sample = np.random.randn(n_features).astype(np.float32)

    checkpoint = f"{config.get('paths.checkpoints', 'public/checkpoints')}/NeuralNetwork"
    model = NeuralNetwork(config)
    model.load(checkpoint)

    class_names = [f"Class_{i}" for i in range(n_classes)]
    controller = PredictionController(config, model, class_names=class_names)
    result = controller.predict(sample)
    logger.info(f"Predicted: {result.predicted_label} ({result.confidence:.2%})")


def main() -> None:
    args = parse_args()

    # Load config
    config = Config(args.config)

    # Setup file logging
    log_file = config.get("logging.log_file", "public/logs/neura.log")
    log_level = config.get("logging.level", "INFO")
    if config.get("logging.log_to_file", True):
        setup_file_logging(log_file, level=log_level)

    logger.info(f"[bold]Neura[/bold] starting -- env=[cyan]{config.get('project.environment')}[/cyan]")

    # Dispatch
    mode = args.mode
    if mode == "train":
        run_train(config)
    elif mode == "eval":
        run_eval(config, args.checkpoint)
    elif mode == "predict":
        run_predict(config, args.input)
    else:
        logger.error(f"Unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()
