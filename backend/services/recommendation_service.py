from datetime import datetime
from bson import ObjectId
from database.db import db
from ai.model_loader import predict_suitability

def generate_crop_recommendation(farmer_id, crop_id, weather_data, lat=None, lon=None):
    """
    Triggers AI model prediction based on weather data, real ISRIC SoilGrids parameters,
    and crop requirements. Saves recommendation entry in MongoDB.
    """
    # 1. Fetch Crop and CropRequirements
    crop = db.crops.find_one({"_id": ObjectId(crop_id)})
    if not crop:
        raise ValueError("Crop not found")
        
    crop_reqs = db.crop_requirements.find_one({"crop_id": str(crop_id)})
    if not crop_reqs:
        raise ValueError("Crop requirements thresholds not configured")

    # 2. Fetch Soil properties and Weather Forecast
    soil_data = None
    forecast_list = None
    target_lat = lat
    target_lon = lon

    if (target_lat is None or target_lon is None) and farmer_id:
        farmer = db.users.find_one({"_id": ObjectId(farmer_id)})
        if farmer:
            if "latitude" in farmer and "longitude" in farmer:
                target_lat = farmer["latitude"]
                target_lon = farmer["longitude"]
            elif "coords" in farmer and isinstance(farmer["coords"], list) and len(farmer["coords"]) == 2:
                target_lon, target_lat = farmer["coords"]
            else:
                loc = db.farmer_locations.find_one({"farmer_id": ObjectId(farmer_id)})
                if loc and "location" in loc and "coordinates" in loc["location"]:
                    target_lon, target_lat = loc["location"]["coordinates"]

    if target_lat is not None and target_lon is not None:
        from services.soil_service import get_soil_properties
        from services.weather_service import get_weather_forecast
        try:
            soil_data = get_soil_properties(target_lat, target_lon)
        except Exception as e:
            print(f"Failed to retrieve SoilGrids properties: {e}")

        try:
            fc_res = get_weather_forecast(target_lat, target_lon)
            if isinstance(fc_res, dict) and "forecast" in fc_res:
                forecast_list = fc_res["forecast"]
        except Exception as e:
            print(f"Failed to retrieve weather forecast: {e}")

    # 3. Determine season match
    current_month = datetime.now().month
    current_season = "Kharif" if 6 <= current_month <= 9 else ("Rabi" if (10 <= current_month <= 12 or current_month == 1) else "Summer")
    
    crop_season = crop_reqs.get("season", "Kharif")
    season_match = 1 if current_season.lower() in crop_season.lower() else 0

    # 4. Call AI Sowing Model (with weather + soil + 5-day forecast)
    prediction = predict_suitability(
        weather_data=weather_data,
        crop_reqs=crop_reqs,
        season_match=season_match,
        soil_data=soil_data,
        forecast_list=forecast_list
    )
    
    # 5. Form recommendation record
    recommendation_record = {
        "farmer_id": ObjectId(farmer_id) if farmer_id else None,
        "crop_id": ObjectId(crop_id),
        "crop_name": crop["name"],
        "timestamp": datetime.now(),
        "input_weather": {
            "temp": weather_data.get("temp"),
            "humidity": weather_data.get("humidity"),
            "rainfall": weather_data.get("rainfall"),
            "wind_speed": weather_data.get("wind_speed"),
            "description": weather_data.get("description", "")
        },
        "input_soil": {
            "clay": soil_data.get("clay") if soil_data else "28.5%",
            "sand": soil_data.get("sand") if soil_data else "42.1%",
            "silt": soil_data.get("silt") if soil_data else "29.4%",
            "ph": soil_data.get("ph") if soil_data else 6.5,
            "organic_carbon": soil_data.get("organic_carbon") if soil_data else "12.4 g/kg",
            "nitrogen": soil_data.get("nitrogen") if soil_data else "1.25 g/kg",
            "bulk_density": soil_data.get("bulk_density") if soil_data else "1.35 g/cm3",
            "cec": soil_data.get("cec") if soil_data else "24.5 cmolc/kg",
            "source": soil_data.get("source") if soil_data else "ISRIC SoilGrids (Simulated)"
        },
        "suitability": prediction["suitability"],
        "confidence": prediction["confidence"],
        "reasons": prediction["reasons"],
        "recommended_date": prediction["recommended_date"],
        "avoid_date": prediction["avoid_date"]
    }
    
    # 6. Save to database
    db.recommendations.insert_one(recommendation_record)
    
    # 7. Push a notification for the farmer in the app
    if farmer_id:
        db.notifications.insert_one({
            "farmer_id": ObjectId(farmer_id),
            "message": f"Sowing Advisory for {crop['name']}: Sowing is {prediction['suitability']} ({prediction['confidence']}% confidence).",
            "read": False,
            "timestamp": datetime.now()
        })
        
    # Serialize ID for API output
    recommendation_record["_id"] = str(recommendation_record["_id"])
    if recommendation_record["farmer_id"]:
        recommendation_record["farmer_id"] = str(recommendation_record["farmer_id"])
    recommendation_record["crop_id"] = str(recommendation_record["crop_id"])
    
    return recommendation_record
