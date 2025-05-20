# devspace/backend/services/llm_interaction_service.py
import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent # If using standard agent
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder # For history
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage # SystemMessage if needed
from langchain.memory import ConversationBufferWindowMemory # <--- IMPORT MEMORY
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from config import config as app_config
from tools.dev_tools import get_all_dev_tools # Import the function that returns tool list
from tools.ops_tools import get_all_ops_tools # Import for Ops
from tools.common_tools import get_all_common_tools
from services.space_service import SpaceService # To get space-specific settings
from services.chat_session_service import ChatSessionService # <--- IMPORT
from database.db_session import SessionLocal # For direct session use if needed for saving
from database.models import ChatMessageRoleEnum # For saving messages with correct role
from database.models import Space, SpaceTypeEnum, ChatMessage, ChatMessageRoleEnum


# --- PROMPT TEMPLATE LOADING ---
PROMPT_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prompts")
DEVOPS_AGENT_PROMPT_FILE = os.path.join(PROMPT_TEMPLATE_DIR, "devops_agent_prompt_template.md")
DEVOPS_AGENT_PROMPT_CONTENT = ""



def load_prompt_template_from_file(file_path: str) -> str:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"ERROR: Prompt template file not found at {file_path}")
        # Fallback to a very basic template if file is missing
        return "User: {input}\nAI: {agent_scratchpad}"
    except Exception as e:
        print(f"Error loading prompt template: {e}")
        return "User: {input}\nAI: {agent_scratchpad}"

# Load the template content once when the module is loaded
DEVOPS_AGENT_PROMPT_CONTENT = load_prompt_template_from_file(DEVOPS_AGENT_PROMPT_FILE)
# --- END PROMPT TEMPLATE LOADING ---


