import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getGameConfig } from '../data/games';
import { readStoredTypingDuration, storeTypingDuration, typingDurationOptions } from '../data/typingDurations';
import { buildPlayerProfileSummary, emptyValueLabel } from '../progression/playerProfile';
import { playNormalClickSound } from '../services/audio';
import { getOnlineLeaderboard } from '../services/onlineLeaderboard';
import { fetchOnlinePlayerProfile, type OnlinePlayerProfile } from '../services/onlinePlayerProfile';
import { getPlayerId, getPlayerName, getProfile, sortScoresByMetric } from '../services/storage';
import type { GameId, LeaderboardEntry, LeaderboardMetric, PlayerProfileSummary } from '../types';
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

  if (index === 0) return `border-cyan-300/40 bg-cyan-300/[0.085] shadow-[0_0_26px_rgba(34,211,238,0.18)]${ownClass}`;
  if (index === 1) return `border-slate-200/25 bg-slate-200/[0.055] shadow-[0_0_18px_rgba(226,232,240,0.08)]${ownClass}`;
  if (index === 2) return `border-amber-300/25 bg-amber-300/[0.055] shadow-[0_0_18px_rgba(251,191,36,0.08)]${ownClass}`;
  return `border-white/7 bg-black/20${ownClass}`;
}

function getRankTextClass(index: number): string {
  if (index === 0) return 'text-cyan-100';
  if (index === 1) return 'text-slate-100';
  if (index === 2) return 'text-amber-100';
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
  if (!seconds) return undefined;
  return typingDurationOptions.find((option) => option.value === seconds)?.label ?? `${seconds}s`;
}

function getMetricLabel(gameId: GameId, metric: LeaderboardMetric): string {
  return gameId === 'typing-speed' ? typingMetricLabels[metric.id] ?? metric.label : metric.label;
}

function getGameTitle(gameId?: GameId): string {
  return gameId ? getGameConfig(gameId).title : emptyValueLabel;
}

function getSecondaryInfo(entry: LeaderboardEntry, gameId: GameId, localAttempts?: number): string[] {
  const stats = entry.stats ?? {};
  const info: string[] = [];

  if (gameId === 'typing-speed') {
    if (stats.accuracy !== undefined) info.push(`Celność ${formatPercent(stats.accuracy)}`);
    const duration = formatDuration(getTypingEntryDuration(entry));
    if (duration) info.push(duration);
  }

  if (gameId === 'reaction-time' && localAttempts && localAttempts > 1) info.push(`Próby lokalnie ${localAttempts}`);
  if (gameId === 'aim-test' && stats.accuracy !== undefined) info.push(`Celność ${formatPercent(stats.accuracy)}`);

  if (gameId === 'color-memory') {
    const similarity = stats.bestSimilarity ?? stats.finalSimilarity ?? stats.averageSimilarity;
    if (similarity !== undefined) info.push(`Podobieństwo ${formatPercent(similarity)}`);
  }

  if (gameId === 'symbol-match') {
    if (stats.mistakes !== undefined) info.push(`Pomyłki ${stats.mistakes}`);
    if (stats.durationMs !== undefined) info.push(`${Math.round(stats.durationMs / 1000)}s`);
  }

  if (gameId === 'word-memory') {
    if (stats.bestCombo !== undefined) info.push(`Combo ${stats.bestCombo}`);
    if (stats.mistakes !== undefined) info.push(`Błędy ${stats.mistakes}`);
  }

  return info;
}

function formatMetricValue(entry: LeaderboardEntry, metric: LeaderboardMetric): string {
  if (metric.id === 'score') return entry.scoreLabel;

  const value = metric.source === 'score' ? entry.score : metric.statKey ? entry.stats?.[metric.statKey] : undefined;

  if (value === undefined) return '-';
  if (metric.valueType === 'percent') return formatPercent(value);
  if (metric.valueType === 'ms') return `${Math.round(value)} ms`;
  return `${value}${metric.suffix ? ` ${metric.suffix}` : ''}`;
}

