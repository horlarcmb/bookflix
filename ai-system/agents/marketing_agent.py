import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class MarketingAgent(BaseAgent):
    """
    MarketingAgent acts as the AI Growth Strategist for BookFlix.
    It compiles campaign ideas, channels strategies, and growth experiments.
    """
    def __init__(self):
        super().__init__("marketing_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [MarketingAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] MarketingAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "growth_strategy": "Our growth strategy focuses on a viral product loop: students share auto-generated flashcards and summaries to study groups. To supplement this, a referral program unlocks premium features when new signups register with invite keys.",
            "channel_strategy": "Students will be acquired primarily via short-form study hacks video campaigns on TikTok and Instagram Reels. General readers will be targeted via book review channels on X (Twitter) and curated Telegram groups.",
            "user_acquisition_plan": "1. Launch Referral Invite loop: Reward referees with 3 days of unlimited AI Summaries. 2. Push Instagram study hacks posts utilizing AI Librarian answers screenshots. 3. Target local university WhatsApp chat rooms.",
            "growth_experiments": [
                "Unlock 1 free premium textbook per 3 referrals",
                "A/B test TikTok summary cards visual styles",
                "Measure signup conversion rate of WhatsApp invite link formats"
            ],
            "campaign_ideas": [
                {
                    "title": "Study Hacks: Ace Exams with AI Librarian",
                    "description": "Short video demos on TikTok showing students asking the AI Librarian complex textbook questions and getting instant summaries.",
                    "channel": "TikTok"
                },
                {
                    "title": "BookFlix Premium Invite Campaign",
                    "description": "Referral loop campaign prompting users to send WhatsApp links to classmates to unlock premium audio features.",
                    "channel": "WhatsApp"
                },
                {
                    "title": "Curated Knowledge Threads",
                    "description": "Publish threads summarizing complex textbooks (like microeconomics or biology) on X and linking to BookFlix for more details.",
                    "channel": "X"
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
                agent = MarketingAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Marketing Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = MarketingAgent()
    sample_input = {
        "analytics": {"users": 100},
        "feedbacks": ["Love sharing notes on whatsapp"],
        "goals": "Boost signups and installs."
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
