import { getDatabaseUrl, getSql, initializeDatabase } from './lib/db.mjs';
import { handleOptions, json } from './lib/http.mjs';

function canReset(event) {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  const expectedKey = process.env.DEV_RESET_KEY;
  const providedKey = event.headers?.['x-dev-reset-key'] ?? event.headers?.['X-Dev-Reset-Key'];

  return Boolean(expectedKey && providedKey && providedKey === expectedKey);
}

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed' });
    }

    if (!canReset(event)) {
      return json(403, { ok: false, error: 'Forbidden' });
    }

    if (!getDatabaseUrl()) {
      return json(503, { ok: false, error: 'Database URL missing' });
    }

    await initializeDatabase();
    const sql = getSql();
    await sql.query('TRUNCATE TABLE scores RESTART IDENTITY CASCADE');

    return json(200, { ok: true });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
