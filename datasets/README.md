# 📊 Neura Datasets Directory

Folder ini khusus digunakan untuk menyimpan dataset berformat **CSV (`.csv`)** yang digunakan dalam pelatihan (*training*), evaluasi (*testing*), dan inferensi (*predict*) pada model **Neura Alzheimer AI (XGBoost Classifier)**.

---

## 📁 File Dataset Utama

| File | Deskripsi | Spesifikasi |
| :--- | :--- | :--- |
| **`alzheimers_disease_data.csv`** | Dataset klinis diagnosis penyakit Alzheimer. | 2.149 data pasien × 35 kolom (Demografis, Klinis, MMSE, ADL, `Diagnosis`) |
| **`chat_intents.csv`** | Pola percakapan & respons asisten Neura AI. | Kolom: `intent`, `pattern`, `response` |
| **`train.csv`** | Backup dataset tabular Neura. | 600 baris × 129 kolom |
| **`test.csv`** | Backup validasi split Neura. | 150 baris × 129 kolom |
| **`sample_predict.csv`** | Sampel inferensi pengujian. | 10 baris × 128 kolom |

---

## 📐 Spesifikasi Dataset Alzheimer's Disease

Model **AlzheimersXGBoost** menggunakan 32 fitur biomarker klinis:
- **Biomarker Kognitif & Fungsional:** MMSE (*Mini-Mental State Examination*, 0-30), ADL (*Activities of Daily Living*, 0-10), FunctionalAssessment (0-10), MemoryComplaints (0/1), BehavioralProblems (0/1).
- **Profil Klinis & Vital:** SystolicBP, DiastolicBP, CholesterolTotal, CholesterolHDL, CholesterolLDL, BMI, dsb.
- **Profil Demografis & Gaya Hidup:** Age, Gender, Ethnicity, EducationLevel, Smoking, AlcoholConsumption, PhysicalActivity, DietQuality, SleepQuality.
- **Target Diagnosis:** `Diagnosis` (`0`: Non-Alzheimer's, `1`: Alzheimer's Disease).

---

## ⚙️ Integrasi Sistem & Perintah

Semua fungsionalitas sistem telah terhubung dengan dataset ini:
- `/train` atau `python main.py --mode train`: Melatih model XGBoost dengan early stopping & scale_pos_weight.
- `/predict` atau `python main.py --mode predict`: Menjalankan diagnosis klinis, probabilitas risiko, dan biomarker pasien.
- `/eval` atau `python main.py --mode eval`: Menguji performa model (Akurasi 95.35%, Precision 94.59%, Recall 92.11%, ROC-AUC 94.24%).
- `/status` atau `python main.py --mode status`: Menampilkan status model, arsitektur, dan checkpoint aktif.
