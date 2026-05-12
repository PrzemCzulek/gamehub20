import { achievementDefinitions } from '../data/achievements';
import type { AchievementUnlock, PlayerProgression, ProgressionEvent } from './types';
import { getStatNumber } from './stats';

function isUnlocked(achievementId: string, unlocks: AchievementUnlock[]): boolean {
  return unlocks.some((unlock) => unlock.achievementId === achievementId);
}

function qualifies(achievementId: string, event: ProgressionEvent, progression: PlayerProgression): boolean {
  switch (achievementId) {
    case 'global-level-10':
      return progression.level >= 10;
    case 'reaction-under-200':
      return event.gameId === 'reaction-time' && event.scoreEntry.score < 200;
    case 'typing-perfect-accuracy':
      return event.gameId === 'typing-speed' && getStatNumber(event.stats, 'accuracy') === 100;
    case 'typing-100-wpm':
      return event.gameId === 'typing-speed' && event.scoreEntry.score >= 100;
    case 'color-memory-95-best':
      return event.gameId === 'color-memory' && (getStatNumber(event.stats, 'bestSimilarity') ?? 0) >= 95;
    case 'aim-perfect-accuracy':
      return event.gameId === 'aim-test' && getStatNumber(event.stats, 'accuracy') === 100;
    case 'word-memory-flawless':
      return event.gameId === 'word-memory' && (getStatNumber(event.stats, 'mistakes') ?? 1) === 0;
    case 'symbol-match-low-move':
      return event.gameId === 'symbol-match' && event.scoreEntry.score <= 10;
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
