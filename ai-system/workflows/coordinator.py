import sys
import os
import json
from typing import Dict, Any

# Ensure correct path resolution
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.feedback_agent import FeedbackAgent
from agents.product_agent import ProductAgent
from agents.engineering_agent import EngineeringAgent
from agents.marketing_agent import MarketingAgent
from agents.content_agent import ContentAgent
from agents.social_agent import SocialAgent
from agents.analytics_agent import AnalyticsAgent

class MasterCoordinator:
    """
    The runtime controller of the BookFlix AI Operating System.
    Supervises, executes, and validates output from the child agent swarm.
    """
    def __init__(self):
        print("[System] Initializing Master AI Coordinator...")
        self.feedback_agent = FeedbackAgent()
        self.product_agent = ProductAgent()
        self.engineering_agent = EngineeringAgent()
        self.marketing_agent = MarketingAgent()
        self.content_agent = ContentAgent()
        self.social_agent = SocialAgent()
        self.analytics_agent = AnalyticsAgent()

    def run_feedback_to_spec_workflow(self, raw_feedback_list: list) -> Dict[str, Any]:
        """
        Coordinates the pipeline: Feedback -> Product PRD -> Engineering Tasks -> Marketing/Social Copy.
        """
        print("\n==================================================")
        print("STARTING: Feedback-to-Engineering AI Workflow")
        print("==================================================")

        # 1. Run Feedback Analysis
        feedback_report = self.feedback_agent.run(raw_feedback_list)
        print("[Master] Feedback Agent output processed successfully.")

        # 2. Run Product PRD drafting
        product_prd = self.product_agent.run(feedback_report)
        print("[Master] Product Agent output processed successfully.")

        # 3. Run Engineering Specification breakdown
        engineering_tasks = self.engineering_agent.run(product_prd)
        print("[Master] Engineering Agent output processed successfully.")

        # 4. Generate marketing newsletters and social campaigns in parallel/sequence
        marketing_copy = self.marketing_agent.run(product_prd.get("prd", {}))
        social_copy = self.social_agent.run(product_prd.get("prd", {}))
        print("[Master] Marketing & Social Agents outputs processed successfully.")

        # Consolidated system outputs
        workflow_output = {
            "status": "Success",
            "feedback_report": feedback_report,
            "product_prd": product_prd,
            "engineering_tasks": engineering_tasks,
            "marketing_copy": marketing_copy,
            "social_copy": social_copy
        }

        print("\n==================================================")
        print("COMPLETED: Feedback-to-Engineering AI Workflow")
        print("==================================================")
        return workflow_output

    def run_content_curation_workflow(self, raw_book_text: str) -> Dict[str, Any]:
        """
        Coordinates the ingestion and enrichment of new book catalog entries.
        """
        print("\n==================================================")
        print("STARTING: Content Ingestion AI Workflow")
        print("==================================================")

        # 1. Process book details
        curation_details = self.content_agent.run(raw_book_text)
        print("[Master] Content Agent analysis complete.")

        # 2. Generate promotional tweets for the new book
        social_promo = self.social_agent.run(curation_details.get("book_metadata", {}))
        print("[Master] Social Agent promotion complete.")

        workflow_output = {
            "status": "Success",
            "curation_details": curation_details,
            "social_promo": social_promo
        }

        print("\n==================================================")
        print("COMPLETED: Content Ingestion AI Workflow")
        print("==================================================")
        return workflow_output

if __name__ == "__main__":
    coordinator = MasterCoordinator()

    # Sample execution of Pipeline 1: Feedback -> Specs -> Growth Campaign
    sample_user_feedback = [
        "Concurrent bookmarking writes are causing file locks on server_data.",
        "Speech synthesis continues after clicking back.",
        "Need a high-quality PDF reader for textbooks."
    ]
    
    result = coordinator.run_feedback_to_spec_workflow(sample_user_feedback)
    
    print("\n--- FINAL WORKFLOW PIPELINE REPORT ---")
    print(json.dumps(result, indent=2))
