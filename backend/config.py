import os
from dotenv import load_dotenv

# Load environment variables from .env file (optional)
load_dotenv()

# --- API Keys ---
# !!! IMPORTANT: Load API keys securely from environment variables !!!
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# --- Git Configuration ---
# !!! IMPORTANT: Define how repoId maps to actual local paths !!!
# Example: A dictionary mapping allowed repo IDs to their secured base paths.
# You MUST validate paths to prevent directory traversal attacks.
ALLOWED_REPO_PATHS = {
    # Example entry: Frontend expects repoId 'my-k8s-app'
    "my-k8s-app": os.getenv("REPO_PATH_MY_K8S_APP", "/path/to/your/cloned/my-k8s-fullstack-app"),
    "another-project": os.getenv("REPO_PATH_ANOTHER_PROJECT", "/path/to/your/cloned/another-project"),
    # Add other allowed repositories here
}

# --- Kubernetes Configuration ---
# The kubernetes client will typically load from:
# 1. In-cluster service account (if running inside K8s)
# 2. ~/.kube/config (default local configuration)
# 3. KUBECONFIG environment variable
# No specific config needed here unless you want to force a specific context or config file.

# Example mapping appId to namespace or label selector (adjust as needed)
# This defines how the frontend's 'appId' relates to K8s resources.
K8S_APP_CONFIG = {
    "my-k8s-app": {
        "namespace": os.getenv("K8S_NAMESPACE_MY_K8S_APP", "my-app-namespace"),
        "label_selector": os.getenv("K8S_SELECTOR_MY_K8S_APP", "app=my-app") # Matches your K8s manifests
    },
    "another-project": {
        "namespace": os.getenv("K8S_NAMESPACE_ANOTHER_PROJECT", "another-project-ns"),
        "label_selector": os.getenv("K8S_SELECTOR_ANOTHER_PROJECT", "app=another-app")
    }
    # Add config for other apps
}

# --- Security ---
# Base directory to prevent directory traversal in git handler
# Ensure ALLOWED_REPO_PATHS values are within this base.
SECURE_BASE_GIT_PATH = os.getenv("SECURE_BASE_GIT_PATH", "/path/to/your/repos/parent/directory") # Adjust this path!

# --- Other Config ---
# Add any other configuration variables needed
