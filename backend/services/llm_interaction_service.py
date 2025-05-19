# devspace/backend/services/llm_interaction_service.py
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent # If using standard agent
# from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder # For history
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage # SystemMessage if needed
from langchain.memory import ConversationBufferWindowMemory # <--- IMPORT MEMORY

from config import config as app_config
from tools.dev_tools import get_all_dev_tools # Import the function that returns tool list
from tools.ops_tools import get_all_ops_tools # Import for Ops
from tools.common_tools import get_all_common_tools
from services.space_service import SpaceService # To get space-specific settings

# This service will now set up a more real agent
class LLMInteractionService:
    def __init__(self):
        self.space_service = SpaceService() # Or inject
        self.agent_executors_cache = {} # Cache agent executors: key e.g. "space_id_dev"
        print("LLMInteractionService initialized (for real tool usage).")

    def _get_or_create_agent_executor(self, space_id: str, space_type: str):
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
        memory = ConversationBufferWindowMemory(
            k=10, # Remember last 10 interactions (user + AI)
            memory_key="chat_history", 
            input_key="input", # Matches the key in agent_executor.invoke
            output_key="output", # Matches the key in agent_executor response
            return_messages=True
        )
        # --- END MEMORY SETUP ---
        
        # TODO: Define a more robust prompt, possibly with system messages based on space context
        # For now, a simple one allowing tool usage.
        # Ensure your LLM (Gemini Pro via API) supports system prompts correctly or adapt.
        # If using older Gemini models, you might need to structure as alternating human/ai messages.
        from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"You are a helpful DevOps assistant for a '{space_type}' space (ID: {space_id}). Use available tools to answer questions and perform actions. Provide concise responses. If a tool call is needed, explain briefly why before calling. After a tool call, summarize the result or state the next step."),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"), # Where agent puts tool calls & responses
        ])

        agent = create_tool_calling_agent(llm, tools_for_agent, prompt)
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools_for_agent,
            memory=memory, # <--- PASS MEMORY TO EXECUTOR
            verbose=True, # Very helpful for debugging agent steps
            handle_parsing_errors="Please reformat your tool call or response.", # Custom message
            max_iterations=app_config.AGENT_MAX_ITERATIONS,
            # return_intermediate_steps=True # If you want to see thoughts/tool calls
        )
        self.agent_executors_cache[cache_key] = {"executor": agent_executor, "memory": memory}
        return agent_executor, memory
        #self.agent_executors_cache[cache_key] = agent_executor
        #return agent_executor

    def process_message_with_llm_and_tools(self, user_message: str, space_id: str, space_type: str, chat_history_list: list = None):
        print(f"SERVICE-LLM: Processing (with memory): '{user_message}' for space {space_id} ({space_type})")
        try:
            #agent_executor = self._get_or_create_agent_executor(space_id, space_type)
            agent_executor, memory = self._get_or_create_agent_executor(space_id, space_type)   
            # Format chat history for LangChain if provided
            lc_chat_history = []
            if chat_history_list:
                for msg in chat_history_list:
                    if msg.get('type') == 'user': lc_chat_history.append(HumanMessage(content=msg.get('content')))
                    elif msg.get('type') == 'assistant': lc_chat_history.append(AIMessage(content=msg.get('content')))
                    # TODO: Handle tool messages if you store them in history

            invoke_payload = {"input": user_message}
            if lc_chat_history: invoke_payload["chat_history"] = lc_chat_history

            # For LangChain, the agent executor handles the loop of LLM -> Tool -> LLM
            # The 'output' will be the final response AFTER any tool calls.
            # If you want to show intermediate tool calls, you need `return_intermediate_steps=True`
            # and then parse the response differently.
            
            print(f"SERVICE-LLM: Invoking agent executor with payload: {invoke_payload}")
            agent_response = agent_executor.invoke(invoke_payload)
            print(f"SERVICE-LLM: Agent executor response: {agent_response}")

            final_llm_message = agent_response.get("output", "I apologize, I couldn't process that request.")
            
            # To reconstruct tool execution details for the frontend (if not using return_intermediate_steps directly)
            # This part is tricky as standard invoke hides intermediate steps.
            # You might need to parse verbose logs or use `return_intermediate_steps=True` and adapt.
            # For now, we won't send detailed tool_executions back, just the final output.
            # The backend logs (verbose=True) will show the tool calls.

            # TODO: Real token info (this is a simplification)
            token_info = {"message": "Token usage info will be available."}

            return {
                "llm_message": final_llm_message,
                "tool_executions": [], # Placeholder: Populate if using return_intermediate_steps
                "token_info": token_info,
            }

        except Exception as e:
            print(f"Error in LLMInteractionService during agent execution: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": "Failed to process message with LLM/Agent.", "details": str(e)}
