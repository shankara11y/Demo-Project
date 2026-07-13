import requests
import random
import time
from datetime import datetime, timedelta
from config import Config

USER_AGENT = "AgriCast-Advisor-CollegeDemo/1.0 (contact: admin@agricast.gov.in)"

def geocode_location(village, district, state):
    """
    Geocode village, district, state details into Latitude and Longitude using Nominatim OpenStreetMap.
    """
    query = f"{village}, {district}, {state}, India"
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": USER_AGENT}
    params = {
        "q": query,
        "format": "json",
        "limit": 1
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200 and len(response.json()) > 0:
            data = response.json()[0]
            return {
                "lat": float(data["lat"]),
                "lon": float(data["lon"]),
                "display_name": data["display_name"]
            }
    except Exception as e:
        print(f"Geocoding error: {e}")
        
    # Fallback coordinates (Central/Southern India region default)
    # Let's add slight noise based on hash value of village name to make it unique
    seed = sum(ord(c) for c in village)
    random.seed(seed)
    mock_lat = 19.0760 + random.uniform(-1.5, 1.5) # Around Maharashtra / South Central
    mock_lon = 72.8777 + random.uniform(-1.5, 1.5)
    return {
        "lat": round(mock_lat, 4),
        "lon": round(mock_lon, 4),
        "display_name": f"{village}, {district}, {state}, India (Simulated Coordinates)"
    }

def get_current_weather(lat, lon):
    """
    Get current weather for coordinates. Fallback to mock weather if OpenWeather API key is empty.
    """
    api_key = Config.OPENWEATHER_API_KEY
    if not api_key:
        return get_simulated_current_weather(lat, lon)
        
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                "temp": data["main"]["temp"],
                "humidity": data["main"]["humidity"],
                "rainfall": data.get("rain", {}).get("1h", 0.0) or data.get("rain", {}).get("3h", 0.0) / 3.0 if "rain" in data else 0.0,
                "wind_speed": data["wind"]["speed"] * 3.6, # Convert m/s to km/h
                "description": data["weather"][0]["description"].capitalize(),
                "uv_index": round(random.uniform(1.0, 9.0), 1), # OWM current doesn't include UV in free, mock it
                "icon": data["weather"][0]["icon"],
                "status": "success",
                "simulated": False
            }
    except Exception as e:
        print(f"Weather API error: {e}")
        
    return get_simulated_current_weather(lat, lon)

def get_weather_forecast(lat, lon):
    """
    Get 5-day weather forecast (broken into daily summaries). Fallbacks to simulated forecast.
    """
    api_key = Config.OPENWEATHER_API_KEY
    if not api_key:
        return get_simulated_forecast(lat, lon)
        
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": api_key,
        "units": "metric"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            daily_forecasts = parse_owm_forecast(data["list"])
            return {
                "forecast": daily_forecasts,
                "status": "success",
                "simulated": False
            }
    except Exception as e:
        print(f"Forecast API error: {e}")
        
    return get_simulated_forecast(lat, lon)

def parse_owm_forecast(forecast_list):
    """
    Groups OWM 3-hour lists into 5 daily summaries.
    """
    days = {}
    for item in forecast_list:
        dt = datetime.fromtimestamp(item["dt"])
        day_str = dt.strftime("%Y-%m-%d")
        
        if day_str not in days:
            days[day_str] = {
                "temps": [],
                "humidities": [],
                "winds": [],
                "rains": 0.0,
                "descriptions": [],
                "icons": []
            }
            
        days[day_str]["temps"].append(item["main"]["temp"])
        days[day_str]["humidities"].append(item["main"]["humidity"])
        days[day_str]["winds"].append(item["wind"]["speed"] * 3.6)
        if "rain" in item and "3h" in item["rain"]:
            days[day_str]["rains"] += item["rain"]["3h"]
        days[day_str]["descriptions"].append(item["weather"][0]["description"])
        days[day_str]["icons"].append(item["weather"][0]["icon"])

    results = []
    # Sort and take top 5 days
    for day_str in sorted(days.keys())[:5]:
        d = days[day_str]
        # Find most common description and icon
        desc = max(set(d["descriptions"]), key=d["descriptions"].count).capitalize()
        icon = max(set(d["icons"]), key=d["icons"].count)
        
        results.append({
            "date": day_str,
            "day_name": datetime.strptime(day_str, "%Y-%m-%d").strftime("%A"),
            "temp": round(sum(d["temps"]) / len(d["temps"]), 1),
            "temp_max": round(max(d["temps"]), 1),
            "temp_min": round(min(d["temps"]), 1),
            "humidity": round(sum(d["humidities"]) / len(d["humidities"]), 1),
            "wind_speed": round(sum(d["winds"]) / len(d["winds"]), 1),
            "rainfall": round(d["rains"], 1),
            "description": desc,
            "icon": icon,
            "uv_index": round(random.uniform(2.0, 8.5), 1)
        })
    return results

