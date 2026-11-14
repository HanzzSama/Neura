"""
scaffold_routes.py
==================
Blueprint untuk fitur Live System Environment pada General Canvas Neura AI.
Mendukung:
1. Otomasi scaffolding halaman baru (HTML, CSS, JS).
2. Pendaftaran dan penghapusan route dinamis.
3. Toggle status aktif / nonaktif (Maintenance mode).
"""

import os
import re
import json
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, render_template_string, send_from_directory
from core.logger import get_logger

logger = get_logger(__name__)

scaffold_bp = Blueprint("scaffold", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
CSS_DIR = os.path.join(PUBLIC_DIR, "css")
JS_DIR = os.path.join(PUBLIC_DIR, "js")
REGISTRY_FILE = os.path.join(BASE_DIR, "configs", "scaffold_registry.json")

# Halaman sistem terlindungi yang tidak boleh dihapus filenya
PROTECTED_SLUGS = {
    "welcome", "index", "nakes", "admin", "riset", "struktur", 
    "verify-email", "chat", "app", "maintenance"
}

# -------------------------------------------------------------------------
# Template Generator
# -------------------------------------------------------------------------

TEMPLATE_HTML_BLANK = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_NAME}} — Neura AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/{{SLUG}}.css">
</head>
<body>
  <div class="page-container">
    <header class="page-header">
      <div class="badge">{{TYPE_UPPER}}</div>
      <h1>{{PAGE_NAME}}</h1>
      <p class="description">{{DESCRIPTION}}</p>
    </header>

    <main class="page-content">
      <div class="card">
        <h3>Selamat Datang di {{PAGE_NAME}}</h3>
        <p>Halaman ini berhasil dibuat secara otomatis melalui <strong>General Canvas Live Environment</strong>.</p>
        <div class="meta-tag">Endpoint: /{{SLUG}}</div>
      </div>
    </main>
  </div>
  <script src="/js/{{SLUG}}.js"></script>
</body>
</html>
"""

TEMPLATE_HTML_AUTH = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_NAME}} — Neura AI (Auth Required)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/{{SLUG}}.css">
</head>
<body>
  <div id="auth-check-spinner" class="spinner-container">
    <div class="spinner"></div>
    <p>Memverifikasi sesi pengguna...</p>
  </div>

  <div id="app-view" class="page-container" style="display: none;">
    <header class="page-header">
      <div class="badge auth-badge">🔐 TERPROTEKSI</div>
      <h1>{{PAGE_NAME}}</h1>
      <p class="description">{{DESCRIPTION}}</p>
    </header>

    <main class="page-content">
      <div class="card">
        <h3>Halo, <span id="user-display-name">Pengguna</span></h3>
        <p>Akses diizinkan untuk peranan: <strong>{{ROLES_STR}}</strong>.</p>
        <button id="btn-logout" class="btn-secondary">Keluar / Ganti Akun</button>
      </div>
    </main>
  </div>

  <script src="/js/{{SLUG}}.js"></script>
</body>
</html>
"""

TEMPLATE_HTML_DASHBOARD = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_NAME}} — Neura Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/{{SLUG}}.css">
</head>
<body class="dashboard-body">
  <div class="dashboard-layout">
    <!-- Topbar -->
    <header class="dash-topbar">
      <div class="brand">
        <span class="logo-dot"></span>
        <h2>Neura <span>// {{PAGE_NAME}}</span></h2>
      </div>
      <div class="topbar-actions">
        <a href="/struktur" class="pill-action">⚙️ Canvas View</a>
        <div class="user-pill">Admin / Nakes</div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="dash-main">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">STATUS RUNTIME</div>
          <div class="stat-val text-green">ONLINE</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">TOTAL DATA</div>
          <div class="stat-val" id="stat-count">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">TIPE MODUL</div>
          <div class="stat-val text-cyan">{{TYPE_UPPER}}</div>
        </div>
      </div>

      <div class="dash-card">
        <h3>Panel Kerja {{PAGE_NAME}}</h3>
        <p class="muted">{{DESCRIPTION}}</p>
        <div class="action-bar">
          <button class="btn-primary" id="btn-action-refresh">Muat Ulang Data</button>
        </div>
        <div id="data-container" class="data-preview">
          <p>Memuat data antarmuka...</p>
        </div>
      </div>
    </main>
  </div>
  <script src="/js/{{SLUG}}.js"></script>
