"""
app/Services/NakesInviteService.py
====================================
Manages shareable Live QR Invite URLs (`nks-res-<code >`) and
auto-rotating 3-minute (180s) unique registration codes for Nakes.
"""

import json
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

TOKEN_STORE_FILE = Path(__file__).resolve().parent.parent.parent / "storage" / "app" / "nakes_invite_tokens.json"
INVITE_TTL_SECONDS = 180  # 3 minutes
_STORE_LOCK = Lock()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _random_live_id() -> str:
    return f"nks-res-{secrets.token_hex(4)}"


def _random_invite_code() -> str:
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"NKS-{part1}-{part2}"


def _load_store() -> dict:
    if not TOKEN_STORE_FILE.exists():
        return {}
    try:
        with open(TOKEN_STORE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_store(data: dict) -> None:
    TOKEN_STORE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(TOKEN_STORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def _ensure_initialized(store: dict) -> bool:
    changed = False
    if "live_link" not in store or not isinstance(store["live_link"], dict):
        store["live_link"] = {
            "live_id": _random_live_id(),
            "active": True,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        changed = True
    if "invite_code" not in store or not isinstance(store["invite_code"], dict):
        now_ts = time.time()
        store["invite_code"] = {
            "code": _random_invite_code(),
            "created_at": now_ts,
            "expires_at": now_ts + INVITE_TTL_SECONDS,
        }
        changed = True
    if "registrations_count" not in store:
        store["registrations_count"] = 0
        changed = True
    return changed


def get_live_link_status() -> dict:
    with _STORE_LOCK:
        store = _load_store()
        if _ensure_initialized(store):
            _save_store(store)
        return dict(store["live_link"])


def generate_new_live_link() -> dict:
    with _STORE_LOCK:
        store = _load_store()
        _ensure_initialized(store)
        now_ts = time.time()
        store["live_link"] = {
            "live_id": _random_live_id(),
            "active": True,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        # Also rotate invite code cleanly on fresh URL generation
        store["invite_code"] = {
            "code": _random_invite_code(),
            "created_at": now_ts,
            "expires_at": now_ts + INVITE_TTL_SECONDS,
        }
        _save_store(store)
        return dict(store["live_link"])


def toggle_live_link(active: bool) -> dict:
    with _STORE_LOCK:
        store = _load_store()
        _ensure_initialized(store)
        store["live_link"]["active"] = bool(active)
        store["live_link"]["updated_at"] = _now_iso()
        _save_store(store)
        return dict(store["live_link"])


def rotate_invite_code() -> dict:
    with _STORE_LOCK:
        store = _load_store()
        _ensure_initialized(store)
        now_ts = time.time()
        store["invite_code"] = {
            "code": _random_invite_code(),
            "created_at": now_ts,
            "expires_at": now_ts + INVITE_TTL_SECONDS,
        }
        _save_store(store)
        return {
            "code": store["invite_code"]["code"],
            "expires_at": store["invite_code"]["expires_at"],
            "remaining_seconds": INVITE_TTL_SECONDS,
            "ttl_seconds": INVITE_TTL_SECONDS,
        }


def get_qr_session(live_id: str) -> dict:
    live_id = (live_id or "").strip()
    with _STORE_LOCK:
        store = _load_store()
        if _ensure_initialized(store):
            _save_store(store)

        live_link = store["live_link"]
        if not live_id or live_id != live_link.get("live_id"):
            return {
                "valid": False,
                "active": False,
                "reason": "INVALID_LINK",
                "message": "Tautan QR undangan tidak valid atau telah diganti oleh Admin.",
            }

        if not live_link.get("active", False):
            return {
                "valid": False,
                "active": False,
                "reason": "LINK_DISABLED",
                "message": "Tautan QR registrasi Nakes sedang dinonaktifkan oleh Admin.",
            }

        now_ts = time.time()
        inv = store["invite_code"]
        if now_ts >= float(inv.get("expires_at", 0)):
            inv = {
                "code": _random_invite_code(),
                "created_at": now_ts,
                "expires_at": now_ts + INVITE_TTL_SECONDS,
            }
            store["invite_code"] = inv
            _save_store(store)

        remaining = max(0, int(round(float(inv["expires_at"]) - now_ts)))
        return {
            "valid": True,
            "active": True,
            "live_id": live_link["live_id"],
            "code": inv["code"],
            "expires_at": inv["expires_at"],
            "remaining_seconds": remaining,
            "ttl_seconds": INVITE_TTL_SECONDS,
            "registrations_count": int(store.get("registrations_count", 0)),
        }


def verify_invite_code(code: str) -> dict:
    clean_code = (code or "").strip().upper()
    with _STORE_LOCK:
        store = _load_store()
        if _ensure_initialized(store):
            _save_store(store)

        live_link = store["live_link"]
        if not live_link.get("active", False):
            return {
                "valid": False,
                "reason": "LINK_DISABLED",
                "message": "Sesi registrasi Nakes sedang dinonaktifkan oleh Admin.",
            }

        now_ts = time.time()
        inv = store["invite_code"]
        if not clean_code or clean_code != str(inv.get("code", "")).upper():
            return {
                "valid": False,
                "reason": "CODE_MISMATCH",
                "message": "Kode registrasi tidak valid atau sudah diperbarui.",
            }

        if now_ts >= float(inv.get("expires_at", 0)):
            return {
                "valid": False,
                "reason": "CODE_EXPIRED",
                "message": "Kode registrasi telah kedaluwarsa (batas 3 menit). Silakan scan ulang QR terbaru.",
            }

        remaining = max(0, int(round(float(inv["expires_at"]) - now_ts)))
        return {
            "valid": True,
            "code": inv["code"],
            "remaining_seconds": remaining,
            "ttl_seconds": INVITE_TTL_SECONDS,
        }


def increment_registration_count() -> int:
    with _STORE_LOCK:
        store = _load_store()
        _ensure_initialized(store)
        store["registrations_count"] = int(store.get("registrations_count", 0)) + 1
        _save_store(store)
        return store["registrations_count"]
