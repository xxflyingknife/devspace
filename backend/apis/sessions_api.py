# devspace/backend/apis/sessions_api.py
from flask import Blueprint, request, jsonify
from database.db_session import get_db_session # Using the generator context manager
import contextlib
from services.chat_session_service import ChatSessionService
from database.db_session import SessionLocal # <--- Import SessionLocal

sessions_bp = Blueprint('sessions_api', __name__)
chat_session_service = ChatSessionService()


@sessions_bp.route('/space/<string:space_id>/active-chat', methods=['GET'])
def get_active_chat_session_for_space(space_id: str):
    """
    Gets the latest/default chat session for a space, along with its recent messages.
    This is what the frontend calls when entering a space's chat.
    """
    # MESSAGES_LIMIT_ON_LOAD = 20 # How many recent messages to load initially
    # LangChain memory usually handles windowing, so sending a moderate amount is fine.
    # Let get_langchain_formatted_chat_history handle the limit via its window_k
    CHAT_HISTORY_WINDOW_K = 15 # Number of turns (user+AI) for LangChain memory
    db = SessionLocal() # Create a new session

    try:
        #with contextlib.contextmanager(get_db_session)() as db:
        session = chat_session_service.get_or_create_default_session(db, space_id)
        if not session:
            return jsonify({"error": f"Could not get or create session for space {space_id}"}), 404

        # Fetch recent messages formatted for LangChain memory (or a simpler format for UI)
        # The get_langchain_formatted_chat_history currently returns a list of dicts
        # {role, content, metadata} which is good for frontend.
        recent_messages_for_ui = chat_session_service.get_langchain_formatted_chat_history(
            db, session.id, window_k=CHAT_HISTORY_WINDOW_K 
        )
            
        # The actual LangChain message objects are not directly serializable to JSON.
        # We'll send the dict representation.

        # TODO: Get token info if available for this session
        token_info = {"message": f"Session {session.id[-8:]} loaded. Token usage info placeholder."}

        return jsonify({
            "session_id": session.id,
            "session_name": session.name,
            "messages": recent_messages_for_ui, # Array of {role, content, metadata} dicts
            "token_info": token_info,
            "llm_agent_config_snapshot": json.loads(session.llm_agent_config_snapshot_json) if session.llm_agent_config_snapshot_json else None
        }), 200
    except Exception as e:
        print(f"API SESSIONS ERROR: get_active_chat_session_for_space: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Failed to retrieve active chat session"}), 500

@sessions_bp.route('/space/<string:space_id>', methods=['GET'])
def list_sessions_for_space(space_id: str):
    """Lists all chat sessions for a given space."""
    db = SessionLocal() # Create a new session
    try:
        #with contextlib.contextmanager(get_db_session)() as db:
        # TODO: Add actual service method for this in ChatSessionService
        # sessions = chat_session_service.get_sessions_for_space(db, space_id)
        # For now, just get default or latest as an example if only one active.
        session = chat_session_service.get_or_create_default_session(db, space_id)
        if session:
            return jsonify([{
                "id": session.id, "name": session.name, 
                "created_at": session.created_at.isoformat(), 
                "last_accessed_at": session.last_accessed_at.isoformat()
            }])
        return jsonify([]) # Return empty list if no sessions
    except Exception as e:
        print(f"API SESSIONS ERROR: list_sessions_for_space: {e}")
        return jsonify({"error": "Failed to retrieve sessions"}), 500


@sessions_bp.route('/space/<string:space_id>', methods=['POST'])
def create_new_session_api(space_id: str):
    """Creates a new chat session for a space."""
    data = request.json
    session_name = data.get('name') # Optional name from frontend
    # user_id = get_current_user_id() # TODO: Implement user auth
    db = SessionLocal() # Create a new session
    try:
        #with contextlib.contextmanager(get_db_session)() as db:
        new_session = chat_session_service.create_session(db, space_id, name=session_name)
        if new_session:
            return jsonify({"id": new_session.id, "name": new_session.name, "created_at": new_session.created_at.isoformat()}), 201
        return jsonify({"error": "Failed to create session"}), 400
    except Exception as e:
        print(f"API SESSIONS ERROR: create_new_session_api: {e}")
        return jsonify({"error": "Server error creating session"}), 500


@sessions_bp.route('/<string:session_id>/messages', methods=['GET'])
def get_session_messages_api(session_id):
    """Gets all messages for a specific session."""
    # TODO: Add pagination query params (limit, offset)
    limit = request.args.get('limit', default=50, type=int)
    offset = request.args.get('offset', default=0, type=int)
    db = SessionLocal() # Create a new session
    try:
        #with contextlib.contextmanager(get_db_session)() as db:
        messages = chat_session_service.get_messages_for_session(db, session_id, limit=limit, offset=offset)
        return jsonify([
            {"id": msg.id, "role": msg.role.value, "content": msg.content, "timestamp": msg.timestamp.isoformat(),"metadata": json.loads(msg.metadata_json) if msg.metadata_json else None} for msg in messages
            ])
    except Exception as e:
        print(f"API SESSIONS ERROR: get_session_messages_api: {e}")
        return jsonify({"error": "Failed to retrieve messages for session"}), 500

@sessions_bp.route('/<string:session_id>', methods=['DELETE'])
def delete_session_api(session_id):
    db = SessionLocal() # Create a new session
    try:
        #with contextlib.contextmanager(get_db_session)() as db:
        success = chat_session_service.delete_session(db, session_id)
        if success:
            return jsonify({"message": f"Session {session_id} deleted successfully."}), 200
        return jsonify({"error": f"Session {session_id} not found or could not be deleted."}), 404
    except Exception as e:
        print(f"API SESSIONS ERROR: delete_session_api: {e}")
        return jsonify({"error": "Server error deleting session"}), 500


