"""
app/Services/LLM/ChatManagerService.py
======================================
Manager dataset chat dan knowledge retrieval berbasis kategori untuk Neura AI.
Membaca dataset/chat_intents.csv atau database/datasets/chat_intents.csv.
"""

import os
import json
import csv
from pathlib import Path
from typing import List, Dict, Optional
from config.app import BASE_DIR
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)


class ChatDatasetManager:
    def __init__(self, data_path: Optional[str] = None):
        if data_path:
            self.file_path = Path(data_path)
        else:
            cand1 = BASE_DIR / "database" / "datasets" / "chat_intents.csv"
            cand2 = BASE_DIR / "datasets" / "chat_intents.csv"
            cand3 = BASE_DIR / "features" / "chat_dataset.json"
            if cand1.exists():
                self.file_path = cand1
            elif cand2.exists():
                self.file_path = cand2
            elif cand3.exists():
                self.file_path = cand3
            else:
                self.file_path = cand1

        self.dataset: List[Dict] = []
        self._load_data()

    def _load_data(self):
        if not self.file_path.exists():
            logger.warning(f"[ChatManager] File dataset tidak ditemukan: {self.file_path}")
            return

        try:
            if self.file_path.suffix == ".csv":
                with open(self.file_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    self.dataset = [row for row in reader]
            elif self.file_path.suffix == ".json":
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.dataset = data if isinstance(data, list) else data.get("items", [])
            logger.info(f"[ChatManager] Loaded {len(self.dataset)} chat items from {self.file_path.name}")
        except Exception as e:
            logger.error(f"[ChatManager] Failed loading chat data: {e}")

    def get_categories(self) -> List[str]:
        cats = set()
        for item in self.dataset:
            cat = item.get("category") or item.get("intent") or "General"
            cats.add(cat)
        return sorted(list(cats))

    def get_by_category(self, category: str) -> List[Dict]:
        return [
            item for item in self.dataset
            if (item.get("category") or item.get("intent") or "").lower() == category.lower()
        ]

    def search(self, query: str, category: Optional[str] = None, limit: int = 5) -> List[Dict]:
        q = query.lower().strip()
        results = []
        for item in self.dataset:
            if category and (item.get("category") or "").lower() != category.lower():
                continue
            question = (item.get("question") or item.get("text") or item.get("prompt") or "").lower()
            answer = (item.get("answer") or item.get("response") or "").lower()
            if q in question or q in answer:
                results.append(item)
            if len(results) >= limit:
                break
        return results

    def get_statistics(self) -> Dict:
        return {
            "total_items": len(self.dataset),
            "categories_count": len(self.get_categories()),
            "source_file": self.file_path.name,
        }
