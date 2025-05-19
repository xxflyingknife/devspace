# devspace/backend/apis/chat_api.py
from flask import Blueprint, request, jsonify
from services.llm_interaction_service import LLMInteractionService
from services.chat_session_service import ChatSessionService # <--- IMPORT ChatSessionService
from database.db_session import SessionLocal # <--- IMPORT SessionLocal

chat_bp = Blueprint('chat_api', __name__)
llm_service = LLMInteractionService()
chat_session_service = ChatSessionService() # <--- INSTANTIATE ChatSessionService

@chat_bp.route('/', methods=['POST']) # Assuming chat is mounted at /api/chat/ (note trailing slash)
def handle_chat_api():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "Missing 'message' in request body"}), 400

    user_message = data.get('message')
    space_id_from_request = data.get('spaceId') # Use a distinct name from db variable
    space_type = data.get('spaceType')
    session_id_from_request = data.get('sessionId') # Get session_id from frontend

    if not space_id_from_request or not space_type:
        return jsonify({"error": "Missing 'spaceId' or 'spaceType'"}), 400

    db = SessionLocal() # <--- GET DATABASE SESSION
    active_session_id = None # Initialize
    try:
        if session_id_from_request:
            # Verify session exists and belongs to space, or refresh its last_accessed_at
            session_obj = chat_session_service.get_session_by_id(db, session_id_from_request)
            if session_obj and str(session_obj.space_id) == str(space_id_from_request): # Ensure space_id matches if it's string/int
                active_session_id = session_obj.id
            else:
                # Session ID provided but invalid or doesn't match space, create/get default
                print(f"Warning: Provided sessionId '{session_id_from_request}' invalid or mismatched for space '{space_id_from_request}'. Getting default.")
                default_session = chat_session_service.get_or_create_default_session(db, space_id_from_request)
                if default_session:
                    active_session_id = default_session.id
        else:
            # No session_id from frontend, get or create default for the space
            default_session = chat_session_service.get_or_create_default_session(db, space_id_from_request)
            if default_session:
                active_session_id = default_session.id
        
        if not active_session_id:
            # This should ideally not happen if get_or_create_default_session works
            return jsonify({"error": f"Could not establish a chat session for space {space_id_from_request}."}), 500

        # chat_history = data.get('chat_history', []) # Frontend doesn't need to send history anymore

        response_data = llm_service.process_message_with_llm_and_tools(
            user_message=user_message,
            space_id=space_id_from_request, # Pass the original spaceId from request
            space_type=space_type,
            session_id=active_session_id # Pass the determined active_session_id
            # chat_history_from_frontend=chat_history # Not needed if LLM service loads from DB
        )
        
        if response_data.get("error"):
            return jsonify(response_data), 500
        
        # Ensure session_id is part of the response if it was newly created or confirmed
        response_data_with_session = {**response_data, "session_id": active_session_id}
        return jsonify(response_data_with_session), 200

    except Exception as e:
        print(f"API CHAT ERROR: Unhandled exception: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred in the chat API.", "details": str(e)}), 500
    finally:
        if db: # Ensure db was assigned
            db.close() # <--- CLOSE DATABASE SESSION

