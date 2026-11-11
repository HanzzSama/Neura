"""
core/device_manager.py
======================
Neura AI — Centralized Device & Compute Resource Manager

Aturan alokasi komputasi:
  - Clinical Dataset (XGBoost, PureTreeEvaluator, pandas/NumPy):
      → WAJIB CPU-only. XGBoost decision-tree inference sangat ringan di CPU
        (~1 ms/pasien) dan tidak membutuhkan GPU sama sekali.
  - LLM (llama_cpp GGUF — Llama, Gemma, Mistral, dll.):
      → GPU dedicated (n_gpu_layers=-1 / semua layer)
      → Fallback iGPU jika tidak ada dedicated GPU
      → Fallback CPU jika tidak ada GPU sama sekali

Hirarki deteksi GPU (runtime):
  1. CUDA (NVIDIA dedicated GPU)       → n_gpu_layers = -1 (semua layer ke VRAM)
  2. ROCm / Metal (AMD/Apple iGPU)    → n_gpu_layers = -1
  3. iGPU Intel / AMD tanpa VRAM cukup → n_gpu_layers = 20 (sebagian layer)
  4. CPU saja (software renderer)      → n_gpu_layers = 0

Environment overrides (file .env atau environment variable):
  NEURA_GPU_LAYERS   = angka integer (override manual jumlah GPU layers LLM)
  NEURA_CPU_THREADS  = angka integer (override jumlah CPU threads untuk XGBoost/LLM)
"""

import os
import sys
import logging
from typing import Literal, Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipe dan Konstanta
# ---------------------------------------------------------------------------
ComputeMode = Literal["cpu", "igpu", "dedicated_gpu"]

_GPU_TIER_CACHE: Dict[str, Any] | None = None  # Cache hasil deteksi GPU


# ---------------------------------------------------------------------------
# 1. Deteksi GPU Tier (sekali jalan, di-cache)
# ---------------------------------------------------------------------------
def detect_gpu_tier() -> Dict[str, Any]:
    """
    Deteksi GPU yang tersedia dan kembalikan tier beserta konfigurasi n_gpu_layers
    yang tepat untuk llama_cpp.

    Return dict:
        tier        : "dedicated_gpu" | "igpu" | "cpu"
        n_gpu_layers: int   — jumlah layer yang di-offload ke GPU untuk LLM
        backend     : str   — "cuda" | "rocm" | "metal" | "igpu" | "cpu"
        device_name : str   — nama GPU (jika terdeteksi)
        vram_mb     : int   — estimasi VRAM (MB), 0 jika tidak diketahui
        reason      : str   — penjelasan singkat keputusan
    """
    global _GPU_TIER_CACHE
    if _GPU_TIER_CACHE is not None:
        return _GPU_TIER_CACHE

    # --- ENV override: NEURA_GPU_LAYERS mengizinkan override manual ---
    env_layers = os.getenv("NEURA_GPU_LAYERS")
    if env_layers is not None:
        try:
            layers = int(env_layers)
            tier = "dedicated_gpu" if layers > 0 else "cpu"
            result = {
                "tier": tier,
                "n_gpu_layers": layers,
                "backend": "env_override",
                "device_name": f"[ENV Override] NEURA_GPU_LAYERS={layers}",
                "vram_mb": 0,
                "reason": f"Manual override via env NEURA_GPU_LAYERS={layers}",
            }
            _GPU_TIER_CACHE = result
            _log_device_selection(result)
            return result
        except ValueError:
            pass

    # --- Coba CUDA (NVIDIA dedicated GPU) via torch ---
    cuda_result = _probe_cuda()
    if cuda_result:
        _GPU_TIER_CACHE = cuda_result
        _log_device_selection(cuda_result)
        return cuda_result

    # --- Coba ROCm (AMD GPU) atau Metal (Apple Silicon) ---
    rocm_result = _probe_rocm_metal()
    if rocm_result:
        _GPU_TIER_CACHE = rocm_result
        _log_device_selection(rocm_result)
        return rocm_result

    # --- Coba llama_cpp built-in GPU detection ---
    llama_result = _probe_llama_cpp_gpu()
    if llama_result:
        _GPU_TIER_CACHE = llama_result
        _log_device_selection(llama_result)
        return llama_result

    # --- CPU-only fallback ---
    cpu_result = {
        "tier": "cpu",
        "n_gpu_layers": 0,
        "backend": "cpu",
        "device_name": "CPU (no GPU detected)",
        "vram_mb": 0,
        "reason": "Tidak ditemukan GPU yang didukung; LLM akan berjalan pada CPU.",
    }
    _GPU_TIER_CACHE = cpu_result
    _log_device_selection(cpu_result)
    return cpu_result


