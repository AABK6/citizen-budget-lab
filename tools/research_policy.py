import re
import sys
from typing import Optional

def extract_impact_from_text(text: str) -> Optional[float]:
    """
    Heuristic extraction of euro amounts from text.
    Supports 'X million', 'X billion', 'X€'.
    """
    text = text.lower()
    # Simple regex for '500 million'
    million_match = re.search(r"(\d+(?:[.,]\d+)?)\s*million", text)
    if million_match:
        val = float(million_match.group(1).replace(",", "."))
        return val * 1_000_000
    
    billion_match = re.search(r"(\d+(?:[.,]\d+)?)\s*billion", text)
    if billion_match:
        val = float(billion_match.group(1).replace(",", "."))
        return val * 1_000_000_000
        
    euro_match = re.search(r"(\d+(?:[.,]\d+)?)\s*€", text)
    if euro_match:
        val = float(euro_match.group(1).replace(",", "."))
        return val
        
    return None

def extract_mission_from_text(text: str) -> Optional[str]:
    """
    Heuristic extraction of mission names.
    """
    text = text.upper()
    missions = ["JUSTICE", "EDUCATION", "DEFENSE", "CULTURE", "SANTÉ", "HEALTH"]
    for m in missions:
        if f"MISSION {m}" in text or f" {m} " in text:
            if m == "SANTÉ": return "HEALTH"
            return m
    return None

def google_web_search(query: str):
    """
    Placeholder for the tool call. In the real agent, 
    this will be intercepted or we use the available tool.
    """
    # This is a stub for local tests; 
    # the agent will use the actual tool during execution.
    return []

def research_lever(query: str) -> list[dict]:
    """
    Perform search and return raw results.
    """
    # In the actual agent implementation, we don't 'implement' the tool,
    # we just call it. For the script to be useful, it needs to be 
    # able to run in the agent context.
    return google_web_search(query)

if __name__ == "__main__":
    # CLI stub
    if len(sys.argv) < 2:
        print("Usage: python tools/research_policy.py <query>")
        sys.exit(1)
    query = sys.argv[1]
    print(f"Researching: {query}")
    # TODO: Implement search and LLM synthesis
