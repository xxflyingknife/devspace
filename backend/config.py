import os
from dotenv import load_dotenv

# Load environment variables from .env file (create .env locally for sensitive data)
# Make sure .env is in .gitignore
load_dotenv()

class Config:
    # --- Application Settings ---
    SECRET_KEY = os.getenv("SECRET_KEY", os.urandom(24).hex())
    DEBUG = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1", "t") # For Flask

    # --- API Keys ---
    # IMPORTANT: Load API keys securely from environment variables for production!
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "YOUR_GOOGLE_API_KEY_HERE_IF_NO_ENV_VAR") # Placeholder

    # --- Database Configuration (SQLite) ---
    # Database file will be created in the 'backend' directory.
    _project_root = os.path.dirname(os.path.abspath(__file__)) # This is backend/
    DATABASE_FILE_NAME = "devspace_app.db"
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(_project_root, DATABASE_FILE_NAME)}"
    )
    # For an in-memory SQLite (data lost on app stop - good for some tests):
    # SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    SQLALCHEMY_ECHO = False # Set to True for debugging SQL queries (can be noisy)
    SQLALCHEMY_TRACK_MODIFICATIONS = False # SQLAlchemy specific, generally set to False

    # --- Git Configuration (Placeholders - to be filled by user/application logic) ---
    # Example: A dictionary mapping allowed repo IDs to their secured base paths.
    # These should ideally be managed per-space in the database later.
    # For now, define a base path from where relative paths could be constructed or absolute paths.
    # IMPORTANT: Paths MUST be validated to prevent directory traversal.
    SECURE_BASE_GIT_PATH = os.getenv("SECURE_BASE_GIT_PATH", "/srv/git_repos") # Example base path
    ALLOWED_REPO_CONFIGS = {
        # "repoId_from_frontend": {
        #     "path_relative_to_secure_base": "my-k8s-fullstack-app",
        #     "default_branch": "main"
        # }
        # This will be populated by space-specific configurations later.
    }

    # --- Kubernetes Configuration (Placeholders) ---
    # The kubernetes client will typically load from:
    # 1. In-cluster service account (if running inside K8s)
    # 2. ~/.kube/config (default local configuration)
    # 3. KUBECONFIG environment variable
    # This section is for app-specific K8s settings if any, not client setup itself.
    # Example: Mapping appId to namespace or label selector (will be per-space in DB)
    K8S_APP_DEFAULT_NAMESPACE = os.getenv("K8S_APP_DEFAULT_NAMESPACE", "default")


    # --- LangChain/Agent Configuration ---
    DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "gemini-2.0-flash")
    AGENT_MAX_ITERATIONS = int(os.getenv("AGENT_MAX_ITERATIONS", "10"))

    # --- Other Application Specific Configs ---
    # E.g., MCP Server URLs/Keys if globally configured, though per-space is better.
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", None)
    MCP_SERVER_API_KEY = os.getenv("MCP_SERVER_API_KEY", None) # Or other auth method
# Instantiate the config object
config = Config()

# Print database URI on load for debugging if needed (remove for production)
print(f"INFO: Database URI set to: {config.SQLALCHEMY_DATABASE_URI}")
if config.GOOGLE_API_KEY == "YOUR_GOOGLE_API_KEY_HERE_IF_NO_ENV_VAR":
    print("WARNING: GOOGLE_API_KEY is using a placeholder. Please set it via environment variable.")

