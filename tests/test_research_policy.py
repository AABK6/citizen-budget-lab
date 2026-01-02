import pytest
from unittest.mock import patch, MagicMock
# We'll implement this soon
# from tools.research_policy import extract_impact_from_text, PolicyResearcher

def test_extract_impact_from_text_simple():
    """Test extraction of fiscal impact from a simple string."""
    from tools.research_policy import extract_impact_from_text
    text = "The estimated savings are 500 million euros in 2026."
    impact = extract_impact_from_text(text)
    # Depending on how we implement it (regex or LLM)
    assert impact == 500_000_000

def test_extract_mission_from_text():
    """Test extraction of administrative mission from a simple string."""
    from tools.research_policy import extract_mission_from_text
    text = "This measure affects the Mission Justice."
    mission = extract_mission_from_text(text)
    assert mission == "JUSTICE"
