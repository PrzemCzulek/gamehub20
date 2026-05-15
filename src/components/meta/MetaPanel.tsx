import { useEffect, useRef, useState } from 'react';
import { questDefinitions } from '../../data/quests';
import { buildPlayerProfileSummary } from '../../progression/playerProfile';
import { getQuestProgress } from '../../progression/progressionEngine';
import { getAudioEnabled, getAudioVolume, playNormalClickSound, setAudioVolume, toggleAudioEnabled } from '../../services/audio';
import type { LocalProfile } from '../../types';

type MetaPanelProps = {
  profile: LocalProfile;
  onReset: () => void;
  revision: number;
};

export function MetaPanel({ profile, onReset, revision }: MetaPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioEnabled, setAudioEnabledState] = useState(getAudioEnabled);
  const [audioVolume, setAudioVolumeState] = useState(getAudioVolume);
  const [resetInput, setResetInput] = useState('');
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const summary = buildPlayerProfileSummary(profile);
  const questProgress = getQuestProgress();
  const dailyQuests = questDefinitions.filter((quest) => quest.type === 'daily');
  const dailyProgressFor = (questId: string) => questProgress.find((item) => item.questId === questId);
  const readyDailyQuest = dailyQuests.find((quest) => {
    const progress = dailyProgressFor(quest.id);
    return progress?.completed && !progress.isClaimed && !progress.claimedAt;
  });
  const activeDailyQuest = dailyQuests.find((quest) => {
    const progress = dailyProgressFor(quest.id);
    return !progress?.completed && !progress?.isClaimed && !progress?.claimedAt;
  });
  const allDailyClaimed =
    dailyQuests.length > 0 &&
    dailyQuests.every((quest) => {
      const progress = dailyProgressFor(quest.id);
      return Boolean(progress?.isClaimed || progress?.claimedAt);
    });
  const dailyQuest = readyDailyQuest ?? activeDailyQuest;
  const dailyProgress = dailyQuest ? questProgress.find((item) => item.questId === dailyQuest.id) : undefined;
  const dailyValue = dailyProgress?.progress ?? 0;
  const dailyGoal = dailyQuest?.target.amount ?? 1;
  const dailyPercent = Math.min(100, Math.round((dailyValue / dailyGoal) * 100));
  const dailyReady = Boolean(dailyProgress?.completed && !dailyProgress.isClaimed && !dailyProgress.claimedAt);
  const canReset = resetInput === 'RESET';

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (settingsPanelRef.current?.contains(target) || settingsButtonRef.current?.contains(target)) {
        return;
      }

      setSettingsOpen(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [settingsOpen]);

  function handleAudioToggle() {
    playNormalClickSound();
    setAudioEnabledState(toggleAudioEnabled());
  }

  function handleReset() {
    if (!canReset) {
      return;
    }

    playNormalClickSound();
    const confirmed = window.confirm('Ta operacja jest nieodwracalna. Na pewno zresetować lokalne dane?');

    if (confirmed) {
      onReset();
      setResetInput('');
      setSettingsOpen(false);
    }
  }

  return (
    <section className="relative" data-revision={revision}>
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-cyan-300/14 bg-slate-950/58 px-2 py-1 shadow-[0_0_18px_rgba(34,211,238,0.07)] backdrop-blur md:min-w-[23rem]">
        <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-300/30 bg-violet-300/10 text-xs font-black text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.14)]">
              {summary.displayName.slice(0, 1).toUpperCase() || 'G'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-xs font-black text-white sm:text-sm">{summary.displayName}</h2>
                <span className="shrink-0 rounded-full border border-violet-300/25 px-1.5 py-0.5 text-[0.56rem] font-black text-violet-100">L{summary.level}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10 sm:w-24">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-violet-300 shadow-[0_0_12px_rgba(45,212,191,0.5)]"
                    style={{ width: `${summary.levelProgressPercent}%` }}
                  />
                </div>
                <span className="hidden text-[0.58rem] font-bold text-slate-400 sm:inline">XP {summary.xp}</span>
              </div>
            </div>

          {(dailyQuest || allDailyClaimed) && (
            <div
              className={`hidden min-w-[7rem] rounded-full border px-2 py-1 transition sm:block ${
                allDailyClaimed
                  ? 'border-teal-300/20 bg-teal-300/[0.07]'
                  : dailyReady
                    ? 'quest-ready-pulse border-cyan-200/35 bg-cyan-300/[0.08]'
                    : 'border-cyan-300/10 bg-cyan-300/[0.05]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-[0.54rem] font-black uppercase tracking-wide text-cyan-100">
                  {dailyReady ? 'Nagroda' : 'Daily'}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.62rem] text-white">
                  {allDailyClaimed ? 'Wszystkie questy ukończone' : dailyQuest?.title}
                </span>
                <span className={allDailyClaimed ? 'text-[0.58rem] text-teal-100' : 'text-[0.58rem] text-cyan-100'}>
                  {allDailyClaimed ? 'OK' : `${dailyValue}/${dailyGoal}`}
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    allDailyClaimed
                      ? 'bg-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.55)]'
                      : dailyReady
                        ? 'bg-cyan-100 shadow-[0_0_16px_rgba(103,232,249,0.75)]'
                        : 'bg-cyan-300'
                  }`}
                  style={{ width: `${allDailyClaimed ? 100 : dailyPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

          <button
            aria-label="Ustawienia"
          ref={settingsButtonRef}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
            onClick={() => {
              playNormalClickSound();
              setSettingsOpen((value) => !value);
            }}
            type="button"
          >
            ⚙
          </button>
      </div>

      {settingsOpen && (
        <>
          <button
            aria-label="Zamknij ustawienia"
            className="fixed inset-0 z-20 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setSettingsOpen(false)}
            type="button"
          />
          <div ref={settingsPanelRef} className="feedback-toast absolute right-0 z-30 mt-2 w-full max-w-sm rounded-lg border border-white/10 bg-slate-950/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
            <h3 className="text-sm font-semibold text-white">Ustawienia</h3>

            <div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Dźwięki</p>
                  <p className="text-xs text-slate-400">Efekty UI i karuzeli</p>
                </div>
                <button
                  className={`rounded-md px-3 py-2 text-xs font-bold ${audioEnabled ? 'bg-cyan-300 text-slate-950' : 'border border-white/15 text-slate-200'}`}
                  onClick={handleAudioToggle}
                  type="button"
                >
                  {audioEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[0.62rem] font-black uppercase tracking-[0.16em] text-slate-400">
                  <span>Głośność UI</span>
                  <span className="text-cyan-100">{Math.round(audioVolume * 100)}%</span>
                </div>
                <div className="relative flex h-6 items-center">
                  <div className="pointer-events-none absolute left-0 right-0 h-2 rounded-full bg-white/10" />
                  <div
                    className="pointer-events-none absolute left-0 h-2 rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-violet-300 shadow-[0_0_16px_rgba(34,211,238,0.38)]"
                    style={{ width: `${audioVolume * 100}%` }}
                  />
                  <input
                    aria-label="Głośność dźwięków UI"
                    className="relative h-6 w-full cursor-pointer appearance-none bg-transparent accent-cyan-300"
                    max="1"
                    min="0"
                    onChange={(event) => {
                      const nextVolume = setAudioVolume(Number(event.target.value));
                      setAudioVolumeState(nextVolume);
                    }}
                    step="0.01"
                    type="range"
                    value={audioVolume}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-red-300/20 bg-red-400/10 p-3">
              <p className="text-sm font-semibold text-red-100">DEV: Reset danych lokalnych</p>
              <p className="mt-1 text-xs text-red-100/80">Ta operacja jest nieodwracalna.</p>
              <input
                className="mt-3 w-full rounded-md border border-red-300/20 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                onChange={(event) => setResetInput(event.target.value)}
                placeholder="Wpisz RESET"
                value={resetInput}
              />
              <button
                className="mt-3 w-full rounded-md border border-red-300/30 px-3 py-2 text-sm font-semibold text-red-100 transition enabled:hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canReset}
                onClick={handleReset}
                type="button"
              >
                Reset danych lokalnych
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

