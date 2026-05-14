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
      avgSimilarity: { source: 'stats', statKey: 'avgSimilarity', direction: 'descending' },
      averageSimilarity: { source: 'stats', statKey: 'averageSimilarity', direction: 'descending' },
      finalSimilarity: { source: 'stats', statKey: 'finalSimilarity', direction: 'descending' },
      perfectMatches: { source: 'stats', statKey: 'perfectMatches', direction: 'descending' },
      highPrecisionMatches: { source: 'stats', statKey: 'highPrecisionMatches', direction: 'descending' },
      highestRound: { source: 'stats', statKey: 'highestRound', direction: 'descending' },
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
      bestCombo: { source: 'stats', statKey: 'bestCombo', direction: 'descending' },
      combo: { source: 'stats', statKey: 'bestCombo', direction: 'descending' },
      hits: { source: 'stats', statKey: 'hits', direction: 'descending' },
      averageReactionMs: { source: 'stats', statKey: 'averageReactionMs', direction: 'ascending' },
      survivedTime: { source: 'stats', statKey: 'survivedTime', direction: 'descending' },
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
  'time-sense': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      accuracy: { source: 'stats', statKey: 'accuracy', direction: 'descending' },
      deviationMs: { source: 'stats', statKey: 'deviationMs', direction: 'ascending' },
      isPerfect: { source: 'stats', statKey: 'isPerfect', direction: 'descending' },
    },
  },
  'stroop-test': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      accuracy: { source: 'stats', statKey: 'accuracy', direction: 'descending' },
      bestCombo: { source: 'stats', statKey: 'bestCombo', direction: 'descending' },
      averageReactionMs: { source: 'stats', statKey: 'averageReactionMs', direction: 'ascending' },
    },
  },
  'cps-test': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      peakCPS: { source: 'stats', statKey: 'peakCPS', direction: 'descending' },
      totalClicks: { source: 'stats', statKey: 'totalClicks', direction: 'descending' },
      consistency: { source: 'stats', statKey: 'consistency', direction: 'descending' },
    },
  },
  'flappy-ball': {
    scoreDirection: 'descending',
    metrics: {
      score: { source: 'score', direction: 'descending' },
      survivedTimeSeconds: { source: 'stats', statKey: 'survivedTimeSeconds', direction: 'descending' },
      flaps: { source: 'stats', statKey: 'flaps', direction: 'ascending' },
      efficiency: { source: 'stats', statKey: 'efficiency', direction: 'descending' },
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
