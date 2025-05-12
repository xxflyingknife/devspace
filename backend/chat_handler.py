from agent_setup import get_agent_executor

def handle_chat_message(user_message: str, space_id: str = None) -> str:
    """
    Handles an incoming chat message by invoking the LangChain agent.
    """
    print(f"Handling chat message for space '{space_id}': '{user_message}'")
    try:
        agent_executor = get_agent_executor()
        # Include space_id in the input if your prompt/agent needs it
        # Example: full_input = f"Context: space_id={space_id}. User query: {user_message}"
        response = agent_executor.invoke({"input": user_message})
        reply = response.get('output', "Agent did not provide an output.")
        print(f"Agent reply: {reply}")
        return reply
    except Exception as e:
        print(f"Error invoking agent: {str(e)}")
        # Provide a user-friendly error message
        return f"Sorry, an error occurred while processing your request: {str(e)}. Please check the backend logs."

