import { questDefinitions } from '../data/quests';
import { getGameConfig } from '../data/games';
import type { QuestDefinition, QuestProgress, ProgressionEvent } from './types';

function getPeriodId(type: QuestDefinition['type'], date = new Date()): string {
  const year = date.getFullYear();

  if (type === 'daily') {
    return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const firstDay = new Date(year, 0, 1);
  const dayOffset = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.floor((dayOffset + firstDay.getDay()) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function isPersonalBest(event: ProgressionEvent, previousEvents: ProgressionEvent[]): boolean {
  const previousGameEvents = previousEvents.filter((item) => item.gameId === event.gameId);

  if (previousGameEvents.length === 0) {
    return true;
  }

  const direction = getGameConfig(event.gameId).scoreDirection;
  const previousBest = previousGameEvents
    .map((item) => item.scoreEntry.score)
    .sort((a, b) => (direction === 'ascending' ? a - b : b - a))[0];

  return direction === 'ascending' ? event.scoreEntry.score < previousBest : event.scoreEntry.score > previousBest;
}

export function updateQuestProgress(
  currentProgress: QuestProgress[],
  event: ProgressionEvent,
  previousEvents: ProgressionEvent[],
): { progress: QuestProgress[]; personalBestImproved: boolean; newlyCompletedQuests: QuestProgress[] } {
  const now = event.createdAt;
  const personalBestImproved = isPersonalBest(event, previousEvents);
  const nextProgress = [...currentProgress];
  const newlyCompletedQuests: QuestProgress[] = [];

  questDefinitions.forEach((quest) => {
    const periodId = getPeriodId(quest.type, new Date(now));
    const existingIndex = nextProgress.findIndex((item) => item.questId === quest.id && item.periodId === periodId);
    const existing = existingIndex >= 0 ? nextProgress[existingIndex] : undefined;
    const baseProgress: QuestProgress = existing ?? {
      questId: quest.id,
      periodId,
      progress: 0,
      completed: false,
      updatedAt: now,
      gameIds: [],
    };
    let progress = baseProgress.progress;
    let gameIds = baseProgress.gameIds ?? [];

    if (!baseProgress.completed) {
      if (quest.target.kind === 'games_played') {
        progress += 1;
      }

      if (quest.target.kind === 'xp_earned') {
        progress += event.xpGained;
      }

      if (quest.target.kind === 'personal_bests' && personalBestImproved) {
        progress += 1;
      }

      if (quest.target.kind === 'different_games_completed') {
        gameIds = Array.from(new Set([...gameIds, event.gameId]));
        progress = gameIds.length;
      }
    }

    const completed = baseProgress.completed || progress >= quest.target.amount;
    const updated: QuestProgress = {
      ...baseProgress,
      progress: Math.min(progress, quest.target.amount),
      completed,
      completedAt: baseProgress.completedAt ?? (completed ? now : undefined),
      updatedAt: now,
      gameIds,
    };

    if (existingIndex >= 0) {
      nextProgress[existingIndex] = updated;
    } else {
      nextProgress.push(updated);
    }

    if (!baseProgress.completed && updated.completed) {
      newlyCompletedQuests.push(updated);
    }
  });

  return { progress: nextProgress, personalBestImproved, newlyCompletedQuests };
}
