# devspace/backend/services/git_service.py
import os
import subprocess
import shlex
import tempfile
import shutil
import json # For loading/dumping JSON cache
import datetime # For timestamping cache

# Assuming SpaceService is available, e.g., via dependency injection or global instance
from .space_service import SpaceService # Adjust import if needed
# from database.models import DevSpaceConfig # Not directly used here, SpaceService handles DB
from database.db_session import SessionLocal # For direct DB operations if needed for cache update
from database.models import DevSpaceConfig, Space, SpaceTypeEnum # Add others if directly used
from typing import Union, Optional, List # Add List if you use list[Plugin]

space_service_instance = SpaceService() # Simple instantiation for now

class GitService:
    def __init__(self):
        self.temp_clone_dir_base = os.path.join(tempfile.gettempdir(), "devspace_git_clones")
        os.makedirs(self.temp_clone_dir_base, exist_ok=True)
        print("GitService initialized.")

    def _run_git_command(self, command_parts, cwd=None, timeout=60):
        # ... (same as before)
        try:
            print(f"SERVICE-GIT: Executing command: {' '.join(command_parts)} in {cwd or 'default dir'}")
            process = subprocess.run(command_parts, check=True, capture_output=True, text=True, cwd=cwd, timeout=timeout)
            return {"success": True, "stdout": process.stdout.strip(), "stderr": process.stderr.strip()}
        except subprocess.CalledProcessError as e:
            error_msg = f"Git command failed: {e.stderr.strip() or e.stdout.strip()}"
            print(f"SERVICE-GIT ERROR: {error_msg}")
            return {"success": False, "error": error_msg, "details": e.stderr.strip()}
        except subprocess.TimeoutExpired:
            error_msg = "Git command timed out."
            print(f"SERVICE-GIT ERROR: {error_msg}")
            return {"success": False, "error": error_msg}
        except Exception as e:
            error_msg = f"Unexpected error running git command: {str(e)}"
            print(f"SERVICE-GIT ERROR: {error_msg}")
            return {"success": False, "error": error_msg}


    def list_branches(self, git_repo_url: str):
        # ... (same as before, ensure it returns {"success": True/False, "branches": [], "error": "..."})
        print(f"SERVICE-GIT: list_branches for repo_url: {git_repo_url}")
        if not git_repo_url: return {"success": False, "error": "Repository URL is required."}
        command_parts = ["git", "ls-remote", "--heads", shlex.quote(git_repo_url)]
        result = self._run_git_command(command_parts)
        if not result["success"]: return result
        branches = []
        for line in result["stdout"].splitlines():
            if line and "\trefs/heads/" in line:
                branches.append(line.split("\trefs/heads/")[1])
        if not branches and "not found" in result.get("stderr", "").lower():
            return {"success": False, "error": f"Repository not found or access denied: {git_repo_url}"}
        return {"success": True, "branches": sorted(list(set(branches)))}


    def _fetch_tree_from_git(self, git_repo_url: str, branch: str, temp_repo_path: str):
        # Extracted actual Git fetching logic
        clone_command = ["git", "clone", "--depth", "1", "--branch", shlex.quote(branch), shlex.quote(git_repo_url), temp_repo_path]
        clone_result = self._run_git_command(clone_command, timeout=120)
        if not clone_result["success"]:
            return clone_result

        tree_data = []
        # ... (os.walk logic to build tree_data - same as before) ...
        for root, dirs, files in os.walk(temp_repo_path):
            if ".git" in dirs: dirs.remove(".git")
            relative_root = os.path.relpath(root, temp_repo_path);
            if relative_root == ".": relative_root = ""
            current_level_nodes = []
            for name in sorted(dirs): current_level_nodes.append({"id": os.path.join(relative_root, name).replace("\\", "/"), "name": name, "type": "folder", "children": []})
            for name in sorted(files): current_level_nodes.append({"id": os.path.join(relative_root, name).replace("\\", "/"), "name": name, "type": "file"})
            if not relative_root: tree_data.extend(current_level_nodes)
            else:
                path_parts = relative_root.split(os.sep); parent_ref = tree_data; found = True
                for part in path_parts:
                    parent_node = next((n for n in parent_ref if n["name"] == part and n["type"] == "folder"), None)
                    if parent_node: 
                        parent_ref = parent_node["children"]
                    else : 
                        found = False
                        break
                if found: parent_ref.extend(current_level_nodes)
        return {"success": True, "tree": tree_data}

    def get_file_tree(self, space_id_str: str, branch: str, force_refresh: bool = False):
        print(f"SERVICE-GIT: get_file_tree for space {space_id_str}, branch {branch}, refresh: {force_refresh}")
        
        dev_config = space_service_instance.get_dev_config_object(space_id_str)
        if not dev_config or not dev_config.git_repo_url:
            return {"success": False, "error": "Git repository not configured for this space."}
        
        git_repo_url = dev_config.git_repo_url

        # Check cache first (unless force_refresh)
        if not force_refresh and dev_config.cached_file_tree_json and dev_config.cached_tree_branch == branch:
            # TODO: Add staleness check for cache if desired, e.g., if dev_config.tree_last_fetched_at is too old
            print(f"SERVICE-GIT: Returning cached tree for branch {branch}")
            try:
                return {"success": True, "tree": json.loads(dev_config.cached_file_tree_json), "from_cache": True}
            except json.JSONDecodeError:
                print("SERVICE-GIT WARN: Failed to decode cached JSON tree. Fetching fresh.")

        # Proceed to fetch from Git
        repo_name_for_temp = git_repo_url.split('/')[-1].replace('.git', '')
        temp_repo_path = tempfile.mkdtemp(prefix=f"{repo_name_for_temp}_{branch}_", dir=self.temp_clone_dir_base)
        
        try:
            fetch_result = self._fetch_tree_from_git(git_repo_url, branch, temp_repo_path)
            if fetch_result["success"]:
                # Update cache in DB
                db_session = SessionLocal()
                try:
                    # Re-fetch dev_config within this new session to update it
                    db_dev_config = db_session.query(DevSpaceConfig).filter_by(id=dev_config.id).first()
                    if db_dev_config:
                        db_dev_config.cached_file_tree_json = json.dumps(fetch_result["tree"])
                        db_dev_config.cached_tree_branch = branch
                        db_dev_config.tree_last_fetched_at = datetime.datetime.now(datetime.timezone.utc)
                        db_session.commit()
                        print(f"SERVICE-GIT: Cached new tree for branch {branch}")
                    else:
                        print(f"SERVICE-GIT WARN: Could not find DevSpaceConfig with id {dev_config.id} to update cache.")
                except Exception as db_e:
                    db_session.rollback()
                    print(f"SERVICE-GIT ERROR: Failed to update cache in DB: {db_e}")
                finally:
                    db_session.close()
            return fetch_result
        finally:
            if os.path.exists(temp_repo_path):
                print(f"SERVICE-GIT: Cleaning up temporary clone: {temp_repo_path}")
                shutil.rmtree(temp_repo_path, ignore_errors=True)

    
    def get_repository_local_path(self, space_id: str, git_repo_url: str, branch: str, force_clone_or_pull: bool = False) -> Optional[str]:
        """
        Ensures a local clone of the specified branch of the repo exists and is up-to-date.
        Returns the local path to the repository. Manages clones in a persistent, secure location.
        If force_clone_or_pull is True, it will always try to pull or re-clone.
        """
        # TODO: Implement logic to manage persistent clones (e.g., in app_config.SECURE_BASE_GIT_PATH)
        # - Check if clone exists for this repo_url.
        # - If yes, git -C <path> checkout <branch> && git -C <path> pull origin <branch> (if force_clone_or_pull or stale)
        # - If no, git clone --branch <branch> --depth <some_depth_or_full> <repo_url> <path>
        # - Handle private repos (SSH keys, HTTPS tokens for backend server)
        # - Return local path or None on failure.
        print(f"MOCK: Ensuring local repo for {git_repo_url} branch {branch} for space {space_id}")
        # For now, let's assume a fixed mock path if we want to test os.walk on a real local repo
        # return "/path/to/your/actual/local/clone/of/devspace" # REPLACE WITH A REAL PATH FOR TESTING
        # This is highly dependent on your backend server's setup.
        # For now, let's keep using the temporary clone logic within _fetch_tree_from_git for tree viewing.
        # Tools that modify will need a more persistent local clone strategy or use an MCP.
        return None # Placeholder - pushing/pulling will need a proper strategy

    def push_changes(self, space_id: str, branch: str, commit_message: str, remote_name: str = "origin", force: bool = False):
        """
        Stages all changes, commits with the given message, and pushes to the specified remote branch.
        This is a SENSITIVE operation. Best delegated to an MCP server if possible.
        """
        local_repo_path = self.get_repository_local_path(space_id, "NEEDS_REPO_URL_FROM_DB", branch, force_clone_or_pull=True)
        if not local_repo_path:
            return {"success": False, "error": "Could not access local repository for push."}

        # This sequence is DANGEROUS without extreme care and proper user identity mapping.
        # It assumes the backend process has write access and commit identity configured.
        add_cmd = ["git", "-C", local_repo_path, "add", "."]
        commit_cmd = ["git", "-C", local_repo_path, "commit", "-m", shlex.quote(commit_message)]
        push_cmd = ["git", "-C", local_repo_path, "push", remote_name, shlex.quote(branch)]
        if force: push_cmd.append("-f")

        print(f"SERVICE-GIT: Attempting to add changes in {local_repo_path}")
        add_result = self._run_git_command(add_cmd)
        if not add_result["success"] and "nothing to commit" not in add_result.get("stderr", "").lower() and "nothing to commit" not in add_result.get("stdout", "").lower():
            return add_result # Return error from git add

        print(f"SERVICE-GIT: Attempting to commit in {local_repo_path} with message: {commit_message}")
        commit_result = self._run_git_command(commit_cmd)
        # "nothing to commit" is okay if add didn't stage anything new but previous commit was desired
        if not commit_result["success"] and "nothing to commit" not in commit_result.get("stderr", "").lower() and "nothing to commit" not in commit_result.get("stdout", "").lower():
            return commit_result

        print(f"SERVICE-GIT: Attempting to push branch {branch} in {local_repo_path}")
        push_result = self._run_git_command(push_cmd)
        return push_result
