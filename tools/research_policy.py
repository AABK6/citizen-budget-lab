import re
import sys
import yaml
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict

@dataclass
class RevenueReformMetadata:
    lever_id: str
    vigilance_points: List[str] = field(default_factory=list)
    pros: List[str] = field(default_factory=list)
    cons: List[str] = field(default_factory=list)
    authoritative_sources: List[str] = field(default_factory=list)

    def to_dict(self):
        return asdict(self)

def identify_revenue_levers(catalog_path: str) -> List[Dict[str, Any]]:
    """
    Reads the policy catalog and returns a list of revenue-related levers.
    Criteria: family='TAXES' OR budget_side='REVENUE'
    """
    with open(catalog_path, "r") as f:
        data = yaml.safe_load(f)
    
    revenue_levers = []
    for lever in data:
        is_tax = lever.get("family") == "TAXES"
        is_revenue_side = lever.get("budget_side") == "REVENUE"
        
        if is_tax or is_revenue_side:
            revenue_levers.append(lever)
            
    return revenue_levers

def generate_revenue_queries(lever: Dict[str, Any]) -> List[str]:
    """
    Generates search queries to find metadata for a revenue reform.
    """
    label = lever.get("label", "")
    description = lever.get("description", "")
    
    queries = [
        f'"{label}" avis cour des comptes',
        f'"{label}" points de vigilance',
        f'"{label}" critique',
        f'"{label}" rendement budgétaire',
        f'"{label}" impact économique',
    ]
    return queries

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
    return []

def research_lever(query: str) -> list[dict]:
    """
    Perform search and return raw results.
    """
    return google_web_search(query)

def synthesize_research(lever_id: str, search_results: list[dict]) -> str:
    """
    Agent-LLM synthesis of search results into a YAML snippet.
    """
    return f"# Suggested enrichment for {lever_id} based on {len(search_results)} sources\n"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tools/research_policy.py <catalog_path> [action]")
        print("Actions: identify, research <lever_id>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "identify":
        catalog_path = sys.argv[2] if len(sys.argv) > 2 else "data/policy_levers.yaml"
        levers = identify_revenue_levers(catalog_path)
        print(f"Found {len(levers)} revenue levers.")
        for l in levers:
            print(f"- {l['id']}: {l['label']}")
    else:
        # Fallback to old behavior for compatibility if needed, or just handle research
        pass