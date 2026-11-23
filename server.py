"""
server.py
=========
Neura AI Application Server Entrypoint.
Refactored to modern Laravel v13 Clean Architecture using bootstrap.app:create_app().
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from bootstrap.app import create_app

# Application Instance
app = create_app()

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("🧠 NEURA AI — CLINICAL ALZHEIMER'S INTELLIGENCE PLATFORM")
    print("   Architecture: Laravel v13 Clean Modern Architecture")
    print("   Server URL:   http://localhost:5000")
    print("=" * 65 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