# This service will now set up a more real agent
class LLMInteractionService:
    def __init__(self):
        self.space_service = SpaceService() # Or inject
        self.chat_session_service = ChatSessionService() # <--- INSTANTIATE
        self.agent_executors_cache = {} # Cache agent executors: key e.g. "space_id_dev"
        print("LLMInteractionService initialized (for real tool usage).")
    
    def _get_space_specific_context_for_prompt(self, space_id: str, space_type: str):
        """Fetches and formats space-specific details for the prompt."""
        git_repo_url = "N/A"
        k8s_environments_summary = "Not configured or N/A for this space type."
        monitored_workloads_summary = "N/A"
        aiops_skills_summary = "N/A"
        app_blueprint_version = "N/A (no active blueprint)" # TODO: Get from space config or session

        if space_type == "dev":
            dev_config = self.space_service.get_dev_config_object(space_id) # Fetches ORM object
            if dev_config:
                git_repo_url = dev_config.git_repo_url or "Not configured"
                if dev_config.k8s_environments_json:
                    try:
                        envs = json.loads(dev_config.k8s_environments_json)
                        env_names = [val.get("name", key) for key, val in envs.items()]
                        k8s_environments_summary = f"Configured for: {', '.join(env_names)}" if env_names else "No K8s environments defined."
                    except json.JSONDecodeError:
                        k8s_environments_summary = "Error parsing K8s environment config."
        elif space_type == "ops":
            ops_config = self.space_service.get_ops_config_object(space_id) # Fetches ORM object
            if ops_config:
                # TODO: Populate monitored_workloads_summary and aiops_skills_summary from ops_config
                monitored_workloads_summary = ops_config.monitored_workloads_metadata_json or "Not specified"
                aiops_skills_summary = ops_config.aiops_skills_config_json or "Default skills"


        return {
            "git_repo_url": git_repo_url,
            "k8s_environments_summary": k8s_environments_summary,
            "monitored_workloads_summary": monitored_workloads_summary,
            "aiops_skills_summary": aiops_skills_summary,
            "app_blueprint_version": app_blueprint_version, # This needs to come from session or Space config
            "current_task_context": "Currently focusing on general assistance." # TODO: Make this dynamic
        }
    def _convert_db_messages_to_langchain_history(self, db_messages: list) -> list:
        lc_messages = []
        for msg in db_messages:
            content = msg.get("content", "")
            role = msg.get("role")
            metadata = msg.get("metadata")

            if role == ChatMessageRoleEnum.USER.value:
                lc_messages.append(HumanMessage(content=content))
            elif role == ChatMessageRoleEnum.ASSISTANT.value:
                # Check if this assistant message contained tool calls
                tool_calls = []
                if metadata and metadata.get("type") == "tool_call_request" and metadata.get("tool_calls"):
                    tool_calls = [ # Reconstruct LangChain ToolCall objects if needed by LLM/Agent
                        # This part depends on exact LangChain version and how Gemini tool calls are structured
                        # For now, let's assume simple content is enough for history,
                        # and tool call logic handles the actual ToolCall objects.
                        # If LangChain's memory expects AIMessage(tool_calls=...), structure it here.
                        {"id": tc.get("id", f"tool_{idx}"), "name": tc.get("name"), "args": tc.get("args")} 
                        for idx, tc in enumerate(metadata.get("tool_calls", []))
                    ]
                    # If tool_calls were made, LangChain might expect AIMessage(content="", tool_calls=...)
                    # For simplicity now, just use content.
                    # If Gemini API directly supports tool_calls in AIMessage history, that's better.
                    # lc_messages.append(AIMessage(content=content, tool_calls=tool_calls_reconstructed_for_lc))
                lc_messages.append(AIMessage(content=content)) # Simplified for now
            elif role == ChatMessageRoleEnum.TOOL_RESULT.value:
                if metadata and metadata.get("tool_call_id"):
                    lc_messages.append(ToolMessage(content=content, tool_call_id=metadata.get("tool_call_id")))
                else: # Fallback if tool_call_id is missing
                    lc_messages.append(ToolMessage(content=f"Result from tool '{metadata.get('tool_name', 'unknown_tool')}': {content}", tool_call_id="missing_tool_call_id"))
            elif role == ChatMessageRoleEnum.SYSTEM.value:
                lc_messages.append(SystemMessage(content=content))
        return lc_messages

    def _get_or_create_agent_executor(self, db_session, space_id: str, space_type: str, session_id: str):
        cache_key = f"{space_id}_{space_type}"
        if cache_key in self.agent_executors_cache:
            #return self.agent_executors_cache[cache_key]
            return self.agent_executors_cache[cache_key]["executor"], self.agent_executors_cache[cache_key]["memory"] 

        print(f"SERVICE-LLM: Creating new agent executor for space {space_id}, type {space_type}")
        
        # Fetch space-specific LLM settings (API key, model)
        # backend_settings = self.space_service.get_backend_settings(space_id) # This returns a dict
        # For now, use global config for simplicity; in prod, use space-specific settings
        llm_api_key = app_config.GOOGLE_API_KEY
        llm_model_name = app_config.DEFAULT_LLM_MODEL # Or from backend_settings

        if not llm_api_key or llm_api_key == "YOUR_GOOGLE_API_KEY_HERE_IF_NO_ENV_VAR":
             raise ValueError("Google API Key not configured for LLM service.")

        llm = ChatGoogleGenerativeAI(
            model=llm_model_name,
            google_api_key=llm_api_key,
            convert_system_message_to_human=True, # Important for Gemini tool calling
            temperature=0.2 # More deterministic for tool use
        )

        tools_for_agent = []
        if space_type == "dev":
            tools_for_agent.extend(get_all_dev_tools())
        elif space_type == "ops":
            tools_for_agent.extend(get_all_ops_tools())
        tools_for_agent.extend(get_all_common_tools())

        if not tools_for_agent:
            print(f"WARNING: No tools configured for space type {space_type}")
        
        # --- MEMORY SETUP ---
        # k=5 means it remembers the last 5 turns (user + AI = 1 turn)
        # `memory_key` must match the `MessagesPlaceholder` variable_name for chat history
        # `input_key` tells memory what the user's input variable is named in the chain.
        # `output_key` (optional for some agents) tells memory where the AI's final response is.
        # `return_messages=True` ensures memory stores and returns LangChain message objects.
        #memory = ConversationBufferWindowMemory(
        #    k=10, # Remember last 10 interactions (user + AI)
        #    memory_key="chat_history", 
        #    input_key="input", # Matches the key in agent_executor.invoke
        #    output_key="output", # Matches the key in agent_executor response
        #    return_messages=True
        #)
        # --- END MEMORY SETUP ---
        

        # --- MEMORY SETUP ---
        # Fetch history from DB for this session
        raw_chat_history = self.chat_session_service.get_langchain_formatted_chat_history(
            db_session, session_id, window_k=app_config.AGENT_MAX_ITERATIONS # Or a specific window like 10
        )
        langchain_chat_history = self._convert_db_messages_to_langchain_history(raw_chat_history)
       
 
        memory = ConversationBufferWindowMemory(
            k=app_config.AGENT_MAX_ITERATIONS + 5, # Window slightly larger than max iterations
            memory_key="chat_history",
            input_key="input",
            output_key="output", # Check if agent output key matches this
            return_messages=True
        )
        # Load fetched history into memory
        for msg in langchain_chat_history:
            if isinstance(msg, HumanMessage): memory.chat_memory.add_user_message(msg.content)
            elif isinstance(msg, AIMessage): memory.chat_memory.add_ai_message(msg.content)
            # TODO: Handle ToolMessages correctly for memory if needed by agent type

        prompt = ChatPromptTemplate.from_template(DEVOPS_AGENT_PROMPT_CONTENT)

        agent = create_tool_calling_agent(llm, tools_for_agent, prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools_for_agent,
            memory=memory, # <--- PASS MEMORY TO EXECUTOR
            verbose=True, # Very helpful for debugging agent steps
            handle_parsing_errors="Please reformat your tool call or response.", # Custom message
            max_iterations=app_config.AGENT_MAX_ITERATIONS,
            return_intermediate_steps=True # If you want to see thoughts/tool calls
        )
        self.agent_executors_cache[cache_key] = {"executor": agent_executor, "memory": memory}
        return agent_executor, memory

    def process_message_with_llm_and_tools(self, user_message: str, space_id: str, space_type: str,  session_id: str):
        print(f"SERVICE-LLM: Processing (DB history): '{user_message}' for space {space_id} ({space_type}) session {session_id}")
        
        db = SessionLocal() # Create a new session for this interaction
        try:
            # 1. Save User's message
            self.chat_session_service.add_message_to_session(db, session_id, "user", user_message)
            # db.commit() // Commit after all messages for this turn are added

            agent_executor, _memory_instance = self._get_or_create_agent_executor(db, space_id, space_type, session_id)
            
            prompt_context = self._get_space_specific_context_for_prompt( space_id, space_type)
            
            # invoke_payload = { "input": user_message, **prompt_context }
            # chat_history is now handled by the memory object within agent_executor
            invoke_payload = {
                "input": user_message,
                "space_id": space_id,
                "space_type": space_type,
                "git_repo_url": prompt_context["git_repo_url"],
                "k8s_environments_summary": prompt_context["k8s_environments_summary"],
                "monitored_workloads_summary": prompt_context["monitored_workloads_summary"],
                "aiops_skills_summary": prompt_context["aiops_skills_summary"],
                "app_blueprint_version": prompt_context["app_blueprint_version"],
                "current_task_context": prompt_context["current_task_context"],
                # 'chat_history' is handled by memory, 'tools' and 'agent_scratchpad' by agent internals
            }  

            print(f"SERVICE-LLM: Invoking agent executor with input and context keys: {list(invoke_payload.keys())}")
            agent_response = agent_executor.invoke(invoke_payload)
            print(f"SERVICE-LLM: Agent executor response: {agent_response}")

            final_llm_message = agent_response.get("output", "I apologize, I could not process that.")
            
            # 2. Save LLM's final assistant message
            if final_llm_message:
                self.chat_session_service.add_message_to_session(db, session_id, "assistant", final_llm_message)

            tool_executions_for_frontend = []
            if agent_response.get("intermediate_steps"):
                for step_index, (agent_action, observation) in enumerate(agent_response["intermediate_steps"]):
                    # For Gemini, agent_action.tool_call_id might be needed if it's a ToolCallingAgent
                    # And agent_action might be a list of ToolInvocation objects
                    # This part needs to be adapted based on the exact structure of AgentAction for Gemini function calling
                    tool_name = agent_action.tool
                    tool_input = agent_action.tool_input
                    tool_call_id_for_result = f"tool_call_{session_id}_{len(db.query(ChatMessage).filter_by(session_id=session_id).all()) + step_index}" # Generate a unique ID

                    # 2a. Save LLM's request to call a tool (as an assistant message with tool_call metadata)
                    # Or as a specific ChatMessageRoleEnum.TOOL_CALL
                    # For Gemini, AIMessage can have `tool_calls` attribute.
                    # Let's represent the LLM's decision to call a tool
                    self.chat_session_service.add_message_to_session(
                        db, session_id, "assistant", 
                        f"Okay, I need to use the tool: {tool_name} with input: {json.dumps(tool_input)}.", # Or empty content if tool_calls in metadata
                        metadata={"type": "tool_call_request", "tool_name": tool_name, "tool_input": tool_input, "tool_call_id": tool_call_id_for_result}
                    )
                    
                    # 2b. Save the actual Tool's result
                    self.chat_session_service.add_message_to_session(
                        db, session_id, "tool_result", 
                        str(observation), # Tool output content
                        metadata={"tool_name": tool_name, "tool_call_id": tool_call_id_for_result, "status": "success"} # Assume success for now
                    )
                    tool_executions_for_frontend.append({
                        "tool_name": tool_name,
                        "tool_arguments": tool_input,
                        "tool_output": {"message": str(observation), "raw": observation}, # Adapt based on tool output structure
                        "status": "success"
                    })
            
            db.commit() # Commit all messages for this turn

            token_info = {"message": f"Session {session_id[-8:]} updated. Token usage mock."}

            return {
                "llm_message": final_llm_message,
                "tool_executions": tool_executions_for_frontend,
                "token_info": token_info,
                "session_id": session_id
            }
        except Exception as e:
            if db.is_active: db.rollback()
            print(f"Error in LLMInteractionService: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": "Failed to process message with LLM/Agent.", "details": str(e), "session_id": session_id}
        finally:
            if db.is_active: db.close()


 
