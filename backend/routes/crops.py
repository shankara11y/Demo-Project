from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from bson import ObjectId
from database.db import db

crops_bp = Blueprint("crops", __name__)

@crops_bp.route("/crops", methods=["GET"])
@jwt_required()
def get_crops():
    """
    List all crops with their corresponding crop requirements thresholds.
    """
    crops_list = list(db.crops.find())
    results = []
    
    for crop in crops_list:
        crop_id = str(crop["_id"])
        reqs = db.crop_requirements.find_one({"crop_id": crop_id})
        
        # Format crop dict
        crop["id"] = crop_id
        del crop["_id"]
        
        # Attach thresholds
        if reqs:
            crop["ideal_temp_min"] = reqs.get("ideal_temp_min")
            crop["ideal_temp_max"] = reqs.get("ideal_temp_max")
            crop["ideal_rainfall_min"] = reqs.get("ideal_rainfall_min")
            crop["ideal_rainfall_max"] = reqs.get("ideal_rainfall_max")
            crop["ideal_humidity_min"] = reqs.get("ideal_humidity_min")
            crop["ideal_humidity_max"] = reqs.get("ideal_humidity_max")
            crop["ideal_soil_moisture_min"] = reqs.get("ideal_soil_moisture_min")
            crop["ideal_soil_moisture_max"] = reqs.get("ideal_soil_moisture_max")
            crop["season"] = reqs.get("season", "Kharif")
            
        results.append(crop)
        
    return jsonify(results), 200

@crops_bp.route("/crop", methods=["POST"])
@jwt_required()
def add_crop():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    name = data.get("name")
    category = data.get("category", "Kharif")
    description = data.get("description", "")
    
    if not name:
        return jsonify({"error": "Crop name is required"}), 400
        
    if db.crops.find_one({"name": name}):
        return jsonify({"error": f"Crop '{name}' already exists"}), 409

    # Insert Crop
    crop_doc = {
        "name": name,
        "category": category,
        "description": description
    }
    
    try:
        inserted = db.crops.insert_one(crop_doc)
        crop_id = str(inserted.inserted_id)
        
        # Insert crop requirements
        reqs_doc = {
            "crop_id": crop_id,
            "crop_name": name,
            "ideal_temp_min": float(data.get("ideal_temp_min", 20.0)),
            "ideal_temp_max": float(data.get("ideal_temp_max", 35.0)),
            "ideal_rainfall_min": float(data.get("ideal_rainfall_min", 50.0)),
            "ideal_rainfall_max": float(data.get("ideal_rainfall_max", 150.0)),
            "ideal_humidity_min": float(data.get("ideal_humidity_min", 50.0)),
            "ideal_humidity_max": float(data.get("ideal_humidity_max", 85.0)),
            "ideal_soil_moisture_min": float(data.get("ideal_soil_moisture_min", 0.3)),
            "ideal_soil_moisture_max": float(data.get("ideal_soil_moisture_max", 0.7)),
            "season": data.get("season", category)
        }
        db.crop_requirements.insert_one(reqs_doc)
        
        return jsonify({
            "message": "Crop created successfully",
            "crop_id": crop_id
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create crop: {str(e)}"}), 500

@crops_bp.route("/crop", methods=["PUT"])
@jwt_required()
def edit_crop():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    crop_id = data.get("id")
    
    if not crop_id:
        return jsonify({"error": "Crop ID (id) is required"}), 400
        
    crop = db.crops.find_one({"_id": ObjectId(crop_id)})
    if not crop:
        return jsonify({"error": "Crop not found"}), 404
        
    name = data.get("name", crop["name"])
    category = data.get("category", crop.get("category", "Kharif"))
    description = data.get("description", crop.get("description", ""))
    
    # Update Crop
    db.crops.update_one(
        {"_id": ObjectId(crop_id)},
        {"$set": {
            "name": name,
            "category": category,
            "description": description
        }}
    )
    
    # Update Crop Requirements
    reqs_doc = {
        "crop_name": name,
        "ideal_temp_min": float(data.get("ideal_temp_min", 20.0)),
        "ideal_temp_max": float(data.get("ideal_temp_max", 35.0)),
        "ideal_rainfall_min": float(data.get("ideal_rainfall_min", 50.0)),
        "ideal_rainfall_max": float(data.get("ideal_rainfall_max", 150.0)),
        "ideal_humidity_min": float(data.get("ideal_humidity_min", 50.0)),
        "ideal_humidity_max": float(data.get("ideal_humidity_max", 85.0)),
        "ideal_soil_moisture_min": float(data.get("ideal_soil_moisture_min", 0.3)),
        "ideal_soil_moisture_max": float(data.get("ideal_soil_moisture_max", 0.7)),
        "season": data.get("season", category)
    }
    
    db.crop_requirements.update_one(
        {"crop_id": crop_id},
        {"$set": reqs_doc},
        upsert=True
    )
    
    return jsonify({"message": "Crop requirements updated successfully"}), 200

@crops_bp.route("/crop", methods=["DELETE"])
@jwt_required()
def delete_crop():
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    crop_id = request.args.get("id")
    if not crop_id:
        return jsonify({"error": "Crop ID parameter (id) is required"}), 400
        
    # Delete from both collections
    db.crops.delete_one({"_id": ObjectId(crop_id)})
    db.crop_requirements.delete_one({"crop_id": crop_id})
    
    return jsonify({"message": "Crop and requirements deleted successfully"}), 200
