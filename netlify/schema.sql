CREATE TABLE IF NOT EXISTS scores (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT NOT NULL,
  player_name VARCHAR(24) NOT NULL,
  game_id TEXT NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  score_label TEXT NOT NULL,
  stats JSONB DEFAULT '{}'::jsonb,
  meta JSONB DEFAULT '{}'::jsonb,
  xp_gained INTEGER,
  run_duration_ms INTEGER,
  leaderboard_scope TEXT NOT NULL DEFAULT 'default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_game_id_idx ON scores (game_id);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at DESC);
CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score);
CREATE INDEX IF NOT EXISTS scores_player_id_idx ON scores (player_id);
CREATE INDEX IF NOT EXISTS scores_leaderboard_scope_idx ON scores (leaderboard_scope);
CREATE UNIQUE INDEX IF NOT EXISTS scores_player_game_scope_unique_idx ON scores (player_id, game_id, leaderboard_scope);

CREATE TABLE IF NOT EXISTS player_profiles (
  player_id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_score_entries INTEGER DEFAULT 0,
  favorite_game TEXT,
  best_game TEXT,
  achievements_unlocked INTEGER DEFAULT 0,
  achievements_total INTEGER DEFAULT 0,
  highlights JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_profiles_updated_at_idx ON player_profiles (updated_at DESC);
