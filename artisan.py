#!/usr/bin/env python3
"""
artisan.py
==========
Neura AI CLI Management Tool (Laravel Artisan inspired).
Usage:
  python artisan.py serve [--host 0.0.0.0] [--port 5000] [--debug]
  python artisan.py migrate
  python artisan.py db:seed
  python artisan.py train:xgboost
  python artisan.py status
"""

import sys
import argparse
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def cmd_serve(args):
    from bootstrap.app import create_app
    app = create_app()
    print("=" * 65)
    print("🧠 NEURA AI — CLINICAL ALZHEIMER'S INTELLIGENCE PLATFORM")
    print("   Architecture: Laravel v13 Clean Modern Architecture")
    print(f"   Environment:  http://{args.host}:{args.port}")
    print("=" * 65)
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)


def cmd_migrate(args):
    print("\n[Artisan] Running Database Migrations...")
    from app.Services.Database.DatabaseManager import init_database
    success, msg = init_database()
    if success:
        print(f"✅ Success: {msg}\n")
    else:
        print(f"❌ Failed: {msg}\n")
        sys.exit(1)


def cmd_seed(args):
    print("\n[Artisan] Seeding Database...")
    try:
        from database.seeders.DatabaseSeeder import run_seeder
        run_seeder()
    except ImportError:
        # Fallback to direct script import
        import runpy
        runpy.run_path(str(PROJECT_ROOT / "database" / "seeders" / "DatabaseSeeder.py"))
    print("✅ Database seeding complete.\n")


def cmd_train_xgboost(args):
    print("\n[Artisan] Starting XGBoost Training Pipeline (modelML.rmp spec)...")
    from app.Services.ML.XGBoostTrainerService import XGBoostTrainerService
    metrics = XGBoostTrainerService.train()
    print("\n✅ Training Complete!")
    print(f"   Accuracy: {metrics.get('test_accuracy', 0)*100:.2f}%")
    print(f"   10-Fold CV AUC: {metrics.get('ten_fold_cv_auc', 0)*100:.2f}%\n")


def cmd_status(args):
    print("\n" + "=" * 60)
    print("📊 NEURA SYSTEM STATUS CHECK")
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
    parser = argparse.ArgumentParser(description="Neura AI Artisan CLI")
    subparsers = parser.add_subparsers(dest="command", help="Artisan command")

    # serve
    serve_parser = subparsers.add_parser("serve", help="Run the Neura Web Server")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Bind host (default: 0.0.0.0)")
    serve_parser.add_argument("--port", type=int, default=5000, help="Bind port (default: 5000)")
    serve_parser.add_argument("--debug", action="store_true", help="Enable debug mode")

    # migrate
    subparsers.add_parser("migrate", help="Run database schema migrations")

    # db:seed
    subparsers.add_parser("db:seed", help="Seed database with initial records")

    # train:xgboost
    subparsers.add_parser("train:xgboost", help="Train XGBoost model matching modelML.rmp")

    # status
    subparsers.add_parser("status", help="Display system and database status")

    args = parser.parse_args()

    if args.command == "serve":
        cmd_serve(args)
    elif args.command == "migrate":
        cmd_migrate(args)
    elif args.command == "db:seed":
        cmd_seed(args)
    elif args.command == "train:xgboost":
        cmd_train_xgboost(args)
    elif args.command == "status":
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
