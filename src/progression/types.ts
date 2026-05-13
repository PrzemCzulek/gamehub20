import type { GameId, LeaderboardEntry, ScoreStats } from '../types';

export type GameProgressEntry = {
  gameId: GameId;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  totalPlays: number;
  bestScore?: number;
  bestScoreLabel?: string;
  lastPlayedAt?: string;
  milestonesClaimed: string[];
};

export type GameProgressMap = Record<string, GameProgressEntry>;

export type GameMilestone = {
  id: string;
  gameId: GameId;
  levelRequired: number;
  mainXpReward: number;
  label: string;
  description: string;
  rewardLabel?: string;
  cosmeticRewardId?: string;
};

export type ProgressionEventType =
  | 'game_score_saved'
  | 'typing_finished'
  | 'reaction_finished'
  | 'aim_finished'
  | 'memory_finished'
  | 'color_memory_finished'
  | 'word_memory_finished'
  | 'symbol_match_finished';

export type ProgressionEvent = {
  id: string;
  type: ProgressionEventType;
  gameId: GameId;
  playerId: string;
  playerName: string;
  scoreEntry: LeaderboardEntry;
  stats: ScoreStats;
  xpGained: number;
  createdAt: string;
};

export type QuestType = 'daily' | 'weekly';
export type QuestCategory = 'accuracy' | 'streak' | 'combo' | 'consistency' | 'flawless' | 'personal_best' | 'participation' | 'xp';
export type QuestTargetKind = 'games_played' | 'xp_earned' | 'personal_bests' | 'different_games_completed';

export type QuestDefinition = {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  category: QuestCategory;
  rewardXp: number;
  target: {
    kind: QuestTargetKind;
    amount: number;
  };
};

export type QuestProgress = {
  questId: string;
  periodId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
  gameIds?: GameId[];
};

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'hidden';
export type AchievementCategory = 'progression' | 'flawless' | 'high_skill' | 'hidden' | 'rare' | 'insane';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
};

export type AchievementUnlock = {
  achievementId: string;
  unlockedAt: string;
  eventId?: string;
};

export type PlayerProgression = {
  playerId: string;
  playerName: string;
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  totalEvents: number;
  totalGamesPlayed: number;
  updatedAt: string;
};

export type ProgressionResult = {
  event: ProgressionEvent;
  playerProgression: PlayerProgression;
  previousLevel: number;
  gameProgress: GameProgressEntry;
  previousGameLevel: number;
  gameLevelUp: boolean;
  questProgress: QuestProgress[];
  achievementUnlocks: AchievementUnlock[];
  newAchievementUnlocks: AchievementUnlock[];
  newlyCompletedQuests: QuestProgress[];
  personalBestImproved: boolean;
};
