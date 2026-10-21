"""
scripts/train.py
================
Standalone training script.

Usage:
    python scripts/train.py
    python scripts/train.py --config configs/production.yaml
"""

import sys
import argparse
from pathlib import Path

# Make project root importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import Config
from core.logger import get_logger
from main import run_train

logger = get_logger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Neura -- Training Script")
    parser.add_argument("--config", type=str, default=None)
    args = parser.parse_args()

    config = Config(args.config)
    run_train(config)


if __name__ == "__main__":
    main()
