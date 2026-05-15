import { getDatabaseUrl, getSql, initializeDatabase } from './lib/db.mjs';
import { handleOptions, json } from './lib/http.mjs';

function validatePayload(payload) {
  const playerId = typeof payload.playerId === 'string' ? payload.playerId.trim() : '';
  const username = typeof payload.username === 'string' ? payload.username.trim() : '';
  const dryRun = payload.dryRun === true;
  const errors = [];

  if (!playerId || !playerId.startsWith('gh2_') || playerId.length > 64) {
    errors.push('playerId must be a gh2_ internal id');
  }

  if (!username || username.length > 24) {
    errors.push('username is required and must be 24 characters or less');
  }

  return {
    errors,
    value: { playerId, username, dryRun },
  };
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed' });
    }

    let payload;

    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'Invalid JSON' });
    }

    const { errors, value } = validatePayload(payload ?? {});

    if (errors.length > 0) {
      return json(400, { ok: false, error: 'Validation failed', details: errors });
    }

    if (!getDatabaseUrl()) {
      return json(503, { ok: false, error: 'Database URL missing' });
    }

    await initializeDatabase();
    const sql = getSql();

    // Legacy claim is username-based and should be replaced/secured by auth when accounts are added.
    const [totalRow] = await sql.query(
      `
        SELECT COUNT(*)::int AS count
        FROM scores
        WHERE player_id IS NULL
          AND player_name = $1
      `,
      [value.username],
    );

    const [claimableRow] = await sql.query(
      `
        SELECT COUNT(*)::int AS count
        FROM scores legacy
        WHERE legacy.player_id IS NULL
          AND legacy.player_name = $1
          AND NOT EXISTS (
            SELECT 1
            FROM scores owned
            WHERE owned.player_id = $2
              AND owned.game_id = legacy.game_id
              AND owned.leaderboard_scope = legacy.leaderboard_scope
          )
      `,
      [value.username, value.playerId],
    );

    const total = Number(totalRow?.count ?? 0);
    const claimable = Number(claimableRow?.count ?? 0);

    if (value.dryRun) {
      return json(200, {
        ok: true,
        dryRun: true,
        count: claimable,
        total,
        skippedConflicts: Math.max(0, total - claimable),
      });
    }

    const rows = await sql.query(
      `
        WITH claimable AS (
          SELECT legacy.id
          FROM scores legacy
          WHERE legacy.player_id IS NULL
            AND legacy.player_name = $2
            AND NOT EXISTS (
              SELECT 1
              FROM scores owned
              WHERE owned.player_id = $1
                AND owned.game_id = legacy.game_id
                AND owned.leaderboard_scope = legacy.leaderboard_scope
            )
        )
        UPDATE scores
        SET player_id = $1
        WHERE id IN (SELECT id FROM claimable)
        RETURNING id
      `,
      [value.playerId, value.username],
    );

    return json(200, {
      ok: true,
      updated: rows.length,
      total,
      skippedConflicts: Math.max(0, total - rows.length),
    });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
