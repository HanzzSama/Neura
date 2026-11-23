"""
app/Services/Notification/EmailService.py
=========================================
Service pengiriman email resmi Neura AI menggunakan SMTP (Gmail/Custom).
Mendukung verifikasi email, OTP 2FA admin, dan notifikasi klinis.
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config.app import APP_NAME
from app.Services.Logger.LoggerService import get_logger

logger = get_logger(__name__)


class EmailService:
    @staticmethod
    def get_smtp_config():
        return {
            "email": os.getenv("SMTP_EMAIL", "").strip(),
            "password": os.getenv("SMTP_PASSWORD", "").strip(),
            "sender_name": os.getenv("SENDER_NAME", APP_NAME).strip(),
            "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", "465")),
        }

    @classmethod
    def is_configured(cls):
        cfg = cls.get_smtp_config()
        return bool(cfg["email"] and cfg["password"] and "@" in cfg["email"])

    @classmethod
    def create_connection(cls):
        cfg = cls.get_smtp_config()
        host = cfg.get("host", "smtp.gmail.com")
        port = int(cfg.get("port", 465))

        try:
            if port == 465:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()
            server.login(cfg["email"], cfg["password"])
            return server
        except Exception as exc:
            if port != 465:
                logger.warning(f"[EmailService] Fallback to port 465 SSL due to: {exc}")
                server = smtplib.SMTP_SSL(host, 465, timeout=15)
                server.login(cfg["email"], cfg["password"])
                return server
            raise

    @classmethod
    def send_admin_otp(cls, to_emails: list, admin_name: str, otp_code: str) -> dict:
        if not cls.is_configured():
            return {"success": False, "error": "SMTP belum dikonfigurasi di file .env"}

        cfg = cls.get_smtp_config()
        subject = f"Kode OTP Keamanan Admin Neura AI: {otp_code}"
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; background: #0c0d0e; color: #ececed; border: 1px solid #232528; border-radius: 14px; padding: 32px;">
            <div style="margin-bottom: 24px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Neura AI • Verifikasi Admin</h2>
                <p style="color: #8b8d91; font-size: 13px; margin-top: 6px;">Autentikasi Dua Faktor (2FA) Keamanan Klinis</p>
            </div>
            <div style="background: #161719; border: 1px solid #2b2d31; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #d97757; font-family: monospace;">{otp_code}</span>
            </div>
            <p style="color: #b0b2b8; font-size: 14px; line-height: 1.6;">Halo <strong>{admin_name}</strong>, gunakan kode di atas untuk memverifikasi sesi akses panel administratif Anda. Kode ini berlaku selama 10 menit.</p>
            <p style="color: #6d6f73; font-size: 12px; margin-top: 24px; border-top: 1px solid #232528; padding-top: 16px;">Jika Anda tidak merasa melakukan permintaan ini, segera amankan akun Anda.</p>
        </div>
        """
        try:
            with cls.create_connection() as server:
                for recipient in to_emails:
                    recipient = recipient.strip()
                    if not recipient or "@" not in recipient:
                        continue
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = f"{cfg['sender_name']} <{cfg['email']}>"
                    msg["To"] = recipient
                    msg.attach(MIMEText(f"Kode OTP Admin Neura AI: {otp_code}", "plain", "utf-8"))
                    msg.attach(MIMEText(html_body, "html", "utf-8"))
                    server.sendmail(cfg["email"], [recipient], msg.as_bytes())
            return {"success": True}
        except Exception as e:
            logger.error(f"[EmailService] Failed to send OTP: {e}")
            return {"success": False, "error": str(e)}
