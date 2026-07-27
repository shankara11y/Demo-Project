from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import Config
from services.scheduler import start_scheduler

# Import routes
from routes.auth import auth_bp
from routes.profile import profile_bp
from routes.weather import weather_bp
from routes.recommendations import recommendations_bp
from routes.crops import crops_bp
from routes.alerts import alerts_bp
from routes.sms import sms_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend interactions
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Setup JWT Manager
    jwt = JWTManager(app)

    # Custom JWT Error Handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Signature has expired", "code": "token_expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token signature", "code": "token_invalid"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization token is missing", "code": "token_missing"}), 401

    # Setup Rate Limiter with generous limits for seamless development & demo presentations
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["10000 per day", "2000 per hour"],
        storage_uri="memory://"
    )

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(weather_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(crops_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(sms_bp)
    app.register_blueprint(admin_bp)

    # Root route for quick service health verification
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "service": "AgriCast Hyperlocal AI Weather Advisory System API",
            "status": "online",
            "version": "1.0.0"
        }), 200

    # Start background scheduler safely (handles both Flask debug reloader and Gunicorn WSGI production mode)
    import os
    run_main = os.environ.get("WERKZEUG_RUN_MAIN")
    if run_main == "true" or (not app.debug and run_main is None):
        try:
            start_scheduler()
        except Exception as e:
            app.logger.error(f"Failed to start APScheduler: {e}")
    else:
        print("[SCHEDULER] Skipping scheduler start in supervisor process.", flush=True)

# Create WSGI application instance at top-level module scope for Gunicorn
app = create_app()

if __name__ == "__main__":
    print(f"AgriCast API running on http://{Config.HOST}:{Config.PORT}")
    app.run(host=Config.HOST, port=Config.PORT, debug=True)
