import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import {
  type CpsInputMode,
  cpsDurationOptions,
  cpsInputModeOptions,
  getCpsLeaderboardScope,
  readStoredCpsSettings,
  storeCpsSettings,
} from '../data/cpsModes';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type CpsTestGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'countdown' | 'running' | 'finished';
type FlowState = 'FLOW' | 'HOT' | 'OVERHEAT';

type RunResult = {
  score: number;
  peakCPS: number;
  totalClicks: number;
  consistency: number;
  burst: number;
  overheatTime: number;
  heatPeak: number;
  longestStreak: number;
  rating: 'S' | 'A' | 'B' | 'C' | 'MISS';
};

const countdownSteps = ['3', '2', '1', 'GO'];

function getRating(cps: number): RunResult['rating'] {
  if (cps >= 12) return 'S';
  if (cps >= 9.5) return 'A';
  if (cps >= 7) return 'B';
  if (cps >= 4) return 'C';
  return 'MISS';
}

function getFlowState(energy: number): FlowState {
  if (energy >= 82) return 'OVERHEAT';
  if (energy >= 55) return 'HOT';
  return 'FLOW';
}

function getConsistency(clickTimes: number[], durationSeconds: number): number {
  if (clickTimes.length < 2) return 0;
  const buckets = Array.from({ length: Math.max(1, durationSeconds) }, () => 0);

  clickTimes.forEach((time) => {
    const index = Math.min(buckets.length - 1, Math.floor(time / 1000));
    buckets[index] += 1;
  });

  const average = buckets.reduce((total, value) => total + value, 0) / buckets.length;
  if (average <= 0) return 0;

  const variance = buckets.reduce((total, value) => total + (value - average) ** 2, 0) / buckets.length;
  const deviation = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round((100 - (deviation / average) * 45) * 100) / 100));
}

function getPeakCps(clickTimes: number[]): number {
  let peak = 0;

  clickTimes.forEach((time, index) => {
    let count = 1;
    for (let cursor = index - 1; cursor >= 0 && time - clickTimes[cursor] <= 1000; cursor -= 1) {
      count += 1;
    }
    peak = Math.max(peak, count);
  });

  return peak;
}

