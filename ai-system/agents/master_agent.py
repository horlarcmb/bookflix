import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class MasterAgent(BaseAgent):
    """
    MasterAgent serves as the central coordination engine for BookFlix.
    It evaluates the state of all seven agents and returns priorities rankings, 
    coordinated roadmaps, and strategic directives.
    """
    def __init__(self):
        super().__init__("master_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [MasterAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] MasterAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "system_health": {
                "growth_index": 82,
                "retention_index": 48,
                "ux_index": 85,
                "code_stability_index": 92
            },
            "priority_ranking": [
                {
                    "rank": 1,
                    "taskName": "Implement Day 1 Quick Start Guides",
                    "assignedAgent": "Content Agent",
                    "impact": "High",
                    "cost": "Low",
                    "rationale": "Directly resolves onboarding drop-offs identified by the Analytics Agent."
                },
                {
                    "rank": 2,
                    "taskName": "Implement floating Librarian sidebar improvements",
                    "assignedAgent": "Engineering Agent",
                    "impact": "High",
                    "cost": "Medium",
                    "rationale": "Product Agent requested this to keep students engaged with textbook Q&A."
                },
                {
                    "rank": 3,
                    "taskName": "Scale TikTok study hacks influencer campaigns",
                    "assignedAgent": "Marketing Agent",
                    "impact": "High",
                    "cost": "Medium",
                    "rationale": "Analytics Agent confirmed TikTok CAC is highly optimized at $0.45."
                }
            ],
            "execution_roadmap": [
                {
                    "phase": "Phase 1: Quick Wins",
                    "objective": "Launch onboarding study guides via Content Agent; fix floating Librarian UI sidebar."
                },
                {
                    "phase": "Phase 2: Core Optimization",
                    "objective": "Roll out D1 push reminders and referral bonuses for study groups."
                },
                {
                    "phase": "Phase 3: Scale Loops",
                    "objective": "Broaden Social Agent tracking across WhatsApp and Telegram study circles."
                }
            ],
            "strategic_decisions": "The biggest bottleneck in the system is D1 onboarding retention. We are coordinating the Content, Engineering, and Marketing agents to deliver immediate Quick Start guidelines, improve the Librarian chat drawer responsiveness, and scale TikTok student acquisition."
        }
        return json.dumps(mock_data, indent=2)

if __name__ == "__main__":
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                agent = MasterAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Master Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = MasterAgent()
    sample_input = {
        "feedback_report": "User complains about D1 drop-offs",
        "product_decisions": [],
        "engineering_tasks": [],
        "marketing_campaigns": [],
        "content_strategy": {},
        "social_metrics": [],
        "analytics_insights": {}
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
