import { useEffect, useMemo, useRef, useState } from 'react';
import { pushFeedback } from './feedback/feedbackQueue';
import { achievementDefinitions } from '../data/achievements';
import { getCosmetic, type CosmeticType } from '../data/cosmetics';
import { gameMilestones } from '../data/gameMilestones';
import { games } from '../data/games';
import { questDefinitions } from '../data/quests';
import { rewardDefinitions, type RewardDefinition } from '../data/rewards';
import { buildPlayerProfileSummary, emptyValueLabel } from '../progression/playerProfile';
import { getQuestStreak } from '../progression/quests';
import { getAchievementUnlocks, getQuestProgress, syncRetroactiveAchievements } from '../progression/progressionEngine';
import { claimReward, equipCosmetic, getEquippedCosmetics, getRewardStatus, unequipCosmetic } from '../progression/rewardHelpers';
import { playNormalClickSound } from '../services/audio';
import { claimLegacyScores, fetchLegacyScoreCount } from '../services/legacyScores';
import { findLegacyScoresForPlayer } from '../services/storage';
import type { AchievementDefinition, AchievementRarity } from '../progression/types';
import type { DeviceType, GameId, LocalProfile, PlayerGameProgressSummary, PlayerProfileSummary, ScoreStats } from '../types';
import { formatPercent } from '../utils/format';

type PlayerHubProps = {
  onMilestoneClaim: (gameId: GameId, milestoneId: string) => void;
  onQuestClaim: (questId: string, periodId: string) => void;
  onRename: (name: string) => void;
  profile: LocalProfile;
  revision: number;
};

type PlayerHubTab = 'stats' | 'rewards' | 'achievements' | 'quests' | 'history';
type RewardFilter = 'all' | 'ready' | 'owned' | 'locked' | 'titles' | 'badges' | 'frames';
type AchievementFilter = 'all' | 'unlocked' | 'locked' | 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'by_game';
type RewardRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
type Accent = 'cyan' | 'violet' | 'amber' | 'teal';

const tabs: Array<{ id: PlayerHubTab; label: string }> = [
  { id: 'stats', label: 'Stats' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'quests', label: 'Quests' },
  { id: 'history', label: 'History' },
];

const rewardFilters: Array<{ id: RewardFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ready', label: 'Ready' },
  { id: 'owned', label: 'Owned' },
  { id: 'locked', label: 'Locked' },
  { id: 'titles', label: 'Titles' },
  { id: 'badges', label: 'Badges' },
  { id: 'frames', label: 'Frames' },
];

const achievementFilters: Array<{ id: AchievementFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'locked', label: 'Locked' },
  { id: 'common', label: 'Common' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'legendary', label: 'Legendary' },
  { id: 'mythic', label: 'Mythic' },
  { id: 'by_game', label: 'By game' },
];

const gameGlyphs: Record<GameId, string> = {
  'reaction-time': 'RT',
  'memory-test': 'MEM',
  'color-memory': 'CLR',
  'typing-speed': 'TYP',
  'symbol-match': 'SYM',
  'aim-test': 'AIM',
  'word-memory': 'WRD',
  'time-sense': 'TIM',
  'stroop-test': 'STR',
  'cps-test': 'CPS',
  'flappy-ball': 'FLP',
};

