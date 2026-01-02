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

if __name__ == "__main__":
    # CLI stub
    if len(sys.argv) < 2:
        print("Usage: python tools/research_policy.py <query>")
        sys.exit(1)
    query = sys.argv[1]
    print(f"Researching: {query}")
    # TODO: Implement search and LLM synthesis
