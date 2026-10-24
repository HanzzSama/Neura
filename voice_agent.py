"""
voice_agent.py
==============
LiveKit Voice AI Agent for Neura Alzheimer's Clinical Screening.
Enables real-time, bidirectional voice consultations with medical reasoning tools.

Run with:
    python voice_agent.py dev
or:
    python voice_agent.py start
"""

import os
import sys
import json
import logging
from typing import Any, Dict
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 console output for Windows terminal
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load .env
load_dotenv()

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    function_tool,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import silero, deepgram, openai

logger = logging.getLogger("neura-voice-agent")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Lazy-loaded Neura predictors
_predictor = None
_chat_mgr = None


def get_predictor():
    global _predictor
    if _predictor is None:
        try:
            from scripts.predict_xgboost_alzheimer import AlzheimersPredictor
            _predictor = AlzheimersPredictor()
            logger.info("AlzheimersPredictor loaded successfully for voice agent.")
        except Exception as e:
            logger.warning(f"Could not load AlzheimersPredictor: {e}")
            _predictor = None
    return _predictor


def get_chat_mgr():
    global _chat_mgr
    if _chat_mgr is None:
        try:
            from features.chat_manager import ChatDatasetManager
            _chat_mgr = ChatDatasetManager()
            logger.info("ChatDatasetManager loaded successfully for voice agent.")
        except Exception as e:
            logger.warning(f"Could not load ChatDatasetManager: {e}")
            _chat_mgr = None
    return _chat_mgr


# ---------------------------------------------------------------------------
# Clinical Tools for Neura Voice Assistant
# ---------------------------------------------------------------------------

@function_tool(
    description=(
        "Kalkulasi prediksi risiko Alzheimer menggunakan model XGBoost klinis Neura (32 biomarker). "
        "Membutuhkan usia pasien, skor tes kognitif MMSE (0-30), ada/tidaknya keluhan daya ingat, "
        "dan ada/tidaknya perubahan perilaku."
    )
)
def predict_alzheimers_risk(
    age: int,
    mmse_score: float,
    memory_complaints: bool,
    behavioral_problems: bool,
    adl_score: float = 5.0,
) -> str:
    """Run Neura XGBoost clinical model prediction."""
    predictor = get_predictor()
    if not predictor:
        return "Model XGBoost Neura belum dimuat atau checkpoint tidak tersedia di server."

    patient_payload = {
        "Age": int(age),
        "Gender": 0,
        "MMSE": float(mmse_score),
        "ADL": float(adl_score),
        "FunctionalAssessment": 5.0,
        "MemoryComplaints": 1 if memory_complaints else 0,
        "BehavioralProblems": 1 if behavioral_problems else 0,
    }

    try:
        res = predictor.predict_patient(patient_payload)
        return (
            f"Hasil Skrining Model Neura XGBoost:\n"
            f"- Kategori: {res.get('diagnosis_label')}\n"
            f"- Tingkat Risiko: {res.get('risk_level')}\n"
            f"- Probabilitas Klinis: {res.get('probability_percent')}%\n"
            f"- Tingkat Keyakinan: {res.get('confidence')}\n"
            f"Harap jelaskan hasil ini secara empatis kepada pasien, dan tegaskan bahwa ini adalah skrining awal."
        )
    except Exception as e:
        return f"Terjadi kendala saat menghitung prediksi: {str(e)}"


@function_tool(
    description=(
        "Mencari basis data klinis Neura terkait gejala, tes MMSE, pencegahan demensia, "
        "faktor risiko, atau biomarker spesifik."
    )
)
def lookup_clinical_knowledge(query: str) -> str:
    """Search Neura clinical guidance database."""
    mgr = get_chat_mgr()
    if not mgr:
        return "Basis data klinis Neura belum dimuat."

    res = mgr.find_consultation_response(query)
    if res.get("matched"):
        return f"Informasi Klinis Neura ({res.get('topic', '')}):\n{res.get('reply', '')}"
    return "Tidak ada data spesifik yang cocok, berikan penjelasan medis umum yang aman dan tervalidasi."


SYSTEM_INSTRUCTIONS = """
Anda adalah Neura Clinical Voice Assistant, asisten kecerdasan buatan medis terpercaya untuk skrining dan konsultasi awal risiko penyakit Alzheimer.

KARAKTER & GAYA BICARA:
1. Berbicara dalam Bahasa Indonesia yang hangat, tenang, sopan, dan penuh empati.
2. JAWABAN HARUS SINGKAT, PADAT, DAN ALAMI. Karena ini adalah komunikasi suara langsung (real-time voice), batasi setiap respons dalam 1 hingga 3 kalimat ringkas. Hindari bullet points, format markdown, atau penjelasan ensiklopedia yang panjang.
3. Dengarkan dengan saksama keluhan pasien (misal: sering lupa nama kerabat, disorientasi tempat/waktu, kesulitan menghitung atau melakukan aktivitas harian).

PROSES KONSULTASI:
- Tanyakan secara santai dan bertahap:
  1. Usia pasien
  2. Apakah ada keluhan sering lupa (misal lupa peristiwa baru, menaruh barang di tempat aneh)
  3. Apakah ada perubahan suasana hati atau perilaku
  4. Bila pasien pernah menjalani tes MMSE (Mini-Mental State Examination), tanyakan skornya (skala 0 - 30, normal >= 24)
- Jika data dasar sudah diperoleh, gunakan tool `predict_alzheimers_risk` untuk memeriksa probabilitas risiko awal.
- Sampaikan hasilnya dengan bijak dan tanpa menakut-nakuti pasien.

DISCLAIMER MEDIS:
- Selalu ingatkan bahwa hasil analisis Neura adalah skrining risiko awal berbasis AI dan biomarker, BUKAN diagnosis definitif. Pasien disarankan berkonsultasi langsung dengan dokter spesialis neurologi / saraf untuk pemeriksaan menyeluruh.
"""


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize Voice Agent components
    vad_plugin = silero.VAD.load()
    stt_plugin = deepgram.STT(language="id", model="nova-2")
    llm_plugin = openai.LLM(model="gpt-4o-mini")
    tts_plugin = openai.TTS(voice="alloy")

    agent = Agent(
        instructions=SYSTEM_INSTRUCTIONS,
        tools=[predict_alzheimers_risk, lookup_clinical_knowledge],
    )

    session = AgentSession(
        vad=vad_plugin,
        stt=stt_plugin,
        llm=llm_plugin,
        tts=tts_plugin,
    )

    await session.start(agent, room=ctx.room)

    # Greet user warmly upon connection
    await session.say(
        "Halo, saya Neura Assistant. Ada yang bisa saya bantu atau ingin dikonsultasikan seputar kesehatan daya ingat hari ini?"
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
