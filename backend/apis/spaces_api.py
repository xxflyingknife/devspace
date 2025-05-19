from flask import Blueprint, request, jsonify
from services.space_service import SpaceService, SpaceServiceError
from database.models import SpaceTypeEnum # For serializing icon/color based on type

spaces_bp = Blueprint('spaces_api', __name__)
space_service = SpaceService() # Instantiate the service

def serialize_space(space_model_instance):
    """Helper to convert Space SQLAlchemy object to a dict for JSON response."""
    if not space_model_instance:
        return None
    
    # Basic serialization
    space_dict = {
        "id": str(space_model_instance.id), # Ensure ID is string if it's UUID, or keep as int
        "name": space_model_instance.name,
        "type": space_model_instance.type.value,
        "description": space_model_instance.description,
        "created_at": space_model_instance.created_at.isoformat() if space_model_instance.created_at else None,
        "updated_at": space_model_instance.updated_at.isoformat() if space_model_instance.updated_at else None,
        # Frontend expects 'date' and 'sourceCount'
        "date": space_model_instance.created_at.strftime("%Y年%m月%d日") if space_model_instance.created_at else "N/A",
        "sourceCount": 0, # Placeholder - implement actual count later based on related data
        "icon": '📦' if space_model_instance.type == SpaceTypeEnum.DEV else '🛠️', # Example based on type
        "color": '#E0F2F7' if space_model_instance.type == SpaceTypeEnum.DEV else '#E8F5E9' # Example
    }
    # Add dev/ops specific config details if needed for list view (usually not)
    # if space_model_instance.type == SpaceTypeEnum.DEV and space_model_instance.dev_config:
    #     space_dict['git_repo_url'] = space_model_instance.dev_config.git_repo_url
    # elif space_model_instance.type == SpaceTypeEnum.OPS and space_model_instance.ops_config:
    #    pass # Add ops specific quick info if needed

    return space_dict

def serialize_space_details(space_model_instance):
    """More detailed serialization for the space detail view."""
    if not space_model_instance:
        return None
    details = serialize_space(space_model_instance) # Start with common fields
    # Add specific config details
    if space_model_instance.type == SpaceTypeEnum.DEV and space_model_instance.dev_config:
        details['dev_config'] = {
            "git_repo_url": space_model_instance.dev_config.git_repo_url,
            "default_branch": space_model_instance.dev_config.default_branch,
            "k8s_environments_json": space_model_instance.dev_config.k8s_environments_json
        }
    elif space_model_instance.type == SpaceTypeEnum.OPS and space_model_instance.ops_config:
        details['ops_config'] = {
            "cmdb_config_json": space_model_instance.ops_config.cmdb_config_json,
            "k8s_cluster_configs_json": space_model_instance.ops_config.k8s_cluster_configs_json,
            "monitored_workloads_metadata_json": space_model_instance.ops_config.monitored_workloads_metadata_json,
            "aiops_skills_config_json": space_model_instance.ops_config.aiops_skills_config_json
        }
    return details


@spaces_bp.route('/', methods=['GET'])
def get_spaces_list_api():
    space_type_filter_str = request.args.get('type')
    try:
        spaces_from_db = space_service.get_all_spaces(space_type_filter_str=space_type_filter_str)
        return jsonify([serialize_space(s) for s in spaces_from_db])
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR in get_spaces_list: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while fetching spaces."}), 500

@spaces_bp.route('/', methods=['POST'])
def create_space_api():
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400
    
    try:
        # Required fields by frontend: name, type, description (optional)
        if not data.get("name") or not data.get("type"):
             raise SpaceServiceError("Missing required fields: name and type", 400)
        
        new_space = space_service.create_space(data)
        return jsonify(serialize_space(new_space)), 201
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR in create_space: {str(e)}")
        return jsonify({"error": "An unexpected error occurred while creating the space."}), 500


@spaces_bp.route('/<string:space_id>/details/', methods=['GET'])
def get_space_details_api(space_id): # Renamed function to avoid conflict
    space_details_data = space_service.get_space_by_id_with_details(space_id) # Call new service method
    if space_details_data:
        return jsonify(space_details_data)
    else:
        # Provide a more specific error if space exists but details are partial,
        # or just 404 if the space itself is not found by the service.
        return jsonify({"error": "Space not found or details incomplete"}), 404




@spaces_bp.route('/<string:space_id>', methods=['PUT'])
def update_space_api(space_id):
    data = request.json
    if not data or not data.get("name"): # Frontend only sends name for title edit for now
        return jsonify({"error": "Missing 'name' in request body for title update."}), 400
    
    try:
        # For now, only title update is implemented via this route by frontend
        updated_space = space_service.update_space_title(space_id, data["name"])
        return jsonify(serialize_space(updated_space))
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR in update_space for {space_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@spaces_bp.route('/<string:space_id>', methods=['DELETE'])
def delete_space_api(space_id):
    try:
        space_service.delete_space(space_id)
        return jsonify({"message": f"Space {space_id} deleted successfully"}), 200 # Or 204 No Content
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR in delete_space for {space_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@spaces_bp.route('/<string:space_id>/backend-settings', methods=['GET'])
def get_space_backend_settings_api(space_id):
    try:
        settings = space_service.get_backend_settings(space_id)
        return jsonify(settings)
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR getting backend_settings for {space_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred."}), 500

@spaces_bp.route('/<string:space_id>/backend-settings', methods=['POST', 'PUT'])
def set_space_backend_settings_api(space_id):
    data = request.json
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400
    try:
        space_service.set_backend_settings(space_id, data)
        # Return the updated settings or just a success message
        updated_settings = space_service.get_backend_settings(space_id)
        return jsonify({"message": "Backend settings updated successfully", "settings": updated_settings})
    except SpaceServiceError as e:
        return jsonify({"error": str(e)}), e.status_code
    except Exception as e:
        print(f"API ERROR setting backend_settings for {space_id}: {str(e)}")
        return jsonify({"error": "An unexpected error occurred."}), 500

