import unittest
from ai.model_loader import predict_suitability

class TestRecommendationEngine(unittest.TestCase):
    def setUp(self):
        self.crop_reqs = {
            "crop_name": "Wheat",
            "ideal_temp_min": 10.0,
            "ideal_temp_max": 25.0,
            "ideal_rainfall_min": 30.0,
            "ideal_rainfall_max": 80.0,
            "ideal_humidity_min": 40.0,
            "ideal_humidity_max": 70.0,
            "season": "Rabi"
        }

    def test_ideal_conditions(self):
        # Perfect weather for Wheat
        weather = {
            "temp": 18.0,
            "humidity": 55.0,
            "rainfall": 50.0,
            "wind_speed": 5.0
        }
        res = predict_suitability(weather, self.crop_reqs, season_match=1)
        self.assertEqual(res["suitability"], "Suitable")
        self.assertGreaterEqual(res["confidence"], 70.0)
        self.assertIn("Temperature is optimal", "".join(res["reasons"]))

    def test_mismatched_season(self):
        # Good weather, but season mismatch
        weather = {
            "temp": 18.0,
            "humidity": 55.0,
            "rainfall": 50.0,
            "wind_speed": 5.0
        }
        res = predict_suitability(weather, self.crop_reqs, season_match=0)
        self.assertEqual(res["suitability"], "Not Suitable")
        self.assertIn("Sowing season mismatch", "".join(res["reasons"]))

    def test_high_wind_unsuitable(self):
        # Bad winds
        weather = {
            "temp": 18.0,
            "humidity": 55.0,
            "rainfall": 50.0,
            "wind_speed": 35.0
        }
        res = predict_suitability(weather, self.crop_reqs, season_match=1)
        self.assertEqual(res["suitability"], "Not Suitable")
        self.assertIn("High wind speed", "".join(res["reasons"]))

if __name__ == "__main__":
    unittest.main()
