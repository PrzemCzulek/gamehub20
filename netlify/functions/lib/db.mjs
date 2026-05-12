import { neon } from '@netlify/neon';

let sqlClient;
let setupPromise;

export function getSql() {
  if (!sqlClient) {
    sqlClient = neon();
  }

  return sqlClient;
}

export async function ensureLeaderboardTable() {
  if (!setupPromise) {
    const sql = getSql();
    setupPromise = sql`
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
      )
    `.then(() =>
      sql.transaction([
        sql`CREATE INDEX IF NOT EXISTS leaderboard_scores_game_id_idx ON leaderboard_scores (game_id)`,
        sql`CREATE INDEX IF NOT EXISTS leaderboard_scores_created_at_idx ON leaderboard_scores (created_at DESC)`,
        sql`CREATE INDEX IF NOT EXISTS leaderboard_scores_score_idx ON leaderboard_scores (score)`,
        sql`CREATE INDEX IF NOT EXISTS leaderboard_scores_player_id_idx ON leaderboard_scores (player_id)`,
      ]),
    );
  }

  return setupPromise;
}

export function mapScoreRow(row) {
  return {
    id: row.id,
    playerId: row.player_id,
    playerName: row.player_name,
    gameId: row.game_id,
    score: Number(row.score),
    scoreLabel: row.score_label,
    stats: row.stats ?? {},
    meta: row.meta ?? {},
    xpGained: row.xp_gained ?? undefined,
    runDurationMs: row.run_duration_ms ?? undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
