"""
scripts/predict.py
==================
Standalone prediction script.

Usage:
    python scripts/predict.py --input data/sample.csv
"""

import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import Config
from main import run_predict


def main():
    parser = argparse.ArgumentParser(description="Neura -- Prediction Script")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--input", type=str, default=None)
    args = parser.parse_args()

    config = Config(args.config)
    run_predict(config, args.input)


if __name__ == "__main__":
    main()
