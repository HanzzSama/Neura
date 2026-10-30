"""
api/user/user_livekit.py
========================
LiveKit Voice AI Clinical Consultation:
  GET      /api/livekit/config — Cek konfigurasi dan kredensial LiveKit / Voice AI
  GET/POST /api/livekit/token  — Generate LiveKit Room Access Token untuk konsultasi suara
"""

import os
import uuid
import traceback
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

user_livekit_bp = Blueprint("user_livekit", __name__)


@user_livekit_bp.route("/config", methods=["GET"])
def api_livekit_config():
    """Check LiveKit and Voice AI configuration status."""
    lk_url = os.environ.get("LIVEKIT_URL", "").strip()
    lk_key = os.environ.get("LIVEKIT_API_KEY", "").strip()
    lk_secret = os.environ.get("LIVEKIT_API_SECRET", "").strip()
    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    deepgram_key = os.environ.get("DEEPGRAM_API_KEY", "").strip()

    missing = []
    if not lk_url or "your-project" in lk_url:
        missing.append("LIVEKIT_URL")
    if not lk_key or "your_livekit" in lk_key:
        missing.append("LIVEKIT_API_KEY")
    if not lk_secret or "your_livekit" in lk_secret:
        missing.append("LIVEKIT_API_SECRET")
    if not openai_key or "your_openai" in openai_key:
        missing.append("OPENAI_API_KEY")
    if not deepgram_key or "your_deepgram" in deepgram_key:
        missing.append("DEEPGRAM_API_KEY")

    is_configured = len(missing) == 0

    return jsonify({
        "is_configured": is_configured,
        "livekit_url": lk_url if is_configured else None,
        "missing_keys": missing,
        "instructions": (
            "Siapkan LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY, "
            "dan DEEPGRAM_API_KEY di file .env untuk mengaktifkan agen suara LiveKit."
            if not is_configured else "LiveKit Voice Agent siap digunakan."
        )
    })


@user_livekit_bp.route("/token", methods=["GET", "POST"])
def api_livekit_token():
    """Generate LiveKit Room Access Token for the clinical voice consultation."""
    lk_url = os.environ.get("LIVEKIT_URL", "").strip()
    lk_key = os.environ.get("LIVEKIT_API_KEY", "").strip()
    lk_secret = os.environ.get("LIVEKIT_API_SECRET", "").strip()

    is_configured = (
        bool(lk_url) and "your-project" not in lk_url and
        bool(lk_key) and "your_livekit" not in lk_key and
        bool(lk_secret) and "your_livekit" not in lk_secret
    )

    room_name = request.args.get("room") or f"neura-room-{str(uuid.uuid4())[:8]}"
    participant_name = request.args.get("name") or "Pasien Neura"
    identity = f"patient_{str(uuid.uuid4())[:8]}"

    if not is_configured:
        return jsonify({
            "is_configured": False,
            "error": "LiveKit credentials belum dikonfigurasi di file .env.",
            "instructions": "Buka file .env dan isi LIVEKIT_URL, LIVEKIT_API_KEY, dan LIVEKIT_API_SECRET.",
            "demo_available": True
        }), 400

    try:
        from livekit import api

        token = (
            api.AccessToken(lk_key, lk_secret)
            .with_identity(identity)
            .with_name(participant_name)
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_subscribe=True,
                )
            )
        )

        jwt_token = token.to_jwt()

        return jsonify({
            "is_configured": True,
            "token": jwt_token,
            "url": lk_url,
            "room": room_name,
            "identity": identity,
            "participant_name": participant_name,
        })
    except Exception as e:
        logger.error(f"Error generating LiveKit token: {traceback.format_exc()}")
        return jsonify({"error": str(e), "is_configured": False}), 500
