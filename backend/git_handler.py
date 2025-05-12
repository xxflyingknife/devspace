import os
import stat
from config import ALLOWED_REPO_PATHS, SECURE_BASE_GIT_PATH

def get_git_tree(repo_id: str) -> dict | None:
    """
    Generates a file tree structure for the given repo_id.
    Returns a dictionary representing the tree or None on error.
    """
    print(f"Attempting to get git tree for repo_id: {repo_id}")

    # --- Path Validation (Duplicated from tools for direct use, consider refactoring) ---
    path_config = ALLOWED_REPO_PATHS.get(repo_id)
    if not path_config:
        print(f"Error: repo_id '{repo_id}' not found in ALLOWED_REPO_PATHS.")
        return {"error": f"Invalid or not allowed repository ID: {repo_id}"}

    repo_path = os.path.abspath(path_config)
    secure_base = os.path.abspath(SECURE_BASE_GIT_PATH)

    if not repo_path.startswith(secure_base):
        print(f"Error: Path '{repo_path}' for repo_id '{repo_id}' is outside the secure base '{secure_base}'.")
        return {"error": "Repository path configuration error."} # Don't leak path info

    if not os.path.isdir(repo_path):
        print(f"Error: Configured path '{repo_path}' does not exist or is not a directory.")
        return {"error": f"Repository '{repo_id}' not found or inaccessible."}
    # --- End Path Validation ---


    tree = []
    try:
        for item in os.listdir(repo_path):
            item_path = os.path.join(repo_path, item)
            # Skip hidden files/dirs like .git
            if item.startswith('.'):
                continue

            node = {"id": item_path, "name": item} # Use path as ID for simplicity, consider hashing later
            try:
                mode = os.stat(item_path).st_mode
                if stat.S_ISDIR(mode):
                    node["type"] = "folder"
                    # Recursively build children (can be slow for large repos, consider limiting depth or using git ls-tree)
                    # For simplicity, let's just mark it as a folder for now.
                    # A real implementation would fetch children on demand or use a more efficient method.
                    node["children"] = [] # Placeholder - Frontend might fetch children onClick
                elif stat.S_ISREG(mode):
                    node["type"] = "file"
                else:
                    node["type"] = "other" # Symlinks, etc.

                tree.append(node)
            except OSError as e:
                 print(f"Warning: Could not stat item {item_path}: {e}")
                 # Skip item if cannot access/stat

        # Sort tree (folders first, then files, alphabetically)
        tree.sort(key=lambda x: (0 if x['type'] == 'folder' else 1, x['name'].lower()))

        print(f"Successfully generated tree for {repo_id}")
        # Return the top-level tree structure
        return {"tree": tree}

    except OSError as e:
        print(f"Error listing directory {repo_path}: {e}")
        return {"error": f"Error accessing repository content for '{repo_id}'."}
    except Exception as e:
        print(f"Unexpected error generating git tree for {repo_id}: {e}")
        return {"error": "An unexpected error occurred while generating the file tree."}

