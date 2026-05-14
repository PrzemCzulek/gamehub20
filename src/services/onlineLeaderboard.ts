import type { GameId, LeaderboardEntry } from '../types';

type OnlineLeaderboardResponse = {
  entries?: LeaderboardEntry[];
};

type SubmitScoreResponse = {
  ok?: boolean;
  updated?: boolean;
  reason?: string;
  mode?: string;
  entry?: LeaderboardEntry;
  score?: LeaderboardEntry;
  error?: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorBody: unknown = errorText;

    try {
      errorBody = JSON.parse(errorText);
    } catch {
      errorBody = errorText;
    }

    console.error('Online leaderboard error body', errorBody);
    throw new Error(`Online leaderboard request failed: ${response.status} ${JSON.stringify(errorBody)}`);
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
  const data = await readJsonResponse<SubmitScoreResponse>(response);

  if (import.meta.env.DEV) {
    console.debug('Online score submit response', data);
  }

  return data.score ?? data.entry;
}

export async function getOnlineLeaderboard(
  gameId: GameId,
  metric = 'score',
  limit = 15,
  durationSeconds?: number,
  inputMode?: string,
): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({
    gameId,
    metric,
    limit: String(limit),
  });

  if (durationSeconds !== undefined) {
    params.set('durationSeconds', String(durationSeconds));
  }

  if (inputMode) {
    params.set('inputMode', inputMode);
  }

  const response = await fetch(`/.netlify/functions/get-leaderboard?${params.toString()}`);
  const data = await readJsonResponse<OnlineLeaderboardResponse>(response);

  return Array.isArray(data.entries) ? data.entries : [];
}
