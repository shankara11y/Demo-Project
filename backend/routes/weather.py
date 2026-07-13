from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.weather_service import get_current_weather, get_weather_forecast

weather_bp = Blueprint("weather", __name__)

@weather_bp.route("/weather/current", methods=["GET"])
@jwt_required()
def current_weather():
    lat_str = request.args.get("lat")
    lon_str = request.args.get("lon")

    if not lat_str or not lon_str:
        return jsonify({"error": "Latitude (lat) and longitude (lon) parameters are required"}), 400

    try:
        lat = float(lat_str)
        lon = float(lon_str)
    except ValueError:
        return jsonify({"error": "Invalid latitude or longitude format"}), 400

    weather = get_current_weather(lat, lon)
    return jsonify(weather), 200

@weather_bp.route("/weather/forecast", methods=["GET"])
@jwt_required()
def weather_forecast():
    lat_str = request.args.get("lat")
    lon_str = request.args.get("lon")

    if not lat_str or not lon_str:
        return jsonify({"error": "Latitude (lat) and longitude (lon) parameters are required"}), 400

    try:
        lat = float(lat_str)
        lon = float(lon_str)
    except ValueError:
        return jsonify({"error": "Invalid latitude or longitude format"}), 400

    forecast = get_weather_forecast(lat, lon)
    return jsonify(forecast), 200
