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
from dotenv import load_dotenv
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)


def _get_smtp_config():
    load_dotenv(override=True)
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


def _create_smtp_connection(cfg):
    """Membuat koneksi SMTP yang mendukung SSL (465) maupun STARTTLS (587)."""
    if cfg["port"] == 465:
        server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15)
    else:
        server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
    server.login(cfg["email"], cfg["password"])
    return server



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
        with _create_smtp_connection(cfg) as server:
            server.sendmail(cfg["email"], [to_email], msg.as_bytes())

        logger.info(f"[Neura Email] Verifikasi terkirim ke {to_email}")
        return {"success": True}

    except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as exc:
        msg_err = "Autentikasi SMTP gagal (BadCredentials). Pastikan App Password Gmail 16-karakter sudah benar di SMTP_PASSWORD."
        logger.error(f"[Neura Email] {msg_err} (detail: {exc})")
        return {"success": False, "error": msg_err}
    except Exception as exc:
        logger.error(f"[Neura Email] Kirim email gagal: {exc}")
        return {"success": False, "error": str(exc)}


def send_admin_otp_email(to_emails: list, admin_name: str, otp_code: str, custom_email: str = "") -> dict:
    """
    Kirim kode verifikasi OTP 2FA Admin ke seluruh alamat email asli dalam array to_emails.
    Returns: {"success": True, "sent_to": list} atau {"success": False, "error": str}
    """
    cfg = _get_smtp_config()

    if not is_smtp_configured():
        return {
            "success": False,
            "error": "SMTP belum dikonfigurasi. Isi SMTP_EMAIL dan SMTP_PASSWORD di file .env",
            "smtp_configured": False
        }

    if not to_emails:
        return {
            "success": False,
            "error": "Daftar email tujuan (real_emails) kosong."
        }

    first_name = (admin_name or "Administrator").split()[0]
    subject = f"Kode OTP Keamanan Admin Neura AI: {otp_code}"

    html_body = _build_admin_otp_html(admin_name, otp_code, custom_email)
    text_body = _build_admin_otp_plain(admin_name, otp_code, custom_email)

    sent_successfully = []
    errors = []

    try:
        with _create_smtp_connection(cfg) as server:
            for recipient in to_emails:
                recipient = recipient.strip()
                if not recipient or "@" not in recipient:
                    continue

                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"]    = f"{cfg['sender_name']} <{cfg['email']}>"
                msg["To"]      = recipient
                msg["Reply-To"] = cfg["email"]

                msg.attach(MIMEText(text_body, "plain", "utf-8"))
                msg.attach(MIMEText(html_body, "html", "utf-8"))

                server.sendmail(cfg["email"], [recipient], msg.as_bytes())
                sent_successfully.append(recipient)
                logger.info(f"[Neura Admin 2FA] OTP terkirim ke {recipient} untuk akun {custom_email}")

        if sent_successfully:
            return {"success": True, "sent_to": sent_successfully}
        else:
            return {"success": False, "error": "Tidak ada email tujuan yang valid.", "details": errors}

    except (smtplib.SMTPAuthenticationError, smtplib.SMTPServerDisconnected) as exc:
        msg_err = "Autentikasi SMTP gagal (BadCredentials). Periksa App Password Gmail di SMTP_PASSWORD."
        logger.error(f"[Neura Admin 2FA] {msg_err} (detail: {exc})")
        return {"success": False, "error": msg_err}
    except Exception as exc:
        logger.error(f"[Neura Admin 2FA] Gagal mengirim OTP: {exc}")
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


# ─────────────────────────────────────────────────────────────────────────────
# Email HTML Template — Admin 2FA Security (Crimson + Slate)
# ─────────────────────────────────────────────────────────────────────────────

