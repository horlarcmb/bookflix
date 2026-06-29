import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class SocialAgent(BaseAgent):
    """
    SocialAgent acts as the AI Social Media Manager for BookFlix.
    It compiles posting schedules, publishing strategies, and engagement metrics tables.
    """
    def __init__(self):
        super().__init__("social_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [SocialAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] SocialAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "publishing_strategy": "Short-form video demonstrations of the AI Librarian and TTS voice readers perform best for student installs on TikTok and Instagram Reels. Thread summaries of economics courses generate the highest save and click rates on X.",
            "posting_schedule": [
                {
                    "time": "08:30",
                    "platform": "TikTok",
                    "postTitle": "Study Cheat Code video"
                },
                {
                    "time": "12:00",
                    "platform": "WhatsApp",
                    "postTitle": "Invite study groups link promotion"
                },
                {
                    "time": "17:00",
                    "platform": "X",
                    "postTitle": "Curated biology notes thread"
                }
            ],
            "engagement_reports": "Audiences generally react positively to the speed of summaries. However, some comments ask for offline reading. Comments on TikTok study guides average a high install conversion rate (25%).",
            "social_performance_metrics": [
                {
                    "postTitle": "Study Cheat Code",
                    "platform": "X",
                    "likes": 240,
                    "comments": 65,
                    "shares": 80,
                    "saves": 55,
                    "clicks": 680,
                    "installs": 120
                },
                {
                    "postTitle": "WhatsApp Invite Promo",
                    "platform": "WhatsApp",
                    "likes": 0,
                    "comments": 15,
                    "shares": 190,
                    "saves": 0,
                    "clicks": 950,
                    "installs": 320
                },
                {
                    "postTitle": "Ace Midterms TikTok video",
                    "platform": "TikTok",
                    "likes": 1820,
                    "comments": 340,
                    "shares": 720,
                    "saves": 980,
                    "clicks": 2400,
                    "installs": 850
                }
            ]
        }
        return json.dumps(mock_data, indent=2)

if __name__ == "__main__":
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                agent = SocialAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Social Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = SocialAgent()
    sample_input = {
        "posts": [{"title": "Study Cheat Code"}],
        "analytics": {"logs": 10},
        "goals": "Analyze conversion rates."
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
