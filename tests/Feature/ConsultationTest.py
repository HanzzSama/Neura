"""
tests/Feature/ConsultationTest.py
=================================
Feature test for clinical consultation generation and MySQL persistence.
"""

import unittest
from bootstrap.app import create_app


class ConsultationTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_generate_consultation_creates_nakes_code(self):
        payload = {
            "name": "Ibu Ratna",
            "age": 68,
            "mmse": 22.0,
            "gender": "female",
        }
        res = self.client.post("/api/consultation/generate", json=payload)
        self.assertEqual(res.status_code, 200)

        data = res.get_json()
        self.assertIn("nakes_code", data)
        self.assertTrue(data["nakes_code"].startswith("NKS-"))
        self.assertIn("prediction", data)
        self.assertIn("all_32_biomarkers", data)


if __name__ == "__main__":
    unittest.main()
