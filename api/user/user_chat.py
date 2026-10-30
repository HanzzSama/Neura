"""
api/user/user_chat.py
=====================
User Chat & Dataset endpoints:
  GET  /api/features/categories   — Kategori dataset chat konsultasi
  GET  /api/features/chat-dataset — Data atau pencarian dataset chat konsultasi
  POST /api/chat                  — Interaksi chat pengguna & respons konsultasi
"""

import traceback
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

user_chat_bp = Blueprint("user_chat", __name__)


@user_chat_bp.route("/features/categories", methods=["GET"])
def api_chat_categories():
    try:
        from features.chat_manager import ChatDatasetManager
        mgr = ChatDatasetManager()
        return jsonify({
            "categories": mgr.get_categories(),
            "stats": mgr.get_statistics(),
        })
    except Exception as e:
        logger.error(f"Error in api_chat_categories: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@user_chat_bp.route("/features/chat-dataset", methods=["GET"])
def api_chat_dataset():
    try:
        from features.chat_manager import ChatDatasetManager
        mgr = ChatDatasetManager()
        category = request.args.get("category", None)
        query = request.args.get("q", None)

        if query:
            results = mgr.search(query, category=category)
            return jsonify({"query": query, "count": len(results), "results": results})

        if category:
            data = mgr.get_by_category(category)
            return jsonify({"category": category, "count": len(data), "items": data})

        return jsonify({
            "stats": mgr.get_statistics(),
            "data": mgr.dataset,
        })
    except Exception as e:
        logger.error(f"Error in api_chat_dataset: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@user_chat_bp.route("/chat", methods=["POST"])
def api_chat_message():
    try:
        from features.chat_manager import ChatDatasetManager
        body = request.get_json(silent=True) or {}
        message = body.get("message", "").strip()
        user_name = (body.get("user_name") or body.get("name") or "").strip()

        if not message:
            return jsonify({"error": "Empty message"}), 400

        mgr = ChatDatasetManager()
        res = mgr.find_consultation_response(message, user_name=user_name)

        return jsonify({
            "matched": res.get("matched", False),
            "reply": res.get("reply", ""),
            "responses": res.get("responses", [res.get("reply", "")]),
            "category": res.get("category", "konsultasi_skrining"),
            "topic": res.get("topic", "Konsultasi Neura AI"),
            "suggestions": res.get("suggestions", []),
        })
    except Exception as e:
        logger.error(f"Error in api_chat_message: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500
