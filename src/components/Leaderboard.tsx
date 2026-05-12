import { useEffect, useMemo, useState } from 'react';
import { getGameConfig } from '../data/games';
import { readStoredTypingDuration, storeTypingDuration, typingDurationOptions } from '../data/typingDurations';
import { playNormalClickSound } from '../services/audio';
import { getOnlineLeaderboard } from '../services/onlineLeaderboard';
import { getPlayerId, getPlayerName, sortScoresByMetric } from '../services/storage';
import type { GameId, LeaderboardEntry, LeaderboardMetric } from '../types';
import { formatPercent } from '../utils/format';

type LeaderboardProps = {
  gameId: GameId;
  entries: LeaderboardEntry[];
};

type LeaderboardSource = 'local' | 'online';

const typingMetricLabels: Record<string, string> = {
  score: 'WPM',
  accuracy: 'Celność',
  rounds: 'Zdania',
  correctChars: 'Poprawne znaki',
};

function getRankClass(index: number, isOwnEntry: boolean): string {
  const ownClass = isOwnEntry ? ' ring-1 ring-cyan-300/45 shadow-[0_0_24px_rgba(34,211,238,0.16)]' : '';

  if (index === 0) {
    return `border-cyan-300/40 bg-cyan-300/[0.085] shadow-[0_0_26px_rgba(34,211,238,0.18)]${ownClass}`;
  }

  if (index === 1) {
    return `border-slate-200/25 bg-slate-200/[0.055] shadow-[0_0_18px_rgba(226,232,240,0.08)]${ownClass}`;
  }

  if (index === 2) {
    return `border-amber-300/25 bg-amber-300/[0.055] shadow-[0_0_18px_rgba(251,191,36,0.08)]${ownClass}`;
  }

  return `border-white/7 bg-black/20${ownClass}`;
}

function getRankTextClass(index: number): string {
  if (index === 0) {
    return 'text-cyan-100';
  }

  if (index === 1) {
    return 'text-slate-100';
  }

  if (index === 2) {
    return 'text-amber-100';
  }

  return 'text-teal-200';
}

function getTypingEntryDuration(entry: LeaderboardEntry): number | undefined {
  return (
    entry.stats?.selectedDuration ??
    entry.stats?.durationSeconds ??
    (entry.stats?.durationMs !== undefined ? Math.round(entry.stats.durationMs / 1000) : undefined) ??
    (entry.runDurationMs !== undefined ? Math.round(entry.runDurationMs / 1000) : undefined)
  );
}

function formatDuration(seconds?: number): string | undefined {
  if (!seconds) {
    return undefined;
  }

  return typingDurationOptions.find((option) => option.value === seconds)?.label ?? `${seconds}s`;
}

function getMetricLabel(gameId: GameId, metric: LeaderboardMetric): string {
  return gameId === 'typing-speed' ? typingMetricLabels[metric.id] ?? metric.label : metric.label;
}

function getSecondaryInfo(entry: LeaderboardEntry, gameId: GameId, localAttempts?: number): string[] {
  const stats = entry.stats ?? {};
  const info: string[] = [];

  if (gameId === 'typing-speed') {
    if (stats.accuracy !== undefined) {
      info.push(`Celność ${formatPercent(stats.accuracy)}`);
    }

    const duration = formatDuration(getTypingEntryDuration(entry));
    if (duration) {
      info.push(duration);
    }
  }

  if (gameId === 'reaction-time' && localAttempts && localAttempts > 1) {
    info.push(`Próby lokalnie ${localAttempts}`);
  }

  if (gameId === 'aim-test' && stats.accuracy !== undefined) {
    info.push(`Celność ${formatPercent(stats.accuracy)}`);
  }

  if (gameId === 'color-memory') {
    const similarity = stats.bestSimilarity ?? stats.finalSimilarity ?? stats.averageSimilarity;
    if (similarity !== undefined) {
      info.push(`Podobieństwo ${formatPercent(similarity)}`);
    }
  }

  if (gameId === 'symbol-match') {
    if (stats.mistakes !== undefined) {
      info.push(`Pomyłki ${stats.mistakes}`);
    }

    if (stats.durationMs !== undefined) {
      info.push(`${Math.round(stats.durationMs / 1000)}s`);
    }
  }

  if (gameId === 'word-memory') {
    if (stats.bestCombo !== undefined) {
      info.push(`Combo ${stats.bestCombo}`);
    }

    if (stats.mistakes !== undefined) {
      info.push(`Błędy ${stats.mistakes}`);
    }
  }

  return info;
}

