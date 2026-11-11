"""
api/admin/admin_research.py
===========================
Admin Research Update Log & Clinical Publication Management:
  GET    /api/research              — Publik: Ambil semua log riset yang published (untuk welcome.html)
  GET    /api/admin/research        — Admin: Ambil semua log riset (termasuk draft)
  POST   /api/admin/research        — Admin: Tambah log riset baru
  PUT    /api/admin/research/<id>   — Admin: Perbarui log riset
  DELETE /api/admin/research/<id>   — Admin: Hapus log riset
"""

import time
import json
from pathlib import Path
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

admin_research_bp = Blueprint("admin_research", __name__)

RESEARCH_DB_FILE = Path(__file__).resolve().parent.parent.parent / "datasets" / "research_updates.json"


def _load_research_db():
    """Baca database riset dari JSON. Kembalikan list jika file tidak ada."""
    if not RESEARCH_DB_FILE.exists():
        return []
    try:
        with open(RESEARCH_DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return sorted(data, key=lambda x: x.get("order", 999))
    except Exception as e:
        logger.error(f"Gagal membaca research_updates.json: {e}")
        return []


def _save_research_db(data):
    """Simpan database riset ke JSON. Kembalikan True jika sukses."""
    try:
        RESEARCH_DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(RESEARCH_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Gagal menyimpan research_updates.json: {e}")
        return False


# ── 1. Endpoint Publik untuk Welcome Page ──────────────────────────────────────
@admin_research_bp.route("/research", methods=["GET"])
def get_public_research_updates():
    """Mengambil daftar riset yang published untuk ditampilkan di welcome.html."""
    items = _load_research_db()
    published = [it for it in items if it.get("isPublished", True)]
    return jsonify({
        "status": "success",
        "total": len(published),
        "data": published
    }), 200


# ── 2. Endpoint Admin: Daftar Semua Riset ───────────────────────────────────────
@admin_research_bp.route("/admin/research", methods=["GET"])
def get_admin_research_updates():
    """Mengambil seluruh log riset termasuk draft untuk dashboard admin."""
    items = _load_research_db()
    return jsonify({
        "status": "success",
        "total": len(items),
        "data": items
    }), 200


# ── 3. Endpoint Admin: Tambah Log Riset Baru ───────────────────────────────────
@admin_research_bp.route("/admin/research", methods=["POST"])
def create_research_update():
    """Membuat entri log riset baru."""
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"status": "error", "message": "Payload JSON tidak valid"}), 400

    title = (body.get("title") or "").strip()
    if not title:
        return jsonify({"status": "error", "message": "Judul riset tidak boleh kosong"}), 400

    items = _load_research_db()
    new_id = f"res-{int(time.time() * 1000)}"

    new_item = {
        "id": new_id,
        "title": title,
        "dateText": body.get("dateText") or "Okt 2026",
        "categories": body.get("categories") or ["Model AI"],
        "readLinkText": body.get("readLinkText") or "Baca riset",
        "linkUrl": body.get("linkUrl") or "/app",
        "summaryText": body.get("summaryText") or "",
        "bodyHtml": body.get("bodyHtml") or "",
        "pages": body.get("pages") or [],
        "thumbnailType": body.get("thumbnailType") or "badge_glow",
        "thumbnailConfig": body.get("thumbnailConfig") or {
            "badgeIcon": "✦",
            "badgeText": "Model Klinis",
            "glowColor": "terracotta"
        },
        "isPublished": bool(body.get("isPublished", True)),
        "createdAt": int(time.time() * 1000),
        "order": int(body.get("order") or (len(items) + 1))
    }

    # Taruh di urutan paling awal jika prioritas tinggi, atau sesuai order
    items.insert(0, new_item)

    # Re-normalize order
    for idx, it in enumerate(items):
        it["order"] = idx + 1

    if _save_research_db(items):
        return jsonify({
            "status": "success",
            "message": "Research update log berhasil disimpan!",
            "data": new_item
        }), 201
    else:
        return jsonify({"status": "error", "message": "Gagal menyimpan ke penyimpanan lokal"}), 500


# ── 4. Endpoint Admin: Perbarui Log Riset ──────────────────────────────────────
@admin_research_bp.route("/admin/research/<research_id>", methods=["PUT"])
def update_research_update(research_id):
    """Memperbarui entri log riset berdasarkan ID."""
    try:
        body = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"status": "error", "message": "Payload JSON tidak valid"}), 400

    items = _load_research_db()
    target = next((it for it in items if it.get("id") == research_id), None)
    if not target:
        return jsonify({"status": "error", "message": f"Log riset ID {research_id} tidak ditemukan"}), 404

    # Update fields
    if "title" in body:
        target["title"] = body["title"].strip()
    if "dateText" in body:
        target["dateText"] = body["dateText"].strip()
    if "categories" in body:
        target["categories"] = body["categories"]
    if "readLinkText" in body:
        target["readLinkText"] = body["readLinkText"].strip()
    if "linkUrl" in body:
        target["linkUrl"] = body["linkUrl"].strip()
    if "summaryText" in body:
        target["summaryText"] = body["summaryText"].strip()
    if "thumbnailType" in body:
        target["thumbnailType"] = body["thumbnailType"]
    if "thumbnailConfig" in body:
        target["thumbnailConfig"] = body["thumbnailConfig"]
    if "isPublished" in body:
        target["isPublished"] = bool(body["isPublished"])
    if "order" in body:
        target["order"] = int(body["order"])
    if "bodyHtml" in body:
        target["bodyHtml"] = body["bodyHtml"]
    if "pages" in body:
        target["pages"] = body["pages"]

    target["updatedAt"] = int(time.time() * 1000)

    if _save_research_db(items):
        return jsonify({
            "status": "success",
            "message": "Log riset berhasil diperbarui!",
            "data": target
        }), 200
    else:
        return jsonify({"status": "error", "message": "Gagal menyimpan perubahan ke database"}), 500


