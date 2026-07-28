import logging
from datetime import datetime, timedelta
from database.db import db
from services.weather_service import get_current_weather, get_weather_forecast, geocode_location
from services.soil_service import get_soil_properties
from services.recommendation_service import generate_crop_recommendation
from services.sms_service import send_sms

logger = logging.getLogger(__name__)

def evaluate_farmer_alert(weather, forecast_list, rec):
    """
    Decision Engine: Evaluates current weather, 5-day forecast, and recommendation output
    to determine the alert category and appropriate action.
    """
    temp = weather.get("temp", 25.0)
    rainfall_1h = weather.get("rainfall", 0.0)
    wind_speed = weather.get("wind_speed", 10.0)
    desc = (weather.get("description") or "").lower()
    
    suitability = rec.get("suitability", "Suitable")
    rec_date = rec.get("recommended_date", "Next 2-3 days")
    
    # Heavy Rain / Thunderstorm check
    is_thunderstorm = "thunderstorm" in desc
    is_heavy_rain = (
        rainfall_1h > 7.5 or 
        any(kw in desc for kw in ["heavy", "extreme", "torrential", "downpour", "shower"]) or
        is_thunderstorm
    )
    
    if is_thunderstorm:
        return "THUNDERSTORM", f"ALERT: Heavy Rain | Risk: Thunderstorm ({rainfall_1h:.1f}mm/h). Action: Postpone all field work & sowing for 48h."
    elif is_heavy_rain:
        return "HEAVY_RAIN", f"ALERT: Heavy Rain | Risk: Heavy rain ({rainfall_1h:.1f}mm/h). Action: Postpone sowing & spraying for 48h to prevent washout."
    elif temp >= 40.0:
        return "HEAT", f"ALERT: Extreme Heat | Risk: Heatwave ({temp:.1f}°C). Action: Avoid mid-day field activities. Provide early morning irrigation."
    elif wind_speed >= 30.0:
        return "HIGH_WIND", f"ALERT: High Wind | Risk: High wind ({wind_speed:.1f} km/h). Action: Delay sowing & spraying for 48h until wind calms down."
    elif suitability in ["Suitable", "Moderately Suitable"]:
        if rainfall_1h == 0.0 and "dry" in desc:
            return "IRRIGATION", f"ADVISORY: Dry Weather | Risk: Low moisture. Action: Provide pre-sowing light irrigation before planting."
        else:
            return "SOWING_WINDOW", f"ADVISORY: Optimal Window | Weather: Favorable. Action: Complete sowing within 48h. Recommended date: {rec_date}."
    else:
        return "GENERAL_ADVISORY", f"ADVISORY: Weather Caution | Risk: Sub-optimal weather. Action: Postpone sowing until weather normalizes."

