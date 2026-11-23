"""
server.py
=========
Neura AI Application Server Entrypoint.
Refactored to modern Neura Clean Architecture using bootstrap.app:create_app().
"""

import os
import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
VENV_PY_WIN = PROJECT_ROOT / "venv" / "Scripts" / "python.exe"
VENV_PY_NIX = PROJECT_ROOT / "venv" / "bin" / "python"
VENV_PY = VENV_PY_WIN if VENV_PY_WIN.exists() else VENV_PY_NIX

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

def get_app():
    from bootstrap.app import create_app
    return create_app()

if __name__ == "__main__":
    # Auto-activate / re-spawn into local virtualenv if invoked from global python
    if VENV_PY.exists() and Path(sys.executable).resolve() != VENV_PY.resolve():
        sys.exit(subprocess.call([str(VENV_PY), str(PROJECT_ROOT / "server.py")] + sys.argv[1:]))

    app = get_app()
    print("\n" + "=" * 65)
    print("🧠 NEURA AI — CLINICAL ALZHEIMER'S INTELLIGENCE PLATFORM")
    print("   Architecture: Neura Clean Modern Architecture")
    print("   Server URL:   http://localhost:5000")
    print("=" * 65 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
else:
    app = get_app()
