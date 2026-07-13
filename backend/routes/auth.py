import bcrypt
from datetime import timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from database.db import db
from services.weather_service import geocode_location

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    
    # Required Fields
    name = data.get("name")
    mobile = data.get("mobile")
    password = data.get("password")
    village = data.get("village")
    district = data.get("district")
    state = data.get("state")
    farmer_type = data.get("farmer_type", "smartphone") # 'smartphone' or 'keypad'
    
    # Optional Fields
    aadhaar = data.get("aadhaar", "")
    farm_size = data.get("farm_size", 0.0)
    preferred_language = data.get("preferred_language", "en") # 'en', 'hi', 'mr'
    crop_types = data.get("crop_types", [])
    
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not name or not mobile or not village or not district or not state:
        return jsonify({"error": "Missing mandatory registration fields (name, mobile, village, district, state)"}), 400

    # Keypad farmers do not require password
    if farmer_type == "smartphone" and not password:
        return jsonify({"error": "Password is required for smartphone farmers"}), 400

    # Check if user already exists
    if db.users.find_one({"mobile": mobile}):
        return jsonify({"error": "A farmer with this mobile number is already registered"}), 409

    # Geocode GPS coordinates if not provided manually
    if not latitude or not longitude:
        geo = geocode_location(village, district, state)
        lat = geo["lat"]
        lon = geo["lon"]
    else:
        try:
            lat = float(latitude)
            lon = float(longitude)
        except ValueError:
            return jsonify({"error": "Invalid coordinates format"}), 400

    # Hash Password
    hashed_pwd = ""
    if password:
        hashed_pwd = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # Save User
    user_record = {
        "name": name,
        "mobile": mobile,
        "password": hashed_pwd,
        "aadhaar": aadhaar,
        "farmer_type": farmer_type,
        "village": village,
        "district": district,
        "state": state,
        "farm_size": float(farm_size),
        "preferred_language": preferred_language,
        "crop_types": crop_types,
        "role": "farmer"
    }

    try:
        inserted = db.users.insert_one(user_record)
        farmer_id = inserted.inserted_id

        # Save coordinates in FarmerLocations collection (GeoJSON Point format)
        db.farmer_locations.insert_one({
            "farmer_id": farmer_id,
            "village": village,
            "district": district,
            "state": state,
            "location": {
                "type": "Point",
                "coordinates": [lon, lat] # [longitude, latitude]
            }
        })

        return jsonify({
            "message": "Farmer registered successfully",
            "farmer_id": str(farmer_id),
            "coordinates": {"latitude": lat, "longitude": lon}
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to register farmer: {str(e)}"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    mobile = data.get("mobile")
    password = data.get("password")

    if not mobile or not password:
        return jsonify({"error": "Mobile and password are required"}), 400

    user = db.users.find_one({"mobile": mobile})
    if not user or not user.get("password"):
        return jsonify({"error": "Invalid mobile or password"}), 401

    # Check Password
    if not bcrypt.checkpw(password.encode('utf-8'), user["password"].encode('utf-8')):
        return jsonify({"error": "Invalid mobile or password"}), 401

    # Check role
    role = user.get("role", "farmer")
    
    # Generate Token
    token = create_access_token(
        identity=str(user["_id"]),
        additional_claims={"role": role, "name": user["name"], "mobile": user["mobile"]},
        expires_delta=timedelta(days=7)
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "mobile": user["mobile"],
            "role": role,
            "farmer_type": user.get("farmer_type", "smartphone")
        }
    }), 200

@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    admin = db.admins.find_one({"email": email})
    if not admin:
        return jsonify({"error": "Invalid credentials"}), 401

    # Check Password
    if not bcrypt.checkpw(password.encode('utf-8'), admin["password"].encode('utf-8')):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(
        identity=str(admin["_id"]),
        additional_claims={"role": "admin", "name": admin["name"], "email": admin["email"]},
        expires_delta=timedelta(days=2)
    )

    return jsonify({
        "message": "Admin login successful",
        "token": token,
        "admin": {
            "id": str(admin["_id"]),
            "name": admin["name"],
            "email": admin["email"],
            "role": "admin"
        }
    }), 200
