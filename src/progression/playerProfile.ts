import { achievementDefinitions } from '../data/achievements';
import { games } from '../data/games';
import { buildGameProgressSummary } from './gameProgress';
import { getAchievementUnlocks } from './progressionEngine';
import { getScores, sortScoresByMetric } from '../services/storage';
import type {
  GameId,
  LeaderboardEntry,
  LocalProfile,
  PlayerAchievementSummary,
  PlayerHighlights,
  PlayerProfileSummary,
} from '../types';

export const emptyValueLabel = 'Brak danych';

export function getMostPlayedGame(scores: LeaderboardEntry[]): GameId | undefined {
  const counts = scores.reduce<Partial<Record<GameId, number>>>((acc, score) => {
    acc[score.gameId] = (acc[score.gameId] ?? 0) + 1;
    return acc;
  }, {});

  return games
    .map((game) => ({ gameId: game.id, count: counts[game.id] ?? 0 }))
    .sort((a, b) => b.count - a.count)[0]?.count
    ? games.map((game) => ({ gameId: game.id, count: counts[game.id] ?? 0 })).sort((a, b) => b.count - a.count)[0].gameId
    : undefined;
}

export function getBestGame(bestScores: Partial<Record<GameId, LeaderboardEntry>>): GameId | undefined {
  return Object.values(bestScores)
    .filter(Boolean)
    .sort((a, b) => (b?.xpGained ?? 0) - (a?.xpGained ?? 0))[0]?.gameId;
}

export function getAchievementSummary(): PlayerAchievementSummary {
  return {
    unlocked: getAchievementUnlocks().length,
    total: achievementDefinitions.length,
  };
}

export function getPlayerHighlights(scores: LeaderboardEntry[]): PlayerHighlights {
  return {
    bestReactionTime: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'reaction-time' && score.score < 9999),
      'reaction-time',
    )[0],
    bestTypingWpm: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'typing-speed'),
      'typing-speed',
    )[0],
    bestTypingAccuracy: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'typing-speed'),
      'typing-speed',
      'accuracy',
    )[0],
    bestAimAccuracy: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'aim-test'),
      'aim-test',
      'accuracy',
    )[0],
    bestColorSimilarity: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'color-memory'),
      'color-memory',
      'bestSimilarity',
    )[0],
    bestWordMemoryScore: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'word-memory'),
      'word-memory',
    )[0],
    bestSymbolMatchMoves: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'symbol-match'),
      'symbol-match',
    )[0],
    highestMemoryLevel: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'memory-test'),
      'memory-test',
    )[0],
    bestTimeSenseScore: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'time-sense'),
      'time-sense',
    )[0],
    bestStroopScore: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'stroop-test'),
      'stroop-test',
    )[0],
    bestStroopAccuracy: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'stroop-test' && score.stats?.accuracy !== undefined),
      'stroop-test',
      'accuracy',
    )[0],
    bestStroopStreak: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'stroop-test' && score.stats?.bestCombo !== undefined),
      'stroop-test',
      'bestCombo',
    )[0],
    bestCps: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'cps-test'),
      'cps-test',
    )[0],
    peakCps: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'cps-test' && score.stats?.peakCPS !== undefined),
      'cps-test',
      'peakCPS',
    )[0],
    longestCpsStreak: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'cps-test' && score.stats?.longestStreak !== undefined),
      'cps-test',
      'longestStreak',
    )[0],
    bestAlternatingCps: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'cps-test' && score.stats?.inputMode === 'alternating'),
      'cps-test',
    )[0],
    bestFlappyScore: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'flappy-ball'),
      'flappy-ball',
    )[0],
    bestFlappyTime: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'flappy-ball' && score.stats?.survivedTimeSeconds !== undefined),
      'flappy-ball',
      'survivedTimeSeconds',
    )[0],
    bestShapeAccuracy: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'shape-precision'),
      'shape-precision',
    )[0],
    bestCircle: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'shape-precision' && score.stats?.shape === 'circle'),
      'shape-precision',
    )[0],
    bestStar: sortScoresByMetric(
      scores.filter((score) => score.gameId === 'shape-precision' && score.stats?.shape === 'star'),
      'shape-precision',
    )[0],
  };
}

