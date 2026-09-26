-- Durable application state used by the API persistence adapter.
CREATE TABLE IF NOT EXISTS application_state (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);