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
- [Komponen Sistem & Arsitektur Detail](#-komponen-sistem--arsitektur-detail)
- [Spesifikasi Kebutuhan Sistem (SRS — IEEE 830)](#-spesifikasi-kebutuhan-sistem-srs--ieee-830)
  - [1. Karakteristik Pengguna & Stakeholder](#1-karakteristik-pengguna--stakeholder-user-personas)
  - [2. Kebutuhan Fungsional (Functional Requirements)](#2-kebutuhan-fungsional-functional-requirements---fr)
  - [3. Kebutuhan Non-Fungsional (Non-Functional Requirements)](#3-kebutuhan-non-fungsional-non-functional-requirements---nfr)
  - [4. Batasan & Asumsi Sistem (Constraints & Assumptions)](#4-batasan--asumsi-sistem-constraints--assumptions)
  - [5. Spesifikasi Antarmuka Eksternal (External Interfaces)](#5-spesifikasi-antarmuka-eksternal-interface-requirements)
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

## 🧩 Komponen Sistem & Arsitektur Detail

Neura AI dirancang secara modular dengan pemisahan tanggung jawab (*separation of concerns*) yang ketat antara antarmuka pengguna, server perantara, logika bisnis, pipeline machine learning, dan integrasi pihak ketiga.

### 1. Komponen Frontend (Client Layer)

| Komponen | File Utama | Deskripsi Mendalam & Mekanisme Kerja |
|---|---|---|
| **Hero Parallax Engine** | `public/js/smooth-scroll.js`<br>`public/css/welcome.css` | Menggunakan pustaka Lenis untuk menghasilkan *inertial scroll physics*. Setiap frame `requestAnimationFrame` menghitung rasio scroll vertikal (`scrollProgress = currentScroll / heroHeight`). Rasio ini dikonversi menjadi CSS transform dinamis: Hero Image mengalami *scale down* dari `1.0` ke `0.88` dan `translateY(0px -> 60px)`, sedangkan Hero Title mengalami *shift left* `translateX(0px -> -40px)` dan *scale down* `1.0` ke `0.94`, menciptakan ilusi 3D depth field yang mulus pada 60 FPS tanpa repainting berlebihan. |
| **Workspace Claude AI Chat** | `public/index.html`<br>`public/js/app.js`<br>`public/css/style.css` | Antarmuka obrolan berestetika tinggi yang meniru Claude AI Anthropic. Terdiri atas *Collapsible Sidebar* dengan riwayat obrolan, *Dynamic Breadcrumbs*, *Main Conversation Viewport* dengan render Markdown dan syntax-highlighted code block, serta *Floating Action Bar* di bagian bawah dengan textarea yang otomatis melebar (*auto-growing*) dan tombol *quick-command pills* (`/status`, `/train`, `/predict`, `/eval`). |
| **Dynamic Island Top Notch** | `public/index.html`<br>`public/js/app.js` | Kapsul interaktif melayang (*floating island*) di bagian atas layar berbasis spring animation. Berfungsi menampilkan status terkini server dan model (*Ready*, *Training*, *Predicting*), timer aktif pelatihan, dan indikator koneksi WebSocket secara non-intrusif. |
| **Auth Drawer & 2FA Modal** | `public/welcome.html`<br>`public/js/auth-hero.js`<br>`public/css/auth-hero.css` | Drawer geser samping (*sliding side-drawer*) untuk autentikasi Firebase. Memiliki sistem deteksi cerdas 0ms: saat pengguna mengetik email berakhiran `@neura.dr.id`, input password langsung disembunyikan dan digantikan oleh form verifikasi OTP 6-slot terpisah dengan auto-tab, paste listener, dan countdown timer 5 menit. |
| **Auth Guard & Route Interceptor** | `public/js/auth-guard.js` | Modul pelindung rute sisi klien. Mengecek status autentikasi Firebase (`onAuthStateChanged`) serta memverifikasi session token admin melalui endpoint `/api/admin/verify-session`. Jika pengguna mencoba mengakses `/app` tanpa sesi valid, sistem secara otomatis mengarahkan kembali (*redirect*) ke `/welcome` dengan notifikasi keamanan. |
| **Bilingual Internationalization (i18n)** | `public/js/welcome.js`<br>`public/js/app.js` | Modul penerjemahan dinamis Bahasa Indonesia dan English tanpa reload halaman (*DOM attribute replacement* berbasis kamus JSON internal). Status bahasa tersimpan di `localStorage` per peramban pengguna. |

### 2. Komponen Backend & Server (Service Layer)

| Komponen | File Utama | Deskripsi Mendalam & Mekanisme Kerja |
|---|---|---|
| **Flask Dispatcher & REST API** | `server.py` | Web server multi-threaded berbasis Flask 3.0. Menangani routing SPA (Single Page Application), penyajian aset statis dengan cache-busting versioning, manajemen error terpusat (404/500 JSON handler), serta CORS middleware untuk memfasilitasi komunikasi lintas domain yang aman. |
| **Admin 2FA Security Engine** | `core/admin_config.py`<br>`core/email_sender.py` | Modul keamanan otentikasi lapis kedua khusus admin. Memetakan akun alias virtual (`@neura.dr.id`) ke alamat email asli yang terdaftar di `ADMIN_ACCOUNTS`. Menghasilkan kode OTP 6-digit acak kriptografis via `secrets.SystemRandom`, menyimpannya di memory store dengan batas kedaluwarsa 5 menit (TTL 300 detik), dan membatasi percobaan salah maksimal 5 kali sebelum terkunci. Mengirimkan email HTML berdesain resmi melalui SMTP Gmail (TLS port 587 atau SSL port 465). |
| **Asynchronous Training Worker** | `server.py`<br>`app/models/neural_network.py` | Mengisolasi proses pelatihan model XGBoost ke dalam background thread (`threading.Thread`). Menggunakan objek `train_progress` yang thread-safe untuk mencatat progres per putaran pelatihan (*round/epoch*), log metrik (loss, akurasi, waktu tersisa), sehingga antarmuka klien dapat mengambil data progres secara real-time via `GET /api/train/progress` tanpa membuat server mengalami *freeze* atau *blocking request*. |
| **Biomarker Preprocessing & Predictor** | `server.py`<br>`app/models/base_model.py` | Mengonsumsi 32 parameter biomarker klinis pengguna, memverifikasi tipe data dan rentang nilai valid (*Pydantic-like validation*), melakukan imputasi nilai hilang dengan median/modus pelatihan, mentransformasi fitur numerik, dan menyalurkannya ke model XGBoost yang telah dimuat sebelumnya di memori (*pre-warmed model*) untuk menghasilkan probabilitas risiko Alzheimer dan kategori diagnostik dalam tempo < 1.2 detik. |
| **Chat Intent Matcher** | `features/chat_manager.py`<br>`features/chat_dataset.py` | Mesin pemrosesan teks berbasis pencocokan pola kata kunci (*keyword matching*) dan *fuzzy intent scoring*. Memetakan pesan teks pengguna ke koleksi basis pengetahuan percakapan kesehatan otak, FAQ Alzheimer, dan instruksi perintah sistem. |
| **Single Source of Truth Metadata** | `about_app.json` | File konfigurasi terpusat yang menyimpan versi aplikasi, codename, spesifikasi model, profil pengembang, tautan legal, dan changelog. Dimuat ulang secara dinamis oleh backend tanpa memerlukan *server reboot* setiap kali ada pembaruan versi. |

### 3. Komponen Voice AI Agent (Real-time Audio Layer)

| Komponen | File Utama | Deskripsi Mendalam & Mekanisme Kerja |
|---|---|---|
| **LiveKit WebRTC Room Manager** | `voice_agent.py`<br>`server.py` | Menghubungkan browser pengguna ke server LiveKit Cloud melalui WebRTC data dan audio channels. Endpoint `/api/livekit/token` membuat JSON Web Token (JWT) kriptografis yang memberikan izin akses audio dua arah kepada pengguna. |
| **Voice Activity Detector (VAD)** | `voice_agent.py` | Menggunakan model Silero VAD untuk mendeteksi suara manusia secara real-time dari stream mikrofon pengguna, membedakan jeda bicara alami dengan akhir kalimat untuk mencegah *interruption clipping*. |
| **Speech-to-Text (STT)** | `voice_agent.py` | Memanfaatkan Deepgram Nova-2 streaming WebSocket API untuk mentranskripsi ucapan bahasa manusia (Bahasa Indonesia / English) menjadi teks dengan latensi ultra-rendah (< 300ms). |
| **AI Brain & Clinical Reasoner** | `voice_agent.py` | Menggunakan OpenAI `gpt-4o-mini` yang diinstruksikan melalui *system prompt* klinis khusus untuk bertindak sebagai asisten medis Alzheimer: menjelaskan arti skor MMSE, faktor risiko kardiovaskular, dan langkah pencegahan gaya hidup sehat. |
| **Text-to-Speech (TTS)** | `voice_agent.py` | Mengonversi respons teks AI kembali menjadi aliran audio berkualitas tinggi menggunakan OpenAI TTS (atau Cartesia) dan mengalirkannya ke speaker pengguna via WebRTC. |

---

## 📑 Spesifikasi Kebutuhan Sistem (SRS — IEEE 830)

Dokumen Spesifikasi Kebutuhan Perangkat Lunak (*Software Requirements Specification* - SRS) ini disusun mengikuti panduan standar **IEEE 830 / ISO/IEC/IEEE 29148** untuk mendefinisikan seluruh kapabilitas, batasan, dan kriteria penerimaan sistem Neura AI secara formal.

### 1. Karakteristik Pengguna & Stakeholder (User Personas)

Sistem Neura AI melayani tiga kelompok pemangku kepentingan (*stakeholders*) dengan karakteristik dan hak akses yang berbeda:

```
+-----------------------------------------------------------------------------+
|                         STAKEHOLDERS NEURA AI                               |
+----------------------+----------------------+-------------------------------+
|  1. PENGGUNA UMUM    |  2. TENAGA KESEHATAN |  3. ADMINISTRATOR SISTEM      |
|  (Pasien / Keluarga) |  (Dokter / Perawat)  |  (Pengelola Teknis)           |
+----------------------+----------------------+-------------------------------+
| * Skrining risiko    | * Input 32 biomarker | * Manajemen akun admin        |
| * Riwayat asesmen    | * Analisis mendalam  | * Retraining model XGBoost    |
| * Chat konsultasi    | * Cetak laporan medik| * Monitoring metrik sistem    |
| * Konsultasi suara   | * Evaluasi klinis    | * Konfigurasi API & dataset   |
+----------------------+----------------------+-------------------------------+
```

#### A. Pengguna Umum (Pasien / Mandiri)
- **Tingkat Kemahiran Teknis:** Pemula hingga Menengah.
- **Tujuan Utama:** Melakukan asesmen risiko dini penyakit Alzheimer secara mandiri, memahami gejala penurunan kognitif, dan mendapatkan edukasi gaya hidup sehat melalui antarmuka chat dan suara.
- **Hak Akses:** Mendaftar akun reguler via Firebase Auth, mengisi profil dasar, melakukan asesmen risiko mandiri, berinteraksi dengan AI chat dan voice agent, serta melihat riwayat prediksi pribadi.

#### B. Tenaga Kesehatan (Nakes / Dokter / Praktisi Medis)
- **Tingkat Kemahiran Teknis:** Menengah.
- **Tujuan Utama:** Memasukkan parameter 32 biomarker multimodal pasien secara presisi, menganalisis probabilitas risiko klinis, mengevaluasi kontribusi faktor risiko (MMSE, ADL, kolesterol, dsb.), dan mengekspor ringkasan asesmen untuk rekam medis pasien.
- **Hak Akses:** Akses penuh ke formulir 32 biomarker tingkat lanjut, visualisasi probabilitas top fitur, laporan evaluasi model, dan rekomendasi klinis pendukung.

#### C. Administrator Sistem (System Admin)
- **Tingkat Kemahiran Teknis:** Ahli (Teknisi Medis / Machine Learning Engineer).
- **Tujuan Utama:** Memelihara stabilitas platform, memantau metrik performa model, melakukan retraining model XGBoost dengan hyperparameter khusus, mengunggah pembaruan dataset, dan mengelola konfigurasi sistem.
- **Hak Akses:** Login eksklusif melalui domain `@neura.dr.id` dengan verifikasi 2FA OTP, memicu endpoint retraining async (`/api/train`), mengakses metrik evaluasi test set (`/api/evaluate`), dan mengubah konfigurasi global.

---

### 2. Kebutuhan Fungsional (Functional Requirements — FR)

Kebutuhan fungsional mendefinisikan aksi, transformasi data, dan fungsi spesifik yang wajib disediakan oleh sistem Neura AI.

| ID | Nama Kebutuhan | Deskripsi & Spesifikasi Alur | Masukan (Input) | Proses | Keluaran (Output) | Prioritas |
|---|---|---|---|---|---|---|
| **FR-01** | Autentikasi Pengguna Reguler | Sistem harus memfasilitasi registrasi dan login pengguna umum menggunakan email dan kata sandi atau penyedia OAuth melalui Firebase Authentication. | Email, password, atau token OAuth | Validasi format email, hashing credential via Firebase Auth, pembuatan record pengguna di Cloud Firestore. | Sesi terautentikasi (JWT Firebase), profil pengguna aktif. | **Tinggi (Mandatori)** |
| **FR-02** | Verifikasi Email Registrasi | Sistem harus mengirimkan tautan verifikasi email kustom berdesain HTML resmi ke alamat email pengguna baru via SMTP server. | Email pengguna, nama tampilan | Pembuatan token verifikasi Firebase, pengiriman email via SMTP Gmail port 465/587. | Email verifikasi terkirim, status email terverifikasi di halaman `/verify-email`. | **Tinggi (Mandatori)** |
| **FR-03** | Autentikasi 2FA Khusus Administrator | Sistem harus mendeteksi email administrator beralias `@neura.dr.id`, menyembunyikan kata sandi, menghasilkan kode OTP 6-digit acak kriptografis, dan memvalidasinya sebelum mengizinkan sesi admin. | Email admin (`*@neura.dr.id`), kode OTP 6 digit | Pengecekan daftar `ADMIN_ACCOUNTS`, pembuatan OTP cryptorandom, pengiriman ke email asli, verifikasi kecocokan OTP & batas waktu (TTL 5 menit). | Session UUID Token admin (berlaku 24 jam) di server dan cookie/localStorage. | **Tinggi (Mandatori)** |
| **FR-04** | Validasi & Sanitasi 32 Biomarker | Sistem harus memvalidasi kelengkapan, tipe data, dan rentang nilai rasional pada 32 biomarker klinis sebelum diteruskan ke model machine learning. | 32 nilai biomarker klinis (skor MMSE 0-30, ADL 0-10, BMI, tekanan darah, dll.) | Pemeriksaan batas minimum/maksimum, normalisasi tipe data numerik, penanganan nilai kosong (*median imputation*). | Objek array fitur ternormalisasi siap inferensi atau pesan error validasi. | **Tinggi (Mandatori)** |
| **FR-05** | Inferensi Prediksi Risiko Alzheimer | Sistem harus memproses 32 biomarker input menggunakan model XGBoost terlatih untuk menghasilkan probabilitas risiko dan status klasifikasi biner. | Array 32 fitur biomarker terstandarisasi | Eksekusi model XGBoost `predict_proba()` dan `predict()` pada background memory. | Status risiko (*Positif Alzheimer / Negatif Normal*), persentase probabilitas (0-100%), dan faktor biomarker dominan. | **Tinggi (Mandatori)** |
| **FR-06** | Pelatihan Model Ulang Asinkron (Async Retraining) | Sistem harus menyediakan fasilitas retraining model XGBoost di latar belakang (*asynchronous worker thread*) tanpa memblokir server. | Parameter jumlah epoch/round (default: 10), learning rate, max depth | Pembagian data training-testing 80:20, eksekusi boosting round per round, streaming log progres ke thread-safe variable. | Model checkpoint baru tersimpan di `public/checkpoints/` dan pembaruan metrik real-time via `/api/train/progress`. | **Tinggi (Mandatori)** |
| **FR-07** | Evaluasi & Pengujian Metrik Model | Sistem harus menyediakan fungsi evaluasi otomatis terhadap performa model pada data pengujian independen. | Dataset uji (`test.csv` atau 20% holdout split) | Penghitungan metrik akurasi, presisi, recall, F1-score, ROC-AUC, dan confusion matrix. | Laporan metrik format JSON tersimpan di `public/reports/` dan ditampilkan di antarmuka web. | **Tinggi (Mandatori)** |
| **FR-08** | Chatbot Asisten Klinis Interaktif | Sistem harus melayani percakapan teks pengguna seputar gejala Alzheimer, interpretasi hasil prediksi, dan instruksi perintah sistem. | Pesan teks pengguna di textarea | Pencocokan pola kata kunci (*intent matcher*) dan penelusuran basis pengetahuan percakapan `features/chat_dataset.py`. | Respons teks kontekstual dalam hitungan < 500ms beserta saran perintah berikutnya. | **Tinggi (Mandatori)** |
| **FR-09** | Konsultasi Suara Real-time (Voice AI) | Sistem harus menyediakan sesi panggilan audio dua arah interaktif dengan agen AI cerdas berbasis WebRTC. | Aliran audio mikrofon pengguna | Transkripsi STT via Deepgram, pemrosesan nalar klinis via OpenAI GPT-4o-mini, sintesis audio via TTS, streaming balik via WebRTC. | Respons suara audio real-time dan transkripsi teks percakapan. | **Sedang** |
| **FR-10** | Parallax Hero & Desain Responsif | Sistem harus menyajikan visual landing page editorial dengan animasi parallax interaktif terhadap scroll pengguna dan dukungan semua ukuran layar. | Interaksi scroll pengguna, dimensi layar | Perhitungan pergeseran posisi dan skala elemen hero secara dinamis via Lenis smooth scroll dan CSS variable. | Tampilan estetis 60 FPS di desktop, tablet, dan ponsel pintar. | **Tinggi (Mandatori)** |
| **FR-11** | Dukungan Dwibahasa (Bilingual Switcher) | Sistem harus memungkinkan pertukaran bahasa tampilan antara Bahasa Indonesia dan English secara instan tanpa memuat ulang laman. | Klik tombol toggle bahasa (ID / EN) | Penggantian teks DOM berdasarkan kamus terjemahan i18n dan penyimpanan status di `localStorage`. | Seluruh label, tombol, kartu, dan penjelasan berganti bahasa dalam tempo < 100ms. | **Sedang** |
| **FR-12** | Manajemen Sesi & Route Guarding | Sistem harus memverifikasi hak akses pengguna pada setiap perpindahan halaman dan menolak akses tidak terotorisasi. | Token sesi pengguna di peramban | Interseptor navigasi memeriksa status autentikasi Firebase dan keabsahan token admin di backend. | Izin navigasi ke `/app` atau pengalihan (*redirect*) ke `/welcome` dengan peringatan. | **Tinggi (Mandatori)** |

---

### 3. Kebutuhan Non-Fungsional (Non-Functional Requirements — NFR)

Kebutuhan non-fungsional mendefinisikan batasan kualitas, keandalan, performa, dan standar keamanan yang harus dipenuhi oleh platform Neura AI.

```
+-----------------------------------------------------------------------------+
|                     KEBUTUHAN NON-FUNGSIONAL (NFR)                          |
+------------------------------------+----------------------------------------+
| 1. PERFORMANSI & LATENSI           | 2. KEAMANAN & PRIVASI                  |
| * Waktu inferensi < 1.2 detik      | * Enkripsi TLS 1.3 / HTTPS             |
| * First Contentful Paint < 1.5 dtk | * 2FA OTP TTL 5 menit, max 5 trial     |
| * Voice AI turnaround < 1.8 detik  | * Isolasi credentials via .env         |
+------------------------------------+----------------------------------------+
| 3. KEANDALAN & AVAILABILITY        | 4. KOMPATIBILITAS & PORTABILITAS       |
| * Uptime server target 99.5%       | * Cross-browser: Chrome, Edge, Safari  |
| * Thread-safe async training       | * Responsif: Mobile, Tablet, Desktop   |
| * Graceful degradation offline     | * Multi-platform: Windows, Linux, Mac  |
+------------------------------------+----------------------------------------+
```

#### A. Kategori Performa & Latensi (NFR-PERF)
- **NFR-PERF-01 (Inference Latency):** Waktu respon inferensi prediksi risiko Alzheimer pada endpoint `/api/predict` tidak boleh melebihi **1.2 detik** per permintaan pada kondisi beban server normal.
- **NFR-PERF-02 (Page Load Performance):** Landing page (`welcome.html`) harus mencapai skor *First Contentful Paint (FCP)* di bawah **1.5 detik** dan *Time to Interactive (TTI)* di bawah **2.5 detik** pada koneksi broadband standar.
- **NFR-PERF-03 (Voice Turnaround Latency):** Rangkaian siklus suara Voice AI (Speech-to-Text $ightarrow$ LLM Reasoning $ightarrow$ Text-to-Speech) tidak boleh melampaui **1.8 detik** latensi kumulatif.
- **NFR-PERF-04 (Smooth Scrolling):** Animasi parallax hero dan momentum scrolling menggunakan Lenis harus mempertahankan kecepatan refresh minimal **60 FPS** tanpa *jank* atau frame skipping di peramban modern.

#### B. Kategori Keamanan & Privasi Data Medis (NFR-SEC)
- **NFR-SEC-01 (Transport Encryption):** Semua pertukaran data antara browser klien dan server Flask wajib terenkripsi menggunakan protokol HTTPS (TLS 1.2 / TLS 1.3), serta WebSocket terenkripsi (WSS) untuk koneksi WebRTC.
- **NFR-SEC-02 (OTP Lifecycle & Rate Limiting):** Kode verifikasi OTP 2FA Administrator harus kedaluwarsa secara otomatis dalam kurun waktu **300 detik (5 menit)** sejak diterbitkan. Percobaan input salah dibatasi maksimal **5 kali** sebelum kode dibatalkan (*invalidated*).
- **NFR-SEC-03 (Credential Isolation):** Tidak boleh ada API key, kata sandi database, atau kredensial SMTP yang ditulis secara langsung (*hardcoded*) di dalam kode program publik. Semua rahasia wajib diisolasi di file konfigurasi lingkungan `.env` yang masuk ke daftar `.gitignore`.
- **NFR-SEC-04 (Medical Data Privacy / HIPAA Aligned):** Parameter biomarker yang dimasukkan selama inferensi tidak boleh dipublikasikan atau diakses oleh pihak ketiga tanpa persetujuan pengguna. Sesi riwayat prediksi disimpan di Firestore dengan aturan keamanan (*Security Rules*) berbasis kepemilikan UID pengguna.

#### C. Kategori Keandalan & Ketersediaan (NFR-REL)
- **NFR-REL-01 (Availability):** Sistem backend Flask dirancang untuk mempertahankan ketersediaan operasional (*uptime*) minimal **99.5%** pada lingkungan hosting produksi.
- **NFR-REL-02 (Thread Isolation):** Proses retraining model machine learning (`POST /api/train`) wajib dijalankan pada thread terpisah (*worker thread*) sehingga kegagalan komputasi numerik tidak menyebabkan *crash* pada server HTTP utama.
- **NFR-REL-03 (Error Fallback & Recovery):** Apabila terjadi gangguan pada koneksi API pihak ketiga (misalnya LiveKit atau Deepgram), sistem harus memberikan pesan kegagalan (*fallback notification*) yang informatif dan ramah pengguna tanpa merusak antarmuka web.

#### D. Kategori Kompatibilitas & Portabilitas (NFR-COMP)
- **NFR-COMP-01 (Cross-Browser Compatibility):** Antarmuka web Neura AI harus berfungsi optimal dan mempertahankan konsistensi visual pada minimal 4 peramban modern utama: Google Chrome (v110+), Mozilla Firefox (v110+), Microsoft Edge (v110+), dan Apple Safari (v16+).
- **NFR-COMP-02 (Multi-OS Portability):** Kode sumber backend Python harus dapat dijalankan secara identik tanpa perubahan logika pada sistem operasi **Windows 10/11**, **Ubuntu Linux 20.04/22.04 LTS**, dan **macOS Ventura/Sonoma**.

#### E. Kategori Usabilitas & Desain Antarmuka (NFR-USE)
- **NFR-USE-01 (Visual Fidelity):** Antarmuka obrolan workspace harus mempertahankan tingkat kemiripan visual (*visual fidelity*) minimal **95%** terhadap standar desain Claude AI Anthropic (skema warna Warm Linen, tipografi serif/sans-serif elegan, dan micro-interaction).
- **NFR-USE-02 (Zero-Reload Language Switch):** Penggantian bahasa tampilan (ID/EN) harus terjadi secara instan dalam tempo kurang dari **100 milidetik** tanpa memicu pemuatan ulang laman peramban (*zero full-page reload*).
- **NFR-USE-03 (Accessibility & Contrast):** Warna teks dan latar belakang pada mode terang (*Warm Linen*) maupun mode gelap (*Obsidian*) harus memenuhi rasio kontras warna standar WCAG 2.1 level AA (minimal 4.5:1 untuk teks biasa).

#### F. Kategori Skalabilitas & Kemudahan Pemeliharaan (NFR-MAINT)
- **NFR-MAINT-01 (Single Source of Truth):** Informasi versi, konfigurasi model, nama author, dan changelog harus dikonsolidasikan dalam file `about_app.json` sehingga pembaruan metadata di satu file otomatis terefleksi di seluruh komponen frontend dan backend.
- **NFR-MAINT-02 (Modular Code Architecture):** Kode program harus mengikuti paradigma MVC modular, dengan batas direktori yang jelas antara file publik statis (`public/`), kontroler dan model bisnis (`app/`), utilitas keamanan (`core/`), dan manajemen dataset (`features/`, `datasets/`).

---

### 4. Batasan & Asumsi Sistem (Constraints & Assumptions)

#### Batasan Perangkat Keras & Lunak (Hardware & Software Constraints)
1. **Versi Python:** Sistem hanya mendukung Python versi **3.10, 3.11, atau 3.12**. Versi Python < 3.10 tidak didukung karena kompatibilitas pustaka modern Keras 3 dan LiveKit Agents.
2. **Ketergantungan Layanan Cloud Eksternal:** Fitur Voice AI memerlukan konektivitas internet aktif untuk berkomunikasi dengan LiveKit Cloud WebRTC, Deepgram API, dan OpenAI API.
3. **Penyedia Layanan Email:** Sistem pengiriman kode OTP mengandalkan server SMTP Gmail; operasionalitas pengiriman email bergantung pada kuota harian dan stabilitas Google SMTP relay.

#### Asumsi Operasional (Operational Assumptions)
1. Perangkat pengguna dilengkapi dengan monitor beresolusi minimal 360px (mobile) hingga 1920px+ (desktop).
2. Pengguna yang menggunakan fitur konsultasi suara memiliki mikrofon dan speaker yang berfungsi dengan izin akses peramban yang telah disetujui.
3. Data masukan 32 biomarker yang diisi oleh tenaga kesehatan berasal dari hasil rekam medis yang valid dan telah diverifikasi secara klinis.

---

### 5. Spesifikasi Antarmuka Eksternal (Interface Requirements)

```
+--------------------------------------------------------------------------+
|                     SPESIFIKASI ANTARMUKA EKSTERNAL                      |
+--------------------------------------------------------------------------+
| 1. USER INTERFACE (UI)                                                   |
|    - Landing Page: Split-hero, Parallax Scroller, Auth Drawer            |
|    - Workspace AI: Claude-style Chat, Floating Action Bar, Dynamic Island|
|                                                                          |
| 2. HARDWARE INTERFACES                                                   |
|    - Audio Input Device (Mikrofon 16-bit 48kHz via Web Audio API)        |
|    - Audio Output Device (Speaker / Headphone via WebRTC Audio Track)    |
|                                                                          |
| 3. SOFTWARE INTERFACES                                                   |
|    - Google Firebase Auth & Firestore Client SDK v10                     |
|    - LiveKit WebRTC Real-Time Audio SDK                                  |
|    - Google SMTP Mail Server (smtp.gmail.com:465 / 587)                  |
|    - OpenAI API (REST & Streaming endpoints)                             |
|    - Deepgram Streaming WebSocket API                                    |
|                                                                          |
| 4. COMMUNICATION INTERFACES                                              |
|    - Protokol HTTP/1.1 & HTTP/2 over TLS (HTTPS Port 443 / 5000)         |
|    - Protokol WebSocket Secure (WSS) untuk WebRTC signaling              |
|    - Protokol UDP / TCP over ICE/STUN/TURN untuk media streaming audio   |
+--------------------------------------------------------------------------+
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
| `GET/POST` | `/api/consultation/generate` | `{"input": {...}}` | Generate lembar Dokumen Hasil Konsultasi & Kode Nakes |
| `GET` | `/api/consultation/<code>` | — | Verifikasi & ambil rekam medis lengkap berdasarkan kode Nakes |

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
| `/profile` | Input & pembaruan formulir Data Diri dan 32 biomarker klinis pasien |
| `/predict` | Inferensi prediksi risiko Alzheimer berdasarkan profil user atau sampel dataset |
| `/dokumen` | **Menampilkan lembar resmi Dokumen Hasil Konsultasi & Button Kode Rujukan Nakes** |
| `/train [N]` | Training model XGBoost selama N epoch (default: 10) |
| `/eval` | Evaluasi model: accuracy, F1-score, ROC-AUC, confusion matrix |
| `/progress` | Progres & log epoch training terbaru |
| `/konsul` | Sesi konsultasi interaktif seputar daya ingat dan skrining klinis |
| `/intro` | Sapaan awal dan pengenalan kapabilitas platform Neura AI |
| `/voice` | Membuka Voice Room real-time WebRTC dengan asisten suara |
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

Dibangun dengan ❤️ oleh **Neura Health AI Team** | [GitHub](https://github.com/HanzzSama/Neura)

</div>