# --- SIMULATOR FUNCTIONS ---
def get_simulated_current_weather(lat, lon):
    # Deterministic seed based on latitude and longitude to keep simulation consistent
    seed = int((lat + 90) * 1000 + (lon + 180) * 10)
    random.seed(seed + int(time.time() / 86400)) # Changes daily
    
    month = datetime.now().month
    # Indian seasons: Monsoon (June-Sep), Winter (Oct-Jan), Summer (Feb-May)
    if 6 <= month <= 9: # Monsoon / Kharif
        temp = random.uniform(25.0, 32.0)
        humidity = random.uniform(70.0, 95.0)
        rainfall = random.choice([0.0, 0.0, 5.0, 15.0, 45.0, 80.0]) # frequent heavy rain
        wind_speed = random.uniform(10.0, 25.0)
        desc = "Heavy rainfall" if rainfall > 20 else ("Light shower" if rainfall > 0 else "Overcast")
        icon = "09d" if rainfall > 0 else "04d"
    elif 10 <= month <= 1 or month == 1: # Winter / Rabi
        temp = random.uniform(15.0, 24.0)
        humidity = random.uniform(40.0, 60.0)
        rainfall = random.choice([0.0, 0.0, 0.0, 0.0, 2.0]) # rarely rains
        wind_speed = random.uniform(5.0, 12.0)
        desc = "Clear sky" if rainfall == 0 else "Drizzle"
        icon = "01d" if rainfall == 0 else "10d"
    else: # Summer / Pre-monsoon
        temp = random.uniform(32.0, 42.0)
        humidity = random.uniform(25.0, 45.0)
        rainfall = random.choice([0.0, 0.0, 0.0, 10.0]) # heatwave or dust storms
        wind_speed = random.uniform(12.0, 30.0)
        desc = "Extreme heatwave" if temp > 40 else "Sunny and dry"
        icon = "01d"

    return {
        "temp": round(temp, 1),
        "humidity": round(humidity, 1),
        "rainfall": round(rainfall, 1),
        "wind_speed": round(wind_speed, 1),
        "description": desc,
        "uv_index": round(random.uniform(6.0, 10.0) if temp > 30 else random.uniform(3.0, 6.0), 1),
        "icon": icon,
        "status": "success",
        "simulated": True
    }

def get_simulated_forecast(lat, lon):
    forecast = []
    base_date = datetime.now()
    
    # We generate a 5 day simulation
    for i in range(5):
        date_offset = base_date + timedelta(days=i)
        date_str = date_offset.strftime("%Y-%m-%d")
        
        # Use offset in seed to create dynamic daily weather pattern
        day_seed = int((lat + 90) * 1000 + (lon + 180) * 10) + i + int(time.time() / 86400)
        random.seed(day_seed)
        
        month = date_offset.month
        # Sowing conditions simulation
        if 6 <= month <= 9: # Monsoon
            temp_max = random.uniform(28.0, 34.0)
            temp_min = temp_max - random.uniform(4.0, 7.0)
            humidity = random.uniform(70.0, 90.0)
            wind_speed = random.uniform(10.0, 22.0)
            # Make day 2 and day 3 rainy for demonstration
            rainfall = random.uniform(10.0, 65.0) if i in [1, 2] else random.choice([0.0, 5.0])
            desc = "Thunderstorm" if rainfall > 30 else ("Showers" if rainfall > 0 else "Mostly cloudy")
            icon = "11d" if rainfall > 30 else ("09d" if rainfall > 0 else "03d")
        elif 10 <= month <= 1 or month == 1: # Winter
            temp_max = random.uniform(22.0, 27.0)
            temp_min = temp_max - random.uniform(8.0, 12.0)
            humidity = random.uniform(45.0, 65.0)
            wind_speed = random.uniform(4.0, 10.0)
            rainfall = 0.0
            desc = "Clear sky"
            icon = "01d"
        else: # Summer
            temp_max = random.uniform(35.0, 43.0)
            temp_min = temp_max - random.uniform(8.0, 12.0)
            humidity = random.uniform(25.0, 45.0)
            wind_speed = random.uniform(12.0, 28.0)
            rainfall = 0.0
            desc = "Hot and dry"
            icon = "01d"

        forecast.append({
            "date": date_str,
            "day_name": date_offset.strftime("%A"),
            "temp": round((temp_max + temp_min) / 2, 1),
            "temp_max": round(temp_max, 1),
            "temp_min": round(temp_min, 1),
            "humidity": round(humidity, 1),
            "wind_speed": round(wind_speed, 1),
            "rainfall": round(rainfall, 1),
            "description": desc,
            "icon": icon,
            "uv_index": round(random.uniform(5.0, 10.0), 1)
        })
    return {
        "forecast": forecast,
        "status": "success",
        "simulated": True
    }

