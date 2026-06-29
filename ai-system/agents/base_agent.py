import os
import sys
import json
import abc
from typing import Dict, Any
from workflows.config import PROMPTS_DIR, get_llm_client, PROVIDER, MODEL_NAME

class BaseAgent(abc.ABC):
    """
    Abstract base class for all BookFlix AI Agents.
    Provides standard configuration loading, telemetry/logging, prompt rendering,
    and fallback execution methods for testing.
    """

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.system_prompt = self._load_system_prompt()
        self.llm_client = get_llm_client()

    def _load_system_prompt(self) -> str:
        """
        Loads the system prompt from the prompts/ directory.
        Falls back to a basic definition if file is missing.
        """
        prompt_file = os.path.join(PROMPTS_DIR, f"{self.agent_name}.txt")
        if os.path.exists(prompt_file):
            with open(prompt_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        print(f"[Warning] System prompt file for {self.agent_name} not found at {prompt_file}. Using generic prompt.", file=sys.stderr)
        return f"You are the {self.agent_name} for BookFlix. Complete your assigned task."

    def call_llm(self, user_input: str) -> str:
        """
        Executes a call to the active LLM provider.
        If provider is 'mock', or keys are missing, falls back to local simulation.
        """
        print(f"[{self.agent_name}] Invoking LLM via provider: {PROVIDER}...", file=sys.stderr)

        if PROVIDER == "mock" or not self.llm_client:
            # Execute agent-specific mock logic
            return self.get_mock_response(user_input)

        if PROVIDER == "gemini":
            try:
                # Use standard Google Gemini client model execution
                model = self.llm_client.GenerativeModel(
                    model_name=MODEL_NAME,
                    system_instruction=self.system_prompt
                )
                response = model.generate_content(user_input)
                return response.text
            except Exception as e:
                print(f"[Error] Gemini API execution failed: {e}. Falling back to Mock.", file=sys.stderr)
                return self.get_mock_response(user_input)

        elif PROVIDER == "openai":
            try:
                response = self.llm_client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": user_input}
                    ]
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"[Error] OpenAI API execution failed: {e}. Falling back to Mock.", file=sys.stderr)
                return self.get_mock_response(user_input)

        return self.get_mock_response(user_input)

    @abc.abstractmethod
    def run(self, input_data: Any) -> Dict[str, Any]:
        """
        Primary execution method to be overridden by child agents.
        Accepts unstructured or structured inputs and returns a structured output dict.
        """
        pass

    @abc.abstractmethod
    def get_mock_response(self, user_input: str) -> str:
        """
        Override this method to return realistic, parseable mock responses
        matching the agent's prompt requirements during local execution.
        """
        pass
