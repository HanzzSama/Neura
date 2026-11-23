"""
app/Services/ML/RapidMinerTreeService.py
========================================
Implementasi Pohon Keputusan Asli RapidMiner (Rule Tree Classifier)
Sesuai Dokumen Spesifikasi: implementations.txt (Bagian 1 & 2) & datasets/modelML.rmp.

Menghasilkan:
- diagnosis: 0 (Non-Alzheimer) atau 1 (Alzheimer)
- label: "Non-Alzheimer" atau "Alzheimer"
- confidence: probabilitas keyakinan daun (leaf confidence)
- leaf_counts: distribusi sampel daun {0=..., 1=...}
- rule_path: jalur keputusan pohon RapidMiner
- feature_drivers: dampak fitur terhadap jalur keputusan
"""

from typing import Dict, Any


def predict_rapidminer_tree(p: Dict[str, Any]) -> Dict[str, Any]:
    """
    Eksekusi langsung pohon keputusan RapidMiner untuk deteksi Alzheimer.
    Persis sesuai implementations.txt Bagian 2.
    
    Parameter:
        p (dict): Fitur pasien, contoh:
            {
                "ADL": 4.5,
                "CholesterolLDL": 120.0,
                "MMSE": 18.0,
                "FunctionalAssessment": 6.2,
                "MemoryComplaints": 1,
                "BehavioralProblems": 1,
                "CholesterolHDL": 55.0,
                "Ethnicity": 0,
                "SystolicBP": 135.0,
                "CholesterolTriglycerides": 180.0,
                "PhysicalActivity": 2.5,
                "AlcoholConsumption": 8.0,
                "CholesterolTotal": 210.0,
                "Age": 72,
                "BMI": 26.5
            }
            
    Return:
        dict: diagnosis (0/1), label, confidence (probabilitas), leaf_counts, rule_path
    """
    adl = float(p.get("ADL", 0.0))

    # Cabang Utama 1: ADL <= 0.012
    if adl <= 0.012:
        return {
            "diagnosis": 1,
            "label": "Alzheimer",
            "confidence": 3 / 3,
            "leaf_counts": {"0": 0, "1": 3},
            "rule_path": "ADL <= 0.012",
            "source": "RapidMiner modelML.rmp (Rule Tree)"
        }

    # Cabang Utama 2: ADL > 0.012
    ldl = float(p.get("CholesterolLDL", 0.0))
    if ldl > 199.872:
        return {
            "diagnosis": 1,
            "label": "Alzheimer",
            "confidence": 2 / 2,
            "leaf_counts": {"0": 0, "1": 2},
            "rule_path": "ADL > 0.012 -> CholesterolLDL > 199.872",
            "source": "RapidMiner modelML.rmp (Rule Tree)"
        }

    # CholesterolLDL <= 199.872
    mmse = float(p.get("MMSE", 0.0))
    if mmse > 24.010:
        fa = float(p.get("FunctionalAssessment", 0.0))
        if fa > 9.894:
            return {
                "diagnosis": 1,
                "label": "Alzheimer",
                "confidence": 2 / 3,
                "leaf_counts": {"0": 1, "1": 2},
                "rule_path": "MMSE > 24.010 -> FunctionalAssessment > 9.894",
                "source": "RapidMiner modelML.rmp (Rule Tree)"
            }
        else:
            return {
                "diagnosis": 0,
                "label": "Non-Alzheimer",
                "confidence": 394 / 410,
                "leaf_counts": {"0": 394, "1": 16},
                "rule_path": "MMSE > 24.010 -> FunctionalAssessment <= 9.894",
                "source": "RapidMiner modelML.rmp (Rule Tree)"
            }

    # MMSE <= 24.010
    fa = float(p.get("FunctionalAssessment", 0.0))
    if fa > 5.001:
        mc = int(float(p.get("MemoryComplaints", 0)))
        if mc == 0:
            bp = int(float(p.get("BehavioralProblems", 0)))
            if bp == 0:
                return {
                    "diagnosis": 0,
                    "label": "Non-Alzheimer",
                    "confidence": 585 / 605,
                    "leaf_counts": {"0": 585, "1": 20},
                    "rule_path": "MMSE <= 24.010 -> FA > 5.001 -> MemoryComplaints=0 -> BehavioralProblems=0",
                    "source": "RapidMiner modelML.rmp (Rule Tree)"
                }
            else:  # BehavioralProblems == 1
                if adl > 5.038:
                    hdl = float(p.get("CholesterolHDL", 0.0))
                    if hdl > 93.227:
                        eth = float(p.get("Ethnicity", 0.0))
                        if eth > 1.500:
                            return {
                                "diagnosis": 0,
                                "label": "Non-Alzheimer",
                                "confidence": 2 / 2,
                                "leaf_counts": {"0": 2, "1": 0},
                                "rule_path": "ADL > 5.038 -> HDL > 93.227 -> Ethnicity > 1.500",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
                        else:
                            return {
                                "diagnosis": 1,
                                "label": "Alzheimer",
                                "confidence": 4 / 5,
                                "leaf_counts": {"0": 1, "1": 4},
                                "rule_path": "ADL > 5.038 -> HDL > 93.227 -> Ethnicity <= 1.500",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
                    else:
                        return {
                            "diagnosis": 0,
                            "label": "Non-Alzheimer",
                            "confidence": 54 / 55,
                            "leaf_counts": {"0": 54, "1": 1},
                            "rule_path": "ADL > 5.038 -> HDL <= 93.227",
                            "source": "RapidMiner modelML.rmp (Rule Tree)"
                        }
                else:  # ADL <= 5.038
                    sbp = float(p.get("SystolicBP", 0.0))
                    if sbp > 152.500:
                        trig = float(p.get("CholesterolTriglycerides", 0.0))
                        if trig > 273.179:
                            return {
                                "diagnosis": 0,
                                "label": "Non-Alzheimer",
                                "confidence": 3 / 3,
                                "leaf_counts": {"0": 3, "1": 0},
                                "rule_path": "ADL <= 5.038 -> SystolicBP > 152.500 -> Triglycerides > 273.179",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
                        else:
                            return {
                                "diagnosis": 1,
                                "label": "Alzheimer",
                                "confidence": 7 / 8,
                                "leaf_counts": {"0": 1, "1": 7},
                                "rule_path": "ADL <= 5.038 -> SystolicBP > 152.500 -> Triglycerides <= 273.179",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
                    else:
                        return {
                            "diagnosis": 1,
                            "label": "Alzheimer",
                            "confidence": 34 / 35,
                            "leaf_counts": {"0": 1, "1": 34},
                            "rule_path": "ADL <= 5.038 -> SystolicBP <= 152.500",
                            "source": "RapidMiner modelML.rmp (Rule Tree)"
                        }
        else:  # MemoryComplaints == 1
            if adl > 4.989:
                bp = int(float(p.get("BehavioralProblems", 0)))
                if bp == 0:
                    return {
                        "diagnosis": 0,
                        "label": "Non-Alzheimer",
                        "confidence": 68 / 72,
                        "leaf_counts": {"0": 68, "1": 4},
                        "rule_path": "MemoryComplaints=1 -> ADL > 4.989 -> BehavioralProblems=0",
                        "source": "RapidMiner modelML.rmp (Rule Tree)"
                    }
                else:
                    return {
                        "diagnosis": 1,
                        "label": "Alzheimer",
                        "confidence": 17 / 17,
                        "leaf_counts": {"0": 0, "1": 17},
                        "rule_path": "MemoryComplaints=1 -> ADL > 4.989 -> BehavioralProblems=1",
                        "source": "RapidMiner modelML.rmp (Rule Tree)"
                    }
            else:  # ADL <= 4.989
                pa = float(p.get("PhysicalActivity", 0.0))
                if pa > 3.171:
                    return {
                        "diagnosis": 1,
                        "label": "Alzheimer",
                        "confidence": 59 / 59,
                        "leaf_counts": {"0": 0, "1": 59},
                        "rule_path": "MemoryComplaints=1 -> ADL <= 4.989 -> PhysicalActivity > 3.171",
                        "source": "RapidMiner modelML.rmp (Rule Tree)"
                    }
                else:
                    alc = float(p.get("AlcoholConsumption", 0.0))
                    if alc > 15.338:
                        return {
                            "diagnosis": 0,
                            "label": "Non-Alzheimer",
                            "confidence": 4 / 5,
                            "leaf_counts": {"0": 4, "1": 1},
                            "rule_path": "PhysicalActivity <= 3.171 -> AlcoholConsumption > 15.338",
                            "source": "RapidMiner modelML.rmp (Rule Tree)"
                        }
                    else:
                        return {
                            "diagnosis": 1,
                            "label": "Alzheimer",
                            "confidence": 18 / 20,
                            "leaf_counts": {"0": 2, "1": 18},
                            "rule_path": "PhysicalActivity <= 3.171 -> AlcoholConsumption <= 15.338",
                            "source": "RapidMiner modelML.rmp (Rule Tree)"
                        }
    else:  # FunctionalAssessment <= 5.001
        if adl > 5.040:
            mc = int(float(p.get("MemoryComplaints", 0)))
            if mc == 0:
                bp = int(float(p.get("BehavioralProblems", 0)))
                if bp == 0:
                    return {
                        "diagnosis": 0,
                        "label": "Non-Alzheimer",
                        "confidence": 249 / 257,
                        "leaf_counts": {"0": 249, "1": 8},
                        "rule_path": "FA <= 5.001 -> ADL > 5.040 -> MemoryComplaints=0 -> BehavioralProblems=0",
                        "source": "RapidMiner modelML.rmp (Rule Tree)"
                    }
                else:
                    chol = float(p.get("CholesterolTotal", 0.0))
                    if chol > 164.786:
                        return {
                            "diagnosis": 1,
                            "label": "Alzheimer",
                            "confidence": 47 / 48,
                            "leaf_counts": {"0": 1, "1": 47},
                            "rule_path": "CholesterolTotal > 164.786",
                            "source": "RapidMiner modelML.rmp (Rule Tree)"
                        }
                    else:
                        age = float(p.get("Age", 0))
                        if age > 66:
                            return {
                                "diagnosis": 1,
                                "label": "Alzheimer",
                                "confidence": 5 / 5,
                                "leaf_counts": {"0": 0, "1": 5},
                                "rule_path": "Age > 66",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
                        else:
                            return {
                                "diagnosis": 0,
                                "label": "Non-Alzheimer",
                                "confidence": 2 / 2,
                                "leaf_counts": {"0": 2, "1": 0},
                                "rule_path": "Age <= 66",
                                "source": "RapidMiner modelML.rmp (Rule Tree)"
                            }
            else:  # MemoryComplaints == 1
                return {
                    "diagnosis": 1,
                    "label": "Alzheimer",
                    "confidence": 80 / 82,
                    "leaf_counts": {"0": 2, "1": 80},
                    "rule_path": "FA <= 5.001 -> ADL > 5.040 -> MemoryComplaints=1",
                    "source": "RapidMiner modelML.rmp (Rule Tree)"
                }
        else:  # ADL <= 5.040
            bmi = float(p.get("BMI", 0.0))
            if bmi > 39.925:
                return {
                    "diagnosis": 0,
                    "label": "Non-Alzheimer",
                    "confidence": 1 / 2,
                    "leaf_counts": {"0": 1, "1": 1},
                    "rule_path": "FA <= 5.001 -> ADL <= 5.040 -> BMI > 39.925",
                    "source": "RapidMiner modelML.rmp (Rule Tree)"
                }
            else:
                return {
                    "diagnosis": 1,
                    "label": "Alzheimer",
                    "confidence": 431 / 449,
                    "leaf_counts": {"0": 18, "1": 431},
                    "rule_path": "FA <= 5.001 -> ADL <= 5.040 -> BMI <= 39.925",
                    "source": "RapidMiner modelML.rmp (Rule Tree)"
                }
