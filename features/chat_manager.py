"""
chat_manager.py
===============
Manager class untuk dataset percakapan Neura AI.
Menyediakan fitur pencarian, filter kategori, export JSON,
dan pencocokan intent percakapan.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from .chat_dataset import CHAT_DATASET, CATEGORIES


class ChatDatasetManager:
    """Manajer dataset percakapan untuk mengelola, mencari, dan mengekspor percakapan."""

    def __init__(self, dataset: Optional[Dict[str, List[Dict[str, Any]]]] = None):
        self.dataset = dataset if dataset is not None else CHAT_DATASET

    def get_categories(self) -> List[str]:
        """Mengembalikan daftar kategori yang tersedia."""
        return list(self.dataset.keys())

    def get_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Mengambil semua percakapan di dalam satu kategori."""
        return self.dataset.get(category, [])

    def search(self, query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Mencari percakapan berdasarkan kata kunci atau teks pada user/assistant content.
        """
        query_lower = query.lower().strip()
        results = []

        categories_to_search = [category] if category else self.dataset.keys()

        for cat in categories_to_search:
            for item in self.dataset.get(cat, []):
                # Cek kata kunci
                keywords_match = any(query_lower in kw.lower() for kw in item.get("kata_kunci", []))
                
                # Cek topik
                topic_match = query_lower in item.get("topik", "").lower()

                # Cek isi konten percakapan
                content_match = False
                for turn in item.get("percakapan", []):
                    if query_lower in turn.get("content", "").lower():
                        content_match = True
                        break

                if keywords_match or topic_match or content_match:
                    results.append({
                        "kategori": cat,
                        "data": item
                    })

        return results

    def find_best_response(self, user_message: str) -> Optional[str]:
        """
        Mencari respons asisten terbaik dari dataset berdasarkan kecocokan kata kunci.
        """
        user_lower = user_message.lower().strip()
        
        # 1. Exact or partial keyword matching
        for cat, items in self.dataset.items():
            for item in items:
                for kw in item.get("kata_kunci", []):
                    if kw in user_lower or user_lower in kw:
                        # Kembalikan konten asisten dari percakapan pertama
                        for turn in item.get("percakapan", []):
                            if turn.get("role") == "assistant":
                                return turn.get("content")

        return None

    def get_statistics(self) -> Dict[str, Any]:
        """Menghitung metrik dan statistik dataset."""
        stats = {
            "total_kategori": len(self.dataset),
            "total_percakapan": sum(len(items) for items in self.dataset.values()),
            "rincian_per_kategori": {}
        }
        for cat, items in self.dataset.items():
            stats["rincian_per_kategori"][cat] = len(items)
        return stats

    def export_to_json(self, file_path: str = "features/chat_dataset.json") -> str:
        """Mengekspor seluruh dataset percakapan ke file JSON terstruktur."""
        target = Path(file_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            json.dump({
                "version": "1.0.0",
                "total_categories": len(self.dataset),
                "total_conversations": sum(len(items) for items in self.dataset.values()),
                "categories": list(self.dataset.keys()),
                "data": self.dataset
            }, f, indent=2, ensure_ascii=False)
        return str(target.resolve())
