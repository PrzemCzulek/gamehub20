import { useEffect, useState } from 'react';
import { achievementDefinitions } from '../data/achievements';
import { games } from '../data/games';
import { questDefinitions } from '../data/quests';
import { getAchievementUnlocks, getQuestProgress } from '../progression/progressionEngine';
import { playNormalClickSound } from '../services/audio';
import type { LocalProfile } from '../types';
import { formatPercent } from '../utils/format';

type PlayerHubProps = {
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

function getGameTitle(gameId: string): string {
  return games.find((game) => game.id === gameId)?.title ?? gameId;
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

export function PlayerHub({ onRename, profile, revision }: PlayerHubProps) {
  const [activeTab, setActiveTab] = useState<PlayerHubTab>('stats');
  const [draftName, setDraftName] = useState(profile.playerName);
  const questProgress = getQuestProgress();
  const achievementUnlocks = getAchievementUnlocks();
  const unlockById = new Map(achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]));
  const unlockedIds = new Set(unlockById.keys());
  const mostPlayedGameTitle = profile.mostPlayedGame ? getGameTitle(profile.mostPlayedGame) : '-';
  const bestGameTitle = profile.bestGame ? getGameTitle(profile.bestGame) : '-';

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
            <strong className="mt-1 block text-white">{profile.totalScoreEntries}</strong>
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
                    <strong className="mt-1 block text-white">{profile.bestScores[game.id]?.scoreLabel ?? '-'}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Highlighty</h3>
              <div className="mt-3 space-y-2 text-sm">
                <p className="rounded-md bg-black/20 px-3 py-2">Najlepszy Reaction Time: {profile.highlights.bestReactionTime?.scoreLabel ?? '-'}</p>
                <p className="rounded-md bg-black/20 px-3 py-2">Najwyższy WPM: {profile.highlights.highestWpm?.scoreLabel ?? '-'}</p>
                <p className="rounded-md bg-black/20 px-3 py-2">
                  Najlepsza celność Aim Test:{' '}
                  {profile.highlights.highestAimAccuracy?.stats?.accuracy !== undefined
                    ? formatPercent(profile.highlights.highestAimAccuracy.stats.accuracy)
                    : '-'}
                </p>
                <p className="rounded-md bg-black/20 px-3 py-2">
                  Najlepsze podobieństwo Color Memory:{' '}
                  {profile.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined
                    ? formatPercent(profile.highlights.bestColorSimilarity.stats.bestSimilarity)
                    : '-'}
                </p>
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

                      return (
                        <div className="rounded-md border border-white/5 bg-black/25 px-3 py-2" key={quest.id}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold text-white">{quest.title}</span>
                            <span className="text-cyan-100">
                              {value}/{quest.target.amount}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{quest.description}</p>
                          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                            <span className="font-semibold text-amber-100">Nagroda: +{quest.rewardXp} XP</span>
                            {progress?.completed && <span className="text-teal-200">Ukończony</span>}
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
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
