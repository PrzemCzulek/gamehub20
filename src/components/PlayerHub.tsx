import { useEffect, useState } from 'react';
import { achievementDefinitions } from '../data/achievements';
import { gameMilestones } from '../data/gameMilestones';
import { games } from '../data/games';
import { questDefinitions } from '../data/quests';
import { buildPlayerProfileSummary, emptyValueLabel } from '../progression/playerProfile';
import { getQuestStreak } from '../progression/quests';
import { getAchievementUnlocks, getQuestProgress } from '../progression/progressionEngine';
import { playNormalClickSound } from '../services/audio';
import type { GameId, LocalProfile, PlayerGameProgressSummary } from '../types';
import { formatPercent } from '../utils/format';

type PlayerHubProps = {
  onMilestoneClaim: (gameId: GameId, milestoneId: string) => void;
  onQuestClaim: (questId: string, periodId: string) => void;
  onRename: (name: string) => void;
  profile: LocalProfile;
  revision: number;
};

type PlayerHubTab = 'stats' | 'achievements' | 'quests' | 'history';
type Rarity = 'common' | 'rare' | 'epic';

const tabs: Array<{ id: PlayerHubTab; label: string }> = [
  { id: 'stats', label: 'Statystyki' },
  { id: 'achievements', label: 'Achievementy' },
  { id: 'quests', label: 'Questy' },
  { id: 'history', label: 'Historia' },
];

const rarityLabels: Record<Rarity, string> = {
  common: 'COMMON',
  rare: 'RARE',
  epic: 'EPIC',
};

const rarityStyles: Record<Rarity, { unlocked: string; locked: string; badge: string }> = {
  common: {
    unlocked: 'border-cyan-100/25 bg-cyan-100/[0.055] shadow-[0_0_18px_rgba(226,232,240,0.10)]',
    locked: 'border-white/10 bg-black/20 opacity-65',
    badge: 'border-cyan-100/25 text-cyan-50 bg-cyan-100/10',
  },
  rare: {
    unlocked: 'border-cyan-300/40 bg-cyan-300/[0.08] shadow-[0_0_25px_rgba(34,211,238,0.18)]',
    locked: 'border-cyan-300/10 bg-black/20 opacity-65',
    badge: 'border-cyan-300/40 text-cyan-100 bg-cyan-300/10',
  },
  epic: {
    unlocked: 'border-amber-200/40 bg-violet-300/[0.09] shadow-[0_0_30px_rgba(168,85,247,0.22)]',
    locked: 'border-violet-300/10 bg-black/20 opacity-65',
    badge: 'border-amber-200/45 text-amber-100 bg-amber-200/10',
  },
};

const questRarityStyles = {
  common: 'border-slate-300/20 bg-slate-300/[0.05] text-slate-100',
  rare: 'border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.10)]',
  epic: 'border-violet-300/35 bg-violet-300/[0.08] text-violet-100 shadow-[0_0_18px_rgba(168,85,247,0.12)]',
  legendary: 'border-amber-200/40 bg-amber-200/[0.09] text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.14)]',
};

function getGameTitle(gameId?: string): string {
  return gameId ? games.find((game) => game.id === gameId)?.title ?? gameId : emptyValueLabel;
}

function getQuestResetLabel(type: 'daily' | 'weekly'): string {
  const now = new Date();
  const reset = new Date(now);

  if (type === 'daily') {
    reset.setHours(24, 0, 0, 0);
  } else {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    reset.setDate(now.getDate() + daysUntilMonday);
    reset.setHours(0, 0, 0, 0);
  }

  const diffMs = Math.max(0, reset.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);

  return `${hours}h ${minutes}m`;
}