def _probe_cuda() -> Dict[str, Any] | None:
    """Probe CUDA via torch (jika tersedia). Kembalikan None jika tidak ada CUDA."""
    try:
        import torch
        if not torch.cuda.is_available():
            return None

        device_name = torch.cuda.get_device_name(0)
        vram_bytes = torch.cuda.get_device_properties(0).total_memory
        vram_mb = vram_bytes // (1024 * 1024)

        # Dedicated GPU heuristic: nama GPU mengandung RTX/GTX/Quadro/Tesla
        name_low = device_name.lower()
        is_dedicated = any(k in name_low for k in [
            "rtx", "gtx", "quadro", "tesla", "titan", "rx ", "radeon rx",
            "vega 64", "vega 56", "firepro",
        ])
        is_igpu = any(k in name_low for k in [
            "intel", "uhd", "iris", "hd graphics", "vega 8", "vega 11",
            "radeon vega", "apple m",
        ])

        if is_igpu or (not is_dedicated and vram_mb < 3000):
            # Shared memory iGPU — offload sebagian layer saja
            gpu_layers = min(20, max(8, vram_mb // 150))
            return {
                "tier": "igpu",
                "n_gpu_layers": gpu_layers,
                "backend": "cuda_igpu",
                "device_name": device_name,
                "vram_mb": vram_mb,
                "reason": (
                    f"iGPU CUDA terdeteksi ({vram_mb} MB VRAM shared). "
                    f"Offload {gpu_layers} layer LLM ke iGPU."
                ),
            }
        else:
            return {
                "tier": "dedicated_gpu",
                "n_gpu_layers": -1,  # semua layer
                "backend": "cuda",
                "device_name": device_name,
                "vram_mb": vram_mb,
                "reason": (
                    f"Dedicated CUDA GPU terdeteksi: {device_name} "
                    f"({vram_mb} MB VRAM). Semua layer LLM di-offload ke GPU."
                ),
            }
    except Exception:
        return None


def _probe_rocm_metal() -> Dict[str, Any] | None:
    """Probe ROCm (AMD) atau Metal (Apple Silicon) via torch."""
    try:
        import torch

        # Apple Metal (MPS)
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return {
                "tier": "dedicated_gpu",
                "n_gpu_layers": -1,
                "backend": "metal",
                "device_name": "Apple Silicon (Metal MPS)",
                "vram_mb": 0,  # Unified memory, tidak terdeteksi via torch
                "reason": "Apple Silicon Metal (MPS) terdeteksi. Semua layer LLM di-offload.",
            }

        # AMD ROCm
        if hasattr(torch, "hip") and torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            vram_mb = torch.cuda.get_device_properties(0).total_memory // (1024 * 1024)
            return {
                "tier": "dedicated_gpu",
                "n_gpu_layers": -1,
                "backend": "rocm",
                "device_name": device_name,
                "vram_mb": vram_mb,
                "reason": (
                    f"AMD ROCm GPU terdeteksi: {device_name} ({vram_mb} MB VRAM). "
                    "Semua layer LLM di-offload ke GPU."
                ),
            }
    except Exception:
        pass
    return None


def _probe_llama_cpp_gpu() -> Dict[str, Any] | None:
    """
    Probe GPU dukungan langsung dari llama_cpp (jika sudah dicompile dengan CUDA/Metal).
    Ini menangkap kasus llama-cpp-python terinstall dengan backend GPU tapi torch tidak ada.
    """
    try:
        from llama_cpp import llama_supports_gpu_offload
        if llama_supports_gpu_offload():
            return {
                "tier": "dedicated_gpu",
                "n_gpu_layers": -1,
                "backend": "llama_cpp_gpu",
                "device_name": "GPU (via llama_cpp build)",
                "vram_mb": 0,
                "reason": (
                    "llama_cpp built dengan dukungan GPU. "
                    "Semua layer LLM di-offload ke GPU."
                ),
            }
    except (ImportError, AttributeError):
        pass
    return None


def _log_device_selection(result: Dict[str, Any]) -> None:
    tier_emoji = {"dedicated_gpu": "🎮", "igpu": "💻", "cpu": "🖥️"}.get(result["tier"], "⚙️")
    logger.info(
        f"[Neura DeviceManager] {tier_emoji} GPU Tier: {result['tier'].upper()} | "
        f"Backend: {result['backend']} | Device: {result['device_name']} | "
        f"LLM GPU Layers: {result['n_gpu_layers']} | "
        f"Alasan: {result['reason']}"
    )
    # Juga print ke stdout untuk visibilitas saat startup server
    print(
        f"[Neura DeviceManager] {tier_emoji} {result['tier'].upper()} | "
        f"{result['device_name']} | LLM gpu_layers={result['n_gpu_layers']}"
    )


# ---------------------------------------------------------------------------
# 2. API Publik: Konfigurasi untuk masing-masing compute mode
# ---------------------------------------------------------------------------

def get_llm_device_config() -> Dict[str, Any]:
    """
    Kembalikan konfigurasi device untuk LLM (llama_cpp Llama constructor).

    LLM → GPU (dedicated / iGPU) → CPU fallback

    Return dict siap dipakai sebagai kwargs:
        n_gpu_layers : int   — jumlah layer di-offload ke GPU
        n_threads    : int   — jumlah CPU thread untuk komputasi sisa
        use_mlock    : bool  — pin model di RAM agar tidak di-swap ke disk
        use_mmap     : bool  — gunakan memory-mapped file loading
    """
    gpu = detect_gpu_tier()
    cpu_threads = _get_cpu_threads()

    return {
        "n_gpu_layers": gpu["n_gpu_layers"],
        "n_threads": cpu_threads,
        "use_mlock": gpu["tier"] != "cpu",   # Lock model di RAM jika pakai GPU
        "use_mmap": True,                    # Selalu gunakan mmap untuk load cepat
        "_meta": {
            "tier": gpu["tier"],
            "backend": gpu["backend"],
            "device_name": gpu["device_name"],
        },
    }


def get_xgboost_device_config() -> Dict[str, Any]:
    """
    Kembalikan konfigurasi device untuk XGBoost / clinical dataset inference.

    XGBoost → SELALU CPU. Decision tree inference tidak butuh GPU,
    dan menjalankannya di GPU hanya membuang VRAM yang lebih dibutuhkan LLM.

    Return dict:
        device       : str  — "cpu" (selalu)
        n_threads    : int  — jumlah CPU thread yang boleh dipakai
        tree_method  : str  — "hist" (CPU-optimized histogram method)
    """
    return {
        "device": "cpu",
        "n_threads": _get_cpu_threads(),
        "tree_method": "hist",   # CPU-only histogram-based tree method
        "_meta": {
            "tier": "cpu",
            "reason": "XGBoost clinical inference: CPU-only by policy.",
        },
    }


def get_device_summary() -> Dict[str, Any]:
    """Kembalikan ringkasan lengkap status komputasi untuk endpoint /api/device-status."""
    gpu = detect_gpu_tier()
    cpu_threads = _get_cpu_threads()
    xgb_cfg = get_xgboost_device_config()
    llm_cfg = get_llm_device_config()

    return {
        "gpu": {
            "tier":        gpu["tier"],
            "backend":     gpu["backend"],
            "device_name": gpu["device_name"],
            "vram_mb":     gpu["vram_mb"],
        },
        "llm": {
            "device":      gpu["tier"],
            "n_gpu_layers": llm_cfg["n_gpu_layers"],
            "n_threads":   llm_cfg["n_threads"],
            "description": "LLM menggunakan GPU (semua layer)" if gpu["tier"] != "cpu"
                           else "LLM berjalan pada CPU (tidak ada GPU terdeteksi)",
        },
        "clinical": {
            "device":      "cpu",
            "n_threads":   xgb_cfg["n_threads"],
            "description": "XGBoost clinical dataset inference berjalan pada CPU (by design)",
        },
        "cpu_threads": cpu_threads,
        "python_version": sys.version,
    }


# ---------------------------------------------------------------------------
# 3. Helpers
# ---------------------------------------------------------------------------

def _get_cpu_threads() -> int:
    """
    Hitung jumlah CPU threads optimal untuk inferensi.
    Gunakan env NEURA_CPU_THREADS jika diset, atau max 8 core (I/O-safe).
    """
    env_threads = os.getenv("NEURA_CPU_THREADS")
    if env_threads:
        try:
            return max(1, int(env_threads))
        except ValueError:
            pass
    return min(os.cpu_count() or 4, 8)


def reset_gpu_cache() -> None:
    """Reset cache deteksi GPU (berguna setelah mengubah env variable secara dinamis)."""
    global _GPU_TIER_CACHE
    _GPU_TIER_CACHE = None
    logger.info("[Neura DeviceManager] GPU tier cache di-reset.")

