# devspace/backend/apis/plugins_api.py
from flask import Blueprint, request, jsonify
from database.db_session import SessionLocal # Changed from get_db_session
from services.plugin_management_service import PluginManagementService
# from services.user_service import UserService # If needed for user validation
import uuid

plugins_bp = Blueprint('plugins_api', __name__)
plugin_service = PluginManagementService()
# user_service = UserService()

# Mock: Replace with actual current_user from your auth system (e.g., Flask-Login, JWT)
def get_current_user_id_mock():
    # In a real app, this would come from the session or token
    user_id_from_header = request.headers.get("X-User-ID") # Example: for testing pass user ID in header
    if user_id_from_header:
        try:
            return int(user_id_from_header)
        except ValueError:
            pass # Fall through to default if header value is not int
    return str(uuid.UUID('00000000-0000-0000-0000-000000000001')) # Example fixed UUID for mock user 1

@plugins_bp.route('/', methods=['GET'])
def list_available_plugins_api():
    target_space_type = request.args.get('targetSpaceType')
    category = request.args.get('category')
    db = SessionLocal()
    try:
        plugins = plugin_service.list_available_plugins(db, target_space_type_str=target_space_type, category_filter=category)
        return jsonify(plugins)
    finally:
        db.close()

@plugins_bp.route('/installed', methods=['GET']) # Was /space/<int:space_id>/installed
def list_installed_plugins_for_current_user_api(): # Renamed function
    user_id_str = get_current_user_id_mock() 
    if not user_id_str: 
        return jsonify({"error": "Mock user ID not configured"}), 500 # Should not happen with mock

    db = SessionLocal()
    try:
        installed_plugins = plugin_service.get_installed_plugins_for_user(db, user_id_str)
        return jsonify(installed_plugins)
    except Exception as e:
        print(f"API ERROR list_installed_plugins_for_current_user: {e}")
        return jsonify({"error": "Failed to retrieve installed plugins for user"}), 500
    finally:
        db.close()


# Renamed endpoint to reflect user-centric action
@plugins_bp.route('/<string:plugin_id>/install', methods=['POST'])
def install_plugin_for_user_api(plugin_id):
    user_id = get_current_user_id_mock()
    if not user_id: return jsonify({"error": "Authentication required"}), 401
    
    # data = request.json
    # initial_config = data.get('initial_config') if data else None
    initial_config = None # For now, config is handled by a separate call

    db = SessionLocal()
    try:
        result = plugin_service.install_plugin_for_user(db, user_id, plugin_id, user_specific_config=initial_config)
        status_code = 201 if result.get("success") else (404 if "not found" in result.get("error","").lower() else 400)
        if "already installed" in result.get("error", "").lower(): status_code = 409 # Conflict
        return jsonify(result), status_code
    finally:
        db.close()

# Renamed endpoint
@plugins_bp.route('/<string:plugin_id>/uninstall', methods=['DELETE'])
def uninstall_plugin_for_user_api(plugin_id):
    user_id = get_current_user_id_mock()
    if not user_id: return jsonify({"error": "Authentication required"}), 401

    db = SessionLocal()
    try:
        result = plugin_service.uninstall_plugin_for_user(db, user_id, plugin_id)
        status_code = 200 if result.get("success") else (404 if "not installed" in result.get("error","").lower() or "not found" in result.get("error","").lower() else 400)
        return jsonify(result), status_code
    finally:
        db.close()

# This route is for user-specific GLOBAL config of a plugin
@plugins_bp.route('/<string:plugin_id>/config', methods=['GET', 'PUT'])
def manage_user_plugin_config_api(plugin_id):
    user_id = get_current_user_id_mock()
    if not user_id: return jsonify({"error": "Authentication required"}), 401

    db = SessionLocal()
    try:
        if request.method == 'GET':
            result = plugin_service.get_user_plugin_configuration(db, user_id, plugin_id)
        elif request.method == 'PUT':
            new_config = request.json
            if new_config is None: return jsonify({"error": "Missing configuration JSON"}), 400
            result = plugin_service.update_user_plugin_configuration(db, user_id, plugin_id, new_config)
        
        status_code = 200 if result.get("success") else (404 if "not found" in result.get("error","").lower() or "not installed" in result.get("error","").lower() else 400)
        return jsonify(result), status_code
    finally:
        db.close()

# Note: The old /space/:spaceId/plugins/:pluginId/status and /config routes are removed
# as plugin status (installed/not) and config are now user-centric.
# If you need per-space *overrides* of a user's plugin config, that's a more advanced feature
# and would require a new model and different API endpoints.