def _build_admin_otp_html(admin_name: str, otp_code: str, custom_email: str) -> str:
    digits = list(str(otp_code).strip())
    # Format each digit into a styled box
    digit_cells = "".join([
        f'<td style="background:#FAF9F5;border:2px solid #DC2626;border-radius:10px;width:44px;height:52px;text-align:center;font-size:24px;font-weight:700;color:#1F1E1D;font-family:\'Courier New\',Courier,monospace;letter-spacing:1px;vertical-align:middle;">{d}</td>'
        + ('<td style="width:8px;"></td>' if i < len(digits) - 1 else '')
        for i, d in enumerate(digits)
    ])

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Kode Keamanan Admin 2FA — Neura AI</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body, html {{ margin:0; padding:0; background:#0F172A; font-family:'Inter',Arial,sans-serif; }}
    * {{ box-sizing:border-box; }}
  </style>
</head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Inter',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0F172A;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card container (max 560px) -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <!-- ── HEADER BRAND ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#DC2626;border-radius:12px;padding:10px 14px;vertical-align:middle;">
                    <img src="https://img.icons8.com/ios-filled/24/ffffff/shield.png" alt="Shield" width="22" height="22" style="display:block;" />
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:1.3rem;font-weight:700;color:#F8FAFC;letter-spacing:-0.03em;">Neura <span style="color:#EF4444;">Admin</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:#1E293B;border-radius:24px;border:1px solid #334155;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);">

              <!-- Top accent bar (Crimson security) -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#DC2626 0%,#EF4444 50%,#B91C1C 100%);height:5px;"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:40px 40px 0 40px;">

                    <!-- Security Badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                      <tr>
                        <td style="background:rgba(220,38,38,0.18);border:1px solid rgba(239,68,68,0.4);border-radius:999px;padding:5px 14px;">
                          <span style="font-size:0.72rem;font-weight:700;color:#FCA5A5;letter-spacing:0.06em;text-transform:uppercase;">
                            &#9679;&nbsp; Verifikasi Keamanan Dua Faktor (2FA)
                          </span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-size:0.72rem;font-weight:600;color:#94A3B8;">AES-256</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Title -->
                    <h1 style="font-size:1.55rem;font-weight:700;color:#F8FAFC;letter-spacing:-0.03em;line-height:1.25;margin:0 0 12px 0;">
                      Autentikasi Administrator
                    </h1>
                    <p style="font-size:0.92rem;color:#CBD5E1;line-height:1.6;margin:0 0 24px 0;">
                      Halo <strong style="color:#FFFFFF;">{admin_name}</strong>,<br/>
                      Permintaan masuk dengan hak akses penuh terdeteksi menggunakan email custom admin:
                      <br/>
                      <span style="display:inline-block;margin-top:6px;background:rgba(15,23,42,0.6);border:1px solid #475569;border-radius:8px;padding:5px 12px;font-family:monospace;font-size:0.88rem;color:#FCA5A5;">
                        {custom_email}
                      </span>
                    </p>

                    <!-- OTP Code Box Container -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#0F172A;border:1px solid #334155;border-radius:16px;padding:28px 20px;margin-bottom:26px;">
                      <tr>
                        <td align="center">
                          <p style="font-size:0.75rem;font-weight:600;color:#94A3B8;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 14px 0;">
                            Kode One-Time Password (OTP) Anda
                          </p>
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              {digit_cells}
                            </tr>
                          </table>
                          <p style="font-size:0.8rem;color:#EF4444;margin:14px 0 0 0;font-weight:600;">
                            &#9201;&nbsp; Berlaku selama 5 menit
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
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid #334155;margin:0;" />
                  </td>
                </tr>
              </table>

              <!-- ── CAUTION INFO BOX ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:22px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.3);border-radius:12px;padding:14px 16px;">
                      <tr>
                        <td style="vertical-align:top;padding-right:10px;width:18px;">
                          <span style="font-size:1.1rem;color:#EF4444;">&#9888;</span>
                        </td>
                        <td>
                          <p style="font-size:0.8rem;color:#E2E8F0;line-height:1.55;margin:0;">
                            <strong style="color:#FFFFFF;">Peringatan Keamanan:</strong>
                            Jangan pernah membagikan kode ini kepada siapa pun termasuk staf dukungan.
                            Jika Anda tidak meminta masuk, segera amankan kredensial akun Anda.
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
                  <td style="background:#0F172A;border-top:1px solid #334155;border-radius:0 0 24px 24px;padding:18px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:0.76rem;color:#94A3B8;margin:0;line-height:1.4;">
                            Email verifikasi ini dikirimkan otomatis oleh sistem keamanan Neura AI.
                          </p>
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          <span style="font-size:0.72rem;color:#94A3B8;font-weight:600;">
                            &#128274; Role: Administrator
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
            <td align="center" style="padding:24px 0 0 0;">
              <p style="font-size:0.75rem;color:#64748B;margin:0 0 4px 0;">
                <strong style="color:#94A3B8;">Neura AI Security Controller</strong> &mdash; Sistem Deteksi Alzheimer Berbasis AI
              </p>
              <p style="font-size:0.72rem;color:#475569;margin:0;">
                &copy; 2024 Neura AI. Hak Cipta Dilindungi Undang-Undang.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


def _build_admin_otp_plain(admin_name: str, otp_code: str, custom_email: str) -> str:
    return f"""Halo {admin_name},

AUTENTIKASI DUA FAKTOR (2FA) ADMINISTRATOR - NEURA AI

Permintaan masuk terdeteksi menggunakan email custom admin: {custom_email}

KODE OTP ANDA:
>>>  {otp_code}  <<<

Kode ini berlaku selama 5 menit.
PERINGATAN: Jangan pernah membagikan kode OTP ini kepada siapa pun.

Jika Anda tidak merasa melakukan permintaan ini, segera hubungi tim keamanan Neura AI.

---
Neura AI Security Controller
"""
