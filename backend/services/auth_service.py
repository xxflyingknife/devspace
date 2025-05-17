# devspace/backend/services/auth_service.py
from datetime import datetime, timedelta, timezone
import jwt # PyJWT library: pip install PyJWT
from passlib.context import CryptContext # For password hashing: pip install passlib[bcrypt]
from sqlalchemy.orm import Session

from config import config as app_config # Your application config
from .user_service import UserService # To get user details
from database.models import User # To type hint
from typing import Union, Optional, List

# It's good practice to instantiate services if they are mostly stateless,
# or use a dependency injection pattern.
user_service_instance = UserService()

# Configure password hashing
# Using bcrypt is a good default
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

JWT_ALGORITHM = "HS256" # Should match your chosen algorithm
# ACCESS_TOKEN_EXPIRE_MINUTES = 30 # From config or define here
ACCESS_TOKEN_EXPIRE_MINUTES = app_config.DEBUG and 60*24*7 or 30 # 7 days for debug, 30 mins for prod

class AuthService:
    def __init__(self):
        print("AuthService initialized.")
        # self.user_service = UserService() # Or inject if not using global instance

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        if not hashed_password: # User might not have a password (e.g. OAuth only)
            return False
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)}) # Add issued at time
        
        # SECRET_KEY must be strong and kept secret, loaded from config
        encoded_jwt = jwt.encode(to_encode, app_config.SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt

    def decode_access_token(self, token: str) -> Optional[dict]:
        try:
            payload = jwt.decode(token, app_config.SECRET_KEY, algorithms=[JWT_ALGORITHM])
            # You might want to check 'exp' here too, though PyJWT can do it with options
            # if datetime.fromtimestamp(payload.get("exp", 0), timezone.utc) < datetime.now(timezone.utc):
            #     print("Token has expired.")
            #     return None
            return payload # Contains 'sub', 'user_id', 'exp', 'iat'
        except jwt.ExpiredSignatureError:
            print("AUTH SERVICE: Token expired.")
            return None
        except jwt.InvalidTokenError as e:
            print(f"AUTH SERVICE: Invalid token: {e}")
            return None
        except Exception as e:
            print(f"AUTH SERVICE: Error decoding token: {e}")
            return None


    def authenticate_user(self, db: Session, identifier: str, password: str) -> Optional[User]:
        """
        Authenticates a user with username or email, and password.
        Returns User ORM object on success, None on failure.
        """
        print(f"SERVICE-AUTH: Attempting to authenticate user: {identifier}")
        # Try finding user by username first, then by email
        user = user_service_instance.get_user_by_username(db, identifier)
        if not user:
            user = user_service_instance.get_user_by_email(db, identifier)
        
        if not user:
            print(f"SERVICE-AUTH: User '{identifier}' not found.")
            return None
        
        if not user.hashed_password: # User exists but has no password (e.g. OAuth only account)
            print(f"SERVICE-AUTH: User '{identifier}' found but has no local password set.")
            return None

        if not self.verify_password(password, user.hashed_password):
            print(f"SERVICE-AUTH: Invalid password for user '{identifier}'.")
            return None
        
        # Update last_login_at
        user.last_login_at = datetime.now(timezone.utc)
        try:
            db.commit()
            db.refresh(user)
        except Exception as e:
            db.rollback()
            print(f"SERVICE-AUTH: Error updating last_login_at for user {user.id}: {e}")
            # Still consider login successful if password was correct

        print(f"SERVICE-AUTH: User '{identifier}' authenticated successfully (ID: {user.id}).")
        return user # Return the SQLAlchemy User object
    
    # TODO: Add methods for OAuth flows:
    # def generate_oauth_redirect_url(self, provider_name: str) -> str | None: ...
    # def process_oauth_callback(self, provider_name: str, code: str, state: str) -> Optional[User]: ...
    # This would involve using libraries like 'Authlib' or 'requests-oauthlib'

# auth_service_instance = AuthService() # For singleton pattern


