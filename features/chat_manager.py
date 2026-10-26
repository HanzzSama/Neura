"""
chat_manager.py
===============
Manager class untuk dataset percakapan dan konsultasi klinis Neura AI.
Menyediakan fitur pencarian multi-kata kunci cerdas, scoring kecocokan,
konsultasi skrining daya ingat terpandu, dan ekspor data percakapan.
"""

import json
import random
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

from .chat_dataset import CHAT_DATASET, CATEGORIES

FALLBACK_RESPONSES = [
    "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Saat ini Neura AI dirancang secara khusus untuk berfokus pada skrining awal kesehatan daya ingat, deteksi dini risiko penyakit Alzheimer, analisis 32 biomarker klinis, dan edukasi gaya hidup sehat untuk otak. Silakan ajukan pertanyaan seputar kesehatan memori atau gunakan perintah /predict.",
    "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Topik atau pertanyaan yang Anda sampaikan berada di luar basis data percakapan klinis Neura AI. Saya siap membantu Anda jika ingin berkonsultasi mengenai tanda-tanda awal demensia, tes kognitif MMSE, skor kemandirian ADL, atau nutrisi ramah otak.",
    "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Sebagai asisten skrining kognitif medis, cakupan saya terbatas pada pencegahan dan deteksi dini Alzheimer, panduan caregiver lansia, serta simulasi biomarker klinis. Silakan ajukan pertanyaan terkait topik kesehatan daya ingat.",
    "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Informasi mengenai hal tersebut tidak tersedia di dalam basis pengetahuan Neura AI. Anda dapat mencoba menanyakan perbedaan pikun biasa vs Alzheimer, faktor risiko demensia, atau ketik /help untuk panduan lengkap.",
    "Mohon maaf tidak bisa menjawab sesuai pertanyaan <<nama>>. Pertanyaan tersebut berada di luar cakupan konsultasi medis Neura AI. Silakan ajukan pertanyaan seputar keluhan daya ingat orang tua, skrining faktor risiko genetik dan vaskular, atau jalankan simulasi klinis /predict."
]


