import os
import sys
import time
import urllib.request

MODEL_DIR = "modelsLLM"
MODEL_NAME = "llama-3.2-1b-instruct-q4_k_m.gguf"
MODEL_URL = "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf"

def download_model(force=False):
    os.makedirs(MODEL_DIR, exist_ok=True)
    target_path = os.path.join(MODEL_DIR, MODEL_NAME)

    # Cek apakah file sudah valid GGUF
    if os.path.exists(target_path) and not force:
        try:
            with open(target_path, "rb") as f:
                header = f.read(4)
                if header == b"GGUF":
                    print(f"[OK] Model {MODEL_NAME} sudah ada dan valid (GGUF magic header terverifikasi).")
                    return target_path
                else:
                    print(f"[WARN] File {target_path} ada tetapi bukan GGUF valid (magic header salah: {header}). Mengunduh ulang...")
        except Exception as e:
            print(f"[WARN] Gagal membaca file: {e}")

    part_path = target_path + ".part"
    print(f"Mengunduh model LLM dari: {MODEL_URL}")
    print(f"Target file: {target_path}")

    headers = {"User-Agent": "Mozilla/5.0 (NeuraAI/2.0)"}
    req = urllib.request.Request(MODEL_URL, headers=headers)

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            total_size = int(resp.headers.get("content-length", 0))
            downloaded = 0
            chunk_size = 1024 * 1024  # 1MB chunk

            with open(part_path, "wb") as out_file:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    pct = (downloaded / total_size * 100) if total_size > 0 else 0
                    mb = downloaded / (1024 * 1024)
                    total_mb = total_size / (1024 * 1024)
                    speed = mb / max(time.time() - start_time, 0.1)
                    sys.stdout.write(f"\rProgress: {mb:.1f}/{total_mb:.1f} MB ({pct:.1f}%) - Speed: {speed:.2f} MB/s")
                    sys.stdout.flush()

        print("\nDownload selesai! Memvalidasi file...")
        with open(part_path, "rb") as f:
            if f.read(4) != b"GGUF":
                raise ValueError("File yang diunduh bukan format GGUF yang valid!")

        if os.path.exists(target_path):
            os.remove(target_path)
        os.rename(part_path, target_path)
        print(f"[SUCCESS] Model tersimpan di {target_path} (Ukuran: {os.path.getsize(target_path) / (1024*1024):.1f} MB)")
        return target_path
    except Exception as e:
        print(f"\n[ERROR] Gagal mengunduh model: {e}")
        if os.path.exists(part_path):
            try: os.remove(part_path)
            except: pass
        return None

if __name__ == "__main__":
    force_download = "--force" in sys.argv
    download_model(force=force_download)

