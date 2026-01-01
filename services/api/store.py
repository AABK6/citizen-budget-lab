from __future__ import annotations

import base64
import json
import logging
import yaml
from typing import Dict, Optional, Any

from .votes_store import get_vote_store

logger = logging.getLogger(__name__)

class DBBackedScenarioDSLStore:
    def get(self, sid: str, default: Any = None) -> str | None:
        try:
            # DB returns JSON string (or dict/list depending on driver).
            # We need to return base64 encoded string to match original contract.
            raw = get_vote_store().get_scenario(sid)
            if not raw:
                return default
            
            # If it's already a string, parse it to ensure we have the object to re-serialize canonically?
            # Or just assume it's the JSON representation.
            # The app expects Base64 encoded YAML/JSON.
            # Let's assume we stored it as JSON.
            # Convert JSON string back to object, then dump to YAML, then b64 encode?
            # Or just return it as b64 encoded JSON (valid for app loader).
            
            # raw is a JSON string from DB
            return base64.b64encode(raw.encode("utf-8")).decode("ascii")
        except Exception as e:
            logger.error(f"Failed to get scenario DSL {sid}: {e}")
            return default

    def __contains__(self, sid: str) -> bool:
        return self.get(sid) is not None

    def __setitem__(self, sid: str, dsl_b64: str) -> None:
        set_dsl(sid, dsl_b64)

    def __delitem__(self, sid: str) -> None:
        # Not implemented in DB store yet (soft delete?)
        pass

class DBBackedScenarioMetaStore:
    def get(self, sid: str, default: Any = None) -> Dict[str, str]:
        # We don't have a separate table/column just for meta retrieval in the simplified store yet,
        # or we merged it into `scenarios` table.
        # PostgresVoteStore.get_scenario returns DSL.
        # We need get_scenario_meta.
        # For now, let's return empty defaults or implement get_scenario_meta in VoteStore.
        return {"title": "", "description": ""}

    def __contains__(self, sid: str) -> bool:
        return True # Optimistic

# Proxies
scenario_dsl_store = DBBackedScenarioDSLStore()
scenario_store = DBBackedScenarioMetaStore() # Placeholder for meta

def set_meta(sid: str, title: str | None = None, description: str | None = None) -> None:
    # We need to implement meta update in VoteStore if we want to persist titles
    # For now, we focus on DSL persistence.
    pass

def set_dsl(sid: str, dsl_b64: str) -> None:
    try:
        decoded = base64.b64decode(dsl_b64).decode('utf-8')
        # Ensure it's valid structure
        obj = yaml.safe_load(decoded)
        json_str = json.dumps(obj)
        get_vote_store().save_scenario(sid, json_str)
    except Exception as e:
        logger.error(f"Failed to save scenario {sid}: {e}")

def add_vote(sid: str, meta: Dict) -> None:
    # Use the proper vote store method via schema mutation
    # This is legacy fallback
    get_vote_store().add_vote(sid, None, meta)

def delete(sid: str) -> bool:
    return False