"""
app/Services/Notification/NotificationService.py
================================================
Notification Hub & SSE Broadcaster untuk Neura AI (Laravel-style).
Mendukung SSE stream, filtering peran (Admin, Nakes, User), dan persistence histori.
"""

import os
import json
import time
import queue
import threading
from datetime import datetime
from flask import Blueprint, Response, request, jsonify, session
from app.Services.Logger.LoggerService import get_logger
from config.app import STORAGE_DIR

logger = get_logger(__name__)

NOTIFICATIONS_FILE = STORAGE_DIR / "app" / "notifications.json"
os.makedirs(NOTIFICATIONS_FILE.parent, exist_ok=True)

_subscribers_lock = threading.Lock()
_subscribers = {
    "admin": set(),
    "nakes": set(),
    "user": set(),
    "all": set()
}


def _load_notifications():
    if not NOTIFICATIONS_FILE.exists():
        return []
    try:
        with open(NOTIFICATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[NotificationService] Error reading notifications: {e}")
        return []


def _save_notifications(items):
    try:
        items = items[-100:]
        with open(NOTIFICATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[NotificationService] Error saving notifications: {e}")


def broadcast_notification(target_role="all", title="", body="", category="general", urgency="normal", action_url="", meta=None):
    """Kirim notifikasi ke queue subscriber yang aktif dan simpan ke histori."""
    notif_id = f"notif_{int(time.time() * 1000)}"
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    payload = {
        "id": notif_id,
        "target_role": target_role,
        "title": title,
        "body": body,
        "category": category,
        "urgency": urgency,
        "action_url": action_url,
        "meta": meta or {},
        "created_at": timestamp_str,
        "read": False
    }

    try:
        items = _load_notifications()
        items.append(payload)
        _save_notifications(items)
    except Exception as e:
        logger.error(f"[NotificationService] Error saving notification payload: {e}")

    event_data = f"data: {json.dumps(payload)}\n\n"
    with _subscribers_lock:
        targets = set()
        if target_role == "all":
            for q_set in _subscribers.values():
                targets.update(q_set)
        else:
            targets.update(_subscribers.get(target_role, set()))
            targets.update(_subscribers.get("all", set()))

        dead_queues = set()
        for q in targets:
            try:
                q.put_nowait(event_data)
            except Exception:
                dead_queues.add(q)

        for q in dead_queues:
            for s in _subscribers.values():
                s.discard(q)

    logger.info(f"[NotificationService] Broadcast to {len(targets)} listeners: [{category.upper()}] {title}")
    return payload
