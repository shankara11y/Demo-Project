import requests
import json
from datetime import datetime
from config import Config
from database.db import db

def send_sms(mobile, message):
    """
    Dispatches SMS to farmer using the MSG91 Flow API.
    Handles DLT Template IDs, Senders, and dynamic payload structures.
    If no auth key is found, operates in mock simulator mode, storing logs to MongoDB.
    """
    timestamp = datetime.now()
    
    # Clean mobile number to start with country code '91' for India
    clean_mobile = str(mobile).strip()
    if not clean_mobile.startswith("91") and len(clean_mobile) == 10:
        clean_mobile = "91" + clean_mobile
        
    auth_key = Config.MSG91_AUTH_KEY
    status = "Pending"
    api_response = None
    request_payload = None
    simulated = True

    if auth_key:
        # Production MSG91 Flow API Integration
        url = "https://control.msg91.com/api/v5/flow/"
        
        headers = {
            "authkey": auth_key,
            "Content-Type": "application/json"
        }
        
        # Prepare the payload for MSG91 Flow API
        # DLT variables: we include the message body as dynamic arguments (message, msg, var1)
        # to support various user-defined templates
        request_payload = {
            "template_id": Config.MSG91_TEMPLATE_ID if Config.MSG91_TEMPLATE_ID else "agricast_default",
            "sender": Config.MSG91_SENDER_ID,
            "short_url": "1",
            "recipients": [
                {
                    "mobiles": clean_mobile,
                    "message": message,   # Matches standard message template parameters
                    "msg": message,       # Alternative variable key
                    "var1": message       # DLT generic var1 placeholder
                }
            ]
        }
        
        try:
            response = requests.post(url, json=request_payload, headers=headers, timeout=10)
            api_response = response.text
            
            # MSG91 returns 200 with JSON payload {"type":"success", "message":"..."} if accepted
            if response.status_code == 200:
                try:
                    res_json = response.json()
                    if res_json.get("type") == "success" or "success" in str(res_json.get("type")).lower():
                        status = "Delivered"
                        simulated = False
                    else:
                        status = f"Failed ({res_json.get('message', 'Rejected by gateway')})"
                except ValueError:
                    # Response is not JSON, check status code
                    status = "Delivered" if "success" in api_response.lower() else f"Failed (Non-JSON: {api_response[:100]})"
                    simulated = False
            else:
                status = f"Failed (HTTP {response.status_code})"
        except Exception as e:
            status = f"Failed (Connection Error: {str(e)})"
            api_response = str(e)
    else:
        # Mock mode delivery simulation for local development
        status = "Delivered (Simulated)"
        api_response = "Mock MSG91 Gateway Success: API Credentials (MSG91_AUTH_KEY) not set in environment."
        request_payload = {
            "simulated_flow": True,
            "template_id": Config.MSG91_TEMPLATE_ID or "mock_flow_id",
            "sender": Config.MSG91_SENDER_ID,
            "mobiles": clean_mobile,
            "message": message
        }

    # Save detailed request/response audits to MongoDB SMSLogs
    sms_log = {
        "mobile": clean_mobile,
        "message": message,
        "status": status,
        "request_payload": request_payload,
        "response_payload": api_response,
        "timestamp": timestamp,
        "simulated": simulated
    }
    
    db.sms_logs.insert_one(sms_log)
    print(f"[SMS SENDER] Sent to {clean_mobile} | Status: {status} | Details: {api_response}")
    
    return {
        "success": "Delivered" in status,
        "status": status,
        "log": sms_log
    }

def broadcast_sms(mobiles, message):
    """
    Broadcasts message to multiple mobile numbers.
    """
    results = []
    for mobile in mobiles:
        res = send_sms(mobile, message)
        results.append(res)
    return results

def broadcast_to_all_farmers(message):
    """
    Fetches all registered farmers (both smartphone and keypad users)
    from the database and dispatches custom weather alerts/recommendations.
    """
    farmers = list(db.users.find({"role": "farmer"}))
    mobiles = [f["mobile"] for f in farmers if f.get("mobile")]
    
    print(f"[SMS BROADCAST] Dispatching message to {len(mobiles)} registered farmer(s).")
    return broadcast_sms(mobiles, message)
