from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from database.db import db
from services.weather_service import get_current_weather, get_weather_forecast, geocode_location
from services.recommendation_service import generate_crop_recommendation

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user["id"] = str(user["_id"])
    del user["_id"]
    
    # Attach location coordinates
    loc = db.farmer_locations.find_one({"farmer_id": ObjectId(user_id)})
    if loc:
        lon, lat = loc["location"]["coordinates"]
        user["latitude"] = lat
        user["longitude"] = lon
    else:
        user["latitude"] = None
        user["longitude"] = None
        
    return jsonify(user), 200

@profile_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Filter update keys to prevent role escalation
    allowed_keys = ["name", "farm_size", "preferred_language", "crop_types", "village", "district", "state"]
    update_data = {k: v for k, v in data.items() if k in allowed_keys}
    
    if "farm_size" in update_data:
        try:
            update_data["farm_size"] = float(update_data["farm_size"])
        except ValueError:
            return jsonify({"error": "Invalid farm size format"}), 400

    # If location fields change, re-geocode
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    lat = data.get("latitude")
    lon = data.get("longitude")
    
    re_geocode = False
    new_village = update_data.get("village", user.get("village"))
    new_district = update_data.get("district", user.get("district"))
    new_state = update_data.get("state", user.get("state"))
    
    if (new_village != user.get("village") or 
        new_district != user.get("district") or 
        new_state != user.get("state")):
        re_geocode = True

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    
    # Handle Location coordinates update
    if lat is not None and lon is not None:
        try:
            flat, flon = float(lat), float(lon)
            db.farmer_locations.update_one(
                {"farmer_id": ObjectId(user_id)},
                {"$set": {
                    "village": new_village,
                    "district": new_district,
                    "state": new_state,
                    "location": {
                        "type": "Point",
                        "coordinates": [flon, flat]
                    }
                }},
                upsert=True
            )
        except ValueError:
            pass
    elif re_geocode:
        geo = geocode_location(new_village, new_district, new_state)
        db.farmer_locations.update_one(
            {"farmer_id": ObjectId(user_id)},
            {"$set": {
                "village": new_village,
                "district": new_district,
                "state": new_state,
                "location": {
                    "type": "Point",
                    "coordinates": [geo["lon"], geo["lat"]]
                }
            }},
            upsert=True
        )

    return jsonify({"message": "Profile updated successfully"}), 200

@profile_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    user_id = get_jwt_identity()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    loc = db.farmer_locations.find_one({"farmer_id": ObjectId(user_id)})
    if not loc:
        return jsonify({"error": "Location coordinates not found. Please update profile."}), 400
        
    lon, lat = loc["location"]["coordinates"]

    # 1. Fetch current weather and forecast
    current_weather = get_current_weather(lat, lon)
    forecast_data = get_weather_forecast(lat, lon)

    # 2. Generate/fetch crop advisories for registered crop types
    crop_advisories = []
    for crop_name in user.get("crop_types", []):
        crop_doc = db.crops.find_one({"name": crop_name})
        if crop_doc:
            try:
                advisory = generate_crop_recommendation(user_id, crop_doc["_id"], current_weather, lat=lat, lon=lon)
                crop_advisories.append(advisory)
            except Exception as e:
                print(f"Error computing dashboard advisory for {crop_name}: {e}")

    # 3. Retrieve system alerts for farmer
    alerts = list(db.alerts.find({"farmer_id": ObjectId(user_id)}).sort("timestamp", -1).limit(5))
    for alert in alerts:
        alert["id"] = str(alert["_id"])
        del alert["_id"]
        alert["farmer_id"] = str(alert["farmer_id"])
        
    # 4. Fetch farmer notifications
    notifications = list(db.notifications.find({"farmer_id": ObjectId(user_id)}).sort("timestamp", -1).limit(10))
    for notif in notifications:
        notif["id"] = str(notif["_id"])
        del notif["_id"]
        notif["farmer_id"] = str(notif["farmer_id"])

    return jsonify({
        "farmer_name": user["name"],
        "village": user["village"],
        "district": user["district"],
        "farm_size": user.get("farm_size", 0.0),
        "preferred_language": user.get("preferred_language", "en"),
        "coordinates": {"latitude": lat, "longitude": lon},
        "current_weather": current_weather,
        "forecast": forecast_data.get("forecast", []),
        "crop_advisories": crop_advisories,
        "alerts": alerts,
        "notifications": notifications
    }), 200