class ChatDatasetManager:
    """Manajer dataset percakapan dan konsultasi cerdas Neura AI."""

    def __init__(self, dataset: Optional[Dict[str, List[Dict[str, Any]]]] = None, csv_path: str = "datasets/chat_intents.csv"):
        if dataset is not None:
            self.dataset = dataset
        else:
            self.dataset = self._load_dataset(csv_path)

    def _load_dataset(self, csv_path: str) -> Dict[str, List[Dict[str, Any]]]:
        """Memuat dataset dari CHAT_DATASET dan memperluasnya dengan datasets/chat_intents.csv."""
        import csv
        import copy
        data: Dict[str, List[Dict[str, Any]]] = copy.deepcopy(CHAT_DATASET)

        p = Path(csv_path)
        if not p.exists():
            return data

        try:
            with open(p, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    intent = row.get("intent", "").strip()
                    pattern_str = row.get("pattern", "").strip()
                    response = row.get("response", "").strip()
                    if not intent or not response:
                        continue

                    # Tentukan kategori berdasarkan prefix intent
                    if intent.startswith("salam") or intent.startswith("tutup") or intent.startswith("feedback") or intent.startswith("voice_salam") or intent.startswith("voice_stop"):
                        cat = "sapaan_dan_interaksi"
                    elif intent.startswith("santai"):
                        cat = "percakapan_santai"
                    elif intent.startswith("emosi") or intent.startswith("mental"):
                        cat = "kesehatan_mental"
                    elif intent.startswith("gejala") or intent.startswith("voice_gejala") or intent.startswith("voice_bpsd"):
                        cat = "gejala_dan_keluhan"
                    elif intent.startswith("tes") or intent.startswith("biomarker") or intent.startswith("voice_mmse") or intent.startswith("voice_biomarker"):
                        cat = "biomarker_dan_tes"
                    elif intent.startswith("cegah") or intent.startswith("voice_cegah"):
                        cat = "pencegahan_dan_gaya_hidup"
                    elif intent.startswith("dokter") or intent.startswith("caregiver") or intent.startswith("voice_caregiver") or intent.startswith("voice_klinis"):
                        cat = "penanganan_dan_ke_dokter"
                    elif intent.startswith("bantuan") or intent.startswith("model"):
                        cat = "panduan_perintah_model"
                    elif intent.startswith("fallback") or intent.startswith("voice_fallback"):
                        cat = "di_luar_dataset"
                    elif intent.startswith("voice_adl"):
                        cat = "konsultasi_skrining"
                    else:
                        cat = "konsultasi_skrining"

                    if cat not in data:
                        data[cat] = []

                    patterns = [k.strip() for k in pattern_str.split(",") if k.strip()]
                    existing = next((item for item in data[cat] if item.get("id") == intent), None)
                    if existing:
                        current_kw = existing.get("kata_kunci", [])
                        for p_item in patterns:
                            if p_item not in current_kw:
                                current_kw.append(p_item)
                        existing["kata_kunci"] = current_kw
                        if "responses" not in existing:
                            existing["responses"] = []
                        if response and response not in existing["responses"]:
                            existing["responses"].append(response)
                    else:
                        data[cat].append({
                            "id": intent,
                            "topik": intent.replace("_", " ").title(),
                            "kata_kunci": patterns,
                            "tags": patterns[:4],
                            "responses": [response] if response else [],
                            "suggestions": [
                                "Apa perbedaan pikun biasa vs Alzheimer?",
                                "Jelaskan 10 tanda awal Alzheimer",
                                "Simulasikan data skrining /predict"
                            ],
                            "percakapan": [
                                {"role": "user", "content": patterns[0] if patterns else intent},
                                {"role": "assistant", "content": response}
                            ]
                        })
        except Exception:
            pass

        return data

    def get_fallback_responses(self, user_name: str = "") -> List[str]:
        """
        Mengambil daftar (array) jawaban intent fallback/out-of-scope dan mengganti <<nama>> dengan nama user.
        """
        name_display = user_name.strip() if user_name and user_name.strip() else "Hanzz"
        responses = []

        # Ambil dari kategori di_luar_dataset jika tersedia di dataset
        for item in self.dataset.get("di_luar_dataset", []):
            for r in item.get("responses", []):
                if r and r not in responses:
                    responses.append(r)
            for turn in item.get("percakapan", []):
                if turn.get("role") == "assistant" and turn.get("content"):
                    if turn["content"] not in responses:
                        responses.append(turn["content"])

        if not responses:
            responses = list(FALLBACK_RESPONSES)

        return [r.replace("<<nama>>", name_display) for r in responses]

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

    def find_best_response(self, user_message: str, user_name: str = "") -> Optional[str]:
        """
        Mencari respons asisten terbaik berupa string (kompatibilitas backward).
        """
        res = self.find_consultation_response(user_message, user_name=user_name)
        return res.get("reply") if res and res.get("matched") else None

    def find_consultation_response(self, user_message: str, user_name: str = "") -> Dict[str, Any]:
        """
        Menganalisis pesan pengguna dan mengembalikan respons konsultasi terstruktur
        beserta kategori, topik, dan saran pertanyaan lanjutan (suggestions).
        """
        cleaned = user_message.lower().strip()
        tokens = re.findall(r'\b[a-zA-Z0-9_\-]+\b', cleaned)

        # Daftar kata tugas dan stopwords umum dalam Bahasa Indonesia
        ID_STOPWORDS = {
            "yang", "untuk", "pada", "ke", "di", "dari", "ini", "itu", "dengan", "dan", "atau",
            "adalah", "sebagai", "saat", "akan", "bisa", "ada", "tidak", "apa", "siapa", "kapan",
            "dimana", "mengapa", "kenapa", "bagaimana", "berapa", "cara", "tolong", "mohon",
            "saya", "aku", "kamu", "anda", "dia", "mereka", "kita", "kami", "ya", "saja", "lagi",
            "pun", "juga", "nah", "dong", "sih", "kan", "loh", "deh", "tentang", "mengenai",
            "hari", "ini", "hari ini", "sekarang", "buat", "bikin"
        }

        best_match = None
        best_score = 0
        best_category = None

        content_tokens = [t for t in tokens if len(t) >= 4 and t not in ID_STOPWORDS]

        for cat, items in self.dataset.items():
            for item in items:
                score = 0
                topic_lower = item.get("topik", "").lower()
                matched_phrases = []

                # 1. Cek kecocokan kata kunci frasa (phrase match dengan word-boundary)
                for kw in item.get("kata_kunci", []):
                    kw_clean = kw.lower().strip()
                    if not kw_clean:
                        continue

                    escaped_kw = re.escape(kw_clean)
                    if re.search(r'(?:^|\b)' + escaped_kw + r'(?:\b|$)', cleaned):
                        if kw_clean in ID_STOPWORDS:
                            score += 10
                        else:
                            score += 60 + len(kw_clean) * 2
                            matched_phrases.append(kw_clean)

                # 2. Cek token overlap untuk kata-kata bermakna (non-stopwords)
                item_all_text = (
                    " ".join(item.get("kata_kunci", [])) + " " +
                    " ".join(item.get("tags", [])) + " " +
                    topic_lower
                ).lower()

                token_matches = sum(1 for token in set(content_tokens) if re.search(r'\b' + re.escape(token) + r'\b', item_all_text))
                if token_matches >= 3:
                    score += token_matches * 15
                elif token_matches == 2:
                    score += 25
                elif token_matches == 1 and matched_phrases:
                    score += 10

                # 3. Cek tags spesifik
                for tag in item.get("tags", []):
                    tag_clean = tag.lower().strip()
                    if tag_clean and tag_clean not in ID_STOPWORDS and tag_clean in tokens:
                        score += 15

                if score > best_score:
                    best_score = score
                    best_match = item
                    best_category = cat

        # Tentukan nama tampilan: ganti <<nama>> dengan nama user
        name_display = user_name.strip() if user_name and user_name.strip() else "Hanzz"

        # Jika ditemukan kecocokan dengan skor memadai (>= 50)
        if best_match and best_score >= 50:
            responses_list = best_match.get("responses", [])
            reply_candidate = ""
            for turn in best_match.get("percakapan", []):
                if turn.get("role") == "assistant":
                    reply_candidate = turn.get("content", "")
                    break

            if not responses_list and reply_candidate:
                responses_list = [reply_candidate]

            # Ganti <<nama>> dengan nama user pada seluruh array jawaban intent
            formatted_responses = [r.replace("<<nama>>", name_display) for r in responses_list]
            selected_reply = random.choice(formatted_responses) if formatted_responses else reply_candidate.replace("<<nama>>", name_display)

            return {
                "matched": True,
                "reply": selected_reply,
                "responses": formatted_responses,
                "category": best_category,
                "topic": best_match.get("topik"),
                "suggestions": best_match.get("suggestions", []),
                "score": best_score,
            }

        # ---------------------------------------------------------------------
        # Fallback jika di luar dataset percakapan
        # ---------------------------------------------------------------------
        fallback = self._generate_contextual_consultation(cleaned, tokens, user_name=name_display)
        return fallback

    def _generate_contextual_consultation(self, text: str, tokens: List[str], user_name: str = "") -> Dict[str, Any]:
        """Menghasilkan pesan fallback jika prompt di luar dataset percakapan."""

        name_display = user_name.strip() if user_name and user_name.strip() else "Hanzz"

        # 1. Jika terdeteksi keluhan usia lanjut / orang tua terkait kesehatan kognitif
        elderly_words = ["ibu", "ayah", "bapak", "kakek", "nenek", "orang tua", "lansia"]
        concern_words = ["lupa", "pikun", "ingat", "sakit", "bingung", "rawat", "gejala", "kognitif", "periksa", "kesehatan", "tersesat", "jatuh"]
        if any(w in text for w in elderly_words) and any(w in text for w in concern_words):
            reply = (
                f"Terima kasih sudah menceritakan kondisi keluarga Anda, {name_display}.\n\n"
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
                "responses": [reply],
                "category": "konsultasi_skrining",
                "topic": "Konsultasi Kesehatan Orang Tua & Lansia",
                "suggestions": [
                    "Apa perbedaan pikun biasa vs Alzheimer?",
                    "Kapan harus membawa orang tua ke dokter?",
                    "Jelaskan tes kognitif MMSE",
                    "Simulasikan data skrining /predict"
                ]
            }

        # 2. Jika terdeteksi pertanyaan kognitif atau demensia spesifik
        memory_words = ["pikun", "alzheimer", "demensia", "daya ingat", "hilang ingatan", "kepikunan"]
        if any(w in text for w in memory_words) or ("lupa" in text and any(w in text for w in ["sering", "parah", "nama", "jalan", "barang", "ulang", "kunci", "wajar"])):
            reply = (
                f"Keluhan daya ingat atau sering lupa yang Anda tanyakan, {name_display}, adalah salah satu alasan paling umum dilakukannya skrining kognitif.\n\n"
                "Perlu diketahui, **tidak semua kelupaan berarti Alzheimer**. Faktor stres, kelelahan, kurang tidur, maupun defisiensi nutrisi juga bisa memicu kelupaan sesaat (*brain fog*).\n\n"
                "Namun, jika kelupaan disertai kesulitan menemukan kata-kata, mengulang pertanyaan yang sama berulang kali, atau lupa rute jalan akrab, evaluasi lebih lanjut sangat dianjurkan.\n\n"
                "Ingin tahu lebih lanjut mengenai perbedaannya atau ingin mencoba skrining mandiri?"
            )
            return {
                "matched": True,
                "reply": reply,
                "responses": [reply],
                "category": "gejala_dan_keluhan",
                "topic": "Konsultasi Keluhan Daya Ingat & Lupa",
                "suggestions": [
                    "Sebutkan 10 tanda awal Alzheimer",
                    "Makanan apa yang baik untuk otak?",
                    "Berapa skor normal tes MMSE?",
                    "Jalankan evaluasi /eval"
                ]
            }

        # 3. Fallback di Luar Dataset Percakapan (Out-of-Scope)
        # Ambil daftar array jawaban dari intent fallback/di_luar_dataset dengan mengganti <<nama>> = nama user
        fallback_responses = self.get_fallback_responses(user_name=name_display)
        selected_reply = random.choice(fallback_responses) if fallback_responses else f"Mohon maaf tidak bisa menjawab sesuai pertanyaan {name_display}."

        return {
            "matched": False,
            "reply": selected_reply,
            "responses": fallback_responses,
            "category": "di_luar_dataset",
            "topic": "Di Luar Cakupan Percakapan",
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
