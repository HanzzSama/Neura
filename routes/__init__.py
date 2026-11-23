"""
routes/__init__.py
==================
Central Route Registry for Neura AI (Neura Clean Architecture).
"""

from flask import Flask
from routes.api import register_api_routes
from routes.admin import register_admin_routes
from routes.web import register_web_routes


def register_routes(app: Flask):
    """Register all web, api, and admin routes with the Flask application."""
    register_api_routes(app)
    register_admin_routes(app)
    register_web_routes(app)
