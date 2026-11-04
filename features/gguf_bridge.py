"""
gguf_bridge.py
==============
Bridge penghubung model Large Language Model (LLM) format GGUF (Llama 3.2 1B Instruct)
dengan engine percakapan Neura AI.

Menyediakan:
  - Deteksi otomatis file model .gguf di folder modelsLLM/
  - Singleton model loader dengan fallback CPU/GPU yang aman
  - Format prompt Llama 3.2 Chat yang dioptimalkan untuk konsultasi klinis
  - API generate_gguf_response() dan status check is_gguf_ready()
"""

import os
import glob
from pathlib import Path
from typing import Optional

# Global cache instance untuk model LLM
_gguf_instance = None
_model_load_attempted = False
_llm_state = "idle"  # idle | loading | generating | downloading | not_downloaded

DEFAULT_SYSTEM_PROMPT = (
    "Anda adalah Neura AI, asisten klinis dan skrining kognitif cerdas yang berfokus pada "
    "kesehatan otak, pencegahan penyakit Alzheimer, dan edukasi medis komprehensif. "
    "Berikan jawaban yang rapi, terstruktur, hangat, dan berbasis medis dalam Bahasa Indonesia. "
    "Format jawaban dengan baik: gunakan poin bernomor atau bullet jika menjelaskan daftar/langkah, "
    "tebalkan kata kunci utama, serta berikan spasi antar poin agar nyaman dibaca. "
    "Pastikan selalu menyelesaikan kalimat dan penjelasan dengan utuh tanpa terpotong."
)


