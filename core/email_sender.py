"""
core/email_sender.py
====================
Custom email sender untuk Neura AI menggunakan Gmail SMTP.
Mengirimkan email verifikasi dengan desain HTML premium sesuai tema Neura AI.

Konfigurasi di .env:
    SMTP_EMAIL    = your.gmail@gmail.com
    SMTP_PASSWORD = xxxx xxxx xxxx xxxx  (Gmail App Password, bukan password biasa)
    SENDER_NAME   = Neura AI
"""

import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _get_smtp_config():
    return {
        "email": os.getenv("SMTP_EMAIL", "").strip(),
        "password": os.getenv("SMTP_PASSWORD", "").strip(),
        "sender_name": os.getenv("SENDER_NAME", "Neura AI").strip(),
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
    }


def is_smtp_configured():
    cfg = _get_smtp_config()
    return bool(cfg["email"] and cfg["password"] and "@" in cfg["email"])


def send_verification_email(to_email: str, display_name: str, verify_link: str) -> dict:
    """
    Kirim email verifikasi HTML premium ke pengguna.
    Returns: {"success": True} atau {"success": False, "error": str}
    """
    cfg = _get_smtp_config()

    if not is_smtp_configured():
        return {
            "success": False,
            "error": "SMTP belum dikonfigurasi. Isi SMTP_EMAIL dan SMTP_PASSWORD di file .env"
        }

    first_name = (display_name or to_email.split("@")[0]).split()[0]
    subject = f"Verifikasi Akun Klinis Neura AI — {first_name}"

    html_body = _build_email_html(first_name, to_email, verify_link)
    text_body = _build_email_plain(first_name, verify_link)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{cfg['sender_name']} <{cfg['email']}>"
    msg["To"]      = to_email
    msg["Reply-To"] = cfg["email"]

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["email"], cfg["password"])
            server.sendmail(cfg["email"], [to_email], msg.as_bytes())

        logger.info(f"[Neura Email] Verifikasi terkirim ke {to_email}")
        return {"success": True}

    except smtplib.SMTPAuthenticationError:
        msg_err = "Autentikasi SMTP gagal. Pastikan App Password Gmail sudah benar di SMTP_PASSWORD."
        logger.error(f"[Neura Email] {msg_err}")
        return {"success": False, "error": msg_err}
    except Exception as exc:
        logger.error(f"[Neura Email] Kirim email gagal: {exc}")
        return {"success": False, "error": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# Email HTML Template — Warm Linen + Terracotta Neura Design
# ─────────────────────────────────────────────────────────────────────────────

def _build_email_html(first_name: str, email: str, verify_link: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Verifikasi Akun Klinis — Neura AI</title>
  <!--[if mso]><style>table{{border-collapse:collapse;}}</style><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {{ margin:0; padding:0; background:#FAF9F5; font-family:'Inter',Arial,sans-serif; }}
    * {{ box-sizing:border-box; }}
    a {{ color:#D97757; text-decoration:none; }}
    a:hover {{ text-decoration:underline; }}
  </style>
</head>
<body style="margin:0;padding:0;background:#FAF9F5;font-family:'Inter',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAF9F5;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card container (max 560px) -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- ── HEADER BRAND ── -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#D97757;border-radius:12px;padding:10px 14px;vertical-align:middle;">
                    <img src="https://img.icons8.com/ios/24/ffffff/brain.png" alt="Neura" width="22" height="22" style="display:block;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:1.3rem;font-weight:600;color:#1F1E1D;letter-spacing:-0.03em;">Neura <span style="color:#D97757;">AI</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:#FFFFFF;border-radius:24px;border:1px solid #EAE6DC;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#D97757 0%,#E8856A 50%,#D97757 100%);height:5px;"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:44px 44px 0 44px;">

                    <!-- Badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#FBF2EE;border-radius:999px;padding:5px 14px;">
                          <span style="font-size:0.72rem;font-weight:600;color:#D97757;letter-spacing:0.05em;text-transform:uppercase;">
                            &#9679;&nbsp; Sistem Klinis Terverifikasi
                          </span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-size:0.72rem;font-weight:500;color:#9B9890;">AES-256</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="font-size:1.6rem;font-weight:600;color:#1F1E1D;letter-spacing:-0.03em;line-height:1.25;margin:0 0 12px 0;">
                      Verifikasi Akun Klinis Anda
                    </h1>
                    <p style="font-size:0.95rem;color:#63615A;line-height:1.6;margin:0 0 28px 0;">
                      Halo <strong style="color:#1F1E1D;">{first_name}</strong>,<br/>
                      Terima kasih telah mendaftar sebagai praktisi klinis di Neura AI.<br/>
                      Klik tombol di bawah untuk mengaktifkan akun dan mengakses
                      <strong style="color:#1F1E1D;">32 Biomarker Pasien</strong> &amp; Workspace.
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center">
                          <a href="{verify_link}" target="_blank"
                             style="display:inline-block;background:#D97757;color:#ffffff;font-size:0.95rem;font-weight:600;padding:15px 36px;border-radius:12px;letter-spacing:-0.01em;text-decoration:none;">
                            &#10003;&nbsp; Verifikasi Email Saya
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#FAF9F5;border:1px solid #EAE6DC;border-radius:12px;padding:16px;margin-bottom:32px;">
                      <tr>
                        <td>
                          <p style="font-size:0.78rem;color:#9B9890;margin:0 0 8px 0;font-weight:500;">
                            Atau salin tautan berikut ke browser Anda:
                          </p>
                          <p style="font-size:0.75rem;color:#D97757;word-break:break-all;margin:0;line-height:1.5;">
                            <a href="{verify_link}" style="color:#D97757;">{verify_link[:90]}{'...' if len(verify_link) > 90 else ''}</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- ── DIVIDER ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 44px;">
                    <hr style="border:none;border-top:1px solid #EAE6DC;margin:0;" />
                  </td>
                </tr>
              </table>

              <!-- ── INFO BOX ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:24px 44px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#FBF2EE;border-radius:12px;padding:16px 18px;">
                      <tr>
                        <td style="vertical-align:top;padding-right:12px;width:20px;">
                          <span style="font-size:1rem;">&#128274;</span>
                        </td>
                        <td>
                          <p style="font-size:0.8rem;color:#63615A;line-height:1.6;margin:0;">
                            <strong style="color:#1F1E1D;">Keamanan Rekam Medis:</strong>
                            Tautan ini hanya berlaku selama <strong>24 jam</strong> dan hanya dapat digunakan satu kali.
                            Jika Anda tidak merasa mendaftar, abaikan email ini. Tidak ada aksi yang akan dilakukan.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── FOOTER CARD ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#FAF9F5;border-top:1px solid #EAE6DC;border-radius:0 0 24px 24px;padding:20px 44px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:0.78rem;color:#9B9890;margin:0;line-height:1.5;">
                            Email ini dikirim ke <a href="mailto:{email}" style="color:#D97757;">{email}</a>
                            karena Anda mendaftar di platform Neura AI.
                          </p>
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          <span style="font-size:0.72rem;color:#9B9890;font-weight:500;">
                            &#128274; AES-256 Encrypted
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── OUTER FOOTER ── -->
          <tr>
            <td align="center" style="padding:28px 0 0 0;">
              <p style="font-size:0.78rem;color:#9B9890;margin:0 0 6px 0;">
                <strong style="color:#1F1E1D;">Neura AI</strong> &mdash; Sistem Deteksi Alzheimer Berbasis AI
              </p>
              <p style="font-size:0.75rem;color:#9B9890;margin:0;">
                &copy; 2024 Neura AI &bull;
                <a href="http://localhost:5000/welcome" style="color:#D97757;">Portal Klinis</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def _build_email_plain(first_name: str, verify_link: str) -> str:
    return f"""Halo {first_name},

Verifikasi Akun Klinis Neura AI Anda

Terima kasih telah mendaftar di Neura AI. Klik tautan berikut untuk mengaktifkan akun Anda:

{verify_link}

Tautan ini hanya berlaku 24 jam dan sekali pakai.

Jika Anda tidak merasa mendaftar, abaikan email ini.

---
Neura AI — Sistem Deteksi Alzheimer Berbasis AI
"""
