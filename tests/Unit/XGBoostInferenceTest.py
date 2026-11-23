"""
tests/Unit/XGBoostInferenceTest.py
==================================
Unit tests for PureTreeEvaluator, RapidMiner consensus, and XGBoostInferenceService.
"""

import unittest
from app.Services.ML.XGBoostInferenceService import (
    PureTreeEvaluator,
    AlzheimersPredictor,
)
from app.Services.ML.RapidMinerTreeService import predict_rapidminer_tree


class XGBoostInferenceTestCase(unittest.TestCase):
    def test_rapidminer_tree_returns_valid_structure(self):
        sample = {
            "MemoryComplaints": 1,
            "BehavioralProblems": 1,
            "MMSE": 18.0,
            "ADL": 4.0,
            "FunctionalAssessment": 4.0,
        }
        res = predict_rapidminer_tree(sample)
        self.assertIn("diagnosis", res)
        self.assertIn("confidence", res)
        self.assertIn("rule_path", res)
        self.assertIn(res["diagnosis"], [0, 1])

    def test_xgboost_predictor_inference(self):
        predictor = AlzheimersPredictor()
        sample = {
            "Age": 72,
            "Gender": 1,
            "BMI": 26.5,
            "MMSE": 19.0,
            "FunctionalAssessment": 4.5,
            "MemoryComplaints": 1,
            "BehavioralProblems": 1,
            "ADL": 3.8,
        }
        result = predictor.predict_patient(sample)
        self.assertIn("ml_label", result)
        self.assertIn("probability_percent_1", result)
        self.assertIn("calculation_details", result)
        self.assertIn("consensus", result)
        self.assertIn(result["ml_label"], [0, 1])


if __name__ == "__main__":
    unittest.main()
