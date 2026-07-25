import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

MODEL_PATH = os.path.join(os.path.dirname(__file__), "sowing_model.joblib")

def load_or_train_model():
    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Running training script...")
        from ai.train import train_model
        train_model()
    return joblib.load(MODEL_PATH)

# Load model on import
try:
    model = load_or_train_model()
except Exception as e:
    print(f"Error loading AI model: {e}. AI features will run in rule-based mode.")
    model = None

def predict_suitability(weather_data, crop_reqs, season_match, soil_data=None, forecast_list=None):
    """
    Predict suitability level and optimal 5-day sowing window using current weather,
    5-day OpenWeather forecast, ISRIC SoilGrids data, and crop requirements.
    """
    temp = weather_data.get("temp", 25.0)
    humidity = weather_data.get("humidity", 60.0)
    r_1h = weather_data.get("rainfall", 0.0) # 1-hour rainfall from OpenWeather (mm/h)
    wind_speed = weather_data.get("wind_speed", 10.0)
    description = weather_data.get("description", "").strip()
    desc_lower = description.lower()
    
    t_min = crop_reqs.get("ideal_temp_min", 20.0)
    t_max = crop_reqs.get("ideal_temp_max", 30.0)
    r_min = crop_reqs.get("ideal_rainfall_min", 50.0)
    r_max = crop_reqs.get("ideal_rainfall_max", 100.0)
    h_min = crop_reqs.get("ideal_humidity_min", 50.0)
    h_max = crop_reqs.get("ideal_humidity_max", 80.0)
    
    reasons = []
    
    # 1. Soil checks
    if soil_data:
        try:
            ph = float(str(soil_data.get("ph", 6.5)))
            ph_min = crop_reqs.get("ideal_soil_ph_min", 5.5)
            ph_max = crop_reqs.get("ideal_soil_ph_max", 7.5)
            
            if ph_min <= ph <= ph_max:
                reasons.append(f"• Soil pH is optimal ({ph}, ideal: {ph_min}-{ph_max}). Source: {soil_data.get('source')}.")
            else:
                reasons.append(f"• Soil pH is sub-optimal ({ph}, ideal: {ph_min}-{ph_max}). Source: {soil_data.get('source')}.")
        except Exception:
            pass
            
        reasons.append(f"• Soil textures: Clay {soil_data.get('clay')}, Sand {soil_data.get('sand')}, Silt {soil_data.get('silt')}.")
        
    # 2. Season checks
    if season_match == 0:
        reasons.append(f"• Sowing season mismatch. Recommended sowing season is {crop_reqs.get('season', 'Kharif')}.")
    else:
        reasons.append(f"• Season match: Appropriate time of the year for {crop_reqs.get('crop_name', 'crop')}.")

    # 3. Temperature checks
    if t_min <= temp <= t_max:
        reasons.append(f"• Temperature is optimal ({temp:.1f}°C, ideal: {t_min}-{t_max}°C).")
    elif temp < t_min:
        reasons.append(f"• Temperature is cool ({temp:.1f}°C, below ideal min of {t_min}°C).")
    else:
        reasons.append(f"• Temperature is warm ({temp:.1f}°C, above ideal max of {t_max}°C).")

    # 4. Current weather checks
    is_heavy_curr = any(kw in desc_lower for kw in ["heavy", "thunderstorm", "extreme", "torrential", "downpour", "shower"]) or r_1h > 7.5
    is_moderate_curr = ("moderate" in desc_lower or (2.5 <= r_1h <= 7.5)) and not is_heavy_curr

    # 5. Process 5-Day Weather Forecast if available
    has_forecast = isinstance(forecast_list, list) and len(forecast_list) > 0
    
    best_sowing_date = None
    avoid_date = None
    suitability = "Suitable"
    confidence = 88.0

    if has_forecast:
        forecast_days = []
        for f in forecast_list:
            f_date_str = f.get("date", "")
            f_desc = f.get("description", "").capitalize()
            f_desc_l = f_desc.lower()
            f_rain = f.get("rainfall", 0.0)
            
            try:
                dt_obj = datetime.strptime(f_date_str, "%Y-%m-%d")
                formatted_date = dt_obj.strftime("%d %B %Y")
                short_date = dt_obj.strftime("%d %b")
            except Exception:
                formatted_date = f_date_str
                short_date = f_date_str

            is_heavy = any(kw in f_desc_l for kw in ["heavy", "thunderstorm", "extreme", "torrential", "downpour", "shower"]) or f_rain > 15.0
            is_mod = ("moderate" in f_desc_l or (4.0 <= f_rain <= 15.0)) and not is_heavy
            
            forecast_days.append({
                "date_raw": f_date_str,
                "formatted_date": formatted_date,
                "short_date": short_date,
                "description": f_desc,
                "rainfall": f_rain,
                "is_heavy": is_heavy,
                "is_moderate": is_mod
            })

        # Step 8: Console Logging
        print("\n========== Forecast Analysis ==========", flush=True)
        for fd in forecast_days:
            print(f"{fd['short_date']}: {fd['description']} ({fd['rainfall']:.1f} mm)", flush=True)

        heavy_days = [fd for fd in forecast_days if fd["is_heavy"]]
        mod_days = [fd for fd in forecast_days if fd["is_moderate"]]

        if season_match == 0:
            suitability = "Not Suitable"
            best_sowing_date = f"Postpone sowing until {crop_reqs.get('season', 'Kharif')} season"
            avoid_date = "Sowing during off-season"
            confidence = 95.0
        elif is_heavy_curr or (len(forecast_days) > 0 and forecast_days[0]["is_heavy"]):
            if len(heavy_days) == len(forecast_days):
                suitability = "Not Suitable"
                best_sowing_date = "No suitable sowing window during the next 5 days"
                avoid_date = "Next 5 days (Continuous heavy rainfall forecast)"
                reasons.append("• Continuous heavy rainfall and thunderstorm warning expected across all 5 upcoming days.")
                reasons.append("• High risk of field waterlogging, seed washing, and soil erosion.")
                reasons.append("• Recommended action: Delay sowing until a clear weather window appears.")
                confidence = 94.0
            else:
                suitable_day = None
                for fd in forecast_days:
                    if not fd["is_heavy"]:
                        suitable_day = fd
                        break
                
                if suitable_day:
                    suitability = "Moderately Suitable" if len(heavy_days) >= 2 else "Suitable"
                    best_sowing_date = f"{suitable_day['formatted_date']}"
                    avoid_date = f"Immediate sowing ({forecast_days[0]['short_date']} - {suitable_day['short_date']}) due to heavy rain"
                    reasons.append(f"• Heavy rainfall is expected for the next {len(heavy_days)} day(s) ({forecast_days[0]['description']}).")
                    reasons.append("• Soil may become waterlogged and seeds risk being washed away.")
                    reasons.append(f"• Weather conditions improve to {suitable_day['description']} on {suitable_day['formatted_date']}.")
                    reasons.append(f"• Recommended action: Begin sowing on {suitable_day['formatted_date']} after rainfall subsides.")
                    confidence = 90.0
                else:
                    suitability = "Not Suitable"
                    best_sowing_date = "No suitable sowing window during the next 5 days"
                    avoid_date = "Next 5 days (Heavy rain risk)"
                    confidence = 88.0
        elif mod_days and not forecast_days[0]["is_heavy"]:
            first_mod = mod_days[0]
            suitability = "Suitable"
            best_sowing_date = f"{first_mod['formatted_date']}"
            avoid_date = "Days with forecasted rain extremes or high winds"
            reasons.append(f"• Moderate rainfall ({first_mod['description']}) is expected on {first_mod['formatted_date']}.")
            reasons.append("• Provides ideal soil moisture for seed germination and root establishment.")
            reasons.append(f"• Recommended action: Complete sowing on or just before {first_mod['formatted_date']}.")
            confidence = 92.0
        else:
            suitability = "Suitable"
            first_date = forecast_days[0]["formatted_date"] if forecast_days else datetime.now().strftime("%d %B %Y")
            best_sowing_date = f"{first_date} (Ensure supplemental irrigation is available)"
            avoid_date = "Sowing in dry soil without supplemental irrigation"
            reasons.append(f"• Current and 5-day forecast is predominantly dry ({forecast_days[0]['description'] if forecast_days else 'Clear'}).")
            reasons.append("• Supplemental irrigation is recommended before or immediately after sowing.")
            reasons.append(f"• Recommended action: Sow starting {first_date} with light irrigation.")
            confidence = 88.0

        # Step 5: Adjust confidence score based on agreement & wind speed
        if len(heavy_days) >= 4 or (len(forecast_days) - len(heavy_days)) >= 4:
            confidence = min(95.0, confidence + 5.0)
        if wind_speed > 25.0:
            confidence = max(65.0, confidence - 10.0)

        print(f"Best sowing window: {best_sowing_date}", flush=True)
        print(f"Reason: {reasons[-1] if reasons else 'Timeline analysis complete'}", flush=True)
        print("======================================\n", flush=True)

    else:
        # Step 7: Fallback logic when forecast API is unavailable
        if season_match == 0:
            suitability = "Not Suitable"
            best_sowing_date = f"Postpone sowing until {crop_reqs.get('season', 'Kharif')} season"
            avoid_date = "Off-season sowing"
            confidence = 92.0
        elif is_heavy_curr:
            suitability = "Not Suitable"
            best_sowing_date = "Postpone sowing, wait for heavy rain to subside"
            avoid_date = "Immediate sowing is highly discouraged due to heavy rainfall"
            reasons.append(f"• Current weather is experiencing heavy rainfall ({r_1h:.1f} mm/hr, {description or 'Heavy Rain'}), so sowing should be postponed.")
            confidence = 90.0
        elif is_moderate_curr:
            suitability = "Suitable"
            best_sowing_date = f"{datetime.now().strftime('%d %B %Y')} (Optimal rain moisture)"
            avoid_date = "Days with forecasted rain extremes"
            reasons.append(f"• Current weather is experiencing moderate rainfall ({r_1h:.1f} mm/hr, {description or 'Moderate Rain'}); favorable soil moisture for sowing.")
            confidence = 88.0
        else:
            suitability = "Suitable"
            best_sowing_date = f"{datetime.now().strftime('%d %B %Y')} (Apply light irrigation if needed)"
            avoid_date = "Sow in dry soil without supplemental irrigation"
            reasons.append(f"• Current weather is dry (0.0 mm/hr, {description or 'Dry'}); supplemental irrigation may be needed for sowing.")
            confidence = 85.0

    return {
        "suitability": suitability,
        "confidence": round(confidence, 1),
        "reasons": reasons,
        "recommended_date": best_sowing_date,
        "avoid_date": avoid_date
    }

def run_fallback_rules(temp, humidity, r_1h, wind_speed, t_min, t_max, r_min, r_max, h_min, h_max, season_match, is_heavy_rain=False):
    if season_match == 0 or is_heavy_rain:
        return 0, 95.0
        
    violations = 0
    if not (t_min <= temp <= t_max): violations += 1
    if not (h_min <= humidity <= h_max): violations += 1
    if wind_speed > 25.0: violations += 2
    elif wind_speed > 15.0: violations += 1
    
    if violations == 0:
        return 2, 90.0
    elif violations == 1:
        return 1, 75.0
    else:
        return 0, 85.0
