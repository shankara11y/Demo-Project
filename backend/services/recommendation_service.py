from datetime import datetime
from bson import ObjectId
from database.db import db
from ai.model_loader import predict_suitability

def generate_crop_recommendation(farmer_id, crop_id, weather_data):
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

    # 2. Fetch Soil properties from real SoilGrids API
    soil_data = None
    if farmer_id:
        farmer = db.users.find_one({"_id": ObjectId(farmer_id)})
        if farmer and "latitude" in farmer and "longitude" in farmer:
            from services.soil_service import get_soil_properties
            try:
                soil_data = get_soil_properties(farmer["latitude"], farmer["longitude"])
            except Exception as e:
                print(f"Failed to retrieve SoilGrids properties: {e}")

    # 3. Determine season match
    current_month = datetime.now().month
    current_season = "Kharif" if 6 <= current_month <= 9 else ("Rabi" if (10 <= current_month <= 12 or current_month == 1) else "Summer")
    
    crop_season = crop_reqs.get("season", "Kharif")
    season_match = 1 if current_season.lower() in crop_season.lower() else 0

    # 4. Call AI Sowing Model (with weather + soil)
    prediction = predict_suitability(
        weather_data=weather_data,
        crop_reqs=crop_reqs,
        season_match=season_match,
        soil_data=soil_data
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
