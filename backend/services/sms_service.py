import json
import time
import logging
import traceback
from datetime import datetime
from config import Config
from database.db import db

logger = logging.getLogger(__name__)
_twilio_client = None

def _get_twilio_client(account_sid, auth_token):
    global _twilio_client
    if _twilio_client is None:
        if account_sid and auth_token and not account_sid.startswith("YOUR_"):
            from twilio.rest import Client
            _twilio_client = Client(account_sid, auth_token)
            print("[TWILIO INIT] Twilio client initialized successfully.", flush=True)
    return _twilio_client

def is_invalid_number_error(error_code, error_message):
    """
    Identifies permanent invalid phone number errors returned by Twilio REST API.
    Common Twilio Error Codes:
    21211: Invalid 'To' Phone Number
    21614: 'To' number is not a valid mobile number
    21212: Invalid 'From' Phone Number
    21408: Permission to send an SMS to region has not been enabled
    21610: Message cannot be sent to the 'To' number because the customer has opted out (STOP)
    """
    if error_code in [21211, 21614, 21212, 21408, 21610, 400]:
        return True
    msg = (str(error_message) or "").lower()
    if "invalid" in msg or "unverified" in msg or "not a valid" in msg or "format" in msg:
        return True
    return False

def is_rate_limit_error(error_code, error_message):
    """
    Identifies temporary rate limit or quota exceeded errors returned by Twilio REST API.
    Twilio Error Code 63038: Account exceeded the daily messages limit.
    HTTP 429: Too Many Requests.
    """
    if error_code in [63038, 429]:
        return True
    msg = (str(error_message) or "").lower()
    if "exceeded" in msg or "limit" in msg or "too many requests" in msg:
        return True
    return False

