import type { GameId, LocalProfile, ScoreStats } from '../types';

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
  equippedCosmetics?: LocalProfile['equippedCosmetics'];
  highlights: {
    bestReactionTime?: OnlineProfileHighlight;
    bestTypingWpm?: OnlineProfileHighlight;
    bestTypingAccuracy?: OnlineProfileHighlight;
    bestAimAccuracy?: OnlineProfileHighlight;
    bestColorSimilarity?: OnlineProfileHighlight;
    bestWordMemoryScore?: OnlineProfileHighlight;
    bestSymbolMatchMoves?: OnlineProfileHighlight;
    highestMemoryLevel?: OnlineProfileHighlight;
    bestTimeSenseScore?: OnlineProfileHighlight;
    bestStroopScore?: OnlineProfileHighlight;
    bestStroopAccuracy?: OnlineProfileHighlight;
    bestStroopStreak?: OnlineProfileHighlight;
    bestCps?: OnlineProfileHighlight;
    peakCps?: OnlineProfileHighlight;
    longestCpsStreak?: OnlineProfileHighlight;
    bestAlternatingCps?: OnlineProfileHighlight;
  };
  updatedAt?: string;
};

type OnlineProfileResponse = {
  ok: boolean;
  profile?: OnlinePlayerProfile;
};

const profileCache = new Map<string, OnlinePlayerProfile | null>();
const pendingProfileRequests = new Map<string, Promise<OnlinePlayerProfile | null>>();

export function fetchOnlinePlayerProfile(playerId: string): Promise<OnlinePlayerProfile | null> {
  if (!playerId) {
    return Promise.resolve(null);
  }

  if (profileCache.has(playerId)) {
    return Promise.resolve(profileCache.get(playerId) ?? null);
  }

  const pending = pendingProfileRequests.get(playerId);
  if (pending) {
    return pending;
  }

  const request = fetchProfile(playerId)
    .then((profile) => {
      profileCache.set(playerId, profile);
      pendingProfileRequests.delete(playerId);
      return profile;
    })
    .catch((error) => {
      pendingProfileRequests.delete(playerId);
      throw error;
    });

  pendingProfileRequests.set(playerId, request);
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

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Profile request failed: ${response.status}`);
    }

    const data = (await response.json()) as OnlineProfileResponse;
    return data.ok && data.profile ? data.profile : null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
