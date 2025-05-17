from flask import Blueprint, request, jsonify
# TODO: Import GitService, K8sService
from services.git_service import GitService
# from services.k8s_service import k8s_service
from services.space_service import SpaceService # Assuming you instantiate SpaceService


dev_space_bp = Blueprint('dev_space_api', __name__)
space_service = SpaceService() # Instantiate or use DI
git_service = GitService() # Instantiate or use DI




@dev_space_bp.route('/git/tree', methods=['GET'])
def get_git_file_tree_api():
    space_id = request.args.get('spaceId') # Changed from repoUrl to spaceId
    branch = request.args.get('branch')
    # force_refresh = request.args.get('refresh', 'false').lower() == 'true' # Not used directly by client yet

    if not space_id:
        return jsonify({"error": "Missing 'spaceId' query parameter"}), 400
    if not branch:
        return jsonify({"error": "Missing 'branch' query parameter"}), 400
    
    # The service now handles getting git_repo_url from space_id's config
    result = git_service.get_file_tree(space_id, branch, force_refresh=False) # Default no refresh

    if result.get("success"):
        return jsonify({"tree": result.get("tree", []), "from_cache": result.get("from_cache", False)})
    else:
        return jsonify({"error": result.get("error", "Failed to retrieve file tree"), "details": result.get("details")}), 500

@dev_space_bp.route('/git/refresh-tree', methods=['POST']) # Changed to POST as it's an action
def refresh_git_file_tree_api():
    data = request.json
    space_id = data.get('spaceId')
    branch = data.get('branch')

    if not space_id:
        return jsonify({"error": "Missing 'spaceId' in request body"}), 400
    if not branch:
        return jsonify({"error": "Missing 'branch' in request body"}), 400

    result = git_service.get_file_tree(space_id, branch, force_refresh=True)

    if result.get("success"):
        return jsonify({"message": "File tree refreshed successfully.", "tree": result.get("tree", [])})
    else:
        return jsonify({"error": result.get("error", "Failed to refresh file tree"), "details": result.get("details")}), 500



@dev_space_bp.route('/git/branches', methods=['GET'])
def get_git_branches_api(): # Renamed
    git_repo_url = request.args.get('repoUrl') # Expecting repoUrl from frontend
    if not git_repo_url:
        return jsonify({"error": "Missing 'repoUrl' query parameter"}), 400

    result = git_service.list_branches(git_repo_url)

    if result.get("success"):
        return jsonify({"branches": result.get("branches", [])})
    else:
        return jsonify({"error": result.get("error", "Failed to retrieve branches")}), 500


@dev_space_bp.route('/<string:space_id>/git-config', methods=['POST'])
def configure_git_repo(space_id):
    data = request.json
    new_git_repo_url = data.get('git_repo_url')

    if not new_git_repo_url:
        return jsonify({"error": "Missing 'git_repo_url' in request body"}), 400

    result = space_service.update_dev_space_git_config(space_id, new_git_repo_url)

    if result.get("success"):
        return jsonify(result), 200
    else:
        # Distinguish between client error (e.g., invalid URL) and server error
        status_code = 400 if "Invalid" in result.get("error", "") else 500
        if "Space not found" in result.get("error", ""): status_code = 404
        return jsonify(result), status_code


@dev_space_bp.route('/k8s/environments/<string:app_id>/deployments', methods=['GET'])
def get_k8s_deployments_for_dev_space(app_id):
    # This app_id should map to a DevSpaceConfig which has k8s_environments_json
    # TODO:
    # dev_space_config = space_service.get_dev_config_for_app(app_id)
    # if not dev_space_config or not dev_space_config.k8s_environments_json:
    #     return jsonify({"error": "K8s environment configuration not found for app"}), 404
    # deployments_by_env = k8s_service.get_deployments_for_environments(dev_space_config.k8s_environments_json)
    # return jsonify(deployments_by_env)
    mock_deployments = {
        "test": [{"id": "dep-test-1", "name": f"{app_id}-backend-test", "status": "Running", "replicas": "1/1"}],
        "grayscale": [],
        "production": [{"id": "dep-prod-1", "name": f"{app_id}-frontend-prod", "status": "Running", "replicas": "3/3"}]
    }
    return jsonify(mock_deployments)

# POST /git/config/:repoId and POST /k8s/config/:appId
# could be part of the general POST/PUT /api/spaces/:spaceId/backend-settings
# if DevSpaceConfig is updated there. Or kept separate if preferred.

