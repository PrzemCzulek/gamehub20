import type { GameId, LeaderboardEntry } from '../types';

type OnlineLeaderboardResponse = {
  entries?: LeaderboardEntry[];
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Online leaderboard request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function submitOnlineScore(scoreEntry: LeaderboardEntry): Promise<LeaderboardEntry | undefined> {
  const response = await fetch('/.netlify/functions/submit-score', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(scoreEntry),
  });
  const data = await readJsonResponse<{ score?: LeaderboardEntry }>(response);
  return data.score;
}

export async function getOnlineLeaderboard(gameId: GameId, metric = 'score', limit = 15): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({
    gameId,
    metric,
    limit: String(limit),
  });
  const response = await fetch(`/.netlify/functions/get-leaderboard?${params.toString()}`);
  const data = await readJsonResponse<OnlineLeaderboardResponse>(response);

  return Array.isArray(data.entries) ? data.entries : [];
}
