import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class FeedbackAgent(BaseAgent):
    """
    FeedbackAgent analyzes raw logs, reviews, bug reports, and user sentiments
    to prioritize critical platform anomalies and growth feature requests.
    """
    def __init__(self):
        super().__init__("feedback_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [FeedbackAgent] ---", file=sys.stderr)
        # Format list to raw string representation
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            # Attempt to parse output as clean JSON
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] FeedbackAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        # Realistic mock sentiment and categorization details matching standard priority values
        mock_data = {
            "sentiment_distribution": {
                "positive": 65,
                "neutral": 20,
                "negative": 15
            },
            "bugs_identified": [
                {
                    "description": "JSON database write clashes during simultaneous bookmarks save actions.",
                    "priority": "critical"
                },
                {
                    "description": "Speech synthesis voice continues to play after navigating away from Book Reader Page.",
                    "priority": "medium"
                }
            ],
            "feature_requests": [
                {
                    "feature": "Implement true database storage (MongoDB/PostgreSQL) instead of blocking JSON file fallbacks.",
                    "priority": "high"
                },
                {
                    "feature": "PDF Reader viewer frame supporting textbook diagram displays.",
                    "priority": "medium"
                }
            ],
            "actionable_summary": "The flat-file database write collision is the most urgent issue, causing bookmark failures. Users also demand a visual reader for textbook graphics."
        }
        return json.dumps(mock_data, indent=2)

if __name__ == "__main__":
    agent = FeedbackAgent()
    # Check if data is being piped in via standard input
    if not sys.stdin.isatty():
        try:
            # Read input from stdin
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                result = agent.run(input_data)
                # Print raw JSON directly to stdout
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run agent via stdin: {str(e)}"}))
            sys.exit(1)

    # Local verification block (default fallback)
    sample_feedback = [
        "I love the app, but sometimes my saved books disappear when I save them at the same time as my friend.",
        "Speech synthesis continues talking even when I click 'Back' to browse. It's so annoying!",
        "Please add a proper PDF reader. I can't read formulas on standard textbooks."
    ]
    result = agent.run(sample_feedback)
    print("Execution Result:")
    print(json.dumps(result, indent=2))
