import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class ProductAgent(BaseAgent):
    """
    ProductAgent acts as the AI Product Manager for BookFlix.
    It ingests feedback logs and analytics statistics to output weakness reports,
    prioritized feature recommendations, and engineering task backlogs, optimizing the existing product.
    """
    def __init__(self):
        super().__init__("product_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [ProductAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] ProductAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "product_audit_report": "Audit shows that while the core book reader works, growth is hindered by: 1) Lack of referral loops on onboarding, 2) Overlapping layout settings inside the Reader toolbar UI, 3) High flat-file DB bookmarks latency under load, and 4) Missing gamification widgets to incentivize daily retention.",
            "improvement_opportunities": [
                {
                    "feature": "Optimize Bookmark Storage Mechanics",
                    "description": "Transition reading progress writes to background async commits or index optimizations in MongoDB, resolving page freezes on bookmarks saves.",
                    "growthImpact": 8,
                    "retentionImpact": 10,
                    "viralityPotential": 6,
                    "effortScore": 4,
                    "priority": "critical",
                    "engineeringTasks": [
                        "Optimise User Mongoose model progress indices",
                        "Refactor bookmarks save endpoints to use debounced save callbacks"
                    ]
                },
                {
                    "feature": "Reader Toolbar UI Refactoring",
                    "description": "Fix the overlapping layouts in settings selectors and font adjustment controls in src/components/TextReader.jsx to improve student reading flow.",
                    "growthImpact": 7,
                    "retentionImpact": 9,
                    "viralityPotential": 5,
                    "effortScore": 3,
                    "priority": "high",
                    "engineeringTasks": [
                        "Re-align settings select grids in TextReader.jsx styling",
                        "Improve click outside handlers for reader settings dropdown"
                    ]
                },
                {
                    "feature": "Viral Referral & Invite Loops",
                    "description": "Inject invite-sharing elements inside the profile page and reader sidebar to optimize organic user acquisition loops.",
                    "growthImpact": 10,
                    "retentionImpact": 7,
                    "viralityPotential": 9,
                    "effortScore": 4,
                    "priority": "critical",
                    "engineeringTasks": [
                        "Create invite code generation helper in server.cjs",
                        "Mount Quote Share Cards button inside TextReader toolbar"
                    ]
                }
            ],
            "roadmap_milestones": [
                {
                    "name": "Phase 1: Performance & Reader UI Optimization",
                    "deliverables": [
                        "Asynchronous bookmarks commit updates",
                        "Overlapping settings toolbar redesign"
                    ]
                },
                {
                    "name": "Phase 2: Viral Acquisition Injection",
                    "deliverables": [
                        "Profile referral prompt panels",
                        "Social quote image render triggers"
                    ]
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
                agent = ProductAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Product Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = ProductAgent()
    sample_input = {
        "feedbacks": ["The bookmarks saving page freezes up", "Settings dropdown overlap layout"],
        "analytics": {"dau": 150, "mau": 400},
        "goals": "Improve and optimize existing product."
    }
    result = agent.run(sample_input)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
