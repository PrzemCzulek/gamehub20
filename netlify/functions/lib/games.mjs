export const games = {
  'reaction-time': {
    scoreDirection: 'ascending',
    metrics: {
      score: { source: 'score', direction: 'ascending' },
    },
  },
  'memory-test': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
    },
  },
  'color-memory': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      bestSimilarity: { source: 'stats', statKey: 'bestSimilarity', direction: 'descending' },
      averageSimilarity: { source: 'stats', statKey: 'averageSimilarity', direction: 'descending' },
      finalSimilarity: { source: 'stats', statKey: 'finalSimilarity', direction: 'descending' },
    },
  },
  'typing-speed': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      accuracy: { source: 'stats', statKey: 'accuracy', direction: 'descending' },
      rounds: { source: 'stats', statKey: 'rounds', direction: 'descending' },
      correctChars: { source: 'stats', statKey: 'correctChars', direction: 'descending' },
    },
  },
  'symbol-match': {
    scoreDirection: 'ascending',
    metrics: {
      score: { source: 'score', direction: 'ascending' },
      mistakes: { source: 'stats', statKey: 'mistakes', direction: 'ascending' },
      durationMs: { source: 'stats', statKey: 'durationMs', direction: 'ascending' },
    },
  },
  'aim-test': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      accuracy: { source: 'stats', statKey: 'accuracy', direction: 'descending' },
      averageReactionMs: { source: 'stats', statKey: 'averageReactionMs', direction: 'ascending' },
      hits: { source: 'stats', statKey: 'hits', direction: 'descending' },
      misses: { source: 'stats', statKey: 'misses', direction: 'ascending' },
    },
  },
  'word-memory': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      bestCombo: { source: 'stats', statKey: 'bestCombo', direction: 'descending' },
      mistakes: { source: 'stats', statKey: 'mistakes', direction: 'ascending' },
      rounds: { source: 'stats', statKey: 'rounds', direction: 'descending' },
    },
  },
};

export function getGame(gameId) {
  return games[gameId];
}

export function getMetric(gameId, metricId = 'score') {
  const game = getGame(gameId);
  return game?.metrics[metricId] ?? game?.metrics.score;
}
