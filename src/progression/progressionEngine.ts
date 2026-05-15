import { evaluateAchievements, evaluateRetroactiveAchievements } from './achievements';
import { resetGameProgressData, updateGameProgressFromScore } from './gameProgress';
import { getQuestProgressStorage, questStorageKeys, updateQuestProgress } from './quests';
import type { LocalProfile } from '../types';
import type { AchievementUnlock, PlayerProgression, ProgressionEvent, ProgressionResult, QuestProgress } from './types';
import { getMainAccountXp, getPlayerProgressionNumbers, resetMainMetaRewardXp } from './xp';

const EVENTS_KEY = 'game-hub:progression-events';
const PLAYER_PROGRESSION_KEY = 'game-hub:player-progression';
const QUEST_PROGRESS_KEY = 'game-hub:quest-progress';
const ACHIEVEMENT_UNLOCKS_KEY = 'game-hub:achievement-unlocks';
const MAX_STORED_EVENTS = 500;

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

export function getProgressionEvents(): ProgressionEvent[] {
  const events = readJson<unknown>(EVENTS_KEY, []);
  return Array.isArray(events) ? (events as ProgressionEvent[]) : [];
}

export function getStoredPlayerProgression(): PlayerProgression | null {
  return readJson<PlayerProgression | null>(PLAYER_PROGRESSION_KEY, null);
}

export function getQuestProgress(): QuestProgress[] {
  return getQuestProgressStorage();
}

export function getAchievementUnlocks(): AchievementUnlock[] {
  const unlocks = readJson<unknown>(ACHIEVEMENT_UNLOCKS_KEY, []);
  return Array.isArray(unlocks) ? (unlocks as AchievementUnlock[]) : [];
}

function updatePlayerProgression(event: ProgressionEvent, current: PlayerProgression | null): PlayerProgression {
  const xp = getMainAccountXp();
  const levelNumbers = getPlayerProgressionNumbers(xp);

  return {
    playerId: event.playerId,
    playerName: event.playerName,
    xp,
    ...levelNumbers,
    totalEvents: (current?.totalEvents ?? 0) + 1,
    totalGamesPlayed: (current?.totalGamesPlayed ?? 0) + 1,
    updatedAt: event.createdAt,
  };
}

export function processProgressionEvent(event: ProgressionEvent): ProgressionResult {
  const previousEvents = getProgressionEvents();
  const storedPlayerProgression = getStoredPlayerProgression();
  const currentQuestProgress = getQuestProgress();
  const currentUnlocks = getAchievementUnlocks();
  const previousLevel = storedPlayerProgression?.level ?? 1;
  const playerProgression = updatePlayerProgression(event, storedPlayerProgression);
  const gameProgressResult = updateGameProgressFromScore(event.scoreEntry);
  const questResult = updateQuestProgress(currentQuestProgress, event, previousEvents);
  const achievementUnlocks = evaluateAchievements(currentUnlocks, event, playerProgression);
  const previousUnlockIds = new Set(currentUnlocks.map((unlock) => unlock.achievementId));
  const newAchievementUnlocks = achievementUnlocks.filter((unlock) => !previousUnlockIds.has(unlock.achievementId));
  const nextEvents = [event, ...previousEvents].slice(0, MAX_STORED_EVENTS);

  writeJson(EVENTS_KEY, nextEvents);
  writeJson(PLAYER_PROGRESSION_KEY, playerProgression);
  writeJson(QUEST_PROGRESS_KEY, questResult.progress);
  writeJson(ACHIEVEMENT_UNLOCKS_KEY, achievementUnlocks);

  return {
    event,
    playerProgression,
    previousLevel,
    gameProgress: gameProgressResult.entry,
    previousGameLevel: gameProgressResult.previousLevel,
    gameLevelUp: gameProgressResult.levelUp,
    questProgress: questResult.progress,
    achievementUnlocks,
    newAchievementUnlocks,
    newlyCompletedQuests: questResult.newlyCompletedQuests,
    personalBestImproved: questResult.personalBestImproved,
  };
}

export function syncRetroactiveAchievements(profile: LocalProfile): AchievementUnlock[] {
  const currentUnlocks = getAchievementUnlocks();
  const previousIds = new Set(currentUnlocks.map((unlock) => unlock.achievementId));
  const nextUnlocks = evaluateRetroactiveAchievements(currentUnlocks, profile);
  const retroUnlocks = nextUnlocks.filter((unlock) => !previousIds.has(unlock.achievementId));

  if (retroUnlocks.length > 0) {
    writeJson(ACHIEVEMENT_UNLOCKS_KEY, nextUnlocks);
  }

  if (import.meta.env.DEV) {
    console.debug('Retroactive achievement sync', {
      checked: nextUnlocks.length,
      unlocked: retroUnlocks.length,
      ids: retroUnlocks.map((unlock) => unlock.achievementId),
    });
  }

  return retroUnlocks;
}

export function resetProgressionData(): void {
  try {
    localStorage.removeItem(EVENTS_KEY);
    localStorage.removeItem(PLAYER_PROGRESSION_KEY);
    localStorage.removeItem(QUEST_PROGRESS_KEY);
    localStorage.removeItem(questStorageKeys.streak);
    localStorage.removeItem(ACHIEVEMENT_UNLOCKS_KEY);
    resetGameProgressData();
    resetMainMetaRewardXp();
  } catch {
    return;
  }
}

export const progressionStorageKeys = {
  events: EVENTS_KEY,
  playerProgression: PLAYER_PROGRESSION_KEY,
  questProgress: QUEST_PROGRESS_KEY,
  achievementUnlocks: ACHIEVEMENT_UNLOCKS_KEY,
};
