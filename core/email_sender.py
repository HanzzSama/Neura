"""
core/email_sender.py
====================
Custom email sender untuk Neura AI menggunakan Gmail SMTP.
Mengirimkan email verifikasi dan OTP 2FA Admin dengan desain HTML premium
sesuai tema Neura AI (Claude AI Minimalist Dark Theme).

Konfigurasi di .env:
    SMTP_EMAIL    = your.gmail@gmail.com
    SMTP_PASSWORD = xxxx xxxx xxxx xxxx  (Gmail App Password 16 karakter)
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


def send_verification_email(to_email: str, display_name: str, verify_link: str, firebase_sent: bool = False) -> dict:
    """
    Kirim email verifikasi "Confirm Email" HTML premium ke pengguna via Gmail SMTP.
    Jika firebase_sent=True, Firebase sudah kirim email native-nya — SMTP ini sebagai
    notifikasi pendamping yang menginformasikan user untuk cek inbox.
    Returns: {"success": True} atau {"success": False, "error": str}
    """
    cfg = _get_smtp_config()

    if not is_smtp_configured():
        return {
            "success": False,
            "error": "SMTP belum dikonfigurasi. Isi SMTP_EMAIL dan SMTP_PASSWORD di file .env"
        }

    first_name = (display_name or to_email.split("@")[0]).split()[0]
    subject = f"Konfirmasi Email Akun Neura AI — Confirm Email: {first_name}"

    html_body = _build_email_html(first_name, to_email, verify_link, firebase_sent=firebase_sent)
    text_body = _build_email_plain(first_name, verify_link, firebase_sent=firebase_sent)

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

        logger.info(f"[Neura Email] Email 'Confirm Email' berhasil terkirim ke {to_email}")
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
# Email HTML Template — User Verification "Confirm Email" (Claude AI Minimalist Dark)
# ─────────────────────────────────────────────────────────────────────────────

def _build_email_html(first_name: str, email: str, verify_link: str, firebase_sent: bool = False) -> str:
    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Konfirmasi Email — Neura AI</title>
  <!--[if mso]><style>table{{border-collapse:collapse;}}</style><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700&display=swap');
    body,html{{margin:0;padding:0;background:#0D1117;font-family:'Inter',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}}
    *{{box-sizing:border-box;}}
  </style>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:'Inter',system-ui,-apple-system,sans-serif;">

  <!-- ═══ OUTER WRAPPER ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#0D1117;padding:32px 12px;margin:0;width:100%;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- ═══ CONTAINER 520px (Safe for Gmail & Mobile) ═══ -->
        <table width="520" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;width:100%;margin:0 auto;border-collapse:collapse;">

          <!-- ── BRAND HEADER ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <!-- Logo icon -->
                  <td style="vertical-align:middle;padding-right:10px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:34px;height:34px;background:linear-gradient(135deg,#D97757,#C0614A);border-radius:9px;vertical-align:middle;">
                          <img src="https://img.icons8.com/ios/20/ffffff/brain.png"
                               alt="Brain" width="20" height="20"
                               style="display:block;margin:0 auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Brand name -->
                  <td style="vertical-align:middle;">
                    <span style="font-size:1.15rem;font-weight:700;color:#F0F6FC;letter-spacing:-0.03em;">Neura</span>
                    <span style="font-size:1.15rem;font-weight:700;color:#D97757;letter-spacing:-0.03em;">&nbsp;AI</span>
                    <span style="font-size:0.75rem;font-weight:600;color:#6E7681;letter-spacing:0.04em;text-transform:uppercase;margin-left:6px;">| Verification</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:#161B22;border-radius:16px;border:1px solid #21262D;overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#D97757,#E8A87C 45%,#7C78FF);height:3px;"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 28px 24px 28px;">

                    <!-- Badges Row -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                      <tr>
                        <td style="background:rgba(217,119,87,0.12);border:1px solid rgba(217,119,87,0.3);border-radius:999px;padding:4px 12px;">
                          <span style="font-size:0.68rem;font-weight:600;color:#E8A87C;letter-spacing:0.06em;text-transform:uppercase;">
                            &#9679;&nbsp; Aktivasi Akun
                          </span>
                        </td>
                        <td style="padding-left:8px;"></td>
                        <td style="background:rgba(124,120,255,0.1);border:1px solid rgba(124,120,255,0.25);border-radius:999px;padding:4px 10px;">
                          <span style="font-size:0.68rem;font-weight:600;color:#9D9AFF;letter-spacing:0.05em;text-transform:uppercase;">AES-256</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="font-size:1.35rem;font-weight:700;color:#F0F6FC;letter-spacing:-0.025em;line-height:1.25;margin:0 0 10px 0;">
                      Konfirmasi Alamat Email Anda
                    </h1>

                    <!-- Subtext -->
                    <p style="font-size:0.88rem;color:#8B949E;line-height:1.6;margin:0 0 18px 0;">
                      Halo <strong style="color:#F0F6FC;font-weight:600;">{first_name}</strong>,<br/>
                      Terima kasih telah bergabung di Neura AI. Silakan konfirmasi alamat email Anda untuk mengaktifkan akses ke <strong style="color:#F0F6FC;">Workspace Klinis</strong> &amp; <strong style="color:#D97757;">32 Biomarker Pasien</strong>:
                    </p>

                    <!-- Email chip -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:8px 14px;">
                          <span style="font-family:'SF Mono','Fira Code','Courier New',Courier,monospace;font-size:0.82rem;color:#D97757;letter-spacing:0.01em;">{email}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA BUTTON -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:22px;">
                      <tr>
                        <td align="center">
                          <a href="{verify_link}" target="_blank"
                             style="display:inline-block;background:linear-gradient(135deg,#D97757 0%,#C0614A 100%);color:#FFFFFF;font-size:0.95rem;font-weight:600;padding:14px 38px;border-radius:10px;letter-spacing:-0.01em;text-decoration:none;box-shadow:0 4px 16px rgba(217,119,87,0.35);">
                            {'&#128236;&nbsp; Cek Inbox Anda' if firebase_sent else '&#10003;&nbsp; Confirm Email'}
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Link fallback box -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#0D1117;border:1px solid #30363D;border-radius:9px;padding:12px 14px;margin-bottom:8px;">
                      <tr>
                        <td>
                          <p style="font-size:0.73rem;color:#8B949E;margin:0 0 6px 0;font-weight:500;">
                            Atau salin tautan verifikasi berikut ke browser Anda:
                          </p>
                          <p style="font-size:0.72rem;color:#D97757;word-break:break-all;margin:0;line-height:1.5;">
                            <a href="{verify_link}" style="color:#D97757;text-decoration:underline;">{verify_link[:85]}{'...' if len(verify_link) > 85 else ''}</a>
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
                  <td style="padding:0 28px;">
                    <hr style="border:none;border-top:1px solid #21262D;margin:0;" />
                  </td>
                </tr>
              </table>

              <!-- ── SECURITY NOTICE (Clean uniform border, NO border-left) ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 28px 22px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#0D1117;border:1px solid #30363D;border-radius:9px;overflow:hidden;">
                      <!-- Top accent strip -->
                      <tr>
                        <td style="height:2px;background:rgba(217,119,87,0.5);"></td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px;">
                          <!-- Label row -->
                          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
                            <tr>
                              <td style="vertical-align:middle;padding-right:6px;">
                                <span style="font-size:0.85rem;color:#E8A87C;">&#128274;</span>
                              </td>
                              <td>
                                <span style="font-size:0.76rem;font-weight:600;color:#F0F6FC;">Keamanan Rekam Medis</span>
                              </td>
                            </tr>
                          </table>
                          <p style="font-size:0.75rem;color:#8B949E;line-height:1.55;margin:0;">
                            Tautan ini berlaku selama <strong style="color:#D97757;">24 jam</strong> dan bersifat sekali pakai.
                            Jika Anda tidak merasa mendaftar di platform Neura AI, abaikan email ini dengan aman.
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
                  <td style="background:#0D1117;border-top:1px solid #21262D;border-radius:0 0 16px 16px;padding:12px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:0.7rem;color:#484F58;margin:0;line-height:1.4;">
                            Dikirim otomatis oleh sistem keamanan Neura AI
                          </p>
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          <span style="font-size:0.67rem;color:#6E7681;font-weight:500;background:rgba(255,255,255,0.03);border:1px solid #30363D;border-radius:5px;padding:3px 8px;">
                            &#128274;&nbsp;Verified System
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ OUTER FOOTER ═══ -->
          <tr>
            <td align="center" style="padding:22px 0 0 0;">
              <p style="font-size:0.73rem;color:#6E7681;margin:0 0 4px 0;letter-spacing:0.01em;">
                <strong style="color:#8B949E;font-weight:600;">Neura AI Security Controller</strong>
                &nbsp;&mdash;&nbsp; Sistem Deteksi Alzheimer Berbasis AI
              </p>
              <p style="font-size:0.68rem;color:#484F58;margin:0;">
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


def _build_email_plain(first_name: str, verify_link: str, firebase_sent: bool = False) -> str:
    if firebase_sent:
        action_line = """Firebase telah mengirimkan email verifikasi ke inbox Anda.