# ── 5. Endpoint Admin: Hapus Log Riset ─────────────────────────────────────────
@admin_research_bp.route("/admin/research/<research_id>", methods=["DELETE"])
def delete_research_update(research_id):
    """Menghapus entri log riset berdasarkan ID."""
    items = _load_research_db()
    initial_len = len(items)
    items = [it for it in items if it.get("id") != research_id]

    if len(items) == initial_len:
        return jsonify({"status": "error", "message": f"Log riset ID {research_id} tidak ditemukan"}), 404

    # Re-normalize order
    for idx, it in enumerate(items):
        it["order"] = idx + 1

    if _save_research_db(items):
        return jsonify({
            "status": "success",
            "message": "Log riset berhasil dihapus"
        }), 200
    else:
        return jsonify({"status": "error", "message": "Gagal menyimpan perubahan setelah penghapusan"}), 500



# ── 6. Endpoint Admin: Upload Media (Gambar, Video, GIF, dsb.) ───────────────
import os
import re
import uuid
import base64

RESEARCH_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "public" / "uploads" / "research"

ALLOWED_EXTENSIONS = {
    # Images & GIFs
    "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp",
    # Videos
    "mp4", "webm", "ogg", "mov", "m4v",
    # Audio
    "mp3", "wav", "m4a"
}

def _detect_media_type(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in {"png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"}:
        return "image"
    elif ext in {"mp4", "webm", "ogg", "mov", "m4v"}:
        return "video"
    elif ext in {"mp3", "wav", "m4a"}:
        return "audio"
    return "other"

@admin_research_bp.route("/admin/research/upload-media", methods=["POST"])
def upload_research_media():
    """Unggah media pendukung riset klinis (gambar, GIF, video, dsb.)."""
    try:
        RESEARCH_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        
        # 1. Handle multipart form-data file
        file = request.files.get("file") or request.files.get("media") or request.files.get("image") or request.files.get("video")
        if file and file.filename:
            raw_name = file.filename
            ext = raw_name.rsplit(".", 1)[-1].lower() if "." in raw_name else "png"
            if ext not in ALLOWED_EXTENSIONS:
                return jsonify({
                    "status": "error",
                    "message": f"Format file .{ext} tidak didukung. Harap unggah gambar (PNG, JPG, GIF), video (MP4, WebM), atau audio."
                }), 400

            safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", raw_name)
            filename = f"med_{int(time.time())}_{uuid.uuid4().hex[:6]}_{safe_name}"
            target_path = RESEARCH_UPLOADS_DIR / filename
            file.save(str(target_path))

            media_type = _detect_media_type(filename)
            return jsonify({
                "status": "success",
                "message": "Media berhasil diunggah",
                "url": f"/uploads/research/{filename}",
                "filename": filename,
                "mediaType": media_type
            }), 201

        # 2. Handle base64 payload
        body = request.get_json(silent=True) or {}
        data_url = body.get("dataUrl") or body.get("data")
        if data_url and isinstance(data_url, str) and "," in data_url:
            header, encoded = data_url.split(",", 1)
            ext = "png"
            if "image/gif" in header:
                ext = "gif"
            elif "image/jpeg" in header or "image/jpg" in header:
                ext = "jpg"
            elif "image/webp" in header:
                ext = "webp"
            elif "image/svg+xml" in header:
                ext = "svg"
            elif "video/mp4" in header:
                ext = "mp4"
            elif "video/webm" in header:
                ext = "webm"

            filename = f"med_{int(time.time())}_{uuid.uuid4().hex[:6]}.{ext}"
            target_path = RESEARCH_UPLOADS_DIR / filename
            with open(target_path, "wb") as f:
                f.write(base64.b64decode(encoded))

            media_type = _detect_media_type(filename)
            return jsonify({
                "status": "success",
                "message": "Media base64 berhasil disimpan",
                "url": f"/uploads/research/{filename}",
                "filename": filename,
                "mediaType": media_type
            }), 201

        return jsonify({"status": "error", "message": "Tidak ada file atau data media yang dikirim"}), 400

    except Exception as e:
        logger.error(f"Gagal mengunggah media riset: {e}", exc_info=True)
        return jsonify({"status": "error", "message": f"Terjadi kesalahan saat memproses media: {str(e)}"}), 500
