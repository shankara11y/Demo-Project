import time
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from database.db import db
from services.weather_service import get_current_weather, geocode_location
from services.recommendation_service import generate_crop_recommendation
from services.sms_service import send_sms

# Localized translation table for automated SMS advisories
ADVISORY_TEMPLATES = {
    "en": {
        "heavy_rain": "Alert: Heavy rain expected today ({rain}mm). Avoid irrigation. {crop} suitability: {suitability}. Sowing window: {window}.",
        "heatwave": "Alert: Extreme heatwave today ({temp}°C). Avoid mid-day activities. {crop} suitability: {suitability}.",
        "high_wind": "Alert: High winds expected ({wind} km/h). Crop damage risks. {crop} suitability: {suitability}.",
        "normal": "AgriCast Sowing Advisor ({crop}): Sowing is {suitability} (Confidence: {conf}%). Best date: {window}. Avoid: {avoid}."
    },
    "hi": {
        "heavy_rain": "चेतावनी: आज भारी बारिश ({rain}mm) की आशंका है। सिंचाई रोकें। {crop} उपयुक्तता: {suitability}। बुवाई की तिथि: {window}।",
        "heatwave": "चेतावनी: आज भीषण लू ({temp}°C) की आशंका है। सुरक्षा उपाय करें। {crop} उपयुक्तता: {suitability}।",
        "high_wind": "चेतावनी: तेज हवाएं ({wind} km/h) चलने की आशंका है। {crop} उपयुक्तता: {suitability}।",
        "normal": "एग्रीकास्ट बुवाई सलाह ({crop}): उपयुक्तता {suitability} है (भरोसा: {conf}%)। अनुकूल समय: {window}। इससे बचें: {avoid}।"
    },
    "mr": {
        "heavy_rain": "इशारा: आज मुसळधार पाऊस ({rain}mm) पडण्याची शक्यता आहे. पाणी देणे टाळा. {crop} पेरणी योग्यता: {suitability}. पेरणीचा काळ: {window}.",
        "heatwave": "इशारा: आज तीव्र उष्णतेची लाट ({temp}°C) येण्याची शक्यता आहे. काळजी घ्या. {crop} पेरणी योग्यता: {suitability}.",
        "high_wind": "इशारा: सोसाट्याचा वारा ({wind} km/h) वाहण्याची शक्यता आहे. {crop} पेरणी योग्यता: {suitability}.",
        "normal": "अ‍ॅग्रीकास्ट पेरणी सल्ला ({crop}): पेरणी योग्यता {suitability} आहे (विश्वास: {conf}%). अनुकूल वेळ: {window}. हे टाळा: {avoid}."
    }
}

# Translate suitability terms for localized SMS
SUITABILITY_TRANSLATION = {
    "en": {"Suitable": "Suitable", "Moderately Suitable": "Moderately Suitable", "Not Suitable": "Not Suitable"},
    "hi": {"Suitable": "उपयुक्त", "Moderately Suitable": "आंशिक रूप से उपयुक्त", "Not Suitable": "उपयुक्त नहीं"},
    "mr": {"Suitable": "योग्य", "Moderately Suitable": "मध्यम योग्य", "Not Suitable": "योग्य नाही"}
}

