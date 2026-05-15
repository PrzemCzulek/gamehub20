import { achievementDefinitions } from '../data/achievements';
import type { GameId, LocalProfile, LeaderboardEntry, ScoreStats } from '../types';
import { getGameProgressEntry } from './gameProgress';
import type { AchievementUnlock, PlayerProgression, ProgressionEvent } from './types';
import { getStatNumber } from './stats';

function isUnlocked(achievementId: string, unlocks: AchievementUnlock[]): boolean {
  return unlocks.some((unlock) => unlock.achievementId === achievementId);
}

function statNumber(event: ProgressionEvent, key: keyof ProgressionEvent['stats']): number {
  return getStatNumber(event.stats, key) ?? 0;
}

function statString(event: ProgressionEvent, key: keyof ProgressionEvent['stats']): string {
  const value = event.stats[key];
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function isTruthyStat(event: ProgressionEvent, key: keyof ProgressionEvent['stats']): boolean {
  const value = event.stats[key];
  return value === 1 || value === 'true';
}

function readScoreStat(score: LeaderboardEntry | undefined, key: keyof ScoreStats): number {
  const value = score?.stats?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readScoreString(score: LeaderboardEntry | undefined, key: keyof ScoreStats): string {
  const value = score?.stats?.[key];
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function hasNumericScoreStat(score: LeaderboardEntry | undefined, key: keyof ScoreStats): boolean {
  const value = score?.stats?.[key];
  return typeof value === 'number' && Number.isFinite(value);
}

function getBestScore(profile: LocalProfile, gameId: GameId): LeaderboardEntry | undefined {
  return profile.bestScores?.[gameId] ?? profile.recentScores.find((score) => score.gameId === gameId);
}

function getBestByStat(profile: LocalProfile, gameId: GameId, key: keyof ScoreStats, direction: 'asc' | 'desc' = 'desc'): LeaderboardEntry | undefined {
  return profile.recentScores
    .filter((score) => score.gameId === gameId && readScoreStat(score, key) > 0)
    .sort((a, b) => direction === 'asc' ? readScoreStat(a, key) - readScoreStat(b, key) : readScoreStat(b, key) - readScoreStat(a, key))[0];
}

function qualifiesFromProfile(achievementId: string, profile: LocalProfile): boolean {
  const typing = getBestScore(profile, 'typing-speed');
  const flappy = getBestScore(profile, 'flappy-ball');
  const cps = getBestScore(profile, 'cps-test');
  const stroop = getBestScore(profile, 'stroop-test');

  switch (achievementId) {
    case 'global-level-10':
      return profile.level >= 10;
    case 'reaction-under-200':
      return (profile.highlights.bestReactionTime?.score ?? getBestScore(profile, 'reaction-time')?.score ?? 9999) < 200;
    case 'typing-perfect-accuracy':
      return readScoreStat(getBestByStat(profile, 'typing-speed', 'accuracy'), 'accuracy') >= 100;
    case 'typing-80-wpm':
      return (typing?.score ?? 0) >= 80;
    case 'typing-100-wpm':
      return (typing?.score ?? 0) >= 100;
    case 'typing-120-wpm':
      return (typing?.score ?? 0) >= 120;
    case 'typing-hard-complete':
      return profile.recentScores.some((score) => score.gameId === 'typing-speed' && readScoreString(score, 'difficulty') === 'hard');
    case 'typing-polish-mastery':
      return profile.recentScores.some((score) => score.gameId === 'typing-speed' && readScoreString(score, 'difficulty') === 'hard' && readScoreStat(score, 'accuracy') >= 98);
    case 'color-memory-95-best':
      return Math.max(
        readScoreStat(getBestByStat(profile, 'color-memory', 'bestSimilarity'), 'bestSimilarity'),
        readScoreStat(getBestByStat(profile, 'color-memory', 'avgSimilarity'), 'avgSimilarity'),
        readScoreStat(profile.highlights.bestColorSimilarity, 'bestSimilarity'),
      ) >= 95;
    case 'aim-perfect-accuracy':
      return profile.recentScores.some((score) => score.gameId === 'aim-test' && ((readScoreStat(score, 'accuracy') >= 100) || (readScoreStat(score, 'misses') === 0 && readScoreStat(score, 'hits') > 0)));
    case 'aim-infinity-survive-60':
      return profile.recentScores.some((score) => score.gameId === 'aim-test' && readScoreString(score, 'mode') === 'infinity' && readScoreStat(score, 'survivedTime') >= 60);
    case 'aim-hp-recovered':
      return readScoreStat(getBestByStat(profile, 'aim-test', 'hpRecovered'), 'hpRecovered') >= 1;
    case 'aim-30s-95-accuracy':
      return profile.recentScores.some((score) => score.gameId === 'aim-test' && (readScoreString(score, 'mode') === '30s' || readScoreStat(score, 'durationSeconds') === 30) && readScoreStat(score, 'accuracy') >= 95);
    case 'aim-15s-combo-20':
      return profile.recentScores.some((score) => score.gameId === 'aim-test' && (readScoreString(score, 'mode') === '15s' || readScoreStat(score, 'durationSeconds') === 15) && Math.max(readScoreStat(score, 'combo'), readScoreStat(score, 'bestCombo'), readScoreStat(score, 'longestStreak')) >= 20);
    case 'word-memory-flawless':
      return profile.recentScores.some((score) => score.gameId === 'word-memory' && hasNumericScoreStat(score, 'mistakes') && readScoreStat(score, 'mistakes') === 0);
    case 'symbol-match-low-move':
      return (getBestScore(profile, 'symbol-match')?.score ?? 999) <= 10;
    case 'flappy-score-10':
      return (flappy?.score ?? 0) >= 10;
    case 'flappy-score-25':
      return (flappy?.score ?? 0) >= 25;
    case 'flappy-score-50':
      return (flappy?.score ?? 0) >= 50;
    case 'flappy-score-100':
      return (flappy?.score ?? 0) >= 100;
    case 'flappy-survive-60':
      return readScoreStat(getBestByStat(profile, 'flappy-ball', 'survivedTimeSeconds'), 'survivedTimeSeconds') >= 60;
    case 'flappy-efficiency-70':
      return readScoreStat(getBestByStat(profile, 'flappy-ball', 'efficiency'), 'efficiency') >= 70;
    case 'cps-10':
      return (cps?.score ?? 0) >= 10;
    case 'cps-15':
      return (cps?.score ?? 0) >= 15;
    case 'cps-alternating-mastery':
      return profile.recentScores.some((score) => score.gameId === 'cps-test' && readScoreString(score, 'inputMode').includes('alt') && readScoreStat(score, 'totalClicks') >= 30);
    case 'cps-endurance-30':
      return profile.recentScores.some((score) => score.gameId === 'cps-test' && readScoreStat(score, 'durationSeconds') >= 30 && readScoreStat(score, 'totalClicks') >= 200);
    case 'stroop-combo-20':
      return Math.max(readScoreStat(stroop, 'combo'), readScoreStat(stroop, 'bestCombo'), readScoreStat(stroop, 'longestStreak')) >= 20;
    case 'stroop-no-miss':
      return profile.recentScores.some((score) => score.gameId === 'stroop-test' && readScoreStat(score, 'misses') === 0 && readScoreStat(score, 'correctAnswers') > 0);
    case 'stroop-fast-reaction':
      return readScoreStat(getBestByStat(profile, 'stroop-test', 'averageReactionMs', 'asc'), 'averageReactionMs') <= 650 && readScoreStat(getBestByStat(profile, 'stroop-test', 'averageReactionMs', 'asc'), 'averageReactionMs') > 0;
    case 'time-sense-perfect':
      return profile.recentScores.some((score) => score.gameId === 'time-sense' && (readScoreStat(score, 'isPerfect') === 1 || (readScoreStat(score, 'deviationMs') > 0 && readScoreStat(score, 'deviationMs') <= 100)));
    case 'time-sense-ultra-precision':
      return readScoreStat(getBestByStat(profile, 'time-sense', 'deviationMs', 'asc'), 'deviationMs') > 0 && readScoreStat(getBestByStat(profile, 'time-sense', 'deviationMs', 'asc'), 'deviationMs') <= 50;
    case 'time-sense-low-deviation':
      return readScoreStat(getBestByStat(profile, 'time-sense', 'deviationMs', 'asc'), 'deviationMs') > 0 && readScoreStat(getBestByStat(profile, 'time-sense', 'deviationMs', 'asc'), 'deviationMs') <= 200;
    default: {
      const achievement = achievementDefinitions.find((item) => item.id === achievementId);
      return Boolean(achievement?.gameId && getGameProgressEntry(achievement.gameId).level > 1);
    }
  }
}

function qualifies(achievementId: string, event: ProgressionEvent, progression: PlayerProgression): boolean {
  const accuracy = statNumber(event, 'accuracy');
  const misses = statNumber(event, 'misses');
  const mode = statString(event, 'mode');
  const durationSeconds = statNumber(event, 'durationSeconds') || statNumber(event, 'selectedDuration');
  const combo = Math.max(statNumber(event, 'combo'), statNumber(event, 'bestCombo'), statNumber(event, 'longestStreak'));
  const survivedTime = Math.max(statNumber(event, 'survivedTime'), statNumber(event, 'survivedTimeSeconds'));

  switch (achievementId) {
    case 'global-level-10':
      return progression.level >= 10;
    case 'reaction-under-200':
      return event.gameId === 'reaction-time' && event.scoreEntry.score < 200;
    case 'typing-perfect-accuracy':
      return event.gameId === 'typing-speed' && accuracy >= 100;
    case 'typing-80-wpm':
      return event.gameId === 'typing-speed' && event.scoreEntry.score >= 80;
    case 'typing-100-wpm':
      return event.gameId === 'typing-speed' && event.scoreEntry.score >= 100;
    case 'typing-120-wpm':
      return event.gameId === 'typing-speed' && event.scoreEntry.score >= 120;
    case 'typing-hard-complete':
      return event.gameId === 'typing-speed' && statString(event, 'difficulty') === 'hard';
    case 'typing-polish-mastery':
      return event.gameId === 'typing-speed' && statString(event, 'difficulty') === 'hard' && accuracy >= 98;
    case 'color-memory-95-best':
      return event.gameId === 'color-memory' && Math.max(statNumber(event, 'bestSimilarity'), statNumber(event, 'avgSimilarity'), statNumber(event, 'finalSimilarity')) >= 95;
    case 'aim-perfect-accuracy':
      return event.gameId === 'aim-test' && (accuracy >= 100 || (misses === 0 && statNumber(event, 'hits') > 0));
    case 'aim-infinity-survive-60':
      return event.gameId === 'aim-test' && mode === 'infinity' && survivedTime >= 60;
    case 'aim-hp-recovered':
      return event.gameId === 'aim-test' && mode === 'infinity' && statNumber(event, 'hpRecovered') >= 1;
    case 'aim-30s-95-accuracy':
      return event.gameId === 'aim-test' && (mode === '30s' || durationSeconds === 30) && accuracy >= 95;
    case 'aim-15s-combo-20':
      return event.gameId === 'aim-test' && (mode === '15s' || durationSeconds === 15) && combo >= 20;
    case 'word-memory-flawless':
      return event.gameId === 'word-memory' && (getStatNumber(event.stats, 'mistakes') ?? 1) === 0;
    case 'symbol-match-low-move':
      return event.gameId === 'symbol-match' && event.scoreEntry.score <= 10;
    case 'flappy-score-10':
      return event.gameId === 'flappy-ball' && event.scoreEntry.score >= 10;
    case 'flappy-score-25':
      return event.gameId === 'flappy-ball' && event.scoreEntry.score >= 25;
    case 'flappy-score-50':
      return event.gameId === 'flappy-ball' && event.scoreEntry.score >= 50;
    case 'flappy-score-100':
      return event.gameId === 'flappy-ball' && event.scoreEntry.score >= 100;
    case 'flappy-survive-60':
      return event.gameId === 'flappy-ball' && survivedTime >= 60;
    case 'flappy-efficiency-70':
      return event.gameId === 'flappy-ball' && statNumber(event, 'efficiency') >= 70;
    case 'cps-10':
      return event.gameId === 'cps-test' && event.scoreEntry.score >= 10;
    case 'cps-15':
      return event.gameId === 'cps-test' && event.scoreEntry.score >= 15;
    case 'cps-alternating-mastery':
      return event.gameId === 'cps-test' && statString(event, 'inputMode').includes('alt') && statNumber(event, 'totalClicks') >= 30;
    case 'cps-endurance-30':
      return event.gameId === 'cps-test' && durationSeconds >= 30 && statNumber(event, 'totalClicks') >= 200;
    case 'stroop-combo-20':
      return event.gameId === 'stroop-test' && combo >= 20;
    case 'stroop-no-miss':
      return event.gameId === 'stroop-test' && misses === 0 && statNumber(event, 'correctAnswers') > 0;
    case 'stroop-fast-reaction':
      return event.gameId === 'stroop-test' && statNumber(event, 'averageReactionMs') > 0 && statNumber(event, 'averageReactionMs') <= 650;
    case 'time-sense-perfect':
      return event.gameId === 'time-sense' && (isTruthyStat(event, 'isPerfect') || (statNumber(event, 'deviationMs') > 0 && statNumber(event, 'deviationMs') <= 100));
    case 'time-sense-ultra-precision':
      return event.gameId === 'time-sense' && statNumber(event, 'deviationMs') > 0 && statNumber(event, 'deviationMs') <= 50;
    case 'time-sense-low-deviation':
      return event.gameId === 'time-sense' && statNumber(event, 'deviationMs') > 0 && statNumber(event, 'deviationMs') <= 200;
    default:
      return false;
  }
}

export function evaluateAchievements(
  currentUnlocks: AchievementUnlock[],
  event: ProgressionEvent,
  progression: PlayerProgression,
): AchievementUnlock[] {
  const nextUnlocks = [...currentUnlocks];

  achievementDefinitions.forEach((achievement) => {
    if (isUnlocked(achievement.id, nextUnlocks)) {
      return;
    }

    if (qualifies(achievement.id, event, progression)) {
      nextUnlocks.push({
        achievementId: achievement.id,
        unlockedAt: event.createdAt,
        eventId: event.id,
      });
    }
  });

  return nextUnlocks;
}

export function evaluateRetroactiveAchievements(currentUnlocks: AchievementUnlock[], profile: LocalProfile, now = new Date().toISOString()): AchievementUnlock[] {
  const nextUnlocks = [...currentUnlocks];

  achievementDefinitions.forEach((achievement) => {
    if (isUnlocked(achievement.id, nextUnlocks)) {
      return;
    }

    if (qualifiesFromProfile(achievement.id, profile)) {
      nextUnlocks.push({
        achievementId: achievement.id,
        unlockedAt: now,
        source: 'retroactive',
      });
    }
  });

  return nextUnlocks;
}