def get_sentinel2_soil_data(lat, lon):
    """
    Simulates fetching NDWI and NDVI from ISRO Sentinel-2 imagery to estimate soil moisture.
    """
    # Create a deterministic seed based on coordinate hashes to keep results stable for the same village
    coord_seed = int((float(lat) + 90.0) * 1000.0 + (float(lon) + 180.0) * 10.0)
    random.seed(coord_seed)
    
    ndwi = round(random.uniform(0.12, 0.45), 2)
    ndvi = round(random.uniform(0.25, 0.68), 2)
    
    # Estimate soil moisture percentage based on NDWI index mapping (0.12 - 0.45 maps to 25% - 85%)
    moisture_pct = int(((ndwi - 0.12) / (0.45 - 0.12)) * 60.0 + 25.0)
    
    soil_types = ["Laterite", "Black Cotton (Regur)", "Red Sandy", "Alluvial"]
    soil_type = soil_types[coord_seed % len(soil_types)]
    
    fertilities = ["Low", "Medium", "High"]
    fertility = fertilities[coord_seed % len(fertilities)]
    
    # Sentinel-2 passes over India approximately every 5 days
    last_pass_time = datetime.now() - timedelta(days=(coord_seed % 5), hours=(coord_seed % 8))
    
    return {
        "soil_moisture_val": moisture_pct,
        "soil_moisture_label": f"{moisture_pct}% ({'High' if moisture_pct > 65 else ('Optimal' if moisture_pct > 40 else 'Low')})",
        "soil_type": soil_type,
        "fertility": fertility,
        "satellite": "Sentinel-2",
        "ndwi": ndwi,
        "ndvi": ndvi,
        "last_pass": last_pass_time.strftime("%d %b %Y %H:%M IST")
    }

def get_nasa_power_soil_data(lat, lon):
    """
    Fetches historical/live surface and root zone soil moisture data
    from the NASA POWER Agro-climatology API for the given coordinates.
    """
    # NASA POWER has a ~3-4 day data lag, query 4 days ago for reliability
    date_str = (datetime.now() - timedelta(days=4)).strftime("%Y%m%d")
    
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "GWETTOP,GWETROOT,TS",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": date_str,
        "end": date_str,
        "format": "JSON"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            properties = data.get("properties", {})
            parameter_data = properties.get("parameter", {})
            
            gwettop_dict = parameter_data.get("GWETTOP", {})
            gwetroot_dict = parameter_data.get("GWETROOT", {})
            ts_dict = parameter_data.get("TS", {})
            
            gwettop = list(gwettop_dict.values())[0] if gwettop_dict else 0.45
            gwetroot = list(gwetroot_dict.values())[0] if gwetroot_dict else 0.48
            ts = list(ts_dict.values())[0] if ts_dict else 27.0
            
            if gwettop == -999 or gwettop is None: gwettop = 0.45
            if gwetroot == -999 or gwetroot is None: gwetroot = 0.48
            if ts == -999 or ts is None: ts = 27.0
            
            moisture_pct = int(gwettop * 100)
            root_moisture_pct = int(gwetroot * 100)
            
            # Map index coordinate seed to soil types and fertility
            coord_seed = int((float(lat) + 90.0) * 1000.0 + (float(lon) + 180.0) * 10.0)
            soil_types = ["Laterite", "Black Cotton (Regur)", "Red Sandy", "Alluvial"]
            soil_type = soil_types[coord_seed % len(soil_types)]
            
            fertilities = ["Low", "Medium", "High"]
            fertility = fertilities[coord_seed % len(fertilities)]
            
            return {
                "soil_moisture_val": moisture_pct,
                "soil_moisture_label": f"{moisture_pct}% ({'High' if moisture_pct > 65 else ('Optimal' if moisture_pct > 40 else 'Low')})",
                "root_zone_moisture": f"{root_moisture_pct}%",
                "soil_temp": f"{round(ts, 1)}°C",
                "soil_type": soil_type,
                "fertility": fertility,
                "source": "NASA POWER (Real)",
                "simulated": False
            }
    except Exception as e:
        print(f"NASA POWER API error: {e}")
        
    return None
