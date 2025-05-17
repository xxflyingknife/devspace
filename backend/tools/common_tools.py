from langchain_core.tools import tool

# Example: A very simple common tool
@tool
def get_current_time() -> str:
    """Returns the current date and time."""
    import datetime
    return datetime.datetime.now().isoformat()

@tool
def simple_calculator(expression: str) -> str:
    """
    Evaluates a simple mathematical expression (e.g., '2 + 2', '10 * 5 / 2').
    Only supports +, -, *, / operators and numbers.
    WARNING: This uses eval(), which can be unsafe with arbitrary input.
             For a real application, use a safer math expression parser.
    """
    try:
        # Basic sanitization: only allow numbers, spaces, and basic operators
        allowed_chars = set("0123456789.+-*/() ")
        if not all(char in allowed_chars for char in expression):
            return "Error: Invalid characters in expression."
        # WARNING: eval is dangerous. Use a proper math parser in production.
        result = eval(expression)
        return f"The result of '{expression}' is {result}."
    except Exception as e:
        return f"Error evaluating expression '{expression}': {str(e)}"


# You can create a function to gather all tools from this module
def get_all_common_tools():
    return [get_current_time, simple_calculator]

