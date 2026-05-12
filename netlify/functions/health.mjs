import { handleOptions, json } from './lib/http.mjs';

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return handleOptions();
    }

    return json(200, {
      ok: true,
      hasDatabaseUrl: Boolean(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL),
      nodeEnv: process.env.NODE_ENV,
    });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
