"""
app/Models/__init__.py
======================
Laravel v13 Style Model Definitions for MySQL neura_db.
"""

from app.Models.User import User
from app.Models.UserProfile import UserProfile
from app.Models.Nakes import Nakes
from app.Models.Consultation import Consultation
from app.Models.PredictionRecord import PredictionRecord
from app.Models.ResearchDispatch import ResearchDispatch

__all__ = [
    "User",
    "UserProfile",
    "Nakes",
    "Consultation",
    "PredictionRecord",
    "ResearchDispatch",
]
