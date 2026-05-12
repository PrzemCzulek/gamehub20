import { getDatabaseUrl, getSql, initializeDatabase, mapScoreRow } from './lib/db.mjs';
import { getGame, getMetric } from './lib/games.mjs';
import { handleOptions, json } from './lib/http.mjs';

function readLimit(value) {
  const parsed = Number.parseInt(value ?? '15', 10);

  if (!Number.isFinite(parsed)) {
    return 15;
  }

  return Math.min(Math.max(parsed, 1), 50);
}

function readDurationSeconds(value) {
  const parsed = Number.parseInt(value ?? '30', 10);
  return [15, 30, 60, 90].includes(parsed) ? parsed : 30;
}

function getMetricExpression(metric) {
  if (!metric || metric.source === 'score') {
    return 'score';
  }

  const valueExpression = `COALESCE(stats, '{}'::jsonb) ->> '${metric.statKey}'`;
  return `CASE WHEN ${valueExpression} ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${valueExpression})::numeric ELSE NULL END`;
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'Method not allowed' });
    }

    const params = event.queryStringParameters ?? {};
    const gameId = typeof params.gameId === 'string' ? params.gameId : '';
    const game = getGame(gameId);

    if (!game) {
      return json(400, { error: 'gameId is required or invalid', entries: [], scores: [] });
    }

    const metric = getMetric(gameId, params.metric ?? 'score');
    const limit = readLimit(params.limit);
    const durationSeconds = gameId === 'typing-speed' ? readDurationSeconds(params.durationSeconds) : undefined;
    const leaderboardScope = gameId === 'typing-speed' ? `duration:${durationSeconds}` : 'default';
    const metricExpression = getMetricExpression(metric);
    const direction = metric?.direction === 'ascending' ? 'ASC' : 'DESC';
    const query = `
      SELECT *
      FROM scores
      WHERE game_id = $1
        AND leaderboard_scope = $2
        AND ${metricExpression} IS NOT NULL
      ORDER BY ${metricExpression} ${direction}, created_at DESC
      LIMIT $3
    `;

    if (!getDatabaseUrl()) {
      console.warn('get-leaderboard skipped: database URL is not configured');
      return json(200, {
        gameId,
        metric: params.metric ?? 'score',
        durationSeconds,
        limit,
        entries: [],
        scores: [],
        warning: 'Database URL missing',
      });
    }

    await initializeDatabase();
    const sql = getSql();
    const rows = await sql.query(query, [gameId, leaderboardScope, limit]);

    return json(200, {
      gameId,
      metric: params.metric ?? 'score',
      durationSeconds,
      limit,
      entries: rows.map(mapScoreRow),
      scores: rows.map(mapScoreRow),
    });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      entries: [],
      scores: [],
    });
  }
}
