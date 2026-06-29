import sys
import os
import json
import subprocess
from typing import Dict, Any

# Paths to all agent scripts
AGENTS_DIR = os.path.dirname(os.path.abspath(__file__))
AGENT_PATHS = {
    "feedback": os.path.join(AGENTS_DIR, "agents", "feedback_agent.py"),
    "product": os.path.join(AGENTS_DIR, "agents", "product_agent.py"),
    "engineering": os.path.join(AGENTS_DIR, "agents", "engineering_agent.py"),
    "marketing": os.path.join(AGENTS_DIR, "agents", "marketing_agent.py"),
    "content": os.path.join(AGENTS_DIR, "agents", "content_agent.py"),
    "social": os.path.join(AGENTS_DIR, "agents", "social_agent.py"),
    "analytics": os.path.join(AGENTS_DIR, "agents", "analytics_agent.py"),
    "master": os.path.join(AGENTS_DIR, "agents", "master_agent.py")
}

def run_agent_script(agent_name: str, payload: Any) -> Any:
    script_path = AGENT_PATHS.get(agent_name)
    if not script_path or not os.path.exists(script_path):
        print(f"[Orchestrator Error] Agent script {agent_name} not found at {script_path}", file=sys.stderr)
        return {"error": "Script not found"}

    try:
        proc = subprocess.Popen(
            [sys.executable, script_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=json.dumps(payload))
        
        # Log stderr to parent stderr
        if stderr:
            print(f"[{agent_name} logs] {stderr.strip()}", file=sys.stderr)
            
        return json.loads(stdout.strip())
    except Exception as e:
        print(f"[Orchestrator Error] Failed to run {agent_name}: {str(e)}", file=sys.stderr)
        return {"error": str(e)}

def run_cascade_orchestration(initial_payload: Dict[str, Any]) -> Dict[str, Any]:
    print("\n=== STARTING CASCADING MULTI-AGENT PIPELINE ===", file=sys.stderr)
    
    # 1. Feedback Agent
    print("[1/8] Executing Feedback Agent...", file=sys.stderr)
    feedback_out = run_agent_script("feedback", initial_payload.get("feedbacks", []))
    
    # 2. Product Agent
    print("[2/8] Executing Product Agent...", file=sys.stderr)
    product_payload = {
        "feedback_reports": feedback_out,
        "goals": "Maximize student reading speeds and growth loops."
    }
    product_out = run_agent_script("product", product_payload)
    
    # 3. Engineering Agent
    print("[3/8] Executing Engineering Agent...", file=sys.stderr)
    eng_payload = {
        "product_recommendations": product_out,
        "codebase_state": "Ready"
    }
    eng_out = run_agent_script("engineering", eng_payload)
    
    # 4. Marketing Agent
    print("[4/8] Executing Marketing Agent...", file=sys.stderr)
    marketing_payload = {
        "feedbacks": feedback_out.get("feedback_summary", []) if isinstance(feedback_out, dict) else [],
        "goals": "TikTok and WhatsApp growth."
    }
    marketing_out = run_agent_script("marketing", marketing_payload)
    
    # 5. Content Agent
    print("[5/8] Executing Content Agent...", file=sys.stderr)
    content_payload = {
        "analytics": initial_payload.get("analytics", {}),
        "feedbacks": feedback_out.get("feedback_summary", []) if isinstance(feedback_out, dict) else [],
        "goals": "Create textbook summaries and hooks."
    }
    content_out = run_agent_script("content", content_payload)
    
    # 6. Social Agent
    print("[6/8] Executing Social Agent...", file=sys.stderr)
    social_payload = {
        "posts": content_out.get("promotional_posts", []),
        "analytics": initial_payload.get("analytics", {}),
        "goals": "Automate posts and conversion reports."
    }
    social_out = run_agent_script("social", social_payload)
    
    # 7. Analytics Agent
    print("[7/8] Executing Analytics Agent...", file=sys.stderr)
    analytics_payload = {
        "users_count": initial_payload.get("users_count", 0),
        "books_count": initial_payload.get("books_count", 0),
        "telemetry": [],
        "social_metrics": social_out.get("social_performance_metrics", []),
        "feedbacks": feedback_out.get("feedback_summary", []) if isinstance(feedback_out, dict) else []
    }
    analytics_out = run_agent_script("analytics", analytics_payload)
    
    # 8. Master Agent
    print("[8/8] Executing Master Agent...", file=sys.stderr)
    master_payload = {
        "feedback_report": feedback_out,
        "product_decisions": product_out,
        "engineering_tasks": eng_out,
        "marketing_campaigns": marketing_out,
        "content_strategy": content_out,
        "social_metrics": social_out,
        "analytics_insights": analytics_out
    }
    master_out = run_agent_script("master", master_payload)
    
    print("=== PIPELINE CASCADE COMPLETE ===", file=sys.stderr)
    
    return {
        "feedback": feedback_out,
        "product": product_out,
        "engineering": eng_out,
        "marketing": marketing_out,
        "content": content_out,
        "social": social_out,
        "analytics": analytics_out,
        "master": master_out
    }

if __name__ == "__main__":
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                result = run_cascade_orchestration(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Orchestrator pipeline failed: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    sample = {
        "feedbacks": ["summaries are awesome for midterm prep"],
        "analytics": {"users": 100},
        "users_count": 10,
        "books_count": 5
    }
    res = run_cascade_orchestration(sample)
    print(json.dumps(res, indent=2))