def find_gguf_model_path() -> Optional[str]:
    """
    Mencari lokasi file model .gguf valid di modelsLLM/ atau models/.
    """
    # 1. Cek variabel lingkungan jika ada
    env_path = os.getenv("GGUF_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Cek direktori modelsLLM (default)
    search_dirs = ["modelsLLM", "models", "."]
    candidates = [
        os.path.join("modelsLLM", "llama-3.2-1b-instruct-q4_k_m.gguf"),
        os.path.join("modelsLLM", "Llama-3.2-1B-Instruct-Q4_K_M.gguf"),
    ]

    for c in candidates:
        if os.path.exists(c) and _is_valid_gguf_header(c):
            return c

    # 3. Cari file .gguf apa pun di dalam folder pencarian
    for sdir in search_dirs:
        if not os.path.exists(sdir):
            continue
        for f in glob.glob(os.path.join(sdir, "*.gguf")):
            if _is_valid_gguf_header(f):
                return f

    return None


def _is_valid_gguf_header(filepath: str) -> bool:
    """Memverifikasi bahwa file memiliki magic header 'GGUF' dan bukan file kosong/corrupt."""
    if not os.path.exists(filepath):
        return False
    try:
        if os.path.getsize(filepath) < 1024:
            return False
        with open(filepath, "rb") as f:
            header = f.read(4)
            return header == b"GGUF"
    except Exception:
        return False


def is_gguf_ready() -> bool:
    """Mengecek apakah library llama_cpp dan file model GGUF valid siap digunakan."""
    try:
        import llama_cpp  # noqa: F401
    except ImportError:
        return False

    return find_gguf_model_path() is not None


def get_gguf_model():
    """
    Mengambil atau menginisialisasi singleton instance model Llama GGUF.
    Mendukung fallback otomatis dari GPU ke CPU jika CUDA tidak tersedia.
    """
    global _gguf_instance, _model_load_attempted
    if _gguf_instance is not None:
        return _gguf_instance

    try:
        from llama_cpp import Llama
    except ImportError as e:
        raise ImportError(
            "Library 'llama_cpp' belum terpasang. Jalankan 'pip install llama-cpp-python' untuk menggunakannya."
        ) from e

    model_path = find_gguf_model_path()
    if not model_path:
        raise FileNotFoundError(
            "File model GGUF tidak ditemukan atau belum valid di folder modelsLLM/. "
            "Pastikan file llama-3.2-1b-instruct-q4_k_m.gguf telah diunduh dengan benar."
        )

    global _llm_state
    _model_load_attempted = True
    _llm_state = "loading"
    n_ctx = int(os.getenv("GGUF_N_CTX", "2048"))
    n_threads = int(os.getenv("GGUF_N_THREADS", str(min(os.cpu_count() or 4, 8))))
    n_gpu_layers = int(os.getenv("GGUF_GPU_LAYERS", "-1"))

    print(f"[Neura LLM] Memuat model GGUF: {model_path} (ctx={n_ctx}, threads={n_threads})...")

    # Coba inisialisasi dengan akselerasi GPU terlebih dahulu (jika diminta)
    try:
        _gguf_instance = Llama(
            model_path=model_path,
            n_ctx=n_ctx,
            n_threads=n_threads,
            n_gpu_layers=n_gpu_layers,
            verbose=False
        )
        print(f"[Neura LLM] Model berhasil dimuat dengan GPU layers={n_gpu_layers}!")
        _llm_state = "idle"
        return _gguf_instance
    except Exception as gpu_err:
        if n_gpu_layers != 0:
            print(f"[Neura LLM] GPU load gagal ({gpu_err}), mencoba fallback ke CPU...")
            try:
                _gguf_instance = Llama(
                    model_path=model_path,
                    n_ctx=n_ctx,
                    n_threads=n_threads,
                    n_gpu_layers=0,
                    verbose=False
                )
                print("[Neura LLM] Model berhasil dimuat pada CPU!")
                _llm_state = "idle"
                return _gguf_instance
            except Exception as cpu_err:
                raise RuntimeError(f"Gagal memuat model GGUF pada CPU: {cpu_err}") from cpu_err
        else:
            raise gpu_err


def generate_gguf_response(
    prompt: str,
    user_name: str = "Hanzz",
    system_prompt: Optional[str] = None,
    max_tokens: int = 800,
    temperature: float = 0.65,
    top_p: float = 0.9,
) -> Optional[str]:
    """
    Menghasilkan respons teks menggunakan model Llama GGUF.
    Menggunakan template instruksi Llama 3.2.
    """
    global _llm_state
    try:
        llm = get_gguf_model()
    except Exception as e:
        _llm_state = "idle"
        print(f"[Neura LLM] Model tidak dapat dipanggil: {e}")
        return None

    _llm_state = "generating"

    name = user_name.strip() if user_name and user_name.strip() else "Hanzz"
    sys_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    if "{user_name}" in sys_prompt:
        sys_prompt = sys_prompt.format(user_name=name)

    # Format Llama 3.2 Instruct Prompt
    formatted_prompt = (
        f"<|start_header_id|>system<|end_header_id|>\n\n"
        f"{sys_prompt}\n"
        f"Nama pengguna yang sedang berkonsultasi: {name}."
        f"<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
        f"{prompt.strip()}"
        f"<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    )

    try:
        _llm_state = "generating"
        output = llm(
            formatted_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop=[
                "<|eot_id|>",
                "<|end_of_text|>",
                "<|start_header_id|>",
                "User:",
                "\nUser:",
                "Assistant:",
            ],
            echo=False
        )

        choices = output.get("choices", [])
        _llm_state = "idle"
        if choices and len(choices) > 0:
            raw_text = choices[0].get("text", "").strip()
            # Bersihkan jika ada artefak stop token
            cleaned = raw_text.replace("<|eot_id|>", "").replace("<|end_of_text|>", "").strip()
            # Bersihkan jika ada kalimat yang terpotong di akhir karena token limit
            if cleaned and cleaned[-1] not in ('.', '!', '?', '"', "'", '*'):
                import re
                matches = list(re.finditer(r'[.!?](\s+|$|\n)', cleaned))
                if matches and (len(cleaned) - (matches[-1].start() + 1) < 180):
                    cleaned = cleaned[:matches[-1].start() + 1].strip()
            return cleaned
        return None
    except Exception as e:
        print(f"[Neura LLM] Kesalahan saat generasi respons: {e}")
        return None


def get_llm_status() -> dict:
    """Mengembalikan status detail model LLM lokal untuk UI."""
    global _gguf_instance, _llm_state
    model_path = find_gguf_model_path()
    ready = model_path is not None
    state = _llm_state
    if not ready:
        state = "not_downloaded"
    return {
        "ready": ready,
        "loaded": _gguf_instance is not None,
        "state": state,
        "model_path": model_path,
        "model_name": os.path.basename(model_path) if model_path else None,
        "architecture": "Llama 3.2 1B Instruct (GGUF Q4_K_M)",
    }
