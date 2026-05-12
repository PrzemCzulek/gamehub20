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
        leaderboard_scope TEXT NOT NULL DEFAULT 'default',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
      .then(() => sql.query("ALTER TABLE scores ADD COLUMN IF NOT EXISTS leaderboard_scope TEXT NOT NULL DEFAULT 'default'"))
      .then(() =>
        sql.query(`
          UPDATE scores
          SET leaderboard_scope = CONCAT(
            'duration:',
            COALESCE(
              stats ->> 'selectedDuration',
              stats ->> 'durationSeconds',
              CASE
                WHEN stats ? 'durationMs' THEN CAST(ROUND(((stats ->> 'durationMs')::numeric / 1000)) AS TEXT)
                WHEN run_duration_ms IS NOT NULL THEN CAST(ROUND(run_duration_ms::numeric / 1000) AS TEXT)
                ELSE '30'
              END
            )
          )
          WHERE game_id = 'typing-speed'
        `),
      )
      .then(() => sql.query("UPDATE scores SET leaderboard_scope = 'default' WHERE game_id <> 'typing-speed' OR leaderboard_scope IS NULL"))
      .then(() => sql.query('DROP INDEX IF EXISTS scores_player_game_unique_idx'))
      .then(() =>
        sql.query(
          `
            WITH ranked_scores AS (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  PARTITION BY player_id, game_id, leaderboard_scope
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
          sql.query('CREATE INDEX IF NOT EXISTS scores_leaderboard_scope_idx ON scores (leaderboard_scope)'),
          sql.query('CREATE UNIQUE INDEX IF NOT EXISTS scores_player_game_scope_unique_idx ON scores (player_id, game_id, leaderboard_scope)'),
        ]),
      )
      .then(() =>
        sql.query(`
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
          )
        `),
      )
      .then(() => sql.query('CREATE INDEX IF NOT EXISTS player_profiles_updated_at_idx ON player_profiles (updated_at DESC)'))
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
    leaderboardScope: row.leaderboard_scope ?? 'default',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export function mapPlayerProfileRow(row) {
  return {
    playerId: row.player_id,
    playerName: row.player_name,
    level: Number(row.level ?? 1),
    xp: Number(row.xp ?? 0),
    gamesPlayed: Number(row.games_played ?? 0),
    totalScoreEntries: Number(row.total_score_entries ?? 0),
    favoriteGame: row.favorite_game ?? undefined,
    bestGame: row.best_game ?? undefined,
    achievementsUnlocked: Number(row.achievements_unlocked ?? 0),
    achievementsTotal: Number(row.achievements_total ?? 0),
    highlights: row.highlights ?? {},
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
