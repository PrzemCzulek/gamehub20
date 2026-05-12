import { useEffect, useState } from 'react';
import { questDefinitions } from '../../data/quests';
import { buildPlayerProfileSummary } from '../../progression/playerProfile';
import { getQuestProgress } from '../../progression/progressionEngine';
import { getAudioEnabled, playNormalClickSound, toggleAudioEnabled } from '../../services/audio';
import type { LocalProfile } from '../../types';

type MetaPanelProps = {
  profile: LocalProfile;
  onReset: () => void;
  revision: number;
};

export function MetaPanel({ profile, onReset, revision }: MetaPanelProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioEnabled, setAudioEnabledState] = useState(getAudioEnabled);
  const [resetInput, setResetInput] = useState('');
  const summary = buildPlayerProfileSummary(profile);
  const questProgress = getQuestProgress();
  const dailyQuest = questDefinitions.find((quest) => quest.type === 'daily');
  const dailyProgress = dailyQuest ? questProgress.find((item) => item.questId === dailyQuest.id) : undefined;
  const dailyValue = dailyProgress?.progress ?? 0;
  const dailyGoal = dailyQuest?.target.amount ?? 1;
  const dailyPercent = Math.min(100, Math.round((dailyValue / dailyGoal) * 100));
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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
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
      <div className="grid gap-3 rounded-lg border border-cyan-300/20 bg-slate-950/70 p-3 shadow-[0_0_28px_rgba(34,211,238,0.10)] backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-300/35 bg-violet-300/10 text-sm font-black text-violet-100 shadow-[0_0_22px_rgba(168,85,247,0.20)]">
              {summary.displayName.slice(0, 1).toUpperCase() || 'G'}
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-cyan-200">PROFIL GRACZA</p>
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-bold text-white">{summary.displayName}</h2>
                <span className="rounded-full border border-violet-300/25 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-100">L{summary.level}</span>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between text-[0.68rem] text-slate-300">
              <span>XP {summary.xp}</span>
              <span>{summary.levelProgressPercent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-violet-300 shadow-[0_0_14px_rgba(45,212,191,0.5)]"
                style={{ width: `${summary.levelProgressPercent}%` }}
              />
            </div>
          </div>

          {dailyQuest && (
            <div className="mt-2 rounded-md border border-cyan-300/10 bg-cyan-300/[0.05] px-2 py-1.5">
              <div className="flex items-center justify-between gap-2 text-[0.65rem]">
                <span className="font-semibold uppercase tracking-wide text-cyan-100">Dzienny cel</span>
                <span className="text-cyan-100">{dailyValue}/{dailyGoal}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-xs text-white">{dailyQuest.title}</span>
                <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${dailyPercent}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
          <div className="text-right text-[0.68rem] text-slate-400">
            <div>Gry: <span className="font-semibold text-white">{summary.gamesPlayed}</span></div>
            <div>Odblokowane: <span className="font-semibold text-white">{summary.achievementsUnlocked}/{summary.achievementsTotal}</span></div>
          </div>
          <button
            aria-label="Ustawienia"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-lg text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
            onClick={() => {
              playNormalClickSound();
              setSettingsOpen((value) => !value);
            }}
            type="button"
          >
            ⚙
          </button>
        </div>
      </div>

      {settingsOpen && (
        <>
          <button
            aria-label="Zamknij ustawienia"
            className="fixed inset-0 z-20 cursor-default bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setSettingsOpen(false)}
            type="button"
          />
          <div className="feedback-toast absolute right-0 z-30 mt-2 w-full max-w-sm rounded-lg border border-white/10 bg-slate-950/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
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