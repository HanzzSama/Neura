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
  - Multi-model support: scan semua .gguf, pilih aktif via set_active_gguf_model()
  - Auto-generate architecture label dari nama file .gguf
"""

import os
import re
import glob
from pathlib import Path
from typing import Optional, List, Dict

# Global cache instance untuk model LLM
_gguf_instance = None
_model_load_attempted = False
_llm_state = "idle"  # idle | loading | generating | downloading | not_downloaded
_active_gguf_filename = None   # Nama file .gguf yang sedang aktif (None = auto-detect)

DEFAULT_SYSTEM_PROMPT = (
    "Anda adalah Neura AI, asisten klinis dan skrining kognitif cerdas yang berfokus pada "
    "kesehatan otak, pencegahan penyakit Alzheimer, dan edukasi medis komprehensif. "
    "Berikan jawaban yang rapi, terstruktur, hangat, dan berbasis medis dalam Bahasa Indonesia. "
    "Format jawaban dengan baik: gunakan poin bernomor atau bullet jika menjelaskan daftar/langkah, "
    "tebalkan kata kunci utama, serta berikan spasi antar poin agar nyaman dibaca. "
    "Pastikan selalu menyelesaikan kalimat dan penjelasan dengan utuh tanpa terpotong."
)


# ---------------------------------------------------------------------------
# Architecture Parser — auto-generate label dari nama file .gguf
# ---------------------------------------------------------------------------
def parse_model_architecture(filename: str) -> str:
    """
    Parse nama file .gguf dan hasilkan string arsitektur yang mudah dibaca.
    Contoh:
        "llama-3.2-1b-instruct-q4_k_m.gguf"      -> "Llama 3.2 1B Instruct (GGUF Q4_K_M)"
        "mistral-7b-instruct-v0.2.Q4_K_M.gguf"   -> "Mistral 7B Instruct (GGUF Q4_K_M)"
        "gemma-2-9b-it-Q4_K_M.gguf"               -> "Gemma 2 9B Instruct (GGUF Q4_K_M)"
    """
    if not filename:
        return "LLM (GGUF)"

    name_lower = filename.lower().replace("_", "-")

    # --- Deteksi keluarga model (urutan penting: lebih spesifik duluan) ---
    family_map = [
        (r"codellama",  "CodeLlama"),
        (r"tinyllama",  "TinyLlama"),
        (r"llama",      "Llama"),
        (r"mistral",    "Mistral"),
        (r"gemma",      "Gemma"),
        (r"phi-3",      "Phi-3"),
        (r"phi-2",      "Phi-2"),
        (r"phi",        "Phi"),
        (r"qwen",       "Qwen"),
        (r"falcon",     "Falcon"),
        (r"deepseek",   "DeepSeek"),
        (r"vicuna",     "Vicuna"),
        (r"wizardlm",   "WizardLM"),
        (r"openchat",   "OpenChat"),
        (r"orca",       "Orca"),
        (r"solar",      "Solar"),
        (r"mpt",        "MPT"),
        (r"starcoder",  "StarCoder"),
        (r"neural",     "Neural"),
    ]
    family = "LLM"
    for pattern, label in family_map:
        if re.search(pattern, name_lower):
            family = label
            break

    # --- Deteksi versi model (3.2, 2.5, dst) —
    # Hindari angka yang langsung diikuti 'b' (ukuran parameter)
    version_match = re.search(r"(?<![0-9])(\d+\.\d+)(?![bBmMgG])", name_lower)
    version = f" {version_match.group(1)}" if version_match else ""

    # --- Deteksi ukuran parameter (1b, 7b, 13b, 70b, dst) ---
    size_match = re.search(r"[-.](\d+\.?\d*)\s*([bBmMgG])(?=[-.]|$|\.gguf)", name_lower)
    if size_match:
        size_num  = size_match.group(1).rstrip(".")
        size_unit = size_match.group(2).upper()
        size = f" {size_num}{size_unit}"
    else:
        size = ""

    # --- Deteksi tipe: Instruct / Chat / Base ---
    is_instruct = bool(re.search(r"instruct|-it\b|-chat\b", name_lower))
    type_suffix = " Instruct" if is_instruct else ""

    # --- Deteksi quantization (q4_k_m, q8_0, f16, dst) ---
    quant_match = re.search(
        r"[-.]?(q\d+[-_]?k?[-_]?[msl]?|f16|f32|q\d+[-_]\d+)(?:[-.]|$|\.gguf)",
        name_lower
    )
    if quant_match:
        raw_q = quant_match.group(1).replace("-", "_").upper()
        quant = f" (GGUF {raw_q})"
    else:
        quant = " (GGUF)"

    return f"{family}{version}{size}{type_suffix}{quant}"


def _make_display_name(filename: str) -> str:
    """
    Buat label pendek dari nama file .gguf (tanpa quantization).
    Contoh:
        "llama-3.2-1b-instruct-q4_k_m.gguf"  -> "Llama 3.2 1B"
        "mistral-7b-instruct-v0.2.Q4_K_M.gguf" -> "Mistral 7B"
        "gemma-2-9b-it-Q4_K_M.gguf"           -> "Gemma 2 9B"
    """
    name = filename
    # 1. Hapus ekstensi
    name = re.sub(r"\.gguf$", "", name, flags=re.IGNORECASE)
    # 2. Hapus quantization suffix (q4_k_m, f16, q8_0, dst)
    name = re.sub(
        r"[-_.](q\d+[_-]?k?[_-]?[msl]?|f16|f32|q\d+[_-]\d+)$",
        "", name, flags=re.IGNORECASE
    )
    # 3. Hapus -instruct / -it / -chat / -hf suffix
    name = re.sub(r"[-_](instruct|chat|hf|it)$", "", name, flags=re.IGNORECASE)
    # 4. Hapus versi trailing: -v0.2, _v1.1
    name = re.sub(r"[-_]v\d+(\.\d+)*$", "", name, flags=re.IGNORECASE)
    # 5. Konversi separator ke spasi
    name = re.sub(r"[-_]", " ", name).strip()
    # 6. Title case
    name = " ".join(w.capitalize() for w in name.split())
    # 7. Fix ukuran param: "1b" → "1B", "7b" → "7B"
    name = re.sub(
        r"\b(\d+\.?\d*)([bBmMgG])\b",
        lambda m: m.group(1) + m.group(2).upper(),
        name
    )
    return name or "LLM"


# ---------------------------------------------------------------------------
# Model Scanner — daftar semua model .gguf yang valid di folder
# ---------------------------------------------------------------------------
def list_available_gguf_models() -> List[Dict]:
    """
    Scan direktori modelsLLM/ (dan models/) untuk semua file .gguf yang valid.
    Kembalikan list dict berisi metadata setiap model.
    Key 'active' TIDAK diisi di sini — diisi oleh get_llm_status().
    """
    search_dirs = ["modelsLLM", "models"]
    found = []
    seen: set = set()

    for sdir in search_dirs:
        if not os.path.exists(sdir):
            continue
        for filepath in sorted(glob.glob(os.path.join(sdir, "*.gguf"))):
            if not _is_valid_gguf_header(filepath):
                continue
            fname = os.path.basename(filepath)
            if fname in seen:
                continue
            seen.add(fname)
            try:
                size_mb = round(os.path.getsize(filepath) / (1024 * 1024), 1)
            except OSError:
                size_mb = 0
            found.append({
                "filename":     fname,
                "path":         filepath,
                "display_name": _make_display_name(fname),
                "architecture": parse_model_architecture(fname),
                "size_mb":      size_mb,
            })

    return found


# ---------------------------------------------------------------------------
# Active Model Selector — pilih model aktif dari daftar
# ---------------------------------------------------------------------------
def set_active_gguf_model(filename: str) -> bool:
    """
    Set model .gguf aktif berdasarkan nama file.
    Reset singleton agar model baru dimuat saat request berikutnya.
    Kembalikan True jika file ditemukan dan valid.
    """
    global _active_gguf_filename, _gguf_instance, _model_load_attempted, _llm_state

    for sdir in ["modelsLLM", "models", "."]:
        candidate = os.path.join(sdir, filename)
        if os.path.exists(candidate) and _is_valid_gguf_header(candidate):
            _active_gguf_filename = filename
            # Reset singleton agar model baru di-load saat generate dipanggil
            _gguf_instance = None
            _model_load_attempted = False
            _llm_state = "idle"
            print(f"[Neura LLM] Model aktif diubah ke: {filename}")
            return True

    print(f"[Neura LLM] File tidak ditemukan atau tidak valid: {filename}")
    return False


def get_active_gguf_filename() -> Optional[str]:
    """Kembalikan nama file model yang sedang aktif."""
    return _active_gguf_filename


def find_gguf_model_path() -> Optional[str]:
    """
    Mencari lokasi file model .gguf valid di modelsLLM/ atau models/.
    Prioritas: env var > model aktif pilihan user > auto-detect pertama.
    """
    global _active_gguf_filename

    # 1. Cek variabel lingkungan jika ada (prioritas tertinggi)
    env_path = os.getenv("GGUF_MODEL_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    search_dirs = ["modelsLLM", "models", "."]

    # 2. Gunakan model yang dipilih pengguna jika ada
    if _active_gguf_filename:
        for sdir in search_dirs:
            candidate = os.path.join(sdir, _active_gguf_filename)
            if os.path.exists(candidate) and _is_valid_gguf_header(candidate):
                return candidate
        # File yang dipilih tidak valid lagi — reset
        _active_gguf_filename = None

    # 3. Auto-detect: scan semua .gguf valid, ambil yang pertama (sort abjad)
    for sdir in search_dirs:
        if not os.path.exists(sdir):
            continue
        candidates = sorted(glob.glob(os.path.join(sdir, "*.gguf")))
        for f in candidates:
            if _is_valid_gguf_header(f):
                _active_gguf_filename = os.path.basename(f)
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
            "Jalankan python scripts/download_llm.py untuk mengunduh model."
        )

    global _llm_state
    _model_load_attempted = True
    _llm_state = "loading"
    n_ctx        = int(os.getenv("GGUF_N_CTX",      "2048"))
    n_threads    = int(os.getenv("GGUF_N_THREADS",   str(min(os.cpu_count() or 4, 8))))
    n_gpu_layers = int(os.getenv("GGUF_GPU_LAYERS",  "-1"))

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
                matches = list(re.finditer(r'[.!?](\s+|$|\n)', cleaned))
                if matches and (len(cleaned) - (matches[-1].start() + 1) < 180):
                    cleaned = cleaned[:matches[-1].start() + 1].strip()
            return cleaned
        return None
    except Exception as e:
        _llm_state = "idle"
        print(f"[Neura LLM] Kesalahan saat generasi respons: {e}")
        return None


def get_llm_status() -> dict:
    """Mengembalikan status detail model LLM lokal untuk UI."""
    global _gguf_instance, _llm_state, _active_gguf_filename

    model_path = find_gguf_model_path()
    ready = model_path is not None
    state = _llm_state
    if not ready:
        state = "not_downloaded"

    model_name   = os.path.basename(model_path) if model_path else None
    architecture = parse_model_architecture(model_name) if model_name else None

    # Scan semua model tersedia di folder
    available = list_available_gguf_models()
    # Tandai model yang sedang aktif
    active_key = _active_gguf_filename or model_name
    for m in available:
        m["active"] = (m["filename"] == active_key)

    return {
        "ready":            ready,
        "loaded":           _gguf_instance is not None,
        "state":            state,
        "model_path":       model_path,
        "model_name":       model_name,
        "architecture":     architecture,
        "available_models": available,
    }
