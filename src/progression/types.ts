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
  | 'symbol_match_finished'
  | 'time_sense_finished';

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
export type QuestRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type QuestCategory =
  | 'accuracy'
  | 'streak'
  | 'combo'
  | 'consistency'
  | 'flawless'
  | 'personal_best'
  | 'participation'
  | 'xp'
  | 'skill'
  | 'challenge'
  | 'exploration';
export type QuestTargetKind =
  | 'games_played'
  | 'xp_earned'
  | 'personal_bests'
  | 'different_games_completed'
  | 'reaction_under_ms'
  | 'reaction_average_under_ms'
  | 'typing_accuracy_over'
  | 'typing_wpm_over'
  | 'typing_duration_seconds'
  | 'typing_flawless'
  | 'aim_accuracy_over'
  | 'aim_score_over'
  | 'aim_average_under_ms'
  | 'aim_misses_under'
  | 'word_combo_over'
  | 'word_score_over'
  | 'word_mistakes_under'
  | 'aim_flawless'
  | 'reaction_valid_runs'
  | 'symbol_under_moves'
  | 'symbol_mistakes_under'
  | 'symbol_duration_under_ms'
  | 'memory_level_at_least'
  | 'color_similarity_over'
  | 'color_average_similarity_over'
  | 'color_completed_round'
  | 'benchmark_runs';

export type QuestDefinition = {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  category: QuestCategory;
  rarity: QuestRarity;
  icon?: string;
  skillDifficulty?: 1 | 2 | 3 | 4 | 5;
  seasonalTags?: string[];
  hidden?: boolean;
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
  claimedAt?: string;
  isClaimed?: boolean;
  updatedAt: string;
  gameIds?: GameId[];
};

export type QuestStreak = {
  currentStreak: number;
  bestStreak: number;
  lastActiveDay?: string;
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
