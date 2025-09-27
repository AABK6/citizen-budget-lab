from __future__ import annotations

import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def test_piece_mission_weights_sum_to_one():
    cfg_path = DATA_DIR / "lego_pieces.json"
    data = json.loads(cfg_path.read_text(encoding="utf-8"))
    for piece in data.get("pieces", []):
        missions = (piece.get("mapping") or {}).get("mission") or []
        weights = [float(entry.get("weight", 0.0)) for entry in missions]
        if weights:
            total = sum(weights)
            assert abs(total - 1.0) < 1e-6, f"Mission weights must sum to 1.0 for piece {piece.get('id')}"
        else:
            # Revenue pieces can omit mission mapping for now
            assert piece.get("type") != "expenditure" or piece.get("id") == "test_piece_no_cofog"


def test_piece_mission_codes_not_empty_strings():
    cfg_path = DATA_DIR / "lego_pieces.json"
    data = json.loads(cfg_path.read_text(encoding="utf-8"))
    for piece in data.get("pieces", []):
        missions = (piece.get("mapping") or {}).get("mission") or []
        for entry in missions:
            code = str(entry.get("code", ""))
            assert code.strip(), f"Mission code missing for piece {piece.get('id')}"
            assert code.isupper(), "Mission codes should be uppercase identifiers"
