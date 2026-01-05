import json
import base64
import yaml

with open("data/cache/scenarios_dsl.json", "r") as f:
    data = json.load(f)

pension_cuts = []
for sid, b64_dsl in data.items():
    try:
        decoded = base64.b64decode(b64_dsl).decode('utf-8')
        # Check for keywords
        if any(kw in decoded.lower() for kw in ["pension", "retraite", "retirement"]):
            pension_cuts.append((sid, decoded))
    except:
        continue

print(f"Found {len(pension_cuts)} scenarios with pension/retirement keywords.")
for sid, dsl in pension_cuts[:5]:
    print(f"\n--- Scenario {sid} ---")
    print(dsl)