function formatHighlightPercent(value?: number): string | undefined {
  return value !== undefined ? formatPercent(value) : undefined;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
      <span className="block text-slate-500">{label}</span>
      <strong className="block truncate text-white">{value || emptyValueLabel}</strong>
    </div>
  );
}

function MiniHighlight({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-md bg-white/[0.04] px-2 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value ?? emptyValueLabel}</span>
    </div>
  );
}

function ProfilePanel({
  entry,
  gameId,
  metric,
  ownEntry,
  summary,
  onlineProfile,
  onlineLoading,
  onClose,
}: {
  entry: LeaderboardEntry;
  gameId: GameId;
  metric: LeaderboardMetric;
  ownEntry: boolean;
  summary: PlayerProfileSummary;
  onlineProfile?: OnlinePlayerProfile | null;
  onlineLoading?: boolean;
  onClose: () => void;
}) {
  const title = ownEntry ? 'Twój profil' : onlineProfile ? 'Profil publiczny' : 'Mini profil';

  return (
    <div className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-950/90 p-4 shadow-[0_0_28px_rgba(34,211,238,0.10)] backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-cyan-200">Profil gracza</p>
          <h3 className="mt-1 truncate text-base font-black text-white">{title}</h3>
        </div>
        <button
          aria-label="Zamknij profil"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>

      <div className="mt-4">
        {ownEntry ? (
          <OwnProfileContent summary={summary} />
        ) : onlineLoading ? (
          <div className="flex items-center gap-3 rounded-lg border border-cyan-300/15 bg-black/25 px-3 py-4 text-sm text-cyan-100">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
            Ładuję profil gracza
          </div>
        ) : onlineProfile ? (
          <OnlineProfileContent profile={onlineProfile} />
        ) : (
          <FallbackProfileContent entry={entry} gameId={gameId} metric={metric} />
        )}
      </div>
    </div>
  );
}

