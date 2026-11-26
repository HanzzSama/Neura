#!/usr/bin/env python3
"""
nterli.py
=========
Neura AI CLI Management Tool (Nterli CLI Engine).
Usage:
  python nterli.py serve [--host 0.0.0.0] [--port 5000] [--debug]
  python nterli.py migrate
  python nterli.py db:seed
  python nterli.py train:xgboost
  python nterli.py status
"""

import os
import sys
import argparse
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
VENV_PY_WIN = PROJECT_ROOT / "venv" / "Scripts" / "python.exe"
VENV_PY_NIX = PROJECT_ROOT / "venv" / "bin" / "python"
VENV_PY = VENV_PY_WIN if VENV_PY_WIN.exists() else VENV_PY_NIX

# Add project root to sys.path
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def cmd_serve(args):
    from bootstrap.app import create_app
    app = create_app()
    print("=" * 65)
    print("🧠 NEURA AI — CLINICAL ALZHEIMER'S INTELLIGENCE PLATFORM")
    print("   CLI Engine:   Nterli CLI (Neura Clean Architecture)")
    print(f"   Environment:  http://{args.host}:{args.port}")
    print("=" * 65)
    try:
        app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
    except KeyboardInterrupt:
        pass
    print("\n" + "=" * 65)
    print("🛑 Server Neura AI telah dihentikan secara aman.")
    print("   Terima kasih telah menggunakan Neura AI Platform.")
    print("=" * 65 + "\n")


def cmd_migrate(args):
    print("\n[Nterli] Running Database Migrations...")
    from app.Services.Database.DatabaseManager import init_database
    success, msg = init_database()
    if success:
        print(f"✅ Success: {msg}\n")
    else:
        print(f"❌ Failed: {msg}\n")
        sys.exit(1)


def cmd_seed(args):
    print("\n[Nterli] Seeding Database...")
    try:
        from database.seeders.DatabaseSeeder import run_seeder
        run_seeder()
    except ImportError:
        # Fallback to direct script import
        import runpy
        runpy.run_path(str(PROJECT_ROOT / "database" / "seeders" / "DatabaseSeeder.py"))
    print("✅ Database seeding complete.\n")


def cmd_train_xgboost(args):
    print("\n[Nterli] Starting XGBoost Training Pipeline (modelML.rmp spec)...")
    from app.Services.ML.XGBoostTrainerService import XGBoostTrainerService
    metrics = XGBoostTrainerService.train()
    print("\n✅ Training Complete!")
    print(f"   Accuracy: {metrics.get('test_accuracy', 0)*100:.2f}%")
    print(f"   10-Fold CV AUC: {metrics.get('ten_fold_cv_auc', 0)*100:.2f}%\n")


def cmd_status(args):
    print("\n" + "=" * 60)
    print("📊 NEURA SYSTEM STATUS CHECK (NTERLI)")
    print("=" * 60)
    # Check MySQL
    from app.Services.Database.DatabaseManager import test_connection
    connected, msg = test_connection()
    status_icon = "🟢" if connected else "🔴"
    print(f"Database MySQL (Laragon): {status_icon} {msg}")

    # Check ML Model
    from config.ml import CHECKPOINTS_DIR
    model_file = CHECKPOINTS_DIR / "xgboost_alzheimers.json"
    ml_icon = "🟢" if model_file.exists() else "🔴"
    print(f"XGBoost Model Checkpoint:  {ml_icon} {model_file.resolve()}")

    # Check LLM Models
    from app.Services.LLM.GGUFBridgeService import scan_available_models
    llm_models = scan_available_models()
    llm_icon = "🟢" if llm_models else "🟡"
    print(f"GGUF LLM Models ({len(llm_models)} found):  {llm_icon}")
    for m in llm_models:
        print(f"   • {m['filename']} ({m['size_mb']} MB)")

    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Neura AI Nterli CLI")
    subparsers = parser.add_subparsers(dest="command", help="Nterli command")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Run the Neura Web Server")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    serve_parser.add_argument("--port", type=int, default=5000, help="Bind port (default: 5000)")
    serve_parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    # migrate
    subparsers.add_parser("migrate", help="Run database schema migrations")

    # db:seed & seed alias
    subparsers.add_parser("db:seed", help="Seed database with initial records")
    subparsers.add_parser("seed", help="Alias for db:seed")

    # train:xgboost & train alias
    subparsers.add_parser("train:xgboost", help="Train XGBoost model matching modelML.rmp")
    subparsers.add_parser("train", help="Alias for train:xgboost")

    # test
    subparsers.add_parser("test", help="Run automated test suite (Unit & Feature)")

    # status
    subparsers.add_parser("status", help="Display system and database status")

    args = parser.parse_args()

    if args.command == "serve":
        cmd_serve(args)
    elif args.command == "migrate":
        cmd_migrate(args)
    elif args.command in ("db:seed", "seed"):
        cmd_seed(args)
    elif args.command in ("train:xgboost", "train"):
        cmd_train_xgboost(args)
    elif args.command == "test":
        import unittest
        loader = unittest.TestLoader()
        suite = loader.discover(
            start_dir=str(PROJECT_ROOT / "tests"),
            pattern="*Test.py",
            top_level_dir=str(PROJECT_ROOT)
        )
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        sys.exit(0 if result.wasSuccessful() else 1)
    elif args.command == "status":
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    # Auto-activate / re-spawn into local virtualenv if invoked from global python
    if VENV_PY.exists() and Path(sys.executable).resolve() != VENV_PY.resolve():
        try:
            sys.exit(subprocess.call([str(VENV_PY), str(PROJECT_ROOT / "nterli.py")] + sys.argv[1:]))
        except KeyboardInterrupt:
            sys.exit(0)
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
