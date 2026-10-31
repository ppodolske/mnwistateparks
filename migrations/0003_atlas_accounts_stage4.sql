-- Stage 4: per-user saved-park optimistic concurrency, no trip changes.
CREATE TABLE IF NOT EXISTS saved_parks_state (
  uid TEXT PRIMARY KEY REFERENCES users(uid) ON DELETE CASCADE,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at INTEGER NOT NULL DEFAULT 0,
  last_write_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_saved_parks_state_updated ON saved_parks_state(updated_at);
