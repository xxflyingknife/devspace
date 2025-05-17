# devspace/backend/services/user_service.py
from sqlalchemy.orm import Session, joinedload
from database.models import User, Plugin, OAuthAccount # Ensure Plugin and OAuthAccount are imported
# user_installed_plugins_table is not directly queried here often, relationships are used.
# from .auth_service import AuthService # Import if password hashing is done here (better in AuthService)
import uuid # For UUID conversion
from typing import Union, Optional, List # Add List if you use list[Plugin]

# If you instantiate AuthService here for password hashing:
# from .auth_service import AuthService
# auth_service_instance = AuthService()

class UserService:
    def __init__(self):
        print("UserService initialized (expecting UUID for user IDs).")

    def get_user_by_id(self, db: Session, user_uuid: uuid.UUID) -> Optional[User]: # Expects a UUID object
        print(f"SERVICE-USER: Getting user by UUID object: {user_uuid}")
        return db.query(User).filter(User.id == user_uuid).first()

    def get_user_by_id_str(self, db: Session, user_id_str: str) -> Optional[User]: # Convenience for string input
        print(f"SERVICE-USER: Getting user by ID string: {user_id_str}")
        try:
            user_uuid_obj = uuid.UUID(user_id_str)
            return self.get_user_by_id(db, user_uuid_obj)
        except ValueError:
            print(f"SERVICE-USER: Invalid UUID string format for user_id: {user_id_str}")
            return None

    def get_user_by_email(self, db: Session, email: str) -> Optional[User]:
        print(f"SERVICE-USER: Getting user by email: {email}")
        return db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, db: Session, username: str) -> Optional[User]:
        if not username: return None
        print(f"SERVICE-USER: Getting user by username: {username}")
        return db.query(User).filter(User.username == username).first()

    def create_user(self, db: Session, email: str, hashed_password_val: str = None, username: str = None, full_name: str = None, is_active: bool = True, user_id_to_set: uuid.UUID = None) -> User:
        """
        Creates a new user. Password should already be hashed.
        Can optionally take a pre-generated UUID for the user ID.
        """
        print(f"SERVICE-USER: Creating user. Email: {email}, Username: {username}")
        
        # Check for existing user by email or username before creating
        if self.get_user_by_email(db, email):
            raise ValueError(f"User with email '{email}' already exists.")
        if username and self.get_user_by_username(db, username):
            raise ValueError(f"User with username '{username}' already exists.")

        db_user_params = {
            "email": email,
            "hashed_password": hashed_password_val,
            "username": username,
            "full_name": full_name,
            "is_active": is_active
        }
        if user_id_to_set: # If a specific UUID is provided (e.g., for mock user seeding)
            db_user_params["id"] = user_id_to_set
        
        db_user = User(**db_user_params)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"SERVICE-USER: User created with ID: {db_user.id}")
        return db_user
    
    def update_user(self, db: Session, user_id_str: str, updates: dict) -> Optional[User]:
        print(f"SERVICE-USER: Updating user ID str: {user_id_str} with data: {updates}")
        user = self.get_user_by_id_str(db, user_id_str) # Use the str version to handle conversion
        if not user:
            return None
        
        for key, value in updates.items():
            # Protect critical fields from being updated this way
            if hasattr(user, key) and key not in ["id", "hashed_password", "email", "username", "created_at"]: 
                setattr(user, key, value)
        try:
            user.updated_at = datetime.datetime.now(datetime.timezone.utc) # Manually set if not auto by DB
            db.commit()
            db.refresh(user)
            return user
        except Exception as e:
            db.rollback()
            print(f"SERVICE-USER ERROR: Update failed for user {user_id_str}: {e}")
            return None

    def get_or_create_oauth_user(self, db: Session, provider_name: str, provider_user_id: str, email: str, full_name: str = None) -> Optional[User]:
        print(f"SERVICE-USER: Get/Create OAuth user. Provider: {provider_name}, ProvID: {provider_user_id}, Email: {email}")
        oauth_account = db.query(OAuthAccount).filter_by(provider_name=provider_name, provider_user_id=provider_user_id).first()
        if oauth_account:
            print(f"SERVICE-USER: Found existing OAuth account for user ID: {oauth_account.user_id}")
            return oauth_account.user # User object is already a UUID here
        
        user = self.get_user_by_email(db, email)
        if not user:
            print(f"SERVICE-USER: No existing user for email {email}. Creating new user for OAuth.")
            try:
                user = self.create_user(db, email=email, full_name=full_name, username=None, hashed_password_val=None)
            except ValueError as ve: # Catch if email already exists (should have been caught by get_user_by_email)
                print(f"SERVICE-USER Warning during OAuth user creation: {ve}")
                user = self.get_user_by_email(db, email) # Try fetching again if it was a race condition
        
        if not user:
            print(f"SERVICE-USER ERROR: Failed to create or find user for OAuth details.")
            return None

        print(f"SERVICE-USER: Linking OAuth account ({provider_name}/{provider_user_id}) to user ID: {user.id}")
        new_oauth_account = OAuthAccount(user_id=user.id, provider_name=provider_name, provider_user_id=provider_user_id)
        db.add(new_oauth_account)
        try:
            db.commit()
            return user
        except Exception as e:
            db.rollback()
            print(f"SERVICE-USER ERROR: Failed to link OAuth account: {e}")
            return None

    def get_installed_plugins_for_user(self, db: Session, user_id_str: str) -> list[Plugin]:
        print(f"SERVICE-USER: Get installed plugins for user_id_str: {user_id_str}")
        user = self.get_user_by_id_str(db, user_id_str)
        if not user:
            return []
        # Assuming User.installed_plugins relationship is set to lazy="dynamic" or default (select)
        # For eager loading, it would be options(joinedload(User.installed_plugins)) in get_user_by_id_str
        return user.installed_plugins 

    def add_plugin_to_user(self, db: Session, user_id_str: str, plugin_id: str):
        print(f"SERVICE-USER: Adding plugin '{plugin_id}' to user '{user_id_str}'")
        user = self.get_user_by_id_str(db, user_id_str)
        plugin = db.query(Plugin).filter_by(id=plugin_id).first()

        if user and plugin:
            if plugin not in user.installed_plugins:
                user.installed_plugins.append(plugin)
                try:
                    db.commit()
                    print(f"SERVICE-USER: Plugin '{plugin_id}' successfully added to user '{user_id_str}'.")
                    return True
                except Exception as e:
                    db.rollback()
                    print(f"SERVICE-USER ERROR: DB error adding plugin to user: {e}")
                    return False
            else:
                print(f"SERVICE-USER: Plugin '{plugin_id}' already installed for user '{user_id_str}'.")
                return True # Considered success as the state is achieved
        print(f"SERVICE-USER: User or Plugin not found for add_plugin_to_user. User found: {bool(user)}, Plugin found: {bool(plugin)}")
        return False

    def remove_plugin_from_user(self, db: Session, user_id_str: str, plugin_id: str):
        print(f"SERVICE-USER: Removing plugin '{plugin_id}' from user '{user_id_str}'")
        user = self.get_user_by_id_str(db, user_id_str)
        plugin = db.query(Plugin).filter_by(id=plugin_id).first()
        if user and plugin:
            if plugin in user.installed_plugins:
                user.installed_plugins.remove(plugin)
                try:
                    db.commit()
                    print(f"SERVICE-USER: Plugin '{plugin_id}' successfully removed from user '{user_id_str}'.")
                    return True
                except Exception as e:
                    db.rollback()
                    print(f"SERVICE-USER ERROR: DB error removing plugin from user: {e}")
                    return False
            else:
                print(f"SERVICE-USER: Plugin '{plugin_id}' not found in user's installed list.")
                return False 
        print(f"SERVICE-USER: User or Plugin not found for remove_plugin_from_user. User found: {bool(user)}, Plugin found: {bool(plugin)}")
        return False


