import sys
import logging
import copy
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockCursor:
    def __init__(self, data):
        self.data = list(data)

    def sort(self, key, direction=-1):
        reverse = True if direction == -1 else False
        try:
            self.data.sort(
                key=lambda x: x.get(key) if x.get(key) is not None else datetime.min, 
                reverse=reverse
            )
        except Exception:
            pass
        return self

    def limit(self, count):
        self.data = self.data[:count]
        return self

    def __iter__(self):
        return iter(self.data)

    def __len__(self):
        return len(self.data)

    def count(self):
        return len(self.data)

class MockCollection:
    def __init__(self, name):
        self.name = name
        self.data = []

    def create_index(self, *args, **kwargs):
        pass

    def count_documents(self, query=None):
        if not query:
            return len(self.data)
        
        count = 0
        for doc in self.data:
            match = True
            for k, v in query.items():
                # Handle comparison operators ($gte, $lte)
                if isinstance(v, dict):
                    doc_val = doc.get(k)
                    if doc_val is None:
                        match = False
                        break
                    for op, threshold in v.items():
                        if op == "$gte" and not (doc_val >= threshold):
                            match = False
                        elif op == "$lte" and not (doc_val <= threshold):
                            match = False
                elif str(doc.get(k)) != str(v) and doc.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    def find_one(self, query, projection=None):
        for doc in self.data:
            match = True
            for k, v in query.items():
                if str(doc.get(k)) != str(v) and doc.get(k) != v:
                    match = False
                    break
            if match:
                res = copy.deepcopy(doc)
                if projection and "password" in projection and projection["password"] == 0:
                    res.pop("password", None)
                return res
        return None

    def find(self, query=None, projection=None):
        if not query:
            return MockCursor(copy.deepcopy(self.data))
        
        results = []
        for doc in self.data:
            match = True
            for k, v in query.items():
                if isinstance(v, dict):
                    doc_val = doc.get(k)
                    if doc_val is None:
                        match = False
                        break
                    for op, val in v.items():
                        if op == "$gte" and not (doc_val >= val):
                            match = False
                        elif op == "$lte" and not (doc_val <= val):
                            match = False
                elif str(doc.get(k)) != str(v) and doc.get(k) != v:
                    match = False
                    break
            if match:
                results.append(copy.deepcopy(doc))
        return MockCursor(results)

    def insert_one(self, document):
        if "_id" not in document:
            document["_id"] = ObjectId()
        doc = copy.deepcopy(document)
        self.data.append(doc)
        
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(document["_id"])

    def update_one(self, query, update, upsert=False):
        doc = self.find_one(query)
        if not doc:
            if upsert:
                new_doc = {}
                if "$set" in update:
                    new_doc.update(update["$set"])
                new_doc.update(query)
                self.insert_one(new_doc)
            return
        
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = v
                
        for i, item in enumerate(self.data):
            if item["_id"] == doc["_id"]:
                self.data[i] = doc
                break

    def delete_one(self, query):
        doc = self.find_one(query)
        if doc:
            self.data = [item for item in self.data if item["_id"] != doc["_id"]]

