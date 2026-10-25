-- Dire Dawa University Super Cup
-- SQLite schema. The server applies this file on startup.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  rules_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  college TEXT NOT NULL,
  group_id TEXT NOT NULL,
  color TEXT NOT NULL,
  pitch TEXT NOT NULL,
  coach TEXT NOT NULL DEFAULT '',
  crest_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  number INTEGER NOT NULL,
  nationality TEXT NOT NULL DEFAULT '',
  registered INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  photo_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  matchday INTEGER NOT NULL,
  home_id TEXT NOT NULL REFERENCES teams(id),
  away_id TEXT NOT NULL REFERENCES teams(id),
  venue TEXT NOT NULL,
  kickoff_date TEXT NOT NULL,
  kickoff_time TEXT NOT NULL,
  status TEXT NOT NULL,
  period TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL DEFAULT 0,
  running_since INTEGER,
  added_ms INTEGER NOT NULL DEFAULT 0,
  half_ms INTEGER NOT NULL,
  regulation_ms INTEGER NOT NULL,
  et_half_ms INTEGER NOT NULL,
  allow_extra INTEGER NOT NULL DEFAULT 0,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  pens_home INTEGER,
  pens_away INTEGER,
  confirmed INTEGER NOT NULL DEFAULT 0,
  referee TEXT NOT NULL DEFAULT '',
  assistant1 TEXT NOT NULL DEFAULT '',
  assistant2 TEXT NOT NULL DEFAULT '',
  formation_home TEXT NOT NULL DEFAULT '4-2-3-1',
  formation_away TEXT NOT NULL DEFAULT '4-2-3-1',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_squad (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  role TEXT NOT NULL,
  sort_index INTEGER NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS match_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  client_key TEXT UNIQUE,
  type TEXT NOT NULL,
  team_id TEXT,
  credited_team_id TEXT,
  player_id TEXT,
  assist_id TEXT,
  related_player_id TEXT,
  minute INTEGER NOT NULL,
  added_minute INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  goal_type TEXT,
  card_type TEXT,
  detail TEXT NOT NULL DEFAULT '',
  counts_for_score INTEGER NOT NULL DEFAULT 0,
  shootout INTEGER NOT NULL DEFAULT 0,
  scored INTEGER,
  voided INTEGER NOT NULL DEFAULT 0,
  void_reason TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id, voided, type);

CREATE TABLE IF NOT EXISTS manual_stats (
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (match_id, team_id, metric)
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  time_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at INTEGER NOT NULL
);
