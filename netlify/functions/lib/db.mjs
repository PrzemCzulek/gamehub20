import { neon } from '@netlify/neon';

let sqlClient;
let initializePromise;

const ascendingScoreGames = ['reaction-time', 'symbol-match'];

export function getDatabaseUrl() {
  return process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '';
}

export function getSql() {
  const netlifyDatabaseUrl = process.env.NETLIFY_DATABASE_URL;
  const fallbackDatabaseUrl = process.env.DATABASE_URL;
  const databaseUrl = netlifyDatabaseUrl || fallbackDatabaseUrl || '';
  console.log('DATABASE URL EXISTS:', Boolean(databaseUrl));

  if (!databaseUrl) {
    throw new Error('Missing database connection string. Set NETLIFY_DATABASE_URL for Netlify Functions.');
  }

  if (!sqlClient) {
    sqlClient = neon(netlifyDatabaseUrl || fallbackDatabaseUrl);
  }

  return sqlClient;
}

export async function initializeDatabase() {
  if (!initializePromise) {
    const sql = getSql();
    initializePromise = sql.query(`
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
    `)
      .then(() =>
        sql.query(
          `
            WITH ranked_scores AS (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY player_id, game_id
                  ORDER BY
                    CASE WHEN game_id = ANY($1) THEN score END ASC NULLS LAST,
                    CASE WHEN NOT (game_id = ANY($1)) THEN score END DESC NULLS LAST,
                    created_at DESC,
                    id DESC
                ) AS rank
              FROM scores
            )
            DELETE FROM scores
            WHERE id IN (
              SELECT id
              FROM ranked_scores
              WHERE rank > 1
            )
          `,
          [ascendingScoreGames],
        ),
      )
      .then(() =>
        Promise.all([
          sql.query('CREATE INDEX IF NOT EXISTS scores_game_id_idx ON scores (game_id)'),
          sql.query('CREATE INDEX IF NOT EXISTS scores_created_at_idx ON scores (created_at DESC)'),
          sql.query('CREATE INDEX IF NOT EXISTS scores_score_idx ON scores (score)'),
          sql.query('CREATE INDEX IF NOT EXISTS scores_player_id_idx ON scores (player_id)'),
          sql.query('CREATE UNIQUE INDEX IF NOT EXISTS scores_player_game_unique_idx ON scores (player_id, game_id)'),
        ]),
      )
      .catch((error) => {
        initializePromise = undefined;
        throw error;
      });
  }

  return initializePromise;
}

export const ensureLeaderboardTable = initializeDatabase;

export function mapScoreRow(row) {
  return {
    id: row.id?.toString?.() ?? String(row.id),
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
