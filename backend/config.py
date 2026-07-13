import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "agricast-super-secret-key-12345")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "agricast-jwt-secret-key-54321")
    
    # MongoDB Atlas or Local connection URI
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/agricast")
    
    # API Keys & Credentials
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")  # Empty triggers mock mode
    MSG91_AUTH_KEY = os.getenv("MSG91_AUTH_KEY", "")          # Empty triggers mock mode
    MSG91_SENDER_ID = os.getenv("MSG91_SENDER_ID", "AGRCST")
    MSG91_ROUTE = os.getenv("MSG91_ROUTE", "4")                # Transactional route
    MSG91_TEMPLATE_ID = os.getenv("MSG91_TEMPLATE_ID", "")    # DLT Template ID
    
    # Default Admin Credentials
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@agricast.gov.in")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
    
    # Port / Host
    PORT = int(os.getenv("PORT", 5001))
    HOST = os.getenv("HOST", "0.0.0.0")
