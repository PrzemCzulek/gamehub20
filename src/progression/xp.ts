import type { GameId, LeaderboardEntry } from '../types';

const MAIN_META_XP_KEY = 'game-hub:main-meta-xp';

export function calculateScoreXp(entry: Pick<LeaderboardEntry, 'gameId' | 'score' | 'stats'>): number {
  const bonusByGame: Record<GameId, number> = {
    'reaction-time': Math.max(0, Math.min(30, Math.round((600 - Math.min(entry.score, 600)) / 20))),
    'memory-test': Math.min(40, entry.score * 4),
    'color-memory': Math.min(40, (entry.stats?.completedRound ?? entry.score) * 5),
    'typing-speed': Math.min(40, Math.round(entry.score / 3)),
    'symbol-match': Math.max(0, Math.min(30, 30 - Math.max(0, entry.score - 6) * 3)),
    'aim-test': Math.min(45, Math.round(entry.score / 350)),
    'word-memory': Math.min(45, Math.round(entry.score / 180)),
    'time-sense': Math.min(45, Math.round(entry.score / 30)),
  };

  return 10 + Math.max(0, bonusByGame[entry.gameId] ?? 0);
}

export function getLevelFromXp(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export function getLevelBaseXp(level: number): number {
  return (level - 1) ** 2 * 100;
}

export function getPlayerProgressionNumbers(totalXp: number) {
  const level = getLevelFromXp(totalXp);
  const currentLevelXp = getLevelBaseXp(level);
  const nextLevelXp = getLevelBaseXp(level + 1);

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgressPercent: Math.round(((totalXp - currentLevelXp) / Math.max(nextLevelXp - currentLevelXp, 1)) * 100),
  };
}

function readMainMetaXp(): number {
  try {
    const raw = localStorage.getItem(MAIN_META_XP_KEY);
    const value = raw ? Number(JSON.parse(raw)) : 0;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  } catch {
    return 0;
  }
}

function writeMainMetaXp(value: number): void {
  try {
    localStorage.setItem(MAIN_META_XP_KEY, JSON.stringify(Math.max(0, value)));
  } catch {
    return;
  }
}

export function getMainMetaRewardXp(): number {
  return readMainMetaXp();
}

export function getMainAccountXp(): number {
  return getMainMetaRewardXp();
}

export function addMainXpFromMetaReward(amount: number, reason: string) {
  const cleanAmount = Math.max(0, Math.round(amount));
  const previousMetaXp = readMainMetaXp();
  const nextMetaXp = previousMetaXp + cleanAmount;

  writeMainMetaXp(nextMetaXp);

  return {
    reason,
    xpGained: cleanAmount,
    previousMetaXp,
    nextMetaXp,
  };
}

export function resetMainMetaRewardXp(): void {
  try {
    localStorage.removeItem(MAIN_META_XP_KEY);
  } catch {
    return;
  }
}

export const mainMetaXpStorageKey = MAIN_META_XP_KEY;
