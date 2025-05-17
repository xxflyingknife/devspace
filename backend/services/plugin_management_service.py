# devspace/backend/services/plugin_management_service.py
from sqlalchemy.orm import Session, joinedload
from database.db_session import SessionLocal
from database.models import Plugin, User, SpaceTypeEnum, user_installed_plugins_table # User is key
import uuid # For UUID conversions
import json
import datetime

# Import UserService to interact with User model
from .user_service import UserService
user_service_instance = UserService() # Instantiate or inject

class PluginManagementService:
    def __init__(self):
        print("PluginManagementService initialized (user-centric).")

    def list_available_plugins(self, db: Session, target_space_type_str: str = None, category_filter: str = None):
        # ... (This method remains largely the same as the last version, querying Plugin table)
        print(f"SERVICE-PLUGIN: Listing available plugins. target_space_type: {target_space_type_str}, category: {category_filter}")
        query = db.query(Plugin)
        if target_space_type_str and target_space_type_str != 'all':
            try:
                target_type_enum = SpaceTypeEnum(target_space_type_str)
                query = query.filter((Plugin.target_space_type == target_type_enum) | (Plugin.target_space_type == None))
            except ValueError:
                print(f"WARN: Invalid target_space_type_str '{target_space_type_str}' in list_available_plugins.")
        if category_filter and category_filter != 'all':
            query = query.filter(Plugin.category == category_filter)
        plugins = query.order_by(Plugin.category, Plugin.name).all()
        return [{"id": p.id, "name": p.name, "description": p.description, "version": p.version,
                 "author": p.author, "category": p.category, "subCategory": p.sub_category,
                 "targetSpaceType": p.target_space_type.value if p.target_space_type else "all",
                 "icon": p.icon_url_or_emoji,
                 "defaultConfigSchema": json.loads(p.default_config_schema_json) if p.default_config_schema_json else None} 
                for p in plugins]

    def get_installed_plugins_for_user(self, db: Session, user_id_str: str):
        print(f"SERVICE-PLUGIN: Getting installed plugins for user_id_str: {user_id_str}")
        # Use UserService to get the user and their plugins
        user_plugins = user_service_instance.get_installed_plugins_for_user(db, user_id_str)
        if user_plugins is None: # Should return [] from service if user not found
            return []
            
        installed_plugins_details = []
        for plugin_obj in user_plugins:
            # Get user-specific config for this plugin
            user_specific_conf_json = None
            try:
                user_uuid = uuid.UUID(user_id_str)
                # Query association table directly for the extra data column
                stmt = db.query(user_installed_plugins_table.c.user_specific_plugin_config_json).\
                    filter_by(user_id=user_uuid, plugin_id=plugin_obj.id)
                user_specific_conf_json = stmt.scalar() # scalar_one_or_none might be better if expecting one or none
            except ValueError:
                print(f"SERVICE-PLUGIN: Invalid UUID format for user_id {user_id_str} when fetching config.")
            except Exception as e:
                print(f"SERVICE-PLUGIN: Error fetching user_specific_config for {plugin_obj.id}: {e}")


            installed_plugins_details.append({
                "plugin_id": plugin_obj.id,
                "name": plugin_obj.name,
                "version": plugin_obj.version,
                "is_enabled": True, # TODO: Implement if is_enabled is on association table
                "category": plugin_obj.category,
                "subCategory": plugin_obj.sub_category,
                "icon": plugin_obj.icon_url_or_emoji,
                "user_configuration": json.loads(user_specific_conf_json) if user_specific_conf_json else None
            })
        return installed_plugins_details

    def install_plugin_for_user(self, db: Session, user_id_str: str, plugin_id: str, user_specific_config: dict = None):
        print(f"SERVICE-PLUGIN: User (str ID {user_id_str}) attempting to install plugin '{plugin_id}'")
        # UserService now handles the append and commit for the relationship
        success = user_service_instance.add_plugin_to_user(db, user_id_str, plugin_id)
        if not success:
            # Check if plugin or user was not found, or if already installed
            # UserService.add_plugin_to_user should ideally return more specific info or raise errors
            return {"success": False, "error": "Failed to install plugin for user (user/plugin not found or already installed)."}

        # If initial user-specific config needs to be set on the association table:
        if user_specific_config is not None:
            try:
                user_uuid = uuid.UUID(user_id_str)
                stmt = user_installed_plugins_table.update().\
                    where(user_installed_plugins_table.c.user_id == user_uuid).\
                    where(user_installed_plugins_table.c.plugin_id == plugin_id).\
                    values(user_specific_plugin_config_json=json.dumps(user_specific_config))
                db.execute(stmt)
                db.commit()
                print(f"SERVICE-PLUGIN: Set initial user-specific config for plugin '{plugin_id}', user '{user_id_str}'.")
            except Exception as e:
                db.rollback()
                print(f"SERVICE-PLUGIN ERROR: Failed to set initial user-specific config: {e}")
                return {"success": False, "error": f"Plugin installed, but failed to set initial config: {str(e)}"}
        
        plugin = db.query(Plugin).filter_by(id=plugin_id).first() # Fetch plugin name for message
        return {"success": True, "message": f"Plugin '{plugin.name if plugin else plugin_id}' installed for user."}


    def uninstall_plugin_for_user(self, db: Session, user_id_str: str, plugin_id: str):
        print(f"SERVICE-PLUGIN: User (str ID {user_id_str}) uninstalling plugin '{plugin_id}'")
        plugin = db.query(Plugin).filter_by(id=plugin_id).first()
        if plugin and plugin.is_core_plugin:
             return {"success": False, "error": "Core plugins cannot be uninstalled."}

        success = user_service_instance.remove_plugin_from_user(db, user_id_str, plugin_id)
        if success:
            return {"success": True, "message": "Plugin uninstalled successfully."}
        else:
            # Determine if it was "not found" or other error from UserService
            return {"success": False, "error": "Failed to uninstall plugin (not found or DB error)."}
    
    # get_user_plugin_configuration and update_user_plugin_configuration remain largely the same as provided before,
    # ensuring they use user_id_str and convert to uuid.UUID for querying user_installed_plugins_table.

    def get_user_plugin_configuration(self, db: Session, user_id_str: str, plugin_id: str):
        print(f"SERVICE-PLUGIN: Getting user config for plugin '{plugin_id}', user_id_str {user_id_str}")
        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
             return {"success": False, "error": f"Invalid user ID format: {user_id_str}"}

        config_json = db.query(user_installed_plugins_table.c.user_specific_plugin_config_json).\
            filter(user_installed_plugins_table.c.user_id == user_uuid,
                   user_installed_plugins_table.c.plugin_id == plugin_id).scalar()
        
        plugin_info = db.query(Plugin.name, Plugin.default_config_schema_json).filter_by(id=plugin_id).first()

        # Check if the user actually has the plugin installed (important for get config)
        user_has_plugin = db.query(User).filter(User.id == user_uuid, User.installed_plugins.any(id=plugin_id)).count() > 0
        
        if not user_has_plugin:
            return {"success": False, "error": "Plugin not installed by this user."}

        return {
            "success": True, "plugin_id": plugin_id, 
            "plugin_name": plugin_info.name if plugin_info else plugin_id,
            "configuration": json.loads(config_json) if config_json else None,
            "default_schema": json.loads(plugin_info.default_config_schema_json) if plugin_info and plugin_info.default_config_schema_json else None
        }


    def update_user_plugin_configuration(self, db: Session, user_id_str: str, plugin_id: str, new_config: dict):
        print(f"SERVICE-PLUGIN: Updating user config for plugin '{plugin_id}', user_id_str {user_id_str}")
        try:
            user_uuid = uuid.UUID(user_id_str)
        except ValueError:
             return {"success": False, "error": f"Invalid user ID format: {user_id_str}"}

        user_has_plugin = db.query(User).filter(User.id == user_uuid, User.installed_plugins.any(id=plugin_id)).count() > 0
        if not user_has_plugin:
            return {"success": False, "error": "Plugin not installed by this user. Cannot update configuration."}

        # TODO: Validate new_config against plugin's default_config_schema_json
        
        stmt = user_installed_plugins_table.update().\
            where(user_installed_plugins_table.c.user_id == user_uuid).\
            where(user_installed_plugins_table.c.plugin_id == plugin_id).\
            values(user_specific_plugin_config_json=json.dumps(new_config),
                   installed_at=datetime.datetime.now(datetime.timezone.utc) # Also update timestamp on config change
                  )
        try:
            result = db.execute(stmt)
            if result.rowcount == 0: # Should not happen if user_has_plugin check passed
                db.rollback()
                # This implies the record in user_installed_plugins might be missing,
                # which contradicts the user.installed_plugins.append() logic.
                # A more robust way is to INSERT or UPDATE (UPSERT) for the config.
                # For now, assume install creates the row, config updates it.
                print(f"SERVICE-PLUGIN WARN: No row found in user_installed_plugins to update config for user {user_uuid}, plugin {plugin_id}. This might indicate an issue if plugin was supposedly installed.")
                # Attempt an insert if you want to create config if it doesn't exist for an installed plugin
                # This is complex as the table is an association table, usually rows are made by relationship appends.
                # Best to ensure user_installed_plugins_table row is created on user.installed_plugins.append()
                return {"success": False, "error": "Failed to find user-plugin association to update config for."}

            db.commit()
            return {"success": True, "message": "User-specific plugin configuration updated."}
        except Exception as e:
            db.rollback()
            print(f"SERVICE-PLUGIN ERROR: Update user plugin config failed: {e}")
            return {"success": False, "error": f"DB error: {str(e)}"}

