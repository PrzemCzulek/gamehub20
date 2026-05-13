import { questDefinitions } from '../data/quests';
import { getGameConfig } from '../data/games';
import type { GameId } from '../types';
import { addMainXpFromMetaReward } from './xp';
import type { QuestDefinition, QuestProgress, QuestStreak, ProgressionEvent } from './types';

const QUEST_PROGRESS_KEY = 'game-hub:quest-progress';
const QUEST_STREAK_KEY = 'game-hub:quest-streak';

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

export function getPeriodId(type: QuestDefinition['type'], date = new Date()): string {
  const year = date.getFullYear();

  if (type === 'daily') {
    return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  const firstDay = new Date(year, 0, 1);
  const dayOffset = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.floor((dayOffset + firstDay.getDay()) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getDayId(date = new Date()): string {
  return getPeriodId('daily', date);
}

function daysBetween(a: string, b: string): number {
  const first = new Date(`${a}T00:00:00`).getTime();
  const second = new Date(`${b}T00:00:00`).getTime();
  return Math.round((second - first) / 86400000);
}

export function getQuestProgressStorage(): QuestProgress[] {
  const progress = readJson<unknown>(QUEST_PROGRESS_KEY, []);
  return Array.isArray(progress)
    ? progress.map((item) => {
        const quest = item as QuestProgress;
        return {
          ...quest,
          isClaimed: Boolean(quest.isClaimed ?? quest.claimedAt),
        };
      })
    : [];
}

export function getQuestStreak(): QuestStreak {
  const streak = readJson<Partial<QuestStreak>>(QUEST_STREAK_KEY, {});
  return {
    currentStreak: Math.max(0, Number(streak.currentStreak ?? 0)),
    bestStreak: Math.max(0, Number(streak.bestStreak ?? 0)),
    lastActiveDay: streak.lastActiveDay,
  };
}

export function updateQuestStreak(date = new Date()): QuestStreak {
  const today = getDayId(date);
  const current = getQuestStreak();

  if (current.lastActiveDay === today) {
    return current;
  }

  const gap = current.lastActiveDay ? daysBetween(current.lastActiveDay, today) : 0;
  const currentStreak = gap === 1 ? current.currentStreak + 1 : 1;
  const next = {
    currentStreak,
    bestStreak: Math.max(current.bestStreak, currentStreak),
    lastActiveDay: today,
  };

  writeJson(QUEST_STREAK_KEY, next);
  return next;
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

function getTargetIncrement(
  quest: QuestDefinition,
  event: ProgressionEvent,
  personalBestImproved: boolean,
  currentGameIds: GameId[],
): { progress?: number; gameIds?: GameId[] } {
  switch (quest.target.kind) {
    case 'games_played':
      return { progress: 1 };
    case 'xp_earned':
      return { progress: event.xpGained };
    case 'personal_bests':
      return { progress: personalBestImproved ? 1 : 0 };
    case 'different_games_completed': {
      const gameIds = Array.from(new Set([...currentGameIds, event.gameId]));
      return { progress: gameIds.length, gameIds };
    }
    case 'reaction_under_ms':
      return { progress: event.gameId === 'reaction-time' && event.scoreEntry.score < quest.target.amount ? 1 : 0 };
    case 'reaction_average_under_ms':
      return {
        progress:
          event.gameId === 'reaction-time' && (event.stats.averageReactionMs ?? event.scoreEntry.score) < quest.target.amount ? 1 : 0,
      };
    case 'typing_accuracy_over':
      return { progress: event.gameId === 'typing-speed' && (event.stats.accuracy ?? 0) >= quest.target.amount ? 1 : 0 };
    case 'typing_wpm_over':
      return { progress: event.gameId === 'typing-speed' && event.scoreEntry.score >= quest.target.amount ? 1 : 0 };
    case 'typing_duration_seconds':
      return { progress: event.gameId === 'typing-speed' && (event.stats.durationSeconds ?? 0) >= quest.target.amount ? 1 : 0 };
    case 'typing_flawless':
      return { progress: event.gameId === 'typing-speed' && (event.stats.incorrectChars ?? 1) === 0 ? 1 : 0 };
    case 'aim_accuracy_over':
      return { progress: event.gameId === 'aim-test' && (event.stats.accuracy ?? 0) >= quest.target.amount ? 1 : 0 };
    case 'aim_score_over':
      return { progress: event.gameId === 'aim-test' && event.scoreEntry.score >= quest.target.amount ? 1 : 0 };
    case 'aim_average_under_ms':
      return { progress: event.gameId === 'aim-test' && (event.stats.averageReactionMs ?? Infinity) <= quest.target.amount ? 1 : 0 };
    case 'aim_misses_under':
      return { progress: event.gameId === 'aim-test' && (event.stats.misses ?? Infinity) <= quest.target.amount ? 1 : 0 };
    case 'word_combo_over':
      return { progress: event.gameId === 'word-memory' && (event.stats.bestCombo ?? event.stats.combo ?? 0) >= quest.target.amount ? 1 : 0 };
    case 'word_score_over':
      return { progress: event.gameId === 'word-memory' && event.scoreEntry.score >= quest.target.amount ? 1 : 0 };
    case 'word_mistakes_under':
      return { progress: event.gameId === 'word-memory' && (event.stats.mistakes ?? Infinity) <= quest.target.amount ? 1 : 0 };
    case 'aim_flawless':
      return { progress: event.gameId === 'aim-test' && (event.stats.misses ?? 1) === 0 ? 1 : 0 };
    case 'reaction_valid_runs':
      return { progress: event.gameId === 'reaction-time' && event.scoreEntry.score < 9999 ? 1 : 0 };
    case 'symbol_under_moves':
      return { progress: event.gameId === 'symbol-match' && event.scoreEntry.score <= quest.target.amount ? 1 : 0 };
    case 'symbol_mistakes_under':
      return { progress: event.gameId === 'symbol-match' && (event.stats.mistakes ?? Infinity) <= quest.target.amount ? 1 : 0 };
    case 'symbol_duration_under_ms':
      return { progress: event.gameId === 'symbol-match' && (event.stats.durationMs ?? Infinity) <= quest.target.amount ? 1 : 0 };
    case 'memory_level_at_least':
      return { progress: event.gameId === 'memory-test' && event.scoreEntry.score >= quest.target.amount ? 1 : 0 };
    case 'color_similarity_over':
      return {
        progress:
          event.gameId === 'color-memory' &&
          (event.stats.bestSimilarity ?? event.stats.finalSimilarity ?? 0) >= quest.target.amount
            ? 1
            : 0,
      };
    case 'color_average_similarity_over':
      return { progress: event.gameId === 'color-memory' && (event.stats.averageSimilarity ?? 0) >= quest.target.amount ? 1 : 0 };
    case 'color_completed_round':
      return { progress: event.gameId === 'color-memory' && (event.stats.completedRound ?? event.scoreEntry.score) >= quest.target.amount ? 1 : 0 };
    case 'benchmark_runs':
      return {
        progress:
          event.gameId === 'reaction-time' && event.scoreEntry.score < 9999 && event.scoreEntry.meta?.benchmarkMode === true ? 1 : 0,
      };
  }
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

  updateQuestStreak(new Date(now));

  questDefinitions.forEach((quest) => {
    const periodId = getPeriodId(quest.type, new Date(now));
    const existingIndex = nextProgress.findIndex((item) => item.questId === quest.id && item.periodId === periodId);
    const existing = existingIndex >= 0 ? nextProgress[existingIndex] : undefined;
    const baseProgress: QuestProgress = {
      questId: quest.id,
      periodId,
      progress: 0,
      completed: false,
      isClaimed: false,
      updatedAt: now,
      gameIds: [],
      ...existing,
    };
    let progress = baseProgress.progress;
    let gameIds = baseProgress.gameIds ?? [];

    if (!baseProgress.completed) {
      const increment = getTargetIncrement(quest, event, personalBestImproved, gameIds);
      if (quest.target.kind === 'different_games_completed') {
        gameIds = increment.gameIds ?? gameIds;
        progress = increment.progress ?? progress;
      } else {
        progress += increment.progress ?? 0;
      }
    }

    const completed = baseProgress.completed || progress >= quest.target.amount;
    const updated: QuestProgress = {
      ...baseProgress,
      progress: Math.min(progress, quest.target.amount),
      completed,
      completedAt: baseProgress.completedAt ?? (completed ? now : undefined),
      isClaimed: Boolean(baseProgress.isClaimed ?? baseProgress.claimedAt),
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

export function claimQuestReward(questId: string, periodId: string) {
  const quest = questDefinitions.find((item) => item.id === questId);

  if (!quest) {
    return { ok: false as const, reason: 'not_found' as const };
  }

  const progress = getQuestProgressStorage();
  const index = progress.findIndex((item) => item.questId === questId && item.periodId === periodId);
  const entry = index >= 0 ? progress[index] : undefined;

  if (!entry?.completed) {
    return { ok: false as const, reason: 'not_completed' as const };
  }

  if (entry.isClaimed || entry.claimedAt) {
    return { ok: false as const, reason: 'already_claimed' as const };
  }

  const claimedAt = new Date().toISOString();
  const updated = { ...entry, claimedAt, isClaimed: true };
  progress[index] = updated;
  writeJson(QUEST_PROGRESS_KEY, progress);
  addMainXpFromMetaReward(quest.rewardXp, `quest:${quest.id}:${periodId}`);

  return {
    ok: true as const,
    quest,
    progress: updated,
    mainXpGained: quest.rewardXp,
  };
}

export const questStorageKeys = {
  progress: QUEST_PROGRESS_KEY,
  streak: QUEST_STREAK_KEY,
};
