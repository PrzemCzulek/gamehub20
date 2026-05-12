import type { GameId, ScoreStats } from '../types';

export type OnlineProfileHighlight = {
  gameId?: GameId;
  score?: number;
  scoreLabel?: string;
  metricValue?: number;
  stats?: ScoreStats;
  createdAt?: string;
};

export type OnlinePlayerProfile = {
  playerId: string;
  playerName: string;
  level: number;
  xp: number;
  gamesPlayed: number;
  totalScoreEntries: number;
  favoriteGame?: GameId;
  bestGame?: GameId;
  achievementsUnlocked: number;
  achievementsTotal: number;
  highlights: {
    bestReactionTime?: OnlineProfileHighlight;
    bestTypingWpm?: OnlineProfileHighlight;
    bestTypingAccuracy?: OnlineProfileHighlight;
    bestAimAccuracy?: OnlineProfileHighlight;
    bestColorSimilarity?: OnlineProfileHighlight;
    bestWordMemoryScore?: OnlineProfileHighlight;
    bestSymbolMatchMoves?: OnlineProfileHighlight;
    highestMemoryLevel?: OnlineProfileHighlight;
  };
  updatedAt?: string;
};

type OnlineProfileResponse = {
  ok: boolean;
  profile?: OnlinePlayerProfile;
};

const profileCache = new Map<string, Promise<OnlinePlayerProfile | null>>();

export function fetchOnlinePlayerProfile(playerId: string): Promise<OnlinePlayerProfile | null> {
  if (!playerId) {
    return Promise.resolve(null);
  }

  const cached = profileCache.get(playerId);

  if (cached) {
    return cached;
  }

  const request = fetchProfile(playerId);
  profileCache.set(playerId, request);
  return request;
}

async function fetchProfile(playerId: string): Promise<OnlinePlayerProfile | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const params = new URLSearchParams({ playerId });
    const response = await fetch(`/.netlify/functions/get-player-profile?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OnlineProfileResponse;
    return data.ok && data.profile ? data.profile : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