def process_single_farmer_advisory(farmer, weather_cache, soil_cache):
    """
    Processes weather, soil, decision engine rules, and SMS dispatch for a single farmer.
    Returns result dict for audit logging and statistics tracking.
    """
    farmer_id = farmer["_id"]
    farmer_name = farmer.get("name", "Unknown Farmer")
    village = farmer.get("village", "Unknown")
    district = farmer.get("district", "Unknown")
    mobile = farmer.get("mobile")

    # 1. Validation checks
    if not mobile:
        print(f"\n========== AUTO ADVISORY ==========\nFarmer: {farmer_name}\nSMS: FAILED\nReason: Missing Mobile Number\n==================================", flush=True)
        return {"status": "FAILED", "reason": "Missing Mobile Number", "alert_type": None, "farmer_name": farmer_name}

    if not farmer.get("verified_for_sms", False):
        return {"status": "SKIPPED", "reason": "SMS Not Verified", "alert_type": None, "farmer_name": farmer_name}

    crops = farmer.get("crop_types", [])
    if not crops:
        return {"status": "SKIPPED", "reason": "No Crops Configured", "alert_type": None, "farmer_name": farmer_name}

    primary_crop_name = crops[0]

    # 2. Coordinates Resolution
    lat = farmer.get("latitude")
    lon = farmer.get("longitude")

    if (lat is None or lon is None) and "coords" in farmer and isinstance(farmer["coords"], list) and len(farmer["coords"]) == 2:
        lon, lat = farmer["coords"]

    if lat is None or lon is None:
        location_record = db.farmer_locations.find_one({"farmer_id": farmer_id})
        if location_record and "location" in location_record and "coordinates" in location_record["location"]:
            lon, lat = location_record["location"]["coordinates"]

    if lat is None or lon is None:
        # Fallback geocoding
        state = farmer.get("state", "Maharashtra")
        geo = geocode_location(village, district, state)
        lat, lon = geo["lat"], geo["lon"]
        db.farmer_locations.insert_one({
            "farmer_id": farmer_id,
            "village": village,
            "district": district,
            "state": state,
            "location": {"type": "Point", "coordinates": [lon, lat]}
        })

    coord_key = f"{round(lat, 3)},{round(lon, 3)}"

    # 3. Retrieve or Cache Weather
    if coord_key not in weather_cache:
        w_curr = get_current_weather(lat, lon)
        w_fc = get_weather_forecast(lat, lon)
        weather_cache[coord_key] = {
            "current": w_curr,
            "forecast": w_fc.get("forecast", []) if isinstance(w_fc, dict) else []
        }

    weather_data = weather_cache[coord_key]["current"]
    forecast_list = weather_cache[coord_key]["forecast"]

    # 4. Retrieve or Cache Soil
    if coord_key not in soil_cache:
        try:
            soil_cache[coord_key] = get_soil_properties(lat, lon)
        except Exception as e:
            logger.warning(f"SoilGrids query error for farmer {farmer_id}: {e}")
            soil_cache[coord_key] = None

    # 5. Recommendation Engine Call
    crop_doc = db.crops.find_one({"name": primary_crop_name})
    if not crop_doc:
        return {"status": "SKIPPED", "reason": f"Crop '{primary_crop_name}' not found", "alert_type": None, "farmer_name": farmer_name}

    crop_id = str(crop_doc["_id"])
    rec = generate_crop_recommendation(farmer_id, crop_id, weather_data, lat=lat, lon=lon)

    # 6. Decision Engine Evaluation
    alert_type, sms_text = evaluate_farmer_alert(weather_data, forecast_list, rec)

    # 7. Duplicate Alert Prevention (24-Hour Rule)
    last_alert_type = farmer.get("last_alert_type")
    last_alert_time = farmer.get("last_alert_time")
    
    if last_alert_type == alert_type and last_alert_time:
        if isinstance(last_alert_time, str):
            try:
                last_alert_time = datetime.fromisoformat(last_alert_time)
            except Exception:
                last_alert_time = None
                
        if last_alert_time and (datetime.now() - last_alert_time).total_seconds() < 86400:
            print(f"\n========== AUTO ADVISORY ==========\nFarmer: {farmer_name}\nVillage: {village}\nAlert: {alert_type}\nSMS: SUPPRESSED (Same alert sent < 24h ago)\n==================================", flush=True)
            return {"status": "SUPPRESSED", "reason": "Duplicate alert within 24h", "alert_type": alert_type, "farmer_name": farmer_name}

    # 8. Dispatch SMS via Twilio
    sms_res = send_sms(
        mobile=mobile,
        message=sms_text,
        farmer_id=farmer_id,
        farmer_name=farmer_name,
        village=village,
        district=district
    )

    is_success = sms_res.get("success", False)
    twilio_sid = sms_res.get("twilio_sid", "N/A")
    error_msg = sms_res.get("error")

    if is_success:
        # Update farmer's last alert metadata
        db.users.update_one(
            {"_id": farmer_id},
            {"$set": {
                "last_alert_type": alert_type,
                "last_alert_time": datetime.now()
            }}
        )

        # Store in db.alerts
        db.alerts.insert_one({
            "farmer_id": farmer_id,
            "type": alert_type,
            "message": sms_text,
            "twilio_sid": twilio_sid,
            "timestamp": datetime.now()
        })

        print(f"\n========== AUTO ADVISORY ==========\nFarmer: {farmer_name}\nVillage: {village}\nRecommendation: {rec.get('suitability')}\nAlert: {alert_type}\nSMS: SENT\nTwilio SID: {twilio_sid}\n==================================", flush=True)
        return {"status": "SENT", "alert_type": alert_type, "twilio_sid": twilio_sid, "farmer_name": farmer_name}
    else:
        print(f"\n========== AUTO ADVISORY ==========\nFarmer: {farmer_name}\nVillage: {village}\nSMS: FAILED\nReason: {error_msg or 'Twilio Error'}\n==================================", flush=True)
        return {"status": "FAILED", "reason": error_msg or "Twilio Error", "alert_type": alert_type, "farmer_name": farmer_name}

def run_hourly_auto_advisory():
    """
    Main scheduled task executed every 60 minutes by APScheduler.
    Iterates over all verified farmers, evaluates weather & soil, runs decision engine,
    sends SMS advisories, and updates operational statistics.
    """
    start_time = datetime.now()
    print(f"\n==========================================")
    print(f"[AUTOMATION ENGINE] Hourly Auto Advisory Run Started at {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"==========================================")

    # Update status to running
    db.automation_status.update_one(
        {"_id": "current_status"},
        {"$set": {"status": "Running", "current_run_start": start_time.isoformat()}},
        upsert=True
    )

    farmers = list(db.users.find({"role": "farmer", "verified_for_sms": True}))
    print(f"[AUTOMATION ENGINE] Found {len(farmers)} verified farmer(s) for advisory evaluation.")

    weather_cache = {}
    soil_cache = {}

    checked_count = 0
    alerts_generated = 0
    sms_sent_count = 0
    sms_failed_count = 0
    suppressed_count = 0

    for farmer in farmers:
        try:
            checked_count += 1
            res = process_single_farmer_advisory(farmer, weather_cache, soil_cache)
            
            st = res.get("status")
            if st == "SENT":
                alerts_generated += 1
                sms_sent_count += 1
            elif st == "FAILED":
                alerts_generated += 1
                sms_failed_count += 1
            elif st == "SUPPRESSED":
                suppressed_count += 1
        except Exception as farmer_err:
            logger.error(f"Error processing farmer {farmer.get('_id')}: {farmer_err}")
            sms_failed_count += 1

    end_time = datetime.now()
    duration_sec = round((end_time - start_time).total_seconds(), 2)

    next_scan_time = end_time + timedelta(hours=1)

    status_summary = {
        "status": "Operational",
        "last_scan_time": end_time.isoformat(),
        "next_scan_time": next_scan_time.isoformat(),
        "duration_seconds": duration_sec,
        "farmers_checked": checked_count,
        "alerts_generated": alerts_generated,
        "sms_sent": sms_sent_count,
        "sms_failed": sms_failed_count,
        "suppressed_duplicate": suppressed_count
    }

    db.automation_status.update_one(
        {"_id": "current_status"},
        {"$set": status_summary},
        upsert=True
    )

    print(f"\n==========================================")
    print(f"[AUTOMATION ENGINE] Run Completed in {duration_sec}s")
    print(f"Checked: {checked_count} | Sent: {sms_sent_count} | Failed: {sms_failed_count} | Suppressed (24h): {suppressed_count}")
    print(f"Next Scheduled Run: {next_scan_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"==========================================\n", flush=True)

    return status_summary
