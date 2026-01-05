import sys
import os
# Add project root to path
sys.path.append(os.getcwd())
from services.api.votes_store import SqliteVoteStore, VoteSummary

path = "data/manual_verify.sqlite3"
if os.path.exists(path):
    os.remove(path)
    
store = SqliteVoteStore(path)
print("Store initialized.")

store.save_scenario("man_1", '{"test": true}')
print(f"Scenario Saved: {store.get_scenario('man_1')}")

store.add_vote("man_1", "me@test.com", {"timestamp": 1234567890})
summary = store.summary(1)
print(f"Votes: {summary}")

if os.path.exists(path):
    os.remove(path)
    print("Cleanup done.")