Silakan cek inbox (dan folder Spam) untuk email dari noreply@neura-f20b9.firebaseapp.com.

Atau klik tautan berikut untuk kembali ke halaman verifikasi:
{verify_link}""".format(verify_link=verify_link)
    else:
        action_line = """Klik tautan berikut untuk mengonfirmasi email dan mengaktifkan akun Anda:

Confirm Email:
{verify_link}""".format(verify_link=verify_link)

    return f"""Halo {first_name},

KONFIRMASI ALAMAT EMAIL - NEURA AI

Terima kasih telah mendaftar di platform Neura AI.
{action_line}

Tautan ini berlaku selama 24 jam dan hanya dapat digunakan satu kali.
Jika Anda tidak merasa mendaftar di Neura AI, abaikan email ini.

---
Neura AI Security Controller — Sistem Deteksi Alzheimer Berbasis AI
"""


# ─────────────────────────────────────────────────────────────────────────────
# Email HTML Template — Admin 2FA Security (Claude AI + Abstract Minimalist)
# ─────────────────────────────────────────────────────────────────────────────

def _build_admin_otp_html(admin_name: str, otp_code: str, custom_email: str) -> str:
    digits = list(str(otp_code).strip())

    # Individual digit cells — compact, elegant Claude-style dark floating boxes
    # Width 40px, height 50px, gap 7px -> fits comfortably within 520px container
    cells = []
    for i, d in enumerate(digits):
        cells.append(
            f'<td style="background:#0D1117;border:1px solid #30363D;border-radius:9px;width:40px;min-width:40px;max-width:40px;height:50px;text-align:center;font-size:22px;font-weight:700;color:#FFFFFF;font-family:\'Courier New\',Courier,monospace;vertical-align:middle;line-height:50px;">{d}</td>'
        )
        if i < len(digits) - 1:
            cells.append('<td style="width:7px;min-width:7px;max-width:7px;"></td>')
    digit_cells = "".join(cells)

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Kode OTP Admin — Neura AI</title>
  <!--[if mso]><style>table{{border-collapse:collapse;}}</style><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700&display=swap');
    body,html{{margin:0;padding:0;background:#0D1117;font-family:'Inter',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}}
    *{{box-sizing:border-box;}}
  </style>
</head>
<body style="margin:0;padding:0;background:#0D1117;font-family:'Inter',system-ui,-apple-system,sans-serif;">

  <!-- ═══ OUTER WRAPPER ═══ -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#0D1117;padding:32px 12px;margin:0;width:100%;">
    <tr>
      <td align="center" style="padding:0;">

        <!-- ═══ CONTAINER 520px (Safe for Gmail & Mobile) ═══ -->
        <table width="520" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;width:100%;margin:0 auto;border-collapse:collapse;">

          <!-- ── BRAND HEADER ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <!-- Logo icon -->
                  <td style="vertical-align:middle;padding-right:10px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="width:34px;height:34px;background:linear-gradient(135deg,#D97757,#C0614A);border-radius:9px;vertical-align:middle;">
                          <img src="https://img.icons8.com/ios-filled/18/ffffff/shield.png"
                               alt="Shield" width="18" height="18"
                               style="display:block;margin:0 auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Brand name -->
                  <td style="vertical-align:middle;">
                    <span style="font-size:1.15rem;font-weight:700;color:#F0F6FC;letter-spacing:-0.03em;">Neura</span>
                    <span style="font-size:1.15rem;font-weight:700;color:#D97757;letter-spacing:-0.03em;">&nbsp;AI</span>
                    <span style="font-size:0.75rem;font-weight:600;color:#6E7681;letter-spacing:0.04em;text-transform:uppercase;margin-left:6px;">| Security</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:#161B22;border-radius:16px;border:1px solid #21262D;overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#D97757,#E8A87C 45%,#7C78FF);height:3px;"></td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px 28px 24px 28px;">

                    <!-- Badges Row -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
                      <tr>
                        <td style="background:rgba(217,119,87,0.12);border:1px solid rgba(217,119,87,0.3);border-radius:999px;padding:4px 12px;">
                          <span style="font-size:0.68rem;font-weight:600;color:#E8A87C;letter-spacing:0.06em;text-transform:uppercase;">
                            &#9679;&nbsp; 2FA Aktif
                          </span>
                        </td>
                        <td style="padding-left:8px;"></td>
                        <td style="background:rgba(124,120,255,0.1);border:1px solid rgba(124,120,255,0.25);border-radius:999px;padding:4px 10px;">
                          <span style="font-size:0.68rem;font-weight:600;color:#9D9AFF;letter-spacing:0.05em;text-transform:uppercase;">AES-256</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Heading -->
                    <h1 style="font-size:1.35rem;font-weight:700;color:#F0F6FC;letter-spacing:-0.025em;line-height:1.25;margin:0 0 10px 0;">
                      Autentikasi Administrator
                    </h1>

                    <!-- Subtext -->
                    <p style="font-size:0.88rem;color:#8B949E;line-height:1.6;margin:0 0 20px 0;">
                      Halo <strong style="color:#F0F6FC;font-weight:600;">{admin_name}</strong>,<br/>
                      Permintaan akses panel terdeteksi untuk akun:
                    </p>

                    <!-- Email chip -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background:#0D1117;border:1px solid #30363D;border-radius:8px;padding:8px 14px;">
                          <span style="font-family:'SF Mono','Fira Code','Courier New',Courier,monospace;font-size:0.82rem;color:#D97757;letter-spacing:0.01em;">{custom_email}</span>
                        </td>
                      </tr>
                    </table>

                    <!-- OTP SECTION LABEL -->
                    <p style="font-size:0.68rem;font-weight:600;color:#6E7681;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px 0;">
                      Kode One-Time Password (OTP)
                    </p>

                    <!-- OTP DIGIT BOXES -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        {digit_cells}
                      </tr>
                    </table>

                    <!-- Validity indicator -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">
                      <tr>
                        <td style="vertical-align:middle;padding-right:6px;">
                          <div style="width:7px;height:7px;background:#D97757;border-radius:50%;display:inline-block;"></div>
                        </td>
                        <td>
                          <span style="font-size:0.78rem;color:#8B949E;font-weight:500;">
                            Berlaku selama <strong style="color:#D97757;">5 menit</strong> &mdash; jangan berikan kode ini ke siapa pun.
                          </span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- ── DIVIDER ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 28px;">
                    <hr style="border:none;border-top:1px solid #21262D;margin:0;" />
                  </td>
                </tr>
              </table>

              <!-- ── SECURITY NOTICE (Clean uniform border, NO border-left) ── -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:18px 28px 22px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                           style="background:#0D1117;border:1px solid #30363D;border-radius:9px;overflow:hidden;">
                      <!-- Top accent strip -->
                      <tr>
                        <td style="height:2px;background:rgba(217,119,87,0.5);"></td>
                      </tr>
                      <tr>
                        <td style="padding:12px 16px;">
                          <!-- Label row -->
                          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
                            <tr>
                              <td style="vertical-align:middle;padding-right:6px;">
                                <span style="font-size:0.85rem;color:#E8A87C;">&#9888;</span>
                              </td>
                              <td>
                                <span style="font-size:0.76rem;font-weight:600;color:#F0F6FC;">Peringatan Keamanan</span>
                              </td>
                            </tr>
                          </table>
                          <p style="font-size:0.75rem;color:#8B949E;line-height:1.55;margin:0;">
                            Jangan pernah membagikan kode OTP ini kepada siapa pun &mdash; termasuk staf atau tim teknis Neura AI.
                            Jika Anda tidak merasa login, <strong style="color:#D97757;font-weight:600;">segera amankan akun Anda</strong>.
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
                  <td style="background:#0D1117;border-top:1px solid #21262D;border-radius:0 0 16px 16px;padding:12px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <p style="font-size:0.7rem;color:#484F58;margin:0;line-height:1.4;">
                            Dikirim otomatis oleh sistem keamanan Neura AI
                          </p>
                        </td>
                        <td align="right" style="white-space:nowrap;">
                          <span style="font-size:0.67rem;color:#6E7681;font-weight:500;background:rgba(255,255,255,0.03);border:1px solid #30363D;border-radius:5px;padding:3px 8px;">
                            &#128274;&nbsp;Administrator
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ═══ OUTER FOOTER ═══ -->
          <tr>
            <td align="center" style="padding:22px 0 0 0;">
              <p style="font-size:0.73rem;color:#6E7681;margin:0 0 4px 0;letter-spacing:0.01em;">
                <strong style="color:#8B949E;font-weight:600;">Neura AI Security Controller</strong>
                &nbsp;&mdash;&nbsp; Sistem Deteksi Alzheimer Berbasis AI
              </p>
              <p style="font-size:0.68rem;color:#484F58;margin:0;">
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

Permintaan masuk terdeteksi menggunakan email admin: {custom_email}

KODE OTP ANDA:
>>>  {otp_code}  <<<

Kode ini berlaku selama 5 menit.
PERINGATAN: Jangan pernah membagikan kode OTP ini kepada siapa pun.

Jika Anda tidak merasa melakukan permintaan ini, segera hubungi tim keamanan Neura AI.

---
Neura AI Security Controller
"""
