import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class SummarizerAgent(BaseAgent):
    """
    SummarizerAgent serves as the AI Reading Assistant.
    It reads chapter/selection content and summarizes it under three modes:
    - short
    - detailed
    - key_insights
    """
    def __init__(self):
        super().__init__("summarizer_agent")

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        print(f"\n--- Running [SummarizerAgent] ---", file=sys.stderr)
        text = input_data.get("text", "")
        mode = input_data.get("mode", "short")

        # Format variables for prompt template injection
        variables = {
            "text": text,
            "mode": mode
        }
        
        # Build prompt using BaseAgent's prompt rendering
        raw_response = self.call_llm(json.dumps(variables))
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] SummarizerAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"summary": raw_response, "keyPoints": []}

    def get_mock_response(self, user_input: str) -> str:
        try:
            data = json.loads(user_input)
        except json.JSONDecodeError:
            data = {"text": user_input, "mode": "short"}
            
        text = data.get("text", "")
        mode = data.get("mode", "short")
        
        snippet = text[:150] + "..." if len(text) > 150 else text

        if mode == "short":
            summary = f"This passage details the core elements of the narrative, highlighting key characters and events: \"{snippet}\""
            key_points = [
                "Narrative progression and key setups.",
                "Character motivations are established."
            ]
        elif mode == "detailed":
            summary = (
                f"Detailed Breakdown:\n\n"
                f"1. Context & Setup: The text opens with: \"{snippet}\". This sets the scene and establishes the primary conflicts.\n\n"
                f"2. Core Progression: The main events explore character relations, narrative tension, and context details.\n\n"
                f"3. Resolution & Implications: The passage concludes by laying the groundwork for the next chapter or upcoming thematic movements."
            )
            key_points = [
                "Primary setting and thematic tone.",
                "Character interaction dynamics.",
                "Narrative continuity and upcoming conflicts."
            ]
        else: # key_insights
            summary = "Key Takeaways Overview:"
            key_points = [
                f"Core Premise: The passage details: \"{snippet}\"",
                "Thematic Significance: Focuses on character struggle and environmental tension.",
                "Narrative Driver: Unveils pivotal choices that alter the direction of the plot.",
                "Critical Concept: Highlights internal vs external motivation of protagonists."
            ]

        mock_data = {
            "summary": summary,
            "keyPoints": key_points
        }
        return json.dumps(mock_data, indent=2)

if __name__ == "__main__":
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                agent = SummarizerAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Summarizer Agent: {str(e)}"}))
            sys.exit(1)
            
    # Local fallback/sample run
    agent = SummarizerAgent()
    sample_input = {
        "text": "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice 'without pictures or conversations?'",
        "mode": "key_insights"
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
