import unittest
import json
from app import create_app
from database.db import db

class TestRoutes(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_health_check(self):
        # Test index endpoint
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "online")
        self.assertIn("AgriCast", data["service"])

    def test_database_seeding(self):
        # Verify crops seeded successfully
        seeded_crops = list(db.crops.find())
        self.assertGreater(len(seeded_crops), 0)
        
        # Verify admin seeded
        admin_seeded = db.admins.find_one({"email": "admin@agricast.gov.in"})
        self.assertIsNotNone(admin_seeded)

    def test_register_invalid_params(self):
        # Attempt registering with missing fields
        payload = {
            "name": "Failed Farmer"
        }
        response = self.client.post("/register", 
                                    data=json.dumps(payload),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn("error", data)

if __name__ == "__main__":
    unittest.main()
