"""
app/Services/ML/DeviceManager.py
================================
Neura AI — Centralized Compute Resource Manager.
Ensures CPU-only execution for XGBoost clinical inference and optimal GPU/CPU for LLM.
"""

import os
import sys
import importlib
import importlib.util
from typing import Literal, Dict, Any, Optional
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)

ComputeMode = Literal["cpu", "igpu", "dedicated_gpu"]
_GPU_TIER_CACHE: Optional[Dict[str, Any]] = None


def detect_gpu_tier() -> Dict[str, Any]:
    global _GPU_TIER_CACHE
    if _GPU_TIER_CACHE is not None:
        return _GPU_TIER_CACHE

    env_layers = os.getenv("NEURA_GPU_LAYERS")
    if env_layers is not None:
        try:
            layers = int(env_layers)
            result = {
                "tier": "dedicated_gpu" if layers > 0 else "cpu",
                "n_gpu_layers": layers,
                "backend": "env_override",
                "device_name": f"[ENV Override] NEURA_GPU_LAYERS={layers}",
                "vram_mb": 0,
                "reason": f"Manual override via env NEURA_GPU_LAYERS={layers}",
            }
            _GPU_TIER_CACHE = result
            return result
        except ValueError:
            pass

    # Check CUDA torch dynamically to avoid Pylance missing-import errors
    try:
        torch_mod = importlib.util.find_spec("torch")
        if torch_mod is not None:
            torch = importlib.import_module("torch")
            if hasattr(torch, "cuda") and torch.cuda.is_available():
                dev_name = torch.cuda.get_device_name(0)
                vram = int(torch.cuda.get_device_properties(0).total_memory / (1024 * 1024))
                result = {
                    "tier": "dedicated_gpu",
                    "n_gpu_layers": -1,
                    "backend": "cuda",
                    "device_name": dev_name,
                    "vram_mb": vram,
                    "reason": f"NVIDIA CUDA terdeteksi ({dev_name}, {vram} MB VRAM)",
                }
                _GPU_TIER_CACHE = result
                return result
    except Exception:
        pass

    # Default CPU fallback
    result = {
        "tier": "cpu",
        "n_gpu_layers": 0,
        "backend": "cpu",
        "device_name": "CPU Renderer",
        "vram_mb": 0,
        "reason": "CPU execution fallback (hemat sumber daya)",
    }
    _GPU_TIER_CACHE = result
    return result


def get_llm_compute_config() -> Dict[str, Any]:
    tier_info = detect_gpu_tier()
    n_threads = int(os.getenv("NEURA_CPU_THREADS", max(1, (os.cpu_count() or 4) - 1)))
    return {
        "n_gpu_layers": tier_info["n_gpu_layers"],
        "n_threads": n_threads,
        "n_batch": 512,
        "use_mmap": True,
        "use_mlock": False,
        "verbose": False,
    }


def get_device_summary() -> Dict[str, Any]:
    """Mengembalikan ringkasan status komputasi GPU/CPU sistem."""
    tier_info = detect_gpu_tier()
    compute_cfg = get_llm_compute_config()
    return {
        "tier": tier_info.get("tier", "cpu"),
        "device_name": tier_info.get("device_name", "CPU"),
        "backend": tier_info.get("backend", "cpu"),
        "vram_mb": tier_info.get("vram_mb", 0),
        "reason": tier_info.get("reason", ""),
        "xgboost_compute": "CPU-only (Dedicated to ML PureTreeEvaluator)",
        "llm_compute": compute_cfg,
    }