export function Leaderboard({ gameId, entries }: LeaderboardProps) {
  const [metricId, setMetricId] = useState('score');
  const [source, setSource] = useState<LeaderboardSource>('online');
  const [typingDuration, setTypingDuration] = useState(readStoredTypingDuration);
  const [onlineEntries, setOnlineEntries] = useState<LeaderboardEntry[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const game = getGameConfig(gameId);
  const currentPlayerId = getPlayerId();
  const currentPlayerName = getPlayerName();
  const isTypingSpeed = gameId === 'typing-speed';
  const activeMetric = game.metrics.find((metric) => metric.id === metricId) ?? game.metrics[0];
  const limit = 10;
  const filteredEntries = useMemo(
    () => (isTypingSpeed ? entries.filter((entry) => getTypingEntryDuration(entry) === typingDuration) : entries),
    [entries, isTypingSpeed, typingDuration],
  );
  const localAttemptsByPlayer = useMemo(() => {
    return filteredEntries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.playerId ?? entry.playerName;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [filteredEntries]);
  const sortedEntries = useMemo(
    () => sortScoresByMetric(filteredEntries, gameId, activeMetric.id),
    [activeMetric.id, filteredEntries, gameId],
  );
  const usingOnline = source === 'online' && !onlineError;
  const displayedEntries = usingOnline ? onlineEntries : sortedEntries;
  const visibleEntries = useMemo(() => displayedEntries.slice(0, limit), [displayedEntries]);
  const totalEntriesLabel = usingOnline ? `${visibleEntries.length}+` : filteredEntries.length;

  useEffect(() => {
    setMetricId('score');
  }, [gameId]);

  useEffect(() => {
    if (source !== 'online') {
      return;
    }

    let ignore = false;
    setOnlineLoading(true);
    setOnlineError(null);

    getOnlineLeaderboard(gameId, activeMetric.id, limit, isTypingSpeed ? typingDuration : undefined)
      .then((results) => {
        if (!ignore) {
          setOnlineEntries(results);
        }
      })
      .catch(() => {
        if (!ignore) {
          setOnlineEntries([]);
          setOnlineError('Online leaderboard niedostępny - pokazuję lokalne wyniki.');
        }
      })
      .finally(() => {
        if (!ignore) {
          setOnlineLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeMetric.id, entries.length, gameId, isTypingSpeed, source, typingDuration]);

  function getMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric): number | undefined {
    return metric.source === 'score' ? entry.score : metric.statKey ? entry.stats?.[metric.statKey] : undefined;
  }

  function formatMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
    if (metric.id === 'score') {
      return entry.scoreLabel;
    }

    const value = getMetricValue(entry, metric);

    if (value === undefined) {
      return '-';
    }

    if (metric.valueType === 'percent') {
      return formatPercent(value);
    }

    if (metric.valueType === 'ms') {
      return `${Math.round(value)} ms`;
    }

    return `${value}${metric.suffix ? ` ${metric.suffix}` : ''}`;
  }

  function handleTypingDurationChange(duration: number) {
    playNormalClickSound();
    storeTypingDuration(duration);
    setTypingDuration(duration);
  }

  function handleMetricChange(nextMetricId: string) {
    playNormalClickSound();
    setMetricId(nextMetricId);
  }

  function isOwnEntry(entry: LeaderboardEntry): boolean {
    return Boolean((entry.playerId && entry.playerId === currentPlayerId) || (!entry.playerId && entry.playerName === currentPlayerName));
  }

  return (
    <section className="rounded-xl border border-cyan-300/15 bg-white/[0.04] p-4 shadow-[0_0_32px_rgba(34,211,238,0.06)]">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-cyan-200">Leaderboard</p>
          <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-white">Ranking</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {activeMetric.direction === 'ascending' ? 'Niższy wynik jest lepszy.' : 'Wyższy wynik jest lepszy.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Top {limit} z {totalEntriesLabel} wyników.</p>
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-black/25 p-1">
          {(['local', 'online'] as const).map((item) => (
            <button
              aria-pressed={source === item}
              className={`rounded-md px-3 py-2 text-sm font-bold transition duration-200 ${
                source === item
                  ? 'bg-teal-300 text-slate-950 shadow-[0_0_18px_rgba(45,212,191,0.22)]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              key={item}
              onClick={() => {
                playNormalClickSound();
                setSource(item);
              }}
              type="button"
            >
              {item === 'local' ? 'Lokalny' : 'Online'}
            </button>
          ))}
        </div>
      </div>

      {isTypingSpeed && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Czas testu</p>
          <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
            {typingDurationOptions.map((duration) => (
              <button
                aria-pressed={typingDuration === duration.value}
                className={`min-w-14 flex-1 rounded-md px-2 py-2 text-xs font-black transition duration-200 hover:scale-[1.02] ${
                  typingDuration === duration.value
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={duration.value}
                onClick={() => handleTypingDurationChange(duration.value)}
                type="button"
              >
                {duration.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {onlineError && source === 'online' && (
        <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{onlineError}</p>
      )}

      {onlineLoading && source === 'online' && !onlineError && (
        <p className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-300">Ładuję online leaderboard...</p>
      )}

      {game.metrics.length > 1 && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Metryka</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {game.metrics.map((metric) => (
              <button
                aria-pressed={activeMetric.id === metric.id}
                className={`rounded-full border px-3 py-2 text-xs font-black transition duration-200 hover:-translate-y-0.5 ${
                  activeMetric.id === metric.id
                    ? 'border-cyan-300/60 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.24)]'
                    : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white'
                }`}
                key={metric.id}
                onClick={() => handleMetricChange(metric.id)}
                type="button"
              >
                {getMetricLabel(gameId, metric)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 max-h-[31rem] space-y-2 overflow-y-auto pr-1">
        {visibleEntries.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
            {usingOnline ? 'Brak wyników online dla tej gry.' : 'Brak wyników dla tej gry. Zagraj rundę, aby dodać pierwszy wpis.'}
          </p>
        ) : (
          visibleEntries.map((entry, index) => {
            const ownEntry = isOwnEntry(entry);
            const attemptsKey = entry.playerId ?? entry.playerName;
            const secondaryInfo = getSecondaryInfo(entry, gameId, source === 'local' ? localAttemptsByPlayer[attemptsKey] : undefined);

            return (
              <div
                className={`group rounded-xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06] hover:shadow-[0_0_22px_rgba(34,211,238,0.12)] ${getRankClass(index, ownEntry)}`}
                key={`${entry.createdAt}-${entry.playerName}-${index}`}
              >
                <div className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3">
                  <span className={`text-sm font-black ${getRankTextClass(index)}`}>#{index + 1}</span>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-bold leading-5 text-slate-100">{entry.playerName}</span>
                      {ownEntry && (
                        <span className="shrink-0 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-cyan-100">
                          Ty
                        </span>
                      )}
                    </div>
                    {secondaryInfo.length > 0 && (
                      <p className="mt-1 truncate text-[0.7rem] font-medium leading-4 text-slate-400">{secondaryInfo.join(' • ')}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-black leading-5 text-white sm:text-base">{formatMetricValue(entry, activeMetric)}</span>
                    <span className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">{getMetricLabel(gameId, activeMetric)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}