function formatUnlockDate(value?: string): string {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function getMilestoneStatus(gameProgress: PlayerGameProgressSummary, milestoneId: string, levelRequired: number) {
  if (gameProgress.milestonesClaimed.includes(milestoneId)) {
    return 'claimed';
  }

  return gameProgress.level >= levelRequired ? 'ready' : 'locked';
}

export function PlayerHub({ onMilestoneClaim, onQuestClaim, onRename, profile, revision }: PlayerHubProps) {
  const [activeTab, setActiveTab] = useState<PlayerHubTab>('stats');
  const [draftName, setDraftName] = useState(profile.playerName);
  const summary = buildPlayerProfileSummary(profile);
  const questProgress = getQuestProgress();
  const questStreak = getQuestStreak();
  const achievementUnlocks = getAchievementUnlocks();
  const unlockById = new Map(achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]));
  const unlockedIds = new Set(unlockById.keys());
  const mostPlayedGameTitle = getGameTitle(summary.favoriteGame);
  const bestGameTitle = getGameTitle(summary.bestGame);
  const highlights = [
    { label: 'Najlepszy Reaction Time', value: summary.highlights.bestReactionTime?.scoreLabel },
    { label: 'Najwyższy WPM', value: summary.highlights.bestTypingWpm?.scoreLabel },
    {
      label: 'Najlepsza dokładność pisania',
      value:
        summary.highlights.bestTypingAccuracy?.stats?.accuracy !== undefined
          ? formatPercent(summary.highlights.bestTypingAccuracy.stats.accuracy)
          : undefined,
    },
    {
      label: 'Najlepsza celność Aim Test',
      value:
        summary.highlights.bestAimAccuracy?.stats?.accuracy !== undefined
          ? formatPercent(summary.highlights.bestAimAccuracy.stats.accuracy)
          : undefined,
    },
    {
      label: 'Najlepsze podobieństwo Color Memory',
      value:
        summary.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined
          ? formatPercent(summary.highlights.bestColorSimilarity.stats.bestSimilarity)
          : undefined,
    },
    { label: 'Najlepszy Word Memory', value: summary.highlights.bestWordMemoryScore?.scoreLabel },
    { label: 'Najlepszy Symbol Match', value: summary.highlights.bestSymbolMatchMoves?.scoreLabel },
    { label: 'Najwyższy poziom Memory Test', value: summary.highlights.highestMemoryLevel?.scoreLabel },
  ];

  useEffect(() => {
    setDraftName(profile.playerName);
  }, [profile.playerName]);

  return (
    <section
      className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_40px_rgba(34,211,238,0.06)] sm:p-5"
      data-revision={revision}
    >
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">PLAYER HUB</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Profil gracza</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs sm:min-w-[24rem]">
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <span className="block text-slate-400">Wyniki</span>
            <strong className="mt-1 block text-white">{summary.totalScoreEntries}</strong>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <span className="block text-slate-400">Najczęściej</span>
            <strong className="mt-1 block truncate text-white">{mostPlayedGameTitle}</strong>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <span className="block text-slate-400">Najlepsza</span>
            <strong className="mt-1 block truncate text-white">{bestGameTitle}</strong>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                : 'border-white/10 text-slate-300 hover:bg-white/10'
            }`}
            key={tab.id}
            onClick={() => {
              playNormalClickSound();
              setActiveTab(tab.id);
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === 'stats' && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <form
                className="mb-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  playNormalClickSound();
                  onRename(draftName);
                }}
              >
                <input
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  maxLength={24}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Nick"
                  value={draftName}
                />
                <button className="rounded-md bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950" type="submit">
                  Zmień
                </button>
              </form>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Najlepsze wyniki</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {games.map((game) => (
                  <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm" key={game.id}>
                    <span className="block truncate text-slate-400">{game.title}</span>
                    <strong className="mt-1 block text-white">{profile.bestScores[game.id]?.scoreLabel ?? emptyValueLabel}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Highlighty</h3>
              <div className="mt-3 space-y-2 text-sm">
                {highlights.map((item) => (
                  <p className="rounded-md bg-black/20 px-3 py-2" key={item.label}>
                    {item.label}: <span className="font-semibold text-white">{item.value ?? emptyValueLabel}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-cyan-300/10 bg-black/15 p-4 lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Poziomy gier</h3>
                  <p className="mt-1 text-xs text-slate-400">Osobny progres XP dla każdej gry.</p>
                </div>
                {summary.topGameLevels.length > 0 && (
                  <span className="text-xs text-slate-400">
                    Top: {summary.topGameLevels[0].gameTitle} Lv. {summary.topGameLevels[0].level}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {summary.gameProgressSummary.map((gameProgress) => (
                  <div className="rounded-md border border-white/10 bg-black/25 px-3 py-3 text-sm" key={gameProgress.gameId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-white">{gameProgress.gameTitle}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          Próby: {gameProgress.totalPlays} · Best: {gameProgress.bestScoreLabel ?? emptyValueLabel}
                        </span>
                      </div>
                      <strong className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
                        Lv. {gameProgress.level}
                      </strong>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
                        style={{ width: `${gameProgress.levelProgressPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[0.68rem] text-slate-500">
                      <span>{gameProgress.xp - gameProgress.currentLevelXp} XP</span>
                      <span>{gameProgress.nextLevelXp - gameProgress.currentLevelXp} XP</span>
                    </div>
                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                      {gameMilestones
                        .filter((milestone) => milestone.gameId === gameProgress.gameId)
                        .slice(0, 3)
                        .map((milestone) => {
                          const status = getMilestoneStatus(gameProgress, milestone.id, milestone.levelRequired);
                          const ready = status === 'ready';

                          return (
                            <div
                              className={`rounded-md border px-2 py-2 text-xs transition ${
                                status === 'claimed'
                                  ? 'border-teal-300/15 bg-teal-300/[0.05] text-teal-100'
                                  : ready
                                    ? 'border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-50 shadow-[0_0_16px_rgba(34,211,238,0.10)]'
                                    : 'border-white/5 bg-black/20 text-slate-500'
                              }`}
                              key={milestone.id}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="block truncate font-semibold">{milestone.label}</span>
                                  <span className="mt-0.5 block text-[0.68rem] opacity-75">
                                    Lv. {milestone.levelRequired} · +{milestone.mainXpReward} XP konta
                                  </span>
                                </div>
                                {ready ? (
                                  <button
                                    className="shrink-0 rounded-md bg-cyan-300 px-2 py-1 text-[0.65rem] font-bold text-slate-950 transition hover:bg-cyan-200"
                                    onClick={() => {
                                      playNormalClickSound();
                                      onMilestoneClaim(gameProgress.gameId, milestone.id);
                                    }}
                                    type="button"
                                  >
                                    Odbierz
                                  </button>
                                ) : (
                                  <span className="shrink-0 text-[0.65rem] font-semibold uppercase">
                                    {status === 'claimed' ? '✓ Odebrany' : 'Zablokowany'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {achievementDefinitions.map((achievement) => {
              const unlocked = unlockedIds.has(achievement.id);
              const unlock = unlockById.get(achievement.id);
              const rarity = achievement.rarity as Rarity;
              const styles = rarityStyles[rarity];

              return (
                <div
                  className={`relative overflow-hidden rounded-lg border p-4 transition duration-200 ${
                    unlocked ? `${styles.unlocked} achievement-shine` : styles.locked
                  }`}
                  key={achievement.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">{achievement.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase ${styles.badge}`}>
                      {rarityLabels[rarity]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{achievement.description}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className={`font-semibold ${unlocked ? 'text-cyan-100' : 'text-slate-400'}`}>
                      {unlocked ? 'Odblokowane' : 'Zablokowane'}
                    </span>
                    {unlock?.unlockedAt && <span className="text-slate-500">{formatUnlockDate(unlock.unlockedAt)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3">
                <span className="block text-xs uppercase tracking-[0.18em] text-cyan-100">Seria dzienna</span>
                <strong className="mt-1 block text-white">{questStreak.currentStreak} dni</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">Najlepsza seria</span>
                <strong className="mt-1 block text-white">{questStreak.bestStreak} dni</strong>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
            {(['daily', 'weekly'] as const).map((type) => (
              <div className="rounded-lg border border-white/10 bg-black/15 p-4" key={type}>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
                    {type === 'daily' ? 'Dzienne questy' : 'Tygodniowe questy'}
                  </h3>
                  <span className="text-xs text-slate-400">Reset za: {getQuestResetLabel(type)}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {questDefinitions
                    .filter((quest) => quest.type === type)
                    .map((quest) => {
                      const progress = questProgress.find((item) => item.questId === quest.id);
                      const value = progress?.progress ?? 0;
                      const percent = Math.min(100, Math.round((value / quest.target.amount) * 100));
                      const claimed = Boolean(progress?.isClaimed || progress?.claimedAt);
                      const ready = Boolean(progress?.completed && !claimed);
                      const statusLabel = claimed ? 'ODEBRANE' : ready ? 'GOTOWE DO ODBIORU' : 'W TRAKCIE';

                      return (
                        <div
                          className={`rounded-lg border px-3 py-3 transition duration-200 hover:-translate-y-0.5 ${
                            claimed
                              ? 'border-white/5 bg-black/20 opacity-65'
                              : ready
                                ? `${questRarityStyles[quest.rarity]} quest-ready-pulse`
                                : questRarityStyles[quest.rarity]
                          }`}
                          key={quest.id}
                        >
                          <div className="flex items-start justify-between gap-3 text-sm">
                            <span className="flex min-w-0 items-center gap-2 font-semibold text-white">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-black/25 text-xs">
                                {quest.icon ?? 'Q'}
                              </span>
                              <span className="min-w-0 truncate">{quest.title}</span>
                            </span>
                            <span className="shrink-0 text-cyan-100">
                              {value}/{quest.target.amount}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-slate-400">{quest.description}</p>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2 py-0.5 font-semibold uppercase text-amber-100">
                              {quest.rarity} · +{quest.rewardXp} XP konta
                            </span>
                            <span className={`font-bold uppercase ${claimed ? 'text-slate-400' : ready ? 'text-cyan-100' : 'text-slate-500'}`}>
                              {claimed ? '✓ Odebrano' : statusLabel}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ready
                                  ? 'bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.65)]'
                                  : claimed
                                    ? 'bg-teal-300/50'
                                    : 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {ready && progress && (
                            <button
                              className="mt-3 w-full rounded-md bg-cyan-300 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)] transition hover:bg-cyan-200"
                              onClick={() => {
                                playNormalClickSound();
                                onQuestClaim(quest.id, progress.periodId);
                              }}
                              type="button"
                            >
                              Odbierz
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {profile.recentScores.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-400">Brak zapisanej historii wyników.</p>
            ) : (
              profile.recentScores.map((score) => (
                <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm" key={`${score.createdAt}-${score.gameId}`}>
                  <span className="block truncate text-slate-400">{getGameTitle(score.gameId)}</span>
                  <strong className="mt-1 block text-white">{score.scoreLabel}</strong>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