class Database:
    def __init__(self):
        self.mock_mode = False
        self.using_atlas = False
        try:
            self.client = MongoClient(Config.MONGO_URI, serverSelectionTimeoutMS=2000)
            self.client.admin.command('ping')
            # Run trial read query on users collection to catch TLS replica-set alerts on startup
            self.client.get_database().Users.find_one({})
            self.db = self.client.get_database()
            self.using_atlas = True
            logger.info("Connected to MongoDB Atlas")
            logger.info("Database selected")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB Atlas: {e}")
            try:
                self.client = MongoClient("mongodb://localhost:27017/agricast", serverSelectionTimeoutMS=2000)
                self.client.admin.command('ping')
                self.client.get_database().Users.find_one({})
                self.db = self.client.get_database()
                logger.info("Fallback connection to local MongoDB successful.")
            except Exception as fe:
                logger.warning("Falling back to Mock DB (only if Atlas/Local fails)")
                self.mock_mode = True

        if self.mock_mode:
            # Instantiate in-memory Mock collections
            self.users = MockCollection("Users")
            self.admins = MockCollection("Admins")
            self.crops = MockCollection("Crops")
            self.crop_requirements = MockCollection("CropRequirements")
            self.weather_logs = MockCollection("WeatherLogs")
            self.recommendations = MockCollection("Recommendations")
            self.alerts = MockCollection("Alerts")
            self.sms_logs = MockCollection("SMSLogs")
            self.farmer_locations = MockCollection("FarmerLocations")
            self.notifications = MockCollection("Notifications")
        else:
            self.users = self.db.Users
            self.admins = self.db.Admins
            self.crops = self.db.Crops
            self.crop_requirements = self.db.CropRequirements
            self.weather_logs = self.db.WeatherLogs
            self.recommendations = self.db.Recommendations
            self.alerts = self.db.Alerts
            self.sms_logs = self.db.SMSLogs
            self.farmer_locations = self.db.FarmerLocations
            self.notifications = self.db.Notifications

        logger.info("Collections initialized")

        self.setup_indexes()
        self.seed_database()

    def setup_indexes(self):
        if self.mock_mode:
            return
        try:
            self.users.create_index("mobile", unique=True)
            self.admins.create_index("email", unique=True)
            self.crops.create_index("name", unique=True)
            self.crop_requirements.create_index("crop_id", unique=True)
            self.farmer_locations.create_index([("location", "2dsphere")])
        except Exception as e:
            logger.error(f"Failed setting database indexes: {e}")

    def seed_database(self):
        import bcrypt
        hashed_password = bcrypt.hashpw(Config.ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if self.admins.count_documents({"email": Config.ADMIN_EMAIL}) == 0:
            self.admins.insert_one({
                "name": "AgriCast Admin",
                "email": Config.ADMIN_EMAIL,
                "password": hashed_password,
                "role": "admin"
            })
            logger.info("Default Admin seeded successfully.")

        custom_email = "admin@agricast.com"
        custom_pass_hash = bcrypt.hashpw("adminpassword123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        if self.admins.count_documents({"email": custom_email}) == 0:
            self.admins.insert_one({
                "name": "Admin Control",
                "email": custom_email,
                "password": custom_pass_hash,
                "role": "admin"
            })
            logger.info("Custom Admin account admin@agricast.com seeded successfully.")

        # Seed Dummy Farmers spread across Maharashtra (Multiple farmers per village)
        if self.users.count_documents({"role": "farmer"}) < 15:
            dummy_farmers = [
                {
                    "name": "Sanjay Patil", "mobile": "9892701290", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Rice", "Soybean"],
                    "village": "Kolshet", "district": "Thane", "state": "Maharashtra", "role": "farmer", "farm_size": 4.5,
                    "coords": [72.994339, 19.242531]
                },
                {
                    "name": "Rajesh Patil", "mobile": "9892701390", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Rice"],
                    "village": "Kolshet", "district": "Thane", "state": "Maharashtra", "role": "farmer", "farm_size": 3.8,
                    "coords": [72.995339, 19.243531]
                },
                {
                    "name": "Ramesh Shinde", "mobile": "9892701291", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Wheat", "Maize"],
                    "village": "Haveli", "district": "Pune", "state": "Maharashtra", "role": "farmer", "farm_size": 5.2,
                    "coords": [73.8567, 18.5204]
                },
                {
                    "name": "Suresh Shinde", "mobile": "9892701391", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "en", "crop_types": ["Wheat"],
                    "village": "Haveli", "district": "Pune", "state": "Maharashtra", "role": "farmer", "farm_size": 4.1,
                    "coords": [73.8577, 18.5214]
                },
                {
                    "name": "Anil Gawde", "mobile": "9892701292", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "en", "crop_types": ["Millets", "Soybean"],
                    "village": "Niphad", "district": "Nashik", "state": "Maharashtra", "role": "farmer", "farm_size": 3.8,
                    "coords": [73.7898, 19.9975]
                },
                {
                    "name": "Sunil Gawde", "mobile": "9892701392", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Soybean"],
                    "village": "Niphad", "district": "Nashik", "state": "Maharashtra", "role": "farmer", "farm_size": 2.9,
                    "coords": [73.7908, 19.9985]
                },
                {
                    "name": "Vijay Kadam", "mobile": "9892701293", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Cotton", "Maize"],
                    "village": "Gangapur", "district": "Aurangabad", "state": "Maharashtra", "role": "farmer", "farm_size": 6.1,
                    "coords": [75.3433, 19.8762]
                },
                {
                    "name": "Ajay Kadam", "mobile": "9892701393", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "en", "crop_types": ["Cotton"],
                    "village": "Gangapur", "district": "Aurangabad", "state": "Maharashtra", "role": "farmer", "farm_size": 5.0,
                    "coords": [75.3443, 19.8772]
                },
                {
                    "name": "Dnyaneshwar Pawar", "mobile": "9892701294", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Cotton", "Groundnut"],
                    "village": "Pachora", "district": "Jalgaon", "state": "Maharashtra", "role": "farmer", "farm_size": 4.2,
                    "coords": [75.5626, 21.0077]
                },
                {
                    "name": "Haribhau Pawar", "mobile": "9892701394", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Groundnut"],
                    "village": "Pachora", "district": "Jalgaon", "state": "Maharashtra", "role": "farmer", "farm_size": 3.9,
                    "coords": [75.5636, 21.0087]
                },
                {
                    "name": "Prakash Deshmukh", "mobile": "9892701295", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Cotton", "Soybean"],
                    "village": "Kalmeshwar", "district": "Nagpur", "state": "Maharashtra", "role": "farmer", "farm_size": 7.0,
                    "coords": [79.0882, 21.1458]
                },
                {
                    "name": "Santosh Deshmukh", "mobile": "9892701395", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Soybean"],
                    "village": "Kalmeshwar", "district": "Nagpur", "state": "Maharashtra", "role": "farmer", "farm_size": 5.1,
                    "coords": [79.0892, 21.1468]
                },
                {
                    "name": "Babasaheb Salunkhe", "mobile": "9892701296", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Wheat", "Maize"],
                    "village": "Karad", "district": "Satara", "state": "Maharashtra", "role": "farmer", "farm_size": 8.5,
                    "coords": [73.9850, 17.6805]
                },
                {
                    "name": "Vithal Salunkhe", "mobile": "9892701396", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Maize"],
                    "village": "Karad", "district": "Satara", "state": "Maharashtra", "role": "farmer", "farm_size": 6.0,
                    "coords": [73.9860, 17.6815]
                },
                {
                    "name": "Vilas Joshi", "mobile": "9892701297", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "en", "crop_types": ["Millets", "Cotton"],
                    "village": "Sakri", "district": "Dhule", "state": "Maharashtra", "role": "farmer", "farm_size": 2.9,
                    "coords": [74.7749, 20.9042]
                },
                {
                    "name": "Dilip Joshi", "mobile": "9892701397", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Cotton"],
                    "village": "Sakri", "district": "Dhule", "state": "Maharashtra", "role": "farmer", "farm_size": 4.5,
                    "coords": [74.7759, 20.9052]
                },
                {
                    "name": "Arjun Naik", "mobile": "9892701298", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "en", "crop_types": ["Rice", "Groundnut"],
                    "village": "Dahanu", "district": "Palghar", "state": "Maharashtra", "role": "farmer", "farm_size": 5.0,
                    "coords": [72.7655, 19.6936]
                },
                {
                    "name": "Devendra Naik", "mobile": "9892701398", "password": hashed_password,
                    "farmer_type": "keypad", "preferred_language": "mr", "crop_types": ["Rice"],
                    "village": "Dahanu", "district": "Palghar", "state": "Maharashtra", "role": "farmer", "farm_size": 3.7,
                    "coords": [72.7665, 19.6946]
                },
                {
                    "name": "Babanrao More", "mobile": "9892701299", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Cotton", "Millets"],
                    "village": "Vaijapur", "district": "Aurangabad", "state": "Maharashtra", "role": "farmer", "farm_size": 4.0,
                    "coords": [74.7139, 19.7515]
                },
                {
                    "name": "Subhash More", "mobile": "9892701399", "password": hashed_password,
                    "farmer_type": "smartphone", "preferred_language": "mr", "crop_types": ["Millets"],
                    "village": "Vaijapur", "district": "Aurangabad", "state": "Maharashtra", "role": "farmer", "farm_size": 3.2,
                    "coords": [74.7149, 19.7525]
                }
            ]
            
            for f_doc in dummy_farmers:
                if self.users.count_documents({"mobile": f_doc["mobile"]}) == 0:
                    coords_val = f_doc.pop("coords")
                    inserted = self.users.insert_one(f_doc)
                    f_id = inserted.inserted_id
                    
                    loc_doc = {
                        "farmer_id": f_id,
                        "village": f_doc["village"],
                        "district": f_doc["district"],
                        "state": f_doc["state"],
                        "location": {
                            "type": "Point",
                            "coordinates": coords_val
                        }
                    }
                    self.farmer_locations.insert_one(loc_doc)
                    logger.info(f"Seeded dummy farmer {f_doc['name']} at coordinates {coords_val}")

        default_crops = [
            {"name": "Rice", "category": "Kharif", "description": "Staple food crop needing warm conditions and standing water."},
            {"name": "Wheat", "category": "Rabi", "description": "Cool-season crop requiring moderate moisture."},
            {"name": "Soybean", "category": "Kharif", "description": "Protein-rich legume crop."},
            {"name": "Cotton", "category": "Kharif", "description": "Cash crop requiring high temperature and moderate rainfall."},
            {"name": "Maize", "category": "Kharif/Rabi", "description": "Versatile cereal crop."},
            {"name": "Millets", "category": "Kharif", "description": "Drought-resistant crop, highly suitable for drylands."},
            {"name": "Groundnut", "category": "Kharif", "description": "Oilseed crop requiring sandy loam soils."}
        ]

        default_requirements = {
            "Rice": {
                "ideal_temp_min": 20.0, "ideal_temp_max": 35.0,
                "ideal_rainfall_min": 100.0, "ideal_rainfall_max": 200.0,
                "ideal_humidity_min": 60.0, "ideal_humidity_max": 90.0,
                "ideal_soil_moisture_min": 0.4, "ideal_soil_moisture_max": 0.8,
                "season": "Kharif"
            },
            "Wheat": {
                "ideal_temp_min": 10.0, "ideal_temp_max": 25.0,
                "ideal_rainfall_min": 30.0, "ideal_rainfall_max": 80.0,
                "ideal_humidity_min": 40.0, "ideal_humidity_max": 70.0,
                "ideal_soil_moisture_min": 0.25, "ideal_soil_moisture_max": 0.55,
                "season": "Rabi"
            },
            "Soybean": {
                "ideal_temp_min": 18.0, "ideal_temp_max": 32.0,
                "ideal_rainfall_min": 50.0, "ideal_rainfall_max": 100.0,
                "ideal_humidity_min": 50.0, "ideal_humidity_max": 80.0,
                "ideal_soil_moisture_min": 0.3, "ideal_soil_moisture_max": 0.6,
                "season": "Kharif"
            },
            "Cotton": {
                "ideal_temp_min": 21.0, "ideal_temp_max": 35.0,
                "ideal_rainfall_min": 40.0, "ideal_rainfall_max": 90.0,
                "ideal_humidity_min": 50.0, "ideal_humidity_max": 80.0,
                "ideal_soil_moisture_min": 0.2, "ideal_soil_moisture_max": 0.5,
                "season": "Kharif"
            },
            "Maize": {
                "ideal_temp_min": 18.0, "ideal_temp_max": 30.0,
                "ideal_rainfall_min": 50.0, "ideal_rainfall_max": 110.0,
                "ideal_humidity_min": 45.0, "ideal_humidity_max": 75.0,
                "ideal_soil_moisture_min": 0.3, "ideal_soil_moisture_max": 0.6,
                "season": "Kharif"
            },
            "Millets": {
                "ideal_temp_min": 15.0, "ideal_temp_max": 38.0,
                "ideal_rainfall_min": 20.0, "ideal_rainfall_max": 60.0,
                "ideal_humidity_min": 30.0, "ideal_humidity_max": 60.0,
                "ideal_soil_moisture_min": 0.1, "ideal_soil_moisture_max": 0.4,
                "season": "Kharif"
            },
            "Groundnut": {
                "ideal_temp_min": 20.0, "ideal_temp_max": 30.0,
                "ideal_rainfall_min": 40.0, "ideal_rainfall_max": 80.0,
                "ideal_humidity_min": 45.0, "ideal_humidity_max": 75.0,
                "ideal_soil_moisture_min": 0.25, "ideal_soil_moisture_max": 0.5,
                "season": "Kharif"
            }
        }

        for crop in default_crops:
            if self.crops.count_documents({"name": crop["name"]}) == 0:
                inserted = self.crops.insert_one(crop)
                crop_id = str(inserted.inserted_id)
                req = default_requirements[crop["name"]]
                req["crop_id"] = crop_id
                req["crop_name"] = crop["name"]
                self.crop_requirements.insert_one(req)
                logger.info(f"Seeded crop {crop['name']} and its requirements.")
        
        logger.info("Seed completed")

# Instantiate database singleton
db = Database()
