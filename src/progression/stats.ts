import type { LeaderboardEntry, ScoreStats } from '../types';

export function getEventStats(scoreEntry: LeaderboardEntry): ScoreStats {
  return scoreEntry.stats ?? {};
}

export function getStatNumber(stats: ScoreStats, key: keyof ScoreStats): number | undefined {
  const value = stats[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
