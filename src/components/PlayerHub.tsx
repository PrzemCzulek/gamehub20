import { useEffect, useState } from 'react';
import { pushFeedback } from './feedback/feedbackQueue';
import { achievementDefinitions } from '../data/achievements';
import { getCosmetic } from '../data/cosmetics';
import { gameMilestones } from '../data/gameMilestones';
import { games } from '../data/games';
import { questDefinitions } from '../data/quests';
import { rewardDefinitions, type RewardDefinition } from '../data/rewards';
import { buildPlayerProfileSummary, emptyValueLabel } from '../progression/playerProfile';
import { getQuestStreak } from '../progression/quests';
import { getAchievementUnlocks, getQuestProgress } from '../progression/progressionEngine';
import { claimReward, equipCosmetic, getEquippedCosmetics, getRewardStatus } from '../progression/rewardHelpers';
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

type PlayerHubTab = 'stats' | 'rewards' | 'achievements' | 'quests' | 'history';
type Rarity = 'common' | 'rare' | 'epic';

const tabs: Array<{ id: PlayerHubTab; label: string }> = [
  { id: 'stats', label: 'Stats' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'quests', label: 'Quests' },
  { id: 'history', label: 'History' },
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

function ShowcaseStat({ label, value, accent = 'cyan' }: { label: string; value?: string; accent?: 'cyan' | 'violet' | 'amber' | 'teal' }) {
  const accentClass = {
    cyan: 'text-cyan-100 border-cyan-300/18 bg-cyan-300/[0.055]',
    violet: 'text-violet-100 border-violet-300/18 bg-violet-300/[0.055]',
    amber: 'text-amber-100 border-amber-300/18 bg-amber-300/[0.055]',
    teal: 'text-teal-100 border-teal-300/18 bg-teal-300/[0.055]',
  }[accent];

  return (
    <div className={`min-h-[5.4rem] rounded-xl border px-3.5 py-3.5 ${accentClass}`}>
      <strong className="block truncate text-2xl font-black tracking-tight text-white">{value ?? emptyValueLabel}</strong>
      <span className="mt-1.5 block truncate text-[0.62rem] font-black uppercase tracking-[0.12em] opacity-75">{label}</span>
    </div>
  );
}

function MiniScoreTile({ title, value, metric }: { title: string; value?: string; metric: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/22 px-3.5 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-bold text-slate-300">{title}</span>
        <span className="shrink-0 text-[0.58rem] font-black uppercase tracking-wide text-slate-500">{metric}</span>
      </div>
      <strong className={`mt-1 block truncate text-lg font-black ${value ? 'text-white' : 'text-slate-500'}`}>{value ?? emptyValueLabel}</strong>
    </div>
  );
}

function RewardCard({ onUpdate, reward }: { onUpdate: () => void; reward: RewardDefinition }) {
  const status = getRewardStatus(reward);
  const cosmetic = getCosmetic(reward.reward.id, reward.reward.type);
  const equippedCosmetics = getEquippedCosmetics();
  const isEquipped = equippedCosmetics[reward.reward.type] === reward.reward.id;
  const ready = status === 'ready';
  const claimed = status === 'claimed';

  return (
    <div
      className={`rounded-xl border p-3.5 transition ${
        ready
          ? 'border-cyan-300/40 bg-cyan-300/[0.08] shadow-[0_0_22px_rgba(34,211,238,0.16)]'
          : claimed
            ? 'border-teal-300/20 bg-teal-300/[0.045]'
            : 'border-white/10 bg-black/22 opacity-75'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{cosmetic?.label ?? reward.label}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{reward.gameId ? getGameTitle(reward.gameId) : 'Global'} · Lv {reward.requirement.value}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[0.6rem] font-black uppercase text-slate-300">
          {reward.reward.type}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-xs font-black uppercase ${ready ? 'text-cyan-100' : claimed ? 'text-teal-100' : 'text-slate-500'}`}>
          {ready ? 'READY' : claimed && isEquipped ? 'ZAŁOŻONE' : claimed ? 'ODEBRANE' : 'LOCKED'}
        </span>
        {ready && (
          <button
            className="rounded-md bg-cyan-300 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-100"
            onClick={() => {
              playNormalClickSound();
              const result = claimReward(reward.id);
              if (result.ok) {
                pushFeedback({
                  type: 'reward',
                  title: 'NAGRODA ODEBRANA',
                  message: cosmetic?.label ?? reward.label,
                  detail: 'Gotowe do użycia',
                  priority: 'high',
                });
              }
              onUpdate();
            }}
            type="button"
          >
            Odbierz
          </button>
        )}
        {claimed && isEquipped && (
          <span className="rounded-md border border-teal-300/25 bg-teal-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-teal-100">
            Założone
          </span>
        )}
        {claimed && !isEquipped && (
          <button
            className="rounded-md border border-teal-300/25 bg-teal-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-teal-100 transition hover:bg-teal-300/15"
            onClick={() => {
              playNormalClickSound();
              const result = equipCosmetic(reward.reward.id);
              if (result.ok) {
                pushFeedback({
                  type: 'quest',
                  title: 'ZAŁOŻONO',
                  message: result.cosmetic.label,
                  priority: 'medium',
                });
              }
              onUpdate();
            }}
            type="button"
          >
            Załóż
          </button>
        )}
      </div>
    </div>
  );
}

function RewardSection({ onUpdate, rewards, title }: { onUpdate: () => void; rewards: RewardDefinition[]; title: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">{title}</h3>
        <span className="text-xs text-slate-500">{rewards.length}</span>
      </div>
      {rewards.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">Brak.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rewards.map((reward) => (
            <RewardCard key={reward.id} onUpdate={onUpdate} reward={reward} />
          ))}
        </div>
      )}
    </section>
  );
}

