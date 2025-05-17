# devspace/backend/seed_plugins.py
import sys
import os
import json # For default_config_schema_json if you use it
from sqlalchemy.orm import Session
import uuid
# Adjust the path to allow imports from the backend root
# This assumes the script is in devspace/backend/
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_session import SessionLocal, engine, Base # Import SessionLocal and Base
from database.models import Plugin, SpaceTypeEnum # Import your Plugin model and SpaceTypeEnum


from database.models import User, LLMSourceEnum # Add User, LLMSourceEnum
from services.auth_service import AuthService # For hashing password
auth_service_instance = AuthService()

# This should match the UUID string used in get_current_user_id_mock() in plugins_api.py
MOCK_USER_UUID_FOR_SEEDING = uuid.UUID('00000000-0000-0000-0000-000000000001')

def seed_user_if_not_exists(): # Added type hint
    db_session: Session = SessionLocal() 
    user = db_session.query(User).filter_by(id=MOCK_USER_UUID_FOR_SEEDING).first()
    if not user:
        print(f"Seeding mock user with ID: {MOCK_USER_UUID_FOR_SEEDING}")
        print(f"Seeding mock userrrrr")
        # Make sure get_password_hash is available and works
        # If AuthService.get_password_hash is not fully implemented, use a placeholder for now
        try:
            print(f"Seeding mock user 0")
            hashed_pw = auth_service_instance.get_password_hash("testpassword")
        except Exception as e:
            print(f"Warning: Could not hash password during seeding ({e}). Storing placeholder.")
            hashed_pw = "placeholder_hashed_password"
        print(f"Seeding mock user 1")
        new_user = User(
            id=MOCK_USER_UUID_FOR_SEEDING, # Pass the UUID object
            email="testuser@example.com",
            username="testuser",
            hashed_password=hashed_pw,
            is_active=True,
            #llm_source=LLMSourceEnum.GEMINI # Make sure LLMSourceEnum is defined and imported
        )
        print(f"Seeding mock user 2")
        
        db_session.add(new_user)
        print(f"Seeding mock user 3")
        try:
            db_session.commit() # Commit here to save the user
            print(f"Mock user with ID {MOCK_USER_UUID_FOR_SEEDING} created/ensured.")
        except Exception as e:
            db_session.rollback()
            print(f"ERROR SEEDING USER: {e}")
    else:
        print(f"Mock user {MOCK_USER_UUID_FOR_SEEDING} already exists.")

