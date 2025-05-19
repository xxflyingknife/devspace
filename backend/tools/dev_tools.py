# devspace/backend/tools/dev_tools.py
from langchain_core.tools import tool
import json

from services.git_service import GitService
from services.k8s_service import K8sService
from services.space_service import SpaceService
from services.mcp_service import MCPService # <--- IMPORT MCPService

git_service_instance = GitService()
k8s_service_instance = K8sService()
mcp_service_instance = MCPService() # Instantiate globally or per call
space_service_instance = SpaceService()

# --- Helper Functions (keep _get_git_url_from_space_id and _get_k8s_env_config as before) ---
def _get_git_url_from_space_id(space_id: str) -> str:
    if not space_id: return None
    dev_config = space_service_instance.get_dev_config_object(space_id)
    return dev_config.git_repo_url if dev_config and hasattr(dev_config, 'git_repo_url') else (dev_config.get('git_repo_url') if isinstance(dev_config, dict) else None)

def _get_k8s_env_config_for_space(space_id: str, environment_key: str) -> dict : # Renamed for clarity
    if not space_id: return None
    dev_config = space_service_instance.get_dev_config_object(space_id) # Assumes this returns the ORM object or a dict
    
    k8s_envs_json_str = None
    if hasattr(dev_config, 'k8s_environments_json'):
        k8s_envs_json_str = dev_config.k8s_environments_json
    elif isinstance(dev_config, dict):
        k8s_envs_json_str = dev_config.get('k8s_environments_json')

    if k8s_envs_json_str:
        try:
            envs = json.loads(k8s_envs_json_str)
            return envs.get(environment_key)
        except json.JSONDecodeError:
            print(f"DEV_TOOLS: Error decoding k8s_environments_json for space {space_id}")
            return None
    return None

@tool
def git_commit_and_push_via_mcp(space_id: str, branch: str, commit_message: str) -> str:
    """
    Requests the MCP (Master Control Program) server to stage all changes, commit them with the
    provided 'commit_message', and push to the specified 'branch' of the Git repository
    configured for the 'space_id'. This is the preferred and secure way to perform Git write operations.
    Returns a job ID from the MCP server or a success/error message.
    """
    if not space_id: return "Error: space_id is required."
    if not branch: return "Error: branch is required."
    if not commit_message: return "Error: commit_message is required."

    git_repo_url = _get_git_url_from_space_id(space_id)
    if not git_repo_url:
        return f"Error: No Git repository URL configured for space ID '{space_id}'."

    mcp = MCPService(space_id=space_id) # Create instance with space context if needed
    result = mcp.trigger_git_push_via_mcp(
        git_repo_url=git_repo_url,
        branch=branch,
        commit_message=commit_message
    )
    
    if result.get("success"):
        return f"MCP accepted Git push request. Job/Data: {json.dumps(result.get('data'))}"
    return f"Error requesting Git push via MCP: {result.get('error')}. Details: {result.get('details','')}"


# --- Git Tools (as before, with read_file_content added) ---
@tool
def get_repository_file_tree(space_id: str, branch: str) -> str:
    """
    Fetches the file and directory tree structure for the specified branch of the Git repository
    configured for the given 'space_id'.
    The 'space_id' is the unique identifier for the development space.
    The 'branch' is the name of the git branch to fetch the tree from (e.g., 'main', 'develop').
    Returns the tree structure as a JSON string, or an error message if the operation fails.
    The JSON will represent a list of nodes, where each node has 'id', 'name', 'type' ('file' or 'folder'),
    and 'children' (for folders, a list of child nodes).
    """
    if not space_id or not branch: return "Error: space_id and branch are required."
    result = git_service_instance.get_file_tree(space_id_str=space_id, branch=branch, force_refresh=False)
    if result.get("success"): return json.dumps({"tree": result.get("tree", []), "from_cache": result.get("from_cache", False)})
    return f"Error fetching file tree: {result.get('error', 'Unknown error')}. Details: {result.get('details','')}"

