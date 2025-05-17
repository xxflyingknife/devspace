from sqlalchemy.orm import joinedload
from config import config as app_config # For default LLM model if needed
import json # For handling JSON fields in config models
from database.db_session import get_db_session, SessionLocal # Assuming SessionLocal for direct use
from database.models import Space, DevSpaceConfig, OpsSpaceConfig, SpaceTypeEnum, LLMSourceEnum
import subprocess # For git ls-remote validation
import shlex    # For safe command construction
import datetime
from typing import Union, Optional # <--- ADD Union and Optional (Optional is Union[X, None])
import uuid

class SpaceServiceError(Exception):
    """Custom exception for SpaceService errors."""
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.status_code = status_code

class SpaceService:

    def get_dev_config_object(self, space_id_str: str) -> Union[DevSpaceConfig, None]: # <--- MODIFIED 
        print(f"SERVICE: get_dev_config_object for space {space_id_str}")
        db = SessionLocal()
        try:
            space_id = uuid.UUID(space_id_str)
            space = db.query(Space).filter(Space.id == space_id).first()
            if space and space.type == SpaceTypeEnum.DEV:
                if not space.dev_config: # Create if it doesn't exist for some reason
                    print(f"SERVICE: DevSpaceConfig not found for DEV space {space_id_int}, creating one.")
                    new_dev_config = DevSpaceConfig(space_id=space.id)
                    db.add(new_dev_config)
                    db.commit()
                    db.refresh(new_dev_config)
                    return new_dev_config
                return space.dev_config
            return None
        except Exception as e:
            print(f"SERVICE ERROR in get_dev_config_object: {e}")
            return None
        finally:
            db.close()

    def _validate_git_url(self, git_url: str) -> bool:
        """
        Validates a Git URL by attempting 'git ls-remote'.
        Returns True if valid, False otherwise.
        """
        if not git_url or not (git_url.startswith("http") or git_url.startswith("git@")):
            return False # Basic URL format check
        try:
            # Use a timeout to prevent hanging on unresponsive URLs
            # In a production environment, consider running this in a background task
            # or using a library that handles git operations more robustly.
            command = f"git ls-remote {shlex.quote(git_url)}"
            print(f"SERVICE: Validating Git URL with command: {command}")
            # Timeout is important for external calls
            process = subprocess.run(command, shell=True, check=True, capture_output=True, text=True, timeout=30)
            print(f"SERVICE: Git URL validation successful for {git_url}. Output: {process.stdout[:100]}...") # Log a snippet
            return True
        except subprocess.CalledProcessError as e:
            print(f"SERVICE ERROR: 'git ls-remote' failed for URL {git_url}. Error: {e.stderr}")
            return False
        except subprocess.TimeoutExpired:
            print(f"SERVICE ERROR: 'git ls-remote' timed out for URL {git_url}.")
            return False
        except Exception as e:
            print(f"SERVICE ERROR: Unexpected error validating Git URL {git_url}: {e}")
            return False

    def update_dev_space_git_config(self, space_id_str: str, new_git_repo_url: str):
        print(f"SERVICE: update_dev_space_git_config for space {space_id_str} with URL {new_git_repo_url}")
        db = SessionLocal()
        try:
            space_id_int = uuid.UUID(space_id_str)
            space = db.query(Space).filter(Space.id == space_id_int).first()

            if not space:
                return {"success": False, "error": "Space not found"}
            if space.type != SpaceTypeEnum.DEV:
                return {"success": False, "error": "Space is not a DEV type space"}

            # Validate the Git URL before saving
            if new_git_repo_url and not self._validate_git_url(new_git_repo_url):
                db.rollback() # Rollback any potential changes if validation fails after other ops
                return {"success": False, "error": "Invalid or inaccessible Git repository URL."}

            dev_config = space.dev_config
            if not dev_config:
                # If no DevSpaceConfig exists, create one
                dev_config = DevSpaceConfig(space_id=space.id)
                db.add(dev_config)
            
            dev_config.git_repo_url = new_git_repo_url
            # You might want to reset/update default_branch here too if needed
            # dev_config.default_branch = "main" # Or fetch from repo if possible

            db.commit()
            db.refresh(dev_config) # Refresh to get updated state if needed
            print(f"SERVICE: Successfully updated git_repo_url for space {space_id_str} to {new_git_repo_url}")
            return {"success": True, "message": "Git repository URL updated.", "git_repo_url": new_git_repo_url}
        except ValueError:
            db.rollback()
            return {"success": False, "error": "Invalid space_id format"}
        except Exception as e:
            db.rollback()
            print(f"SERVICE ERROR in update_dev_space_git_config: {e}")
            return {"success": False, "error": f"An internal error occurred: {str(e)}"}
        finally:
            db.close()
    def _get_space_with_configs_by_id(self, db_session, space_id_int: int):
        """Helper to fetch a space with its dev or ops config eagerly loaded."""
        return db_session.query(Space).options(
            joinedload(Space.dev_config),
            joinedload(Space.ops_config)
        ).filter(Space.id == space_id_int).first()

    def get_all_spaces(self, space_type_filter_str=None):
        print(f"SERVICE: get_all_spaces called with filter: {space_type_filter_str}")
        with get_db_session() as db:
            try:
                query = db.query(Space).order_by(Space.created_at.desc())
                if space_type_filter_str and space_type_filter_str in [e.value for e in SpaceTypeEnum]:
                    query = query.filter(Space.type == SpaceTypeEnum(space_type_filter_str))
                spaces = query.all()
                print(f"SERVICE: Found {len(spaces)} spaces.")
                return spaces
            except Exception as e:
                print(f"SERVICE ERROR: Database error fetching spaces: {str(e)}")
                raise SpaceServiceError(f"Database error fetching spaces: {e}", 500)

    def create_space(self, space_data: dict):
        print(f"SERVICE: Attempting to create space with data: {space_data}")
        name = space_data.get("name")
        space_type_str = space_data.get("type")
        description = space_data.get("description")

        if not name:
            raise SpaceServiceError("Space name is required.", 400)
        if not space_type_str:
            raise SpaceServiceError("Space type ('dev' or 'ops') is required.", 400)

        try:
            space_type_enum = SpaceTypeEnum(space_type_str)
        except ValueError:
            raise SpaceServiceError(f"Invalid space type '{space_type_str}'. Must be 'dev' or 'ops'.", 400)

        with get_db_session() as db:
            try:
                # Check for existing space with the same name (optional, based on requirements)
                # existing_space = db.query(Space).filter(Space.name == name).first()
                # if existing_space:
                #     raise SpaceServiceError(f"A space with the name '{name}' already exists.", 409) # 409 Conflict

                new_space = Space(
                    name=name,
                    type=space_type_enum,
                    description=description,
                    llm_source=LLMSourceEnum.GEMINI, # Default
                    llm_model_name=app_config.DEFAULT_LLM_MODEL
                )
                db.add(new_space)
                db.flush() # To get new_space.id for related configs

                if new_space.type == SpaceTypeEnum.DEV:
                    dev_conf = DevSpaceConfig(
                        space_id=new_space.id
                        # git_repo_url=space_data.get("git_repo_url"), # Get from frontend if provided at creation
                        # default_branch=space_data.get("default_branch", "main"),
                        # k8s_environments_json=json.dumps(space_data.get("k8s_environments", {}))
                    )
                    db.add(dev_conf)
                elif new_space.type == SpaceTypeEnum.OPS:
                    ops_conf = OpsSpaceConfig(
                        space_id=new_space.id
                        # Populate OpsSpaceConfig fields from space_data if provided
                    )
                    db.add(ops_conf)
                
                db.commit()
                # Refresh to get all relationships and generated values like created_at
                db.refresh(new_space)
                if new_space.dev_config: db.refresh(new_space.dev_config)
                if new_space.ops_config: db.refresh(new_space.ops_config)
                
                print(f"SERVICE: Space created successfully with ID: {new_space.id}")
                return new_space
            except Exception as e:
                db.rollback()
                print(f"SERVICE ERROR: Database error during space creation: {str(e)}")
                raise SpaceServiceError(f"Database error creating space: {e}", 500)

    def get_space_details_by_id(self, space_id: int):
        print(f"SERVICE: get_space_details_by_id called for: {space_id}")
        with get_db_session() as db:
            try:
                space = self._get_space_with_configs_by_id(db, space_id)
                if not space:
                    raise SpaceServiceError(f"Space with id {space_id} not found.", 404)
                return space
            except Exception as e:
                print(f"SERVICE ERROR: Database error fetching space {space_id}: {str(e)}")
                raise SpaceServiceError(f"Database error fetching space details: {e}", 500)

    def update_space_title(self, space_id: int, new_title: str):
        print(f"SERVICE: update_space_title for {space_id} to '{new_title}'")
        if not new_title or not new_title.strip():
            raise SpaceServiceError("New title cannot be empty.", 400)
        with get_db_session() as db:
            try:
                space = db.query(Space).filter(Space.id == space_id).first()
                if not space:
                    raise SpaceServiceError(f"Space with id {space_id} not found for update.", 404)
                space.name = new_title
                db.commit()
                db.refresh(space)
                return space
            except Exception as e:
                db.rollback()
                print(f"SERVICE ERROR: Database error updating space title: {str(e)}")
                raise SpaceServiceError(f"Database error updating space title: {e}", 500)

    def delete_space(self, space_id: int):
        print(f"SERVICE: delete_space called for: {space_id}")
        with get_db_session() as db:
            try:
                space = self._get_space_with_configs_by_id(db, space_id) # Eager load to delete children by cascade
                if not space:
                    raise SpaceServiceError(f"Space with id {space_id} not found for deletion.", 404)
                db.delete(space)
                db.commit()
                return True
            except Exception as e:
                db.rollback()
                print(f"SERVICE ERROR: Database error deleting space: {str(e)}")
                raise SpaceServiceError(f"Database error deleting space: {e}", 500)

    def get_backend_settings(self, space_id: int):
        print(f"SERVICE: get_backend_settings for: {space_id}")
        space = self.get_space_details_by_id(space_id) # This already raises 404 if not found
        # Note: API keys should not be directly returned. Return placeholders or status.
        return {
            "llm_source": space.llm_source.value if space.llm_source else None,
            "llm_api_key_is_set": bool(space.llm_api_key_placeholder), # Indicate if a key reference exists
            "llm_model_name": space.llm_model_name,
            "agent_config_json": space.agent_config_json, # Or parse to dict: json.loads(space.agent_config_json or '{}')
            "mcp_server_url": space.mcp_server_url,
            "mcp_server_api_key_is_set": bool(space.mcp_server_api_key_placeholder)
        }
    
    def get_space_by_id_with_details(self, space_id_str: str): # Renamed for clarity
        print(f"SERVICE: get_space_by_id_with_details called for: {space_id_str}")
        db = SessionLocal() # Create a new session
        try:
            space_id_int = uuid.UUID(space_id_str) 
            space = db.query(Space).filter(Space.id == space_id_int).first()
            if space:
                details = {
                    "id": str(space.id),
                    "name": space.name,
                    "type": space.type.value, # 'dev' or 'ops'
                    "description": space.description,
                    # Add other common fields from Space model if needed by frontend
                    "llm_source": space.llm_source.value if space.llm_source else None,
                    "llm_model_name": space.llm_model_name,
                }
                if space.type == SpaceTypeEnum.DEV:
                    if space.dev_config: # Check if dev_config relationship is loaded/exists
                        details["git_repo_url"] = space.dev_config.git_repo_url
                        details["default_branch"] = space.dev_config.default_branch
                        # You might want to parse k8s_environments_json here if needed immediately
                    else:
                        # If it's a DEV space but has no dev_config row yet,
                        # it implies no Git repo is configured.
                        details["git_repo_url"] = None
                        details["default_branch"] = "main" # Or some default
                elif space.type == SpaceTypeEnum.OPS:
                    if space.ops_config:
                        # Add any quick-access ops config details if needed
                        details["ops_config_summary"] = "Ops Config Present" # Placeholder
                    else:
                        details["ops_config_summary"] = "No Ops Config"
                return details
            return None
        except ValueError:
            print(f"SERVICE ERROR: Invalid space_id format: {space_id_str}")
            return None
        except Exception as e:
            print(f"SERVICE ERROR in get_space_by_id_with_details: {e}")
            db.rollback() # Good practice on error
            return None
        finally:
            db.close()  

  

    def set_backend_settings(self, space_id: int, settings_data: dict):
        print(f"SERVICE: set_backend_settings for {space_id} with {settings_data}")
        with get_db_session() as db:
            try:
                space = db.query(Space).filter(Space.id == space_id).first()
                if not space:
                    raise SpaceServiceError(f"Space with id {space_id} not found for settings update.", 404)

                if "llmSource" in settings_data: # Frontend sends llmSource
                    space.llm_source = LLMSourceEnum(settings_data["llmSource"])
                if "llm_model_name" in settings_data: # Internal or from advanced settings
                    space.llm_model_name = settings_data["llm_model_name"]
                
                # Handle API Key placeholders - DO NOT STORE RAW KEYS IN DB
                # This logic assumes frontend sends actual keys, backend stores placeholder/ref
                if "geminiApiKey" in settings_data and settings_data["geminiApiKey"]:
                    space.llm_api_key_placeholder = f"ref_gemini_space_{space_id}" # Example reference
                elif "chatGptApiKey" in settings_data and settings_data["chatGptApiKey"]:
                    space.llm_api_key_placeholder = f"ref_chatgpt_space_{space_id}"
                # Add logic for 'otherLlmEndpoint' if space.llm_source == LLMSourceEnum.OTHER

                if "agentType" in settings_data: # Assuming agentType maps to agent_config_json
                     current_agent_config = json.loads(space.agent_config_json or '{}')
                     current_agent_config['type'] = settings_data["agentType"]
                     space.agent_config_json = json.dumps(current_agent_config)

                if "mcpServerUrl" in settings_data:
                    space.mcp_server_url = settings_data["mcpServerUrl"]
                if "mcpServerApiKey" in settings_data and settings_data["mcpServerApiKey"]:
                    space.mcp_server_api_key_placeholder = f"ref_mcp_space_{space_id}"
                
                db.commit()
                db.refresh(space)
                return True
            except ValueError as ve: # For invalid enum conversion
                db.rollback()
                raise SpaceServiceError(f"Invalid value for setting: {ve}", 400)
            except Exception as e:
                db.rollback()
                print(f"SERVICE ERROR: Database error updating backend settings: {str(e)}")
                raise SpaceServiceError(f"Database error updating backend settings: {e}", 500)

    # Specific config getters/setters can also be here if complex
    # e.g., update_dev_space_git_config, update_ops_space_k8s_config