def run_daily_advisory_broadcast():
    print(f"[SCHEDULER AUDIT] Daily 6:00 AM job started at {datetime.now()}", flush=True)
    
    # Filter strictly for verified farmers
    farmers = list(db.users.find({"role": "farmer", "verified_for_sms": True}))
    print(f"[SCHEDULER AUDIT] Found {len(farmers)} verified farmer(s) for daily updates.", flush=True)
    
    for farmer in farmers:
        farmer_id = farmer["_id"]
        farmer_name = farmer.get("name", "Unknown Farmer")
        mobile = farmer.get("mobile")

        if not farmer.get("verified_for_sms", False):
            print(f"[SCHEDULER AUDIT] Skipping unverified farmer {farmer_name} ({mobile})", flush=True)
            continue
        lang = farmer.get("preferred_language", "en")
        if lang not in ADVISORY_TEMPLATES:
            lang = "en"
            
        crops = farmer.get("crop_types", [])
        if not crops:
            continue
            
        # Get coordinates or geocode if missing
        location_record = db.farmer_locations.find_one({"farmer_id": farmer_id})
        if not location_record:
            village = farmer.get("village", "")
            district = farmer.get("district", "")
            state = farmer.get("state", "")
            
            geo = geocode_location(village, district, state)
            lat, lon = geo["lat"], geo["lon"]
            
            # Save cache location
            db.farmer_locations.insert_one({
                "farmer_id": farmer_id,
                "village": village,
                "district": district,
                "state": state,
                "location": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                }
            })
        else:
            lon, lat = location_record["location"]["coordinates"]

        # Fetch current weather
        weather = get_current_weather(lat, lon)
        # Log weather metrics
        db.weather_logs.insert_one({
            "farmer_id": farmer_id,
            "lat": lat,
            "lon": lon,
            "temp": weather["temp"],
            "humidity": weather["humidity"],
            "rainfall": weather["rainfall"],
            "wind_speed": weather["wind_speed"],
            "timestamp": datetime.now()
        })

        # Process suitability for farmer's primary crop
        # (For SMS, we send advice for their primary/first crop to fit single SMS body constraints)
        primary_crop_name = crops[0]
        crop_doc = db.crops.find_one({"name": primary_crop_name})
        if not crop_doc:
            continue
            
        crop_id = crop_doc["_id"]
        
        try:
            # Generate AI Sowing recommendations
            rec = generate_crop_recommendation(farmer_id, crop_id, weather)
            suitability = rec["suitability"]
            confidence = rec["confidence"]
            recommended_date = rec["recommended_date"]
            avoid_date = rec["avoid_date"]
            
            # Translate suitability
            translated_suit = SUITABILITY_TRANSLATION[lang].get(suitability, suitability)

            # Detect alert thresholds
            sms_text = ""
            alert_type = None
            alert_val = ""
            
            if weather["rainfall"] >= 40.0:
                alert_type = "heavy_rain"
                alert_val = str(weather["rainfall"])
            elif weather["temp"] >= 40.0:
                alert_type = "heatwave"
                alert_val = str(weather["temp"])
            elif weather["wind_speed"] >= 25.0:
                alert_type = "high_wind"
                alert_val = str(weather["wind_speed"])
                
            if alert_type:
                advice_map = {
                    "high_wind": "Action Required: Postpone sowing & chemical spraying for 48 hours to avoid crop lodging and wind drift. Secure young seedlings and install temporary windbreaks.",
                    "heavy_rain": "Action Required: Delay sowing for 48-72 hours. Ensure open field drainage channels to prevent waterlogging and root rot.",
                    "heatwave": "Action Required: Avoid midday field operations. Apply light early-morning micro-irrigation to protect topsoil moisture and reduce crop heat stress."
                }
                rec_action = advice_map.get(alert_type, "Action Required: Exercise caution and check local field condition before sowing.")
                alert_msg = f"Severe {alert_type.replace('_', ' ')} detected at farmer location ({weather['temp']}°C, {weather['wind_speed']} km/h wind). {rec_action}"

                db.alerts.insert_one({
                    "farmer_id": farmer_id,
                    "type": alert_type,
                    "value": alert_val,
                    "message": alert_msg,
                    "recommendation": rec_action,
                    "timestamp": datetime.now()
                })
                # Format localized warning
                sms_text = ADVISORY_TEMPLATES[lang][alert_type].format(
                    crop=primary_crop_name,
                    suitability=translated_suit,
                    rain=weather["rainfall"],
                    temp=weather["temp"],
                    wind=weather["wind_speed"],
                    window=recommended_date
                )
            else:
                # Normal advisory message
                sms_text = ADVISORY_TEMPLATES[lang]["normal"].format(
                    crop=primary_crop_name,
                    suitability=translated_suit,
                    conf=confidence,
                    window=recommended_date,
                    avoid=avoid_date
                )
                
            # Send SMS
            send_sms(mobile, sms_text)
            
        except Exception as job_err:
            print(f"Error running daily advice for farmer {farmer_id}: {job_err}")

    print(f"[SCHEDULER] Daily 6:00 AM job completed at {datetime.now()}")

_scheduler = None

def start_scheduler():
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        print("[SCHEDULER] BackgroundScheduler is already running. Skipping duplicate start.", flush=True)
        return _scheduler

    from services.automation_engine import run_hourly_auto_advisory
    from services.sms_service import process_sms_queue
    scheduler = BackgroundScheduler()
    # Job 1: Existing daily morning broadcast at 6:00 AM local time
    scheduler.add_job(
        run_daily_advisory_broadcast, 
        'cron', 
        hour=6, 
        minute=0,
        id='daily_advisory_broadcast',
        name='Daily Morning Advisory Broadcast'
    )
    # Job 2: Fully automated weather & sowing advisory monitoring engine running every 60 minutes
    scheduler.add_job(
        run_hourly_auto_advisory, 
        'interval', 
        hours=1,
        id='hourly_auto_advisory',
        name='Hourly Automated Weather Advisory Engine'
    )
    # Job 3: Gateway Outage Queue Retry Engine running every 5 minutes
    scheduler.add_job(
        process_sms_queue,
        'interval',
        minutes=5,
        id='sms_queue_retry_engine',
        name='Gateway Outage Queue Retry Engine'
    )
    scheduler.start()
    _scheduler = scheduler
    print("[SCHEDULER] APScheduler started. Registered: 1) 6:00 AM Daily Broadcast 2) Hourly Auto Advisory Engine 3) 5-Min SMS Queue Retry Engine.", flush=True)
    return scheduler
