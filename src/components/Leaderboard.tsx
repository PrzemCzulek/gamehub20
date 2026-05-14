import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { getGameConfig } from '../data/games';
import { aimModeChangedEvent, aimModeOptions, readStoredAimMode, storeAimMode } from '../data/aimModes';
import {
  type CpsInputMode,
  cpsDurationOptions,
  cpsInputModeOptions,
  cpsSettingsChangedEvent,
  readStoredCpsSettings,
  storeCpsSettings,
} from '../data/cpsModes';
import { getCosmetic } from '../data/cosmetics';
import { readStoredStroopDuration, storeStroopDuration, stroopDurationChangedEvent, stroopDurationOptions } from '../data/stroopDurations';
import { readStoredTimeSenseDuration, storeTimeSenseDuration, timeSenseDurationChangedEvent, timeSenseDurationOptions } from '../data/timeSenseDurations';
import { readStoredTypingDuration, storeTypingDuration, typingDurationOptions } from '../data/typingDurations';
import { buildPlayerProfileSummary, emptyValueLabel } from '../progression/playerProfile';
import { getEquippedCosmetics } from '../progression/rewardHelpers';
import { playNormalClickSound } from '../services/audio';
import { getOnlineLeaderboard } from '../services/onlineLeaderboard';
import { fetchOnlinePlayerProfile, type OnlinePlayerProfile } from '../services/onlinePlayerProfile';
import { getPlayerId, getPlayerName, getProfile, sortScoresByMetric } from '../services/storage';
import type { DeviceType, GameId, LeaderboardEntry, LeaderboardMetric, PlayerProfileSummary } from '../types';
import { formatPercent } from '../utils/format';

type LeaderboardProps = {
  gameId: GameId;
  entries: LeaderboardEntry[];
};

const timeSenseMetricLabels: Record<string, string> = {
  score: 'Wynik',
  accuracy: 'Dokładność',
  deviationMs: 'Różnica',
  isPerfect: 'Perfect',
};

const stroopMetricLabels: Record<string, string> = {
  score: 'Punkty',
  accuracy: 'Dokładność',
  bestCombo: 'Streak',
  averageReactionMs: 'Śr. reakcja',
};

const cpsMetricLabels: Record<string, string> = {
  score: 'CPS',
  peakCPS: 'Peak',
  totalClicks: 'Clicks',
  consistency: 'Consistency',
};

function getDeviceLabel(device?: DeviceType): string | undefined {
  if (device === 'mobile') return 'Mobile';
  if (device === 'tablet') return 'Tablet';
  if (device === 'desktop') return 'Desktop';
  return undefined;
}

