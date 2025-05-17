# devspace/backend/apis/chat_api.py
from flask import Blueprint, request, jsonify
from services.llm_interaction_service import LLMInteractionService
from database.db_session import SessionLocal # Changed from get_db_session

chat_bp = Blueprint('chat_api', __name__)
llm_service = LLMInteractionService() # Instantiate

# Mock: Replace with actual current_user from your auth system
def get_current_user_id_mock_for_chat():
    # This should be consistent with the user seeded and used by plugin installs
    return str(uuid.UUID('00000000-0000-0000-0000-000000000001')) # Ensure uuid is imported
import uuid # Add this if not present

@chat_bp.route('/', methods=['POST'])
def handle_chat_api():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({"error": "Missing 'message' in request body"}), 400

    user_message = data.get('message')
    space_id = data.get('spaceId') # This is the string UUID from frontend
    space_type = data.get('spaceType')
    chat_history_frontend = data.get('chat_history', []) # Simple list of {type, content}

    user_id_str = get_current_user_id_mock_for_chat() # Get current user

    if not user_id_str: return jsonify({"error": "User context not found"}), 500
    if not space_id: return jsonify({"error": "Missing 'spaceId'"}), 400
    if not space_type: return jsonify({"error": "Missing 'spaceType'"}), 400

    db = SessionLocal()
    try:
        response_data = llm_service.process_message_with_llm_and_tools(
            # db=db, # Pass the session
            # user_id_str=user_id_str,
            space_id=space_id,
            space_type=space_type,
            user_message=user_message,
            chat_history_list=chat_history_frontend
        )
        if response_data.get("error"):
            return jsonify(response_data), 500 # Or a more appropriate error code
        return jsonify(response_data), 200
    except Exception as e:
        import traceback
        print(f"API CHAT UNHANDLED ERROR: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Chat processing failed due to an unexpected internal server error."}), 500
    finally:
        db.close()