const rewardRarityStyles: Record<RewardRarity, { card: string; badge: string; fill: string; glow: string }> = {
  common: { card: 'border-slate-300/15 bg-slate-300/[0.04]', badge: 'border-slate-300/20 bg-slate-300/10 text-slate-200', fill: 'bg-slate-300', glow: 'shadow-[0_0_16px_rgba(148,163,184,0.10)]' },
  rare: { card: 'border-cyan-300/25 bg-cyan-300/[0.055]', badge: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100', fill: 'bg-cyan-300', glow: 'shadow-[0_0_22px_rgba(34,211,238,0.16)]' },
  epic: { card: 'border-violet-300/30 bg-violet-300/[0.065]', badge: 'border-violet-300/40 bg-violet-300/10 text-violet-100', fill: 'bg-violet-300', glow: 'shadow-[0_0_24px_rgba(168,85,247,0.18)]' },
  legendary: { card: 'border-amber-200/35 bg-amber-200/[0.07]', badge: 'border-amber-200/45 bg-amber-200/10 text-amber-100', fill: 'bg-amber-200', glow: 'shadow-[0_0_26px_rgba(251,191,36,0.16)]' },
  mythic: { card: 'border-fuchsia-200/35 bg-fuchsia-300/[0.07]', badge: 'border-fuchsia-200/45 bg-fuchsia-300/10 text-fuchsia-100', fill: 'bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200', glow: 'shadow-[0_0_28px_rgba(217,70,239,0.16)]' },
};

const achievementRarityStyles: Record<Exclude<AchievementRarity, 'hidden'>, { card: string; badge: string; fill: string; icon: string }> = {
  common: { card: 'border-slate-300/15 bg-slate-300/[0.035]', badge: 'border-slate-300/20 bg-slate-300/10 text-slate-200', fill: 'bg-slate-300', icon: 'text-slate-200' },
  rare: { card: 'border-cyan-300/25 bg-cyan-300/[0.055] shadow-[0_0_18px_rgba(34,211,238,0.10)]', badge: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100', fill: 'bg-cyan-300', icon: 'text-cyan-100' },
  epic: { card: 'border-violet-300/30 bg-violet-300/[0.065] shadow-[0_0_20px_rgba(168,85,247,0.12)]', badge: 'border-violet-300/40 bg-violet-300/10 text-violet-100', fill: 'bg-violet-300', icon: 'text-violet-100' },
  legendary: { card: 'border-amber-200/35 bg-amber-200/[0.075] shadow-[0_0_24px_rgba(251,191,36,0.13)]', badge: 'border-amber-200/45 bg-amber-200/10 text-amber-100', fill: 'bg-amber-200', icon: 'text-amber-100' },
  mythic: { card: 'border-fuchsia-200/35 bg-fuchsia-300/[0.075] shadow-[0_0_26px_rgba(217,70,239,0.14)]', badge: 'border-fuchsia-200/45 bg-fuchsia-300/10 text-fuchsia-100', fill: 'bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200', icon: 'text-fuchsia-100' },
};

const questRarityStyles = {
  common: 'border-slate-300/20 bg-slate-300/[0.05] text-slate-100',
  rare: 'border-cyan-300/30 bg-cyan-300/[0.07] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.10)]',
  epic: 'border-violet-300/35 bg-violet-300/[0.08] text-violet-100 shadow-[0_0_18px_rgba(168,85,247,0.12)]',
  legendary: 'border-amber-200/40 bg-amber-200/[0.09] text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.14)]',
};

const questCategoryLabels: Record<string, string> = {
  accuracy: 'PRECISION',
  speed: 'SPEED',
  precision: 'PRECISION',
  survival: 'SURVIVAL',
  focus: 'FOCUS',
  streak: 'STREAK',
  combo: 'COMBO',
  consistency: 'CONSISTENCY',
  mastery: 'MASTERY',
  arcade: 'ARCADE',
  flawless: 'NO MISS',
  personal_best: 'PB',
  participation: 'RUN',
  xp: 'XP',
  skill: 'SKILL',
  challenge: 'CHALLENGE',
  exploration: 'EXPLORE',
};

function accentClass(accent: Accent): string {
  return {
    cyan: 'border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100',
    violet: 'border-violet-300/20 bg-violet-300/[0.06] text-violet-100',
    amber: 'border-amber-300/20 bg-amber-300/[0.06] text-amber-100',
    teal: 'border-teal-300/20 bg-teal-300/[0.06] text-teal-100',
  }[accent];
}

function getDeviceLabel(device?: DeviceType): string | undefined {
  if (device === 'mobile') return 'Mobile';
  if (device === 'tablet') return 'Tablet';
  if (device === 'desktop') return 'Desktop';
  return undefined;
}

function getGameTitle(gameId?: string): string {
  return gameId ? games.find((game) => game.id === gameId)?.title ?? gameId : emptyValueLabel;
}

function getRewardRarity(reward: RewardDefinition): RewardRarity {
  if (reward.requirement.type !== 'gameLevel') return 'common';
  if (reward.requirement.value >= 25) return 'mythic';
  if (reward.requirement.value >= 15) return 'legendary';
  if (reward.requirement.value >= 10) return 'epic';
  if (reward.requirement.value >= 5) return 'rare';
  return 'common';
}

function getRewardTypeLabel(type: CosmeticType): string {
  return { title: 'Title', badge: 'Badge', frame: 'Frame' }[type];
}

function getRewardProgress(reward: RewardDefinition, gameProgressById: Map<GameId, PlayerGameProgressSummary>) {
  const required = reward.requirement.value;
  const current = reward.gameId ? gameProgressById.get(reward.gameId)?.level ?? 0 : 0;
  return { current, required, percent: required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0 };
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function readStat(stats: ScoreStats | undefined, key: keyof ScoreStats): number {
  const value = stats?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getAchievementProgress(achievement: AchievementDefinition, summary: PlayerProfileSummary, profile: LocalProfile) {
  const score = achievement.gameId ? profile.bestScores[achievement.gameId] : undefined;
  const gameProgress = achievement.gameId ? summary.gameProgressSummary.find((entry) => entry.gameId === achievement.gameId) : undefined;

  const build = (current: number, target: number, suffix = '') => ({
    current,
    target,
    percent: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    label: `${Math.min(current, target)}${suffix}/${target}${suffix}`,
  });

  switch (achievement.id) {
    case 'global-level-10':
      return build(summary.level, 10, ' LV');
    case 'reaction-under-200':
      return { current: score?.score ?? 999, target: 200, percent: score ? Math.min(100, Math.round((200 / Math.max(score.score, 1)) * 100)) : 0, label: score ? `${score.score} ms` : '< 200 ms' };
    case 'typing-perfect-accuracy':
      return build(readStat(score?.stats, 'accuracy'), 100, '%');
    case 'typing-80-wpm':
      return build(score?.score ?? 0, 80, ' WPM');
    case 'typing-100-wpm':
      return build(score?.score ?? 0, 100, ' WPM');
    case 'typing-120-wpm':
      return build(score?.score ?? 0, 120, ' WPM');
    case 'typing-hard-complete':
      return { current: 0, target: 1, percent: score?.stats?.difficulty === 'hard' ? 100 : 0, label: 'HARD mode' };
    case 'typing-polish-mastery':
      return build(score?.stats?.difficulty === 'hard' ? readStat(score.stats, 'accuracy') : 0, 98, '%');
    case 'color-memory-95-best':
      return build(Math.max(readStat(score?.stats, 'bestSimilarity'), readStat(score?.stats, 'avgSimilarity')), 95, '%');
    case 'aim-perfect-accuracy':
    case 'stroop-no-miss':
    case 'word-memory-flawless':
      return build(score && readStat(score.stats, 'misses') === 0 ? 1 : 0, 1);
    case 'aim-infinity-survive-60':
      return build(readStat(score?.stats, 'survivedTime'), 60, 's');
    case 'aim-hp-recovered':
      return build(readStat(score?.stats, 'hpRecovered'), 1);
    case 'aim-30s-95-accuracy':
      return build(readStat(score?.stats, 'accuracy'), 95, '%');
    case 'aim-15s-combo-20':
    case 'stroop-combo-20':
      return build(Math.max(readStat(score?.stats, 'combo'), readStat(score?.stats, 'bestCombo'), readStat(score?.stats, 'longestStreak')), 20);
    case 'symbol-match-low-move':
      return { current: score?.score ?? 99, target: 10, percent: score ? Math.min(100, Math.round((10 / Math.max(score.score, 1)) * 100)) : 0, label: score ? `${score.score} moves` : '<= 10 moves' };
    case 'flappy-score-10':
      return build(score?.score ?? 0, 10);
    case 'flappy-score-25':
      return build(score?.score ?? 0, 25);
    case 'flappy-score-50':
      return build(score?.score ?? 0, 50);
    case 'flappy-score-100':
      return build(score?.score ?? 0, 100);
    case 'flappy-survive-60':
      return build(readStat(score?.stats, 'survivedTimeSeconds'), 60, 's');
    case 'flappy-efficiency-70':
      return build(readStat(score?.stats, 'efficiency'), 70, '%');
    case 'cps-10':
      return build(score?.score ?? 0, 10, ' CPS');
    case 'cps-15':
      return build(score?.score ?? 0, 15, ' CPS');
    case 'cps-alternating-mastery':
      return build(readStat(score?.stats, 'totalClicks'), 30);
    case 'cps-endurance-30':
      return build(readStat(score?.stats, 'totalClicks'), 200);
    case 'stroop-fast-reaction':
      return { current: readStat(score?.stats, 'averageReactionMs'), target: 650, percent: score ? Math.min(100, Math.round((650 / Math.max(readStat(score.stats, 'averageReactionMs'), 1)) * 100)) : 0, label: score ? `${readStat(score.stats, 'averageReactionMs')} ms` : '< 650 ms' };
    case 'time-sense-perfect':
      return build(readStat(score?.stats, 'isPerfect'), 1);
    case 'time-sense-ultra-precision':
      return { current: readStat(score?.stats, 'deviationMs'), target: 50, percent: score ? Math.min(100, Math.round((50 / Math.max(readStat(score.stats, 'deviationMs'), 1)) * 100)) : 0, label: score ? `${readStat(score.stats, 'deviationMs')} ms` : '<= 50 ms' };
    case 'time-sense-low-deviation':
      return { current: readStat(score?.stats, 'deviationMs'), target: 200, percent: score ? Math.min(100, Math.round((200 / Math.max(readStat(score.stats, 'deviationMs'), 1)) * 100)) : 0, label: score ? `${readStat(score.stats, 'deviationMs')} ms` : '<= 200 ms' };
    default:
      return { current: gameProgress?.level ?? 0, target: 1, percent: gameProgress ? 100 : 0, label: achievement.targetLabel ?? 'Target' };
  }
}

function getQuestHint(quest: { description: string; seasonalTags?: string[] }): string {
  if (quest.description.includes('·')) return quest.description;
  const source = quest.seasonalTags?.[0];
  return source ? `${source} · ${quest.description}` : quest.description;
}

function getQuestResetLabel(type: 'daily' | 'weekly'): string {
  const now = new Date();
  const reset = new Date(now);
  if (type === 'daily') reset.setHours(24, 0, 0, 0);
  else {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    reset.setDate(now.getDate() + daysUntilMonday);
    reset.setHours(0, 0, 0, 0);
  }
  const diffMs = Math.max(0, reset.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

function getMilestoneStatus(gameProgress: PlayerGameProgressSummary, milestoneId: string, levelRequired: number) {
  return gameProgress.milestonesClaimed.includes(milestoneId) ? 'claimed' : gameProgress.level >= levelRequired ? 'ready' : 'locked';
}

function CompactStat({ label, value, accent = 'cyan' }: { label: string; value?: string; accent?: Accent }) {
  return (
    <div className={`min-w-0 rounded-xl border px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 ${accentClass(accent)}`}>
      <strong className={`block truncate text-lg font-black ${value ? 'text-white' : 'text-slate-500'}`}>{value ?? emptyValueLabel}</strong>
      <span className="mt-1 block truncate text-[0.58rem] font-black uppercase tracking-[0.14em] opacity-70">{label}</span>
    </div>
  );
}

function HighlightCard({ accent = 'cyan', icon, label, primary }: { accent?: Accent; icon: string; label: string; primary?: string }) {
  return (
    <div className={`relative min-h-[7rem] overflow-hidden rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 ${accentClass(accent)}`}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25 text-[0.62rem] font-black text-white">{icon}</span>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.14em] opacity-70">Best</span>
      </div>
      <strong className="mt-3 block truncate text-2xl font-black text-white">{primary ?? emptyValueLabel}</strong>
      <span className="mt-1 block truncate text-[0.62rem] font-black uppercase tracking-[0.16em] opacity-75">{label}</span>
    </div>
  );
}

function BestScoreTile({ gameId, metric, title, value }: { gameId: GameId; metric: string; title: string; value?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/22 px-3 py-3 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/[0.045]">
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-cyan-300/15 bg-cyan-300/[0.06] text-[0.58rem] font-black text-cyan-100">{gameGlyphs[gameId]}</span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-300">{title}</span>
      </div>
      <strong className={`mt-2 block truncate text-xl font-black ${value ? 'text-white' : 'text-slate-500'}`}>{value ?? emptyValueLabel}</strong>
      <span className="mt-0.5 block truncate text-[0.58rem] font-black uppercase tracking-[0.14em] text-slate-500">{metric}</span>
    </div>
  );
}

function RewardPreview({ reward }: { reward: RewardDefinition }) {
  const cosmetic = getCosmetic(reward.reward.id, reward.reward.type);
  if (reward.reward.type === 'title') {
    return <div className="rounded-xl border border-white/10 bg-black/25 p-2.5"><span className="block text-[0.55rem] font-black uppercase tracking-[0.16em] text-slate-500">Title preview</span><strong className="mt-1.5 block truncate bg-gradient-to-r from-cyan-100 via-violet-100 to-amber-100 bg-clip-text text-lg font-black text-transparent">{cosmetic?.label ?? reward.label}</strong></div>;
  }
  if (reward.reward.type === 'badge') {
    return <div className="rounded-xl border border-white/10 bg-black/25 p-2.5"><span className="block text-[0.55rem] font-black uppercase tracking-[0.16em] text-slate-500">Badge preview</span><span className={`mt-1.5 inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] ${cosmetic?.className ?? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'}`}><span className="truncate">{cosmetic?.label ?? reward.label}</span></span></div>;
  }
  return <div className={`rounded-xl border border-white/10 bg-black/25 p-2.5 ${cosmetic?.className ?? ''}`}><span className="block text-[0.55rem] font-black uppercase tracking-[0.16em] text-slate-500">Frame preview</span><div className="mt-1.5 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-2 py-2"><span className="grid h-7 w-7 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-white">P</span><div className="min-w-0"><strong className="block truncate text-xs text-white">Player</strong><span className="block truncate text-[0.6rem] text-slate-500">{cosmetic?.label ?? reward.label}</span></div></div></div>;
}
function PrestigeRewardCard({ onClaim, onEquip, onUnequip, progress, reward }: { onClaim: (reward: RewardDefinition) => void; onEquip: (reward: RewardDefinition) => void; onUnequip: (type: CosmeticType) => void; progress: { current: number; required: number; percent: number }; reward: RewardDefinition }) {
  const status = getRewardStatus(reward);
  const cosmetic = getCosmetic(reward.reward.id, reward.reward.type);
  const equippedCosmetics = getEquippedCosmetics();
  const isEquipped = equippedCosmetics[reward.reward.type] === reward.reward.id;
  const rarity = getRewardRarity(reward);
  const styles = rewardRarityStyles[rarity];
  const ready = status === 'ready';
  const claimed = status === 'claimed';
  const compact = claimed;

  return (
    <article className={`group relative self-start overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 ${compact ? 'p-2.5' : 'p-3'} ${styles.card} ${ready ? `quest-reward-ready ${styles.glow}` : ''} ${isEquipped ? 'ring-1 ring-cyan-200/25 shadow-[0_0_18px_rgba(34,211,238,0.12)]' : ''}`}>
      {ready && <div className="pointer-events-none absolute inset-y-0 -left-20 w-16 rotate-12 bg-white/12 blur-sm transition duration-700 group-hover:translate-x-[30rem]" />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {compact && <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-[0.58rem] font-black uppercase ${isEquipped ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-black/25 text-slate-300'}`}>{reward.reward.type.slice(0, 1)}</span>}
          <div className="min-w-0">
          <p className="truncate text-sm font-black text-white">{cosmetic?.label ?? reward.label}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{reward.gameId ? getGameTitle(reward.gameId) : 'Global'} · Lv {reward.requirement.value}</p>
          </div>
        </div>
        <div className={`flex shrink-0 items-end gap-1 ${compact ? 'flex-row flex-wrap justify-end' : 'flex-col'}`}>
          <span className={`rounded-full border px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em] ${styles.badge}`}>{rarity.toUpperCase()}</span>
          <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.12em] text-slate-300">{getRewardTypeLabel(reward.reward.type)}</span>
        </div>
      </div>

      {!claimed && <div className="mt-2"><RewardPreview reward={reward} /></div>}
      {!claimed && (
        <div className="mt-2 rounded-lg border border-white/8 bg-black/18 p-2">
          <div className="flex items-center justify-between gap-2 text-[0.62rem] font-black uppercase tracking-[0.12em] text-slate-500">
            <span>{ready ? 'Unlock ready' : `Next: Lv ${progress.required}`}</span>
            <span className="text-slate-300">Lv {progress.current}/{progress.required}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-700 ${styles.fill}`} style={{ width: `${progress.percent}%` }} /></div>
        </div>
      )}

      <div className={`${compact ? 'mt-2 border-t border-white/8 pt-2' : 'mt-2'} flex flex-wrap items-center justify-between gap-2`}>
        <span className={`text-[0.65rem] font-black uppercase ${ready ? 'text-cyan-100' : claimed ? 'text-teal-100' : 'text-slate-500'}`}>{ready ? 'READY' : claimed && isEquipped ? 'EQUIPPED' : claimed ? 'OWNED' : `NEXT: LV ${progress.required}`}</span>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          {ready && <button className="rounded-md bg-cyan-300 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-100 max-sm:w-full" onClick={() => onClaim(reward)} type="button">Claim</button>}
          {claimed && isEquipped && <button className="rounded-md border border-teal-300/25 bg-teal-300/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-teal-100 transition hover:bg-teal-300/15 max-sm:w-full" onClick={() => onUnequip(reward.reward.type)} type="button">Unequip</button>}
          {claimed && !isEquipped && <button className="rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-300/15 max-sm:w-full" onClick={() => onEquip(reward)} type="button">Equip</button>}
        </div>
      </div>
    </article>
  );
}

function RewardsIdentityShowcase({ deviceLabel, displayName, equippedBadge, equippedFrame, equippedTitle, level, readyCount, xpPercent }: { deviceLabel?: string; displayName: string; equippedBadge?: ReturnType<typeof getCosmetic>; equippedFrame?: ReturnType<typeof getCosmetic>; equippedTitle?: ReturnType<typeof getCosmetic>; level: number; readyCount: number; xpPercent: number }) {
  return (
    <section className={`relative overflow-hidden rounded-3xl border border-cyan-300/14 bg-black/24 p-3 sm:p-4 ${equippedFrame?.className ?? ''}`}>
      <div className="pointer-events-none absolute -left-20 -top-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(15rem,0.55fr)_minmax(15rem,0.55fr)]">
        <div className="flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-slate-950 text-2xl font-black text-white shadow-[0_0_28px_rgba(34,211,238,0.16)]">
            <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(rgb(34 211 238) ${xpPercent}%, rgba(255,255,255,0.08) 0)` }} />
            <div className="absolute inset-1.5 rounded-full bg-slate-950" />
            <span className="relative">{displayName.slice(0, 1).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.14em] text-cyan-100">LV {level}</span>
              {deviceLabel && <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.14em] text-slate-300">{deviceLabel}</span>}
              {readyCount > 0 && <span className="quest-reward-ready rounded-full border border-cyan-300/35 bg-cyan-300/12 px-2 py-0.5 text-[0.56rem] font-black uppercase tracking-[0.14em] text-cyan-100">{readyCount} READY</span>}
            </div>
            <h3 className="mt-1.5 truncate text-xl font-black text-white">{displayName}</h3>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
              {equippedTitle ? <span className="truncate rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-violet-100">{equippedTitle.label}</span> : <span className="text-xs text-slate-500">No title equipped</span>}
              {equippedBadge && <span className={`truncate rounded-full border px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.14em] ${equippedBadge.className ?? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'}`}>{equippedBadge.label}</span>}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-700 shadow-[0_0_16px_rgba(34,211,238,0.5)]" style={{ width: `${xpPercent}%` }} /></div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><span className="text-[0.56rem] font-black uppercase tracking-[0.16em] text-slate-500">Leaderboard preview</span><div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-cyan-300/16 bg-cyan-300/[0.055] px-2.5 py-2"><div className="flex min-w-0 items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100">#7</span><div className="min-w-0"><strong className="block truncate text-sm text-white">{displayName}</strong><span className="block truncate text-[0.62rem] text-slate-400">{equippedTitle?.label ?? 'Arcade Player'}</span></div></div>{equippedBadge && <span className={`max-w-[6rem] truncate rounded-full border px-1.5 py-0.5 text-[0.52rem] font-black uppercase ${equippedBadge.className ?? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'}`}>{equippedBadge.label}</span>}</div></div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3"><span className="text-[0.56rem] font-black uppercase tracking-[0.16em] text-slate-500">Mini profile preview</span><div className={`mt-2 rounded-xl border border-white/10 bg-black/25 p-2.5 ${equippedFrame?.className ?? ''}`}><div className="flex items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-white">{displayName.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm text-white">{displayName}</strong><span className="block truncate text-xs text-slate-400">{equippedTitle?.label ?? 'No active title'}</span></div></div></div></div>
      </div>
    </section>
  );
}
function GameLevelCard({ gameProgress, onMilestoneClaim }: { gameProgress: PlayerGameProgressSummary; onMilestoneClaim: (gameId: GameId, milestoneId: string) => void }) {
  const milestones = gameMilestones.filter((milestone) => milestone.gameId === gameProgress.gameId).slice(0, 3);
  const nextReward = rewardDefinitions.find((reward) => reward.gameId === gameProgress.gameId && reward.requirement.type === 'gameLevel' && reward.requirement.value > gameProgress.level);
  const nextRewardCosmetic = nextReward ? getCosmetic(nextReward.reward.id, nextReward.reward.type) : undefined;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/[0.04]">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] text-[0.58rem] font-black text-cyan-100">{gameGlyphs[gameProgress.gameId]}</span><div className="min-w-0"><span className="block truncate font-black text-white">{gameProgress.gameTitle}</span><span className="mt-0.5 block truncate text-xs text-slate-500">Best {gameProgress.bestScoreLabel ?? emptyValueLabel}</span></div></div><strong className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">LV {gameProgress.level}</strong></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-500 shadow-[0_0_14px_rgba(34,211,238,0.5)]" style={{ width: `${gameProgress.levelProgressPercent}%` }} /></div>
      <div className="mt-3 rounded-xl border border-white/8 bg-black/18 px-3 py-2 text-xs text-slate-400">Next: <span className="text-slate-200">{nextRewardCosmetic && nextReward ? `${getRewardTypeLabel(nextReward.reward.type)} · ${nextRewardCosmetic.label}` : 'Mastery loop'}</span></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{milestones.map((milestone) => { const status = getMilestoneStatus(gameProgress, milestone.id, milestone.levelRequired); const ready = status === 'ready'; const milestoneReward = rewardDefinitions.find((reward) => reward.gameId === gameProgress.gameId && reward.requirement.type === 'gameLevel' && reward.requirement.value === milestone.levelRequired); const rewardLabel = milestoneReward ? getRewardTypeLabel(milestoneReward.reward.type) : 'XP'; return ready ? <button className="rounded-full border border-cyan-300/45 bg-cyan-300 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.28)] transition hover:bg-cyan-100" key={milestone.id} onClick={() => { playNormalClickSound(); onMilestoneClaim(gameProgress.gameId, milestone.id); }} type="button">Claim Lv{milestone.levelRequired}</button> : <span className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide ${status === 'claimed' ? 'border-teal-300/25 bg-teal-300/[0.08] text-teal-100' : 'border-white/8 bg-white/[0.035] text-slate-500'}`} key={milestone.id}>{status === 'claimed' ? 'OK' : 'LOCK'} Lv{milestone.levelRequired} → {rewardLabel}</span>; })}</div>
    </div>
  );
}

function LegacyScoresPanel({
  canClaim,
  claimStatus,
  count,
  error,
  onCancel,
  onClaim,
  username,
}: {
  canClaim: boolean;
  claimStatus: 'idle' | 'confirm' | 'claiming' | 'done' | 'error';
  count: number;
  error: string | null;
  onCancel: () => void;
  onClaim: () => void;
  username: string;
}) {
  if (claimStatus === 'done') {
    return (
      <section className="rounded-2xl border border-teal-300/20 bg-teal-300/[0.045] p-4">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-teal-100">Stare wyniki</h3>
        <p className="mt-2 text-sm text-slate-300">Wyniki połączone z profilem.</p>
      </section>
    );
  }

  if (count <= 0) return null;

  const isConfirming = claimStatus === 'confirm';
  const isClaiming = claimStatus === 'claiming';

  return (
    <section className={`rounded-2xl border p-4 ${isConfirming ? 'border-amber-200/35 bg-amber-200/[0.055]' : 'border-cyan-300/18 bg-cyan-300/[0.045]'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Stare wyniki</h3>
          <p className="mt-2 text-sm text-slate-300">
            {isConfirming ? 'Połączyć stare wyniki?' : `Wykryto ${count} starych wyników dla nicku ${username}.`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isConfirming ? `Ta akcja przypisze wyniki z nickiem ${username} do obecnego profilu ID.` : 'To przypisze stare wyniki do obecnego profilu.'}
          </p>
          {!canClaim && <p className="mt-2 text-xs text-amber-100">Claim wymaga nowego ID profilu gh2_.</p>}
          {error && <p className="mt-2 text-xs text-rose-200">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isConfirming && (
            <button className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/10" onClick={onCancel} type="button">
              Anuluj
            </button>
          )}
          <button
            className="rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canClaim || isClaiming}
            onClick={onClaim}
            type="button"
          >
            {isClaiming ? 'Łączenie...' : isConfirming ? 'Połącz' : 'Połącz z profilem'}
          </button>
        </div>
      </div>
    </section>
  );
}

export function PlayerHub({ onMilestoneClaim, onQuestClaim, onRename, profile, revision }: PlayerHubProps) {
  const [activeTab, setActiveTab] = useState<PlayerHubTab>('stats');
  const [draftName, setDraftName] = useState(profile.playerName);
  const [activeQuestHintId, setActiveQuestHintId] = useState<string | null>(null);
  const [rewardRevision, setRewardRevision] = useState(0);
  const [rewardFilter, setRewardFilter] = useState<RewardFilter>('all');
  const [achievementFilter, setAchievementFilter] = useState<AchievementFilter>('all');
  const [achievementRevision, setAchievementRevision] = useState(0);
  const [legacyScoreCount, setLegacyScoreCount] = useState(0);
  const [legacyClaimStatus, setLegacyClaimStatus] = useState<'idle' | 'confirm' | 'claiming' | 'done' | 'error'>('idle');
  const [legacyClaimError, setLegacyClaimError] = useState<string | null>(null);
  const retroSyncToastKeyRef = useRef<string>('');
  const summary = buildPlayerProfileSummary(profile);
  const gameProgressById = useMemo(() => new Map(summary.gameProgressSummary.map((entry) => [entry.gameId, entry])), [summary.gameProgressSummary]);
  const questProgress = getQuestProgress();
  const questStreak = getQuestStreak();
  const achievementUnlocks = getAchievementUnlocks();
  const unlockById = new Map(achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]));
  const unlockedIds = new Set(unlockById.keys());
  const latestAchievementUnlock = [...achievementUnlocks].sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())[0];
  const latestAchievement = latestAchievementUnlock ? achievementDefinitions.find((achievement) => achievement.id === latestAchievementUnlock.achievementId) : undefined;
  const achievementCompletionPercent = achievementDefinitions.length > 0 ? Math.round((unlockedIds.size / achievementDefinitions.length) * 100) : 0;
  const unlockedRarityCounts = achievementDefinitions.reduce<Record<string, number>>((counts, achievement) => {
    if (unlockedIds.has(achievement.id)) counts[achievement.rarity] = (counts[achievement.rarity] ?? 0) + 1;
    return counts;
  }, {});
  const favoriteAchievementRarity = Object.entries(unlockedRarityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';
  const filteredAchievements = achievementDefinitions.filter((achievement) => {
    const unlocked = unlockedIds.has(achievement.id);
    if (achievementFilter === 'all') return true;
    if (achievementFilter === 'unlocked') return unlocked;
    if (achievementFilter === 'locked') return !unlocked;
    if (achievementFilter === 'by_game') return Boolean(achievement.gameId);
    return achievement.rarity === achievementFilter;
  });
  const readyRewards = rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'ready');
  const lockedRewards = rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'locked');
  const equippedCosmetics = getEquippedCosmetics();
  const equippedTitle = getCosmetic(equippedCosmetics.title, 'title');
  const equippedBadge = getCosmetic(equippedCosmetics.badge, 'badge');
  const equippedFrame = getCosmetic(equippedCosmetics.frame, 'frame');
  const deviceLabel = getDeviceLabel(summary.lastSeenDevice ?? summary.createdOnDevice);
  const canClaimLegacyOnline = profile.playerId.startsWith('gh2_');
  const mostPlayedGameTitle = getGameTitle(summary.favoriteGame);
  const bestGameTitle = getGameTitle(summary.bestGame);
  const nextRewardPreview = readyRewards[0] ?? lockedRewards[0];
  const nextRewardCosmetic = nextRewardPreview ? getCosmetic(nextRewardPreview.reward.id, nextRewardPreview.reward.type) : undefined;
  const filteredRewards = rewardDefinitions.filter((reward) => {
    const status = getRewardStatus(reward);
    if (rewardFilter === 'all') return true;
    if (rewardFilter === 'ready') return status === 'ready';
    if (rewardFilter === 'owned') return status === 'claimed';
    if (rewardFilter === 'locked') return status === 'locked';
    if (rewardFilter === 'titles') return reward.reward.type === 'title';
    if (rewardFilter === 'badges') return reward.reward.type === 'badge';
    if (rewardFilter === 'frames') return reward.reward.type === 'frame';
    return true;
  });
  const topHighlights = [
    { icon: 'RT', label: 'Reaction', value: summary.highlights.bestReactionTime?.scoreLabel, accent: 'cyan' as Accent },
    { icon: 'TYP', label: 'Typing', value: summary.highlights.bestTypingWpm?.scoreLabel, accent: 'teal' as Accent },
    { icon: 'AIM', label: 'Aim', value: summary.highlights.bestAimAccuracy?.stats?.accuracy !== undefined ? formatPercent(summary.highlights.bestAimAccuracy.stats.accuracy) : undefined, accent: 'amber' as Accent },
  ];
  const extraHighlights = [
    { label: 'Color', value: summary.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined ? formatPercent(summary.highlights.bestColorSimilarity.stats.bestSimilarity) : undefined, accent: 'violet' as Accent },
    { label: 'Word', value: summary.highlights.bestWordMemoryScore?.scoreLabel, accent: 'cyan' as Accent },
    { label: 'Memory', value: summary.highlights.highestMemoryLevel?.scoreLabel, accent: 'teal' as Accent },
    { label: 'Time', value: summary.highlights.bestTimeSenseScore?.scoreLabel, accent: 'violet' as Accent },
    { label: 'Stroop', value: summary.highlights.bestStroopScore?.scoreLabel, accent: 'cyan' as Accent },
    { label: 'CPS', value: summary.highlights.bestCps?.scoreLabel, accent: 'teal' as Accent },
    { label: 'Flappy', value: summary.highlights.bestFlappyScore?.scoreLabel, accent: 'amber' as Accent },
    { label: 'Alt CPS', value: summary.highlights.bestAlternatingCps?.scoreLabel, accent: 'violet' as Accent },
  ];

  const refreshRewards = () => setRewardRevision((value) => value + 1);
  const handleClaimReward = (reward: RewardDefinition) => {
    playNormalClickSound();
    const result = claimReward(reward.id);
    const cosmetic = getCosmetic(reward.reward.id, reward.reward.type);
    if (result.ok) {
      pushFeedback({ type: 'reward', title: 'NAGRODA', message: cosmetic?.label ?? reward.label, detail: 'Ready to equip', priority: 'high' });
      refreshRewards();
    }
  };
  const handleClaimAll = () => {
    playNormalClickSound();
    let claimedCount = 0;
    readyRewards.forEach((reward) => { if (claimReward(reward.id).ok) claimedCount += 1; });
    if (claimedCount > 0) {
      pushFeedback({ type: 'reward', title: 'NAGRODY', message: `${claimedCount} odebrane`, detail: 'Profil zaktualizowany', priority: 'high' });
      refreshRewards();
    }
  };
  const handleEquipReward = (reward: RewardDefinition) => {
    playNormalClickSound();
    const result = equipCosmetic(reward.reward.id);
    if (result.ok) {
      pushFeedback({ type: 'reward', title: 'EQUIPPED', message: result.cosmetic.label, priority: 'medium' });
      refreshRewards();
    }
  };
  const handleUnequipReward = (type: CosmeticType) => {
    playNormalClickSound();
    const result = unequipCosmetic(type);
    if (result.ok) {
      pushFeedback({ type: 'reward', title: 'UNEQUIPPED', message: getRewardTypeLabel(type), priority: 'medium' });
      refreshRewards();
    }
  };
  const handleLegacyClaim = async () => {
    playNormalClickSound();

    if (legacyClaimStatus !== 'confirm') {
      setLegacyClaimError(null);
      setLegacyClaimStatus('confirm');
      return;
    }

    setLegacyClaimStatus('claiming');
    setLegacyClaimError(null);

    try {
      const result = await claimLegacyScores(profile.playerId, profile.playerName);
      setLegacyScoreCount(0);
      setLegacyClaimStatus('done');
      pushFeedback({
        type: 'reward',
        title: result.updated > 0 ? 'WYNIKI POŁĄCZONE' : 'STARE WYNIKI',
        message: result.updated > 0 ? `Przypisano ${result.updated}` : 'Brak wyników',
        detail: result.skippedConflicts > 0 ? `${result.skippedConflicts} pominięto` : undefined,
        priority: result.updated > 0 ? 'high' : 'medium',
      });
    } catch (error) {
      setLegacyClaimStatus('error');
      setLegacyClaimError(error instanceof Error ? error.message : 'Nie udało się połączyć wyników.');
    }
  };

  useEffect(() => setDraftName(profile.playerName), [profile.playerName]);
  useEffect(() => {
    let cancelled = false;
    const localLegacyCount = findLegacyScoresForPlayer(profile.playerName).length;

    setLegacyClaimError(null);
    setLegacyClaimStatus((current) => (current === 'done' ? current : 'idle'));

    if (!canClaimLegacyOnline) {
      setLegacyScoreCount(localLegacyCount);
      return () => {
        cancelled = true;
      };
    }

    fetchLegacyScoreCount(profile.playerName, profile.playerId)
      .then((onlineCount) => {
        if (!cancelled) setLegacyScoreCount(Math.max(localLegacyCount, onlineCount));
      })
      .catch((error) => {
        if (!cancelled) {
          setLegacyScoreCount(localLegacyCount);
          if (import.meta.env.DEV) {
            console.debug('Legacy score dry run failed', {
              playerId: profile.playerId,
              username: profile.playerName,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [canClaimLegacyOnline, profile.playerId, profile.playerName, revision]);
  useEffect(() => {
    const retroUnlocks = syncRetroactiveAchievements(profile);
    if (retroUnlocks.length === 0) return;

    setAchievementRevision((value) => value + 1);
    const toastKey = retroUnlocks.map((unlock) => unlock.achievementId).sort().join('|');
    if (retroSyncToastKeyRef.current === toastKey) return;

    retroSyncToastKeyRef.current = toastKey;
    pushFeedback({
      type: 'achievement',
      title: retroUnlocks.length === 1 ? 'ACHIEVEMENT' : 'ACHIEVEMENTS',
      message: retroUnlocks.length === 1 ? 'Zaległe trofeum' : `${retroUnlocks.length} zaległych`,
      detail: 'Retro sync',
      priority: 'high',
    });
  }, [profile, revision]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setActiveQuestHintId(null); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/42 p-3 shadow-[0_0_45px_rgba(34,211,238,0.07)] sm:p-5" data-revision={`${revision}-${rewardRevision}-${achievementRevision}`}>
      <div className={`relative overflow-hidden rounded-3xl border border-cyan-300/12 bg-black/22 p-4 sm:p-5 ${equippedFrame?.className ?? ''}`}>
        <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(18rem,0.9fr)_minmax(18rem,0.75fr)] xl:items-center">
          <div className="flex min-w-0 items-center gap-4"><div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full border border-cyan-300/25 bg-slate-950 text-3xl font-black text-white shadow-[0_0_32px_rgba(34,211,238,0.18)]"><div className="absolute inset-0 rounded-full opacity-90" style={{ background: `conic-gradient(rgb(34 211 238) ${summary.levelProgressPercent}%, rgba(255,255,255,0.08) 0)` }} /><div className="absolute inset-1.5 rounded-full bg-slate-950" /><span className="relative">{summary.displayName.slice(0, 1).toUpperCase()}</span></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.16em] text-cyan-100">LV {summary.level}</span>{deviceLabel && <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-300">{deviceLabel}</span>}{readyRewards.length > 0 && <span className="quest-reward-ready rounded-full border border-cyan-300/35 bg-cyan-300/12 px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.16em] text-cyan-100">{readyRewards.length} READY</span>}</div><h2 className="mt-2 truncate text-3xl font-black tracking-tight text-white sm:text-4xl">{summary.displayName}</h2><div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">{equippedTitle && <span className="truncate rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-violet-100">{equippedTitle.label}</span>}{equippedBadge && <span className={`truncate rounded-full border px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] ${equippedBadge.className ?? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'}`}>{equippedBadge.label}</span>}</div></div></div>
          <div className="rounded-2xl border border-white/10 bg-black/22 p-4"><div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400"><span>Account XP</span><span>{summary.currentLevelXp}/{summary.nextLevelXp}</span></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-700 shadow-[0_0_18px_rgba(34,211,238,0.55)]" style={{ width: `${summary.levelProgressPercent}%` }} /></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400"><span className="truncate">Next: <span className="text-slate-200">{nextRewardCosmetic?.label ?? nextRewardPreview?.label ?? 'Reward track'}</span></span><span className="shrink-0 text-cyan-100">{Math.round(summary.levelProgressPercent)}%</span></div></div>
          <div className="grid grid-cols-2 gap-2"><CompactStat accent="cyan" label="Runs" value={String(summary.totalScoreEntries)} /><CompactStat accent="teal" label="Unlocked" value={`${summary.achievementsUnlocked}/${summary.achievementsTotal}`} /><CompactStat accent="amber" label="Streak" value={`${questStreak.currentStreak}d`} /><CompactStat accent="violet" label="Favorite" value={mostPlayedGameTitle} /></div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5 rounded-2xl border border-white/10 bg-black/22 p-1">
        {tabs.map((tab) => <button className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${activeTab === tab.id ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/8 hover:text-white'}`} key={tab.id} onClick={() => { playNormalClickSound(); setActiveTab(tab.id); }} type="button">{tab.label}{tab.id === 'rewards' && readyRewards.length > 0 && <span className="ml-2 rounded-full bg-slate-950/75 px-1.5 py-0.5 text-[0.58rem] text-cyan-100">{readyRewards.length}</span>}</button>)}
      </div>

      <div className="mt-5">
        {activeTab === 'stats' && <div className="space-y-5"><section><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Top highlights</h3><span className="text-xs text-slate-500">Best: {bestGameTitle}</span></div><div className="grid gap-3 lg:grid-cols-3">{topHighlights.map((item) => <HighlightCard accent={item.accent} icon={item.icon} key={item.label} label={item.label} primary={item.value} />)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{extraHighlights.map((item) => <CompactStat accent={item.accent} key={item.label} label={item.label} value={item.value} />)}</div></section><section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]"><div className="rounded-2xl border border-white/10 bg-black/18 p-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Best scores</h3><span className="text-xs text-slate-500">{summary.totalScoreEntries} entries</span></div><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{games.map((game) => <BestScoreTile gameId={game.id} key={game.id} metric={game.scoreName} title={game.title} value={profile.bestScores[game.id]?.scoreLabel} />)}</div></div><form className="rounded-2xl border border-white/10 bg-black/18 p-4" onSubmit={(event) => { event.preventDefault(); playNormalClickSound(); onRename(draftName); }}><h3 className="text-xs font-black uppercase tracking-[0.22em] text-slate-300">Identity</h3><input className="mt-3 w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500" maxLength={24} onChange={(event) => setDraftName(event.target.value)} placeholder="Nick" value={draftName} /><button className="mt-2 w-full rounded-md bg-teal-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-teal-200" type="submit">Zmień nick</button></form></section><LegacyScoresPanel canClaim={canClaimLegacyOnline} claimStatus={legacyClaimStatus} count={legacyScoreCount} error={legacyClaimError} onCancel={() => { playNormalClickSound(); setLegacyClaimStatus('idle'); }} onClaim={handleLegacyClaim} username={profile.playerName} /><section className="rounded-2xl border border-cyan-300/10 bg-black/18 p-4"><div className="mb-3 flex flex-wrap items-end justify-between gap-2"><h3 className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100">Game levels</h3>{summary.topGameLevels.length > 0 && <span className="text-xs text-slate-500">Top: {summary.topGameLevels[0].gameTitle} Lv. {summary.topGameLevels[0].level}</span>}</div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{summary.gameProgressSummary.map((gameProgress) => <GameLevelCard gameProgress={gameProgress} key={gameProgress.gameId} onMilestoneClaim={onMilestoneClaim} />)}</div></section></div>}

        {activeTab === 'rewards' && <div className="space-y-4"><RewardsIdentityShowcase deviceLabel={deviceLabel} displayName={summary.displayName} equippedBadge={equippedBadge} equippedFrame={equippedFrame} equippedTitle={equippedTitle} level={summary.level} readyCount={readyRewards.length} xpPercent={summary.levelProgressPercent} />{readyRewards.length > 0 && <section className="rounded-3xl border border-cyan-300/30 bg-cyan-300/[0.055] p-3 shadow-[0_0_30px_rgba(34,211,238,0.14)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Ready to claim</h3><p className="mt-0.5 text-xs text-slate-400">Reward drop waiting.</p></div>{readyRewards.length > 1 && <button className="rounded-xl bg-cyan-300 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-950 transition hover:bg-cyan-100" onClick={handleClaimAll} type="button">Claim all</button>}</div><div className="mt-3 grid items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3">{readyRewards.map((reward) => <PrestigeRewardCard key={reward.id} onClaim={handleClaimReward} onEquip={handleEquipReward} onUnequip={handleUnequipReward} progress={getRewardProgress(reward, gameProgressById)} reward={reward} />)}</div></section>}<section className="rounded-3xl border border-white/10 bg-black/18 p-3"><div className="sticky top-2 z-10 -mx-1 -mt-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur"><h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-200">Prestige track</h3><div className="flex flex-wrap gap-1.5">{rewardFilters.map((filter) => <button className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] transition ${rewardFilter === filter.id ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/30 hover:text-cyan-100'}`} key={filter.id} onClick={() => { playNormalClickSound(); setRewardFilter(filter.id); }} type="button">{filter.label}</button>)}</div></div>{filteredRewards.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Brak rewardów w tym filtrze.</p> : <div className="mt-3 grid items-start gap-2.5 md:grid-cols-2 xl:grid-cols-3">{filteredRewards.map((reward) => <PrestigeRewardCard key={reward.id} onClaim={handleClaimReward} onEquip={handleEquipReward} onUnequip={handleUnequipReward} progress={getRewardProgress(reward, gameProgressById)} reward={reward} />)}</div>}</section></div>}
        {activeTab === 'achievements' && <div className="space-y-4"><section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] p-4"><span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-cyan-100">Unlocked</span><strong className="mt-2 block text-3xl font-black text-white">{unlockedIds.size}/{achievementDefinitions.length}</strong><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-700 shadow-[0_0_16px_rgba(34,211,238,0.5)]" style={{ width: `${achievementCompletionPercent}%` }} /></div></div><CompactStat accent="violet" label="Completion" value={`${achievementCompletionPercent}%`} /><CompactStat accent="amber" label="Latest" value={latestAchievement?.title} /><CompactStat accent="teal" label="Top rarity" value={favoriteAchievementRarity.toUpperCase()} /></section><section className="sticky top-2 z-10 -mx-1 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 backdrop-blur"><h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-200">Trophy grid</h3><div className="flex flex-wrap gap-1.5">{achievementFilters.map((filter) => <button className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.12em] transition ${achievementFilter === filter.id ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-cyan-300/30 hover:text-cyan-100'}`} key={filter.id} onClick={() => { playNormalClickSound(); setAchievementFilter(filter.id); }} type="button">{filter.label}</button>)}</div></section>{filteredAchievements.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Brak achievementów w tym filtrze.</p> : <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{filteredAchievements.map((achievement) => { const unlocked = unlockedIds.has(achievement.id); const unlock = unlockById.get(achievement.id); const rarityKey = achievement.rarity === 'hidden' ? 'mythic' : achievement.rarity; const rarityStyle = achievementRarityStyles[rarityKey]; const progress = getAchievementProgress(achievement, summary, profile); const progressPercent = unlocked ? 100 : progress.percent; return <article className={`group relative overflow-hidden rounded-2xl border p-3.5 transition duration-200 hover:-translate-y-0.5 ${unlocked ? `${rarityStyle.card} achievement-shine` : 'border-white/10 bg-black/20 opacity-75 hover:opacity-95'}`} key={achievement.id}><div className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl ${unlocked ? 'bg-white/10' : 'bg-white/[0.035]'}`} /><div className="relative flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2.5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25 text-[0.62rem] font-black ${unlocked ? rarityStyle.icon : 'text-slate-500'}`}>{achievement.icon ?? 'ACH'}</span><div className="min-w-0"><h3 className="truncate text-sm font-black text-white">{achievement.title}</h3><div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] ${rarityStyle.badge}`}>{achievement.rarity}</span>{achievement.gameId && <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] text-slate-400">{gameGlyphs[achievement.gameId]}</span>}</div></div></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em] ${unlocked ? 'border-teal-300/30 bg-teal-300/10 text-teal-100' : 'border-white/10 bg-white/[0.035] text-slate-500'}`}>{unlocked ? 'Unlocked' : 'Locked'}</span></div><p className="relative mt-3 min-h-[2rem] text-xs leading-4 text-slate-400">{achievement.description}</p><div className="relative mt-3"><div className="flex items-center justify-between gap-2 text-[0.62rem] font-black uppercase tracking-[0.12em]"><span className={unlocked ? 'text-cyan-100' : 'text-slate-500'}>{unlocked ? 'Claimed trophy' : achievement.targetLabel ?? 'Target'}</span><span className="text-slate-500">{unlocked ? formatDate(unlock?.unlockedAt) : progress.label}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-700 ${unlocked ? rarityStyle.fill : 'bg-slate-500/60'}`} style={{ width: `${progressPercent}%` }} /></div></div><div className="relative mt-3 flex items-center justify-between gap-2 text-[0.62rem] uppercase tracking-[0.12em] text-slate-500"><span>{achievement.category}</span><span>+{achievement.xpReward ?? 0} XP</span></div></article>; })}</section>}</div>}

        {activeTab === 'quests' && <div className="space-y-3"><div className="grid gap-2 text-sm sm:grid-cols-2"><CompactStat accent="cyan" label="Daily streak" value={`${questStreak.currentStreak} dni`} /><CompactStat accent="violet" label="Best streak" value={`${questStreak.bestStreak} dni`} /></div><div className="grid gap-3 lg:grid-cols-2">{(['daily', 'weekly'] as const).map((type) => <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5" key={type}><div className="flex flex-wrap items-end justify-between gap-2"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">{type === 'daily' ? 'Daily quests' : 'Weekly quests'}</h3><span className="text-xs text-slate-500">{getQuestResetLabel(type)}</span></div><div className="mt-3 space-y-2">{questDefinitions.filter((quest) => quest.type === type).map((quest) => { const progress = questProgress.find((item) => item.questId === quest.id); const value = progress?.progress ?? 0; const percent = Math.min(100, Math.round((value / quest.target.amount) * 100)); const claimed = Boolean(progress?.isClaimed || progress?.claimedAt); const ready = Boolean(progress?.completed && !claimed); const statusLabel = claimed ? 'ODEBRANE' : ready ? 'ODBIERZ' : 'W TRAKCIE'; const questHint = getQuestHint(quest); return <div className={`group relative rounded-xl border px-3 py-3 transition duration-200 hover:-translate-y-0.5 ${claimed ? 'border-white/5 bg-black/20 opacity-65' : ready ? `${questRarityStyles[quest.rarity]} quest-reward-ready` : questRarityStyles[quest.rarity]}`} key={quest.id}><div className="flex items-start justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-semibold text-white"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 bg-black/25 text-xs">{quest.icon ?? 'Q'}</span><span className="min-w-0 truncate">{quest.title}</span><button aria-expanded={activeQuestHintId === quest.id} aria-label={`Opis questa: ${quest.title}`} className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] text-[0.65rem] font-black text-cyan-100/80 transition hover:border-cyan-200/45 hover:bg-cyan-200/12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200" onClick={(event) => { event.stopPropagation(); setActiveQuestHintId((current) => (current === quest.id ? null : quest.id)); }} title={questHint} type="button">i</button></span><span className="shrink-0 text-cyan-100">{value}/{quest.target.amount}</span></div><div className={`pointer-events-none absolute left-3 top-11 z-30 max-w-[260px] rounded-lg border border-cyan-200/20 bg-slate-950/95 px-3 py-2 text-xs leading-relaxed text-slate-200 shadow-[0_0_24px_rgba(34,211,238,0.16)] backdrop-blur ${activeQuestHintId === quest.id ? 'hidden sm:block' : 'hidden group-hover:block group-focus-within:block'}`} role="tooltip">{questHint}</div>{activeQuestHintId === quest.id && <p className="mt-2 rounded-lg border border-cyan-200/15 bg-cyan-200/[0.055] px-3 py-2 text-xs leading-relaxed text-slate-200 sm:hidden">{questHint}</p>}<div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs"><div className="flex min-w-0 flex-wrap items-center gap-1.5"><span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2 py-0.5 font-semibold uppercase text-amber-100">{quest.rarity} · +{quest.rewardXp} XP</span><span className="rounded-full border border-cyan-200/15 bg-cyan-200/[0.06] px-2 py-0.5 font-semibold uppercase text-cyan-100/80">{questCategoryLabels[quest.category] ?? quest.category}</span></div><span className={`font-bold uppercase ${claimed ? 'text-slate-400' : ready ? 'text-cyan-100' : 'text-slate-500'}`}>{claimed ? '✓ Odebrano' : statusLabel}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-300 ${ready ? 'bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.65)]' : claimed ? 'bg-teal-300/50' : 'bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)]'}`} style={{ width: `${percent}%` }} /></div>{ready && progress && <button className="quest-claim-button mt-3 w-full rounded-md bg-cyan-300 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.35)] transition duration-200 hover:scale-[1.015] hover:bg-cyan-100" onClick={() => { playNormalClickSound(); onQuestClaim(quest.id, progress.periodId); }} type="button">Odbierz nagrodę</button>}</div>; })}</div></div>)}</div></div>}

        {activeTab === 'history' && <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">{profile.recentScores.length === 0 ? <p className="rounded-md border border-dashed border-white/10 p-4 text-sm text-slate-400">Brak historii.</p> : profile.recentScores.map((score) => <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm" key={`${score.createdAt}-${score.gameId}`}><span className="block truncate text-slate-400">{getGameTitle(score.gameId)}</span><strong className="mt-1 block text-white">{score.scoreLabel}</strong></div>)}</div>}
      </div>
    </section>
  );
}

