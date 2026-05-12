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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scores_game_id_idx ON scores (game_id);
CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at DESC);
CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score);
CREATE INDEX IF NOT EXISTS scores_player_id_idx ON scores (player_id);
CREATE UNIQUE INDEX IF NOT EXISTS scores_player_game_unique_idx ON scores (player_id, game_id);
