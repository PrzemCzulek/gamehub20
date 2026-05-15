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
    | 'time_sense_finished'
    | 'stroop_finished'
    | 'cps_finished'
    | 'flappy_finished';

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
  | 'speed'
  | 'precision'
  | 'survival'
  | 'focus'
  | 'streak'
  | 'combo'
  | 'consistency'
  | 'mastery'
  | 'arcade'
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
  | 'benchmark_runs'
  | 'aim_hits_in_mode'
  | 'aim_combo_in_mode'
  | 'aim_survive_infinity_seconds'
  | 'aim_hp_recovered'
  | 'aim_accuracy_with_hits'
  | 'aim_no_miss_mode'
  | 'flappy_score'
  | 'flappy_survive_seconds'
  | 'flappy_efficiency'
  | 'flappy_low_flaps_for_score'
  | 'cps_score_mode_duration'
  | 'cps_peak'
  | 'cps_consistency'
  | 'cps_total_clicks_mode'
  | 'cps_overheat'
  | 'stroop_accuracy'
  | 'stroop_combo'
  | 'stroop_average_under_ms'
  | 'stroop_no_miss'
  | 'time_sense_perfects'
  | 'time_sense_deviation_under_ms'
  | 'time_sense_accuracy'
  | 'time_sense_no_miss'
  | 'total_combo'
  | 'no_miss_runs';

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
    gameId?: GameId;
    mode?: string;
    durationSeconds?: number;
    inputMode?: string;
    minScore?: number;
    maxFlaps?: number;
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

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'hidden';
export type AchievementCategory =
  | 'progression'
  | 'flawless'
  | 'high_skill'
  | 'hidden'
  | 'rare'
  | 'insane'
  | 'speed'
  | 'precision'
  | 'survival'
  | 'mastery'
  | 'arcade'
  | 'focus'
  | 'consistency';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  gameId?: GameId;
  icon?: string;
  targetLabel?: string;
  xpReward?: number;
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