def seed_data():
    # Create tables if they don't exist (useful if running standalone)
    # In a real app, migrations or app startup usually handles this.
    # Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    plugins_to_add = [
        {
            "id": 'vue-scaffolder-v1.0.2', # Ensure IDs are unique
            "name": 'Vue.js Project Scaffolder',
            "description": 'Adds a Vue.js + Vite project template for quickstarts, enabling rapid modern web development.',
            "version": '1.0.2',
            "author": 'Community Contributors',
            "category": '平台功能插件',
            "sub_category": '开发项目类型',
            "target_space_type": SpaceTypeEnum.DEV, # Use the Enum member
            "icon_url_or_emoji": '🏗️',
            "is_core_plugin": False,
            "entry_point_config_json": json.dumps({"module": "scaffolders.vue_vite", "class": "VueViteScaffolder"}),
            "default_config_schema_json": json.dumps({"framework_version": {"type": "string", "default": "3"}, "include_router": {"type": "boolean", "default": True}})
        },
        {
            "id": 'aws-fargate-debug-v0.9.0',
            "name": 'AWS Fargate Debug Adapter',
            "description": 'Integrates debugging capabilities for AWS Fargate tasks directly within the platform environment.',
            "version": '0.9.0',
            "author": 'PluginCorp LLC',
            "category": '平台功能插件',
            "sub_category": 'Debug 环境',
            "target_space_type": SpaceTypeEnum.DEV,
            "icon_url_or_emoji": '🐛',
            "is_core_plugin": False,
        },
        {
            "id": 'aws-lambda-deploy-v1.1.0',
            "name": 'AWS Lambda Deployment',
            "description": 'Enables direct deployment of serverless functions to AWS Lambda from your workspace.',
            "version": '1.1.0',
            "author": 'PluginCorp LLC',
            "category": '平台功能插件',
            "sub_category": '部署环境',
            "target_space_type": SpaceTypeEnum.DEV,
            "icon_url_or_emoji": '🚀',
            "is_core_plugin": False,
        },
        {
            "id": 'aws-ecs-viewer-v1.0.0',
            "name": 'AWS ECS Workload Viewer',
            "description": 'View and manage AWS ECS services and tasks as first-class workloads in your Ops spaces.',
            "version": '1.0.0',
            "author": 'Community Contributors',
            "category": '平台功能插件',
            "sub_category": 'Workload 类型',
            "target_space_type": SpaceTypeEnum.OPS,
            "icon_url_or_emoji": '🚢',
            "is_core_plugin": True, # Example of a core plugin
        },
        {
            "id": 'enhanced-log-viewer-v1.3.0',
            "name": 'Enhanced Log Viewer',
            "description": 'Provides advanced filtering, searching, and highlighting for application and system log viewing.',
            "version": '1.3.0',
            "author": 'ToolDevs Inc.',
            "category": '平台功能插件',
            "sub_category": 'Debug 面板工具',
            "target_space_type": None, # Applies to all (or use SpaceTypeEnum.ALL if you define it)
            "icon_url_or_emoji": '🔍',
            "is_core_plugin": False,
        },
        {
            "id": 'custom-rag-agent-v1.2.0',
            "name": 'Custom RAG Agent for Docs',
            "description": 'A specialized Retrieval Augmented Generation agent optimized for your internal documentation and knowledge bases.',
            "version": '1.2.0',
            "author": 'AI Solutions Ltd.',
            "category": 'AI 智能插件',
            "sub_category": 'LLM Agents',
            "target_space_type": None, # Applies to all
            "icon_url_or_emoji": '🧠',
            "is_core_plugin": False,
        },
        {
            "id": 'jenkins-mcp-adapter-v1.0.0',
            "name": 'Jenkins MCP Adapter',
            "description": 'Connects to Jenkins CI/CD servers, enabling LLM tools to trigger and monitor build/deployment jobs.',
            "version": '1.0.0',
            "author": 'Community CI/CD',
            "category": 'AI 智能插件',
            "sub_category": 'MCP Server Adapters',
            "target_space_type": None,
            "icon_url_or_emoji": '🤖',
            "is_core_plugin": False,
        },
        {
            "id": 'timeseries-anomaly-skill-v2.1.0',
            "name": 'Timeseries Anomaly Skill',
            "description": 'Advanced time-series anomaly detection for metrics, integrable with chat tools for proactive alerting.',
            "version": '2.1.0',
            "author": 'AI Solutions Ltd.',
            "category": 'AI 智能插件',
            "sub_category": 'AIOps 技能',
            "target_space_type": SpaceTypeEnum.OPS,
            "icon_url_or_emoji": '📈',
            "is_core_plugin": False,
        }
    ]

    existing_plugin_ids = {plugin.id for plugin in db.query(Plugin.id).all()}
    
    new_plugins_added_count = 0
    for plugin_data in plugins_to_add:
        if plugin_data["id"] not in existing_plugin_ids:
            # Convert target_space_type if it's already an Enum, otherwise ensure it's None or Enum
            if isinstance(plugin_data["target_space_type"], SpaceTypeEnum):
                pass # Already an Enum
            elif plugin_data["target_space_type"] is None:
                pass # Correctly None
            else: # Should not happen if data is defined with Enums above
                print(f"Warning: target_space_type for {plugin_data['id']} is unexpected type. Setting to None.")
                plugin_data["target_space_type"] = None

            plugin_entry = Plugin(**plugin_data)
            db.add(plugin_entry)
            new_plugins_added_count += 1
            print(f"Adding plugin: {plugin_data['name']}")
        else:
            print(f"Plugin '{plugin_data['name']}' (ID: {plugin_data['id']}) already exists. Skipping.")

    try:
        if new_plugins_added_count > 0:
            db.commit()
            print(f"\nSuccessfully added {new_plugins_added_count} new plugins to the database.")
        else:
            print("\nNo new plugins were added (all might exist already).")
    except Exception as e:
        db.rollback()
        print(f"\nAn error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding mock plugin data...")
    seed_user_if_not_exists()
    seed_data()
    print("Plugin data seeding process complete.")


