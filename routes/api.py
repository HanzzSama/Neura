"""
routes/api.py
=============
API Routes definition for User, Nakes, and Shared services in Neura AI (Neura Clean Architecture).
"""

from flask import Flask
from app.Http.Controllers.User.UserPredictController import user_predict_bp
from app.Http.Controllers.User.UserConsultationController import user_consult_bp
from app.Http.Controllers.User.UserChatController import user_chat_bp
from app.Http.Controllers.User.UserLiveKitController import user_livekit_bp
from app.Http.Controllers.User.UserProfileController import user_profile_bp
from app.Http.Controllers.User.UserSessionController import user_session_bp

from app.Http.Controllers.Nakes.NakesAuthController import nakes_auth_bp
from app.Http.Controllers.Nakes.NakesConsultationController import nakes_consult_bp

from app.Http.Controllers.Shared.FirebaseController import firebase_bp
from app.Http.Controllers.Shared.StatusController import status_bp
from app.Http.Controllers.Shared.NotificationController import notification_bp
from app.Http.Controllers.Shared.ScaffoldController import scaffold_bp


def register_api_routes(app: Flask):
    """Register all client, clinician, and shared API blueprints."""
    # Shared Services
    app.register_blueprint(firebase_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(scaffold_bp)

    # Nakes Role Routes
    app.register_blueprint(nakes_auth_bp, url_prefix="/api/nakes")
    app.register_blueprint(nakes_consult_bp, url_prefix="/api/consultation")

    # User Role Routes
    app.register_blueprint(user_predict_bp, url_prefix="/api")
    app.register_blueprint(user_consult_bp, url_prefix="/api/consultation")
    app.register_blueprint(user_chat_bp, url_prefix="/api")
    app.register_blueprint(user_livekit_bp, url_prefix="/api/livekit")
    app.register_blueprint(user_profile_bp, url_prefix="/api/user")
    app.register_blueprint(user_session_bp, url_prefix="/api/user")
