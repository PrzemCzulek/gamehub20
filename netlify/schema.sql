CREATE TABLE IF NOT EXISTS leaderboard_scores (
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

CREATE INDEX IF NOT EXISTS leaderboard_scores_game_id_idx ON leaderboard_scores (game_id);
CREATE INDEX IF NOT EXISTS leaderboard_scores_created_at_idx ON leaderboard_scores (created_at DESC);
CREATE INDEX IF NOT EXISTS leaderboard_scores_score_idx ON leaderboard_scores (score);
CREATE INDEX IF NOT EXISTS leaderboard_scores_player_id_idx ON leaderboard_scores (player_id);
