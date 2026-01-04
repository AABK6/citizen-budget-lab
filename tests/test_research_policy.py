import pytest
from unittest.mock import patch, MagicMock
import yaml
import os

# We will implement these in tools/research_policy.py
# from tools.research_policy import RevenuePolicyResearcher, identify_revenue_levers

def test_identify_revenue_levers(tmp_path):
    """Test that we correctly filter revenue levers from a mock catalog."""
    
    # Create a mock policy_levers.yaml
    catalog_data = [
        {
            "id": "rev_vat_increase",
            "family": "TAXES",
            "label": "Hausse TVA",
            "description": "..."
        },
        {
            "id": "exp_school_supplies",
            "family": "EDUCATION",
            "label": "Fournitures scolaires",
            "description": "..."
        },
        {
            "id": "soc_pension_reval",
            "family": "SOCIAL_SECURITY",
            "budget_side": "REVENUE", 
            "label": "Cotisation retraite",
            "description": "..."
        }
    ]
    
    catalog_file = tmp_path / "policy_levers.yaml"
    with open(catalog_file, "w") as f:
        yaml.dump(catalog_data, f)
        
    from tools.research_policy import identify_revenue_levers
    
    revenue_levers = identify_revenue_levers(str(catalog_file))
    
    assert len(revenue_levers) == 2
    ids = [l["id"] for l in revenue_levers]
    assert "rev_vat_increase" in ids
    assert "soc_pension_reval" in ids
    assert "exp_school_supplies" not in ids

def test_generate_revenue_queries():
    """Test that we generate appropriate search queries for revenue items."""
    from tools.research_policy import generate_revenue_queries
    
    lever = {
        "id": "rev_vat_increase",
        "label": "Hausse de la TVA",
        "description": "Passer le taux normal de 20% à 22%."
    }
    
    queries = generate_revenue_queries(lever)
    
    assert any("Hausse de la TVA" in q for q in queries)
    assert any("vigilance" in q.lower() or "critique" in q.lower() for q in queries)
    assert any("recettes" in q.lower() or "rendement" in q.lower() for q in queries)

def test_revenue_metadata_structure():
    """Test the structure of the enriched metadata."""
    from tools.research_policy import RevenueReformMetadata
    
    meta = RevenueReformMetadata(
        lever_id="test",
        vigilance_points=["Point 1", "Point 2"],
        pros=["Money"],
        cons=["Unpopular"],
        authoritative_sources=["http://source.com"]
    )
    
    as_dict = meta.to_dict()
    assert "vigilance_points" in as_dict
    assert len(as_dict["vigilance_points"]) == 2