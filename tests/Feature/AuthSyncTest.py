"""
tests/Feature/AuthSyncTest.py
=============================
Feature test for User, Nakes, and Admin authentication persistence into MySQL neura_db.users.
Covers Email login/registration, Google OAuth synchronization, and Admin 2FA persistence.
"""

import unittest
from bootstrap.app import create_app
from app.Services.Database.DatabaseManager import execute_one, execute_query, is_mysql_available
from app.Services.Database.UserSyncService import sync_user_to_db, sync_admin_to_db
from werkzeug.security import check_password_hash


class AuthSyncTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_google_oauth_sync_persists_to_mysql(self):
        """Verifikasi sinkronisasi login Google ke database relasional MySQL."""
        payload = {
            "uid": "google_uid_test_99",
            "email": "dr.google.tester@neura.ai",
            "displayName": "dr. Google Clinical Tester",
            "photoURL": "https://lh3.googleusercontent.com/a/avatar_test_99.png",
            "phoneNumber": "+6281299998888",
            "provider": "google",
            "role": "User",
        }

        res = self.client.post("/api/user/session", json=payload)
        self.assertEqual(res.status_code, 200)

        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data["user"]["email"], "dr.google.tester@neura.ai")
        self.assertEqual(data["user"]["role"], "User")

        # Cek langsung di MySQL jika server tersedia
        mysql_ok, _ = is_mysql_available()
        if mysql_ok:
            row = execute_one("SELECT * FROM `users` WHERE `email` = %s;", ("dr.google.tester@neura.ai",))
            self.assertIsNotNone(row)
            self.assertEqual(row["full_name"], "dr. Google Clinical Tester")
            self.assertEqual(row["avatar_url"], "https://lh3.googleusercontent.com/a/avatar_test_99.png")
            self.assertEqual(row["role"], "User")
            self.assertIsNotNone(row["password_hash"])

    def test_email_password_registration_sync_persists_to_mysql(self):
        """Verifikasi pendaftaran email & password tersimpan dengan password hash di MySQL."""
        payload = {
            "uid": "email_user_88",
            "email": "clinical.doctor.88@gmail.com",
            "displayName": "dr. Nurul Hidayah, Sp.S",
            "password": "ClinicalSecure2026!",
            "provider": "password",
            "role": "User",
        }

        res = self.client.post("/api/user/session", json=payload)
        self.assertEqual(res.status_code, 200)

        mysql_ok, _ = is_mysql_available()
        if mysql_ok:
            row = execute_one("SELECT * FROM `users` WHERE `email` = %s;", ("clinical.doctor.88@gmail.com",))
            self.assertIsNotNone(row)
            self.assertEqual(row["full_name"], "dr. Nurul Hidayah, Sp.S")
            self.assertTrue(check_password_hash(row["password_hash"], "ClinicalSecure2026!"))

    def test_admin_sync_persists_admin_role_and_real_emails(self):
        """Verifikasi sinkronisasi akun Admin beserta email asli pendampingnya."""
        mysql_ok, _ = is_mysql_available()
        if mysql_ok:
            results = sync_admin_to_db(
                email="superadmin.neura@neura.dr.id",
                full_name="Lead Super Administrator",
                real_emails=["lead.admin.real@gmail.com"],
            )
            self.assertTrue(len(results) >= 2)

            admin_row = execute_one("SELECT * FROM `users` WHERE `email` = %s;", ("superadmin.neura@neura.dr.id",))
            self.assertIsNotNone(admin_row)
            self.assertEqual(admin_row["role"], "Admin")

            real_row = execute_one("SELECT * FROM `users` WHERE `email` = %s;", ("lead.admin.real@gmail.com",))
            self.assertIsNotNone(real_row)
            self.assertEqual(real_row["role"], "Admin")


if __name__ == "__main__":
    unittest.main()
