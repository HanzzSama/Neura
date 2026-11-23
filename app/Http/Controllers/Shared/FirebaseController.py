from app.Http.Controllers.Shared.firebase_routes import (
    shared_bp as firebase_bp,
    get_firebase_admin_auth,
    api_firebase_config,
    api_about,
    api_send_verification_email,
)

__all__ = [
    "firebase_bp",
    "get_firebase_admin_auth",
    "api_firebase_config",
    "api_about",
    "api_send_verification_email",
]
