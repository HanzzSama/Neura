"""
chat_manager.py
===============
Manager class untuk dataset percakapan dan konsultasi klinis Neura AI.
Menyediakan fitur pencarian multi-kata kunci cerdas, scoring kecocokan,
konsultasi skrining daya ingat terpandu, dan ekspor data percakapan.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

from .chat_dataset import CHAT_DATASET, CATEGORIES


class ChatDatasetManager:
    """Manajer dataset percakapan dan konsultasi cerdas Neura AI."""

    def __init__(self, dataset: Optional[Dict[str, List[Dict[str, Any]]]] = None):
        self.dataset = dataset if dataset is not None else CHAT_DATASET

    def get_categories(self) -> List[str]:
        """Mengembalikan daftar kategori percakapan yang tersedia."""
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
                keywords_match = any(query_lower in kw.lower() for kw in item.get("kata_kunci", []))
                topic_match = query_lower in item.get("topik", "").lower()

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
        Mencari respons asisten terbaik berupa string (kompatibilitas backward).
        """
        res = self.find_consultation_response(user_message)
        return res.get("reply") if res and res.get("matched") else None

    def find_consultation_response(self, user_message: str) -> Dict[str, Any]:
        """
        Menganalisis pesan pengguna dan mengembalikan respons konsultasi terstruktur
        beserta kategori, topik, dan saran pertanyaan lanjutan (suggestions).
        """
        cleaned = user_message.lower().strip()
        # Hilangkan tanda baca untuk pencocokan token
        tokens = re.findall(r'\b[a-zA-Z0-9_\-]+\b', cleaned)
        query_normalized = " ".join(tokens)

        best_match = None
        best_score = 0
        best_category = None

        for cat, items in self.dataset.items():
            for item in items:
                score = 0
                topic_lower = item.get("topik", "").lower()

                # 1. Cek kecocokan kata kunci (keywords)
                for kw in item.get("kata_kunci", []):
                    kw_clean = kw.lower().strip()
                    if kw_clean in cleaned:
                        # Full phrase match bernilai tinggi
                        score += 50 + len(kw_clean)
                    elif any(token in kw_clean for token in tokens if len(token) > 3):
                        # Partial token match
                        score += 15

                # 2. Cek tags
                for tag in item.get("tags", []):
                    if tag.lower() in tokens:
                        score += 12

                # 3. Cek topik
                if any(token in topic_lower for token in tokens if len(token) > 3):
                    score += 10

                if score > best_score:
                    best_score = score
                    best_match = item
                    best_category = cat

        # Jika ditemukan kecocokan dengan skor memadai
        if best_match and best_score >= 20:
            for turn in best_match.get("percakapan", []):
                if turn.get("role") == "assistant":
                    return {
                        "matched": True,
                        "reply": turn.get("content"),
                        "category": best_category,
                        "topic": best_match.get("topik"),
                        "suggestions": best_match.get("suggestions", []),
                        "score": best_score,
                    }

        # ---------------------------------------------------------------------
        # Fallback Konsultasi Cerdas Berbasis Konteks Keluhan Klinis
        # ---------------------------------------------------------------------
        fallback = self._generate_contextual_consultation(cleaned, tokens)
        return fallback

    def _generate_contextual_consultation(self, text: str, tokens: List[str]) -> Dict[str, Any]:
        """Menghasilkan panduan konsultasi empatik jika kata kunci spesifik tidak cocok 100%."""

        # 1. Jika terdeteksi keluhan usia lanjut / orang tua
        if any(w in text for w in ["ibu", "ayah", "bapak", "kakek", "nenek", "orang tua", "lansia", "usia", "umur"]):
            reply = (
                "Terima kasih sudah menceritakan kondisi keluarga Anda.\n\n"
                "Pada usia lanjut, keluhan daya ingat membutuhkan perhatian bertahap. "
                "Untuk memahami apakah ini merupakan bagian dari penuaan wajar atau indikasi awal demensia/Alzheimer, perhatikan 3 hal berikut:\n"
                "1. **Seberapa sering keluhan terjadi?** Apakah hampir setiap hari melupakan hal-hal baru?\n"
                "2. **Apakah ada disorientasi?** Misalnya lupa jalan pulang, lupa hari/bulan, atau meletakkan barang di tempat yang tidak semestinya?\n"
                "3. **Apakah mempengaruhi aktivitas harian?** Seperti kesulitan mengurus keuangan, minum obat, atau memasak.\n\n"
                "Anda bisa mencoba simulasi skrining klinis Neura dengan mengetik `/predict` atau tanyakan *\"Apa perbedaan pikun biasa vs Alzheimer?\"*."
            )
            return {
                "matched": True,
                "reply": reply,
                "category": "konsultasi_skrining",
                "topic": "Konsultasi Kesehatan Orang Tua & Lansia",
                "suggestions": [
                    "Apa perbedaan pikun biasa vs Alzheimer?",
                    "Kapan harus membawa orang tua ke dokter?",
                    "Jelaskan tes kognitif MMSE",
                    "Simulasikan data skrining /predict"
                ]
            }

        # 2. Jika terdeteksi keluhan lupa / memori
        if any(w in text for w in ["lupa", "pikun", "ingat", "memori", "hilang", "bingung"]):
            reply = (
                "Keluhan daya ingat atau sering lupa adalah salah satu alasan paling umum dilakukannya skrining kognitif.\n\n"
                "Perlu diketahui, **tidak semua kelupaan berarti Alzheimer**. Faktor stres, kelelahan, kurang tidur, maupun defisiensi nutrisi juga bisa memicu kelupaan sesaat (*brain fog*).\n\n"
                "Namun, jika kelupaan disertai kesulitan menemukan kata-kata, mengulang pertanyaan yang sama berulang kali, atau lupa rute jalan akrab, evaluasi lebih lanjut sangat dianjurkan.\n\n"
                "Ingin tahu lebih lanjut mengenai perbedaannya atau ingin mencoba skrining mandiri?"
            )
            return {
                "matched": True,
                "reply": reply,
                "category": "gejala_dan_keluhan",
                "topic": "Konsultasi Keluhan Daya Ingat & Lupa",
                "suggestions": [
                    "Sebutkan 10 tanda awal Alzheimer",
                    "Makanan apa yang baik untuk otak?",
                    "Berapa skor normal tes MMSE?",
                    "Jalankan evaluasi /eval"
                ]
            }

        # 3. Default Konsultasi Ramah & Terstruktur
        default_reply = (
            "Halo! Saya **Neura**, asisten AI khusus skrining dini daya ingat dan deteksi risiko penyakit Alzheimer.\n\n"
            "Saya dapat membantu Anda berkonsultasi seputar:\n"
            "• **Skrining Awal**: Mengidentifikasi apakah keluhan memori Anda/keluarga tergolong wajar atau perlu diwaspadai.\n"
            "• **Gejala & Biomarker**: Menjelaskan 10 tanda awal demensia, tes kognitif MMSE, skor ADL, dan faktor risiko.\n"
            "• **Gaya Hidup & Nutrisi**: Tips diet ramah otak (Diet MIND), senam otak, serta pencegahan kepikunan.\n"
            "• **Diagnostik AI**: Menjalankan simulasi prediksi 32 biomarker dengan akurasi 95.3% menggunakan `/predict`.\n\n"
            "Silakan ketik pertanyaan atau ceritakan keluhan Anda secara santai!"
        )
        return {
            "matched": True,
            "reply": default_reply,
            "category": "konsultasi_skrining",
            "topic": "Pusat Konsultasi Kesehatan Daya Ingat Neura",
            "suggestions": [
                "Saya ingin konsultasi daya ingat",
                "Apa perbedaan pikun biasa vs Alzheimer?",
                "Makanan apa yang ramah otak?",
                "Jalankan diagnosis /predict"
            ]
        }

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
                "version": "2.0.0",
                "domain": "Alzheimers Disease Clinical Screening & Memory Consultation",
                "total_categories": len(self.dataset),
                "total_conversations": sum(len(items) for items in self.dataset.values()),
                "categories": list(self.dataset.keys()),
                "data": self.dataset
            }, f, indent=2, ensure_ascii=False)
        return str(target.resolve())

    def export_to_csv(self, file_paths: List[str] = None) -> List[str]:
        """Mengekspor ringkasan intent dataset percakapan ke file CSV."""
        import csv
        if file_paths is None:
            file_paths = ["datasets/chat_intents.csv", "data/raw/chat_intents.csv"]
        
        rows = []
        for cat, items in self.dataset.items():
            for item in items:
                patterns = ", ".join(item.get("kata_kunci", []))
                resp = ""
                for msg in item.get("percakapan", []):
                    if msg.get("role") == "assistant":
                        resp = msg.get("content", "").replace("\n", " ").strip()
                        break
                rows.append({
                    "intent": item.get("id"),
                    "pattern": patterns,
                    "response": resp
                })

        exported = []
        for p in file_paths:
            path_obj = Path(p)
            path_obj.parent.mkdir(parents=True, exist_ok=True)
            with open(path_obj, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=["intent", "pattern", "response"])
                writer.writeheader()
                writer.writerows(rows)
            exported.append(str(path_obj.resolve()))
        return exported
