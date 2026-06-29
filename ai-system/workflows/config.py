import os

# Config Settings for the BookFlix AI Operating System
PROVIDER = os.getenv("AI_PROVIDER", "mock")  # Options: "gemini", "openai", "mock"
MODEL_NAME = os.getenv("AI_MODEL_NAME", "gemini-1.5-flash")

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Output directories
PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "prompts")

def get_llm_client():
    """
    Returns an LLM client or execution helper depending on the provider selection.
    If the provider is 'mock' or keys are missing, falls back to mock execution.
    """
    if PROVIDER == "gemini" and GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            return genai
        except ImportError:
            print("[Warning] google-generativeai module not found. Falling back to Mock client.")
    
    elif PROVIDER == "openai" and OPENAI_API_KEY:
        try:
            import openai
            openai.api_key = OPENAI_API_KEY
            return openai
        except ImportError:
            print("[Warning] openai module not found. Falling back to Mock client.")
            
    return None