export function CpsTestGame({ onScore }: CpsTestGameProps) {
  const initialSettings = readStoredCpsSettings();
  const [stage, setStage] = useState<Stage>('idle');
  const [durationSeconds, setDurationSeconds] = useState(initialSettings.durationSeconds);
  const [inputMode, setInputMode] = useState<CpsInputMode>(initialSettings.inputMode);
  const [countdown, setCountdown] = useState(countdownSteps[0]);
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);
  const [clicks, setClicks] = useState(0);
  const [effectiveClicks, setEffectiveClicks] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pulse, setPulse] = useState(0);
  const stageRef = useRef<Stage>('idle');
  const startedAtRef = useRef<number | null>(null);
  const clickTimesRef = useRef<number[]>([]);
  const clicksRef = useRef(0);
  const effectiveClicksRef = useRef(0);
  const currentStreakRef = useRef(0);
  const longestStreakRef = useRef(0);
  const lastAltKeyRef = useRef<string | null>(null);
  const overheatMsRef = useRef(0);
  const heatPeakRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const displayHeat = stage === 'running' ? energy : 0;
  const flowState = stage === 'running' ? getFlowState(energy) : 'FLOW';
  const liveCps = stage === 'running' ? Math.round((effectiveClicks / Math.max((durationSeconds * 1000 - remainingMs) / 1000, 0.1)) * 100) / 100 : result?.score ?? 0;
  const modeLabel = cpsInputModeOptions.find((option) => option.value === inputMode)?.label ?? 'Click';

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (stage !== 'running') return;

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      if (startedAtRef.current === null) return;

      const elapsedMs = now - startedAtRef.current;
      const nextRemaining = Math.max(0, durationSeconds * 1000 - elapsedMs);
      const previousTick = lastTickRef.current ?? now;
      const delta = now - previousTick;
      const nextEnergy = Math.max(0, energyRef.current - delta * 0.012);

      if (getFlowState(nextEnergy) === 'OVERHEAT') {
        overheatMsRef.current += delta;
      }

      energyRef.current = nextEnergy;
      setEnergy(nextEnergy);
      setRemainingMs(nextRemaining);
      lastTickRef.current = now;

      if (nextRemaining <= 0) {
        finishRun();
      }
    }, 60);

    return () => window.clearInterval(intervalId);
  }, [durationSeconds, stage]);

  const energyRef = useRef(0);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (stageRef.current !== 'running') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;

      if (inputMode === 'space' && event.code === 'Space') {
        event.preventDefault();
        registerHit('space');
      } else if (inputMode === 'normal' && event.code === 'Space') {
        event.preventDefault();
        registerHit('space');
      } else if (inputMode === 'alternating') {
        const key = event.key.toLowerCase();
        if (key === 'a' || key === 'l' || key === 'q' || key === 'p') {
          event.preventDefault();
          registerHit(key);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputMode]);

  const modeHint = useMemo(() => {
    if (inputMode === 'space') return 'SPACE only';
    if (inputMode === 'alternating') return 'A/L lub Q/P';
    return 'Click / tap / space';
  }, [inputMode]);

  function resetRunState() {
    submittedRef.current = false;
    startedAtRef.current = null;
    clickTimesRef.current = [];
    clicksRef.current = 0;
    effectiveClicksRef.current = 0;
    currentStreakRef.current = 0;
    longestStreakRef.current = 0;
    lastAltKeyRef.current = null;
    overheatMsRef.current = 0;
    heatPeakRef.current = 0;
    lastTickRef.current = null;
    energyRef.current = 0;
    setClicks(0);
    setEffectiveClicks(0);
    setEnergy(0);
    setResult(null);
    setRemainingMs(durationSeconds * 1000);
  }

  function startCountdown() {
    playNormalClickSound();
    resetRunState();
    setStage('countdown');
    setCountdown(countdownSteps[0]);

    countdownSteps.forEach((step, index) => {
      window.setTimeout(() => {
        setCountdown(step);
        if (step === 'GO') {
          window.setTimeout(() => startRun(), 220);
        }
      }, index * 520);
    });
  }

  function startRun() {
    startedAtRef.current = performance.now();
    lastTickRef.current = startedAtRef.current;
    setStage('running');
  }

  function finishRun() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setStage('finished');

    const totalClicks = clicksRef.current;
    const score = Math.round((effectiveClicksRef.current / durationSeconds) * 100) / 100;
    const peakCPS = getPeakCps(clickTimesRef.current);
    const consistency = getConsistency(clickTimesRef.current, durationSeconds);
    const overheatTime = Math.round(overheatMsRef.current);
    const heatPeak = Math.round(heatPeakRef.current);
    const burst = peakCPS;
    const nextResult: RunResult = {
      score,
      peakCPS,
      totalClicks,
      consistency,
      burst,
      overheatTime,
      heatPeak,
      longestStreak: longestStreakRef.current,
      rating: getRating(score),
    };

    setResult(nextResult);
    setRemainingMs(0);
    energyRef.current = 0;
    setEnergy(0);

    onScore({
      gameId: 'cps-test',
      score,
      scoreLabel: `${score.toFixed(2)} CPS`,
      stats: {
        durationSeconds,
        inputMode,
        cps: score,
        peakCPS,
        totalClicks,
        consistency,
        accuracy: inputMode === 'alternating' ? Math.round((effectiveClicksRef.current / Math.max(totalClicks, 1)) * 10000) / 100 : 100,
        burst,
        overheatTime,
        heatPeak,
        longestStreak: longestStreakRef.current,
      },
      runDurationMs: durationSeconds * 1000,
      meta: {
        durationSeconds,
        inputMode,
        leaderboardScope: getCpsLeaderboardScope(durationSeconds, inputMode),
        rating: nextResult.rating,
      },
    });
  }

  function registerHit(inputKey: string) {
    if (stageRef.current !== 'running' || startedAtRef.current === null) return;

    if (inputMode === 'alternating') {
      const side = inputKey === 'a' || inputKey === 'q' ? 'left' : 'right';
      if (lastAltKeyRef.current === side) {
        currentStreakRef.current = 0;
        lastAltKeyRef.current = side;
        return;
      }
      lastAltKeyRef.current = side;
    }

    const now = performance.now();
    const elapsed = now - startedAtRef.current;
    const efficiency = 1;
    const nextEffectiveClicks = effectiveClicksRef.current + efficiency;
    const nextClicks = clicksRef.current + 1;
    const nextStreak = currentStreakRef.current + 1;
    const nextEnergy = Math.min(100, energyRef.current + 9);

    clickTimesRef.current = [...clickTimesRef.current, elapsed];
    clicksRef.current = nextClicks;
    effectiveClicksRef.current = nextEffectiveClicks;
    currentStreakRef.current = nextStreak;
    longestStreakRef.current = Math.max(longestStreakRef.current, nextStreak);
    energyRef.current = nextEnergy;
    heatPeakRef.current = Math.max(heatPeakRef.current, nextEnergy);
    setPulse((current) => current + 1);
    setClicks(nextClicks);
    setEffectiveClicks(nextEffectiveClicks);
    setEnergy(nextEnergy);
  }

  function handlePadPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (stageRef.current !== 'running') return;
    event.preventDefault();
    if (inputMode === 'space' || inputMode === 'alternating') return;
    registerHit('pointer');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        {cpsDurationOptions.map((option) => (
          <button
            aria-pressed={durationSeconds === option.value}
            className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
              durationSeconds === option.value
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.24)]'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10'
            }`}
            disabled={stage === 'running' || stage === 'countdown'}
            key={option.value}
            onClick={() => {
              playNormalClickSound();
              storeCpsSettings({ durationSeconds: option.value, inputMode });
              setDurationSeconds(option.value);
              setRemainingMs(option.value * 1000);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {cpsInputModeOptions.map((option) => (
          <button
            aria-pressed={inputMode === option.value}
            className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
              inputMode === option.value
                ? 'border-fuchsia-300 bg-fuchsia-300 text-slate-950 shadow-[0_0_20px_rgba(217,70,239,0.22)]'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-fuchsia-300/30 hover:bg-fuchsia-300/10'
            }`}
            disabled={stage === 'running' || stage === 'countdown'}
            key={option.value}
            onClick={() => {
              playNormalClickSound();
              storeCpsSettings({ durationSeconds, inputMode: option.value });
              setInputMode(option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-5">
        <Stat label="CPS" value={liveCps.toFixed(2)} />
        <Stat label="Clicks" value={String(clicks)} />
        <Stat label="Flow" value={flowState} />
        <Stat label="Heat" value={`${Math.round(displayHeat)}%`} />
        <Stat label="Mode" value={modeLabel} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.13),rgba(15,23,42,0.15)_38%,rgba(2,6,23,0.78))] p-5 shadow-[0_0_48px_rgba(34,211,238,0.10)]">
        {stage === 'idle' && (
          <GameStartOverlay
            buttonLabel="Start"
            description={`${durationSeconds}s · ${modeHint}`}
            onStart={startCountdown}
            title="CPS Test"
          />
        )}

        <div
          aria-label="CPS click pad"
          className={`relative flex min-h-[22rem] w-full touch-none select-none flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/24 p-6 text-center transition active:scale-[0.995] ${
            flowState === 'OVERHEAT'
              ? 'shadow-[0_0_44px_rgba(248,113,113,0.18)]'
              : flowState === 'HOT'
                ? 'shadow-[0_0_44px_rgba(251,191,36,0.15)]'
              : 'shadow-[0_0_44px_rgba(34,211,238,0.12)]'
          }`}
          onPointerDown={handlePadPointerDown}
          role={stage === 'running' && inputMode === 'normal' ? 'button' : undefined}
          style={{ touchAction: 'none' }}
          tabIndex={stage === 'running' && inputMode === 'normal' ? 0 : undefined}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              background: `radial-gradient(circle at center, rgba(34,211,238,${Math.min(0.32, 0.08 + displayHeat / 420)}), transparent 42%)`,
            }}
          />
          <div
            className="pointer-events-none absolute h-32 w-32 rounded-full border border-cyan-300/20 transition duration-150"
            key={pulse}
          />

          {stage === 'countdown' ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Ready</p>
              <h3 className="mt-4 text-7xl font-black text-white">{countdown}</h3>
            </>
          ) : stage === 'finished' && result ? (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Run complete</p>
              <h3 className="mt-4 text-7xl font-black text-white">{result.score.toFixed(2)}</h3>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-slate-400">CPS · rating {result.rating}</p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-4">
                <Stat label="Peak" value={`${result.peakCPS} CPS`} />
                <Stat label="Clicks" value={String(result.totalClicks)} />
                <Stat label="Consistency" value={formatPercent(result.consistency)} />
                <Stat label="Heat peak" value={`${result.heatPeak}%`} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200"
                  onClick={(event) => {
                    event.stopPropagation();
                    startCountdown();
                  }}
                  type="button"
                >
                  Jeszcze raz
                </button>
                <ShareResultButton
                  gameId="cps-test"
                  metricLabel="CPS"
                  modeLabel={`${durationSeconds}s · ${modeLabel}`}
                  scoreLabel={`${result.score.toFixed(2)} CPS`}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">{modeHint}</p>
              <h3 className="mt-5 text-7xl font-black text-white sm:text-8xl">{liveCps.toFixed(2)}</h3>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-slate-400">{Math.ceil(remainingMs / 1000)}s left</p>
              <div className="mt-7 h-2 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    flowState === 'OVERHEAT' ? 'bg-red-300' : flowState === 'HOT' ? 'bg-yellow-300' : 'bg-cyan-300'
                  }`}
                  style={{ width: `${Math.min(100, displayHeat)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/22 px-3 py-2 text-center">
      <span className="block text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-sm text-white">{value}</strong>
    </div>
  );
}
