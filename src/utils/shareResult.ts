import { getGameConfig } from '../data/games';
import type { GameId } from '../types';

export type ShareResultPayload = {
  gameId: GameId;
  scoreLabel: string;
  metricLabel?: string;
  modeLabel?: string;
  url?: string;
};

export type ShareResultOutcome =
  | { ok: true; method: 'native' | 'clipboard'; text: string }
  | { ok: false; method: 'manual'; text: string; error?: unknown };

function getSiteUrl(url?: string): string {
  if (url) return url;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://gamehub20.netlify.app/';
}

export function buildShareText(payload: ShareResultPayload): string {
  const game = getGameConfig(payload.gameId);
  const mode = payload.modeLabel ? ` (${payload.modeLabel})` : '';
  const metric = payload.metricLabel ?? game.scoreName;
  const url = getSiteUrl(payload.url);

  if (payload.gameId === 'reaction-time') {
    return `Pobij moje ${payload.scoreLabel} w ${game.title}${mode} na Game Hub 2.0. ${url}`;
  }

  if (payload.gameId === 'cps-test') {
    return `Wbij więcej niż ${payload.scoreLabel} w ${game.title}${mode} na Game Hub 2.0. ${url}`;
  }

  return `Nie możesz pobić mojego wyniku ${payload.scoreLabel} (${metric}) w ${game.title}${mode} na Game Hub 2.0? ${url}`;
}

export async function shareResult(payload: ShareResultPayload): Promise<ShareResultOutcome> {
  const text = buildShareText(payload);
  const title = 'Game Hub 2.0';
  const url = getSiteUrl(payload.url);

  try {
    if (typeof navigator !== 'undefined' && 'share' in navigator && typeof navigator.share === 'function') {
      await navigator.share({ title, text, url });
      return { ok: true, method: 'native', text };
    }
  } catch (error) {
    if ((error as Error | undefined)?.name === 'AbortError') {
      return { ok: true, method: 'native', text };
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: 'clipboard', text };
    }
  } catch (error) {
    return { ok: false, method: 'manual', text, error };
  }

  return { ok: false, method: 'manual', text };
}

