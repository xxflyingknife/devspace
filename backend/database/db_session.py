from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager # <--- ADD THIS IMPORT

# Import the URI from the central config
from config import config as app_config # Renamed to avoid conflict with 'config' in K8s client

print(f"DEBUG: db_session.py - Loaded SQLALCHEMY_DATABASE_URI: {app_config.SQLALCHEMY_DATABASE_URI}")

# Add connect_args for SQLite to allow multiple threads (e.g. Flask dev server)
engine_args = {"echo": app_config.SQLALCHEMY_ECHO}
if "sqlite" in app_config.SQLALCHEMY_DATABASE_URI:
    engine_args["connect_args"] = {"check_same_thread": False}

engine = create_engine(app_config.SQLALCHEMY_DATABASE_URI, **engine_args)

# SessionLocal will be the factory for new sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for declarative models
Base = declarative_base()

@contextmanager
def get_db_session():
    """
    Provides a database session. Call db.close() when done.
    Recommended to use with a context manager or dependency injector.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_tables(app_instance_for_context=None):
    """
    Initializes the database and creates tables if they don't exist.
    Call this once at application startup.
    Requires all model modules to be imported before calling.
    """
    # Import all model modules here so Base knows about them.
    # This is crucial for create_all to work.
    from . import models # Relative import assuming models.py is in the same 'database' package
    # Add imports for any other files where you define models, if separated.

    print(f"Initializing database tables at {engine.url}...")
    Base.metadata.create_all(bind=engine)
    print("Database tables process complete (created if they didn't exist).")

