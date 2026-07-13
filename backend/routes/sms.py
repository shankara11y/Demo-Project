from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from database.db import db
from services.sms_service import send_sms

sms_bp = Blueprint("sms", __name__)

@sms_bp.route("/sendSMS", methods=["POST"])
@jwt_required()
def send_custom_sms():
    """
    Sends a custom SMS to a specific mobile number (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    mobile = data.get("mobile")
    message = data.get("message")
    
    if not mobile or not message:
        return jsonify({"error": "Mobile number and message body are required"}), 400
        
    res = send_sms(mobile, message)
    if res["success"]:
        return jsonify({"message": "SMS dispatched successfully", "log": {
            "mobile": res["log"]["mobile"],
            "message": res["log"]["message"],
            "status": res["log"]["status"],
            "timestamp": res["log"]["timestamp"].isoformat()
        }}), 200
    else:
        return jsonify({"error": f"Failed to dispatch SMS: {res['status']}"}), 500

@sms_bp.route("/sms/history", methods=["GET"])
@jwt_required()
def get_sms_history():
    """
    Get historic log of sent SMS dispatches (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    history = list(db.sms_logs.find().sort("timestamp", -1).limit(100))
    for log in history:
        log["id"] = str(log["_id"])
        del log["_id"]
        
    return jsonify(history), 200

@sms_bp.route("/sms/broadcast", methods=["POST"])
@jwt_required()
def trigger_sms_broadcast():
    """
    Broadcast SMS to all registered farmers (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    message = data.get("message")
    
    if not message:
        return jsonify({"error": "Message body is required"}), 400
        
    from services.sms_service import broadcast_to_all_farmers
    results = broadcast_to_all_farmers(message)
    
    # Calculate delivery counts
    success_count = sum(1 for r in results if r["success"])
    total_count = len(results)
    
    return jsonify({
        "message": f"Broadcast complete. Dispatched to {success_count}/{total_count} farmers.",
        "success_count": success_count,
        "total_count": total_count
    }), 200

