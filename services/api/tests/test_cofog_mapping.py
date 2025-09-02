import json
import os


def test_cofog_weights_sum_to_one():
    here = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    path = os.path.join(here, 'data', 'cofog_mapping.json')
    with open(path, 'r', encoding='utf-8') as f:
        js = json.load(f)
    mapping = js.get('mission_to_cofog', {})
    assert mapping, 'Expected mission_to_cofog mapping'
    for mission, arr in mapping.items():
        s = sum(float(e.get('weight', 0.0)) for e in arr)
        assert abs(s - 1.0) < 1e-9, f'Weights must sum to 1 for mission {mission}'