</body>
</html>
"""

TEMPLATE_HTML_API_CONSUMER = """<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_NAME}} — API Consumer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/{{SLUG}}.css">
</head>
<body>
  <div class="page-container">
    <header class="page-header">
      <div class="badge api-badge">⚡ API CLIENT</div>
      <h1>{{PAGE_NAME}}</h1>
      <p class="description">{{DESCRIPTION}}</p>
    </header>

    <main class="page-content">
      <div class="card">
        <div class="card-header-row">
          <h3>Hasil Pemanggilan API Neura</h3>
          <span id="api-status-badge" class="status-tag">Menghubungi...</span>
        </div>
        <pre id="json-viewer" class="json-box"><code>// Menunggu data dari server...</code></pre>
        <div class="actions">
          <button id="btn-fetch-status" class="btn-primary">Panggil /api/status</button>
        </div>
      </div>
    </main>
  </div>
  <script src="/js/{{SLUG}}.js"></script>
</body>
</html>
"""

TEMPLATE_CSS = """:root {
  --bg-dark: #0b0f19;
  --card-dark: #121827;
  --border-color: rgba(255, 255, 255, 0.08);
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --accent-cyan: #06b6d4;
  --accent-blue: #3b82f6;
  --accent-green: #10b981;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: 'Plus Jakarta Sans', sans-serif;
  min-height: 100vh;
  padding: 2rem;
}

.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 9999px;
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
  border: 1px solid rgba(6, 182, 212, 0.3);
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.description {
  color: var(--text-muted);
  font-size: 1rem;
}

.card {
  background: var(--card-dark);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.card h3 {
  margin-bottom: 1rem;
}

.meta-tag {
  margin-top: 1.5rem;
  display: inline-block;
  font-family: monospace;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 6px 12px;
  border-radius: 8px;
  color: var(--accent-cyan);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

/* Dashboard Specific Styles */
.dashboard-body {
  padding: 0;
}

.dash-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #0f172a;
  border-bottom: 1px solid var(--border-color);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand .logo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent-cyan);
}

.dash-main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: var(--card-dark);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-val {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.5rem;
}

.text-green { color: var(--accent-green); }
.text-cyan { color: var(--accent-cyan); }

.json-box {
  background: #050811;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 1.25rem;
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}
"""

TEMPLATE_JS = """// Auto-generated script for {{PAGE_NAME}} (/{{SLUG}})
// Dibuat otomatis melalui General Canvas Live Environment

