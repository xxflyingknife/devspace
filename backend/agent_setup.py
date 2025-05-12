from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from config import GOOGLE_API_KEY
from tools import git_pull_updates, k8s_apply_manifest, k8s_list_deployments # Import your tools

# --- Global Agent Executor (initialize once) ---
agent_executor = None

def initialize_agent():
    """Initializes the LangChain agent executor."""
    global agent_executor

    if agent_executor:
        print("Agent already initialized.")
        return agent_executor

    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not found in environment variables. Cannot initialize LLM.")

    print("Initializing LLM...")
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash", # Or your preferred model
        google_api_key=GOOGLE_API_KEY,
        convert_system_message_to_human=True, # Often needed for tool use
        temperature=0.1 # Slightly more creative but still mostly factual
    )

    # List all available tools for the agent
    tools = [
        git_pull_updates,
        k8s_apply_manifest,
        k8s_list_deployments,
        # Add other imported tools here
    ]
    print(f"Tools initialized: {[tool.name for tool in tools]}")

    # Define the prompt template
    # You can make this more sophisticated, perhaps incorporating chat history or spaceId context
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are a helpful DevOps assistant. You have access to tools for managing Git repositories and Kubernetes clusters.
- Use the tools *only when necessary* to fulfill the user's request based on the available information.
- Ask for clarification if the user's request is ambiguous or lacks necessary information (like repo_id, namespace, branch_name, manifest content).
- For actions like applying manifests or pulling git changes, confirm the target (e.g., repo_id, namespace) if not explicitly provided recently.
- Provide concise answers based *only* on the direct output of the tools when you use them.
- If a tool fails, report the error clearly. Do not attempt the same failed action immediately unless the user provides new information or asks you to retry.
- You are interacting within a specific space context, but the user needs to provide identifiers like repo_id or namespace for tool usage."""),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"), # For agent's intermediate steps
    ])

    # Create the agent
    print("Creating agent...")
    agent = create_tool_calling_agent(llm, tools, prompt)

    # Create the Agent Executor
    print("Creating agent executor...")
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True, # Set to False in production if too noisy
        handle_parsing_errors=True, # Try to gracefully handle LLM output errors
        max_iterations=10 # Prevent runaway agents
        )
    print("Agent initialization complete.")
    return agent_executor

def get_agent_executor():
    """Returns the initialized agent executor, initializing if needed."""
    if not agent_executor:
        return initialize_agent()
    return agent_executor

# Example of initializing on module load (can be deferred)
# initialize_agent()