@tool
def list_repository_branches(space_id: str) -> str:
    """
    Lists all branches for the Git repository configured for the given 'space_id'.
    The 'space_id' is the unique identifier for the development space.
    Returns a list of branch names as a JSON string, or an error message if it fails.
    Example return: '["main", "develop", "feature/login"]'
    """
    if not space_id: return "Error: space_id is required."
    git_repo_url = _get_git_url_from_space_id(space_id)
    if not git_repo_url: return f"Error: No Git repository URL configured for space ID '{space_id}'."
    result = git_service_instance.list_branches(git_repo_url=git_repo_url)
    if result.get("success"): return json.dumps(result.get("branches", []))
    return f"Error listing branches: {result.get('error', 'Unknown error')}. Details: {result.get('stderr','')}"

@tool
def read_file_content_from_repo(space_id: str, branch: str, file_path: str) -> str:
    """
    Reads the content of a specific file from the Git repository associated with the 'space_id',
    on the given 'branch', at the specified 'file_path' (relative to the repo root).
    Returns the file content as a string or an error message.
    """
    if not all([space_id, branch, file_path]):
        return "Error: space_id, branch, and file_path are required."
    git_repo_url = _get_git_url_from_space_id(space_id)
    if not git_repo_url:
        return f"Error: No Git repository URL configured for space ID '{space_id}'."

    # GitService needs a method like get_file_content(git_repo_url, branch, file_path)
    # This method would likely use a temporary shallow clone or 'git show <branch>:<file_path>'
    # result = git_service_instance.get_file_content(git_repo_url, branch, file_path)
    # if result.get("success"):
    #     return result.get("content", "")
    # return f"Error reading file '{file_path}': {result.get('error', 'Unknown error')}"
    print(f"TOOL: read_file_content_from_repo called for space '{space_id}', branch '{branch}', path '{file_path}'")
    return f"Mock Content for '{file_path}' in branch '{branch}' of repo for space '{space_id}':\n\n# This is mock content.\nprint('Hello from {file_path}')"

@tool
def git_pull_changes(space_id: str, branch: str) -> str:
    """
    Pulls the latest changes from the remote 'origin' for the specified 'branch'
    of the Git repository linked to the 'space_id'.
    This implies the backend manages a local clone or uses an MCP server.
    Returns a success or error message detailing the outcome.
    """
    print(f"TOOL: git_pull_changes for space '{space_id}', branch '{branch}'")
    # result = git_service_instance.pull_changes(space_id, branch)
    # if result.get("success"): return result.get("message", "Pull successful.")
    # return f"Error pulling changes: {result.get('error')}"
    return f"Mock Success: 'git pull origin {branch}' for space '{space_id}' completed. Output: Already up to date."


@tool
def git_commit_and_push(space_id: str, branch: str, commit_message: str, stage_all_changes: bool = True, force_push: bool = False) -> str:
    """
    Stages changes, commits them with 'commit_message', and pushes to 'branch' for 'space_id'.
    If 'stage_all_changes' is true (default), it stages all modified/new files.
    'force_push' enables a force push. Use with extreme caution.
    Returns a success or error message. This is a SENSITIVE operation.
    """
    print(f"TOOL: git_commit_and_push for space '{space_id}', branch '{branch}', msg '{commit_message}'")
    # result = git_service_instance.push_changes(...)
    # if result.get("success"): return result.get("stdout", "Pushed successfully.")
    # return f"Error pushing: {result.get('error')}"
    return f"Mock Success: Git push for space '{space_id}' on branch '{branch}' with message '{commit_message}' executed."


