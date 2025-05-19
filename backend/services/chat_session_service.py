# devspace/backend/services/chat_session_service.py
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
import uuid
import json
import datetime # Ensure datetime is imported
from typing import Union, Optional, List

from database.db_session import SessionLocal
from database.models import Space, ChatSession, ChatMessage, ChatMessageRoleEnum
# For LangChain history formatting, if you do it here:
# from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage 

class ChatSessionService:
    def __init__(self):
        print("ChatSessionService initialized.")

    def get_or_create_default_session(self, db: Session, space_id: str, user_id: str = None) -> Optional[ChatSession]:
        # user_id might be used later if sessions are user-specific within a space
        print(f"SERVICE-SESSION: Getting/Creating default session for space_id: {space_id}")
        space = db.query(Space).filter_by(id=space_id).first()
        if not space:
            print(f"SERVICE-SESSION ERROR: Space {space_id} not found.")
            return None

        latest_session = (
            db.query(ChatSession)
            .filter_by(space_id=space_id)
            # .filter_by(user_id=user_id) # If user-specific sessions
            .order_by(ChatSession.last_accessed_at.desc())
            .first()
        )

        if latest_session:
            print(f"SERVICE-SESSION: Found latest session {latest_session.id} for space {space_id}")
            latest_session.last_accessed_at = datetime.datetime.now(datetime.timezone.utc)
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Error updating last_accessed_at: {e}")
            return latest_session
        else:
            print(f"SERVICE-SESSION: No existing session for space {space_id}. Creating new default.")
            session_name = f"Conversation - {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M')}"
            return self.create_session(db, space_id, name=session_name, user_id=user_id)

    def create_session(self, db: Session, space_id: int, name: str = None, user_id: str = None, llm_agent_config_snapshot: dict = None) -> Optional[ChatSession]:
        print(f"SERVICE-SESSION: Creating new session for space_id: {space_id}, name: {name}")
        space = db.query(Space).filter_by(id=space_id).first()
        if not space:
            print(f"SERVICE-SESSION ERROR: Space {space_id} not found.")
            return None
        
        new_session_id = str(uuid.uuid4())
        session = ChatSession(
            id=new_session_id,
            space_id=space_id,
            # user_id=user_id, # If user-specific
            name=name or f"Chat - {new_session_id[:8]}",
            llm_agent_config_snapshot_json=json.dumps(llm_agent_config_snapshot) if llm_agent_config_snapshot else None,
            last_accessed_at = datetime.datetime.now(datetime.timezone.utc) # Explicitly set on create too
        )
        db.add(session)
        try:
            db.commit()
            db.refresh(session)
            print(f"SERVICE-SESSION: Created session {session.id}")
            return session
        except Exception as e:
            db.rollback()
            print(f"SERVICE-SESSION ERROR: Failed to create session: {e}")
            return None

    def get_session_by_id(self, db: Session, session_id: str) -> Optional[ChatSession]:
        print(f"SERVICE-SESSION: Getting session by id: {session_id}")
        session = db.query(ChatSession).filter_by(id=session_id).first()
        if session:
            session.last_accessed_at = datetime.datetime.now(datetime.timezone.utc)
            try:
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Error updating last_accessed_at for session {session_id}: {e}")
        return session

    def add_message_to_session(self, db: Session, session_id: str, role_str: str, content: str, metadata: dict = None) -> Optional[ChatSession]:
        print(f"SERVICE-SESSION: Adding message to session {session_id}. Role: {role_str}")
        session = db.query(ChatSession).filter_by(id=session_id).first()
        if not session:
            print(f"SERVICE-SESSION ERROR: Session {session_id} not found.")
            return None
        
        try:
            role_enum = ChatMessageRoleEnum(role_str.lower())
        except ValueError:
            print(f"SERVICE-SESSION ERROR: Invalid message role '{role_str}'.")
            return None

        message = ChatMessage(
            session_id=session_id,
            role=role_enum,
            content=content,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        db.add(message)
        session.last_accessed_at = datetime.datetime.now(datetime.timezone.utc)
        try:
            db.commit()
            db.refresh(message)
            print(f"SERVICE-SESSION: Added message {message.id} to session {session_id}")
            return message
        except Exception as e:
            db.rollback()
            print(f"SERVICE-SESSION ERROR: Failed to add message: {e}")
            return None

    def get_messages_for_session(self, db: Session, session_id: str, limit: int = 50, offset: int = 0) -> list[ChatMessage]:
        print(f"SERVICE-SESSION: Getting messages for session {session_id}, limit {limit}, offset {offset}")
        return (
            db.query(ChatMessage)
            .filter_by(session_id=session_id)
            .order_by(ChatMessage.timestamp.asc()) # Chronological for display
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_langchain_formatted_chat_history(self, db: Session, session_id: str, window_k: int = 10):
        print(f"SERVICE-SESSION: Getting LangChain history for session {session_id}, k={window_k}")
        # Fetch a bit more than k*2 to account for tool messages not being simple user/ai turns
        db_messages = (
            db.query(ChatMessage)
            .filter_by(session_id=session_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(window_k * 3) # Fetch more to accommodate tool messages if needed
            .all()
        )
        db_messages.reverse() # Back to chronological

        # This part needs langchain_core.messages if you are using specific message types
        # For now, returning a simpler structure that LLMInteractionService might need to adapt
        # or if your LangChain memory can be built from dicts.
        history_for_memory = []
        for msg in db_messages:
            history_for_memory.append(
                {"role": msg.role.value, "content": msg.content, "metadata": json.loads(msg.metadata_json) if msg.metadata_json else None}
            )
        print(f"SERVICE-SESSION: Prepared history list with {len(history_for_memory)} entries for LangChain memory.")
        return history_for_memory


    def delete_session(self, db: Session, session_id: str) -> bool:
        print(f"SERVICE-SESSION: Deleting session {session_id}")
        session = db.query(ChatSession).filter_by(id=session_id).first()
        if session:
            db.delete(session)
            try:
                db.commit()
                return True
            except Exception as e:
                db.rollback(); print(f"SERVICE-SESSION ERROR: Delete failed: {e}")
        return False


