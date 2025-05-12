import os
import subprocess
import shlex
from langchain_core.tools import tool
from config import ALLOWED_REPO_PATHS, SECURE_BASE_GIT_PATH, K8S_APP_CONFIG # Import config

# --- Helper to get validated repo path ---
def _get_validated_repo_path(repo_id: str) -> str | None:
    """Validates repo_id and returns the absolute path if allowed."""
    path = ALLOWED_REPO_PATHS.get(repo_id)
    if not path:
        print(f"Error: repo_id '{repo_id}' not found in ALLOWED_REPO_PATHS.")
        return None

    # Security check: Ensure path is within the secure base directory
    # and prevent directory traversal.
    abs_path = os.path.abspath(path)
    secure_base = os.path.abspath(SECURE_BASE_GIT_PATH)
    if not abs_path.startswith(secure_base):
        print(f"Error: Path '{abs_path}' for repo_id '{repo_id}' is outside the secure base '{secure_base}'.")
        return None
    if not os.path.isdir(abs_path):
         print(f"Error: Path '{abs_path}' for repo_id '{repo_id}' does not exist or is not a directory.")
         return None
    return abs_path

# --- Git Tool Example ---
@tool
def git_pull_updates(repo_id: str, branch_name: str = "main") -> str:
    """
    Pulls the latest updates from the remote 'origin' for the specified branch
    in the repository identified by repo_id.
    Returns the output of the git pull command or an error message.
    """
    repo_path = _get_validated_repo_path(repo_id)
    if not repo_path:
        return f"Error: Invalid or not allowed repo_id '{repo_id}'."

    # Ensure .git directory exists
    if not os.path.isdir(os.path.join(repo_path, ".git")):
        return f"Error: '{repo_path}' does not appear to be a git repository."

    command = f"git -C {shlex.quote(repo_path)} pull origin {shlex.quote(branch_name)}"
    print(f"Executing command: {command}") # For logging/debugging
    try:
        # Use timeout to prevent hanging
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True, timeout=60)
        output = result.stdout.strip()
        if not output:
             output = "Git pull successful, no changes."
        return f"Git pull successful for repo '{repo_id}', branch '{branch_name}':\n{output}"
    except subprocess.TimeoutExpired:
        return f"Error: Git pull command timed out for repo '{repo_id}'."
    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip()
        if not error_message:
             error_message = e.stdout.strip() # Sometimes errors go to stdout
        return f"Error running git pull for repo '{repo_id}', branch '{branch_name}':\n{error_message}"
    except Exception as e:
         return f"An unexpected error occurred during git pull for repo '{repo_id}': {str(e)}"

# --- K8s Tool Example ---
@tool
def k8s_apply_manifest(manifest_content: str, namespace: str = "default") -> str:
    """
    Applies a Kubernetes manifest provided as a string using kubectl apply.
    The manifest content should be a valid Kubernetes YAML or JSON string.
    Returns the output of the kubectl command or an error message.
    Security Note: This tool executes kubectl apply with the provided manifest.
    Ensure the execution environment has appropriate, least-privilege RBAC permissions.
    The manifest content itself is not deeply validated here beyond kubectl's own checks.
    """
    # Use a temporary file for kubectl apply -f - (stdin can be tricky with subprocess)
    import tempfile
    tmp_file = None
    try:
        # Create a temporary file to hold the manifest content
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=".yaml") as tmp_file:
            tmp_file.write(manifest_content)
            tmp_file_path = tmp_file.name

        # Prepare kubectl command
        ns_flag = f"-n {shlex.quote(namespace)}" if namespace else "-n default" # Always specify ns for safety
        command = f"kubectl apply -f {shlex.quote(tmp_file_path)} {ns_flag}"
        print(f"Executing command: {command}")

        # Execute command
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True, timeout=60)
        output = result.stdout.strip()
        if not output:
            output = f"kubectl apply successful for manifest in namespace '{namespace}' (no specific resource changes reported)."
        return f"kubectl apply result in namespace '{namespace}':\n{output}"

    except subprocess.TimeoutExpired:
        return f"Error: kubectl apply command timed out in namespace '{namespace}'."
    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip()
        if not error_message:
            error_message = e.stdout.strip()
        return f"Error running kubectl apply in namespace '{namespace}':\n{error_message}"
    except Exception as e:
        return f"An unexpected error occurred during kubectl apply in namespace '{namespace}': {str(e)}"
    finally:
        # Clean up the temporary file
        if tmp_file_path and os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)


# --- Add more tools as needed ---
# Example: Tool to list deployments (using kubectl for simplicity here)
@tool
def k8s_list_deployments(namespace: str) -> str:
    """Lists deployments in the specified Kubernetes namespace."""
    ns_flag = f"-n {shlex.quote(namespace)}"
    command = f"kubectl get deployments {ns_flag} -o custom-columns=NAME:.metadata.name,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas,DESIRED:.spec.replicas"
    print(f"Executing command: {command}")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True, timeout=30)
        output = result.stdout.strip()
        if not output:
             output = f"No deployments found in namespace '{namespace}'."
        return f"Deployments in namespace '{namespace}':\n{output}"
    except subprocess.TimeoutExpired:
        return f"Error: kubectl get deployments command timed out for namespace '{namespace}'."
    except subprocess.CalledProcessError as e:
        # Handle cases where namespace might not exist or no resources are found gracefully
        error_message = e.stderr.strip()
        if "No resources found" in error_message:
             return f"No deployments found in namespace '{namespace}'."
        return f"Error listing deployments in namespace '{namespace}':\n{error_message}"
    except Exception as e:
        return f"An unexpected error occurred listing deployments in namespace '{namespace}': {str(e)}"


# Placeholder for other potential tools like:
# k8s_get_logs(pod_name, namespace)
# k8s_scale_deployment(deployment_name, replicas, namespace)
# git_create_branch(repo_id, branch_name)
# etc.

