import { neon } from '@netlify/neon';

let sqlClient;
let initializePromise;

export function getDatabaseUrl() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
}

export function getSql() {
  const databaseUrl = getDatabaseUrl();
  console.log('DATABASE URL EXISTS:', Boolean(databaseUrl));

  if (!databaseUrl) {
    throw new Error('Missing database connection string. Set NETLIFY_DATABASE_URL or DATABASE_URL.');
  }

  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

export async function initializeDatabase() {
  if (!initializePromise) {
    const sql = getSql();
    initializePromise = sql`
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
      )
    `.then(() =>
      sql.transaction([
        sql`CREATE INDEX IF NOT EXISTS scores_game_id_idx ON scores (game_id)`,
        sql`CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at DESC)`,
        sql`CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score)`,
        sql`CREATE INDEX IF NOT EXISTS scores_player_id_idx ON scores (player_id)`,
      ]),
    ).catch((error) => {
      initializePromise = undefined;
      throw error;
    });
  }

  return initializePromise;
}

export const ensureLeaderboardTable = initializeDatabase;

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
