import { games, getGameConfig } from '../data/games';
import { resetProgressionData } from '../progression/progressionEngine';
import { calculateScoreXp, getLevelBaseXp, getLevelFromXp } from '../progression/xp';
import type { GameId, LeaderboardEntry, LocalProfile, ScoreInput, ScoreStats } from '../types';

const PLAYER_KEY = 'game-hub:player-name';
const PLAYER_ID_KEY = 'game-hub:player-id';
const SCORES_KEY = 'game-hub:scores';
const AUDIO_ENABLED_KEY = 'gameHubAudioEnabled';
const DEFAULT_PLAYER_NAME = 'Gracz';
const RECENT_LIMIT = 5;
const validGameIds = new Set<GameId>(games.map((game) => game.id));

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      return fallback;
    }

    return fallback;
  }
}

function writeJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const entry = value as Partial<LeaderboardEntry>;
  return (
    typeof entry.gameId === 'string' &&
    validGameIds.has(entry.gameId as GameId) &&
    typeof entry.playerName === 'string' &&
    entry.playerName.trim().length > 0 &&
    typeof entry.score === 'number' &&
    Number.isFinite(entry.score) &&
    typeof entry.scoreLabel === 'string' &&
    entry.scoreLabel.trim().length > 0 &&
    typeof entry.createdAt === 'string' &&
    Number.isFinite(new Date(entry.createdAt).getTime())
  );
}