def send_sms(mobile, message, farmer_id=None, farmer_name=None, village=None, district=None, alert_type="GENERAL_ADVISORY"):
    """
    Dispatches SMS using Twilio REST API with exponential backoff retries & gateway outage queueing.
    If credentials are missing, operates in mock simulator mode.
    Stores logs in MongoDB 'sms_logs'.
    """
    timestamp = datetime.now()
    clean_mobile = str(mobile).strip()
    
    # Enforce strict <= 160 character limit for single Twilio SMS segment delivery
    message_str = str(message or "").strip()
    if len(message_str) > 160:
        message = message_str[:157].rstrip() + "..."
    else:
        message = message_str
        
    # Strip any leading '+' for lookup keys
    clean_mobile_no_plus = clean_mobile[1:] if clean_mobile.startswith("+") else clean_mobile

    # Resolve farmer fields if not passed to make logs highly detailed
    f_id = farmer_id
    f_name = farmer_name
    f_village = village
    f_district = district
    
    farmer = None
    if f_id:
        from bson import ObjectId
        try:
            farmer = db.users.find_one({"_id": ObjectId(f_id)})
        except Exception:
            pass
    
    if not farmer:
        farmer = db.users.find_one({"mobile": clean_mobile_no_plus})
        if not farmer:
            # Fallback check last 10 digits
            farmer = db.users.find_one({"mobile": {"$regex": clean_mobile_no_plus[-10:] if len(clean_mobile_no_plus) >= 10 else clean_mobile_no_plus}})

    if farmer:
        f_id = farmer["_id"]
        f_name = farmer.get("name", "Unknown Farmer")
        f_village = farmer.get("village", "Unknown")
        f_district = farmer.get("district", "Unknown")
    else:
        f_name = f_name or "Unknown Farmer"
        f_village = f_village or "Unknown"
        f_district = f_district or "Unknown"

    account_sid = Config.TWILIO_ACCOUNT_SID
    auth_token = Config.TWILIO_AUTH_TOKEN
    twilio_number = Config.TWILIO_PHONE_NUMBER

    status = "Pending"
    twilio_sid = None
    error_code = None
    error_message = None
    error_msg = None
    simulated = True

    # Format number for Twilio (requires country code prefix)
    to_number = clean_mobile
    if not to_number.startswith("+"):
        if to_number.startswith("91") and len(to_number) > 10:
            to_number = "+" + to_number
        else:
            if to_number.startswith("0") and len(to_number) == 11:
                to_number = to_number[1:]
            to_number = "+91" + to_number

    print(f"=== SMS DISPATCH ATTEMPT ===", flush=True)
    print(f"Farmer Name: {f_name} | Destination number: {to_number}", flush=True)

    has_credentials = account_sid and auth_token and twilio_number and not account_sid.startswith("YOUR_")

    if has_credentials:
        # Retry loop with exponential backoff (2s, 4s, 8s)
        max_attempts = 3
        backoff_delays = [2, 4, 8]
        
        for attempt in range(1, max_attempts + 1):
            print(f"[TWILIO DISPATCH] Attempt {attempt}/{max_attempts} for {to_number}...", flush=True)
            try:
                client = _get_twilio_client(account_sid, auth_token)
                if client:
                    msg_obj = client.messages.create(
                        body=message,
                        from_=twilio_number,
                        to=to_number
                    )
                    twilio_sid = msg_obj.sid
                    status = "Delivered"
                    simulated = False
                    error_msg = None
                    print(f"Twilio Message SID: {twilio_sid} (Success on attempt {attempt})", flush=True)
                    break # Success! Exit retry loop
                else:
                    raise Exception("Twilio client initialization returned None")
            except Exception as e:
                # Capture Twilio error details
                error_code = getattr(e, "code", None)
                error_message = getattr(e, "msg", None) or str(e)
                if not error_code and hasattr(e, "status"):
                    error_code = getattr(e, "status", None)
                
                error_msg = f"HTTP {error_code} error: {error_message}" if error_code else str(e)
                print(f"[TWILIO ATTEMPT {attempt} FAILED] Code: {error_code} | Error: {error_message}", flush=True)

                # Check if unrecoverable invalid number error
                if is_invalid_number_error(error_code, error_message):
                    print(f"[INVALID NUMBER REJECTED] Unrecoverable error. Skipping retries for {to_number}.", flush=True)
                    status = "Failed"
                    break

                # Check if rate limit / quota error (Twilio Error 63038)
                if is_rate_limit_error(error_code, error_message):
                    print(f"[RATE LIMIT EXCEEDED] Code {error_code}: Twilio daily message limit hit for {to_number}. Stopping immediate retries and queueing once for background processing.", flush=True)
                    status = "Queued"
                    break

                # If temporary network/Twilio outage and retries remaining, wait backoff delay
                if attempt < max_attempts:
                    delay = backoff_delays[attempt - 1]
                    print(f"[RETRY BACKOFF] Waiting {delay}s before retry attempt {attempt + 1}...", flush=True)
                    time.sleep(delay)
                else:
                    # All 3 immediate retries failed -> Enqueue into Gateway Outage Queue
                    status = "Queued"

        # Handle Gateway Outage Enqueueing if queued
        if status == "Queued":
            existing = db.sms_queue.find_one({
                "mobile": clean_mobile,
                "message": message,
                "status": {"$in": ["QUEUED", "RETRYING"]}
            })
            if existing:
                print(f"[GATEWAY OUTAGE QUEUE] Message already queued for {clean_mobile}. Skipping duplicate queue entry.", flush=True)
            else:
                queue_entry = {
                    "farmer_id": str(f_id) if f_id else None,
                    "farmer_name": f_name,
                    "mobile": clean_mobile,
                    "village": f_village,
                    "district": f_district,
                    "message": message,
                    "alert_type": alert_type,
                    "retries": 0,
                    "status": "QUEUED",
                    "created_at": timestamp,
                    "last_attempt_at": timestamp,
                    "error": error_msg
                }
                db.sms_queue.insert_one(queue_entry)
                print(f"[GATEWAY OUTAGE QUEUE] Saved SMS to SMSQueue collection for background retry. Mobile: {clean_mobile}", flush=True)
    else:
        # Mock mode delivery simulation
        twilio_sid = "SMmock" + datetime.now().strftime("%Y%m%d%H%M%S")
        status = "Delivered (Simulated)"
        simulated = True
        print(f"Twilio Message SID (Mock): {twilio_sid}", flush=True)
        
    print("=============================", flush=True)

    # Save to MongoDB sms_logs matching specified Twilio fields
    sms_log = {
        "farmer_id": str(f_id) if f_id else None,
        "farmer_name": f_name,
        "mobile": clean_mobile,
        "village": f_village,
        "district": f_district,
        "message": message,
        "status": status,
        "error_code": error_code,
        "error_message": error_message,
        "error": error_msg,
        "Twilio SID": twilio_sid,
        "timestamp": timestamp,
        "simulated": simulated
    }
    
    db.sms_logs.insert_one(sms_log)
    print(f"[SMS SENDER] Sent to {clean_mobile} | Status: {status} | Twilio SID: {twilio_sid} | Error: {error_msg}")
    
    return {
        "success": status in ["Delivered", "Delivered (Simulated)"],
        "status": status,
        "twilio_sid": twilio_sid,
        "error": error_msg,
        "log": sms_log
    }

