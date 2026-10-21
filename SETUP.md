# 🚀 Neura — Setup Guide

Panduan lengkap dari **git clone** hingga **running** untuk semua OS.

---

## 📋 Prerequisites

Pastikan tools berikut sudah terinstall sebelum memulai:

| Tool | Versi Minimum | Cek |
|------|--------------|-----|
| Python | 3.10+ | `python --version` |
| pip | 23+ | `pip --version` |
| Git | 2.0+ | `git --version` |

> **Windows Users:** Gunakan **PowerShell** atau **Command Prompt** (bukan Git Bash untuk langkah venv).

---

## ⚡ Langkah-Langkah Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/Neura.git
cd Neura
```

---

### 2. Buat Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

> Jika muncul error *"execution of scripts is disabled"*, jalankan dulu:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

**Windows (Command Prompt):**
```cmd
python -m venv venv
venv\Scripts\activate.bat
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Setelah aktif, prompt akan berubah menjadi `(venv)`.

---

### 3. Install Dependencies

**Untuk production/normal use:**
```bash
pip install -r requirements.txt
```

**Untuk development (+ testing, linting, Jupyter):**
```bash
pip install -r requirements-dev.txt
```

> Proses ini bisa memakan waktu 3–10 menit karena TensorFlow cukup besar (~500MB).

---

### 4. Setup Konfigurasi

Salin file environment template:

**Windows:**
```powershell
copy .env.example .env
```

**Linux / macOS:**
```bash
cp .env.example .env
```

Edit `.env` jika diperlukan (opsional untuk penggunaan dasar):
```env
NEURA_ENV=development
```

---

### 5. Pilih Mode Running

Ada **dua cara** menjalankan Neura:

---

#### Mode A — Web Chat UI (Direkomendasikan)

Menjalankan server Flask dengan antarmuka chat berbasis browser.

```bash
python server.py
```

Lalu buka browser ke:
```
http://localhost:5000
```

Fitur yang tersedia di Web UI:
- `/status` — Cek status model
- `/train 10` — Train model 10 epoch
- `/eval` — Evaluasi model
- `/predict` — Jalankan inferensi
- `/progress` — Progress training live
- `/help` — Semua command

---

#### Mode B — Command Line (CLI)

**Training model:**
```bash
python main.py --mode train --config configs/development.yaml
```

**Evaluasi model (butuh checkpoint):**
```bash
python main.py --mode eval
```

**Prediksi / Inferensi:**
```bash
python main.py --mode predict
```

**Menggunakan script terpisah:**
```bash
python scripts/train.py --config configs/development.yaml
python scripts/evaluate.py --checkpoint public/checkpoints/NeuralNetwork
python scripts/predict.py
```

---

### 6. (Opsional) TensorBoard

Untuk memantau training secara visual:

```bash
# Di terminal terpisah (setelah training berjalan sekali)
tensorboard --logdir public/logs/tensorboard
```

Buka browser ke `http://localhost:6006`

> **Catatan:** TensorBoard dinonaktifkan di development secara default.
> Aktifkan di `configs/development.yaml`:
> ```yaml
> logging:
>   tensorboard: true
> ```

---

## 📁 Struktur Output

Setelah training berjalan, folder `public/` akan berisi:

```
public/
├── checkpoints/
│   └── NeuralNetwork.keras      ← Model tersimpan
├── logs/
│   ├── neura.log                ← Application log
│   └── tensorboard/             ← TensorBoard data
├── reports/
│   └── NeuralNetwork_eval.json  ← Hasil evaluasi
└── assets/
    ├── NeuralNetwork_loss.png     ← Plot loss
    └── NeuralNetwork_accuracy.png ← Plot accuracy
```

---

## ⚙️ Konfigurasi

Edit `configs/development.yaml` untuk mengubah hyperparameter training:

```yaml
training:
  epochs: 10          # Jumlah epoch
  batch_size: 32      # Ukuran batch
  optimizer:
    learning_rate: 0.001

model:
  input_shape: [128]  # Dimensi input
  output_units: 10    # Jumlah kelas
```

---

## 🧪 Menjalankan Tests

```bash
# Pastikan venv aktif
pip install -r requirements-dev.txt

# Jalankan semua tests
pytest tests/ -v

# Dengan coverage report
pytest tests/ --cov=app --cov=core -v
```

---

## ❗ Troubleshooting

### `ModuleNotFoundError: No module named 'flask'`
```bash
pip install flask flask-cors
# atau
pip install -r requirements.txt
```

### `UnicodeEncodeError` di Windows
```powershell
# Set encoding sebelum menjalankan
$env:PYTHONUTF8 = "1"
python server.py
```

### TensorFlow CUDA / GPU Warning
Pesan seperti `oneDNN custom operations` adalah **informasi**, bukan error. Aman diabaikan. Untuk menonaktifkan:
```powershell
$env:TF_ENABLE_ONEDNN_OPTS = "0"
```

### Port 5000 sudah dipakai
```bash
# Jalankan di port lain
python server.py --port 8080
# atau edit server.py baris terakhir: port=8080
```

### `CheckpointError: Checkpoint not found`
Model belum pernah ditraining. Jalankan dulu:
```bash
python main.py --mode train
# atau ketik /train di Web UI
```

---

## 🔄 Update Project

```bash
git pull origin main
pip install -r requirements.txt  # update deps jika ada perubahan
```

---

## 📦 Menambah Model Baru

1. Buat file baru di `app/models/`:

```python
# app/models/my_cnn.py
from core.registry import ModelRegistry
from app.models.base_model import BaseModel
import tensorflow as tf

@ModelRegistry.register("my_cnn")
class MyCNN(BaseModel):
    def build(self) -> tf.keras.Model:
        # Definisikan arsitektur di sini
        ...
        return model
```

2. Import di `app/models/__init__.py`:
```python
from app.models.my_cnn import MyCNN
```

3. Ubah config:
```yaml
# configs/default.yaml
model:
  name: "my_cnn"
```

---

*Neura — TensorFlow MVC Machine Learning Project*
