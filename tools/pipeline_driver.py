import json
import yaml
import os

STATUS_FILE = 'data/enrichment_status.json'
CATALOG_FILE = 'data/policy_levers.yaml'

def get_next_batch(size=10):
    with open(STATUS_FILE, 'r') as f:
        status = json.load(f)
    
    pending = [lid for lid, s in status.items() if s == 'pending']
    return pending[:size]

def generate_queries(batch):
    with open(CATALOG_FILE, 'r') as f:
        catalog = yaml.safe_load(f)
    
    levers = {it['id']: it for it in catalog}
    queries = []
    for lid in batch:
        l = levers.get(lid)
        if not l: continue
        label = l.get('label', lid)
        queries.append(f"PLF 2026 impact budgétaire mission {label}")
    return queries

if __name__ == "__main__":
    batch = get_next_batch()
    if not batch:
        print("Pipeline complete!")
    else:
        print(f"Next batch: {batch}")
        queries = generate_queries(batch)
        for q in queries:
            print(f"- {q}")