def process_sms_queue():
    """
    APScheduler Job (Runs every 5 minutes):
    Processes queued SMS messages in SMSQueue due to past gateway outages.
    Retries delivery up to 3 cycles before marking permanently failed.
    """
    start_time = datetime.now()
    print(f"\n[SMS QUEUE RETRY JOB] Started at {start_time.strftime('%Y-%m-%d %H:%M:%S')}", flush=True)

    queued_items = list(db.sms_queue.find({"status": {"$in": ["QUEUED", "RETRYING"]}}))
    if not queued_items:
        print("[SMS QUEUE RETRY JOB] SMSQueue is empty. No pending items.", flush=True)
        return {"processed": 0, "recovered": 0, "failed": 0}

    print(f"[SMS QUEUE RETRY JOB] Found {len(queued_items)} queued item(s) to process.", flush=True)

    account_sid = Config.TWILIO_ACCOUNT_SID
    auth_token = Config.TWILIO_AUTH_TOKEN
    twilio_number = Config.TWILIO_PHONE_NUMBER
    has_credentials = account_sid and auth_token and twilio_number and not account_sid.startswith("YOUR_")

    recovered_count = 0
    failed_count = 0

    for item in queued_items:
        item_id = item["_id"]
        mobile = item.get("mobile")
        message = item.get("message")
        farmer_id = item.get("farmer_id")
        farmer_name = item.get("farmer_name")
        retries = item.get("retries", 0) + 1

        to_number = str(mobile).strip()
        if not to_number.startswith("+"):
            to_number = "+91" + to_number if len(to_number) == 10 else "+" + to_number

        print(f"[SMS QUEUE RETRY] Processing item for {farmer_name} ({to_number}) | Retry Cycle {retries}/3...", flush=True)

        if has_credentials:
            try:
                client = _get_twilio_client(account_sid, auth_token)
                if client:
                    msg_obj = client.messages.create(
                        body=message,
                        from_=twilio_number,
                        to=to_number
                    )
                    twilio_sid = msg_obj.sid
                    
                    # Success! Recovered from outage
                    db.sms_queue.update_one(
                        {"_id": item_id},
                        {"$set": {
                            "status": "RECOVERED",
                            "retries": retries,
                            "last_attempt_at": datetime.now(),
                            "twilio_sid": twilio_sid
                        }}
                    )
                    
                    # Update SMS Logs
                    db.sms_logs.insert_one({
                        "farmer_id": farmer_id,
                        "farmer_name": farmer_name,
                        "mobile": mobile,
                        "village": item.get("village"),
                        "district": item.get("district"),
                        "message": message,
                        "status": "Delivered",
                        "Twilio SID": twilio_sid,
                        "timestamp": datetime.now(),
                        "simulated": False,
                        "queue_recovered": True
                    })

                    recovered_count += 1
                    print(f"[SMS QUEUE RECOVERY SUCCESS] Twilio SID: {twilio_sid}", flush=True)
                else:
                    raise Exception("Twilio client failed to initialize")
            except Exception as e:
                err_code = getattr(e, "code", None)
                err_msg = getattr(e, "msg", None) or str(e)
                full_err = f"HTTP {err_code} error: {err_msg}" if err_code else str(e)
                
                if is_rate_limit_error(err_code, err_msg):
                    # Rate limit error active: Pause retries, keep status QUEUED without inflating retry count
                    print(f"[QUEUE RETRY PAUSED] Twilio rate limit ({err_code}) active for {to_number}. Keeping message QUEUED for next cycle.", flush=True)
                    db.sms_queue.update_one(
                        {"_id": item_id},
                        {"$set": {
                            "status": "QUEUED",
                            "last_attempt_at": datetime.now(),
                            "error": full_err
                        }}
                    )
                    failed_count += 1
                elif retries >= 3 or is_invalid_number_error(err_code, err_msg):
                    # Exhausted retry limit or permanent invalid number
                    db.sms_queue.update_one(
                        {"_id": item_id},
                        {"$set": {
                            "status": "PERMANENTLY_FAILED",
                            "retries": retries,
                            "last_attempt_at": datetime.now(),
                            "error": full_err
                        }}
                    )
                    db.sms_logs.insert_one({
                        "farmer_id": farmer_id,
                        "farmer_name": farmer_name,
                        "mobile": mobile,
                        "village": item.get("village"),
                        "district": item.get("district"),
                        "message": message,
                        "status": "Failed",
                        "error_code": err_code,
                        "error_message": err_msg,
                        "error": full_err,
                        "timestamp": datetime.now(),
                        "simulated": False
                    })
                    failed_count += 1
                    print(f"[SMS QUEUE EXHAUSTED] Max retries reached for {to_number}. Marked PERMANENTLY_FAILED.", flush=True)
                else:
                    db.sms_queue.update_one(
                        {"_id": item_id},
                        {"$set": {
                            "status": "RETRYING",
                            "retries": retries,
                            "last_attempt_at": datetime.now(),
                            "error": full_err
                        }}
                    )
        else:
            # Mock mode recovery
            twilio_sid = "SMmockRec" + datetime.now().strftime("%Y%m%d%H%M%S")
            db.sms_queue.update_one(
                {"_id": item_id},
                {"$set": {
                    "status": "RECOVERED",
                    "retries": retries,
                    "last_attempt_at": datetime.now(),
                    "twilio_sid": twilio_sid
                }}
            )
            recovered_count += 1

    print(f"[SMS QUEUE RETRY JOB] Finished. Recovered: {recovered_count} | Permanently Failed: {failed_count}\n", flush=True)
    return {"processed": len(queued_items), "recovered": recovered_count, "failed": failed_count}

def get_sms_queue_status():
    """
    Returns live statistics on SMSQueue collection health.
    """
    queued = db.sms_queue.count_documents({"status": "QUEUED"})
    retrying = db.sms_queue.count_documents({"status": "RETRYING"})
    recovered = db.sms_queue.count_documents({"status": "RECOVERED"})
    permanently_failed = db.sms_queue.count_documents({"status": "PERMANENTLY_FAILED"})
    total = db.sms_queue.count_documents({})

    return {
        "queued": queued,
        "retrying": retrying,
        "recovered": recovered,
        "permanently_failed": permanently_failed,
        "total_queued": total
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
    Broadcasts only to verified farmers.
    """
    farmers = list(db.users.find({"role": "farmer", "verified_for_sms": True}))
    mobiles = [f["mobile"] for f in farmers if f.get("mobile")]
    print(f"[SMS BROADCAST] Dispatching message to {len(mobiles)} verified farmer(s).")
    return broadcast_sms(mobiles, message)