function createPlayerId(): string {
  try {
    if ('randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getPlayerId(): string {
  try {
    const existingId = localStorage.getItem(PLAYER_ID_KEY);

    if (existingId) {
      return existingId;
    }

    const nextId = createPlayerId();
    localStorage.setItem(PLAYER_ID_KEY, nextId);
    return nextId;
  } catch {
    return 'local-player';
  }
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readMetaNumber(meta: Record<string, unknown> | undefined, key: string): number | undefined {
  return meta ? readNumber(meta[key]) : undefined;
}

function readLastHistoryNumber(meta: Record<string, unknown> | undefined, key: string): number | undefined {
  const history = meta?.history;

  if (!Array.isArray(history) || history.length === 0) {
    return undefined;
  }

  const lastEntry = history[history.length - 1];
  return lastEntry && typeof lastEntry === 'object' ? readNumber((lastEntry as Record<string, unknown>)[key]) : undefined;
}

function deriveStats(entry: Pick<LeaderboardEntry, 'gameId' | 'score' | 'meta' | 'stats' | 'runDurationMs'>): ScoreStats {
  const meta = entry.meta;
  const baseStats = entry.stats ?? {};

  switch (entry.gameId) {
    case 'reaction-time':
      return {
        ...baseStats,
        averageReactionMs: baseStats.averageReactionMs ?? (entry.score < 9999 ? entry.score : undefined),
      };
    case 'memory-test':
      return {
        ...baseStats,
        completedRound: baseStats.completedRound ?? entry.score,
      };
    case 'color-memory':
      return {
        ...baseStats,
        completedRound: baseStats.completedRound ?? readMetaNumber(meta, 'completedRound') ?? entry.score,
        averageSimilarity: baseStats.averageSimilarity ?? readMetaNumber(meta, 'averageSimilarity'),
        bestSimilarity: baseStats.bestSimilarity ?? readMetaNumber(meta, 'bestSimilarity'),
        worstSimilarity: baseStats.worstSimilarity ?? readMetaNumber(meta, 'worstSimilarity'),
        finalSimilarity: baseStats.finalSimilarity ?? readLastHistoryNumber(meta, 'similarity') ?? readMetaNumber(meta, 'finalSimilarity'),
      };
    case 'typing-speed':
      {
        const durationSeconds = readMetaNumber(meta, 'durationSeconds');
        const completedSentences = baseStats.completedSentences ?? readMetaNumber(meta, 'completedSentences');
        const totalTypedChars = baseStats.totalTypedChars ?? readMetaNumber(meta, 'totalTypedChars');
      return {
        ...baseStats,
        accuracy: baseStats.accuracy ?? readMetaNumber(meta, 'accuracy'),
        correctChars: baseStats.correctChars ?? readMetaNumber(meta, 'correctChars'),
        incorrectChars: baseStats.incorrectChars ?? readMetaNumber(meta, 'incorrectChars'),
        completedSentences,
        totalTypedChars,
        rawWpm: baseStats.rawWpm ?? readMetaNumber(meta, 'rawWpm'),
        selectedDuration: baseStats.selectedDuration ?? readMetaNumber(meta, 'selectedDuration'),
        durationSeconds: baseStats.durationSeconds ?? durationSeconds,
        rounds: baseStats.rounds ?? completedSentences,
        durationMs: baseStats.durationMs ?? (baseStats.durationSeconds !== undefined ? baseStats.durationSeconds * 1000 : durationSeconds !== undefined ? durationSeconds * 1000 : undefined),
      };
      }
    case 'symbol-match':
      return {
        ...baseStats,
        moves: baseStats.moves ?? entry.score,
        mistakes: baseStats.mistakes ?? readMetaNumber(meta, 'mistakes'),
        durationMs: baseStats.durationMs ?? entry.runDurationMs ?? readMetaNumber(meta, 'durationMs'),
      };
    case 'aim-test':
      return {
        ...baseStats,
        accuracy: baseStats.accuracy ?? readMetaNumber(meta, 'accuracy'),
        averageReactionMs: baseStats.averageReactionMs ?? readMetaNumber(meta, 'averageReactionMs'),
        hits: baseStats.hits ?? readMetaNumber(meta, 'hits'),
        misses: baseStats.misses ?? readMetaNumber(meta, 'misses'),
      };
    case 'word-memory':
      return {
        ...baseStats,
        bestCombo: baseStats.bestCombo ?? readMetaNumber(meta, 'bestCombo'),
        combo: baseStats.combo ?? readMetaNumber(meta, 'bestCombo'),
        mistakes: baseStats.mistakes ?? readMetaNumber(meta, 'mistakes'),
        rounds: baseStats.rounds ?? readMetaNumber(meta, 'rounds'),
      };
  }
}

function normalizeEntry(entry: LeaderboardEntry): LeaderboardEntry {
  const stats = deriveStats(entry);
  const runDurationMs = entry.runDurationMs ?? stats.durationMs;
  const normalizedEntry: LeaderboardEntry = {
    ...entry,
    playerId: entry.playerId,
    stats,
    runDurationMs,
  };

  return {
    ...normalizedEntry,
    xpGained: entry.xpGained ?? calculateScoreXp(normalizedEntry),
  };
}

function isValidMigratedEntry(entry: LeaderboardEntry): boolean {
  if (entry.gameId !== 'typing-speed') {
    return true;
  }

  if (entry.score < 10) {
    return false;
  }

  const hasModernStats =
    entry.stats?.correctChars !== undefined || entry.stats?.durationMs !== undefined || entry.runDurationMs !== undefined;

  if (!hasModernStats) {
    return true;
  }

  const totalTypedChars =
    entry.stats?.totalTypedChars ?? (entry.stats?.correctChars ?? 0) + (entry.stats?.incorrectChars ?? 0);
  const durationMs = entry.stats?.durationMs ?? entry.runDurationMs;

  if ((entry.stats?.correctChars ?? 0) < 20) {
    return false;
  }

  if (totalTypedChars < 25) {
    return false;
  }

  if ((durationMs ?? 0) < 5000) {
    return false;
  }

  return true;
}

export function getPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_KEY) || DEFAULT_PLAYER_NAME;
  } catch {
    return DEFAULT_PLAYER_NAME;
  }
}

export function setPlayerName(name: string): string {
  const cleanName = name.trim() || DEFAULT_PLAYER_NAME;

  try {
    localStorage.setItem(PLAYER_KEY, cleanName);
  } catch {
    return cleanName;
  }

  return cleanName;
}

export function getScores(): LeaderboardEntry[] {
  const scores = readJson<unknown>(SCORES_KEY, []);
  return Array.isArray(scores) ? scores.filter(isLeaderboardEntry).map(normalizeEntry).filter(isValidMigratedEntry) : [];
}