export function buildPlayerProfileSummary(profile: LocalProfile): PlayerProfileSummary {
  const achievements = getAchievementSummary();
  const playerScores = getScores().filter(
    (score) => score.playerId === profile.playerId || (!score.playerId && score.playerName === profile.playerName),
  );
  const highlights = getPlayerHighlights(playerScores);
  const gameProgressSummary = buildGameProgressSummary();
  const topGameLevels = [...gameProgressSummary].sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 3);

  return {
    playerId: profile.playerId,
    playerName: profile.playerName,
    username: profile.username,
    displayName: profile.playerName || emptyValueLabel,
    createdAt: profile.createdAt,
    lastSeenAt: profile.lastSeenAt,
    level: profile.level,
    xp: profile.xp,
    currentLevelXp: profile.currentLevelXp,
    nextLevelXp: profile.nextLevelXp,
    levelProgressPercent: profile.levelProgressPercent,
    gamesPlayed: profile.totalGamesPlayed,
    totalScoreEntries: profile.totalScoreEntries,
    favoriteGame: profile.mostPlayedGame,
    mostPlayedGame: profile.mostPlayedGame,
    bestGame: profile.bestGame,
    achievementsUnlocked: achievements.unlocked,
    achievementsTotal: achievements.total,
    achievements,
    gameProgressSummary,
    topGameLevels,
    createdOnDevice: profile.createdOnDevice,
    lastSeenDevice: profile.lastSeenDevice,
    highlights: {
      bestReactionTime: highlights.bestReactionTime ?? profile.highlights.bestReactionTime,
      bestTypingWpm: highlights.bestTypingWpm ?? profile.highlights.highestWpm,
      bestTypingAccuracy: highlights.bestTypingAccuracy,
      bestAimAccuracy: highlights.bestAimAccuracy ?? profile.highlights.highestAimAccuracy,
      bestColorSimilarity: highlights.bestColorSimilarity ?? profile.highlights.bestColorSimilarity,
      bestWordMemoryScore: highlights.bestWordMemoryScore ?? profile.highlights.bestWordMemory,
      bestSymbolMatchMoves: highlights.bestSymbolMatchMoves ?? profile.highlights.bestSymbolMatch,
      highestMemoryLevel: highlights.highestMemoryLevel,
      bestTimeSenseScore: highlights.bestTimeSenseScore ?? profile.highlights.bestTimeSense,
      bestStroopScore: highlights.bestStroopScore ?? profile.highlights.bestStroopScore,
      bestStroopAccuracy: highlights.bestStroopAccuracy ?? profile.highlights.bestStroopAccuracy,
      bestStroopStreak: highlights.bestStroopStreak ?? profile.highlights.bestStroopStreak,
      bestCps: highlights.bestCps ?? profile.highlights.bestCps,
      peakCps: highlights.peakCps ?? profile.highlights.peakCps,
      longestCpsStreak: highlights.longestCpsStreak ?? profile.highlights.longestCpsStreak,
      bestAlternatingCps: highlights.bestAlternatingCps ?? profile.highlights.bestAlternatingCps,
      bestFlappyScore: highlights.bestFlappyScore ?? profile.highlights.bestFlappyScore,
      bestFlappyTime: highlights.bestFlappyTime ?? profile.highlights.bestFlappyTime,
      bestShapeAccuracy: highlights.bestShapeAccuracy ?? profile.highlights.bestShapeAccuracy,
      bestCircle: highlights.bestCircle ?? profile.highlights.bestCircle,
      bestStar: highlights.bestStar ?? profile.highlights.bestStar,
    },
  };
}
