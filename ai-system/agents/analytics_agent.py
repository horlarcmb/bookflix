import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class AnalyticsAgent(BaseAgent):
    """
    AnalyticsAgent acts as the AI Data Intelligence Agent for BookFlix.
    It returns KPI matrices, growth audits, cohort drop-offs, and weakness reports.
    """
    def __init__(self):
        super().__init__("analytics_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [AnalyticsAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] AnalyticsAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "growth_kpis": {
                "installs": 1540,
                "signups": 1120,
                "active_users": 890
            },
            "engagement_kpis": {
                "session_duration_mins": 18.2,
                "books_opened": 460,
                "searches": 210,
                "summaries_used": 620
            },
            "retention_kpis": {
                "d1_retention_pct": 38.4,
                "d7_retention_pct": 22.1,
                "d30_retention_pct": 9.4,
                "churn_rate_pct": 11.2
            },
            "marketing_kpis": {
                "ctr_pct": 5.2,
                "conversion_rate_pct": 14.5,
                "cac_usd": 0.45,
                "referral_rate_pct": 16.8
            },
            "growth_report": "BookFlix is experiencing steady acquisition, mostly driven by TikTok short-form content. Active user counts grew 15% week-over-week.",
            "retention_report": "Retention drops sharply after day 1 (D1 at 38%, D7 at 22%). Students drop off because they do not organize books into custom folders or find active textbooks immediately upon signup.",
            "weakness_report": "Our primary leakage points are onboarding friction (no quick start guides) and low return triggers. Users summarize a book once but lack streaks or notifications prompting them to return.",
            "recommendations": "1. Launch a 'Quick Start Study Guide' during onboarding.\n2. Implement D1 push notifications summarizing the user's last opened chapter.\n3. Expand TikTok influencer campaigns which show a highly efficient CAC ($0.45)."
        }
        return json.dumps(mock_data, indent=2)

if __name__ == "__main__":
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                agent = AnalyticsAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Analytics Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = AnalyticsAgent()
    sample_input = {
        "users_count": 100,
        "books_count": 20,
        "telemetry": [],
        "social_metrics": []
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