function DeviceGlyph({ device }: { device: DeviceType }) {
  if (device === 'desktop') {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
        <path d="M2.5 3.5h11v7h-11v-7Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 13h4M8 10.5V13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </svg>
    );
  }

  if (device === 'tablet') {
    return (
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
        <rect height="11" rx="1.6" stroke="currentColor" strokeWidth="1.4" width="8.5" x="3.75" y="2.5" />
        <path d="M7.4 11.4h1.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
      <rect height="12" rx="1.7" stroke="currentColor" strokeWidth="1.4" width="6.8" x="4.6" y="2" />
      <path d="M7.45 11.6h1.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

function DeviceOriginBadge({ device, compact = false }: { device?: DeviceType; compact?: boolean }) {
  const label = getDeviceLabel(device);

  if (!device || !label) {
    return null;
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-300/8 font-black uppercase text-cyan-100/85 ${
        compact ? 'h-5 px-1.5 text-[0.52rem]' : 'px-2 py-0.5 text-[0.58rem] tracking-wide'
      }`}
      title={`Device: ${label}`}
    >
      <DeviceGlyph device={device} />
      {!compact && <span>{label}</span>}
    </span>
  );
}

const aimMetricLabels: Record<string, string> = {
  score: 'Punkty',
  accuracy: 'Celność',
  bestCombo: 'Combo',
  hits: 'Trafienia',
  averageReactionMs: 'Śr. czas',
  survivedTime: 'Czas',
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

function getEntryDuration(entry: LeaderboardEntry): number | undefined {
  return (
    entry.stats?.selectedDuration ??
    entry.stats?.durationSeconds ??
    (entry.stats?.targetMs !== undefined ? Math.round(entry.stats.targetMs / 1000) : undefined) ??
    (entry.stats?.durationMs !== undefined ? Math.round(entry.stats.durationMs / 1000) : undefined) ??
    (entry.runDurationMs !== undefined ? Math.round(entry.runDurationMs / 1000) : undefined)
  );
}

function formatDuration(seconds?: number, gameId?: GameId): string | undefined {
  if (!seconds) return undefined;
  const options =
    gameId === 'time-sense'
      ? timeSenseDurationOptions
      : gameId === 'stroop-test'
        ? stroopDurationOptions
        : gameId === 'cps-test'
          ? cpsDurationOptions
          : typingDurationOptions;
  return options.find((option) => option.value === seconds)?.label ?? `${seconds}s`;
}

function getMetricLabel(gameId: GameId, metric: LeaderboardMetric): string {
  if (gameId === 'typing-speed') return typingMetricLabels[metric.id] ?? metric.label;
  if (gameId === 'time-sense') return timeSenseMetricLabels[metric.id] ?? metric.label;
  if (gameId === 'stroop-test') return stroopMetricLabels[metric.id] ?? metric.label;
  if (gameId === 'cps-test') return cpsMetricLabels[metric.id] ?? metric.label;
  if (gameId === 'aim-test') return aimMetricLabels[metric.id] ?? metric.label;
  return metric.label;
}

function getGameTitle(gameId?: GameId): string {
  return gameId ? getGameConfig(gameId).title : emptyValueLabel;
}

function getSecondaryInfo(entry: LeaderboardEntry, gameId: GameId, localAttempts?: number): string[] {
  const stats = entry.stats ?? {};
  const info: string[] = [];

  if (gameId === 'typing-speed') {
    if (stats.accuracy !== undefined) info.push(`Dokładność ${formatPercent(stats.accuracy)}`);
    const duration = formatDuration(getEntryDuration(entry), gameId);
    if (duration) info.push(duration);
  }

  if (gameId === 'time-sense') {
    if (stats.deviationMs !== undefined) info.push(`Różnica ${(stats.deviationMs / 1000).toFixed(2)}s`);
    const duration = formatDuration(getEntryDuration(entry), gameId);
    if (duration) info.push(duration);
  }

  if (gameId === 'stroop-test') {
    if (stats.accuracy !== undefined) info.push(`Dokładność ${formatPercent(stats.accuracy)}`);
    if (stats.bestCombo !== undefined) info.push(`Streak ${stats.bestCombo}`);
    const duration = formatDuration(getEntryDuration(entry), gameId);
    if (duration) info.push(duration);
  }

  if (gameId === 'cps-test') {
    if (stats.peakCPS !== undefined) info.push(`Peak ${stats.peakCPS} CPS`);
    if (stats.inputMode !== undefined) info.push(String(stats.inputMode));
    const duration = formatDuration(getEntryDuration(entry), gameId);
    if (duration) info.push(duration);
  }
  if (gameId === 'flappy-ball') {
    if (stats.survivedTimeSeconds !== undefined) info.push(`${stats.survivedTimeSeconds}s`);
    if (stats.flaps !== undefined) info.push(`${stats.flaps} flaps`);
  }

  if (gameId === 'reaction-time' && localAttempts && localAttempts > 1) info.push(`Próby lokalnie ${localAttempts}`);
  if (gameId === 'aim-test' && stats.accuracy !== undefined) info.push(`Celność ${formatPercent(stats.accuracy)}`);
  if (gameId === 'aim-test' && stats.bestCombo !== undefined) info.push(`Combo ${stats.bestCombo}`);
  if (gameId === 'aim-test' && stats.mode === 'infinity') {
    if (stats.hpRecovered !== undefined) info.push(`HP +${stats.hpRecovered}`);
    if (stats.survivedTime !== undefined) info.push(`${stats.survivedTime}s`);
  }

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
  if (metric.id === 'isPerfect') return Number(value) > 0 ? 'Perfect' : '-';
  if (typeof value !== 'number') return String(value);
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
  profileError,
  onlineLoading,
  onClose,
}: {
  entry: LeaderboardEntry;
  gameId: GameId;
  metric: LeaderboardMetric;
  ownEntry: boolean;
  summary: PlayerProfileSummary;
  onlineProfile?: OnlinePlayerProfile | null;
  profileError?: string;
  onlineLoading?: boolean;
  onClose: () => void;
}) {
  const title = ownEntry ? 'Twój profil' : onlineProfile ? 'Profil publiczny' : 'Mini profil';
  const ownFrame = ownEntry ? getCosmetic(getEquippedCosmetics().frame, 'frame') : undefined;
  const publicFrame = !ownEntry && onlineProfile?.equippedCosmetics ? getCosmetic(onlineProfile.equippedCosmetics.frame, 'frame') : undefined;

  return (
    <div className={`mt-3 rounded-xl border border-cyan-300/20 bg-slate-950/90 p-4 shadow-[0_0_28px_rgba(34,211,238,0.10)] backdrop-blur ${ownFrame?.className ?? publicFrame?.className ?? ''}`}>
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
          Close
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
          <FallbackProfileContent entry={entry} gameId={gameId} metric={metric} profileError={profileError} />
        )}
      </div>
    </div>
  );
}

function OwnProfileContent({ summary }: { summary: PlayerProfileSummary }) {
  const equippedCosmetics = getEquippedCosmetics();
  const equippedTitle = getCosmetic(equippedCosmetics.title, 'title');
  const equippedBadge = getCosmetic(equippedCosmetics.badge, 'badge');
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
        <div className="min-w-0">
          <h4 className="min-w-0 truncate text-lg font-black text-white">{summary.displayName}</h4>
          {(equippedTitle || equippedBadge || summary.lastSeenDevice || summary.createdOnDevice) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              {equippedTitle && <p className="min-w-0 max-w-[10rem] truncate text-[0.65rem] font-bold uppercase tracking-wide text-violet-100">{equippedTitle.label}</p>}
              {equippedBadge && (
                <span className={`max-w-[8rem] shrink truncate rounded-full border px-2 py-0.5 text-[0.56rem] font-black uppercase ${equippedBadge.className ?? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'}`}>
                  {equippedBadge.label}
                </span>
              )}
              <DeviceOriginBadge device={summary.lastSeenDevice ?? summary.createdOnDevice} />
            </div>
          )}
        </div>
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
  const equippedTitle = getCosmetic(profile.equippedCosmetics?.title, 'title');
  const equippedBadge = getCosmetic(profile.equippedCosmetics?.badge, 'badge');
  const equippedFrame = getCosmetic(profile.equippedCosmetics?.frame, 'frame');
  const highlights = [
    { label: 'Reaction', value: profile.highlights.bestReactionTime?.scoreLabel },
    { label: 'WPM', value: profile.highlights.bestTypingWpm?.scoreLabel },
    { label: 'Aim', value: formatHighlightPercent(profile.highlights.bestAimAccuracy?.metricValue) },
    { label: 'Color', value: formatHighlightPercent(profile.highlights.bestColorSimilarity?.metricValue) },
  ];

  return (
    <div className={equippedFrame?.className ?? ''}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h4 className="min-w-0 truncate text-lg font-black text-white">{profile.playerName}</h4>
          {(equippedTitle || equippedBadge || profile.lastSeenDevice || profile.createdOnDevice) && (
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
              {equippedTitle && <span className="min-w-0 max-w-[10rem] truncate text-[0.65rem] font-bold uppercase tracking-wide text-violet-100">{equippedTitle.label}</span>}
              {equippedBadge && (
                <span className={`max-w-[8rem] shrink truncate rounded-full border px-2 py-0.5 text-[0.56rem] font-black uppercase ${equippedBadge.className ?? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'}`}>
                  {equippedBadge.label}
                </span>
              )}
              <DeviceOriginBadge device={profile.lastSeenDevice ?? profile.createdOnDevice} />
            </div>
          )}
        </div>
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

function FallbackProfileContent({ entry, gameId, metric, profileError }: { entry: LeaderboardEntry; gameId: GameId; metric: LeaderboardMetric; profileError?: string }) {
  return (
    <div>
      <h4 className="truncate text-lg font-black text-white">{entry.playerName}</h4>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm">
        <span className="block text-xs uppercase tracking-wide text-slate-500">Wynik</span>
        <strong className="mt-1 block text-white">{formatMetricValue(entry, metric)}</strong>
        <span className="mt-1 block text-xs text-slate-400">{getGameTitle(gameId)} / {getMetricLabel(gameId, metric)}</span>
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
        <p className="text-sm font-semibold text-cyan-100">{profileError ?? 'Profil publiczny niedostępny'}</p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {profileError ? 'Spróbuj ponownie później.' : 'Dane pojawią się po kolejnym wyniku online.'}
        </p>
      </div>
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
  const [timeSenseDuration, setTimeSenseDuration] = useState(readStoredTimeSenseDuration);
  const [stroopDuration, setStroopDuration] = useState(readStoredStroopDuration);
  const [cpsSettings, setCpsSettings] = useState(readStoredCpsSettings);
  const [aimMode, setAimMode] = useState(readStoredAimMode);
  const [onlineEntries, setOnlineEntries] = useState<LeaderboardEntry[]>([]);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [activeProfileKey, setActiveProfileKey] = useState<string | null>(null);
  const [onlineProfiles, setOnlineProfiles] = useState<Record<string, OnlinePlayerProfile | null>>({});
  const [loadingProfiles, setLoadingProfiles] = useState<Record<string, boolean>>({});
  const [profileErrors, setProfileErrors] = useState<Record<string, string | undefined>>({});
  const panelRef = useRef<HTMLElement | null>(null);
  const game = getGameConfig(gameId);
  const currentPlayerId = getPlayerId();
  const currentPlayerName = getPlayerName();
  const equippedCosmetics = getEquippedCosmetics();
  const equippedTitle = getCosmetic(equippedCosmetics.title, 'title');
  const equippedBadge = getCosmetic(equippedCosmetics.badge, 'badge');
  const equippedFrame = getCosmetic(equippedCosmetics.frame, 'frame');
  const profileSummary = useMemo(() => buildPlayerProfileSummary(getProfile()), [entries.length]);
  const isTypingSpeed = gameId === 'typing-speed';
  const isTimeSense = gameId === 'time-sense';
  const isStroop = gameId === 'stroop-test';
  const isCps = gameId === 'cps-test';
  const isAim = gameId === 'aim-test';
  const hasDurationFilter = isTypingSpeed || isTimeSense || isStroop || isCps;
  const activeDuration = isCps ? cpsSettings.durationSeconds : isStroop ? stroopDuration : isTimeSense ? timeSenseDuration : typingDuration;
  const durationOptions = isCps ? cpsDurationOptions : isStroop ? stroopDurationOptions : isTimeSense ? timeSenseDurationOptions : typingDurationOptions;
  const visibleMetrics = isAim
    ? game.metrics.filter((metric) =>
        aimMode === 'infinity'
          ? ['score', 'accuracy', 'bestCombo', 'averageReactionMs', 'survivedTime'].includes(metric.id)
          : ['score', 'accuracy', 'bestCombo', 'hits'].includes(metric.id),
      )
    : game.metrics;
  const activeMetric = visibleMetrics.find((metric) => metric.id === metricId) ?? visibleMetrics[0] ?? game.metrics[0];
  const limit = 10;
  const filteredEntries = useMemo(
    () =>
      hasDurationFilter
        ? entries.filter((entry) => {
            const durationMatches = getEntryDuration(entry) === activeDuration;
            const modeMatches = !isCps || (entry.stats?.inputMode ?? 'normal') === cpsSettings.inputMode;
            return durationMatches && modeMatches;
          })
        : isAim
          ? entries.filter((entry) => (entry.stats?.mode ?? '30s') === aimMode)
        : entries,
    [activeDuration, aimMode, cpsSettings.inputMode, entries, hasDurationFilter, isAim, isCps],
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
    if (!isTimeSense) return;

    function handleTimeSenseDurationChange() {
      setTimeSenseDuration(readStoredTimeSenseDuration());
      setActiveProfileKey(null);
    }

    window.addEventListener(timeSenseDurationChangedEvent, handleTimeSenseDurationChange);

    return () => {
      window.removeEventListener(timeSenseDurationChangedEvent, handleTimeSenseDurationChange);
    };
  }, [isTimeSense]);

  useEffect(() => {
    if (!isStroop) return;

    function handleStroopDurationChange() {
      setStroopDuration(readStoredStroopDuration());
      setActiveProfileKey(null);
    }

    window.addEventListener(stroopDurationChangedEvent, handleStroopDurationChange);

    return () => {
      window.removeEventListener(stroopDurationChangedEvent, handleStroopDurationChange);
    };
  }, [isStroop]);

  useEffect(() => {
    if (!isCps) return;

    function handleCpsSettingsChange() {
      setCpsSettings(readStoredCpsSettings());
      setActiveProfileKey(null);
    }

    window.addEventListener(cpsSettingsChangedEvent, handleCpsSettingsChange);

    return () => {
      window.removeEventListener(cpsSettingsChangedEvent, handleCpsSettingsChange);
    };
  }, [isCps]);

  useEffect(() => {
    if (!isAim) return;

    function handleAimModeChange() {
      setAimMode(readStoredAimMode());
      setActiveProfileKey(null);
    }

    window.addEventListener(aimModeChangedEvent, handleAimModeChange);

    return () => {
      window.removeEventListener(aimModeChangedEvent, handleAimModeChange);
    };
  }, [isAim]);

  useEffect(() => {
    if (source !== 'online') return;

    let ignore = false;
    setOnlineLoading(true);
    setOnlineError(null);

    getOnlineLeaderboard(
      gameId,
      activeMetric.id,
      limit,
      hasDurationFilter ? activeDuration : undefined,
      isCps ? cpsSettings.inputMode : undefined,
      isAim ? aimMode : undefined,
    )
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
  }, [activeDuration, activeMetric.id, aimMode, cpsSettings.inputMode, entries.length, gameId, hasDurationFilter, isAim, isCps, source]);

  useEffect(() => {
    const activeEntry = selectedEntryData?.entry;

    if (!activeEntry?.playerId || isOwnEntry(activeEntry) || onlineProfiles[activeEntry.playerId] !== undefined) {
      return;
    }

    if (import.meta.env.DEV) {
      console.debug('Mini profile fetch', {
        selectedPlayerId: activeEntry.playerId,
        localPlayerId: currentPlayerId,
        isCurrentPlayer: isOwnEntry(activeEntry),
      });
    }

    const playerId = activeEntry.playerId;
    setLoadingProfiles((current) => ({ ...current, [activeEntry.playerId!]: true }));
    setProfileErrors((current) => ({ ...current, [playerId]: undefined }));

    fetchOnlinePlayerProfile(playerId)
      .then((profile) => {
        setOnlineProfiles((current) => ({ ...current, [playerId]: profile }));
      })
      .catch(() => {
        setOnlineProfiles((current) => ({ ...current, [playerId]: null }));
        setProfileErrors((current) => ({ ...current, [playerId]: 'Nie udało się wczytać profilu' }));
      })
      .finally(() => {
        setLoadingProfiles((current) => ({ ...current, [playerId]: false }));
      });
  }, [currentPlayerId, onlineProfiles, selectedEntryData]);

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

  function handleDurationChange(duration: number) {
    playNormalClickSound();
    if (isCps) {
      const nextSettings = { ...cpsSettings, durationSeconds: duration };
      storeCpsSettings(nextSettings);
      setCpsSettings(nextSettings);
    } else if (isStroop) {
      storeStroopDuration(duration);
      setStroopDuration(duration);
    } else if (isTimeSense) {
      storeTimeSenseDuration(duration);
      setTimeSenseDuration(duration);
    } else {
      storeTypingDuration(duration);
      setTypingDuration(duration);
    }
    setActiveProfileKey(null);
  }

  function handleMetricChange(nextMetricId: string) {
    playNormalClickSound();
    setMetricId(nextMetricId);
    setActiveProfileKey(null);
  }

  function handleCpsModeChange(inputMode: CpsInputMode) {
    playNormalClickSound();
    const nextSettings = { ...cpsSettings, inputMode };
    storeCpsSettings(nextSettings);
    setCpsSettings(nextSettings);
    setActiveProfileKey(null);
  }

  function handleAimModeChange(nextMode: string) {
    if (nextMode !== '15s' && nextMode !== '30s' && nextMode !== 'infinity') return;
    playNormalClickSound();
    storeAimMode(nextMode);
    setAimMode(nextMode);
    setMetricId('score');
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
    <section ref={panelRef} className="rounded-xl border border-cyan-300/15 bg-slate-950/45 p-3.5 shadow-[0_0_28px_rgba(34,211,238,0.055)]">
      <div className="flex flex-col gap-2.5">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-cyan-200">Leaderboard</p>
          <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-white">Ranking</h2>
          <p className="mt-1 text-xs text-slate-500">Top {limit} · {totalEntriesLabel}</p>
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

      {hasDurationFilter && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">{isTimeSense ? 'Target' : 'Czas testu'}</p>
          <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
            {durationOptions.map((duration) => (
              <button
                aria-pressed={activeDuration === duration.value}
                className={`min-w-14 flex-1 rounded-md px-2 py-2 text-xs font-black transition duration-200 hover:scale-[1.02] ${
                  activeDuration === duration.value
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={duration.value}
                onClick={() => handleDurationChange(duration.value)}
                type="button"
              >
                {duration.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isCps && (
        <div className="mt-3">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Tryb</p>
          <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
            {cpsInputModeOptions.map((mode) => (
              <button
                aria-pressed={cpsSettings.inputMode === mode.value}
                className={`min-w-14 flex-1 rounded-md px-2 py-2 text-xs font-black transition duration-200 hover:scale-[1.02] ${
                  cpsSettings.inputMode === mode.value
                    ? 'bg-fuchsia-300 text-slate-950 shadow-[0_0_18px_rgba(217,70,239,0.22)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={mode.value}
                onClick={() => handleCpsModeChange(mode.value)}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isAim && (
        <div className="mt-4">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Tryb</p>
          <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
            {aimModeOptions.map((option) => (
              <button
                aria-pressed={aimMode === option.value}
                className={`min-w-14 flex-1 rounded-md px-2 py-2 text-xs font-black transition duration-200 hover:scale-[1.02] ${
                  aimMode === option.value
                    ? 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                key={option.value}
                onClick={() => handleAimModeChange(option.value)}
                type="button"
              >
                {option.label}
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
            {visibleMetrics.map((metric) => (
              <button
                aria-pressed={activeMetric.id === metric.id}
                className={`rounded-full border px-3 py-2 text-xs font-black transition duration-200 ${
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

      <div className="relative mt-3 min-h-[12rem]">
        <div className={`max-h-[28rem] space-y-2 overflow-y-auto pr-1 transition duration-200 ${onlineLoading ? 'opacity-45 blur-[1px]' : 'opacity-100 blur-0'}`}>
          {visibleEntries.length === 0 && !onlineLoading ? (
            <p className="rounded-md border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
              {usingOnline ? 'Brak wyników online.' : 'Brak wyników.'}
            </p>
          ) : (
            visibleEntries.map((entry, index) => {
              const ownEntry = isOwnEntry(entry);
              const attemptsKey = entry.playerId ?? entry.playerName;
              const secondaryInfo = getSecondaryInfo(entry, gameId, source === 'local' ? localAttemptsByPlayer[attemptsKey] : undefined);
              const entryKey = getEntryKey(entry, index);
              const selected = activeProfileKey === entryKey;
              const publicProfile = entry.playerId ? onlineProfiles[entry.playerId] : undefined;
              const rowDevice = ownEntry
                ? profileSummary.lastSeenDevice ?? profileSummary.createdOnDevice
                : publicProfile?.lastSeenDevice ?? publicProfile?.createdOnDevice;

              return (
                <div
                  aria-expanded={selected}
                  className={`leaderboard-row group relative overflow-hidden rounded-xl border px-3 py-2.5 transition duration-200 hover:border-cyan-300/35 hover:bg-cyan-300/[0.06] hover:shadow-[0_0_18px_rgba(34,211,238,0.10)] focus:outline-none focus-visible:border-cyan-300/45 focus-visible:ring-1 focus-visible:ring-cyan-300/40 ${
                    selected ? 'border-cyan-300/45 bg-cyan-300/[0.07] shadow-[0_0_24px_rgba(34,211,238,0.14)]' : getRankClass(index, ownEntry)
                  } ${ownEntry ? equippedFrame?.className ?? '' : ''}`}
                  key={entryKey}
                  onClick={() => setActiveProfileKey((current) => (current === entryKey ? null : entryKey))}
                  onKeyDown={(event) => handleRowKeyDown(event, entryKey)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="grid grid-cols-[2.2rem_minmax(0,1fr)_minmax(4.8rem,auto)] items-center gap-2.5">
                    <span className={`text-sm font-black ${getRankTextClass(index)}`}>#{index + 1}</span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 max-w-[9.5rem] truncate text-sm font-bold leading-5 text-slate-100">{entry.playerName}</span>
                      <DeviceOriginBadge compact device={rowDevice} />
                      {ownEntry && (
                        <span className="shrink-0 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-1.5 py-0.5 text-[0.56rem] font-black uppercase tracking-wide text-cyan-100">
                          Ty
                        </span>
                      )}
                      {selected && (
                        <span className="hidden shrink-0 rounded-full border border-violet-300/30 bg-violet-300/10 px-1.5 py-0.5 text-[0.56rem] font-black uppercase tracking-wide text-violet-100 sm:inline">
                          Profil
                        </span>
                      )}
                      </div>
                      {ownEntry && (equippedTitle || equippedBadge) && (
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
                          {equippedTitle && <span className="min-w-0 max-w-[8rem] truncate text-[0.62rem] font-bold uppercase tracking-wide text-violet-100/80">{equippedTitle.label}</span>}
                          {equippedBadge && (
                            <span className={`max-w-[6.8rem] shrink truncate rounded-full border px-1.5 py-0.5 text-[0.52rem] font-black uppercase tracking-wide ${equippedBadge.className ?? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'}`}>
                              {equippedBadge.label}
                            </span>
                          )}
                        </div>
                      )}
                      {secondaryInfo.length > 0 && (
                        <p className="mt-1 truncate text-[0.7rem] font-medium leading-4 text-slate-400">{secondaryInfo.join(' · ')}</p>
                      )}
                    </div>
                    <div className="min-w-[4.8rem] shrink-0 text-right">
                      <span className="block text-sm font-black leading-5 text-white sm:text-base">{formatMetricValue(entry, activeMetric)}</span>
                      <span className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">{getMetricLabel(gameId, activeMetric)}</span>
                    </div>
                  </div>

                  {!selected && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/55 opacity-0 backdrop-blur-[1px] transition duration-150 group-hover:opacity-100 group-focus:opacity-100">
                      <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.18em] text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]">
                        Pokaż profil
                      </span>
                    </div>
                  )}
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
          profileError={selectedEntryData.entry.playerId ? profileErrors[selectedEntryData.entry.playerId] : undefined}
          ownEntry={isOwnEntry(selectedEntryData.entry)}
          summary={profileSummary}
        />
      )}
    </section>
  );
}
