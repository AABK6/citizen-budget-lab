import json

with open('data/lego_pieces.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"{'ID':<30} {'Label':<40} {'Amount':<15}")
print("-" * 85)

for piece in data['pieces']:
    if piece['type'] == 'revenue':
        # We don't have amount in lego_pieces.json, only in the query result.
        # But we can see the label.
        print(f"{piece['id']:<30} {piece['label']:<40}")
