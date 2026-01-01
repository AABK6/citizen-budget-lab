CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  timestamp DOUBLE PRECISION NOT NULL,
  user_email TEXT,
  meta_json TEXT NOT NULL
);
