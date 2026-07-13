from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId
from datetime import datetime
from database.db import db
from services.sms_service import send_sms

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_alerts():
    """
    Get active alerts. Farmers retrieve alerts targetted to them.
    Admins retrieve all historic alerts.
    """
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get("role", "farmer")
    
    if role == "admin":
        alerts = list(db.alerts.find().sort("timestamp", -1).limit(50))
    else:
        # Retrieve alerts targeted to this farmer
        alerts = list(db.alerts.find({"farmer_id": ObjectId(user_id)}).sort("timestamp", -1).limit(20))
        
    for item in alerts:
        item["id"] = str(item["_id"])
        del item["_id"]
        if item.get("farmer_id"):
            item["farmer_id"] = str(item["farmer_id"])
            
    return jsonify(alerts), 200

@alerts_bp.route("/alerts", methods=["POST"])
@jwt_required()
def trigger_alert():
    """
    Admin triggers manual regional/national alerts.
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    message = data.get("message")
    alert_type = data.get("type", "general") # 'heavy_rain', 'heatwave', 'general'
    
    # Geographic targets
    village_target = data.get("village")
    district_target = data.get("district")
    state_target = data.get("state")
    
    if not message:
        return jsonify({"error": "Alert message content is required"}), 400

    # Build query filter for target farmers
    query = {"role": "farmer"}
    if village_target:
        query["village"] = village_target
    if district_target:
        query["district"] = district_target
    if state_target:
        query["state"] = state_target
        
    farmers = list(db.users.find(query))
    if not farmers:
        return jsonify({"message": "No farmers found matching the geographic filters. 0 alerts dispatched."}), 200

    sent_count = 0
    for farmer in farmers:
        farmer_id = farmer["_id"]
        mobile = farmer["mobile"]
        
        # Save alert log for individual farmer dashboard
        db.alerts.insert_one({
            "farmer_id": farmer_id,
            "type": alert_type,
            "message": message,
            "timestamp": datetime.now(),
            "sender": "Admin Manual Broadcast"
        })
        
        # Insert notification center log
        db.notifications.insert_one({
            "farmer_id": farmer_id,
            "message": f"ALERT ({alert_type.upper()}): {message}",
            "read": False,
            "timestamp": datetime.now()
        })
        
        # Send SMS
        send_sms(mobile, f"AgriCast Alert: {message}")
        sent_count += 1

    return jsonify({
        "message": f"Alert broadcast dispatched successfully to {sent_count} farmer(s).",
        "recipients_count": sent_count
    }), 201
