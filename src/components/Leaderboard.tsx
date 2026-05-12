import { useEffect, useMemo, useState } from 'react';
import { getGameConfig } from '../data/games';
import { playNormalClickSound } from '../services/audio';
import { getOnlineLeaderboard } from '../services/onlineLeaderboard';
import { sortScoresByMetric } from '../services/storage';
import type { GameId, LeaderboardEntry, LeaderboardMetric } from '../types';
import { formatPercent } from '../utils/format';

type LeaderboardProps = {
  gameId: GameId;
  entries: LeaderboardEntry[];
};

type LeaderboardSource = 'local' | 'online';

export function Leaderboard({ gameId, entries }: LeaderboardProps) {
  const [expanded, setExpanded] = useState(false);
  const [metricId, setMetricId] = useState('score');
  const [source, setSource] = useState<LeaderboardSource>('online');
  const [onlineEntries, setOnlineEntries] = useState<LeaderboardEntry[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const game = getGameConfig(gameId);
  const activeMetric = game.metrics.find((metric) => metric.id === metricId) ?? game.metrics[0];
  const limit = expanded ? 15 : 5;
  const sortedEntries = useMemo(() => sortScoresByMetric(entries, gameId, activeMetric.id), [activeMetric.id, entries, gameId]);
  const usingOnline = source === 'online' && !onlineError;
  const displayedEntries = usingOnline ? onlineEntries : sortedEntries;
  const visibleEntries = useMemo(() => displayedEntries.slice(0, limit), [displayedEntries, limit]);
  const totalEntriesLabel = usingOnline ? `${visibleEntries.length}+` : entries.length;
  const canExpand = usingOnline ? visibleEntries.length >= 5 : entries.length > 5;

  useEffect(() => {
    setExpanded(false);
    setMetricId('score');
  }, [gameId]);

  useEffect(() => {
    if (source !== 'online') {
      return;
    }

    let ignore = false;
    setOnlineLoading(true);
    setOnlineError(null);

    getOnlineLeaderboard(gameId, activeMetric.id, limit)
      .then((results) => {
        if (!ignore) {
          setOnlineEntries(results);
        }
      })
      .catch(() => {
        if (!ignore) {
          setOnlineEntries([]);
          setOnlineError('Online leaderboard niedostepny - pokazuje lokalne wyniki.');
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
  }, [activeMetric.id, entries.length, gameId, limit, source]);

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

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Leaderboard</h2>
          <p className="text-sm text-slate-400">
            {activeMetric.direction === 'ascending'
              ? 'Sortowanie rosnace: nizszy wynik jest lepszy.'
              : 'Sortowanie malejace: wyzszy wynik jest lepszy.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pokazuje Top {limit} z {totalEntriesLabel} zapisanych wynikow.
          </p>
        </div>
        {canExpand && (
          <button
            className="w-full rounded-md border border-white/15 px-3 py-2 text-sm text-slate-100 hover:bg-white/10 sm:w-auto"
            onClick={() => {
              playNormalClickSound();
              setExpanded((value) => !value);
            }}
            type="button"
          >
            {expanded ? 'Pokaz mniej' : 'Pokaz wiecej'}
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md border border-white/10 bg-black/20 p-1">
        {(['local', 'online'] as const).map((item) => (
          <button
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              source === item ? 'bg-teal-300 text-slate-950' : 'text-slate-300 hover:bg-white/10'
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

      {onlineError && source === 'online' && (
        <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">{onlineError}</p>
      )}

      {onlineLoading && source === 'online' && !onlineError && (
        <p className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-slate-300">Laduje online leaderboard...</p>
      )}

      {game.metrics.length > 1 && (
        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Metryka rankingu</span>
          <select
            className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            onChange={(event) => {
              playNormalClickSound();
              setMetricId(event.target.value);
              setExpanded(false);
            }}
            value={activeMetric.id}
          >
            {game.metrics.map((metric) => (
              <option className="bg-slate-950" key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-4 space-y-2">
        {visibleEntries.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-400">
            {usingOnline ? 'Brak wynikow online dla tej gry.' : 'Brak wynikow dla tej gry. Zagraj runde, aby dodac pierwszy wpis.'}
          </p>
        ) : (
          visibleEntries.map((entry, index) => (
            <div
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-md bg-black/20 px-3 py-2"
              key={`${entry.createdAt}-${entry.playerName}-${index}`}
            >
              <span className="text-sm font-semibold text-teal-200">#{index + 1}</span>
              <span className="min-w-0 truncate text-sm text-slate-100">{entry.playerName}</span>
              <span className="text-sm font-semibold text-white">{formatMetricValue(entry, activeMetric)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
