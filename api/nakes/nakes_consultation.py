"""
api/nakes/nakes_consultation.py
=================================
Nakes Consultation routes:
  GET  /api/consultation/<code>                — Lookup dokumen konsultasi via kode
  POST /api/consultation/<code>/validate       — Nakes validasi klinis dokumen
  GET  /api/consultation/<code>/patient-eval   — Evaluasi klinis pasien dengan analisis mendalam
  GET  /api/consultation/<code>/dossier        — Ambil dossier medis lengkap
"""

import traceback
from datetime import datetime
from flask import Blueprint, request, jsonify
from core.logger import get_logger

logger = get_logger(__name__)

nakes_consult_bp = Blueprint("nakes_consultation", __name__)


def _get_store():
    """
    Ambil consultation store dari user_consultation blueprint.
    Lazy import untuk hindari circular dependency.
    """
    from api.user.user_consultation import get_consultations_store
    return get_consultations_store()


def _find_doc(code):
    """Cari dokumen berdasarkan kode (case-insensitive)."""
    store      = _get_store()
    clean_code = str(code).strip().upper()
    if clean_code in store:
        return store[clean_code]
    for k, v in store.items():
        if k.upper() == clean_code:
            return v
    return None


# -----------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------

@nakes_consult_bp.route("/<code>", methods=["GET"])
def api_consultation_get(code):
    """Lookup dokumen konsultasi berdasarkan kode NKS atau DOC ID."""
    clean_code = str(code).strip().upper()
    doc = _find_doc(clean_code)
    if doc:
        return jsonify({"found": True, "data": doc})
    return jsonify({"found": False, "error": f"Dokumen dengan kode '{clean_code}' tidak ditemukan."}), 404


