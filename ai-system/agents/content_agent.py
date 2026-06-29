import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class ContentAgent(BaseAgent):
    """
    ContentAgent acts as the AI Content Strategist for BookFlix.
    It builds social content copies, daily ideas, and weekly calendar slots.
    """
    def __init__(self):
        super().__init__("content_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [ContentAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] ContentAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "content_strategy": "Our content pillars focus on Education (study guides) and AI Features (Librarian bot, audio voice summaries). We attract students by demonstrating fast learning speeds on TikTok, and bookworms on Instagram with book discovery lists.",
            "daily_content_ideas": [
                "Screenshot of AI Librarian explaining microeconomics in simple terms",
                "Video loop of a student converting a 400-page book to audio summaries in 1 click",
                "Educational graphic: How to study textbooks 3x faster"
            ],
            "weekly_calendar": [
                {
                    "day": "Monday",
                    "topic": "AI Features",
                    "task": "Post a TikTok video showcasing the floating AI Librarian chat drawer."
                },
                {
                    "day": "Wednesday",
                    "topic": "Education",
                    "task": "Publish an X thread breaking down a textbook using AI Summaries."
                },
                {
                    "day": "Friday",
                    "topic": "Viral Hooks",
                    "task": "Distribute WhatsApp promo invite link: Share BookFlix with friends to get free premium access."
                }
            ],
            "viral_hooks": [
                "Stop wasting hours highlighting textbooks. Let AI summarize it for you.",
                "Students: Here's the ultimate study cheat code for midterms.",
                "Imagine having a personal librarian in your pocket 24/7."
            ],
            "promotional_posts": [
                {
                    "title": "Study Cheat Code",
                    "body": "Midterms are coming. 📚 Stop stressing over 500-page reading lists. Load any EPUB into BookFlix, tap 'AI Summary', and get study notes instantly. Try the AI Librarian for free: [Link]",
                    "platform": "X"
                },
                {
                    "title": "WhatsApp Invite Promo",
                    "body": "Hey study groups! 🚀 Try BookFlix to read and summarize books with AI. Use my referral link to unlock premium audio features immediately: [ReferralLink]",
                    "platform": "WhatsApp"
                },
                {
                    "title": "Telegram Textbook Hack",
                    "body": "Curated study tools for exam season: BookFlix lets you upload course catalogs, run conceptual searches, and ask questions to an AI Librarian bot. Instant access here: [Link]",
                    "platform": "Telegram"
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
                agent = ContentAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Content Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = ContentAgent()
    sample_input = {
        "analytics": {"users": 100},
        "feedbacks": ["The summaries are great for exams"],
        "goals": "Generate promotional social copies."
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
