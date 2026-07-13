from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended import get_jwt
from bson import ObjectId
from database.db import db
from services.weather_service import get_current_weather
from services.recommendation_service import generate_crop_recommendation

recommendations_bp = Blueprint("recommendations", __name__)

@recommendations_bp.route("/recommend", methods=["POST"])
@jwt_required()
def recommend_crop():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "farmer")
    
    data = request.get_json() or {}
    crop_id = data.get("crop_id")
    lat_str = data.get("latitude")
    lon_str = data.get("longitude")

    if not crop_id:
        return jsonify({"error": "Crop ID (crop_id) is required"}), 400

    # Retrieve coordinates
    if lat_str is not None and lon_str is not None:
        try:
            lat = float(lat_str)
            lon = float(lon_str)
        except ValueError:
            return jsonify({"error": "Invalid latitude or longitude format"}), 400
    else:
        # Default to farmer coordinates
        loc = db.farmer_locations.find_one({"farmer_id": ObjectId(user_id)})
        if not loc:
            return jsonify({"error": "Location coordinates not found. Please provide coordinates or update profile."}), 400
        lon, lat = loc["location"]["coordinates"]

    # Fetch weather for coordinates
    weather = get_current_weather(lat, lon)
    
    try:
        recommendation = generate_crop_recommendation(
            farmer_id=user_id if role == "farmer" else None,
            crop_id=crop_id,
            weather_data=weather
        )
        return jsonify(recommendation), 200
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 404
    except Exception as e:
        return jsonify({"error": f"Failed to compute sowing advisory: {str(e)}"}), 500

@recommendations_bp.route("/history", methods=["GET"])
@jwt_required()
def get_recommendation_history():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "farmer")
    
    # Farmer sees only their own history. Admin sees all histories.
    if role == "admin":
        history = list(db.recommendations.find().sort("timestamp", -1).limit(50))
    else:
        history = list(db.recommendations.find({"farmer_id": ObjectId(user_id)}).sort("timestamp", -1))
        
    for item in history:
        item["id"] = str(item["_id"])
        del item["_id"]
        if item.get("farmer_id"):
            item["farmer_id"] = str(item["farmer_id"])
        item["crop_id"] = str(item["crop_id"])
        
    return jsonify(history), 200