export function sortScores(scores: LeaderboardEntry[], gameId: GameId): LeaderboardEntry[] {
  const { scoreDirection } = getGameConfig(gameId);

  return [...scores].sort((a, b) => {
    const scoreCompare = scoreDirection === 'ascending' ? a.score - b.score : b.score - a.score;

    if (scoreCompare !== 0) {
      return scoreCompare;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function sortScoresByMetric(scores: LeaderboardEntry[], gameId: GameId, metricId = 'score'): LeaderboardEntry[] {
  const game = getGameConfig(gameId);
  const metric = game.metrics.find((item) => item.id === metricId) ?? game.metrics[0];

  return [...scores].sort((a, b) => {
    const aValue = metric.source === 'score' ? a.score : metric.statKey ? a.stats?.[metric.statKey] : undefined;
    const bValue = metric.source === 'score' ? b.score : metric.statKey ? b.stats?.[metric.statKey] : undefined;

    if (aValue === undefined && bValue === undefined) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (aValue === undefined) {
      return 1;
    }

    if (bValue === undefined) {
      return -1;
    }

    const scoreCompare = metric.direction === 'ascending' ? aValue - bValue : bValue - aValue;

    if (scoreCompare !== 0) {
      return scoreCompare;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getLeaderboard(gameId: GameId): LeaderboardEntry[] {
  return sortScores(
    getScores().filter((score) => score.gameId === gameId),
    gameId,
  );
}

export function saveScore(entry: ScoreInput): LeaderboardEntry {
  const baseEntry: LeaderboardEntry = {
    ...entry,
    playerId: entry.playerId ?? getPlayerId(),
    playerName: getPlayerName(),
    createdAt: new Date().toISOString(),
  };
  const savedEntry = normalizeEntry(baseEntry);

  writeJson(SCORES_KEY, [savedEntry, ...getScores()]);
  return savedEntry;
}

export function resetLocalData(): void {
  try {
    localStorage.removeItem(PLAYER_KEY);
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(SCORES_KEY);
    localStorage.removeItem(AUDIO_ENABLED_KEY);
    resetProgressionData();
  } catch {
    return;
  }
}

function getMostPlayedGame(scores: LeaderboardEntry[]): GameId | undefined {
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

export function getProfile(): LocalProfile {
  const playerId = getPlayerId();
  const playerName = getPlayerName();
  const playerScores = getScores().filter((score) => score.playerId === playerId || (!score.playerId && score.playerName === playerName));
  const bestScores: LocalProfile['bestScores'] = {};

  games.forEach((game) => {
    const best = sortScores(
      playerScores.filter((score) => score.gameId === game.id),
      game.id,
    )[0];

    if (best) {
      bestScores[game.id] = best;
    }
  });
  const xp = playerScores.reduce((total, score) => total + (score.xpGained ?? 0), 0);
  const level = getLevelFromXp(xp);
  const currentLevelXp = getLevelBaseXp(level);
  const nextLevelXp = getLevelBaseXp(level + 1);
  const mostPlayedGame = getMostPlayedGame(playerScores);
  const bestGame = Object.values(bestScores)
    .filter(Boolean)
    .sort((a, b) => (b?.xpGained ?? 0) - (a?.xpGained ?? 0))[0]?.gameId;

  return {
    playerId,
    playerName,
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    levelProgressPercent: Math.round(((xp - currentLevelXp) / Math.max(nextLevelXp - currentLevelXp, 1)) * 100),
    attemptsPlayed: playerScores.length,
    totalGamesPlayed: playerScores.length,
    totalScoreEntries: playerScores.length,
    bestGame,
    mostPlayedGame,
    bestScores,
    recentScores: [...playerScores]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, RECENT_LIMIT),
    highlights: {
      bestReactionTime: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'reaction-time' && score.score < 9999),
        'reaction-time',
      )[0],
      highestWpm: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'typing-speed'),
        'typing-speed',
      )[0],
      highestAimAccuracy: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'aim-test'),
        'aim-test',
        'accuracy',
      )[0],
      bestColorSimilarity: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'color-memory'),
        'color-memory',
        'bestSimilarity',
      )[0],
      bestSymbolMatch: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'symbol-match'),
        'symbol-match',
      )[0],
      bestWordMemory: sortScoresByMetric(
        playerScores.filter((score) => score.gameId === 'word-memory'),
        'word-memory',
      )[0],
    },
  };
}
