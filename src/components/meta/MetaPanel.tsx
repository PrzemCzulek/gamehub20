import { achievementDefinitions } from '../../data/achievements';
import { questDefinitions } from '../../data/quests';
import { getAchievementUnlocks, getQuestProgress } from '../../progression/progressionEngine';
import type { LocalProfile } from '../../types';

type MetaPanelProps = {
  profile: LocalProfile;
  revision: number;
};

export function MetaPanel({ profile, revision }: MetaPanelProps) {
  const questProgress = getQuestProgress();
  const achievementUnlocks = getAchievementUnlocks();
  const dailyQuest = questDefinitions.find((quest) => quest.type === 'daily');
  const dailyProgress = dailyQuest ? questProgress.find((item) => item.questId === dailyQuest.id) : undefined;
  const dailyValue = dailyProgress?.progress ?? 0;
  const dailyGoal = dailyQuest?.target.amount ?? 1;
  const dailyPercent = Math.min(100, Math.round((dailyValue / dailyGoal) * 100));

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-cyan-300/20 bg-slate-950/70 p-4 shadow-[0_0_35px_rgba(34,211,238,0.10)] backdrop-blur"
      data-revision={revision}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_45%)]" />
      <div className="relative grid gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Profil pilota</p>
            <h2 className="truncate text-lg font-bold text-white">{profile.playerName}</h2>
          </div>
          <div className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-right">
            <span className="block text-[0.65rem] uppercase tracking-wide text-violet-100">Level</span>
            <strong className="text-xl leading-none text-white">{profile.level}</strong>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>XP {profile.xp}</span>
            <span>{profile.levelProgressPercent}% do następnego poziomu</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-violet-300 shadow-[0_0_16px_rgba(45,212,191,0.55)]"
              style={{ width: `${profile.levelProgressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <span className="block text-slate-400">Rozegrane gry</span>
            <strong className="mt-1 block text-base text-white">{profile.totalGamesPlayed}</strong>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <span className="block text-slate-400">Odblokowane</span>
            <strong className="mt-1 block text-base text-white">
              {achievementUnlocks.length}/{achievementDefinitions.length}
            </strong>
          </div>
        </div>

        {dailyQuest && (
          <div className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold uppercase tracking-wide text-cyan-100">Dzienny cel</span>
              <span className="text-cyan-100">
                {dailyValue}/{dailyGoal}
              </span>
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">{dailyQuest.title}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${dailyPercent}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