(function() {
  'use strict';

  console.log('[{{PAGE_NAME}}] Module initialized successfully.');

  document.addEventListener('DOMContentLoaded', () => {
    // Auth Check jika template membutuhkan
    const authSpinner = document.getElementById('auth-check-spinner');
    const appView = document.getElementById('app-view');
    if (authSpinner && appView) {
      setTimeout(() => {
        authSpinner.style.display = 'none';
        appView.style.display = 'block';
      }, 500);
    }

    // Handler untuk tombol refresh dashboard
    const btnRefresh = document.getElementById('btn-action-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        const countEl = document.getElementById('stat-count');
        if (countEl) {
          countEl.textContent = Math.floor(Math.random() * 50) + 1;
        }
      });
    }

    // Handler untuk template API Consumer
    const btnFetch = document.getElementById('btn-fetch-status');
    const jsonViewer = document.getElementById('json-viewer');
    const statusBadge = document.getElementById('api-status-badge');

    if (btnFetch && jsonViewer) {
      btnFetch.addEventListener('click', async () => {
        try {
          if (statusBadge) statusBadge.textContent = 'Memuat...';
          const res = await fetch('/api/status');
          const data = await res.json();
          jsonViewer.textContent = JSON.stringify(data, null, 2);
          if (statusBadge) {
            statusBadge.textContent = '200 OK';
            statusBadge.style.color = '#10b981';
          }
        } catch (err) {
          jsonViewer.textContent = 'Error: ' + err.message;
          if (statusBadge) {
            statusBadge.textContent = 'Gagal';
            statusBadge.style.color = '#ef4444';
          }
        }
      });
    }
  });
})();
"""

# -------------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------------

def load_registry():
    if not os.path.exists(REGISTRY_FILE):
        return {"version": "1.1", "pages": [], "system_overrides": {}}
    try:
        with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Gagal membaca scaffold registry: {e}")
        return {"version": "1.1", "pages": [], "system_overrides": {}}


def save_registry(data):
    os.makedirs(os.path.dirname(REGISTRY_FILE), exist_ok=True)
    with open(REGISTRY_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def is_valid_slug(slug):
    return bool(re.match(r"^[a-z0-9][a-z0-9\-]{0,50}$", slug))


def determine_connections(node_type):
    mapping = {
        "page": ["gate-auth-check"],
        "auth": ["gate-email-verify"],
        "dashboard": ["gate-role-check"],
        "engine": ["node-llm"],
        "storage": ["store-firestore-users"],
        "gate": ["gate-auth-check"],
        "report": ["proc-report-generator"]
    }
    return mapping.get(node_type, ["gate-auth-check"])


# -------------------------------------------------------------------------
# API Endpoints
# -------------------------------------------------------------------------

@scaffold_bp.route("/api/scaffold/pages", methods=["GET"], strict_slashes=False)
def list_scaffold_pages():
    """Mengembalikan daftar semua custom scaffolded pages dan system status overrides."""
    registry = load_registry()
    return jsonify(
        success=True,
        pages=registry.get("pages", []),
        system_overrides=registry.get("system_overrides", {})
    )


@scaffold_bp.route("/api/scaffold/page", methods=["POST"], strict_slashes=False)
def create_page():
    """Scaffold halaman baru: buat HTML, CSS, JS, dan daftarkan ke registry."""
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    slug = (data.get("slug") or "").strip().lower()
    desc = (data.get("description") or "").strip() or f"Halaman modul {name}"
    ntype = (data.get("type") or "page").lower()
    roles = data.get("role") or ["user"]
    if isinstance(roles, str):
        roles = [roles]
    template_type = data.get("template") or "blank"

    # Validasi
    if not name or not slug:
        return jsonify(success=False, error="MISSING_FIELDS", message="Nama dan slug wajib diisi."), 400

    if not is_valid_slug(slug):
        return jsonify(success=False, error="INVALID_SLUG", message="Slug hanya boleh huruf kecil, angka, dan tanda hubung (-)."), 400

    if slug in PROTECTED_SLUGS:
        return jsonify(success=False, error="PROTECTED_SLUG", message=f"Slug '{slug}' adalah halaman bawaan sistem yang terlindungi."), 409

    registry = load_registry()
    existing_slugs = {p.get("slug") for p in registry.get("pages", [])}
    if slug in existing_slugs:
        return jsonify(success=False, error="SLUG_EXISTS", message=f"Slug '{slug}' sudah digunakan."), 409

    # Tentukan template HTML
    template_map = {
        "blank": TEMPLATE_HTML_BLANK,
        "auth-required": TEMPLATE_HTML_AUTH,
        "dashboard": TEMPLATE_HTML_DASHBOARD,
        "api-consumer": TEMPLATE_HTML_API_CONSUMER
    }
    html_raw = template_map.get(template_type, TEMPLATE_HTML_BLANK)

    # Replace placeholders
    replacements = {
        "{{PAGE_NAME}}": name,
        "{{SLUG}}": slug,
        "{{TYPE_UPPER}}": ntype.upper(),
        "{{DESCRIPTION}}": desc,
        "{{ROLES_STR}}": ", ".join(roles)
    }

    html_content = html_raw
    css_content = TEMPLATE_CSS
    js_content = TEMPLATE_JS

    for k, v in replacements.items():
        html_content = html_content.replace(k, v)
        css_content = css_content.replace(k, v)
        js_content = js_content.replace(k, v)

    # Buat file fisik
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    os.makedirs(CSS_DIR, exist_ok=True)
    os.makedirs(JS_DIR, exist_ok=True)

    html_file = os.path.join(PUBLIC_DIR, f"{slug}.html")
    css_file = os.path.join(CSS_DIR, f"{slug}.css")
    js_file = os.path.join(JS_DIR, f"{slug}.js")

    try:
        with open(html_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        with open(css_file, "w", encoding="utf-8") as f:
            f.write(css_content)
        with open(js_file, "w", encoding="utf-8") as f:
            f.write(js_content)
    except Exception as e:
        logger.error(f"Gagal menulis file scaffold: {e}")
        return jsonify(success=False, error="FS_ERROR", message=f"Gagal membuat berkas di disk: {str(e)}"), 500

    # Daftarkan ke registry
    node_id = f"page-{slug}"
    node_def = {
        "id": node_id,
        "label": name,
        "slug": slug,
        "description": desc,
        "type": ntype,
        "role": roles,
        "template": template_type,
        "enabled": True,
        "url": f"/{slug}",
        "files": {
            "html": f"public/{slug}.html",
            "css": f"public/css/{slug}.css",
            "js": f"public/js/{slug}.js"
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_custom": True
    }

    pages_list = registry.setdefault("pages", [])
    pages_list.append(node_def)
    save_registry(registry)

    logger.info(f"Scaffold berhasil dibuat: {slug} ({name})")

    return jsonify(
        success=True,
        node=node_def,
        connections=determine_connections(ntype),
        message=f"Halaman {name} berhasil dibuat!"
    ), 201


@scaffold_bp.route("/api/scaffold/page/<slug>/status", methods=["PATCH"], strict_slashes=False)
def toggle_page_status(slug):
    """Aktifkan atau nonaktifkan halaman (Maintenance toggle)."""
    slug = (slug or "").strip().lower()
    data = request.get_json(silent=True) or {}
    new_status = data.get("enabled")
    reason = (data.get("reason") or "Pemeliharaan modul").strip()

    if new_status is None:
        return jsonify(success=False, error="MISSING_ENABLED", message="Field 'enabled' (boolean) wajib disertakan."), 400

    registry = load_registry()
    found = False

    # 1. Cek di custom pages
    for page in registry.get("pages", []):
        if page.get("slug") == slug:
            page["enabled"] = bool(new_status)
            page["disabled_reason"] = reason if not new_status else None
            page["status_updated_at"] = datetime.now(timezone.utc).isoformat()
            found = True
            break

    # 2. Jika merupakan halaman sistem bawaan, simpan ke system_overrides
    if not found:
        system_overrides = registry.setdefault("system_overrides", {})
        system_overrides[slug] = {
            "enabled": bool(new_status),
            "reason": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

    save_registry(registry)
    logger.info(f"Status halaman {slug} diubah: enabled={new_status}")

    return jsonify(
        success=True,
        slug=slug,
        enabled=bool(new_status),
        message=f"Status halaman '{slug}' berhasil diubah menjadi {'AKTIF' if new_status else 'NONAKTIF'}."
    )


@scaffold_bp.route("/api/scaffold/page/<slug>", methods=["DELETE"], strict_slashes=False)
def delete_page(slug):
    """Hapus halaman scaffold beserta berkas HTML, CSS, dan JS fisiknya."""
    slug = (slug or "").strip().lower()

    if slug in PROTECTED_SLUGS:
        return jsonify(success=False, error="PROTECTED_SLUG", message="Halaman bawaan sistem tidak boleh dihapus."), 403

    registry = load_registry()
    pages_list = registry.get("pages", [])
    target = None

    for page in pages_list:
        if page.get("slug") == slug:
            target = page
            break

    if not target:
        return jsonify(success=False, error="NOT_FOUND", message=f"Halaman '{slug}' tidak ditemukan di registry."), 404

    import gc, time
    gc.collect()

    # Hapus file fisik dengan retry & gc release untuk file lock Windows
    for file_key in ["html", "css", "js"]:
        rel_path = target.get("files", {}).get(file_key)
        if rel_path:
            abs_path = os.path.join(BASE_DIR, rel_path.replace("/", os.sep))
            for attempt in range(3):
                try:
                    if os.path.exists(abs_path):
                        os.remove(abs_path)
                    break
                except Exception as e:
                    gc.collect()
                    time.sleep(0.15)
                    if attempt == 2:
                        logger.warning(f"Gagal menghapus berkas {abs_path}: {e}")

    # Hapus dari registry
    registry["pages"] = [p for p in pages_list if p.get("slug") != slug]
    save_registry(registry)

    logger.info(f"Halaman {slug} berhasil dihapus.")
    return jsonify(success=True, slug=slug, message=f"Halaman '{slug}' berhasil dihapus.")
