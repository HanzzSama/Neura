"""
core/admin_config.py
====================
Konfigurasi Pemetaan Email Custom Khusus Admin Neura AI.

Struktur Pemetaan:
- Key (kiri): Email custom admin yang digunakan saat login di form (contoh: "hanzz@neura.dr.id").
- Value (kanan):
    - "real_emails": Array alamat email asli tujuan pengiriman kode OTP 2FA (contoh: ["haidarandrianno@gmail.com"]).
    - "name": Nama tampilan admin.
    - "role": Role sistem ("Admin").
    - "description": Keterangan hak akses.

Admin dapat mendaftarkan beberapa email asli sekaligus dalam array `real_emails`.
"""

import os
import re

ADMIN_ACCOUNTS = {
    "hanzz@neura.dr.id": {
        "real_emails": [
            "haidarandrianno098@gmail.com"
        ],
        "name": "Haidar Rifky A",
        "role": "Admin",
        "description": "Lead System Administrator & Core AI Controller",
    },
    "jkmaiden@neura.dr.id": {
        "real_emails": [
            "syafiqahmadannaufal9@gmail.com"
        ],
        "name": "Syafiq Ahmad A.",
        "role": "Admin",
        "description": "System Administrator",
    },
    "muhammadhasan.cg@gmail.com": {
        "real_emails": [
            "a320250028@itesa.ac.id"
        ],
        "name": "Muhammad Hasanudin",
        "role": "Admin",
        "description": "System Administrator",
    },
    "muhammadhasan.cg@neura.dr.id": {
        "real_emails": [
            "a320250028@itesa.ac.id"
        ],
        "name": "Muhammad Hasanudin",
        "role": "Admin",
        "description": "System Administrator",
    },
    "maman@neura.dr.id": {
        "real_emails": [
            "khoirlukman303@gmail.com"
        ],
        "name": "Muhammad Khoir Luqman",
        "role": "Admin",
        "description": "System Administrator",
    },
    "mychel09@neura.dr.id": {
        "real_emails": [
            "dandibdr2209@gmail.com"
        ],
        "name": "Bahtiar Dzikrul Redjeb",
        "role": "Admin",
        "description": "System Administrator",
    },
    "jester19@neura.dr.id": {
        "real_emails": [
            "susiawanandika06@gmail.com"
        ],
        "name": "Andika Putra S",
        "role": "Admin",
        "description": "System Administrator",
    },
    "tsaritsaanastasya@neura.dr.id": {
        "real_emails": [
            "ridhosapen701@gmail.com"
        ],
        "name": "Ridho Romadhani",
        "role": "Admin",
        "description": "System Administrator",
    },
}


def mask_email(email: str) -> str:
    """Mask email for privacy, e.g. haidarandrianno@gmail.com -> hai***no@gmail.com."""
    if not email or "@" not in email:
        return email
    user_part, domain_part = email.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    elif len(user_part) <= 4:
        masked_user = user_part[:2] + "***"
    else:
        masked_user = user_part[:3] + "***" + user_part[-2:]
    return f"{masked_user}@{domain_part}"


def get_admin_by_custom_email(email: str):
    """
    Cari data admin berdasarkan email custom (case-insensitive).
    Returns dict admin jika ditemukan, atau None.
    """
    if not email:
        return None
    cleaned = email.strip().lower()
    return ADMIN_ACCOUNTS.get(cleaned)


def is_admin_custom_email(email: str) -> bool:
    """Periksa apakah email merupakan email custom admin terdaftar."""
    return get_admin_by_custom_email(email) is not None


def get_admin_real_emails(email: str) -> list:
    """Ambil list email asli penerima OTP untuk email custom tertentu."""
    admin = get_admin_by_custom_email(email)
    if not admin:
        return []
    return admin.get("real_emails", [])


def get_all_admin_custom_emails() -> list:
    """Ambil seluruh daftar email custom admin."""
    return list(ADMIN_ACCOUNTS.keys())
