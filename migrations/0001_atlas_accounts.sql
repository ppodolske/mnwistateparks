-- Atlas Accounts Stage 1. No data migrations from browser storage occur here.
-- Firebase uid is the stable identity. Google email is used only to match invitations.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(last_active_at);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  has_schedule INTEGER NOT NULL DEFAULT 0 CHECK (has_schedule IN (0,1)),
  bytes INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trips_owner ON trips(owner_uid, updated_at);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('editor','viewer')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY(trip_id,uid)
);
CREATE INDEX IF NOT EXISTS idx_trip_members_uid ON trip_members(uid, trip_id);

CREATE TABLE IF NOT EXISTS trip_invitations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('editor','viewer')),
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(uid),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  accepted_by TEXT REFERENCES users(uid),
  accepted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_invites_trip ON trip_invitations(trip_id,expires_at);

CREATE TABLE IF NOT EXISTS saved_parks (
  uid TEXT NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  park_slug TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  PRIMARY KEY(uid,park_slug)
);
