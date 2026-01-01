CREATE TABLE IF NOT EXISTS vote_stats (
  scenario_id TEXT PRIMARY KEY,
  vote_count INTEGER DEFAULT 0,
  last_ts DOUBLE PRECISION
);
