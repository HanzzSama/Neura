"""
api/shared/notification_service.py
==================================
Notification Hub & Real-time Event Broadcaster untuk Neura AI.
Mendukung:
1. Server-Sent Events (SSE) stream (/api/notifications/stream)
2. Broadcast notification per role (admin, nakes, user, all)
3. Audit log & persistence histori notifikasi (data/notifications.json)
"""

import os
import json
import time
import queue
import threading
from datetime import datetime
from pathlib import Path
from flask import Blueprint, Response, request, jsonify, session
from app.Services.Logger.LoggerService import get_logger
from config.app import STORAGE_DIR

logger = get_logger(__name__)

notification_bp = Blueprint("notification_bp", __name__)

NOTIFICATIONS_FILE = str(STORAGE_DIR / "app" / "notifications.json")
Path(NOTIFICATIONS_FILE).parent.mkdir(parents=True, exist_ok=True)

# In-Memory Subscribers: dict role -> set of Queues
_subscribers_lock = threading.Lock()
_subscribers = {
    "admin": set(),
    "nakes": set(),
    "user": set(),
    "all": set()
}

def _load_notifications():
    if not os.path.exists(NOTIFICATIONS_FILE):
        return []
    try:
        with open(NOTIFICATIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"[Notification Hub] Gagal membaca {NOTIFICATIONS_FILE}: {e}")
        return []

def _save_notifications(items):
    try:
        # Batasi histori maksimal 100 notifikasi terbaru
        items = items[-100:]
        with open(NOTIFICATIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[Notification Hub] Gagal menyimpan notifikasi: {e}")

def broadcast_notification(target_role="all", title="", body="", category="general", urgency="normal", action_url="", meta=None):
    """
    Kirim notifikasi ke queue subscriber yang aktif dan simpan ke histori.
    """
    notif_id = f"notif_{int(time.time() * 1000)}"
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    payload = {
        "id": notif_id,
        "target_role": target_role,
        "title": title,
        "body": body,
        "category": category,      # auth, report, consultation, system
        "urgency": urgency,        # low, normal, high
        "action_url": action_url,
        "meta": meta or {},
        "created_at": timestamp_str,
        "read": False
    }

    # 1. Simpan ke histori
    try:
        items = _load_notifications()
        items.append(payload)
        _save_notifications(items)
    except Exception as e:
        logger.error(f"[Notification Hub] Error saving notification: {e}")

    # 2. Push ke active SSE subscriber queues
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

        # Cleanup dead queues
        for dead_q in dead_queues:
            for role_set in _subscribers.values():
                role_set.discard(dead_q)

    logger.info(f"[Notification Hub] Broadcasted '{title}' to target '{target_role}'. Active listeners: {len(targets)}")
    return payload


@notification_bp.route("/api/notifications/stream")
def notification_stream():
    """
    SSE (Server-Sent Events) endpoint.
    Client mendengarkan event real-time secara efisien tanpa polling.
    """
    role = request.args.get("role", "all").lower()
    if role not in _subscribers:
        role = "all"

    client_queue = queue.Queue(maxsize=30)
    with _subscribers_lock:
        _subscribers[role].add(client_queue)

    def event_stream():
        # Kirim sinyal inisialisasi koneksi sukses
        init_payload = {
            "type": "INIT",
            "message": "Connected to Neura Device Notification Stream",
            "role": role,
            "server_time": datetime.now().isoformat()
        }
        yield f"data: {json.dumps(init_payload)}\n\n"

        try:
            while True:
                try:
                    # Heartbeat / message wait 20s
                    message = client_queue.get(timeout=20.0)
                    yield message
                except queue.Empty:
                    # Kirim SSE keep-alive ping agar koneksi tidak diputus proxy/browser
                    yield ": ping\n\n"
        except GeneratorExit:
            pass
        finally:
            with _subscribers_lock:
                _subscribers[role].discard(client_queue)

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )


@notification_bp.route("/api/notifications/list", methods=["GET"])
def get_notification_list():
    """
    Mengambil riwayat notifikasi terbaru sesuai role.
    """
    role = request.args.get("role", "all").lower()
    limit = int(request.args.get("limit", 20))
    items = _load_notifications()

    if role != "all":
        items = [item for item in items if item.get("target_role") in (role, "all")]

    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(success=True, notifications=items[:limit])


@notification_bp.route("/api/notifications/test-broadcast", methods=["POST"])
def test_broadcast():
    """
    Endpoint pengujian broadcast notifikasi native device.
    """
    data = request.get_json(silent=True) or {}
    title = data.get("title", "🔔 Uji Notifikasi Perangkat")
    body = data.get("body", "Ini adalah pesan notifikasi uji coba Neura AI.")
    role = data.get("role", "all")
    urgency = data.get("urgency", "normal")

    payload = broadcast_notification(
        target_role=role,
        title=title,
        body=body,
        category="system",
        urgency=urgency
    )
    return jsonify(success=True, message="Notifikasi berhasil disiarkan", data=payload)

