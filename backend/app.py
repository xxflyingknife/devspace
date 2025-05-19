import os # <--- ADD THIS LINE
from flask import Flask, jsonify
from flask_cors import CORS

from config import config as app_config # Use a distinct name
from database.db_session import init_db_tables # Correct import path
from apis.plugins_api import plugins_bp


# --- Create Flask App ---
app = Flask(__name__)
app.config.from_object(app_config) # Load config from config.py object



# --- CORS Configuration ---
# Allow requests from your frontend's origin.
# For development, '*' is okay, but restrict in production.
#CORS(app, resources={r"/api/*": {"origins": app_config.DEBUG and "*" or "YOUR_PRODUCTION_FRONTEND_URL"}})

DEVELOPMENT_ORIGINS = "http://localhost:3000" # Your React app's port
# If you have multiple dev origins: DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
PRODUCTION_ORIGINS = "YOUR_PRODUCTION_FRONTEND_URL_HERE" # Replace later

# Select origins based on debug mode
# For development, it's often easier to allow any origin with "*"
# but explicitly listing is safer if you prefer.
cors_origins = "*" if app_config.DEBUG else PRODUCTION_ORIGINS
if app_config.DEBUG and cors_origins == "*":
    print(f"WARNING: CORS allowing all origins because FLASK_DEBUG is True.")
elif app_config.DEBUG:
    cors_origins = DEVELOPMENT_ORIGINS # Or extend a list
    print(f"INFO: CORS allowing development origin: {cors_origins}")


CORS(app, resources={r"/api/*": {"origins": cors_origins }})
# ...



# --- Database Initialization ---
# This should be called once when the app starts to create tables.
# In a production setup with Flask, you might use Flask-Migrate (Alembic)
# and run migrations separately. For now, we create tables directly.
with app.app_context():
    # Important: Import all your models from database.models here BEFORE calling init_db_tables
    # so that SQLAlchemy's Base metadata knows about them.
    from database import models # This will make models.py execute and register its classes with Base
    init_db_tables()
    print("INFO: Database initialization process completed from app.py.")


# --- Import and Register API Blueprints/Routers ---
# We will create these files in the next script.
# For Flask Blueprints:
from apis.spaces_api import spaces_bp
from apis.chat_api import chat_bp
from apis.dev_space_api import dev_space_bp
from apis.ops_space_api import ops_space_bp
from apis.sessions_api import sessions_bp # <--- IMPORT NEW BLUEPRINT

app.register_blueprint(plugins_bp, url_prefix='/api/plugins')
app.register_blueprint(spaces_bp, url_prefix='/api/spaces')
app.register_blueprint(chat_bp, url_prefix='/api/chat') # Or just /api if chat is the main interaction
app.register_blueprint(dev_space_bp, url_prefix='/api/dev')
app.register_blueprint(ops_space_bp, url_prefix='/api/ops')
app.register_blueprint(sessions_bp, url_prefix='/api/sessions') # <--- REGISTER NEW BLUEPRINT


# --- Basic Routes ---
@app.route('/')
def index():
    return jsonify({"message": "Vibe DevOps Platform Backend is running!", "version": "0.1.0"})

@app.route('/api/health')
def health_check():
    # TODO: Add database connectivity check if desired
    return jsonify({"status": "healthy"})

# --- Error Handlers (Optional but good practice) ---
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Not Found", "message": str(error)}), 404

@app.errorhandler(500)
def internal_error(error):
    # Log the error properly here
    app.logger.error(f"Internal Server Error: {error}")
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500


# --- Run the App (for development) ---
if __name__ == '__main__':
    # Use a proper WSGI server like Gunicorn in production.
    # Example: gunicorn -w 4 -b 0.0.0.0:5001 app:app
    # The port 5001 is an example to avoid conflict with frontend on 3000 or old backend on 5000
    port = int(os.environ.get('FLASK_RUN_PORT', 5001))
    debug_mode = app.config.get("DEBUG", False)
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

