import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class EngineeringAgent(BaseAgent):
    """
    EngineeringAgent acts as the AI Engineering Lead for BookFlix.
    It audits the codebase, identifies technical weaknesses, and generates detailed execution tasks.
    """
    def __init__(self):
        super().__init__("engineering_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [EngineeringAgent] ---", file=sys.stderr)
        if isinstance(input_data, (list, dict)):
            raw_input = json.dumps(input_data, indent=2)
        else:
            raw_input = str(input_data)
            
        raw_response = self.call_llm(raw_input)
        
        try:
            return json.loads(raw_response)
        except json.JSONDecodeError:
            print(f"[Warning] EngineeringAgent LLM output not in valid JSON. Returning raw string.", file=sys.stderr)
            return {"raw_output": raw_response}

    def get_mock_response(self, user_input: str) -> str:
        mock_data = {
            "engineering_audit_report": "Frontend utilizes React 19 and Vite 8, compiling correctly. However, a major performance bottleneck exists in the Express backend due to synchronous, blocking JSON flat-file database reads and writes in local fallback mode. Indexing on telemetry logs is also absent.",
            "technical_weaknesses_report": "1) Sync read/write on feedbacks.json and users.json locks threads during bookmark saves. 2) Overflow and alignment settings overlaps inside TextReader.jsx toolbar UI degrade mobile usability. 3) Web Speech voices play after page navigation.",
            "implementation_roadmap": [
                {
                  "phase": "Phase 1: UI Redesign & Toolbar Cleanup",
                  "tasks": [
                    "Redesign reader settings controls drop-down selector grid",
                    "Add click-outside events listener to toolbar popovers"
                  ]
                },
                {
                  "phase": "Phase 2: Database Performance Optimizations",
                  "tasks": [
                    "Implement debounced save callbacks on bookmark updates",
                    "Add Mongoose model indexes to user progress structures"
                  ]
                },
                {
                  "phase": "Phase 3: AI Knowledge Integrations (Tier 1)",
                  "tasks": [
                    "Build chapter summary aggregation endpoints",
                    "Inject chatbot drawer inside reader toolbars"
                  ]
                }
            ],
            "code_improvement_plan": "Structural modifications will focus on refactoring TextReader.jsx CSS overlay hierarchies to solve UI clashes, and debouncing progress saves in BookContext.jsx to minimize thread locking.",
            "execution_tasks": [
                {
                    "title": "Fix Reader Settings Dropdown Overlaps",
                    "description": "Refactor CSS styling classes inside src/components/TextReader.jsx so selector grids display in single columns with absolute positioning boundaries.",
                    "category": "UI"
                },
                {
                    "title": "Debounce Bookmarks Progress Commits",
                    "description": "Implement a lodash debounce utility or a custom setTimeout save handler inside src/context/BookContext.jsx to restrict database write calls to once per 5 seconds.",
                    "category": "Performance"
                },
                {
                    "title": "Implement Chapter Summary APIs",
                    "description": "Create Express route app.get('/api/books/:id/summary') to query pre-aggregated study notes and summaries.",
                    "category": "AI Summaries"
                },
                {
                    "title": "Build AI Librarian Chat Interface",
                    "description": "Create a sliding chatbot assistant drawer component in src/components/TextReader.jsx triggered by the reader toolbar.",
                    "category": "AI Librarian"
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
                agent = EngineeringAgent()
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run Engineering Agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    agent = EngineeringAgent()
    sample_prd = {
        "recommendations": [{"feature": "Optimize Bookmarks Storage"}],
        "analytics": {"average_latency": 320},
        "goals": "Improve existing product code."
    }
    result = agent.run(sample_prd)
    print("Execution Result:", file=sys.stderr)
    print(json.dumps(result, indent=2))
