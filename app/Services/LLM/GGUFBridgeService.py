"""
app/Services/LLM/GGUFBridgeService.py
====================================
Bridge penghubung model LLM format GGUF (Llama 3.2 1B Instruct, Gemma, Mistral, dll.)
dengan engine percakapan Neura AI (Neura Architecture).
"""

import os
import re
import glob
from pathlib import Path
from typing import Optional, List, Dict
from config.app import STORAGE_DIR
from app.Services.ML.DeviceManager import get_llm_compute_config
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)

_gguf_instance = None
_model_load_attempted = False
_llm_state = "idle"
_active_gguf_filename = None

DEFAULT_SYSTEM_PROMPT = (
    "Anda adalah Neura AI, asisten klinis dan skrining kognitif cerdas yang berfokus pada "
    "kesehatan otak, pencegahan penyakit Alzheimer, dan edukasi medis komprehensif. "
    "Berikan jawaban yang rapi, terstruktur, hangat, dan berbasis medis dalam Bahasa Indonesia. "
    "Format jawaban dengan baik: gunakan poin bernomor atau bullet jika menjelaskan daftar/langkah, "
    "tebalkan kata kunci utama, serta berikan spasi antar poin agar nyaman dibaca. "
    "Pastikan selalu menyelesaikan kalimat dan penjelasan dengan utuh tanpa terpotong."
)

DEFAULT_SISTEM_CONSTRAINT = (
    "BATASAN EKSKLUSIF TOPIK & PROTOKOL KEAMANAN:\n"
    "1. FOKUS EKSKLUSIF: Anda HANYA diizinkan menjawab pertanyaan yang berkaitan dengan penyakit Alzheimer, "
    "gejala penurunan fungsi kognitif, demensia, skrining daya ingat, dan kesehatan otak.\n"
    "2. LARANGAN KERAS: Jangan sampai Anda memberi jawaban yang tidak sesuai dengan penyakit Alzheimer. "
    "Dilarang melayani konsultasi penyakit umum lainnya (flu, batuk, demam, maag, diabetes, patah tulang, dll) "
    "maupun topik non-medis.\n"
    "3. PROTOKOL PERMINTAAN MAAF: Jika pengguna menanyakan di luar gejala Alzheimer, tolak dengan sopan, "
    "sebutkan nama {user_name}, dan arahkan kembali ke keluhan daya ingat/gejala Alzheimer."
)


def get_models_dir() -> Path:
    target = STORAGE_DIR / "modelsLLM"
    if target.exists():
        return target
    legacy = Path("modelsLLM")
    if legacy.exists():
        return legacy
    return target


def scan_available_models() -> List[Dict]:
    models_dir = get_models_dir()
    if not models_dir.exists():
        return []
    models = []
    for file in sorted(models_dir.glob("*.gguf")):
        models.append({
            "filename": file.name,
            "path": str(file.resolve()),
            "size_mb": round(file.stat().st_size / (1024 * 1024), 2),
            "display_name": file.stem.replace("-", " ").title(),
        })
    return models


def get_active_model_path() -> Optional[str]:
    models = scan_available_models()
    if not models:
        return None
    global _active_gguf_filename
    if _active_gguf_filename:
        for m in models:
            if m["filename"] == _active_gguf_filename:
                return m["path"]
    return models[0]["path"]


def load_llm_instance():
    global _gguf_instance, _model_load_attempted, _llm_state
    if _gguf_instance is not None:
        return _gguf_instance
    if _model_load_attempted:
        return None

    _model_load_attempted = True
    path = get_active_model_path()
    if not path or not os.path.exists(path):
        _llm_state = "not_downloaded"
        logger.warning(f"[GGUFBridge] File LLM GGUF tidak ditemukan di {path}")
        return None

    try:
        from llama_cpp import Llama
        compute_cfg = get_llm_compute_config()
        _llm_state = "loading"
        logger.info(f"[GGUFBridge] Memuat LLM GGUF dari {path} ({compute_cfg})")

        _gguf_instance = Llama(
            model_path=path,
            n_ctx=2048,
            n_gpu_layers=compute_cfg["n_gpu_layers"],
            n_threads=compute_cfg["n_threads"],
            n_batch=compute_cfg["n_batch"],
            verbose=False,
        )
        _llm_state = "idle"
        logger.info("[GGUFBridge] LLM GGUF berhasil dimuat ke memori.")
        return _gguf_instance
    except Exception as e:
        _llm_state = "idle"
        logger.error(f"[GGUFBridge] Gagal memuat Llama-cpp: {e}")
        return None


def generate_llm_response(prompt: str, user_name: str = "Pengguna", max_tokens: int = 512, temperature: float = 0.7) -> str:
    global _llm_state
    llm = load_llm_instance()
    if not llm:
        return (
            f"Mohon maaf {user_name}, model Generative AI lokal (GGUF) belum aktif di server. "
            "Sistem saat ini dapat menggunakan basis pengetahuan Dataset Klinis Neura."
        )

    sys_instruction = DEFAULT_SYSTEM_PROMPT + "\n\n" + DEFAULT_SISTEM_CONSTRAINT.format(user_name=user_name)
    formatted = f"<|start_header_id|>system<|end_header_id|>\n\n{sys_instruction}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"

    try:
        _llm_state = "generating"
        output = llm(
            formatted,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=["<|eot_id|>", "<|start_header_id|>"],
            echo=False,
        )
        _llm_state = "idle"
        text = output["choices"][0]["text"].strip()
        return text or "Mohon maaf, tidak ada respons yang dihasilkan."
    except Exception as e:
        _llm_state = "idle"
        logger.error(f"[GGUFBridge] Error in generate_llm_response: {e}")
        return f"Terjadi kendala saat memproses respons AI: {str(e)}"


def is_gguf_ready() -> bool:
    return load_llm_instance() is not None


def get_llm_status() -> dict:
    models = scan_available_models()
    active_path = get_active_model_path()
    return {
        "status": _llm_state,
        "is_ready": _gguf_instance is not None,
        "active_model": Path(active_path).name if active_path else None,
        "available_models": models,
    }
