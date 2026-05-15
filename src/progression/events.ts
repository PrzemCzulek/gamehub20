import type { LeaderboardEntry } from '../types';
import type { ProgressionEvent, ProgressionEventType } from './types';
import { calculateScoreXp } from './xp';
import { getEventStats } from './stats';

const eventTypeByGame = {
  'reaction-time': 'reaction_finished',
  'memory-test': 'memory_finished',
  'color-memory': 'color_memory_finished',
  'typing-speed': 'typing_finished',
  'symbol-match': 'symbol_match_finished',
  'aim-test': 'aim_finished',
  'word-memory': 'word_memory_finished',
  'time-sense': 'time_sense_finished',
  'stroop-test': 'stroop_finished',
  'cps-test': 'cps_finished',
  'flappy-ball': 'flappy_finished',
  'shape-precision': 'shape_precision_finished',
} as const satisfies Record<LeaderboardEntry['gameId'], ProgressionEventType>;

function createEventId(scoreEntry: LeaderboardEntry): string {
  const randomPart = Math.random().toString(16).slice(2);
  return `${scoreEntry.gameId}-${Date.now()}-${randomPart}`;
}

export function createProgressionEvent(scoreEntry: LeaderboardEntry): ProgressionEvent {
  const stats = getEventStats(scoreEntry);
  const xpGained = scoreEntry.xpGained ?? calculateScoreXp({ gameId: scoreEntry.gameId, score: scoreEntry.score, stats });

  return {
    id: createEventId(scoreEntry),
    type: eventTypeByGame[scoreEntry.gameId] ?? 'game_score_saved',
    gameId: scoreEntry.gameId,
    playerId: scoreEntry.playerId ?? 'local-player',
    playerName: scoreEntry.playerName,
    scoreEntry,
    stats,
    xpGained,
    createdAt: new Date().toISOString(),
  };
}
