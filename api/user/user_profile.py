"""
api/user/user_profile.py
========================
User profile management and avatar upload service for Neura AI.
Endpoints:
  POST /api/user/upload-avatar - Upload and persist user avatar image (file or base64 data URL)
"""

import os
import re
import time
import base64
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

user_profile_bp = Blueprint("user_profile", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "public", "uploads", "avatars")
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def _ensure_upload_dir():
    try:
        os.makedirs(UPLOAD_DIR, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create avatar upload directory: {e}")


def _sanitize_uid(uid: str) -> str:
    if not uid:
        return "user_" + str(int(time.time()))
    return re.sub(r"[^a-zA-Z0-9_-]", "_", str(uid))[:50]


@user_profile_bp.route("/upload-avatar", methods=["POST"])
def upload_avatar():
    """
    Upload and save avatar image.
    Supports either multipart/form-data file upload or JSON payload with base64 data URL.
    Returns:
        JSON: { "success": True, "photoURL": "/uploads/avatars/<filename>" }
    """
    _ensure_upload_dir()

    try:
        uid = ""
        # 1. Handle JSON base64 upload
        if request.is_json:
            data = request.get_json(silent=True) or {}
            uid = _sanitize_uid(data.get("uid", ""))
            image_data = data.get("imageData") or data.get("image") or ""
            
            if not image_data or not isinstance(image_data, str):
                return jsonify({"success": False, "error": "No image data provided"}), 400

            # Parse data URL format: data:image/png;base64,....
            if "base64," in image_data:
                header, b64content = image_data.split("base64,", 1)
                ext = ".png"
                if "jpeg" in header or "jpg" in header:
                    ext = ".jpg"
                elif "webp" in header:
                    ext = ".webp"
            else:
                b64content = image_data
                ext = ".png"

            raw_bytes = base64.b64decode(b64content)
            if len(raw_bytes) > MAX_FILE_SIZE:
                return jsonify({"success": False, "error": "File size exceeds 5MB limit"}), 400

            filename = f"{uid}_{int(time.time())}{ext}"
            file_path = os.path.join(UPLOAD_DIR, filename)

            with open(file_path, "wb") as f:
                f.write(raw_bytes)

            photo_url = f"/uploads/avatars/{filename}"
            logger.info(f"Avatar saved via base64 for uid '{uid}': {photo_url}")
            return jsonify({"success": True, "photoURL": photo_url})

        # 2. Handle multipart/form-data
        file = request.files.get("avatar") or request.files.get("file") or request.files.get("image")
        uid = _sanitize_uid(request.form.get("uid", ""))

        if not file or file.filename == "":
            return jsonify({"success": False, "error": "No file selected"}), 400

        _, ext = os.path.splitext(file.filename.lower())
        if ext not in ALLOWED_EXTENSIONS:
            ext = ".png"

        # Check content length if available
        content = file.read()
        if len(content) > MAX_FILE_SIZE:
            return jsonify({"success": False, "error": "File size exceeds 5MB limit"}), 400

        filename = f"{uid}_{int(time.time())}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(content)

        photo_url = f"/uploads/avatars/{filename}"
        logger.info(f"Avatar saved via multipart for uid '{uid}': {photo_url}")
        return jsonify({"success": True, "photoURL": photo_url})

    except Exception as e:
        logger.error(f"Error uploading avatar: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500
