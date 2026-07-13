import os
import joblib
import pandas as pd
import numpy as np

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

def predict_suitability(weather_data, crop_reqs, season_match, soil_data=None):
    """
    Predict suitability level.
    weather_data: dict with 'temp', 'humidity', 'rainfall', 'wind_speed'
    crop_reqs: dict with crop threshold ranges
    season_match: int (1 for match, 0 for mismatch)
    soil_data: dict with clay, sand, silt, ph, organic_carbon, cec, nitrogen, bulk_density, source
    """
    temp = weather_data.get("temp", 25.0)
    humidity = weather_data.get("humidity", 60.0)
    rainfall = weather_data.get("rainfall", 50.0)
    wind_speed = weather_data.get("wind_speed", 10.0)
    
    t_min = crop_reqs.get("ideal_temp_min", 20.0)
    t_max = crop_reqs.get("ideal_temp_max", 30.0)
    r_min = crop_reqs.get("ideal_rainfall_min", 50.0)
    r_max = crop_reqs.get("ideal_rainfall_max", 100.0)
    h_min = crop_reqs.get("ideal_humidity_min", 50.0)
    h_max = crop_reqs.get("ideal_humidity_max", 80.0)
    
    # 1. Rules checks for justification text
    reasons = []
    
    if soil_data:
        try:
            ph = float(str(soil_data.get("ph", 6.5)))
            ph_min = crop_reqs.get("ideal_soil_ph_min", 5.5)
            ph_max = crop_reqs.get("ideal_soil_ph_max", 7.5)
            
            if ph_min <= ph <= ph_max:
                reasons.append(f"Soil pH is optimal ({ph}, ideal: {ph_min}-{ph_max}). Source: {soil_data.get('source')}")
            else:
                reasons.append(f"Soil pH is sub-optimal ({ph}, ideal: {ph_min}-{ph_max}). Source: {soil_data.get('source')}")
        except Exception:
            pass
            
        reasons.append(f"Soil textures: Clay {soil_data.get('clay')}, Sand {soil_data.get('sand')}, Silt {soil_data.get('silt')}.")
        
    if season_match == 0:
        reasons.append(f"Sowing season mismatch. Recommended sowing season is {crop_reqs.get('season', 'Kharif')}.")
    else:
        reasons.append(f"Season match: Appropriate time of the year for {crop_reqs.get('crop_name', 'crop')}.")

    # Temp checks
    if t_min <= temp <= t_max:
        reasons.append(f"Temperature is optimal ({temp:.1f}°C, ideal: {t_min}-{t_max}°C).")
    elif temp < t_min:
        reasons.append(f"Temperature is too cool ({temp:.1f}°C) below ideal min of {t_min}°C.")
    else:
        reasons.append(f"Temperature is too warm ({temp:.1f}°C) above ideal max of {t_max}°C.")
        
    # Rainfall checks
    if r_min <= rainfall <= r_max:
        reasons.append(f"Rainfall is optimal ({rainfall:.1f} mm, ideal: {r_min}-{r_max} mm).")
    elif rainfall < r_min:
        reasons.append(f"Rainfall is below optimal ({rainfall:.1f} mm), supplemental irrigation may be required.")
    else:
        reasons.append(f"Excessive rainfall forecast ({rainfall:.1f} mm), danger of seed washing or waterlogging.")
        
    # Humidity checks
    if h_min <= humidity <= h_max:
        reasons.append(f"Humidity is suitable ({humidity:.1f}%, ideal: {h_min}-{h_max}%).")
    else:
        reasons.append(f"Humidity ({humidity:.1f}%) is outside the optimal range.")
        
    # Wind speed
    if wind_speed <= 15.0:
        reasons.append(f"Wind speed is calm ({wind_speed:.1f} km/h), favorable for sowing.")
    elif wind_speed <= 25.0:
        reasons.append(f"Moderate wind speed ({wind_speed:.1f} km/h), exercise caution.")
    else:
        reasons.append(f"High wind speed ({wind_speed:.1f} km/h) can disrupt planting and moisture retention.")

    # 2. ML Prediction (or Rule-Based fallback if model load failed)
    if model is not None:
        try:
            input_df = pd.DataFrame([{
                "temp": temp,
                "temp_min": t_min,
                "temp_max": t_max,
                "humidity": humidity,
                "humidity_min": h_min,
                "humidity_max": h_max,
                "rainfall": rainfall,
                "rainfall_min": r_min,
                "rainfall_max": r_max,
                "wind_speed": wind_speed,
                "season_match": season_match
            }])
            
            pred_class = int(model.predict(input_df)[0])
            probs = model.predict_proba(input_df)[0]
            confidence = float(np.max(probs) * 100)
        except Exception as pred_err:
            print(f"ML prediction error: {pred_err}. Falling back to rules.")
            pred_class, confidence = run_fallback_rules(temp, humidity, rainfall, wind_speed, t_min, t_max, r_min, r_max, h_min, h_max, season_match)
    else:
        pred_class, confidence = run_fallback_rules(temp, humidity, rainfall, wind_speed, t_min, t_max, r_min, r_max, h_min, h_max, season_match)

    status_map = {0: "Not Suitable", 1: "Moderately Suitable", 2: "Suitable"}
    suitability = status_map[pred_class]
    
    # Generate sowing suggestion days based on suitability
    sowing_date = "Select an alternative window"
    avoid_date = "Immediate Action Needed"
    
    if suitability == "Suitable":
        sowing_date = "Next 2 to 3 days (Optimal moisture/temp)"
        avoid_date = "None (Favorable conditions)"
    elif suitability == "Moderately Suitable":
        sowing_date = "Sow within 5 days, monitor forecasts"
        avoid_date = "Days with forecasted wind/rain extremes"
    else:
        sowing_date = "Postpone sowing, wait for weather normalization"
        avoid_date = "Immediate sowing is highly discouraged"
        
    return {
        "suitability": suitability,
        "confidence": round(confidence, 1),
        "reasons": reasons,
        "recommended_date": sowing_date,
        "avoid_date": avoid_date
    }

def run_fallback_rules(temp, humidity, rainfall, wind_speed, t_min, t_max, r_min, r_max, h_min, h_max, season_match):
    # Rule based classification
    if season_match == 0:
        return 0, 95.0
        
    violations = 0
    if not (t_min <= temp <= t_max): violations += 1
    if not (r_min <= rainfall <= r_max): violations += 1
    if not (h_min <= humidity <= h_max): violations += 1
    if wind_speed > 25.0: violations += 2
    elif wind_speed > 15.0: violations += 1
    
    if violations == 0:
        return 2, 90.0
    elif violations == 1:
        return 1, 75.0
    else:
        return 0, 85.0
