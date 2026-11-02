-- 小法師 雲端存檔與排行榜
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS saves (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  player_id TEXT PRIMARY KEY REFERENCES players(id),
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  bosses INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0,
  play_time REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_level ON scores (level DESC, bosses DESC, kills DESC);
CREATE INDEX IF NOT EXISTS idx_scores_kills ON scores (kills DESC);
