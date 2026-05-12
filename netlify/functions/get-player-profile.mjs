import { getDatabaseUrl, getSql, initializeDatabase, mapPlayerProfileRow } from './lib/db.mjs';
import { handleOptions, json } from './lib/http.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    if (event.httpMethod !== 'GET') {
      return json(405, { ok: false, error: 'Method not allowed' });
    }

    const params = event.queryStringParameters ?? {};
    const playerId = typeof params.playerId === 'string' ? params.playerId.trim() : '';

    if (!playerId || playerId.length > 128) {
      return json(400, { ok: false, error: 'playerId is required or invalid' });
    }

    if (!getDatabaseUrl()) {
      return json(503, { ok: false, error: 'Database URL missing' });
    }

    await initializeDatabase();
    const sql = getSql();
    const [row] = await sql.query(
      `
        SELECT *
        FROM player_profiles
        WHERE player_id = $1
        LIMIT 1
      `,
      [playerId],
    );

    if (!row) {
      return json(404, { ok: false, error: 'Profile not found' });
    }

    return json(200, {
      ok: true,
      profile: mapPlayerProfileRow(row),
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
