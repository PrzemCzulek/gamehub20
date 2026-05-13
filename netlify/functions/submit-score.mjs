import { getDatabaseUrl, getSql, initializeDatabase, mapScoreRow } from './lib/db.mjs';
import { getGame } from './lib/games.mjs';
import { handleOptions, json } from './lib/http.mjs';

const debugSubmitEnabled = process.env.NODE_ENV !== 'production' || process.env.LEADERBOARD_DEBUG === 'true' || process.env.DEBUG_LEADERBOARD === 'true';

function debugSubmit(payload) {
  if (debugSubmitEnabled) {
    console.log('submit-score debug', payload);
  }
}

function isPlainObject(value) {
  return value === undefined || (value !== null && typeof value === 'object' && !Array.isArray(value));
}

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getDurationSeconds(stats) {
  return readNumber(stats?.selectedDuration) ?? readNumber(stats?.durationSeconds);
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

  try {
    if (JSON.stringify(payload.stats ?? {}).length > 20000) errors.push('stats payload is too large');
    if (JSON.stringify(payload.meta ?? {}).length > 20000) errors.push('meta payload is too large');
  } catch {
    errors.push('stats/meta must be JSON serializable');
  }

  if (score !== undefined) {
    if (gameId === 'typing-speed' && score > 300) errors.push('typing-speed score is too high');
    if (gameId === 'reaction-time' && score < 50) errors.push('reaction-time score is too low');
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

function isBetterScore(game, nextScore, currentScore) {
  return game.scoreDirection === 'ascending' ? nextScore < currentScore : nextScore > currentScore;
}

function getLeaderboardScope(value) {
  if (value.gameId !== 'typing-speed' && value.gameId !== 'time-sense' && value.gameId !== 'stroop-test') {
    return 'default';
  }

  const durationSeconds = getDurationSeconds(value.stats);

  if (!durationSeconds) {
    const fallbackDuration = value.gameId === 'time-sense' ? 10 : 30;
    console.warn(`${value.gameId} score missing durationSeconds/selectedDuration; falling back to ${fallbackDuration}s scope`);
    return `duration:${fallbackDuration}`;
  }

  return `duration:${durationSeconds}`;
}

function getLevelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

function createHighlight(value, metricValue = value.score) {
  return {
    gameId: value.gameId,
    score: value.score,
    scoreLabel: value.scoreLabel,
    metricValue,
    stats: value.stats,
    createdAt: value.createdAt,
  };
}

function isBetterHighlight(nextValue, currentHighlight, direction) {
  if (nextValue === undefined) {
    return false;
  }

  if (!currentHighlight || typeof currentHighlight.metricValue !== 'number') {
    return true;
  }

  return direction === 'ascending' ? nextValue < currentHighlight.metricValue : nextValue > currentHighlight.metricValue;
}

function mergeHighlights(currentHighlights, value) {
  const highlights = currentHighlights && typeof currentHighlights === 'object' && !Array.isArray(currentHighlights) ? { ...currentHighlights } : {};
  const accuracy = readNumber(value.stats?.accuracy);
  const bestSimilarity = readNumber(value.stats?.bestSimilarity) ?? readNumber(value.stats?.finalSimilarity) ?? readNumber(value.stats?.averageSimilarity);
  const moves = readNumber(value.stats?.moves) ?? value.score;
  const completedRound = readNumber(value.stats?.completedRound) ?? value.score;

  if (value.gameId === 'reaction-time' && isBetterHighlight(value.score, highlights.bestReactionTime, 'ascending')) {
    highlights.bestReactionTime = createHighlight(value);
  }

  if (value.gameId === 'typing-speed') {
    if (isBetterHighlight(value.score, highlights.bestTypingWpm, 'descending')) {
      highlights.bestTypingWpm = createHighlight(value);
    }

    if (isBetterHighlight(accuracy, highlights.bestTypingAccuracy, 'descending')) {
      highlights.bestTypingAccuracy = createHighlight(value, accuracy);
    }
  }

  if (value.gameId === 'aim-test' && isBetterHighlight(accuracy, highlights.bestAimAccuracy, 'descending')) {
    highlights.bestAimAccuracy = createHighlight(value, accuracy);
  }

  if (value.gameId === 'color-memory' && isBetterHighlight(bestSimilarity, highlights.bestColorSimilarity, 'descending')) {
    highlights.bestColorSimilarity = createHighlight(value, bestSimilarity);
  }

  if (value.gameId === 'word-memory' && isBetterHighlight(value.score, highlights.bestWordMemoryScore, 'descending')) {
    highlights.bestWordMemoryScore = createHighlight(value);
  }

  if (value.gameId === 'symbol-match' && isBetterHighlight(moves, highlights.bestSymbolMatchMoves, 'ascending')) {
    highlights.bestSymbolMatchMoves = createHighlight(value, moves);
  }

  if (value.gameId === 'memory-test' && isBetterHighlight(completedRound, highlights.highestMemoryLevel, 'descending')) {
    highlights.highestMemoryLevel = createHighlight(value, completedRound);
  }

  if (value.gameId === 'time-sense' && isBetterHighlight(value.score, highlights.bestTimeSenseScore, 'descending')) {
    highlights.bestTimeSenseScore = createHighlight(value);
  }

  if (value.gameId === 'stroop-test') {
    const streak = readNumber(value.stats?.bestCombo) ?? readNumber(value.stats?.combo);

    if (isBetterHighlight(value.score, highlights.bestStroopScore, 'descending')) {
      highlights.bestStroopScore = createHighlight(value);
    }

    if (isBetterHighlight(accuracy, highlights.bestStroopAccuracy, 'descending')) {
      highlights.bestStroopAccuracy = createHighlight(value, accuracy);
    }

    if (isBetterHighlight(streak, highlights.bestStroopStreak, 'descending')) {
      highlights.bestStroopStreak = createHighlight(value, streak);
    }
  }

  return highlights;
}

async function upsertPlayerProfile(sql, value) {
  const [existingProfile] = await sql.query(
    `
      SELECT *
      FROM player_profiles
      WHERE player_id = $1
      LIMIT 1
    `,
    [value.playerId],
  );
  const nextXp = Number(existingProfile?.xp ?? 0) + (value.xpGained ?? 0);
  const nextLevel = getLevelFromXp(nextXp);
  const nextHighlights = mergeHighlights(existingProfile?.highlights ?? {}, value);
  const favoriteGame = existingProfile?.favorite_game ?? value.gameId;
  const bestGame = existingProfile?.best_game ?? value.gameId;
  const achievementsUnlocked = Number(existingProfile?.achievements_unlocked ?? 0);
  const achievementsTotal = Number(existingProfile?.achievements_total ?? 0);

  const [profileRow] = await sql.query(
    `
      INSERT INTO player_profiles (
        player_id,
        player_name,
        level,
        xp,
        games_played,
        total_score_entries,
        favorite_game,
        best_game,
        achievements_unlocked,
        achievements_total,
        highlights,
        updated_at
      ) VALUES ($1, $2, $3, $4, 1, 1, $5, $6, $7, $8, $9::jsonb, NOW())
      ON CONFLICT (player_id) DO UPDATE
      SET
        player_name = EXCLUDED.player_name,
        level = EXCLUDED.level,
        xp = EXCLUDED.xp,
        games_played = player_profiles.games_played + 1,
        total_score_entries = player_profiles.total_score_entries + 1,
        favorite_game = COALESCE(player_profiles.favorite_game, EXCLUDED.favorite_game),
        best_game = COALESCE(player_profiles.best_game, EXCLUDED.best_game),
        achievements_unlocked = player_profiles.achievements_unlocked,
        achievements_total = player_profiles.achievements_total,
        highlights = EXCLUDED.highlights,
        updated_at = NOW()
      RETURNING *
    `,
    [
      value.playerId,
      value.playerName,
      nextLevel,
      nextXp,
      favoriteGame,
      bestGame,
      achievementsUnlocked,
      achievementsTotal,
      JSON.stringify(nextHighlights),
    ],
  );

  return profileRow;
}

export async function handler(event) {
  try {
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

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json(400, { error: 'Invalid payload', details: ['JSON body must be an object'] });
    }

    const { errors, value } = validateScore(payload);
    const game = getGame(value.gameId);

    if (errors.length > 0) {
      debugSubmit({
        stage: 'validation_failed',
        game_id: value.gameId,
        player_id: value.playerId,
        score: value.score,
        errors,
      });
      return json(400, { error: 'Validation failed', details: errors });
    }

    if (!getDatabaseUrl()) {
      return json(503, {
        error: 'Database URL missing',
      });
    }

    await initializeDatabase();
    const sql = getSql();
    const leaderboardScope = getLeaderboardScope(value);
    await upsertPlayerProfile(sql, value);
    const [existingRow] = await sql.query(
      `
        SELECT *
        FROM scores
        WHERE player_id = $1
          AND game_id = $2
          AND leaderboard_scope = $3
        LIMIT 1
      `,
      [value.playerId, value.gameId, leaderboardScope],
    );
    const existingScore = existingRow ? Number(existingRow.score) : undefined;
    const shouldUpdate = !existingRow || isBetterScore(game, value.score, existingScore);

    debugSubmit({
      stage: 'upsert_decision',
      game_id: value.gameId,
      player_id: value.playerId,
      score: value.score,
      scoreDirection: game.scoreDirection,
      leaderboard_scope: leaderboardScope,
      existingScore,
      shouldUpdate,
      reason: existingRow ? (shouldUpdate ? 'better_score' : 'not_best') : 'new_best',
    });

    if (existingRow && !shouldUpdate) {
      const entry = mapScoreRow(existingRow);

      return json(200, {
        ok: true,
        updated: false,
        reason: 'not_best',
        entry,
        score: entry,
      });
    }

    const values = [
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
      leaderboardScope,
    ];

    const [row] = existingRow
      ? await sql.query(
          `
            UPDATE scores
            SET
              player_name = $2,
              score = $4,
              score_label = $5,
              stats = $6::jsonb,
              meta = $7::jsonb,
              xp_gained = $8,
              run_duration_ms = $9,
              created_at = $10,
              leaderboard_scope = $11
            WHERE player_id = $1
              AND game_id = $3
              AND leaderboard_scope = $11
            RETURNING *
          `,
          values,
        )
      : await sql.query(
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
            created_at,
            leaderboard_scope
          ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11)
          RETURNING *`,
          values,
        );

    const entry = mapScoreRow(row);
    return json(200, {
      ok: true,
      updated: true,
      mode: existingRow ? 'updated_best' : 'inserted_best',
      entry,
      score: entry,
    });
  } catch (error) {
    console.error('FUNCTION ERROR', error);
    return json(500, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
