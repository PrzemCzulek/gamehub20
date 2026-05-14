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

function readDurationSeconds(value, gameId) {
  const fallback = gameId === 'time-sense' ? 10 : gameId === 'cps-test' ? 5 : 30;
  const allowed =
    gameId === 'time-sense'
      ? [10, 20, 30, 60]
      : gameId === 'stroop-test'
        ? [30, 60]
        : gameId === 'cps-test'
          ? [1, 5, 10, 30, 60]
          : [15, 30, 60, 90];
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return allowed.includes(parsed) ? parsed : fallback;
}

function readCpsInputMode(value) {
  return value === 'space' || value === 'alternating' ? value : 'normal';
}

function readAimMode(value) {
  return value === '15s' || value === 'infinity' ? value : '30s';
}

function getLeaderboardScope(gameId, durationSeconds, inputMode, aimMode) {
  if (gameId === 'cps-test') {
    if (inputMode === 'alternating') return `${durationSeconds}s-alt`;
    if (inputMode === 'space') return `${durationSeconds}s-space`;
    return `${durationSeconds}s`;
  }

  if (gameId === 'aim-test') {
    return `mode:${aimMode}`;
  }

  return `duration:${durationSeconds}`;
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
    const usesDurationScope = gameId === 'typing-speed' || gameId === 'time-sense' || gameId === 'stroop-test' || gameId === 'cps-test';
    const usesModeScope = gameId === 'aim-test';
    const durationSeconds = usesDurationScope ? readDurationSeconds(params.durationSeconds, gameId) : undefined;
    const inputMode = gameId === 'cps-test' ? readCpsInputMode(params.inputMode) : undefined;
    const aimMode = usesModeScope ? readAimMode(params.mode) : undefined;
    const leaderboardScope = usesDurationScope || usesModeScope ? getLeaderboardScope(gameId, durationSeconds, inputMode, aimMode) : 'default';
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
        inputMode,
        mode: aimMode,
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
      inputMode,
      mode: aimMode,
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
