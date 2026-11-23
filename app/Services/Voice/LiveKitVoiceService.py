"""
app/Services/Voice/LiveKitVoiceService.py
=========================================
Service kredensial, token generation, dan room management untuk LiveKit Voice AI.
"""

import os
import uuid
from typing import Dict, Tuple, Optional
from config.app import LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)


class LiveKitVoiceService:
    @staticmethod
    def get_config_status() -> Dict:
        url = os.getenv("LIVEKIT_URL", LIVEKIT_URL).strip()
        key = os.getenv("LIVEKIT_API_KEY", LIVEKIT_API_KEY).strip()
        secret = os.getenv("LIVEKIT_API_SECRET", LIVEKIT_API_SECRET).strip()
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        deepgram_key = os.getenv("DEEPGRAM_API_KEY", "").strip()

        missing = []
        if not url or "your-project" in url:
            missing.append("LIVEKIT_URL")
        if not key or "your_livekit" in key:
            missing.append("LIVEKIT_API_KEY")
        if not secret or "your_livekit" in secret:
            missing.append("LIVEKIT_API_SECRET")
        if not openai_key or "your_openai" in openai_key:
            missing.append("OPENAI_API_KEY")
        if not deepgram_key or "your_deepgram" in deepgram_key:
            missing.append("DEEPGRAM_API_KEY")

        is_configured = len(missing) == 0
        return {
            "is_configured": is_configured,
            "livekit_url": url if is_configured else None,
            "missing_keys": missing,
            "instructions": (
                "Lengkapi kredensial LiveKit di file .env untuk mengaktifkan agen suara Neura."
                if not is_configured else "LiveKit Voice Service aktif dan siap."
            )
        }

    @staticmethod
    def generate_token(room_name: str, participant_name: str, participant_identity: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
        try:
            from livekit.api import AccessToken, VideoGrants
        except ImportError:
            return None, "Package 'livekit-api' belum terpasang di environment."

        url = os.getenv("LIVEKIT_URL", LIVEKIT_URL).strip()
        key = os.getenv("LIVEKIT_API_KEY", LIVEKIT_API_KEY).strip()
        secret = os.getenv("LIVEKIT_API_SECRET", LIVEKIT_API_SECRET).strip()

        if not key or not secret:
            return None, "LIVEKIT_API_KEY atau LIVEKIT_API_SECRET belum diatur."

        identity = participant_identity or f"user_{uuid.uuid4().hex[:8]}"

        try:
            grant = VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
            )
            token = (
                AccessToken(key, secret)
                .with_identity(identity)
                .with_name(participant_name)
                .with_grants(grant)
                .to_jwt()
            )
            return token, None
        except Exception as e:
            logger.error(f"[LiveKitVoiceService] Token generation error: {e}")
            return None, str(e)
