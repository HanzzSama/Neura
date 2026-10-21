"""
scripts/evaluate.py
====================
Standalone evaluation script.

Usage:
    python scripts/evaluate.py --checkpoint public/checkpoints/NeuralNetwork
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import Config
from main import run_eval


def main():
    parser = argparse.ArgumentParser(description="Neura -- Evaluation Script")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--checkpoint", type=str, default=None)
    args = parser.parse_args()

    config = Config(args.config)
    run_eval(config, args.checkpoint)


if __name__ == "__main__":
    main()
