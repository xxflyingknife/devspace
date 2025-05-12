import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import json

# Import handlers and config
from config import GOOGLE_API_KEY # Used for early check
from chat_handler import handle_chat_message
from git_handler import get_git_tree
from k8s_handler import get_k8s_status
from agent_setup import initialize_agent # For initializing agent on startup

# --- Create Flask App ---
app = Flask(__name__)
# !!! IMPORTANT: Configure CORS properly for production !!!
# Allow requests from your frontend's origin (e.g., http://localhost:3000)
# For development, allowing all origins is common, but restrict in prod.
CORS(app, resources={r"/api/*": {"origins": "*"}}) # Adjust origins for production

# --- Initialize Agent on Startup (Optional but recommended) ---
# This loads the LLM model and tools when the server starts,
# avoiding delays on the first request.
try:
    initialize_agent()
    print("LangChain Agent initialized successfully on startup.")
except ValueError as e:
    print(f"CRITICAL ERROR: Failed to initialize LangChain Agent on startup: {e}")
    # Depending on your requirements, you might want the app to exit or run without agent functionality.
    # For now, it will continue running but /api/chat might fail.
except ImportError as e:
     print(f"CRITICAL ERROR: Missing dependency for LangChain Agent: {e}. Install required packages.")


# --- API Routes ---

@app.route('/')
def index():
    # Simple index route for health check or basic info
    return jsonify({"message": "Backend server for DevOps Assistant is running."})

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Handles chat messages from the frontend."""
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "Missing 'message' in request body"}), 400

    user_message = data.get('message')
    space_id = data.get('spaceId') # Optional context

    # Call the chat handler which invokes the agent
    reply = handle_chat_message(user_message, space_id)

    # Check if the reply indicates an internal error
    if "An error occurred" in reply or "Agent did not provide an output" in reply:
         return jsonify({"reply": reply}), 500 # Internal Server Error

    return jsonify({"reply": reply})

@app.route('/api/git/tree', methods=['GET'])
def git_tree_endpoint():
    """Provides the file tree for a given repository ID."""
    repo_id = request.args.get('repoId')
    if not repo_id:
        return jsonify({"error": "Missing 'repoId' query parameter"}), 400

    tree_data = get_git_tree(repo_id)

    if tree_data and "error" in tree_data:
         # Distinguish between user error (bad repoId) and server error
         if "Invalid or not allowed" in tree_data["error"] or "not found or inaccessible" in tree_data["error"]:
              status_code = 404 # Not Found or Forbidden (conceptually)
         else:
              status_code = 500 # Internal Server Error
         return jsonify(tree_data), status_code

    if tree_data is None: # Should ideally not happen if error is handled
         return jsonify({"error": "Failed to get repository tree"}), 500

    return jsonify(tree_data) # Returns {"tree": [...]} on success


@app.route('/api/k8s/status', methods=['GET'])
def k8s_status_endpoint():
    """Provides Kubernetes workload status for a given app ID."""
    app_id = request.args.get('appId')
    if not app_id:
        return jsonify({"error": "Missing 'appId' query parameter"}), 400

    status_data = get_k8s_status(app_id)

    if status_data and status_data.get("error"):
         # Check for specific errors if needed, otherwise assume 500
         if "Configuration not found" in status_data["error"]:
              return jsonify(status_data), 404
         return jsonify(status_data), 500

    return jsonify(status_data) # Returns {"deployments": [...], "pods": [...], ...}


# --- Run the App ---
if __name__ == '__main__':
    # Set host='0.0.0.0' to be accessible externally (e.g., from Docker container)
    # Use a production-ready WSGI server like Gunicorn or Waitress instead of Flask's dev server in production.
    # Example: gunicorn -w 4 -b 0.0.0.0:5000 server:app
    port = int(os.environ.get('PORT', 5000)) # Allow port configuration via env var
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True only for development!

