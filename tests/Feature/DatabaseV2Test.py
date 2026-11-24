"""
tests/Feature/DatabaseV2Test.py
===============================
Feature test for Neura AI Database Schema V2 (Normalized 3NF Architecture).
Verifies:
  - IAM domain (users, patient_profiles, admin_profiles, nakes_profiles)
  - EMR domain (medical_documents, consultation_sessions)
  - AI domain (patient_biomarkers, prediction_runs)
  - Security & Sessions domain (auth_sessions, auth_otp_codes, audit_logs, system_notifications)
  - Admin Database Controller collections API
"""

import unittest
from bootstrap.app import create_app
from app.Services.Database.DatabaseManager import execute_query, execute_one, is_mysql_available
from app.Services.Database.SessionDatabaseService import (
    save_auth_session,
    get_auth_session,
    delete_auth_session,
    save_auth_otp,
    verify_auth_otp,
    record_audit_log,
    save_system_notification,
)


class DatabaseV2TestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_database_collections_api_returns_v2_domains(self):
        """Verifikasi bahwa API collections mengembalikan katalog domain V2 lengkap."""
        res = self.client.get("/api/database/collections")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("status") == "success")
        self.assertTrue(data.get("total_tables") >= 15)

        names = [c["name"] for c in data.get("collections", [])]
        self.assertIn("users", names)
        self.assertIn("patient_profiles", names)
        self.assertIn("medical_documents", names)
        self.assertIn("consultation_sessions", names)
        self.assertIn("patient_biomarkers", names)
        self.assertIn("auth_sessions", names)
        self.assertIn("auth_otp_codes", names)
        self.assertIn("system_notifications", names)
        self.assertIn("audit_logs", names)

    def test_auth_sessions_and_otp_mysql_persistence(self):
        """Verifikasi fungsionalitas tabel auth_sessions dan auth_otp_codes."""
        mysql_ok, _ = is_mysql_available()
        if not mysql_ok:
            self.skipTest("MySQL tidak tersedia")

        # 1. Test OTP save and verify
        test_email = "test.otp.flow@neura.ai"
        otp_code = "998877"
        saved = save_auth_otp(identifier=test_email, otp_code=otp_code, purpose="ADMIN_2FA", expires_sec=120)
        self.assertTrue(saved)

        ok, msg = verify_auth_otp(identifier=test_email, input_otp="000000", purpose="ADMIN_2FA")
        self.assertFalse(ok)

        ok, msg = verify_auth_otp(identifier=test_email, input_otp=otp_code, purpose="ADMIN_2FA")
        self.assertTrue(ok)

        # 2. Test Auth Session store
        test_token = "sess_v2_test_token_12345"
        session_saved = save_auth_session(
            token=test_token,
            user_id=1,
            role="Admin",
            ip_address="127.0.0.1",
            user_agent="NeuraTestAgent/1.0",
            payload={"custom_email": "hanzz@neura.dr.id"},
        )
        self.assertTrue(session_saved)

        sess = get_auth_session(test_token)
        self.assertIsNotNone(sess)
        self.assertEqual(sess["role"], "Admin")

        del_ok = delete_auth_session(test_token)
        self.assertTrue(del_ok)
        self.assertIsNone(get_auth_session(test_token))

    def test_audit_logs_and_notifications_mysql_persistence(self):
        """Verifikasi pencatatan audit trail dan notifikasi ke MySQL."""
        mysql_ok, _ = is_mysql_available()
        if not mysql_ok:
            self.skipTest("MySQL tidak tersedia")

        # 1. Audit log
        logged = record_audit_log(
            actor_email="admin.audit@neura.ai",
            action="TEST_V2_AUDIT_ACTION",
            entity_type="medical_documents",
            entity_id="DOC-TEST-001",
            details={"ip": "127.0.0.1"},
            ip_address="127.0.0.1",
        )
        self.assertTrue(logged)

        row = execute_one("SELECT * FROM `audit_logs` WHERE `action` = 'TEST_V2_AUDIT_ACTION' ORDER BY `id` DESC LIMIT 1;")
        self.assertIsNotNone(row)
        self.assertEqual(row["entity_id"], "DOC-TEST-001")

        # 2. System notifications
        notif_saved = save_system_notification(
            title="Sistem V2 Berjalan",
            body="Arsitektur V2 siap melayani rekam medis elektronik.",
            target_role="ADMIN",
            category="SYSTEM",
            urgency="HIGH",
        )
        self.assertTrue(notif_saved)

        notif_row = execute_one("SELECT * FROM `system_notifications` WHERE `title` = 'Sistem V2 Berjalan' ORDER BY `id` DESC LIMIT 1;")
        self.assertIsNotNone(notif_row)
        self.assertEqual(notif_row["target_role"], "ADMIN")

    def test_medical_documents_and_biomarkers_records(self):
        """Verifikasi relasi dokumen rekam medis dan data biomarker."""
        mysql_ok, _ = is_mysql_available()
        if not mysql_ok:
            self.skipTest("MySQL tidak tersedia")

        docs = execute_query("SELECT id, doc_number, status FROM `medical_documents` LIMIT 5;")
        self.assertTrue(len(docs) > 0)
        self.assertTrue(docs[0]["doc_number"].startswith("DOC-NEURA-"))

        biomarkers = execute_query("SELECT id, age, mmse, biomarker_hash FROM `patient_biomarkers` LIMIT 5;")
        self.assertTrue(len(biomarkers) > 0)
        self.assertIsNotNone(biomarkers[0]["biomarker_hash"])


if __name__ == "__main__":
    unittest.main()
