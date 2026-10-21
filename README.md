# 🧠 Neura — Machine Learning Chat Assistant

Neura adalah platform asisten Machine Learning interaktif berbasis **TensorFlow** dan arsitektur **MVC (Model-View-Controller)** yang modular, dilengkapi dengan antarmuka web modern bergaya **Claude AI** (Anthropic) dengan akurasi visual tinggi.

![Neura Claude UI](public/assets/neura_logo.jpg)

---

## ✨ Fitur Utama

- **🎨 Claude AI Interface (~95% Visual Fidelity):**
  - Palet warna hangat *Warm Linen* (`#FAF9F5`) dan *Oat Sidebar* (`#F0EEE6`).
  - Aksen warna *Terracotta / Burnt Orange* (`#D97757`) khas Anthropic Claude.
  - Tipografi elegan kombinasi *Newsreader* (serif) & *Inter* (sans-serif).
  - Tampilan *Hero Greeting* dinamis ("Good morning", "Good afternoon", "Good evening").
  - Hero action cards untuk training, prediksi, evaluasi, dan inspeksi arsitektur.
  - Floating bottom input card dengan auto-grow textarea dan quick-command pills.
  - Mode ganda: **Warm Linen (Light)** dan **Obsidian (Dark)**.
  - Model architecture modal / popover.

- **🤖 TensorFlow Machine Learning Backend:**
  - Multi-Layer Perceptron (MLP) dengan Keras 3 / TensorFlow.
  - 128 input features $\rightarrow$ Dense(64, ReLU) $\rightarrow$ Dense(32, ReLU) $\rightarrow$ 10 output classes (Softmax).
  - Training asynchronous (thread-safe) dengan progress tracking real-time.
  - Evaluasi metrik (loss, accuracy) tersimpan otomatis ke `public/reports/`.
  - Inferensi sample dengan visualisasi probabilitas top 5 kelas.

- **🏛️ Arsitektur MVC Modular:**
  - Pemisahan ketat antara `public/` (asset produksi, checkpoint, reports, frontend) dan `src/dev/` (kode sumber, model, controller, data pipeline).

---

## 📁 Struktur Direktori

```
Neura/
├── public/                       # Aset publik & frontend produksi
│   ├── index.html                # Claude AI Chat Interface
│   ├── css/                      # Stylesheet eksternal (style.css)
│   ├── js/                       # Client-side scripts (app.js)
│   ├── assets/                   # Logo & favicon aset
│   ├── checkpoints/              # Checkpoint model terlatih (.keras)
│   └── reports/                  # Log & laporan evaluasi (.json)
├── src/
│   ├── dev/                      # Core backend & modul machine learning
│   │   ├── controllers/          # Business logic & command handler
│   │   ├── models/               # Model neural network & abstract base
│   │   ├── views/                # CLI view & formatter
│   │   ├── data/                 # Dataset loader & synthetic generator
│   │   └── utils/                # Config loader & logging
│   ├── data/                     # Raw & processed data
│   └── public/                   # Shared public library
├── server.py                     # Flask web server & REST API
├── main.py                       # CLI entry point
├── requirements.txt              # Dependencies produksi
├── requirements-dev.txt          # Dependencies development & testing
├── SETUP.md                      # Panduan lengkap setup dari nol
└── README.md                     # Dokumentasi project
```

---

## 🚀 Quick Start

Untuk panduan instalasi langkah-demi-langkah dari `git clone` hingga running di Windows, Linux, dan macOS, silakan baca [SETUP.md](file:///d:/JupyterHanzz/Neura/SETUP.md).

### Ringkasan Menjalankan Web UI:

```powershell
# 1. Aktifkan virtual environment
venv\Scripts\activate

# 2. Jalankan Flask server
python server.py
```

Buka browser di:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 💬 Perintah Chat Interaktif (ML Commands)

Anda dapat mengetik perintah berikut di kolom chat:

| Perintah | Deskripsi |
|---|---|
| `/status` | Cek status model, kesiapan checkpoint, dan environment |
| `/train [N]` | Melatih model selama N epoch (default: 5) |
| `/eval` | Evaluasi model pada dataset pengujian (test loss & accuracy) |
| `/predict` | Menjalankan inferensi dan menampilkan top 5 probabilitas kelas |
| `/progress` | Menampilkan progres dan log epoch pelatihan terbaru |
| `/help` | Menampilkan panduan seluruh perintah |

---

## 🔌 REST API Endpoints

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Melayani web chat UI (`public/index.html`) |
| `GET` | `/api/status` | Informasi status model & server |
| `POST` | `/api/train` | Memulai training model secara async (`{"epochs": 5}`) |
| `GET` | `/api/train/progress` | Mendapatkan progres training real-time |
| `POST` | `/api/evaluate` | Menjalankan evaluasi test metrics |
| `POST` | `/api/predict` | Menjalankan inferensi pada sampel data |

---

## 🛠️ Lisensi & Kredit

- **Engine:** TensorFlow, Keras, Flask
- **UI Design:** Terinspirasi dari [Claude AI](https://claude.ai) oleh Anthropic.