# --- Kubernetes Tools specific to Dev Space workflow (often environment-specific) ---
@tool
def k8s_list_resources_in_dev_env(space_id: str, environment_key: str, resource_type: str, namespace: str = None, label_selector: str = None) -> str:
    """
    Lists Kubernetes resources (e.g., 'pods', 'deployments', 'services') for a DEV space's specific environment.
    'space_id' identifies the dev space.
    'environment_key' specifies the target environment ('test', 'grayscale', 'production').
    'namespace' is the K8s namespace. If not provided, uses the default for the environment from space config.
    'label_selector' (optional) can filter resources, e.g., 'app=my-app,tier=frontend'.
    Returns a JSON string of resources or an error message.
    """
    if not all([space_id, environment_key, resource_type]):
        return "Error: space_id, environment_key, and resource_type are required."
    
    env_config = _get_k8s_env_config_for_space(space_id, environment_key)
    if not env_config: return f"Error: K8s config for env '{environment_key}' not found in space '{space_id}'."
    
    effective_namespace = namespace or env_config.get("namespace") 
    if not effective_namespace: return f"Error: Namespace must be provided or configured for env '{environment_key}'."

    # K8sService.list_resources should now accept label_selector
    # result = k8s_service_instance.list_resources(space_id, environment_key, resource_type, effective_namespace, label_selector)
    # For now, simulate based on prior mock from K8sService
    print(f"TOOL: k8s_list_resources_in_dev_env: space='{space_id}', env='{environment_key}', type='{resource_type}', ns='{effective_namespace}', labels='{label_selector}'")
    mock_items = []
    if resource_type == "pods": mock_items = [{"name": f"{space_id}-pod1", "status": "Running"}, {"name": f"{space_id}-pod2", "status": "Pending"}]
    elif resource_type == "deployments": mock_items = [{"name": f"{space_id}-app-deploy", "replicas": 2, "ready": 2}]
    return json.dumps({"resources": mock_items}) if mock_items else f"No {resource_type} found with given criteria (mock)."


@tool
def k8s_apply_yaml_to_dev_env(space_id: str, environment_key: str, yaml_content: str, namespace: str = None) -> str:
    """
    Applies a Kubernetes configuration (from 'yaml_content' string)
    to the specified 'namespace' of the 'environment_key' for the 'space_id'.
    If 'namespace' is not provided, a default from the space's environment config might be used.
    Returns a success or error message.
    """
    if not all([space_id, environment_key, yaml_content]):
        return "Error: space_id, environment_key, and yaml_content are required."

    env_config = _get_k8s_env_config_for_space(space_id, environment_key)
    if not env_config: return f"Error: K8s config for env '{environment_key}' not found for space '{space_id}'."
    
    effective_namespace = namespace or env_config.get("namespace")
    if not effective_namespace: return f"Error: Namespace must be provided or configured for env '{environment_key}'."

    # result = k8s_service_instance.apply_yaml_string(space_id, environment_key, effective_namespace, yaml_content)
    # if result.get("success"): return result.get("message", "YAML applied.")
    # return f"Error applying K8s YAML: {result.get('error', 'Unknown error')}"
    print(f"TOOL: k8s_apply_yaml_to_dev_env: space='{space_id}', env='{environment_key}', ns='{effective_namespace}' with YAML:\n{yaml_content[:100]}...")
    return f"Mock Success: YAML applied to '{environment_key}' env in namespace '{effective_namespace}' for space '{space_id}'."