function OwnProfileContent({ summary }: { summary: PlayerProfileSummary }) {
  const highlights = [
    { label: 'Reaction', value: summary.highlights.bestReactionTime?.scoreLabel },
    { label: 'WPM', value: summary.highlights.bestTypingWpm?.scoreLabel },
    {
      label: 'Aim',
      value: summary.highlights.bestAimAccuracy?.stats?.accuracy !== undefined ? formatPercent(summary.highlights.bestAimAccuracy.stats.accuracy) : undefined,
    },
    {
      label: 'Color',
      value:
        summary.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined
          ? formatPercent(summary.highlights.bestColorSimilarity.stats.bestSimilarity)
          : undefined,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h4 className="min-w-0 truncate text-lg font-black text-white">{summary.displayName}</h4>
        <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2 py-1 text-[0.65rem] font-black text-violet-100">L{summary.level}</span>
      </div>
      <ProfileStatsGrid
        achievementLabel={`${summary.achievementsUnlocked}/${summary.achievementsTotal}`}
        favoriteGame={summary.favoriteGame}
        gamesPlayed={summary.gamesPlayed}
        xp={summary.xp}
      />
      <div className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
        {highlights.map((item) => (
          <MiniHighlight key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}

function OnlineProfileContent({ profile }: { profile: OnlinePlayerProfile }) {
  const highlights = [
    { label: 'Reaction', value: profile.highlights.bestReactionTime?.scoreLabel },
    { label: 'WPM', value: profile.highlights.bestTypingWpm?.scoreLabel },
    { label: 'Aim', value: formatHighlightPercent(profile.highlights.bestAimAccuracy?.metricValue) },
    { label: 'Color', value: formatHighlightPercent(profile.highlights.bestColorSimilarity?.metricValue) },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h4 className="min-w-0 truncate text-lg font-black text-white">{profile.playerName}</h4>
        <span className="rounded-full border border-violet-300/35 bg-violet-300/10 px-2 py-1 text-[0.65rem] font-black text-violet-100">L{profile.level}</span>
      </div>
      <ProfileStatsGrid
        achievementLabel={`${profile.achievementsUnlocked}/${profile.achievementsTotal}`}
        favoriteGame={profile.favoriteGame}
        gamesPlayed={profile.gamesPlayed}
        xp={profile.xp}
      />
      <div className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
        {highlights.map((item) => (
          <MiniHighlight key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </div>
  );
}

function ProfileStatsGrid({ xp, gamesPlayed, favoriteGame, achievementLabel }: { xp: number; gamesPlayed: number; favoriteGame?: GameId; achievementLabel: string }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <MiniStat label="XP" value={String(xp)} />
      <MiniStat label="Gry" value={String(gamesPlayed)} />
      <MiniStat label="Ulubiona" value={favoriteGame ? getGameTitle(favoriteGame) : emptyValueLabel} />
      <MiniStat label="Achievementy" value={achievementLabel} />
    </div>
  );
}

function FallbackProfileContent({ entry, gameId, metric }: { entry: LeaderboardEntry; gameId: GameId; metric: LeaderboardMetric }) {
  return (
    <div>
      <h4 className="truncate text-lg font-black text-white">{entry.playerName}</h4>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm">
        <span className="block text-xs uppercase tracking-wide text-slate-500">Wynik</span>
        <strong className="mt-1 block text-white">{formatMetricValue(entry, metric)}</strong>
        <span className="mt-1 block text-xs text-slate-400">{getGameTitle(gameId)} / {getMetricLabel(gameId, metric)}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-cyan-100">Profil publiczny w przygotowaniu</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">Pełne statystyki będą dostępne po dodaniu profili online.</p>
    </div>
  );
}

function LeaderboardLoadingOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-slate-950/35 opacity-100 backdrop-blur-[2px] transition-opacity duration-200">
      <div className="flex items-center gap-3 rounded-full border border-cyan-300/20 bg-slate-950/85 px-4 py-2 shadow-[0_0_24px_rgba(34,211,238,0.14)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Ładowanie</span>
      </div>
    </div>
  );
}

export function Leaderboard({ gameId, entries }: LeaderboardProps) {
  const [metricId, setMetricId] = useState('score');
  const [source, setSource] = useState<LeaderboardSource>('online');
  const [typingDuration, setTypingDuration] = useState(readStoredTypingDuration);
  const [onlineEntries, setOnlineEntries] = useState<LeaderboardEntry[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [activeProfileKey, setActiveProfileKey] = useState<string | null>(null);
  const [onlineProfiles, setOnlineProfiles] = useState<Record<string, OnlinePlayerProfile | null>>({});
  const [loadingProfiles, setLoadingProfiles] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLElement | null>(null);
  const game = getGameConfig(gameId);
  const currentPlayerId = getPlayerId();
  const currentPlayerName = getPlayerName();
  const profileSummary = useMemo(() => buildPlayerProfileSummary(getProfile()), [entries.length]);
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
  const selectedEntryData = useMemo(() => {
    if (!activeProfileKey) return null;

    const index = visibleEntries.findIndex((entry, entryIndex) => getEntryKey(entry, entryIndex) === activeProfileKey);
    const entry = index >= 0 ? visibleEntries[index] : undefined;

    return entry ? { entry, index } : null;
  }, [activeProfileKey, visibleEntries]);

  useEffect(() => {
    setMetricId('score');
    setActiveProfileKey(null);
  }, [gameId]);

  useEffect(() => {
    if (source !== 'online') return;

    let ignore = false;
    setOnlineLoading(true);
    setOnlineError(null);

    getOnlineLeaderboard(gameId, activeMetric.id, limit, isTypingSpeed ? typingDuration : undefined)
      .then((results) => {
        if (!ignore) setOnlineEntries(results);
      })
      .catch(() => {
        if (!ignore) {
          setOnlineEntries([]);
          setOnlineError('Online leaderboard niedostępny - pokazuję lokalne wyniki.');
        }
      })
      .finally(() => {
        if (!ignore) setOnlineLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [activeMetric.id, entries.length, gameId, isTypingSpeed, source, typingDuration]);

  useEffect(() => {
    const activeEntry = selectedEntryData?.entry;

    if (!activeEntry?.playerId || isOwnEntry(activeEntry) || onlineProfiles[activeEntry.playerId] !== undefined || loadingProfiles[activeEntry.playerId]) {
      return;
    }

    let ignore = false;
    setLoadingProfiles((current) => ({ ...current, [activeEntry.playerId!]: true }));

    fetchOnlinePlayerProfile(activeEntry.playerId).then((profile) => {
      if (ignore) return;
      setOnlineProfiles((current) => ({ ...current, [activeEntry.playerId!]: profile }));
      setLoadingProfiles((current) => ({ ...current, [activeEntry.playerId!]: false }));
    });

    return () => {
      ignore = true;
    };
  }, [selectedEntryData, loadingProfiles, onlineProfiles]);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setActiveProfileKey(null);
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setActiveProfileKey(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  function handleTypingDurationChange(duration: number) {
    playNormalClickSound();
    storeTypingDuration(duration);
    setTypingDuration(duration);
    setActiveProfileKey(null);
  }

  function handleMetricChange(nextMetricId: string) {
    playNormalClickSound();
    setMetricId(nextMetricId);
    setActiveProfileKey(null);
  }

  function isOwnEntry(entry: LeaderboardEntry): boolean {
    return Boolean((entry.playerId && entry.playerId === currentPlayerId) || (!entry.playerId && entry.playerName === currentPlayerName));
  }

  function getEntryKey(entry: LeaderboardEntry, index: number): string {
    return `${entry.createdAt}-${entry.playerName}-${index}`;
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, key: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setActiveProfileKey((current) => (current === key ? null : key));
  }

  return (
    <section ref={panelRef} className="rounded-xl border border-cyan-300/15 bg-white/[0.04] p-4 shadow-[0_0_32px_rgba(34,211,238,0.06)]">
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
                setActiveProfileKey(null);
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

      <div className="relative mt-4 min-h-[13rem]">
        <div className={`max-h-[31rem] space-y-2 overflow-y-auto pr-1 transition duration-200 ${onlineLoading ? 'opacity-45 blur-[1px]' : 'opacity-100 blur-0'}`}>
          {visibleEntries.length === 0 && !onlineLoading ? (
            <p className="rounded-md border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
              {usingOnline ? 'Brak wyników online dla tej gry.' : 'Brak wyników dla tej gry. Zagraj rundę, aby dodać pierwszy wpis.'}
            </p>
          ) : (
            visibleEntries.map((entry, index) => {
              const ownEntry = isOwnEntry(entry);
              const attemptsKey = entry.playerId ?? entry.playerName;
              const secondaryInfo = getSecondaryInfo(entry, gameId, source === 'local' ? localAttemptsByPlayer[attemptsKey] : undefined);
              const entryKey = getEntryKey(entry, index);
              const selected = activeProfileKey === entryKey;

              return (
                <div
                  aria-expanded={selected}
                  className={`group relative overflow-hidden rounded-xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06] hover:shadow-[0_0_22px_rgba(34,211,238,0.12)] focus:outline-none focus-visible:border-cyan-300/45 focus-visible:ring-1 focus-visible:ring-cyan-300/40 ${getRankClass(index, ownEntry)}`}
                  key={entryKey}
                  onClick={() => setActiveProfileKey((current) => (current === entryKey ? null : entryKey))}
                  onKeyDown={(event) => handleRowKeyDown(event, entryKey)}
                  role="button"
                  tabIndex={0}
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

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 backdrop-blur-[1px] transition duration-150 group-hover:opacity-100 group-focus:opacity-100">
                    <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]">
                      Pokaż profil
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {onlineLoading && <LeaderboardLoadingOverlay />}
      </div>

      {selectedEntryData && (
        <ProfilePanel
          entry={selectedEntryData.entry}
          gameId={gameId}
          metric={activeMetric}
          onClose={() => setActiveProfileKey(null)}
          onlineLoading={selectedEntryData.entry.playerId ? loadingProfiles[selectedEntryData.entry.playerId] : false}
          onlineProfile={selectedEntryData.entry.playerId ? onlineProfiles[selectedEntryData.entry.playerId] : null}
          ownEntry={isOwnEntry(selectedEntryData.entry)}
          summary={profileSummary}
        />
      )}
    </section>
  );
}