#        try:
#            #agent_executor = self._get_or_create_agent_executor(space_id, space_type)
#            agent_executor, memory = self._get_or_create_agent_executor(space_id, space_type)   

#            prompt_context = self._get_space_specific_context_for_prompt(space_id, space_type)
            
#            invoke_payload = {
#                "input": user_message,
#                "space_id": space_id,
#                "space_type": space_type,
#                "git_repo_url": prompt_context["git_repo_url"],
#                "k8s_environments_summary": prompt_context["k8s_environments_summary"],
#                "monitored_workloads_summary": prompt_context["monitored_workloads_summary"],
#                "aiops_skills_summary": prompt_context["aiops_skills_summary"],
#                "app_blueprint_version": prompt_context["app_blueprint_version"],
#                "current_task_context": prompt_context["current_task_context"],
#                # 'chat_history' is handled by memory, 'tools' and 'agent_scratchpad' by agent internals
#            }           
 
#            print(f"SERVICE-LLM: Invoking agent executor with payload: {invoke_payload}")
#            agent_response = agent_executor.invoke(invoke_payload)
#            print(f"SERVICE-LLM: Agent executor response: {agent_response}")
#
#            final_llm_message = agent_response.get("output", "I apologize, I couldn't process that request.")
#            
#            token_info = {"message": "Token usage info will be available."}
#

#            return {
#                "llm_message": final_llm_message,
#                "tool_executions": [], # Placeholder: Populate if using return_intermediate_steps
#                "token_info": token_info,
#            }
#
#        except Exception as e:
#            print(f"Error in LLMInteractionService during agent execution: {str(e)}")
#            import traceback
#            traceback.print_exc()
#            return {"error": "Failed to process message with LLM/Agent.", "details": str(e)}