@tool
def k8s_get_pod_logs_for_dev_env(space_id: str, environment_key: str, pod_name: str, namespace: str = None, container_name: str = None, tail_lines: int = 100) -> str:
    """
    Fetches logs for a specific 'pod_name' in a 'namespace' of a DEV space's 'environment_key'.
    If 'namespace' is not provided, uses default from environment config.
    'container_name' is optional. 'tail_lines' defaults to 100.
    Returns logs as a string or an error message.
    """
    if not all([space_id, environment_key, pod_name]):
        return "Error: space_id, environment_key, and pod_name are required."
    env_config = _get_k8s_env_config_for_space(space_id, environment_key)
    if not env_config: return f"Error: K8s config for env '{environment_key}' not found."
    effective_namespace = namespace or env_config.get("namespace")
    if not effective_namespace: return f"Error: Namespace required for pod logs."

    print(f"TOOL: k8s_get_pod_logs_for_dev_env: space='{space_id}', env='{environment_key}', pod='{pod_name}', ns='{effective_namespace}'")
    # result = k8s_service_instance.get_pod_logs(space_id, environment_key, effective_namespace, pod_name, container_name, tail_lines)
    # if result.get("success"): return result.get("logs")
    # return f"Error getting logs: {result.get('error')}"
    return f"Mock logs for {pod_name} in {effective_namespace}:\nLog line 1...\nLog line 2 (env: {environment_key})"

@tool
def k8s_restart_deployment_for_dev_env(space_id: str, environment_key: str, deployment_name: str, namespace: str = None) -> str:
    """
    Performs a rolling restart of the 'deployment_name' in a 'namespace' of a DEV space's 'environment_key'.
    If 'namespace' is not provided, uses default from environment config.
    Returns a confirmation message or an error.
    """
    if not all([space_id, environment_key, deployment_name]):
        return "Error: space_id, environment_key, and deployment_name are required."
    env_config = _get_k8s_env_config_for_space(space_id, environment_key)
    if not env_config: return f"Error: K8s config for env '{environment_key}' not found."
    effective_namespace = namespace or env_config.get("namespace")
    if not effective_namespace: return f"Error: Namespace required."

    print(f"TOOL: k8s_restart_deployment_for_dev_env: space='{space_id}', env='{environment_key}', deploy='{deployment_name}', ns='{effective_namespace}'")
    # result = k8s_service_instance.restart_deployment(space_id, environment_key, effective_namespace, deployment_name)
    # if result.get("success"): return result.get("message")
    # return f"Error restarting deployment: {result.get('error')}"
    return f"Mock Success: Deployment '{deployment_name}' in '{effective_namespace}' (env: {environment_key}) restart initiated."

@tool
def k8s_scale_deployment_for_dev_env(space_id: str, environment_key: str, deployment_name: str, replicas: int, namespace: str = None) -> str:
    """
    Scales a Kubernetes 'deployment_name' to the desired number of 'replicas' in a 'namespace'
    of a DEV space's 'environment_key'.
    If 'namespace' is not provided, uses default from environment config.
    Returns a confirmation or error message.
    """
    if not all([space_id, environment_key, deployment_name]): return "Error: space_id, environment_key, and deployment_name are required."
    if not isinstance(replicas, int) or replicas < 0: return "Error: 'replicas' must be a non-negative integer."
    env_config = _get_k8s_env_config_for_space(space_id, environment_key)
    if not env_config: return f"Error: K8s config for env '{environment_key}' not found."
    effective_namespace = namespace or env_config.get("namespace")
    if not effective_namespace: return f"Error: Namespace required."

    print(f"TOOL: k8s_scale_deployment_for_dev_env: space='{space_id}', env='{environment_key}', deploy='{deployment_name}', replicas={replicas}, ns='{effective_namespace}'")
    # result = k8s_service_instance.scale_deployment(space_id, environment_key, effective_namespace, deployment_name, replicas)
    # if result.get("success"): return result.get("message")
    # return f"Error scaling deployment: {result.get('error')}"
    return f"Mock Success: Deployment '{deployment_name}' in '{effective_namespace}' (env: {environment_key}) scaling to {replicas} initiated."


def get_all_dev_tools():
    return [
        get_repository_file_tree,
        list_repository_branches,
        read_file_content_from_repo,
        git_pull_changes,
        git_commit_and_push,
        k8s_list_resources_in_dev_env,
        k8s_apply_yaml_to_dev_env,
        k8s_get_pod_logs_for_dev_env,
        k8s_restart_deployment_for_dev_env,
        k8s_scale_deployment_for_dev_env,
    ]


