import type { GameId, LeaderboardEntry } from '../types';

export function calculateScoreXp(entry: Pick<LeaderboardEntry, 'gameId' | 'score' | 'stats'>): number {
  const bonusByGame: Record<GameId, number> = {
    'reaction-time': Math.max(0, Math.min(30, Math.round((600 - Math.min(entry.score, 600)) / 20))),
    'memory-test': Math.min(40, entry.score * 4),
    'color-memory': Math.min(40, (entry.stats?.completedRound ?? entry.score) * 5),
    'typing-speed': Math.min(40, Math.round(entry.score / 3)),
    'symbol-match': Math.max(0, Math.min(30, 30 - Math.max(0, entry.score - 6) * 3)),
    'aim-test': Math.min(45, Math.round(entry.score / 350)),
    'word-memory': Math.min(45, Math.round(entry.score / 180)),
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
