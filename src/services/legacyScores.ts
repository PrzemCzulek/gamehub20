type LegacyScoreResponse = {
  ok: boolean;
  count?: number;
  updated?: number;
  total?: number;
  skippedConflicts?: number;
  error?: string;
  details?: string[];
};

async function requestLegacyClaim(playerId: string, username: string, dryRun: boolean): Promise<LegacyScoreResponse> {
  const response = await fetch('/.netlify/functions/claim-legacy-scores', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId, username, dryRun }),
  });

  const data = (await response.json().catch(() => ({ ok: false, error: 'Invalid response' }))) as LegacyScoreResponse;

  if (!response.ok || !data.ok) {
    throw new Error(data.details?.[0] ?? data.error ?? 'Legacy score request failed');
  }

  return data;
}

export async function fetchLegacyScoreCount(username: string, playerId: string): Promise<number> {
  const data = await requestLegacyClaim(playerId, username, true);
  return data.count ?? 0;
}

export async function claimLegacyScores(playerId: string, username: string): Promise<{ updated: number; skippedConflicts: number; total: number }> {
  const data = await requestLegacyClaim(playerId, username, false);

  return {
    updated: data.updated ?? 0,
    skippedConflicts: data.skippedConflicts ?? 0,
    total: data.total ?? data.updated ?? 0,
  };
}
