CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    dsl_json JSONB NOT NULL,
    meta_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenarios_created_at ON scenarios(created_at);
