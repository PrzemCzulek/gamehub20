import { getDatabaseUrl, getSql, initializeDatabase, mapScoreRow } from './lib/db.mjs';
import { getGame } from './lib/games.mjs';
import { handleOptions, json } from './lib/http.mjs';

function isPlainObject(value) {
  return value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value));
}

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function validateScore(payload) {
  const errors = [];
  const playerId = typeof payload.playerId === 'string' ? payload.playerId.trim() : '';
  const playerName = typeof payload.playerName === 'string' ? payload.playerName.trim() : '';
  const gameId = typeof payload.gameId === 'string' ? payload.gameId : '';
  const score = readNumber(payload.score);
  const scoreLabel = typeof payload.scoreLabel === 'string' ? payload.scoreLabel.trim() : '';

  if (!playerId) errors.push('playerId is required');
  if (!playerName) errors.push('playerName is required');
  if (playerName.length > 24) errors.push('playerName must be 24 characters or less');
  if (!getGame(gameId)) errors.push('gameId is invalid');
  if (score === undefined) errors.push('score must be a finite number');
  if (!scoreLabel) errors.push('scoreLabel is required');
  if (!isPlainObject(payload.stats)) errors.push('stats must be an object');
  if (!isPlainObject(payload.meta)) errors.push('meta must be an object');

  if (score !== undefined) {
    if (gameId === 'typing-speed' && score > 300) errors.push('typing-speed score is too high');
    if (gameId === 'reaction-time' && score < 80) errors.push('reaction-time score is too low');
    if (gameId === 'aim-test' && score < 0) errors.push('aim-test score cannot be negative');
  }

  return {
    errors,
    value: {
      playerId,
      playerName,
      gameId,
      score,
      scoreLabel,
      stats: payload.stats ?? {},
      meta: payload.meta ?? {},
      xpGained: readNumber(payload.xpGained),
      runDurationMs: readNumber(payload.runDurationMs),
      createdAt: Number.isFinite(new Date(payload.createdAt).getTime()) ? new Date(payload.createdAt).toISOString() : new Date().toISOString(),
    },
  };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions();
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { errors, value } = validateScore(payload);

  if (errors.length > 0) {
    return json(400, { error: 'Validation failed', details: errors });
  }

  try {
    if (!getDatabaseUrl()) {
      return json(503, {
        error: 'Database is not configured',
        details: ['Set NETLIFY_DATABASE_URL or DATABASE_URL. Local score remains saved in localStorage.'],
      });
    }

    await initializeDatabase();
    const sql = getSql();
    const [row] = await sql(
      `INSERT INTO scores (
        player_id,
        player_name,
        game_id,
        score,
        score_label,
        stats,
        meta,
        xp_gained,
        run_duration_ms,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10)
      RETURNING *`,
      [
        value.playerId,
        value.playerName,
        value.gameId,
        value.score,
        value.scoreLabel,
        JSON.stringify(value.stats),
        JSON.stringify(value.meta),
        value.xpGained ?? null,
        value.runDurationMs ?? null,
        value.createdAt,
      ],
    );

    return json(200, { score: mapScoreRow(row) });
  } catch (error) {
    console.error(error);
    return json(500, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
