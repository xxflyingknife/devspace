# devspace/backend/services/mcp_service.py
import requests # Or your preferred HTTP client library
import json
from config import config as app_config # To get MCP server URL and API key if configured globally

class MCPService:
    def __init__(self, space_id=None):
        self.space_id = space_id
        # In a real app, get MCP URL & key based on space_id's config or global config
        # For now, using placeholders or global config
        self.base_url = app_config.MCP_SERVER_URL # e.g., from .env: MCP_SERVER_URL="http://localhost:8080/api/mcp"
        self.api_key = app_config.MCP_SERVER_API_KEY # e.g., from .env: MCP_SERVER_API_KEY="secret_key"
        
        if not self.base_url:
            print("WARN: MCP_SERVER_URL not configured. MCPService calls will be mocked or fail.")

    def _make_request(self, method, endpoint, payload=None, params=None):
        if not self.base_url:
            return {"success": False, "error": "MCP Server URL not configured."}
        
        url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" # Example auth
        }
        print(f"MCPService: Requesting {method} {url} with payload: {payload}, params: {params}")
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=payload, timeout=60)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=payload, timeout=60)
            # Add other methods (DELETE, etc.) as needed
            else:
                return {"success": False, "error": f"Unsupported HTTP method: {method}"}

            response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
            return {"success": True, "data": response.json()}
        except requests.exceptions.HTTPError as http_err:
            error_content = response.content.decode() if response.content else str(http_err)
            print(f"MCPService HTTPError: {http_err} - {error_content}")
            return {"success": False, "error": f"MCP Server HTTP Error: {http_err.response.status_code}", "details": error_content}
        except requests.exceptions.RequestException as req_err:
            print(f"MCPService RequestException: {req_err}")
            return {"success": False, "error": f"MCP Server Request Error: {str(req_err)}"}
        except Exception as e:
            print(f"MCPService Unexpected Error: {e}")
            return {"success": False, "error": f"Unexpected error communicating with MCP Server: {str(e)}"}


    def trigger_git_push_via_mcp(self, git_repo_url: str, branch: str, commit_message: str):
        """Triggers a Git push operation via the MCP server."""
        # Endpoint and payload depend on your MCP server's API design
        endpoint = "actions/git/push"
        payload = {
            "repository_url": git_repo_url,
            "branch": branch,
            "commit_message": commit_message,
            "space_context_id": self.space_id # Pass space context if MCP needs it
        }
        return self._make_request("POST", endpoint, payload=payload)

    def trigger_k8s_deployment_via_mcp(self, app_name: str, version: str, environment: str):
        """Triggers a K8s deployment via the MCP server."""
        endpoint = f"actions/k8s/deploy"
        payload = {
            "application_name": app_name,
            "version_tag": version,
            "target_environment": environment, # e.g., 'test', 'staging', 'production'
            "space_context_id": self.space_id
        }
        return self._make_request("POST", endpoint, payload=payload)

    def get_mcp_job_status(self, job_id: str):
        """Gets the status of a job initiated on the MCP server."""
        endpoint = f"jobs/{job_id}/status"
        return self._make_request("GET", endpoint)

# You might have one instance or create one per request/space
# mcp_service_instance = MCPService()



