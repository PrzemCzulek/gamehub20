import { getDatabaseUrl, getSql, mapPlayerProfileRow, mapScoreRow } from './lib/db.mjs';
import { handleOptions, json } from './lib/http.mjs';

const ACHIEVEMENTS_TOTAL_FALLBACK = 32;
const debugProfileEnabled = process.env.NODE_ENV !== 'production' || process.env.LEADERBOARD_DEBUG === 'true' || process.env.DEBUG_LEADERBOARD === 'true';
const playerIdPattern = /^[A-Za-z0-9_-]{3,80}$/;

function debugProfile(payload) {
  if (debugProfileEnabled) {
    console.log('get-player-profile debug', payload);
  }
}

function buildFallbackProfile(playerId, scoreRows) {
  const scores = scoreRows.map(mapScoreRow);
  const latestScore = scores[0];
  const username = latestScore?.playerName ?? 'Gracz';
  const gameCounts = new Map();

  for (const score of scores) {
    gameCounts.set(score.gameId, (gameCounts.get(score.gameId) ?? 0) + 1);
  }

  const favoriteGame = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    playerId,
    playerName: username,
    username,
    level: 1,
    xp: 0,
    gamesPlayed: gameCounts.size,
    totalScoreEntries: scores.length,
    favoriteGame,
    bestGame: favoriteGame,
    achievementsUnlocked: 0,
    achievementsTotal: ACHIEVEMENTS_TOTAL_FALLBACK,
    achievements: {
      unlocked: 0,
      total: ACHIEVEMENTS_TOTAL_FALLBACK,
    },
    equippedCosmetics: {},
    highlights: {},
    updatedAt: latestScore?.createdAt,
  };
}

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

    if (!playerIdPattern.test(playerId)) {
      return json(400, { ok: false, error: 'playerId is required or invalid' });
    }

    if (!getDatabaseUrl()) {
      return json(200, { ok: false, profile: null, error: 'profile_unavailable' });
    }

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

    debugProfile({
      stage: 'profile_lookup',
      requestedPlayerId: playerId,
      profileFound: Boolean(row),
    });

    if (row) {
      const profile = mapPlayerProfileRow(row);

      return json(200, {
        ok: true,
        profile: {
          ...profile,
          achievements: {
            unlocked: profile.achievementsUnlocked,
            total: profile.achievementsTotal || ACHIEVEMENTS_TOTAL_FALLBACK,
          },
        },
      });
    }

    const scoreRows = await sql.query(
      `
        SELECT *
        FROM scores
        WHERE player_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [playerId],
    );

    debugProfile({
      stage: 'score_fallback_lookup',
      requestedPlayerId: playerId,
      fallbackFromScores: scoreRows.length > 0,
      scoreCount: scoreRows.length,
    });

    if (scoreRows.length === 0) {
      return json(404, { ok: false, error: 'Profile not found' });
    }

    return json(200, {
      ok: true,
      profile: buildFallbackProfile(playerId, scoreRows),
    });
  } catch (error) {
    console.error('get-player-profile unavailable', error);
    return json(200, {
      ok: false,
      profile: null,
      error: 'profile_unavailable',
    });
  }
}
