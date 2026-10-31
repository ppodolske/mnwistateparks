-- No existing tables are replaced. Source keys are private to the importing owner.
CREATE TABLE IF NOT EXISTS atlas_admin (
  id INTEGER PRIMARY KEY CHECK(id=1),
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE RESTRICT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trip_imports (
  owner_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  source_id TEXT NOT NULL,
  trip_id TEXT NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(owner_uid,source_id)
);
CREATE INDEX IF NOT EXISTS idx_trip_imports_owner ON trip_imports(owner_uid,created_at);
