from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from config import Config
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

@sms_bp.route("/admin/sms/queue-status", methods=["GET"])
@jwt_required()
def get_sms_queue_health():
    """
    Get live health metrics for the Gateway Outage SMS Queue (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    from services.sms_service import get_sms_queue_status
    stats = get_sms_queue_status()
    return jsonify(stats), 200

@sms_bp.route("/admin/sms/queue-process", methods=["POST"])
@jwt_required()
def trigger_queue_retry():
    """
    Manually triggers immediate processing of queued SMS outage messages (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403

    from services.sms_service import process_sms_queue
    res = process_sms_queue()
    return jsonify({"message": "Gateway Outage SMS Queue processing executed.", "result": res}), 200

@sms_bp.route("/admin/sms/broadcast", methods=["POST"])
@jwt_required()
def admin_sms_broadcast():
    """
    Broadcast SMS using Twilio to all verified farmers in a specific village (Admin only).
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    data = request.get_json() or {}
    village = data.get("village")
    message = data.get("message")
    
    if not village or not message:
        return jsonify({"error": "Village name and message body are required"}), 400
        
    # Query all farmers in the specified village with case/whitespace resilience
    import re
    farmers = list(db.users.find({"role": "farmer", "village": {"$regex": f"^{re.escape(village.strip())}$", "$options": "i"}}))
    
    print("=== SMS BROADCAST SELECTEE LIST ===", flush=True)
    for f in farmers:
        selected = f.get("verified_for_sms", False)
        print(f"Farmer Name: {f.get('name')} | Mobile Number: {f.get('mobile')} | Village: {f.get('village')} | verified_for_sms: {selected} | Status: {'SELECTED' if selected else 'SKIPPED'}", flush=True)
    print("====================================", flush=True)

    success = 0
    failed = 0
    skipped_unverified = 0
    
    for f in farmers:
        if not f.get("verified_for_sms", False):
            skipped_unverified += 1
            continue
            
        mobile = f.get("mobile")
        if not mobile:
            failed += 1
            continue
            
        res = send_sms(
            mobile=mobile,
            message=message,
            farmer_id=f["_id"],
            farmer_name=f.get("name"),
            village=f.get("village"),
            district=f.get("district")
        )
        if res["success"]:
            success += 1
        else:
            failed += 1
            
    return jsonify({
        "success": success,
        "failed": failed,
        "skipped_unverified": skipped_unverified
    }), 200

@sms_bp.route("/admin/sms/debug", methods=["GET"])
@jwt_required()
def admin_sms_debug():
    """
    Temporary debug endpoint returning statistics on Twilio settings, database users, and recent delivery logs.
    """
    claims = get_jwt()
    if claims.get("role") != "admin":
        return jsonify({"error": "Unauthorized. Admin privileges required."}), 403
        
    total_farmers = db.users.count_documents({"role": "farmer"})
    verified_farmers = db.users.count_documents({"role": "farmer", "verified_for_sms": True})
    
    # Selected for broadcast default (verified ones)
    selected_for_broadcast = verified_farmers
    
    account_sid = Config.TWILIO_ACCOUNT_SID
    auth_token = Config.TWILIO_AUTH_TOKEN
    twilio_number = Config.TWILIO_PHONE_NUMBER
    
    twilio_config_loaded = bool(account_sid and auth_token and twilio_number and not account_sid.startswith("YOUR_"))
    
    # Last 5 SMS logs
    last_logs = list(db.sms_logs.find().sort("timestamp", -1).limit(5))
    for log in last_logs:
        log["id"] = str(log["_id"])
        del log["_id"]
        if "farmer_id" in log and log["farmer_id"]:
            log["farmer_id"] = str(log["farmer_id"])
        if "timestamp" in log and log["timestamp"]:
            log["timestamp"] = log["timestamp"].isoformat() if hasattr(log["timestamp"], "isoformat") else str(log["timestamp"])
            
    return jsonify({
        "total_farmers": total_farmers,
        "verified_farmers": verified_farmers,
        "selected_for_broadcast": selected_for_broadcast,
        "twilio_config_loaded": twilio_config_loaded,
        "last_5_sms_logs": last_logs
    }), 200


