"""
app/Http/Controllers/User/user_consultation.py
==============================================
User / Pasien Consultation routes:
  POST/GET /api/consultation/generate — Generate dokumen hasil konsultasi & kode rujukan Nakes
  GET      /api/consultation/<code>   — Lookup dokumen hasil konsultasi
"""

import json
import random
import hashlib
import traceback
from datetime import datetime
from pathlib import Path
import pandas as pd
from flask import Blueprint, request, jsonify

from app.Services.Logger.LoggerService import get_logger
from app.Services.Database.DatabaseManager import execute_insert, execute_query, execute_update
from app.Services.ML.XGBoostInferenceService import AlzheimersPredictor
from app.Services.ML.RapidMinerTreeService import predict_rapidminer_tree
from app.Http.Controllers.User.user_predict import map_user_profile_to_features
from config.app import STORAGE_DIR
from config.ml import ALZHEIMER_DATASET_CSV

logger = get_logger(__name__)

user_consult_bp = Blueprint("user_consultation", __name__)

CONSULT_FILE = STORAGE_DIR / "app" / "consultations_records.json"
CONSULT_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_stored_consultations():
    if CONSULT_FILE.exists():
        try:
            with open(CONSULT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    # Legacy fallback
    legacy = Path("datasets/consultations_records.json")
    if legacy.exists():
        try:
            with open(legacy, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_consultations_store():
    try:
        CONSULT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONSULT_FILE, "w", encoding="utf-8") as f:
            json.dump(_consultations_store, f, indent=2, ensure_ascii=False)
        # Mirror to database/datasets/
        db_path = Path("database/datasets/consultations_records.json")
        if db_path.parent.exists():
            with open(db_path, "w", encoding="utf-8") as f:
                json.dump(_consultations_store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Gagal menyimpan consultations_records.json: {e}")


_consultations_store = _load_stored_consultations()


def get_consultations_store():
    return _consultations_store


def _build_consultation_document(patient_input=None, mode="", override_suffix=None):
    now = datetime.now()
    now_str = now.strftime("%d %B %Y, %H:%M WIB")

    predictor = AlzheimersPredictor()
    csv_file = ALZHEIMER_DATASET_CSV if ALZHEIMER_DATASET_CSV.exists() else Path("datasets/alzheimers_disease_data.csv")
    df_raw = pd.read_csv(csv_file)

    if override_suffix and str(override_suffix).isdigit():
        rand_idx = int(override_suffix) % len(df_raw)
        sample_row = df_raw.iloc[rand_idx].to_dict()
        res = predictor.predict_patient(sample_row)
        patient_data = sample_row
        source = "dataset_sample"
        pid = patient_data.get("PatientID", rand_idx + 1)
        patient_name = f"Pasien #{pid}"
        rand_suffix = str(override_suffix)
    elif patient_input is not None and isinstance(patient_input, dict) and mode != "dataset":
        mapped_patient = map_user_profile_to_features(patient_input)
        res = predictor.predict_patient(mapped_patient)
        patient_data = mapped_patient
        source = "user_profile"
        patient_name = patient_input.get("name", "Pasien Neura").strip() or "Pasien Neura"
        pid = patient_name
        rand_suffix = f"{random.randint(1000, 9999)}"
    else:
        rand_idx = random.randint(0, len(df_raw) - 1)
        sample_row = df_raw.iloc[rand_idx].to_dict()
        res = predictor.predict_patient(sample_row)
        patient_data = sample_row
        source = "dataset_sample"
        pid = patient_data.get("PatientID", rand_idx + 1)
        patient_name = f"Pasien #{pid}"
        rand_suffix = f"{random.randint(1000, 9999)}"

    doc_id = f"DOC-NEURA-{now.year}-{rand_suffix}"
    nakes_code = f"NKS-{str(now.year)[-2:]}-{rand_suffix}-ALZ"

    prob_pos = round(float(res["probability_percent_1"]), 2)
    prob_neg = round(float(res["probability_percent_0"]), 2)
    is_positive = res["prediction"] == 1

    all_32_biomarkers = {
        "Age": int(patient_data.get("Age", 65)),
        "Gender": "Perempuan (1)" if int(patient_data.get("Gender", 0)) == 1 else "Laki-laki (0)",
        "Ethnicity": int(patient_data.get("Ethnicity", 0)),
        "EducationLevel": int(patient_data.get("EducationLevel", 1)),
        "BMI": round(float(patient_data.get("BMI", 22.5)), 1),
        "Smoking": int(patient_data.get("Smoking", 0)),
        "AlcoholConsumption": round(float(patient_data.get("AlcoholConsumption", 5.0)), 1),
        "PhysicalActivity": round(float(patient_data.get("PhysicalActivity", 5.0)), 1),
        "DietQuality": round(float(patient_data.get("DietQuality", 5.0)), 1),
        "SleepQuality": round(float(patient_data.get("SleepQuality", 7.0)), 1),
        "FamilyHistoryAlzheimers": int(patient_data.get("FamilyHistoryAlzheimers", 0)),
        "CardiovascularDisease": int(patient_data.get("CardiovascularDisease", 0)),
        "Diabetes": int(patient_data.get("Diabetes", 0)),
        "Depression": int(patient_data.get("Depression", 0)),
        "HeadInjury": int(patient_data.get("HeadInjury", 0)),
        "Hypertension": int(patient_data.get("Hypertension", 0)),
        "SystolicBP": int(patient_data.get("SystolicBP", 120)),
        "DiastolicBP": int(patient_data.get("DiastolicBP", 80)),
        "CholesterolTotal": round(float(patient_data.get("CholesterolTotal", 200.0)), 1),
        "CholesterolLDL": round(float(patient_data.get("CholesterolLDL", 100.0)), 1),
        "CholesterolHDL": round(float(patient_data.get("CholesterolHDL", 50.0)), 1),
        "CholesterolTriglycerides": round(float(patient_data.get("CholesterolTriglycerides", 150.0)), 1),
        "MMSE": round(float(patient_data.get("MMSE", 24.0)), 1),
        "FunctionalAssessment": round(float(patient_data.get("FunctionalAssessment", 7.0)), 1),
        "MemoryComplaints": int(patient_data.get("MemoryComplaints", 0)),
        "BehavioralProblems": int(patient_data.get("BehavioralProblems", 0)),
        "ADL": round(float(patient_data.get("ADL", 7.0)), 1),
        "Confusion": int(patient_data.get("Confusion", 0)),
        "Disorientation": int(patient_data.get("Disorientation", 0)),
        "PersonalityChanges": int(patient_data.get("PersonalityChanges", 0)),
        "DifficultyCompletingTasks": int(patient_data.get("DifficultyCompletingTasks", 0)),
        "Forgetfulness": int(patient_data.get("Forgetfulness", 0)),
    }

    # Format kelompok biomarker lengkap dengan nama, rentang normal, dan status klinis
    sbp = all_32_biomarkers["SystolicBP"]
    dbp = all_32_biomarkers["DiastolicBP"]
    chol_tot = all_32_biomarkers["CholesterolTotal"]
    chol_ldl = all_32_biomarkers["CholesterolLDL"]
    chol_hdl = all_32_biomarkers["CholesterolHDL"]
    chol_trig = all_32_biomarkers["CholesterolTriglycerides"]
    bmi_val = all_32_biomarkers["BMI"]
    mmse_val = all_32_biomarkers["MMSE"]
    adl_val = all_32_biomarkers["ADL"]
    func_val = all_32_biomarkers["FunctionalAssessment"]

    breakdown = [
        {
            "category": "Demografi & Fisik",
            "items": [
                {"name": "Usia", "label": "Usia", "value": f"{all_32_biomarkers['Age']} tahun", "normal": "18 - 100 thn", "status": "Normal"},
                {"name": "Jenis Kelamin", "label": "Jenis Kelamin", "value": all_32_biomarkers["Gender"], "normal": "—", "status": "Normal"},
                {"name": "Indeks Massa Tubuh (BMI)", "label": "Indeks Massa Tubuh (BMI)", "value": f"{bmi_val} kg/m²", "normal": "18.5 - 24.9 kg/m²", "status": "Tinggi" if bmi_val >= 30 else ("Waspada" if bmi_val >= 25 or bmi_val < 18.5 else "Normal")},
                {"name": "Tingkat Pendidikan", "label": "Tingkat Pendidikan", "value": f"Level {all_32_biomarkers['EducationLevel']}", "normal": "Level 0 - 3", "status": "Normal"},
            ]
        },
        {
            "category": "Kognitif & Fungsional",
            "items": [
                {"name": "Mini-Mental State Exam (MMSE)", "label": "Mini-Mental State Exam (MMSE)", "value": f"{mmse_val} / 30", "normal": "24 - 30", "status": "Defisit" if mmse_val < 20 else ("Waspada" if mmse_val < 24 else "Normal")},
                {"name": "Activities of Daily Living (ADL)", "label": "Activities of Daily Living (ADL)", "value": f"{adl_val} / 10", "normal": "6 - 10", "status": "Waspada" if adl_val < 6 else "Normal"},
                {"name": "Functional Assessment", "label": "Functional Assessment", "value": f"{func_val} / 10", "normal": "6 - 10", "status": "Waspada" if func_val < 6 else "Normal"},
            ]
        },
        {
            "category": "Vaskular & Lipid",
            "items": [
                {"name": "Tekanan Darah", "label": "Tekanan Darah", "value": f"{sbp}/{dbp} mmHg", "normal": "90/60 - 120/80 mmHg", "status": "Tinggi" if sbp >= 140 or dbp >= 90 else ("Waspada" if sbp >= 130 or dbp >= 85 else "Normal")},
                {"name": "Kolesterol Total", "label": "Kolesterol Total", "value": f"{chol_tot} mg/dL", "normal": "< 200 mg/dL", "status": "Tinggi" if chol_tot >= 240 else ("Waspada" if chol_tot >= 200 else "Normal")},
                {"name": "LDL / HDL", "label": "LDL / HDL", "value": f"{chol_ldl} / {chol_hdl} mg/dL", "normal": "LDL < 100 · HDL ≥ 40", "status": "Tinggi" if chol_ldl >= 160 else ("Waspada" if chol_ldl >= 130 or chol_hdl < 40 else "Normal")},
                {"name": "Trigliserida", "label": "Trigliserida", "value": f"{chol_trig} mg/dL", "normal": "< 150 mg/dL", "status": "Tinggi" if chol_trig >= 200 else ("Waspada" if chol_trig >= 150 else "Normal")},
            ]
        }
    ]

    recommendations = [
        "Lakukan pemantauan fungsi kognitif berkala minimal 1 kali setiap 6 bulan.",
        "Terapkan diet neuroprotektif (Mediterranean-DASH Diet Intervention for Neurodegenerative Delay / MIND Diet).",
        "Rutin melakukan stimulasi otak (membaca kritis, teka-teki, interaksi sosial aktif) minimal 30 menit sehari.",
        "Bawa dan serahkan Kode Konsultasi Nakes ini ke Dokter Spesialis Saraf / Neurologi di Faskes rujukan untuk pemeriksaan lanjutan (MoCA, MRI Brain, atau PET Scan jika diindikasikan)."
    ]

    hash_input = f"{doc_id}:{nakes_code}:{prob_pos}:{now.isoformat()}"
    verification_hash = f"SHA256-{hashlib.sha256(hash_input.encode()).hexdigest()[:16].upper()}"

    doc = {
        "document_id": doc_id,
        "nakes_code": nakes_code,
        "created_at": now_str,
        "timestamp_iso": now.isoformat(),
        "status": "VALID_ACTIVE",
        "patient": {
            "name": patient_name,
            "id": str(pid),
            "age": all_32_biomarkers["Age"],
            "gender": all_32_biomarkers["Gender"],
            "bmi": all_32_biomarkers["BMI"],
            "systolic_bp": all_32_biomarkers["SystolicBP"],
            "diastolic_bp": all_32_biomarkers["DiastolicBP"],
            "source": source
        },
        "cognitive_scores": {
            "mmse": all_32_biomarkers["MMSE"],
            "adl": all_32_biomarkers["ADL"],
            "functional_assessment": all_32_biomarkers["FunctionalAssessment"],
        },
        "prediction": {
            "model_name": "XGBoost 3.x (25 Trees • 10-Fold CV RapidMiner)",
            "ml_label": res["ml_label"],
            "ml_label_name": res["ml_label_name"],
            "ml_label_badge": res["ml_label_badge"],
            "diagnosis_label": res["diagnosis_label"],
            "is_positive": is_positive,
            "risk_level": res["risk_level"],
            "risk_level_id": res["risk_level_id"],
            "probability": prob_pos,
            "probability_positive": prob_pos,
            "probability_negative": prob_neg,
            "confidence": res["confidence"],
            "calculation_details": res["calculation_details"],
            "rapidminer_tree": res.get("rapidminer_tree", {}),
            "consensus": res.get("consensus", {}),
            "symptom_summary": res["symptom_summary"],
        },
        "biomarkers_breakdown": breakdown,
        "all_32_biomarkers": all_32_biomarkers,
        "symptom_summary": res["symptom_summary"],
        "recommendations": recommendations,
        "verification_hash": verification_hash,
        "source": source,
        "raw_features": patient_data
    }

    _consultations_store[nakes_code] = doc
    _consultations_store[doc_id] = doc
    save_consultations_store()

    try:
        if execute_insert:
            c_id = execute_insert(
                "INSERT INTO consultations ("
                "doc_id, nakes_code, patient_name, patient_id_label, status, verification_hash, created_at_label"
                ") VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (doc_id, nakes_code, patient_name, str(pid), "VALID_ACTIVE", verification_hash, now_str)
            )
            if c_id:
                execute_insert(
                    "INSERT INTO prediction_records ("
                    "consultation_id, patient_name, source, ml_label, ml_label_name, ml_label_badge, "
                    "is_positive, risk_level, risk_level_id, probability_1, probability_0, confidence, "
                    "raw_logit_z, base_margin, sum_tree_weights, num_trees, active_symptoms_count, "
                    "calculation_details, symptom_summary, all_32_biomarkers"
                    ") VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        c_id, patient_name, source,
                        res["ml_label"], res["ml_label_name"], res["ml_label_badge"],
                        1 if is_positive else 0, res["risk_level"], res.get("risk_level_id", "Risiko"),
                        prob_pos, prob_neg, res["confidence"],
                        res["calculation_details"].get("raw_logit_z", 0.0),
                        res["calculation_details"].get("base_margin", 0.0),
                        res["calculation_details"].get("sum_tree_weights", 0.0),
                        res["calculation_details"].get("num_trees", 25),
                        res["symptom_summary"].get("active_count", 0),
                        json.dumps(res["calculation_details"]),
                        json.dumps(res["symptom_summary"]),
                        json.dumps(all_32_biomarkers)
                    )
                )
            logger.info(f"Berhasil menyimpan konsultasi {doc_id} / {nakes_code} ke MySQL neura_db.")
    except Exception as db_err:
        logger.warning(f"MySQL insert consultation warning: {db_err}")

    return doc


@user_consult_bp.route("/generate", methods=["GET", "POST"])
def api_consultation_generate():
    try:
        body = request.get_json(silent=True) or {}
        patient_input = body.get("input", None)
        mode = body.get("mode", "")
        doc = _build_consultation_document(patient_input=patient_input, mode=mode)
        return jsonify({
            "status": "success",
            "document_id": doc["document_id"],
            "nakes_code": doc["nakes_code"],
            "created_at": doc["created_at"],
            "patient": doc["patient"],
            "prediction": doc["prediction"],
            "all_32_biomarkers": doc["all_32_biomarkers"],
            "symptom_summary": doc["symptom_summary"],
            "consultation": doc,
        })
    except Exception as e:
        logger.error(f"Error in api_consultation_generate: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500


@user_consult_bp.route("/<code>", methods=["GET"])
def api_consultation_get(code):
    try:
        code_clean = str(code).strip().upper()
        doc = _consultations_store.get(code_clean)
        if not doc:
            for k, v in _consultations_store.items():
                if k.upper() == code_clean or v.get("nakes_code", "").upper() == code_clean or v.get("document_id", "").upper() == code_clean:
                    doc = v
                    break

        if not doc and execute_query:
            rows = execute_query("SELECT * FROM consultations WHERE nakes_code=%s OR document_id=%s LIMIT 1", (code_clean, code_clean))
            if rows:
                r = rows[0]
                doc = {
                    "document_id": r["document_id"],
                    "nakes_code": r["nakes_code"],
                    "created_at": str(r.get("created_at", "")),
                    "status": r.get("status", "VALID_ACTIVE"),
                    "patient": {
                        "name": r["patient_name"],
                        "age": r["patient_age"],
                        "gender": r["patient_gender"],
                    },
                    "prediction": {
                        "ml_label": r["ml_label"],
                        "ml_label_name": r["ml_label_name"],
                        "ml_label_badge": r["ml_label_badge"],
                        "probability": float(r["probability_positive"]),
                        "probability_positive": float(r["probability_positive"]),
                        "probability_negative": float(r["probability_negative"]),
                        "risk_level": r["risk_level"],
                        "risk_level_id": r["risk_level_id"],
                    },
                    "verification_hash": r.get("verification_hash", ""),
                }

        if not doc:
            return jsonify({"status": "error", "message": f"Dokumen dengan kode '{code}' tidak ditemukan."}), 404

        return jsonify({"status": "success", "consultation": doc})
    except Exception as e:
        logger.error(f"Error in api_consultation_get: {traceback.format_exc()}")
        return jsonify({"status": "error", "message": str(e)}), 500
