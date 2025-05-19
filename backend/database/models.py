from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLAlchemyEnum, ForeignKey, JSON, Boolean, UniqueConstraint, Table 
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # For server_default=func.now()
from sqlalchemy.dialects.postgresql import UUID # Or use sqlalchemy_utils for cross-db UUID
from sqlalchemy_utils import UUIDType # <--- ADD THIS IMPORT
import uuid
from .db_session import Base # Import Base from db_session.py
import enum
import sqlalchemy as sa

# --- Enums (can also be in core/enums.py and imported) ---
class SpaceTypeEnum(enum.Enum):
    DEV = "dev"
    OPS = "ops"

class LLMSourceEnum(enum.Enum):
    GEMINI = "gemini"
    CHATGPT = "chatgpt"
    OTHER = "other"

class ChatMessageRoleEnum(enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"


# Association table for User <-> Plugin (Many-to-Many)
user_installed_plugins_table = Table("user_installed_plugins", Base.metadata,
    Column("user_id", UUIDType(binary=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True), # <--- MODIFIED HERE
    Column("plugin_id", String(255), ForeignKey("plugins.id", ondelete="CASCADE"), primary_key=True),
    Column("installed_at", DateTime(timezone=True), server_default=func.now()),
    # Optional: Store user-specific GLOBAL configuration for this plugin here
    # This is NOT per-space config, but rather user's general settings for an installed plugin.
    Column("user_specific_plugin_config_json", Text, nullable=True)
)


# --- Plugin Model (Central Registry for Available Plugins) ---
class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(String(255), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String(50), nullable=False)
    author = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False) 
    sub_category = Column(String(100), nullable=True)
    target_space_type = Column(SQLAlchemyEnum(SpaceTypeEnum), nullable=True) # Use the existing SpaceTypeEnum

    entry_point_config_json = Column(Text, nullable=True)
    default_config_schema_json = Column(Text, nullable=True)
    icon_url_or_emoji = Column(String(255), nullable=True)
    is_core_plugin = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Add this relationship:
    installed_by_users = relationship(
        "User", # The class name of the User model
        secondary=user_installed_plugins_table,
        back_populates="installed_plugins",
        lazy="dynamic"
    )

    # space_installations = relationship("SpacePluginConfig", back_populates="plugin_info")

    def __repr__(self):
        return f"<Plugin(id='{self.id}', name='{self.name}', version='{self.version}')>"

# --- User Model ---
class User(Base):
    __tablename__ = "users"

    #id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    # Alternative for UUID:
    #id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=sa.text("gen_random_uuid()"))
    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4, index=True, unique=True)

    username = Column(String(100), unique=True, index=True, nullable=True) # Can be null if only OAuth login initially
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(512), nullable=True) # Null if only OAuth or if password not set yet

    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False) # For admin roles

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    spaces = relationship("Space", back_populates="owner", cascade="all, delete-orphan")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    
    installed_plugins = relationship(
        "Plugin", # The class name of the Plugin model
        secondary=user_installed_plugins_table,
        back_populates="installed_by_users",
        lazy="dynamic" # Allows further filtering on the relationship
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"


# --- OAuth Account Model (for 3rd party logins) ---
class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    provider_name = Column(String(50), nullable=False)  # e.g., "google", "github"
    provider_user_id = Column(String(255), nullable=False) # ID from the OAuth provider

    # Optional: Store tokens securely if your app needs to make API calls on behalf of the user
    # access_token_encrypted = Column(String(1024), nullable=True) # Always encrypt sensitive tokens
    # refresh_token_encrypted = Column(String(1024), nullable=True)
    # token_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="oauth_accounts")

    # Ensure a user can only link one account from a specific provider
    __table_args__ = (UniqueConstraint("provider_name", "provider_user_id", name="_oauth_provider_user_uc"),)

    def __repr__(self):
        return f"<OAuthAccount(provider='{self.provider_name}', user_id={self.user_id})>"


# --- Chat Session Model ---
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True) # Auto-generate UUID
    space_id = Column(Integer, ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    summary = Column(Text, nullable=True)
    llm_agent_config_snapshot_json = Column(Text, nullable=True)
    
    space = relationship("Space", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.timestamp")

    def __repr__(self):
        return f"<ChatSession(id='{self.id}', space_id={self.space_id}, name='{self.name}')>"

# --- Chat Message Model ---
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(SQLAlchemyEnum(ChatMessageRoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True) # For tool calls/results details
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("ChatSession", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role='{self.role.value}')>"




# --- Main Space Model ---
class Space(Base):
    __tablename__ = "spaces"

    # Consider using UUID for id:
    from sqlalchemy.dialects.postgresql import UUID
    #id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4, index=True, unique=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Or False if a space MUST have an owner
    owner = relationship("User", back_populates="spaces")

    name = Column(String(255), nullable=False, index=True)
    type = Column(SQLAlchemyEnum(SpaceTypeEnum), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Backend settings stored directly or as JSON
    llm_source = Column(SQLAlchemyEnum(LLMSourceEnum), default=LLMSourceEnum.GEMINI)
    # For API keys, store references or encrypted values, never plain text in DB
    # This is a placeholder; actual key storage needs a secure vault or env vars referenced by ID
    llm_api_key_placeholder = Column(String(255), nullable=True) # e.g., "GOOGLE_API_KEY_FOR_SPACE_XYZ"
    llm_model_name = Column(String(100), nullable=True)
    agent_config_json = Column(Text, nullable=True) # Store agent specific config as JSON string

    mcp_server_url = Column(String(512), nullable=True)
    mcp_server_api_key_placeholder = Column(String(255), nullable=True) # Placeholder

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships (defined after related models)
    dev_config = relationship("DevSpaceConfig", back_populates="space", uselist=False, cascade="all, delete-orphan")
    ops_config = relationship("OpsSpaceConfig", back_populates="space", uselist=False, cascade="all, delete-orphan")
    chat_session_notes = relationship("ChatSessionNote", back_populates="space", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="space", cascade="all, delete-orphan", lazy="dynamic") 
    # Add this line
    # installed_plugins = relationship("SpacePluginConfig", back_populates="space", cascade="all, delete-orphan", lazy="dynamic")

    def __repr__(self):
        return f"<Space(id={self.id}, name='{self.name}', type='{self.type.value}')>"


class DevSpaceConfig(Base):
    __tablename__ = "dev_space_configs"
    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(UUIDType(binary=False), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, unique=True)
    git_repo_url = Column(String(512), nullable=True) # This field is key
    default_branch = Column(String(100), nullable=True, default="main")
    # --- NEW FIELDS FOR CACHING ---
    cached_file_tree_json = Column(Text, nullable=True) # Store the tree as a JSON string
    cached_tree_branch = Column(String(255), nullable=True) # Which branch this cache is for
    tree_last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    # --- END NEW FIELDS ---
    k8s_environments_json = Column(Text, nullable=True)
    space = relationship("Space", back_populates="dev_config")

    def __repr__(self):
        return f"<DevSpaceConfig(space_id={self.space_id}, git_repo_url='{self.git_repo_url}')>"


# --- Ops Space Specific Configuration ---
class OpsSpaceConfig(Base):
    __tablename__ = "ops_space_configs"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(UUIDType(binary=False), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, unique=True)
    # CMDB connection details or API endpoint for fetching workloads
    cmdb_config_json = Column(Text, nullable=True) # e.g., {"api_url": "...", "auth_token_ref": "..."}

    # List of K8s clusters/contexts to monitor for workloads
    # e.g., [{"name": "Prod Cluster A", "context": "prod-a-ctx", "namespaces": ["ns1", "ns2"]}, ...]
    k8s_cluster_configs_json = Column(Text, nullable=True)

    # Metadata to help identify specific workloads of interest (e.g., labels, names)
    # e.g., [{"type": "deployment", "name_pattern": "frontend-*", "namespace": "prod"}]
    monitored_workloads_metadata_json = Column(Text, nullable=True)

    # Enabled AIOps skills and their configurations for this space
    # e.g., {"anomaly_detection": {"sensitivity": "high"}, "root_cause_analysis_v2": {"enabled": true}}
    aiops_skills_config_json = Column(Text, nullable=True)

    space = relationship("Space", back_populates="ops_config")

    def __repr__(self):
        return f"<OpsSpaceConfig(space_id={self.space_id})>"


# --- Chat Session Notes / Saved Prompts ---
class ChatSessionNote(Base):
    __tablename__ = "chat_session_notes"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(UUIDType(binary=False), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, unique=True)
    title = Column(String(255), nullable=False)
    content_json = Column(Text, nullable=False) # Store conversation history or prompt itself as JSON string
    # Example content: {"type": "prompt_template", "template": "Analyze logs for pod {{pod_name}} in {{namespace}} for errors related to 'CrashLoopBackOff'."}
    # Or {"type": "chat_log", "messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    space = relationship("Space", back_populates="chat_session_notes")

    def __repr__(self):
        return f"<ChatSessionNote(id={self.id}, title='{self.title}', space_id={self.space_id})>"


# --- Scheduled Tasks (Primarily for Ops Spaces) ---
class ScheduledTask(Base):
    __tablename__ = "scheduled_tasks"

    id = Column(Integer, primary_key=True, index=True)
    space_id = Column(UUIDType(binary=False), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cron_schedule = Column(String(100), nullable=False) # e.g., "0 2 * * *" for 2 AM daily
    
    # What action this task performs
    task_type = Column(String(100), nullable=False) # e.g., "RUN_AIOPS_SKILL", "CALL_MCP_JOB", "K8S_ACTION"
    task_parameters_json = Column(Text, nullable=True) # JSON string for parameters

    is_enabled = Column(Boolean, default=True, nullable=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_run_status = Column(String(50), nullable=True) # e.g., "SUCCESS", "FAILED"
    last_run_log = Column(Text, nullable=True) # Output or error from last run

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # space = relationship("Space") # If directly related to space, or via OpsSpaceConfig

    def __repr__(self):
        return f"<ScheduledTask(id={self.id}, name='{self.name}', schedule='{self.cron_schedule}')>"

# You might add more models later, e.g., for Users, specific K8s resource snapshots, etc.