function ActiveCosmeticsSection() {
  const equippedCosmetics = getEquippedCosmetics();
  const activeCosmetics = [
    { label: 'Title', cosmetic: getCosmetic(equippedCosmetics.title, 'title') },
    { label: 'Frame', cosmetic: getCosmetic(equippedCosmetics.frame, 'frame') },
    { label: 'Badge', cosmetic: getCosmetic(equippedCosmetics.badge, 'badge') },
  ];
  const hasActiveCosmetics = activeCosmetics.some((item) => item.cosmetic);

  return (
    <section className="rounded-xl border border-cyan-300/12 bg-black/20 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Aktywne kosmetyki</h3>
        <span className="text-xs text-slate-500">{activeCosmetics.filter((item) => item.cosmetic).length}/3</span>
      </div>
      {!hasActiveCosmetics ? (
        <p className="rounded-lg border border-dashed border-white/10 p-3 text-sm text-slate-500">Brak aktywnych kosmetyków</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {activeCosmetics.map((item) => (
            <div className={`rounded-lg border border-white/10 bg-black/24 px-3 py-2 ${item.cosmetic?.className ?? ''}`} key={item.label}>
              <span className="block text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">{item.label}</span>
              <strong className={`mt-1 block truncate text-sm ${item.cosmetic ? 'text-white' : 'text-slate-600'}`}>
                {item.cosmetic?.label ?? emptyValueLabel}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function PlayerHub({ onMilestoneClaim, onQuestClaim, onRename, profile, revision }: PlayerHubProps) {
  const [activeTab, setActiveTab] = useState<PlayerHubTab>('stats');
  const [draftName, setDraftName] = useState(profile.playerName);
  const [rewardRevision, setRewardRevision] = useState(0);
  const summary = buildPlayerProfileSummary(profile);
  const questProgress = getQuestProgress();
  const questStreak = getQuestStreak();
  const achievementUnlocks = getAchievementUnlocks();
  const unlockById = new Map(achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]));
  const unlockedIds = new Set(unlockById.keys());
  const readyRewards = rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'ready');
  const claimedRewards = rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'claimed');
  const lockedRewards = rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'locked');
  const equippedCosmetics = getEquippedCosmetics();
  const equippedTitle = getCosmetic(equippedCosmetics.title, 'title');
  const equippedBadge = getCosmetic(equippedCosmetics.badge, 'badge');
  const equippedFrame = getCosmetic(equippedCosmetics.frame, 'frame');
  const mostPlayedGameTitle = getGameTitle(summary.favoriteGame);
  const bestGameTitle = getGameTitle(summary.bestGame);
  const highlights = [
    { label: 'Best reaction', value: summary.highlights.bestReactionTime?.scoreLabel, accent: 'cyan' as const },
    { label: 'Typing WPM', value: summary.highlights.bestTypingWpm?.scoreLabel, accent: 'teal' as const },
    {
      label: 'Aim accuracy',
      value:
        summary.highlights.bestAimAccuracy?.stats?.accuracy !== undefined
          ? formatPercent(summary.highlights.bestAimAccuracy.stats.accuracy)
          : undefined,
      accent: 'amber' as const,
    },
    {
      label: 'Color match',
      value:
        summary.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined
          ? formatPercent(summary.highlights.bestColorSimilarity.stats.bestSimilarity)
          : undefined,
      accent: 'violet' as const,
    },
    { label: 'Word score', value: summary.highlights.bestWordMemoryScore?.scoreLabel, accent: 'cyan' as const },
    { label: 'Memory level', value: summary.highlights.highestMemoryLevel?.scoreLabel, accent: 'teal' as const },
    { label: 'Time sense', value: summary.highlights.bestTimeSenseScore?.scoreLabel, accent: 'violet' as const },
    { label: 'Stroop score', value: summary.highlights.bestStroopScore?.scoreLabel, accent: 'cyan' as const },
    {
      label: 'Stroop accuracy',
      value:
        summary.highlights.bestStroopAccuracy?.stats?.accuracy !== undefined
          ? formatPercent(summary.highlights.bestStroopAccuracy.stats.accuracy)
          : undefined,
      accent: 'teal' as const,
    },
    { label: 'Stroop streak', value: summary.highlights.bestStroopStreak?.stats?.bestCombo !== undefined ? `x${summary.highlights.bestStroopStreak.stats.bestCombo}` : undefined, accent: 'violet' as const },
    { label: 'Best CPS', value: summary.highlights.bestCps?.scoreLabel, accent: 'cyan' as const },
    { label: 'Peak CPS', value: summary.highlights.peakCps?.stats?.peakCPS !== undefined ? `${summary.highlights.peakCps.stats.peakCPS} CPS` : undefined, accent: 'teal' as const },
    { label: 'Alt CPS', value: summary.highlights.bestAlternatingCps?.scoreLabel, accent: 'violet' as const },
  ];

  useEffect(() => {
    setDraftName(profile.playerName);
  }, [profile.playerName]);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-slate-950/42 p-4 shadow-[0_0_40px_rgba(34,211,238,0.06)] sm:p-5"
      data-revision={`${revision}-${rewardRevision}`}
    >
      <div className={`grid gap-4 rounded-xl border border-cyan-300/10 bg-black/18 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center ${equippedFrame?.className ?? ''}`}>
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="grid h-13 min-h-13 w-13 min-w-13 shrink-0 place-items-center rounded-xl border border-violet-300/30 bg-violet-300/10 text-xl font-black text-violet-100 shadow-[0_0_22px_rgba(168,85,247,0.16)]">
            {summary.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-200">Player profile</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate text-2xl font-black text-white sm:text-3xl">{summary.displayName}</h2>
              {equippedBadge && (
                <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-black uppercase ${equippedBadge.className ?? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'}`}>
                  {equippedBadge.label}
                </span>
              )}
            </div>
            {equippedTitle && <p className="mt-0.5 truncate text-xs font-bold uppercase tracking-[0.16em] text-violet-100">{equippedTitle.label}</p>}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2.5 text-xs sm:grid-cols-3 xl:grid-cols-5 lg:min-w-[34rem]">
          <ShowcaseStat label="Level" value={`L${summary.level}`} accent="violet" />
          <ShowcaseStat label="XP" value={String(summary.xp)} accent="cyan" />
          <ShowcaseStat label="Streak" value={`${questStreak.currentStreak}d`} accent="teal" />
          <ShowcaseStat label="Runs" value={String(summary.totalScoreEntries)} accent="amber" />
          <ShowcaseStat label="Main game" value={mostPlayedGameTitle} accent="cyan" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-black/22 p-1">
        {tabs.map((tab) => (
          <button
            className={`rounded-lg border px-3 py-1.5 text-xs font-black uppercase tracking-wide transition ${
              activeTab === tab.id
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/8 hover:text-white'
            }`}
            key={tab.id}
            onClick={() => {
              playNormalClickSound();
              setActiveTab(tab.id);
            }}
            type="button"
          >
            {tab.label}
            {tab.id === 'rewards' && readyRewards.length > 0 && (
              <span className="ml-2 rounded-full bg-slate-950/75 px-1.5 py-0.5 text-[0.58rem] text-cyan-100">{readyRewards.length} READY</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeTab === 'stats' && (
          <div className="space-y-5">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Highlights</h3>
                <span className="text-xs text-slate-500">Best game: {bestGameTitle}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {highlights.map((item) => (
                  <ShowcaseStat key={item.label} label={item.label} value={item.value} accent={item.accent} />
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-xl border border-white/10 bg-black/18 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Best scores</h3>
                  <span className="text-xs text-slate-500">{summary.totalScoreEntries} entries</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {games.map((game) => (
                    <MiniScoreTile key={game.id} metric={game.scoreName} title={game.title} value={profile.bestScores[game.id]?.scoreLabel} />
                  ))}
                </div>
              </div>

              <form
                className="rounded-xl border border-white/10 bg-black/18 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  playNormalClickSound();
                  onRename(draftName);
                }}
              >
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Identity</h3>
                <input
                  className="mt-3 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  maxLength={24}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Nick"
                  value={draftName}
                />
                <button className="mt-2 w-full rounded-md bg-teal-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-200" type="submit">
                  Zmień nick
                </button>
              </form>
            </section>

            <section className="rounded-xl border border-cyan-300/10 bg-black/18 p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Game levels</h3>
                {summary.topGameLevels.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Top: {summary.topGameLevels[0].gameTitle} Lv. {summary.topGameLevels[0].level}
                  </span>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {summary.gameProgressSummary.map((gameProgress) => (
                  <GameLevelCard
                    gameProgress={gameProgress}
                    key={gameProgress.gameId}
                    onMilestoneClaim={onMilestoneClaim}
                  />
                ))}
              </div>
            </section>
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
                  className={`relative overflow-hidden rounded-lg border p-3.5 transition duration-200 ${
                    unlocked ? `${styles.unlocked} achievement-shine` : styles.locked
                  }`}
                  key={achievement.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{achievement.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-bold uppercase ${styles.badge}`}>
                      {rarityLabels[rarity]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-400">{achievement.description}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className={`font-bold uppercase ${unlocked ? 'text-cyan-100' : 'text-slate-500'}`}>
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                    {unlock?.unlockedAt && <span className="text-slate-500">{formatUnlockDate(unlock.unlockedAt)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-5">
            <ActiveCosmeticsSection />
            <RewardSection onUpdate={() => setRewardRevision((value) => value + 1)} rewards={readyRewards} title="Do odebrania" />
            <RewardSection onUpdate={() => setRewardRevision((value) => value + 1)} rewards={claimedRewards} title="Odebrane" />
            <RewardSection onUpdate={() => setRewardRevision((value) => value + 1)} rewards={lockedRewards} title="Zablokowane" />
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="space-y-3">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3">
                <span className="block text-xs uppercase tracking-[0.18em] text-cyan-100">Daily streak</span>
                <strong className="mt-1 block text-white">{questStreak.currentStreak} dni</strong>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <span className="block text-xs uppercase tracking-[0.18em] text-slate-400">Best streak</span>
                <strong className="mt-1 block text-white">{questStreak.bestStreak} dni</strong>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {(['daily', 'weekly'] as const).map((type) => (
                <div className="rounded-lg border border-white/10 bg-black/15 p-3.5" key={type}>
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
                      {type === 'daily' ? 'Daily quests' : 'Weekly quests'}
                    </h3>
                    <span className="text-xs text-slate-500">{getQuestResetLabel(type)}</span>
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
                        const statusLabel = claimed ? 'ODEBRANE' : ready ? 'ODBIERZ' : 'W TRAKCIE';

                        return (
                          <div
                            className={`rounded-lg border px-3 py-3 transition duration-200 hover:-translate-y-0.5 ${
                              claimed
                                ? 'border-white/5 bg-black/20 opacity-65'
                                : ready
                                  ? `${questRarityStyles[quest.rarity]} quest-reward-ready`
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
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2 py-0.5 font-semibold uppercase text-amber-100">
                                {quest.rarity} · +{quest.rewardXp} XP
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
                                className="quest-claim-button mt-3 w-full rounded-md bg-cyan-300 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.35)] transition duration-200 hover:scale-[1.015] hover:bg-cyan-100"
                                onClick={() => {
                                  playNormalClickSound();
                                  onQuestClaim(quest.id, progress.periodId);
                                }}
                                type="button"
                              >
                                Odbierz nagrodę
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
              <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-400">Brak historii.</p>
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

function GameLevelCard({
  gameProgress,
  onMilestoneClaim,
}: {
  gameProgress: PlayerGameProgressSummary;
  onMilestoneClaim: (gameId: GameId, milestoneId: string) => void;
}) {
  const milestones = gameMilestones.filter((milestone) => milestone.gameId === gameProgress.gameId).slice(0, 3);

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block truncate font-black text-white">{gameProgress.gameTitle}</span>
          <span className="mt-1 block truncate text-xs text-slate-500">Best: {gameProgress.bestScoreLabel ?? emptyValueLabel}</span>
        </div>
        <strong className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
          LV {gameProgress.level}
        </strong>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]"
          style={{ width: `${gameProgress.levelProgressPercent}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {milestones.map((milestone) => {
          const status = getMilestoneStatus(gameProgress, milestone.id, milestone.levelRequired);
          const ready = status === 'ready';

          return ready ? (
            <button
              className="rounded-full border border-cyan-300/45 bg-cyan-300 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.28)] transition hover:bg-cyan-100"
              key={milestone.id}
              onClick={() => {
                playNormalClickSound();
                onMilestoneClaim(gameProgress.gameId, milestone.id);
              }}
              type="button"
            >
              🏁 Lv{milestone.levelRequired}
            </button>
          ) : (
            <span
              className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide ${
                status === 'claimed'
                  ? 'border-teal-300/25 bg-teal-300/[0.08] text-teal-100'
                  : 'border-white/8 bg-white/[0.035] text-slate-500'
              }`}
              key={milestone.id}
            >
              {status === 'claimed' ? '✓' : '🔒'} Lv{milestone.levelRequired}
            </span>
          );
        })}
      </div>
    </div>
  );
}
