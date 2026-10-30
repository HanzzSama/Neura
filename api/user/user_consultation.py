"""
api/user/user_consultation.py
=============================
User / Pasien Consultation routes:
  POST/GET /api/consultation/generate — Generate dokumen hasil konsultasi & kode rujukan Nakes
  GET      /api/consultation/<code>   — Lookup dokumen hasil konsultasi
"""

import random
import hashlib
import traceback
from datetime import datetime
import pandas as pd
from flask import Blueprint, request, jsonify
from core.logger import get_logger
from api.user.user_predict import map_user_profile_to_features

logger = get_logger(__name__)

user_consult_bp = Blueprint("user_consultation", __name__)

# Shared memory store for consultations (accessed by nakes via get_consultations_store())
_consultations_store = {}


def get_consultations_store():
    """Return reference to global consultation dictionary store."""
    return _consultations_store


def _build_consultation_document(patient_input=None, mode=""):
    from scripts.predict_xgboost_alzheimer import AlzheimersPredictor

    predictor = AlzheimersPredictor()
    df_raw = pd.read_csv("datasets/alzheimers_disease_data.csv")

    if patient_input is not None and isinstance(patient_input, dict) and mode != "dataset":
        mapped_patient = map_user_profile_to_features(patient_input)
        res = predictor.predict_patient(mapped_patient)
        patient_data = mapped_patient
        source = "user_profile"
        patient_name = patient_input.get("name", "Pasien Neura").strip() or "Pasien Neura"
        pid = patient_name
    else:
        rand_idx = random.randint(0, len(df_raw) - 1)
        sample_row = df_raw.iloc[rand_idx].to_dict()
        res = predictor.predict_patient(sample_row)
        patient_data = sample_row
        source = "dataset_sample"
        pid = patient_data.get("PatientID", rand_idx + 1)
        patient_name = f"Pasien #{pid}"

    now = datetime.now()
    now_str = now.strftime("%d %B %Y, %H:%M WIB")
    rand_suffix = f"{random.randint(1000, 9999)}"
    doc_id = f"DOC-NEURA-{now.year}-{rand_suffix}"
    nakes_code = f"NKS-{str(now.year)[-2:]}-{rand_suffix}-ALZ"

    prob_pos = round(float(res["probability_percent"]), 2)
    prob_neg = round(float(100.0 - prob_pos), 2)
    is_positive = res["prediction"] == 1

    biomarkers_breakdown = [
        {
            "category": "Demografi & Fisik",
            "items": [
                {"name": "Usia", "value": f"{int(patient_data.get('Age', 65))} Tahun", "normal": "Usia Lanjut: >60 Thn"},
                {"name": "Jenis Kelamin", "value": "Laki-laki" if int(patient_data.get('Gender', 0)) == 0 else "Perempuan", "normal": "Semua Gender"},
                {"name": "BMI", "value": f"{round(float(patient_data.get('BMI', 22.5)), 1)} kg/m²", "normal": "18.5 - 24.9"},
                {"name": "Tekanan Darah", "value": f"{int(patient_data.get('SystolicBP', 120))}/{int(patient_data.get('DiastolicBP', 80))} mmHg", "normal": "< 120/80 mmHg"},
            ]
        },
        {
            "category": "Penilaian Kognitif & Fungsional",
            "items": [
                {"name": "Skor MMSE", "value": f"{round(float(patient_data.get('MMSE', 24.0)), 1)} / 30", "normal": "24 - 30 (Normal)"},
                {"name": "Skor ADL", "value": f"{round(float(patient_data.get('ADL', 7.0)), 1)} / 10", "normal": "> 6.0 (Mandiri)"},
                {"name": "Functional Assessment", "value": f"{round(float(patient_data.get('FunctionalAssessment', 7.0)), 1)} / 10", "normal": "> 6.0 (Normal)"},
                {"name": "Keluhan Memori", "value": "Ada (Positif)" if int(patient_data.get('MemoryComplaints', 0)) == 1 else "Tidak Ada", "normal": "Tidak Ada"},
                {"name": "Gangguan Perilaku", "value": "Ada" if int(patient_data.get('BehavioralProblems', 0)) == 1 else "Tidak Ada", "normal": "Tidak Ada"},
            ]
        },
        {
            "category": "Biomarker Kardiovaskular & Lab",
            "items": [
                {"name": "Kolesterol Total", "value": f"{round(float(patient_data.get('CholesterolTotal', 200)), 1)} mg/dL", "normal": "< 200 mg/dL"},
                {"name": "Kolesterol LDL", "value": f"{round(float(patient_data.get('CholesterolLDL', 100)), 1)} mg/dL", "normal": "< 100 mg/dL"},
                {"name": "Kolesterol HDL", "value": f"{round(float(patient_data.get('CholesterolHDL', 50)), 1)} mg/dL", "normal": "> 40 mg/dL"},
                {"name": "Trigliserida", "value": f"{round(float(patient_data.get('CholesterolTriglycerides', 150)), 1)} mg/dL", "normal": "< 150 mg/dL"},
            ]
        },
        {
            "category": "Gaya Hidup & Kualitas Tidur",
            "items": [
                {"name": "Aktivitas Fisik", "value": f"{round(float(patient_data.get('PhysicalActivity', 5.0)), 1)} / 10", "normal": "Skor 5-10"},
                {"name": "Kualitas Diet", "value": f"{round(float(patient_data.get('DietQuality', 5.0)), 1)} / 10", "normal": "Skor 5-10 (MIND Diet)"},
                {"name": "Kualitas Tidur", "value": f"{round(float(patient_data.get('SleepQuality', 7.0)), 1)} / 10", "normal": "Skor 7-10 (7-8 Jam)"},
                {"name": "Status Merokok", "value": "Perokok Aktif" if int(patient_data.get('Smoking', 0)) == 1 else "Tidak Merokok", "normal": "Bebas Rokok"},
            ]
        }
    ]

    recommendations = [
        "Lakukan pemantauan fungsi kognitif berkala minimal 1 kali setiap 6 bulan.",
        "Terapkan diet neuroprotektif (Mediterranean-DASH Diet Intervention for Neurodegenerative Delay / MIND Diet).",
        "Rutin melakukan stimulasi otak (membaca kritis, teka-teki, interaksi sosial aktif) minimal 30 menit sehari.",
        "Bawa dan serahkan Kode Konsultasi Nakes ini ke Dokter Spesialis Saraf / Neurologi di Faskes rujukan untuk pemeriksaan lanjutan (MoCA, MRI Brain, atau PET Scan jika diindikasikan)."
    ]

    integrity_string = f"{doc_id}:{nakes_code}:{patient_name}:{prob_pos}:{now.isoformat()}"
    verification_hash = hashlib.sha256(integrity_string.encode("utf-8")).hexdigest()[:16].upper()

    doc = {
        "doc_id": doc_id,
        "nakes_code": nakes_code,
        "created_at": now_str,
        "timestamp_iso": now.isoformat(),
        "source": source,
        "patient": {
            "name": patient_name,
            "patient_id": str(pid),
            "age": int(patient_data.get("Age", 65)),
            "gender": "Laki-laki" if int(patient_data.get("Gender", 0)) == 0 else "Perempuan",
            "bmi": round(float(patient_data.get("BMI", 22.5)), 1),
            "bmi_category": "Normal" if 18.5 <= float(patient_data.get("BMI", 22.5)) < 25 else "Perlu Perhatian",
            "systolic_bp": int(patient_data.get("SystolicBP", 120)),
            "diastolic_bp": int(patient_data.get("DiastolicBP", 80)),
            "family_history": int(patient_data.get("FamilyHistoryAlzheimers", 0)) == 1,
            "cardiovascular": int(patient_data.get("CardiovascularDisease", 0)) == 1,
            "diabetes": int(patient_data.get("Diabetes", 0)) == 1,
        },
        "cognitive_scores": {
            "mmse": round(float(patient_data.get("MMSE", 24.0)), 1),
            "adl": round(float(patient_data.get("ADL", 7.0)), 1),
            "functional_assessment": round(float(patient_data.get("FunctionalAssessment", 7.0)), 1),
            "memory_complaints": "Ada" if int(patient_data.get("MemoryComplaints", 0)) == 1 else "Tidak",
            "behavioral_problems": "Ada" if int(patient_data.get("BehavioralProblems", 0)) == 1 else "Tidak",
        },
        "prediction": {
            "diagnosis_label": res["diagnosis_label"],
            "is_positive": is_positive,
            "risk_level": res["risk_level"],
            "probability": prob_pos,
            "probability_negative": prob_neg,
            "confidence": res["confidence"],
            "model_name": "AlzheimersXGBoost",
            "accuracy_reference": "95.35%",
        },
        "biomarkers_breakdown": biomarkers_breakdown,
        "recommendations": recommendations,
        "raw_features": {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in patient_data.items()},
        "verification_hash": f"SHA256-{verification_hash}",
        "status": "VALID_ACTIVE"
    }

    _consultations_store[nakes_code] = doc
    _consultations_store[doc_id] = doc
    return doc


@user_consult_bp.route("/generate", methods=["GET", "POST"])
def api_consultation_generate():
    try:
        body = request.get_json(silent=True) or {}
        patient_input = body.get("input", None)
        mode = body.get("mode", "")
        doc = _build_consultation_document(patient_input=patient_input, mode=mode)
        return jsonify(doc)
    except Exception as e:
        logger.error(f"Error generating consultation document: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@user_consult_bp.route("/<code>", methods=["GET"])
def api_consultation_get(code):
    clean_code = str(code).strip().upper()
    if clean_code in _consultations_store:
        return jsonify({"found": True, "data": _consultations_store[clean_code]})

    for k, v in _consultations_store.items():
        if k.upper() == clean_code:
            return jsonify({"found": True, "data": v})

    return jsonify({"found": False, "error": f"Dokumen dengan kode '{clean_code}' tidak ditemukan."}), 404
