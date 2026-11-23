"""
routes/admin.py
===============
Admin API Routes definition in Neura AI (Neura Clean Architecture).
"""

from flask import Flask
from app.Http.Controllers.Admin.AdminAuthController import admin_auth_bp
from app.Http.Controllers.Admin.AdminNakesController import admin_nakes_bp
from app.Http.Controllers.Admin.AdminMlController import admin_ml_bp
from app.Http.Controllers.Admin.AdminResearchController import admin_research_bp


def register_admin_routes(app: Flask):
    """Register all administrative, ML management, and publication blueprints."""
    app.register_blueprint(admin_auth_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_nakes_bp, url_prefix="/api/admin")
    app.register_blueprint(admin_ml_bp, url_prefix="/api")
    app.register_blueprint(admin_research_bp, url_prefix="/api")
