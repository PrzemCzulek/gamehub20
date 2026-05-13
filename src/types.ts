export type GameId =
  | 'reaction-time'
  | 'memory-test'
  | 'color-memory'
  | 'typing-speed'
  | 'symbol-match'
  | 'aim-test'
  | 'word-memory';

export type ScoreDirection = 'ascending' | 'descending';

export type ScoreStats = {
  accuracy?: number;
  averageReactionMs?: number;
  bestSimilarity?: number;
  worstSimilarity?: number;
  averageSimilarity?: number;
  finalSimilarity?: number;
  completedRound?: number;
  mistakes?: number;
  hits?: number;
  misses?: number;
  combo?: number;
  bestCombo?: number;
  moves?: number;
  correctChars?: number;
  incorrectChars?: number;
  completedSentences?: number;
  totalTypedChars?: number;
  rawWpm?: number;
  selectedDuration?: number;
  durationSeconds?: number;
  rounds?: number;
  durationMs?: number;
};

export type LeaderboardEntry = {
  gameId: GameId;
  playerId?: string;
  playerName: string;
  score: number;
  scoreLabel: string;
  createdAt: string;
  meta?: Record<string, unknown>;
  stats?: ScoreStats;
  xpGained?: number;
  runDurationMs?: number;
  leaderboardScope?: string;
};

export type ScoreInput = Omit<LeaderboardEntry, 'createdAt' | 'playerName'>;

export type LeaderboardMetric = {
  id: string;
  label: string;
  direction: ScoreDirection;
  source: 'score' | 'stats';
  statKey?: keyof ScoreStats;
  valueType?: 'number' | 'percent' | 'ms';
  suffix?: string;
};

export type GameConfig = {
  id: GameId;
  title: string;
  description: string;
  scoreDirection: ScoreDirection;
  scoreName: string;
  metrics: LeaderboardMetric[];
};

export type LocalProfile = {
  playerId: string;
  playerName: string;
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  attemptsPlayed: number;
  totalGamesPlayed: number;
  totalScoreEntries: number;
  bestGame?: GameId;
  mostPlayedGame?: GameId;
  bestScores: Partial<Record<GameId, LeaderboardEntry>>;
  recentScores: LeaderboardEntry[];
  highlights: {
    bestReactionTime?: LeaderboardEntry;
    highestWpm?: LeaderboardEntry;
    highestAimAccuracy?: LeaderboardEntry;
    bestColorSimilarity?: LeaderboardEntry;
    bestSymbolMatch?: LeaderboardEntry;
    bestWordMemory?: LeaderboardEntry;
  };
};

export type PlayerHighlights = {
  bestReactionTime?: LeaderboardEntry;
  bestTypingWpm?: LeaderboardEntry;
  bestTypingAccuracy?: LeaderboardEntry;
  bestAimAccuracy?: LeaderboardEntry;
  bestColorSimilarity?: LeaderboardEntry;
  bestWordMemoryScore?: LeaderboardEntry;
  bestSymbolMatchMoves?: LeaderboardEntry;
  highestMemoryLevel?: LeaderboardEntry;
};

export type PlayerAchievementSummary = {
  unlocked: number;
  total: number;
};

export type PlayerGameProgressSummary = {
  gameId: GameId;
  gameTitle: string;
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  totalPlays: number;
  bestScoreLabel?: string;
  milestonesClaimed: string[];
};

export type PlayerProfileSummary = {
  playerId: string;
  playerName: string;
  displayName: string;
  level: number;
  xp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgressPercent: number;
  gamesPlayed: number;
  totalScoreEntries: number;
  favoriteGame?: GameId;
  mostPlayedGame?: GameId;
  bestGame?: GameId;
  achievementsUnlocked: number;
  achievementsTotal: number;
  achievements: PlayerAchievementSummary;
  highlights: PlayerHighlights;
  gameProgressSummary: PlayerGameProgressSummary[];
  topGameLevels: PlayerGameProgressSummary[];
};
