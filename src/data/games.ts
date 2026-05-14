import type { GameConfig, GameId } from '../types';

export const games: GameConfig[] = [
  {
    id: 'reaction-time',
    title: 'Reaction Time Test',
    description: 'Reflex benchmark.',
    scoreDirection: 'ascending',
    scoreName: 'czas reakcji',
    mobileSupport: 'ready',
    tags: ['reflex', 'speed', 'focus', 'mobile'],
    metrics: [{ id: 'score', label: 'Wynik', direction: 'ascending', source: 'score', valueType: 'ms' }],
  },
  {
    id: 'memory-test',
    title: 'Memory Test',
    description: 'Sequence recall.',
    scoreDirection: 'descending',
    scoreName: 'poziom',
    mobileSupport: 'ready',
    tags: ['memory', 'focus', 'mobile'],
    metrics: [{ id: 'score', label: 'Poziom', direction: 'descending', source: 'score', suffix: 'poziom' }],
  },
  {
    id: 'color-memory',
    title: 'Color Memory Test',
    description: 'Color precision.',
    scoreDirection: 'descending',
    scoreName: 'runda',
    mobileSupport: 'ready',
    tags: ['memory', 'precision', 'focus', 'mobile'],
    metrics: [
      { id: 'score', label: 'Runda', direction: 'descending', source: 'score', suffix: 'runda' },
      { id: 'bestSimilarity', label: '%', direction: 'descending', source: 'stats', statKey: 'bestSimilarity', valueType: 'percent' },
      { id: 'perfectMatches', label: 'Perfect', direction: 'descending', source: 'stats', statKey: 'perfectMatches' },
    ],
  },
  {
    id: 'typing-speed',
    title: 'Typing Speed Test',
    description: 'WPM sprint.',
    scoreDirection: 'descending',
    scoreName: 'WPM',
    mobileSupport: 'desktop-only',
    mobileNote: 'Ranking tylko desktop.',
    tags: ['typing', 'speed', 'desktop'],
    metrics: [
      { id: 'score', label: 'WPM', direction: 'descending', source: 'score', suffix: 'WPM' },
      { id: 'accuracy', label: 'Celność', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'rounds', label: 'Zdania', direction: 'descending', source: 'stats', statKey: 'rounds' },
      { id: 'correctChars', label: 'Znaki', direction: 'descending', source: 'stats', statKey: 'correctChars' },
    ],
  },
  {
    id: 'symbol-match',
    title: 'Symbol Match',
    description: 'Pair clear.',
    scoreDirection: 'ascending',
    scoreName: 'ruchy',
    mobileSupport: 'ready',
    tags: ['memory', 'focus', 'casual', 'mobile'],
    metrics: [
      { id: 'score', label: 'Ruchy', direction: 'ascending', source: 'score', suffix: 'ruchów' },
      { id: 'mistakes', label: 'Pomyłki', direction: 'ascending', source: 'stats', statKey: 'mistakes' },
      { id: 'durationMs', label: 'Czas', direction: 'ascending', source: 'stats', statKey: 'durationMs', valueType: 'ms' },
    ],
  },
  {
    id: 'aim-test',
    title: 'Aim Test',
    description: 'Precision targets.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'limited',
    mobileNote: 'Touch może wpływać na wynik.',
    tags: ['precision', 'reflex', 'challenge'],
    metrics: [
      { id: 'score', label: 'Punkty', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'accuracy', label: 'Celność', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'averageReactionMs', label: 'Śr. czas', direction: 'ascending', source: 'stats', statKey: 'averageReactionMs', valueType: 'ms' },
      { id: 'hits', label: 'Trafienia', direction: 'descending', source: 'stats', statKey: 'hits' },
      { id: 'misses', label: 'Pomyłki', direction: 'ascending', source: 'stats', statKey: 'misses' },
    ],
  },
  {
    id: 'word-memory',
    title: 'Word Memory',
    description: 'Word recall.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'limited',
    mobileNote: 'Najlepiej na większym ekranie.',
    tags: ['memory', 'focus', 'casual'],
    metrics: [
      { id: 'score', label: 'Punkty', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'bestCombo', label: 'Combo', direction: 'descending', source: 'stats', statKey: 'bestCombo' },
      { id: 'mistakes', label: 'Błędy', direction: 'ascending', source: 'stats', statKey: 'mistakes' },
      { id: 'rounds', label: 'Rundy', direction: 'descending', source: 'stats', statKey: 'rounds' },
    ],
  },
  {
    id: 'time-sense',
    title: 'Time Sense Test',
    description: 'Hidden timer.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'ready',
    tags: ['focus', 'timing', 'precision', 'casual'],
    metrics: [
      { id: 'score', label: 'Punkty', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'accuracy', label: 'Dokładność', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'deviationMs', label: 'Różnica', direction: 'ascending', source: 'stats', statKey: 'deviationMs', valueType: 'ms' },
      { id: 'isPerfect', label: 'Perfect', direction: 'descending', source: 'stats', statKey: 'isPerfect' },
    ],
  },
  {
    id: 'stroop-test',
    title: 'Stroop Test',
    description: 'Neuro focus.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'ready',
    tags: ['focus', 'speed', 'precision', 'brain', 'casual'],
    metrics: [
      { id: 'score', label: 'Punkty', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'accuracy', label: 'Accuracy', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'bestCombo', label: 'Streak', direction: 'descending', source: 'stats', statKey: 'bestCombo' },
      { id: 'averageReactionMs', label: 'Śr. reakcja', direction: 'ascending', source: 'stats', statKey: 'averageReactionMs', valueType: 'ms' },
    ],
  },
  {
    id: 'cps-test',
    title: 'CPS Test',
    description: 'Mechanical speed benchmark.',
    scoreDirection: 'descending',
    scoreName: 'CPS',
    mobileSupport: 'ready',
    tags: ['speed', 'reflex', 'arcade', 'mobile', 'desktop'],
    metrics: [
      { id: 'score', label: 'CPS', direction: 'descending', source: 'score', suffix: 'CPS' },
      { id: 'peakCPS', label: 'Peak', direction: 'descending', source: 'stats', statKey: 'peakCPS', suffix: 'CPS' },
      { id: 'totalClicks', label: 'Clicks', direction: 'descending', source: 'stats', statKey: 'totalClicks' },
      { id: 'consistency', label: 'Consistency', direction: 'descending', source: 'stats', statKey: 'consistency', valueType: 'percent' },
    ],
  },
];

export function getGameConfig(gameId: GameId): GameConfig {
  const game = games.find((item) => item.id === gameId);

  if (!game) {
    throw new Error(`Unknown game id: ${gameId}`);
  }

  return game;
}
