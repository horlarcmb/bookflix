import sys
import os
import json
from typing import Dict, Any

# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent

class LibrarianAgent(BaseAgent):
    """
    LibrarianAgent provides in-depth Q&A assistance for readers and students
    about the books and chapters they are currently reading.
    """
    def __init__(self):
        super().__init__("librarian_agent")

    def run(self, input_data: Any) -> Dict[str, Any]:
        print(f"\n--- Running [LibrarianAgent] ---", file=sys.stderr)
        
        # input_data is expected to be a dict: { book_title, chapter_title, chapter_content, query, chat_history }
        book_title = input_data.get("book_title", "Unknown Book")
        chapter_title = input_data.get("chapter_title", "Unknown Chapter")
        chapter_content = input_data.get("chapter_content", "")
        query = input_data.get("query", "")
        
        # Render prompt with local context
        rendered_prompt = self.system_prompt.replace("{book_title}", book_title)\
                                            .replace("{chapter_title}", chapter_title)\
                                            .replace("{chapter_content}", chapter_content)
        
        # Set prompt temporarily as system instruction
        old_prompt = self.system_prompt
        self.system_prompt = rendered_prompt
        
        # Prepare structured input for LLM call
        raw_response = self.call_llm(query)
        
        # Restore old prompt
        self.system_prompt = old_prompt

        # Parse response and look for suggestions line
        response_text = raw_response.strip()
        suggestions = [
            "Can you explain the main concept again?",
            "What are the key terms in this chapter?",
            "Can you summarize the characters' motivations?"
        ]
        
        if "SUGGESTIONS:" in response_text:
            parts = response_text.split("SUGGESTIONS:")
            response_text = parts[0].strip()
            sugg_str = parts[1].strip()
            if sugg_str:
                suggestions = [s.strip() for s in sugg_str.split("|") if s.strip()]

        return {
            "response": response_text,
            "suggested_questions": suggestions[:3]
        }

    def get_mock_response(self, user_input: str) -> str:
        # Generate dynamic context-aware mock answers based on keywords
        query = user_input.lower()
        
        if "conflict" in query or "problem" in query or "happen" in query:
            ans = (
                "In this chapter, the primary conflict stems from the imminent tension between Kaelith's "
                "unstable shadow-fire abilities and the strict compliance demanded by the royal council. "
                "Raven warns her that their journey to the eastern gate of Valdris is highly perilous, especially "
                "with the Shadow Guard actively summoning dark forces in the distance."
            )
            suggs = "What is shadow-fire? | Who are the Shadow Guard? | Why is Raven assisting Kaelith?"
        elif "character" in query or "kaelith" in query or "raven" in query or "who" in query:
            ans = (
                "Here are the details on the characters present in this chapter:\n\n"
                "- **Kaelith**: The crown heir who wields a volatile violet shadow-fire. She is determined, independent, "
                "and refuses to seek the council's permission to claim her throne.\n"
                "- **Raven**: Her loyal protector or companion who keeps a half-pace behind her. He acts as a voice of caution, "
                "warning her of the political and physical dangers ahead."
            )
            suggs = "Why does Kaelith command shadow-fire? | What is Raven's role? | Where is the eastern gate?"
        elif "explain" in query or "term" in query or "study" in query or "concept" in query:
            ans = (
                "Based on the text, the key concepts to focus on are:\n\n"
                "1. **Shadow-Fire**: A powerful magical energy pulsed from the crystal throne, deemed demonic by the council.\n"
                "2. **Valdris Border Lockdowns**: The eastern gate guards are closing down the borders, signaling a high state of alert.\n"
                "3. **The Council**: The ruling political body opposing Kaelith's inheritance due to her forbidden powers."
            )
            suggs = "What is the crystal throne? | Why did the council lock down the gate? | Can you define shadow-fire again?"
        else:
            ans = (
                "As your BookFlix Librarian, I've reviewed this chapter! It establishes the tense journey of Kaelith "
                "and Raven across the silent fields of Valdris. The sudden ground vibrations and sky fractures "
                "indicate that the Shadow Guard's summoning ritual has begun. Let me know if you need specific details "
                "about characters, lore, or vocabulary!"
            )
            suggs = "Can you summarize the plot? | Who is Kaelith? | What is the summoning vibration?"

        return f"{ans}\n\nSUGGESTIONS: {suggs}"

if __name__ == "__main__":
    agent = LibrarianAgent()
    if not sys.stdin.isatty():
        try:
            input_str = sys.stdin.read().strip()
            if input_str:
                input_data = json.loads(input_str)
                result = agent.run(input_data)
                print(json.dumps(result))
                sys.exit(0)
        except Exception as e:
            print(json.dumps({"error": f"Failed to run librarian agent: {str(e)}"}))
            sys.exit(1)
            
    # Sample run
    sample_input = {
        "book_title": "The Cyber Nexus",
        "chapter_title": "Chapter 1: The Awakening",
        "chapter_content": "Kaelith command shadow-fire. Raven warns her of the council.",
        "query": "Who is Raven?"
    }
    print(json.dumps(agent.run(sample_input), indent=2))
