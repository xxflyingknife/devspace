# devspace/backend/tools/dev_tools.py
from langchain_core.tools import tool
from services.git_service import GitService # Assuming singleton or how you access it
from services.k8s_service import K8sService
from services.space_service import SpaceService # To get space specific configs
from typing import Union, Optional, List # Add List if you use list[Plugin]
# Instantiate services (or use dependency injection if you set that up)
git_service_instance = GitService()
k8s_service_instance = K8sService()
space_service_instance = SpaceService()

# Helper to get current space's git_repo_url (tools need this context)
# The LLM might not always know the current repo_url, but it should know the space_id
def _get_git_url_from_space_id(space_id: str) -> Optional[str]:
    if not space_id: return None
    dev_config = space_service_instance.get_dev_config_object(space_id) # Fetches the ORM object
    return dev_config.git_repo_url if dev_config else None

@tool
def get_repository_file_tree(space_id: str, branch: str) -> str:
    """
    Fetches the file and directory tree structure for the specified branch of the Git repository
    configured for the given 'space_id'.
    Returns the tree structure as JSON string or an error message.
    """
    if not space_id or not branch:
        return "Error: space_id and branch are required."
    # git_repo_url = _get_git_url_from_space_id(space_id) # Service now takes space_id
    # if not git_repo_url:
    #     return f"Error: No Git repository configured for space ID '{space_id}'."
    
    result = git_service_instance.get_file_tree(space_id_str=space_id, branch=branch, force_refresh=False)
    if result.get("success"):
        import json
        return json.dumps(result.get("tree", []))
    return f"Error fetching file tree: {result.get('error', 'Unknown error')}. Details: {result.get('details','')}"

@tool
def list_repository_branches(space_id: str) -> str:
    """
    Lists all branches for the Git repository configured for the given 'space_id'.
    Returns a list of branch names as JSON string or an error message.
    """
    if not space_id: return "Error: space_id is required."
    git_repo_url = _get_git_url_from_space_id(space_id)
    if not git_repo_url:
        return f"Error: No Git repository configured for space ID '{space_id}'."

    result = git_service_instance.list_branches(git_repo_url=git_repo_url)
    if result.get("success"):
        import json
        return json.dumps(result.get("branches", []))
    return f"Error listing branches: {result.get('error', 'Unknown error')}"

@tool
def git_pull_latest_changes(space_id: str, branch: str) -> str:
    """
    Pulls the latest changes from the remote 'origin' for the specified branch
    of the Git repository configured for 'space_id'.
    This tool assumes the backend has a mechanism to manage a local clone or uses an MCP.
    Returns a success or error message.
    """
    if not space_id or not branch: return "Error: space_id and branch are required."
    # TODO: git_service_instance.pull_changes(space_id, branch)
    return f"Mock Tool: 'git pull' for branch '{branch}' in space '{space_id}' would be executed. (Not fully implemented)"

@tool
def git_commit_and_push_changes(space_id: str, branch: str, commit_message: str, force_push: bool = False) -> str:
    """
    Stages all current changes, commits them with the provided 'commit_message',
    and pushes to the specified 'branch' of the Git repository for 'space_id'.
    Set 'force_push' to true for a force push. Use with caution.
    This is a SENSITIVE operation.
    Returns a success or error message from the push operation.
    """
    if not space_id or not branch or not commit_message:
        return "Error: space_id, branch, and commit_message are required."
    
    # This requires the GitService.push_changes to be fully implemented and secure
    result = git_service_instance.push_changes(space_id=space_id, branch=branch, commit_message=commit_message, force=force_push)
    if result.get("success"):
        return result.get("stdout") or result.get("stderr") or "Push successful (no specific output)."
    return f"Error during git push: {result.get('error', 'Unknown error')}. Details: {result.get('stderr','')}"


@tool
def k8s_list_resources_tool(space_id: str, environment_key: str, resource_type: str, namespace: str) -> str:
    """
    Lists Kubernetes resources of a specific 'resource_type' (e.g., 'pods', 'deployments', 'services')
    in the given 'namespace' for the specified 'environment_key' ('test', 'grayscale', 'production')
    configured for the 'space_id'.
    Returns a JSON string of resources or an error message.
    """
    if not all([space_id, environment_key, resource_type, namespace]):
        return "Error: space_id, environment_key, resource_type, and namespace are required."
    result = k8s_service_instance.list_resources(space_id, environment_key, resource_type, namespace)
    if result.get("success"):
        import json
        return json.dumps(result.get("resources", []))
    return f"Error listing K8s {resource_type}: {result.get('error', 'Unknown error')}"

@tool
def k8s_apply_yaml_tool(space_id: str, environment_key: str, namespace: str, yaml_content: str) -> str:
    """
    Applies a Kubernetes configuration provided as a YAML string to the specified 'namespace'
    of the 'environment_key' ('test', 'grayscale', 'production') configured for 'space_id'.
    Returns a success or error message.
    """
    if not all([space_id, environment_key, namespace, yaml_content]):
        return "Error: space_id, environment_key, namespace, and yaml_content are required."
    result = k8s_service_instance.apply_yaml_string(space_id, environment_key, namespace, yaml_content)
    if result.get("success"):
        return result.get("message", "YAML applied.") + (f" Details: {result.get('details')}" if result.get('details') else "")
    return f"Error applying K8s YAML: {result.get('error', 'Unknown error')}"

# TODO: Add tools for k8s_start_pod, k8s_stop_pod (delete), k8s_scale_deployment etc.
# These would call corresponding methods in K8sService.

def get_all_dev_tools():
    return [
        get_repository_file_tree,
        list_repository_branches,
        git_pull_latest_changes,
        git_commit_and_push_changes,
        k8s_list_resources_tool,
        k8s_apply_yaml_tool,
        # Add other dev tools here
    ]
