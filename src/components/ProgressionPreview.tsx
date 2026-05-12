import { achievementDefinitions } from '../data/achievements';
import { questDefinitions } from '../data/quests';
import { getAchievementUnlocks, getQuestProgress, getStoredPlayerProgression } from '../progression/progressionEngine';

type ProgressionPreviewProps = {
  revision: number;
};

export function ProgressionPreview({ revision }: ProgressionPreviewProps) {
  const progression = getStoredPlayerProgression();
  const questProgress = getQuestProgress();
  const achievementUnlocks = getAchievementUnlocks();
  const activeQuests = questDefinitions.slice(0, 3);
  const unlockedCount = achievementUnlocks.length;

  return (
    <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.04] p-5" data-revision={revision}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Progres gracza</h2>
          <p className="text-xs text-slate-400">Podgląd lokalnego progresu</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs font-semibold text-cyan-100">
          L{progression?.level ?? 1}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-black/20 px-3 py-2">
          <span className="text-slate-400">XP</span>
          <strong className="mt-1 block text-white">{progression?.xp ?? 0}</strong>
        </div>
        <div className="rounded-md bg-black/20 px-3 py-2">
          <span className="text-slate-400">Odblokowane</span>
          <strong className="mt-1 block text-white">
            {unlockedCount}/{achievementDefinitions.length}
          </strong>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {activeQuests.map((quest) => {
          const progress = questProgress.find((item) => item.questId === quest.id);
          const value = progress?.progress ?? 0;

          return (
            <div className="rounded-md bg-black/20 px-3 py-2 text-xs" key={quest.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-200">{quest.title}</span>
                <span className="text-cyan-100">
                  {value}/{quest.target.amount}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-300"
                  style={{ width: `${Math.min(100, Math.round((value / quest.target.amount) * 100))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
