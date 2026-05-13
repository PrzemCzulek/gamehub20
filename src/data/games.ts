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
      { id: 'bestSimilarity', label: 'Best match', direction: 'descending', source: 'stats', statKey: 'bestSimilarity', valueType: 'percent' },
      { id: 'averageSimilarity', label: 'Średnia', direction: 'descending', source: 'stats', statKey: 'averageSimilarity', valueType: 'percent' },
      { id: 'finalSimilarity', label: 'Ostatnia', direction: 'descending', source: 'stats', statKey: 'finalSimilarity', valueType: 'percent' },
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
];

export function getGameConfig(gameId: GameId): GameConfig {
  const game = games.find((item) => item.id === gameId);

  if (!game) {
    throw new Error(`Unknown game id: ${gameId}`);
  }

  return game;
}