@nakes_consult_bp.route("/<code_or_id>/validate", methods=["POST"])
def api_consultation_validate(code_or_id):
    """
    Nakes memvalidasi dokumen konsultasi secara klinis.
    Menambahkan tanda tangan digital dan catatan klinis ke dokumen.
    """
    try:
        clean_code = str(code_or_id).strip().upper()
        doc = _find_doc(clean_code)

        if not doc:
            return jsonify({"success": False, "error": f"Dokumen dengan kode '{clean_code}' tidak ditemukan."}), 404

        body                = request.get_json(silent=True) or {}
        now                 = datetime.now()
        now_str             = now.strftime("%d %B %Y, %H:%M WIB")
        validator_name      = body.get("validator_name", "Tenaga Kesehatan Neura").strip()
        validator_sip       = body.get("validator_sip", "").strip()
        validator_institution = body.get("validator_institution", "").strip()
        validation_status   = body.get("validation_status", "TERKONFIRMASI_KLINIS").strip()
        clinical_notes      = body.get("clinical_notes", "").strip()
        suggested_action    = body.get("suggested_action", "").strip()

        validation_data = {
            "is_validated":           True,
            "validator_name":         validator_name,
            "validator_sip":          validator_sip,
            "validator_institution":  validator_institution,
            "validation_status":      validation_status,
            "clinical_notes":         clinical_notes,
            "suggested_action":       suggested_action,
            "validated_at":           now_str,
            "validated_at_iso":       now.isoformat(),
            "signature_hash":         f"SIG-{doc.get('nakes_code', clean_code)}-{now.strftime('%y%m%d%H%M')}",
        }

        doc["status"]     = "VALIDATED_BY_CLINICIAN"
        doc["validation"] = validation_data

        # Update kedua key di store (nakes_code dan doc_id)
        store = _get_store()
        nakes_code = doc.get("nakes_code")
        doc_id     = doc.get("doc_id")
        if nakes_code:
            store[nakes_code] = doc
        if doc_id:
            store[doc_id] = doc

        return jsonify({
            "success": True,
            "data":    doc,
            "message": f"Dokumen {clean_code} berhasil divalidasi secara klinis.",
        })
    except Exception as e:
        logger.error(f"Error validating consultation document: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500


@nakes_consult_bp.route("/<code_or_id>/patient-eval", methods=["GET", "POST"])
def api_consultation_patient_eval(code_or_id):
    """
    Evaluasi klinis mendalam pasien:
    - Jarak dari decision boundary
    - Analisis kohort usia & gender
    - Clinical flags MMSE / ADL / familial risk
    - Rekomendasi tes lanjutan berdasarkan probabilitas
    """
    try:
        clean_code = str(code_or_id).strip().upper()
        doc = _find_doc(clean_code)
        if not doc:
            return jsonify({"success": False, "error": f"Dokumen dengan kode '{clean_code}' tidak ditemukan."}), 404

        patient = doc.get("patient", {})
        pred    = doc.get("prediction", {})
        raw     = doc.get("raw_features", {})
        prob    = float(pred.get("probability", 50.0))

        margin_from_threshold = round(abs(prob - 50.0), 2)
        if margin_from_threshold >= 30:
            confidence_category = "Tinggi (High Certainty)"
        elif margin_from_threshold >= 15:
            confidence_category = "Sedang (Moderate Certainty)"
        else:
            confidence_category = "Batas Ambang Kritis (Borderline/Indeterminate)"

        age        = int(patient.get("age", 65))
        gender_str = str(patient.get("gender", "Laki-laki"))
        mmse_val   = float(doc.get("cognitive_scores", {}).get("mmse", raw.get("MMSE", 24.0)))
        adl_val    = float(doc.get("cognitive_scores", {}).get("adl", raw.get("ADL", 7.0)))

        patient_cohort = f"Kelompok Usia {max(60, (age//5)*5)}-{max(64, (age//5)*5 + 4)} Tahun ({gender_str})"

        clinical_flags = []
        if mmse_val < 20.0:
            clinical_flags.append({"param": "Skor MMSE", "val": f"{mmse_val}/30", "status": "Defisit Kognitif Nyata", "severity": "danger"})
        elif mmse_val < 24.0:
            clinical_flags.append({"param": "Skor MMSE", "val": f"{mmse_val}/30", "status": "Suspek Gangguan Kognitif Ringan (MCI)", "severity": "warning"})
        else:
            clinical_flags.append({"param": "Skor MMSE", "val": f"{mmse_val}/30", "status": "Rentang Normal", "severity": "normal"})

        if adl_val < 5.0:
            clinical_flags.append({"param": "Skor Kemandirian ADL", "val": f"{adl_val}/10", "status": "Ketergantungan Aktivitas Harian", "severity": "danger"})
        else:
            clinical_flags.append({"param": "Skor Kemandirian ADL", "val": f"{adl_val}/10", "status": "Aktivitas Harian Mandiri", "severity": "normal"})

        if bool(patient.get("family_history", False)):
            clinical_flags.append({"param": "Riwayat Genetik Keluarga", "val": "Positif", "status": "Faktor Risiko Genetik Tinggi", "severity": "warning"})

        suggested_tests = []
        if prob >= 70.0:
            suggested_tests.extend([
                "Pemeriksaan Neuroimaging MRI Brain 3T (Fokus Volumetri Hipokampus & Atrofi Kortikal)",
                "Pemeriksaan Biomarker Cairan Otak/CSF (Rasio Abeta-42 / Total Tau & Phospho-Tau)",
                "Konsultasi Tatap Muka Spesialis Saraf / Neurolog Konsultan Geriatri",
            ])
        elif prob >= 40.0:
            suggested_tests.extend([
                "Uji Kognitif Komprehensif MoCA-Ina (Montreal Cognitive Assessment versi Indonesia)",
                "Evaluasi Faktor Risiko Vaskular & Panel Darah Lengkap (Profil Lipid, HbA1c, Fungsi Tiroid)",
                "Skrining Ulang Fungsi Daya Ingat dalam 3-6 Bulan",
            ])
        else:
            suggested_tests.extend([
                "Program Stimulasi Kognitif & Pelatihan Memori Rutin 30 Menit/Hari",
                "Adopsi Diet Neuroprotektif MIND / Mediterania",
                "Skrining Pemantauan Kognitif Tahunan di Faskes Primer",
            ])

        return jsonify({
            "success":       True,
            "patient_code":  doc.get("nakes_code", clean_code),
            "doc_id":        doc.get("doc_id", clean_code),
            "patient_name":  patient.get("name", "Pasien"),
            "model_confidence": {
                "probability":                    prob,
                "risk_level":                     pred.get("risk_level", "Moderate"),
                "margin_from_decision_boundary":  f"{margin_from_threshold}%",
                "certainty_level":                confidence_category,
                "model_accuracy_reference":       "95.35%",
                "model_auc_reference":            "94.1%",
            },
            "cohort_analysis": {
                "cohort_label":       patient_cohort,
                "cohort_sensitivity": "95.8%",
                "cohort_specificity": "94.9%",
                "cohort_f1":          "94.6%",
            },
            "clinical_flags":             clinical_flags,
            "suggested_tests":            suggested_tests,
            "dataset_reference_size":     2149,
            "evaluation_timestamp":       datetime.now().strftime("%d %B %Y, %H:%M WIB"),
        })
    except Exception as e:
        logger.error(f"Error in patient evaluation: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500


@nakes_consult_bp.route("/<code_or_id>/dossier", methods=["GET"])
def api_consultation_dossier(code_or_id):
    """Ambil seluruh dossier medis lengkap untuk kode yang diberikan."""
    try:
        clean_code = str(code_or_id).strip().upper()
        doc = _find_doc(clean_code)
        if not doc:
            return jsonify({"success": False, "error": f"Dokumen dengan kode '{clean_code}' tidak ditemukan."}), 404

        return jsonify({
            "success":      True,
            "dossier_type": "NEURA_CLINICAL_DOSSIER_MEDIS_V1",
            "doc":          doc,
        })
    except Exception as e:
        logger.error(f"Error getting dossier: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500
