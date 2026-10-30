# 🧠 Neura AI — Platform Klinis Deteksi Dini Alzheimer

<div align="center">

![Neura AI](public/assets/neura_logo.jpg)

**Platform kecerdasan buatan klinis berbasis 32 biomarker multimodal untuk evaluasi dini risiko penyakit Alzheimer.**

[![Version](https://img.shields.io/badge/version-v1.95.0%20Iris-D97757?style=flat-square&logo=github)](https://github.com/HanzzSama/Neura)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-Gradient%20Boosting-FF6600?style=flat-square)](https://xgboost.readthedocs.io)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![LiveKit](https://img.shields.io/badge/LiveKit-WebRTC%20Voice-009EFF?style=flat-square)](https://livekit.io)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

</div>

---

## 📋 Daftar Isi

- [Tentang Platform](#-tentang-platform)
- [Fitur Utama](#-fitur-utama)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Struktur Direktori](#-struktur-direktori)
- [Tech Stack & Dependencies](#-tech-stack--dependencies)
- [Clone & Menjalankan Project](#-clone--menjalankan-project)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [REST API Endpoints](#-rest-api-endpoints)
- [Sistem Autentikasi Admin 2FA](#-sistem-autentikasi-admin-2fa)
- [Perintah Chat Interaktif](#-perintah-chat-interaktif)
- [Dataset & Model ML](#-dataset--model-ml)
- [Voice AI Agent](#-voice-ai-agent)
- [Git — Push, Pull & Kolaborasi](#-git--push-pull--kolaborasi)
- [Troubleshooting](#-troubleshooting)
- [Kontribusi & Tim](#-kontribusi--tim)
- [Lisensi](#-lisensi)

---

## 🎯 Tentang Platform

**Neura AI** (Codename: *Iris*, v1.95.0 Beta) adalah platform kecerdasan buatan klinis yang dirancang khusus untuk mendukung evaluasi dini risiko penyakit Alzheimer. Platform ini mengintegrasikan model *gradient boosting* XGBoost yang terlatih pada 2.149 rekam medis dengan **32 biomarker multimodal**, mencapai akurasi prediksi **94.4%** dan ROC-AUC **0.933**.

Neura AI bukan sekadar aplikasi prediksi — ia merupakan ekosistem platform lengkap yang mencakup:

- **Landing page klinis** dengan desain editorial premium dan efek parallax scroll cinematic.
- **Workspace AI interaktif** bergaya Claude AI (Anthropic) dengan sidebar, chat interface, dan panel analitik.
- **Sistem autentikasi multi-tier** (Firebase Auth + OTP 2FA khusus Admin melalui email SMTP).
- **Voice AI Agent** berbasis LiveKit WebRTC + Deepgram STT + OpenAI GPT-4o untuk konsultasi berbicara.
- **REST API** modular untuk training ML, inferensi prediksi, evaluasi metrik, dan manajemen pengguna.
- **Panel Admin** dengan kontrol penuh atas dataset, retraining model, dan konfigurasi sistem.

> **Target Pengguna:** Tenaga Kesehatan (dokter, perawat), Administrator Sistem, dan Pengguna Umum (pasien/mandiri).

---

## ✨ Fitur Utama

### 🤖 Kecerdasan Buatan & Machine Learning

| Fitur | Detail |
|---|---|
| **Model Inti** | XGBoost Gradient Boosting v3.x |
| **Input Features** | 32 biomarker klinis multimodal (MMSE, ADL, biomarker kognitif, faktor gaya hidup) |
| **Dataset Training** | 2.149 rekam medis (`alzheimers_disease_data.csv`) |
| **Akurasi** | 94.4% (Test Set) |
| **F1-Score** | 92.0% |
| **ROC-AUC** | 0.933 |
| **Inferensi** | < 1.2 detik per prediksi |
| **Task** | Binary Classification (Alzheimer Risk: Positive / Negative) |
| **Training Mode** | Asynchronous thread-safe dengan live progress streaming |

### 🎨 Antarmuka & Desain

- **Landing page editorial** dengan split-layout hero section, parallax cinematic scroll (gambar scale-down + judul bergeser kiri seiring scroll), dan animasi glassmorphism.
- **Workspace chat** bergaya Claude AI dengan palet *Warm Linen* (`#FAF9F5`) dan aksen *Terracotta* (`#D97757`).
- **Dynamic Island** notch dengan status model, timer, dan animasi spring physics di atas layar.
- **Mode tampilan** ganda: Light (*Warm Linen*) dan Dark (*Obsidian*).
- **Bilingual** (Bahasa Indonesia / English) dengan toggle real-time tanpa reload halaman.
- **Responsive design** penuh untuk desktop, tablet, dan mobile.
- **Micro-animations** premium: hover, loading shimmer, scroll-reactive header, transisi halaman.
- **Hero action cards** untuk Training ML, Prediksi, Evaluasi, dan Inspeksi Arsitektur Model.

### 🔐 Keamanan & Autentikasi

- **Firebase Authentication** untuk registrasi dan login pengguna umum (email/password + OAuth).
- **Email Verification** dengan link verifikasi kustom HTML yang dikirim via SMTP Gmail.
- **Admin 2FA OTP** — Admin login menggunakan *email custom* (`@neura.dr.id`), kode OTP 6-digit dikirim ke email asli terdaftar, valid 5 menit, maksimal 5 percobaan.
- **Session token** UUID-based server-side untuk validasi sesi admin (berlaku 24 jam).
- **Auth Guard** proteksi route-level di frontend agar workspace hanya bisa diakses pengguna terautentikasi.

### 🎙️ Voice AI Agent

- **LiveKit WebRTC** untuk komunikasi suara real-time latensi rendah.
- **Deepgram STT** (Speech-to-Text) streaming real-time.
- **OpenAI GPT-4o Mini** sebagai "otak" agent klinis.
- **TTS** dengan OpenAI TTS atau Cartesia (ultra-cepat, opsional).
- **Silence Detection** otomatis via Silero VAD.

---

## 🏛️ Arsitektur Sistem

```
+--------------------------------------------------------------------------+
|                          NEURA AI PLATFORM                               |
+--------------------+--------------------+--------------------------------+
|   FRONTEND (SPA)   |   FLASK BACKEND    |    EXTERNAL SERVICES           |
|  +--------------+  |  +--------------+  |  +------------------------+    |
|  | welcome.html |  |  |  server.py   |  |  | Firebase Auth+Firestore|    |
|  |  (Landing)   |  |  |  (REST API)  |  |  | LiveKit WebRTC Cloud   |    |
|  +--------------+  |  +--------------+  |  | Deepgram STT API       |    |
|  |  index.html  |  |  |    core/     |  |  | OpenAI GPT-4o Mini     |    |
|  | (Workspace)  |  |  | admin_config |  |  | Gmail SMTP             |    |
|  +--------------+  |  | email_sender |  |  +------------------------+    |
|  |  Vanilla JS  |  |  | config       |  |                               |
|  |  CSS3        |  |  +--------------+  |    ML ENGINE                  |
|  |  Lenis       |  |  |    app/      |  |  +------------------------+    |
|  |  Firebase    |  |  |   models/    |  |  | XGBoost 3.x            |    |
|  |  LiveKit     |  |  | controllers/ |  |  | scikit-learn           |    |
|  +--------------+  |  |   views/     |  |  | pandas / numpy         |    |
|                    |  +--------------+  |  | alzheimers_disease_data|    |
+--------------------+--------------------+--+------------------------+----+
                              |
                    +---------v---------+
                    |   about_app.json  |  <- Single Source of Truth
                    |   configs/*.yaml  |
                    |   datasets/*.csv  |
                    +-------------------+
```

**Alur Request:**
```
Browser -> Flask server.py -> core/* / app/* -> ML Model / Firebase / LiveKit -> JSON Response
```

---

## 📁 Struktur Direktori

```
Neura/
|
+-- public/                         # Frontend produksi (SPA assets)
|   +-- welcome.html                # Landing page editorial (Hero + Auth Drawer)
|   +-- index.html                  # Workspace chat & AI interface
|   +-- verify-email.html           # Halaman verifikasi email Firebase custom
|   +-- favicon.ico
|   +-- css/                        # Semua stylesheet
|   |   +-- welcome.css             # Desain landing page + parallax
|   |   +-- style.css               # Workspace chat styles
|   |   +-- auth-hero.css           # Auth drawer & OTP card
|   |   +-- smooth-scroll.css       # Lenis scroll styles
|   +-- js/                         # Semua client-side scripts
|   |   +-- welcome.js              # Landing page interactions & bilingual
|   |   +-- app.js                  # Workspace logic, chat, profile sync
|   |   +-- auth-hero.js            # Login, register, OTP 2FA flow
|   |   +-- auth-guard.js           # Route protection & session verification
|   |   +-- smooth-scroll.js        # Lenis physics + hero parallax scroller
|   |   +-- firebase-config.js      # Firebase initialization from /api
|   +-- assets/                     # Logo, gambar, favicon
|   +-- checkpoints/                # Model XGBoost checkpoint (.json)
|   +-- reports/                    # Laporan evaluasi model (.json)
|   +-- logs/                       # Log training per run
|   +-- exports/                    # Export hasil prediksi
|
+-- core/                           # Utilitas backend inti
|   +-- admin_config.py             # Daftar & mapping akun admin 2FA
|   +-- config.py                   # Config loader (YAML + env)
|   +-- email_sender.py             # SMTP email sender (OTP + verifikasi)
|   +-- logger.py                   # Sistem logging Rich + file
|   +-- registry.py                 # Registry model & plugin
|   +-- exceptions.py               # Custom exception classes
|
+-- app/                            # MVC Application Layer
|   +-- models/                     # Model ML & abstract base class
|   |   +-- base_model.py           # Abstract BaseModel (fit, predict, save, load)
|   |   +-- neural_network.py       # XGBoost wrapper implementation
|   |   +-- schemas/                # Pydantic schemas validasi data
|   +-- controllers/                # Business logic & command handler
|   +-- views/                      # Output formatter (CLI & API)
|
+-- features/                       # Dataset percakapan & intent matcher
|   +-- chat_dataset.py             # Array percakapan terklasifikasi
|   +-- chat_dataset.json           # Export JSON dataset chat
|   +-- chat_manager.py             # Intent matching & pencarian
|
+-- datasets/                       # Dataset CSV untuk training ML
|   +-- alzheimers_disease_data.csv # Dataset utama (2.149 rekam medis, 35 fitur)
|   +-- README.md                   # Dokumentasi skema dataset
|
+-- configs/                        # File konfigurasi YAML
|   +-- default.yaml                # Path, hyperparameter, logging config
|
+-- data/                           # Data mentah & olahan
+-- training/                       # Script training standalone
+-- scripts/                        # Utility & automation scripts
+-- notebooks/                      # Jupyter notebooks eksperimen
+-- tests/                          # Unit & integration tests
|
+-- server.py                       # * Flask web server & REST API utama
+-- main.py                         # CLI entry point (mode terminal)
+-- voice_agent.py                  # LiveKit Voice AI Agent runner
+-- about_app.json                  # * Metadata platform (Single Source of Truth)
|
+-- requirements.txt                # Dependencies produksi
+-- requirements-dev.txt            # Dependencies development & testing
+-- .env                            # Konfigurasi lokal (TIDAK di-commit ke Git)
+-- .env.example                    # Template konfigurasi
+-- .gitignore                      # File & folder yang diabaikan Git
+-- README.md                       # Dokumentasi ini
```

---

## 🛠️ Tech Stack & Dependencies

### Backend

| Library | Versi | Fungsi |
|---|---|---|
| `flask` | >= 3.0.0 | Web framework & REST API server |
| `flask-cors` | >= 4.0.0 | Cross-Origin Resource Sharing |
| `python-dotenv` | >= 1.0.0 | Manajemen environment variables (.env) |
| `PyYAML` | >= 6.0 | Parsing file konfigurasi YAML |
| `rich` | >= 13.0.0 | Output terminal berwarna & logger premium |

### Machine Learning

| Library | Versi | Fungsi |
|---|---|---|
| `xgboost` | >= 2.0.0 | Model utama: Gradient Boosting Classifier |
| `scikit-learn` | >= 1.3.0 | Pipeline preprocessing & metrik evaluasi |
| `pandas` | >= 2.0.0 | Manipulasi & analisis data tabular |
| `numpy` | >= 1.24.0 | Operasi array & komputasi numerik |
| `matplotlib` | >= 3.7.0 | Visualisasi grafik & plot |

### Voice AI

| Library | Versi | Fungsi |
|---|---|---|
| `livekit` | >= 1.1.20 | WebRTC real-time communication |
| `livekit-api` | >= 1.2.2 | LiveKit server API & token generation |
| `livekit-agents` | >= 1.8.8 | Agent framework untuk AI voice |
| `livekit-plugins-silero` | >= 1.8.8 | VAD (Voice Activity Detection) |
| `livekit-plugins-deepgram` | >= 1.8.8 | STT (Speech-to-Text) Deepgram |
| `livekit-plugins-openai` | >= 1.8.8 | LLM + TTS OpenAI integration |

### Frontend

| Teknologi | Fungsi |
|---|---|
| **Vanilla JS (ES6+)** | Logic interaktif tanpa framework berat |
| **CSS3 Custom Properties** | Desain sistem berbasis variabel CSS |
| **Lenis** | Smooth momentum scroll physics |
| **Firebase JS SDK v10** | Auth, Firestore, real-time listener |
| **LiveKit Client** | WebRTC audio di browser |

---

## 🚀 Clone & Menjalankan Project

Ikuti langkah berikut secara urut untuk menjalankan Neura AI dari nol di komputer Anda.

### Prasyarat

Sebelum memulai, pastikan perangkat lunak berikut sudah terinstal:

- **Python 3.10, 3.11, atau 3.12** — Unduh di [python.org](https://python.org) *(centang "Add python.exe to PATH" saat instalasi di Windows)*
- **Git** — Unduh di [git-scm.com](https://git-scm.com)
- **Akun GitHub** *(opsional, diperlukan untuk push/pull kode)*

Verifikasi instalasi:
```bash
python --version   # Pastikan: Python 3.10.x / 3.11.x / 3.12.x
git --version      # Pastikan: git version 2.x.x
```

---

### Langkah 1 — Clone Repository

**Clone** berarti mengunduh seluruh kode sumber beserta histori Git dari GitHub ke komputer Anda.

```bash
git clone https://github.com/HanzzSama/Neura.git
```

Setelah clone selesai, masuk ke folder project:

```bash
cd Neura
```

> [!NOTE]
> Perintah `cd Neura` berpindah masuk ke direktori project. Semua perintah selanjutnya **harus dijalankan dari dalam folder ini**.

---

### Langkah 2 — Buat Virtual Environment

**Virtual Environment** (`venv`) adalah lingkungan Python terisolasi yang menjaga agar *package* yang Anda instal untuk Neura tidak bentrok dengan instalasi Python lain di komputer Anda.

```bash
python -m venv venv
```

Perintah ini membuat folder `venv/` di dalam folder `Neura/`.

---

### Langkah 3 — Aktifkan Virtual Environment

Pilih perintah sesuai sistem operasi dan terminal yang Anda gunakan:

**Windows — PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

> [!TIP]
> Jika muncul error *"cannot be loaded because running scripts is disabled on this system"*, jalankan perintah berikut **sekali saja** di PowerShell sebagai langkah awal:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Setelah itu jalankan kembali `.\venv\Scripts\Activate.ps1`.

**Windows — Command Prompt (CMD):**
```cmd
venv\Scripts\activate.bat
```

**macOS / Linux — Terminal:**
```bash
source venv/bin/activate
```

Tanda berhasil: Akan muncul `(venv)` di sebelah kiri baris perintah, contoh: `(venv) C:\Neura>`.

---

### Langkah 4 — Install Dependencies

Setelah `venv` aktif, perbarui `pip` lalu instal seluruh pustaka yang dibutuhkan:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

> [!NOTE]
> Proses ini membutuhkan waktu beberapa menit tergantung kecepatan internet karena mengunduh paket seperti XGBoost, Flask, LiveKit, dll.

---

### Langkah 5 — Konfigurasi Environment (.env)

Salin file template konfigurasi:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Buka file `.env` dengan teks editor, lalu isi variabel yang diperlukan (lihat bagian [Konfigurasi Environment](#-konfigurasi-environment) di bawah).

> [!IMPORTANT]
> File `.env` sudah ditambahkan di `.gitignore` sehingga **tidak akan pernah ter-upload ke GitHub** secara tidak sengaja. Jangan pernah commit file `.env` yang berisi API key nyata.

---

### Langkah 6 — Jalankan Server

Pastikan `(venv)` masih aktif, lalu jalankan Flask web server:

```bash
python server.py
```

**Atau tanpa mengaktifkan venv manual terlebih dahulu (Windows):**
```powershell
.\venv\Scripts\python.exe server.py
```

Server berjalan bila muncul pesan:
```
  Neura Web Server
  Open: http://localhost:5000
```

Buka browser dan akses:

| Halaman | URL |
|---|---|
| Landing Page | http://localhost:5000 |
| Workspace AI | http://localhost:5000/app |
| Verifikasi Email | http://localhost:5000/verify-email |

---

### Langkah 7 — (Opsional) Jalankan Voice AI Agent

Di terminal **baru** (venv tetap harus aktif):

```bash
python voice_agent.py dev
```

Pastikan variabel `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `OPENAI_API_KEY`, dan `DEEPGRAM_API_KEY` sudah terisi di `.env`.

---

### Langkah 8 — (Opsional) Mode CLI / Terminal

Untuk berinteraksi langsung via terminal tanpa membuka browser:

```bash
python main.py
```

---

## ⚙️ Konfigurasi Environment

Salin `.env.example` menjadi `.env` dan isi nilainya:

```env
# --- Lingkungan ---
NEURA_ENV=development

# --- LiveKit WebRTC (Voice AI) ---
# Buat project gratis di: https://cloud.livekit.io/
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# --- OpenAI (Brain AI + TTS) ---
# Dapatkan key di: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key

# --- Deepgram (Speech-to-Text) ---
# Daftar gratis di: https://deepgram.com/
DEEPGRAM_API_KEY=your_deepgram_api_key

# --- Firebase (Auth & Firestore) ---
# Buat project di: https://console.firebase.google.com/
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (untuk OTP & email verification)
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/serviceAccount.json
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id

# --- SMTP (Email OTP & Verifikasi) ---
# Gunakan Gmail App Password: https://myaccount.google.com/apppasswords
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password

# --- Cartesia TTS (Opsional) ---
CARTESIA_API_KEY=
```

> [!IMPORTANT]
> Variabel **wajib** untuk fitur inti: `FIREBASE_*` (autentikasi), `SMTP_EMAIL` + `SMTP_PASSWORD` (email OTP Admin).
> Variabel `LIVEKIT_*`, `OPENAI_API_KEY`, `DEEPGRAM_API_KEY` hanya diperlukan jika menggunakan fitur Voice AI.

---

## 🔌 REST API Endpoints

### Halaman & Navigasi

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/` | Landing page (`welcome.html`) |
| `GET` | `/welcome` | Alias landing page |
| `GET` | `/app` | Workspace AI (`index.html`) |
| `GET` | `/chat` | Alias workspace |
| `GET` | `/verify-email` | Halaman verifikasi email |

### Metadata & Config

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/about` | Metadata platform dari `about_app.json` (auto-reload) |
| `GET` | `/api/firebase-config` | Konfigurasi Firebase untuk client JS |
| `GET` | `/api/status` | Status server, model, checkpoint, dan environment |

### Machine Learning

| Method | Endpoint | Body / Params | Deskripsi |
|---|---|---|---|
| `POST` | `/api/train` | `{"epochs": 10}` | Mulai training model XGBoost secara async |
| `GET` | `/api/train/progress` | — | Progres training real-time (streaming JSON) |
| `GET/POST` | `/api/evaluate` | — | Evaluasi model: accuracy, F1, ROC-AUC |
| `GET/POST` | `/api/predict` | — | Inferensi prediksi risiko Alzheimer |

### Chat & Dataset

| Method | Endpoint | Body / Params | Deskripsi |
|---|---|---|---|
| `POST` | `/api/chat` | `{"message": "..."}` | Proses pesan chat berbasis dataset NLP |
| `GET` | `/api/features/categories` | — | Daftar kategori & statistik dataset chat |
| `GET` | `/api/features/chat-dataset` | `?category=&q=` | Query dataset percakapan dengan filter |

### Email & Autentikasi User

| Method | Endpoint | Body | Deskripsi |
|---|---|---|---|
| `POST` | `/api/send-verification-email` | `{"email": "...", "displayName": "..."}` | Kirim email verifikasi Firebase via SMTP |

### Admin 2FA System

| Method | Endpoint | Body | Deskripsi |
|---|---|---|---|
| `GET` | `/api/admin/emails` | — | Daftar email custom admin terdaftar |
| `POST` | `/api/admin/check-email` | `{"email": "..."}` | Cek apakah email adalah admin terdaftar |
| `POST` | `/api/admin/send-otp` | `{"email": "..."}` | Generate & kirim OTP 6-digit ke email asli admin |
| `POST` | `/api/admin/verify-otp` | `{"email": "...", "otp": "..."}` | Verifikasi kode OTP & buat session token |
| `GET/POST` | `/api/admin/verify-session` | `{"token": "..."}` | Validasi session token admin (berlaku 24 jam) |
| `POST` | `/api/admin/logout` | `{"token": "..."}` | Hapus session admin di server |

### LiveKit Voice AI

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/livekit/config` | Cek status konfigurasi LiveKit |
| `GET/POST` | `/api/livekit/token` | Generate token akses room WebRTC |

---

## 🔐 Sistem Autentikasi Admin 2FA

Neura menggunakan sistem autentikasi dua faktor khusus untuk akun Administrator, terpisah dari Firebase Auth reguler.

### Alur Login Admin

```
1. Admin memasukkan email custom (misal: hanzz@neura.dr.id)
   -> Frontend mendeteksi secara instan dari daftar lokal

2. Sistem masuk ke mode "2FA Aktif" — field password disembunyikan

3. Admin klik tombol "Verifikasi 2FA"
   -> POST /api/admin/send-otp -> Server generate OTP 6-digit
   -> OTP dikirim via SMTP ke email asli admin

4. Admin memasukkan 6 digit OTP
   -> POST /api/admin/verify-otp -> Server memvalidasi OTP
   -> Jika valid: session UUID token dibuat (berlaku 24 jam)

5. Admin masuk ke Workspace dengan hak akses penuh
```

### Konfigurasi Akun Admin

Edit file `core/admin_config.py`:

```python
ADMIN_ACCOUNTS = {
    "hanzz@neura.dr.id": {
        "real_emails": ["email_asli@gmail.com"],
        "name": "Nama Admin",
        "role": "Admin",
        "description": "Lead System Administrator",
    },
    # Tambah admin baru dengan format yang sama...
}
```

---

## 💬 Perintah Chat Interaktif

Ketik perintah berikut di kolom chat Workspace:

| Perintah | Deskripsi |
|---|---|
| `/status` | Status model, checkpoint, dan environment server |
| `/train [N]` | Training model XGBoost selama N epoch (default: 10) |
| `/eval` | Evaluasi model: accuracy, F1-score, ROC-AUC, confusion matrix |
| `/predict` | Inferensi prediksi risiko Alzheimer berdasarkan profil user |
| `/progress` | Progres & log epoch training terbaru |
| `/help` | Panduan semua perintah yang tersedia |

---

## 📊 Dataset & Model ML

### Dataset Utama

| File | Lokasi | Deskripsi |
|---|---|---|
| `alzheimers_disease_data.csv` | `datasets/` | 2.149 rekam medis, 35 kolom (32 fitur + ID + label) |

### 32 Biomarker Klinis

Dataset mencakup biomarker dari kategori:
- **Demografis**: Usia, jenis kelamin, etnis, tingkat pendidikan
- **Klinis kognitif**: MMSE score, functional assessment, CDR
- **Biomarker lab**: Kolesterol total, trigliserida, insulin, tekanan darah
- **Faktor gaya hidup**: BMI, aktivitas fisik, kebiasaan merokok, diet
- **Riwayat penyakit**: Hipertensi, diabetes, depresi, riwayat keluarga
- **Gejala kognitif**: Keluhan memori, disorientasi, kebingungan, gangguan bahasa

### Checkpoint & Laporan Model

```
public/checkpoints/
+-- xgboost_alzheimers.json    # Model XGBoost terlatih

public/reports/
+-- eval_{timestamp}.json      # Hasil evaluasi per sesi
```

---

## 🎙️ Voice AI Agent

Neura memiliki agen suara klinis yang dapat berkomunikasi dalam bahasa alami.

```bash
# Pastikan venv aktif dan .env sudah dikonfigurasi
python voice_agent.py dev
```

**Kemampuan Agent:**
- Menerima pertanyaan pasien/dokter via suara
- Menjelaskan hasil prediksi risiko Alzheimer
- Memberikan informasi tentang biomarker dan faktor risiko
- Mendukung Bahasa Indonesia dan English

---

## 🌿 Git — Push, Pull & Kolaborasi

Git adalah sistem *version control* yang memungkinkan Anda melacak perubahan kode, berkolaborasi dengan tim, dan menyinkronkan kode antara komputer lokal dan GitHub.

### Konsep Penting

| Istilah | Penjelasan Singkat |
|---|---|
| **`repository`** | Tempat penyimpanan seluruh kode dan histori perubahan |
| **`commit`** | "Snapshot" kondisi kode pada satu titik waktu tertentu |
| **`branch`** | Cabang paralel untuk mengerjakan fitur tanpa mengganggu kode utama |
| **`origin`** | Nama default untuk remote repository di GitHub |
| **`main`** | Branch utama / produksi (nama default GitHub) |
| **`push`** | Mengirim commit lokal ke GitHub |
| **`pull`** | Mengambil & menggabungkan perubahan terbaru dari GitHub ke lokal |
| **`clone`** | Mengunduh seluruh repository dari GitHub ke komputer baru |

---

### Git Push — Menyimpan & Mengirim Perubahan ke GitHub

`git push` digunakan untuk **mengunggah commit terbaru** dari komputer Anda ke repository GitHub agar bisa diakses tim atau tersimpan di cloud.

**Alur lengkap push:**

```bash
# 1. Cek file mana saja yang berubah
git status

# 2. Tandai file yang ingin disimpan ke commit
#    Tambah file tertentu:
git add nama_file.py
#    Atau tambah SEMUA file yang berubah sekaligus:
git add .

# 3. Buat commit dengan pesan deskriptif
git commit -m "feat: tambah fitur prediksi risiko Alzheimer"

# 4. Kirim commit ke GitHub (branch main)
git push origin main
```

> [!TIP]
> Tulis pesan commit yang jelas dan deskriptif. Gunakan format konvensional:
> - `feat: ...` — fitur baru
> - `fix: ...` — perbaikan bug
> - `docs: ...` — perubahan dokumentasi
> - `refactor: ...` — refaktor kode tanpa perubahan fitur

**Contoh skenario nyata:**
```bash
git add core/admin_config.py server.py
git commit -m "fix: tambah 7 akun admin & perbaiki uuid import di verify-otp"
git push origin main
```

---

### Git Pull — Mengambil Perubahan Terbaru dari GitHub

`git pull` digunakan untuk **mengunduh dan menggabungkan** perubahan terbaru dari GitHub ke komputer Anda. Wajib dilakukan sebelum mulai bekerja jika ada anggota tim lain yang sudah melakukan push.

```bash
git pull origin main
```

Perintah ini setara dengan kombinasi dua langkah:
```bash
git fetch origin       # Mengambil data terbaru dari GitHub (tanpa merge)
git merge origin/main  # Menggabungkan ke branch lokal
```

> [!IMPORTANT]
> **Selalu lakukan `git pull` sebelum mulai menulis kode baru**, terutama saat bekerja dalam tim. Ini mencegah konflik merge yang tidak perlu.

---

### Bekerja dengan Branch (Untuk Kolaborasi Tim)

```bash
# Buat branch baru untuk fitur yang sedang dikerjakan
git checkout -b fitur/parallax-hero

# Kerjakan perubahan, lalu commit seperti biasa
git add .
git commit -m "feat: tambah parallax scroller di hero section"

# Push branch baru ke GitHub
git push origin fitur/parallax-hero

# Kembali ke branch utama
git checkout main

# Gabungkan branch fitur ke main (setelah review)
git merge fitur/parallax-hero

# Push main yang sudah ter-merge
git push origin main
```

---

### Perintah Git yang Sering Digunakan

```bash
git status              # Cek status file (modified, staged, untracked)
git log --oneline -10   # Lihat 10 commit terakhir secara ringkas
git diff                # Lihat perbedaan kode yang belum di-staged
git diff HEAD           # Lihat semua perubahan sejak commit terakhir

git branch              # Lihat semua branch lokal
git branch -a           # Lihat semua branch (lokal + remote)
git checkout main       # Pindah ke branch main

git stash               # Simpan sementara perubahan yang belum di-commit
git stash pop           # Kembalikan perubahan yang di-stash

git reset HEAD nama_file.py  # Unstage file (batalkan git add)
git restore nama_file.py     # Kembalikan file ke kondisi commit terakhir
```

---

## 🔧 Troubleshooting

| Masalah / Pesan Error | Penyebab | Solusi |
|---|---|---|
| `ModuleNotFoundError: No module named 'flask'` | Menjalankan Python sistem, bukan venv | Aktifkan venv: `.\venv\Scripts\Activate.ps1` lalu jalankan kembali |
| `ModuleNotFoundError: No module named 'xgboost'` | Dependencies belum terinstal | Jalankan `pip install -r requirements.txt` saat venv aktif |
| `cannot be loaded because running scripts is disabled` | Execution Policy Windows memblokir script | Jalankan: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| `Address already in use` / Port 5000 bentrok | Server lain masih berjalan di port 5000 | Hentikan proses lama atau tambah `port=5001` di `server.py` baris terakhir |
| `NameError: name 'uuid' is not defined` | Modul uuid belum diimport | Pastikan `import uuid` ada di bagian atas `server.py` |
| OTP Admin muncul error 500 | Server belum di-restart setelah perubahan kode | Restart `python server.py` agar perubahan kode terbaca |
| `SMTP Authentication Error` | App Password Gmail salah atau belum dikonfigurasi | Buat App Password baru di myaccount.google.com/apppasswords |
| `Firebase: Auth not configured` | `FIREBASE_API_KEY` di `.env` kosong | Isi semua variabel `FIREBASE_*` dari Firebase Console project Anda |
| `git push` ditolak (rejected) | Ada commit baru di GitHub yang belum di-pull | Jalankan `git pull origin main` terlebih dahulu, resolve konflik jika ada, baru push ulang |
| `xgboost.core.XGBoostError: model not loaded` | Checkpoint model belum ada | Lakukan training terlebih dahulu via chat `/train` atau `POST /api/train` |

---

## 👥 Kontribusi & Tim

### Tim Pengembang — Neura Health AI

| No | Nama | Role | Email Admin |
|---|---|---|---|
| 01 | Haidar Rifky A | Lead System Admin & Core AI | `hanzz@neura.dr.id` |
| 02 | Syafiq Ahmad A. | System Administrator | `jkmaiden@neura.dr.id` |
| 03 | Muhammad Hasanudin | System Administrator | `maman@neura.dr.id` |
| 04 | Muhammad Khoir Luqman | System Administrator | `muhammadhasan.cg@neura.dr.id` |
| 05 | Bahtiar Dzikrul Redjeb | System Administrator | `mychel09@neura.dr.id` |
| 06 | Andika Putra S | System Administrator | `jester19@neura.dr.id` |
| 07 | Ridho Romadhani | System Administrator | `tsaritsaanastasya@neura.dr.id` |

### Cara Berkontribusi

1. **Fork** repository di GitHub.
2. **Clone** fork Anda ke lokal: `git clone https://github.com/USERNAME/Neura.git`
3. Buat **branch** baru: `git checkout -b fitur/nama-fitur`
4. Kerjakan perubahan dan **commit**: `git commit -m "feat: deskripsi singkat"`
5. **Push** ke fork Anda: `git push origin fitur/nama-fitur`
6. Buat **Pull Request** ke branch `main` repository utama.

---

## 📄 Lisensi

```
MIT License

Copyright (c) 2026 Neura Health AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

<div align="center">

**Neura AI** — *Mendeteksi Alzheimer Lebih Awal, Lebih Tepat.*

Dibangun dengan oleh **Neura Health AI Team** | [GitHub](https://github.com/HanzzSama/Neura)

</div>
