import { gameMilestones } from '../data/gameMilestones';
import { games, getGameConfig } from '../data/games';
import type { GameId, LeaderboardEntry, PlayerGameProgressSummary } from '../types';
import { addMainXpFromMetaReward, calculateScoreXp } from './xp';
import type { GameMilestone, GameProgressEntry, GameProgressMap } from './types';

const GAME_PROGRESS_KEY = 'game-hub:game-progress';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function getGameXpForNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.35));
}

function getGameLevelBaseXp(level: number): number {
  let total = 0;

  for (let currentLevel = 1; currentLevel < level; currentLevel += 1) {
    total += getGameXpForNextLevel(currentLevel);
  }

  return total;
}

export function getGameLevelFromXp(xp: number): number {
  let level = 1;
  let remainingXp = Math.max(0, xp);

  while (remainingXp >= getGameXpForNextLevel(level)) {
    remainingXp -= getGameXpForNextLevel(level);
    level += 1;
  }

  return level;
}

function getGameProgressNumbers(xp: number) {
  const level = getGameLevelFromXp(xp);
  const currentLevelXp = getGameLevelBaseXp(level);
  const nextLevelXp = currentLevelXp + getGameXpForNextLevel(level);
  const levelProgressPercent = Math.round(((xp - currentLevelXp) / Math.max(nextLevelXp - currentLevelXp, 1)) * 100);

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgressPercent,
  };
}

function createEmptyEntry(gameId: GameId): GameProgressEntry {
  return {
    gameId,
    xp: 0,
    ...getGameProgressNumbers(0),
    totalPlays: 0,
    milestonesClaimed: [],
  };
}

function normalizeEntry(gameId: GameId, entry?: Partial<GameProgressEntry>): GameProgressEntry {
  const xp = Math.max(0, Number(entry?.xp ?? 0));

  return {
    ...createEmptyEntry(gameId),
    ...entry,
    gameId,
    xp,
    ...getGameProgressNumbers(xp),
    totalPlays: Math.max(0, Number(entry?.totalPlays ?? 0)),
    milestonesClaimed: Array.isArray(entry?.milestonesClaimed) ? entry.milestonesClaimed : [],
  };
}

export function getGameProgressMap(): GameProgressMap {
  const stored = readJson<unknown>(GAME_PROGRESS_KEY, {});

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {};
  }

  return games.reduce<GameProgressMap>((acc, game) => {
    const rawEntry = (stored as Record<string, Partial<GameProgressEntry> | undefined>)[game.id];

    if (rawEntry) {
      acc[game.id] = normalizeEntry(game.id, rawEntry);
    }

    return acc;
  }, {});
}

function saveGameProgressMap(progress: GameProgressMap): void {
  writeJson(GAME_PROGRESS_KEY, progress);
}

function isBetterScore(scoreEntry: LeaderboardEntry, current?: GameProgressEntry): boolean {
  if (current?.bestScore === undefined) {
    return true;
  }

  const direction = getGameConfig(scoreEntry.gameId).scoreDirection;
  return direction === 'ascending' ? scoreEntry.score < current.bestScore : scoreEntry.score > current.bestScore;
}

export function updateGameProgressFromScore(scoreEntry: LeaderboardEntry): { entry: GameProgressEntry; previousLevel: number; levelUp: boolean; xpGained: number } {
  const progressMap = getGameProgressMap();
  const currentEntry = normalizeEntry(scoreEntry.gameId, progressMap[scoreEntry.gameId]);
  const previousLevel = currentEntry.level;
  const xpGained = Math.max(0, scoreEntry.xpGained ?? calculateScoreXp(scoreEntry));
  const nextXp = currentEntry.xp + xpGained;
  const nextEntry: GameProgressEntry = {
    ...currentEntry,
    xp: nextXp,
    ...getGameProgressNumbers(nextXp),
    totalPlays: currentEntry.totalPlays + 1,
    lastPlayedAt: scoreEntry.createdAt,
  };

  if (isBetterScore(scoreEntry, currentEntry)) {
    nextEntry.bestScore = scoreEntry.score;
    nextEntry.bestScoreLabel = scoreEntry.scoreLabel;
  }

  progressMap[scoreEntry.gameId] = nextEntry;
  saveGameProgressMap(progressMap);

  return {
    entry: nextEntry,
    previousLevel,
    levelUp: nextEntry.level > previousLevel,
    xpGained,
  };
}

export function getGameProgressEntry(gameId: GameId): GameProgressEntry {
  return normalizeEntry(gameId, getGameProgressMap()[gameId]);
}

export function getAvailableGameMilestones(gameId: GameId): GameMilestone[] {
  const entry = getGameProgressEntry(gameId);

  return gameMilestones.filter(
    (milestone) =>
      milestone.gameId === gameId &&
      milestone.levelRequired <= entry.level &&
      !entry.milestonesClaimed.includes(milestone.id),
  );
}

export type ClaimGameMilestoneResult =
  | {
      ok: true;
      milestone: GameMilestone;
      mainXpGained: number;
      updatedGameProgress: GameProgressEntry;
    }
  | {
      ok: false;
      reason: 'not_found' | 'locked' | 'already_claimed';
    };

export function claimGameMilestone(gameId: GameId, milestoneId: string): ClaimGameMilestoneResult {
  const milestone = gameMilestones.find((item) => item.id === milestoneId && item.gameId === gameId);

  if (!milestone) {
    return { ok: false, reason: 'not_found' };
  }

  const progressMap = getGameProgressMap();
  const entry = normalizeEntry(gameId, progressMap[gameId]);

  if (entry.milestonesClaimed.includes(milestone.id)) {
    return { ok: false, reason: 'already_claimed' };
  }

  if (entry.level < milestone.levelRequired) {
    return { ok: false, reason: 'locked' };
  }

  const updatedGameProgress = {
    ...entry,
    milestonesClaimed: [...entry.milestonesClaimed, milestone.id],
  };
  progressMap[gameId] = updatedGameProgress;
  saveGameProgressMap(progressMap);
  addMainXpFromMetaReward(milestone.mainXpReward, `game_milestone:${milestone.id}`);

  return {
    ok: true,
    milestone,
    mainXpGained: milestone.mainXpReward,
    updatedGameProgress,
  };
}

export function buildGameProgressSummary(): PlayerGameProgressSummary[] {
  const progressMap = getGameProgressMap();

  return games.map((game) => {
    const entry = normalizeEntry(game.id, progressMap[game.id]);

    return {
      gameId: game.id,
      gameTitle: game.title,
      level: entry.level,
      xp: entry.xp,
      currentLevelXp: entry.currentLevelXp,
      nextLevelXp: entry.nextLevelXp,
      levelProgressPercent: entry.levelProgressPercent,
      totalPlays: entry.totalPlays,
      bestScoreLabel: entry.bestScoreLabel,
      milestonesClaimed: entry.milestonesClaimed,
    };
  });
}

export function resetGameProgressData(): void {
  try {
    localStorage.removeItem(GAME_PROGRESS_KEY);
  } catch {
    return;
  }
}

export const gameProgressStorageKey = GAME_PROGRESS_KEY;
