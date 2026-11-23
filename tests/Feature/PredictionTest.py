"""
tests/Feature/PredictionTest.py
===============================
Feature test for XGBoost 32-biomarker prediction and calculation transparency.
"""

import unittest
from bootstrap.app import create_app


class PredictionTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_predict_endpoint_returns_ml_label_and_calculations(self):
        payload = {
            "Age": 75,
            "MMSE": 15.0,
            "FunctionalAssessment": 3.0,
            "MemoryComplaints": 1,
            "BehavioralProblems": 1,
            "ADL": 3.0,
            "Confusion": 1,
            "Disorientation": 1,
        }
        res = self.client.post("/api/predict", json=payload)
        self.assertEqual(res.status_code, 200)

        data = res.get_json()
        self.assertIn("ml_label", data)
        self.assertIn("ml_label_name", data)
        self.assertIn("probability_1", data)
        self.assertIn("probability_0", data)
        self.assertIn("calculation_details", data)

        calc = data["calculation_details"]
        self.assertIn("raw_logit_z", calc)
        self.assertIn("formula", calc)
        self.assertIn("top_protective_drivers", calc)

        # Verify RapidMiner Tree and Consensus from implementations.txt
        self.assertIn("rapidminer_tree", data)
        self.assertIn("rule_path", data["rapidminer_tree"])
        self.assertIn("consensus", data)


if __name__ == "__main__":
    unittest.main()
