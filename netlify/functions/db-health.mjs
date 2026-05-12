import { getDatabaseUrl, getSql, initializeDatabase } from './lib/db.mjs';
import { handleOptions, json } from './lib/http.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    if (!getDatabaseUrl()) {
      return json(503, {
        ok: false,
        hasDatabaseUrl: false,
        error: 'Database URL missing',
      });
    }

    await initializeDatabase();
    const sql = getSql();
    const rows = await sql`SELECT 1 AS ok`;

    return json(200, {
      ok: true,
      hasDatabaseUrl: true,
      result: rows[0] ?? null,
    });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      ok: false,
      hasDatabaseUrl: Boolean(getDatabaseUrl()),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
