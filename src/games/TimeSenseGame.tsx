import { useEffect, useRef, useState } from 'react';
import { readStoredTimeSenseDuration, storeTimeSenseDuration, timeSenseDurationOptions } from '../data/timeSenseDurations';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type TimeSenseGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'running' | 'result';

type TimeSenseResult = {
  targetSeconds: number;
  targetMs: number;
  actualSeconds: number;
  actualMs: number;
  differenceSeconds: number;
  deviationMs: number;
  signedDeviationMs: number;
  accuracy: number;
  rating: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
  isPerfect: boolean;
  score: number;
};

function getAccuracy(targetSeconds: number, differenceSeconds: number): number {
  const penalty = Math.abs(differenceSeconds) / targetSeconds;
  return Math.max(0, Math.min(100, Math.round((1 - penalty) * 10000) / 100));
}

function getRating(deviationMs: number, accuracy: number): TimeSenseResult['rating'] {
  if (deviationMs <= 100) return 'PERFECT';
  if (accuracy >= 97) return 'GREAT';
  if (accuracy >= 92) return 'GOOD';
  return 'MISS';
}

function formatSeconds(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}s`;
}

export function TimeSenseGame({ onScore }: TimeSenseGameProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState(readStoredTimeSenseDuration);
  const [result, setResult] = useState<TimeSenseResult | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    return () => {
      startedAtRef.current = null;
    };
  }, []);

  function reset() {
    startedAtRef.current = null;
    submittedRef.current = false;
    setStage('idle');
    setResult(null);
  }

  function startTrial() {
    playNormalClickSound();
    startedAtRef.current = performance.now();
    submittedRef.current = false;
    setResult(null);
    setStage('running');
  }

  function stopTrial() {
    if (stage !== 'running' || startedAtRef.current === null) {
      return;
    }

    playNormalClickSound();
    const actualMs = Math.round(performance.now() - startedAtRef.current);
    const targetMs = selectedDurationSeconds * 1000;
    const signedDeviationMs = actualMs - targetMs;
    const deviationMs = Math.abs(signedDeviationMs);
    const actualSeconds = Math.round((actualMs / 1000) * 100) / 100;
    const differenceSeconds = Math.round((signedDeviationMs / 1000) * 100) / 100;
    const accuracy = getAccuracy(selectedDurationSeconds, differenceSeconds);
    const score = Math.max(0, Math.round(100000 - deviationMs));
    const nextResult: TimeSenseResult = {
      targetSeconds: selectedDurationSeconds,
      targetMs,
      actualSeconds,
      actualMs,
      differenceSeconds,
      deviationMs,
      signedDeviationMs,
      accuracy,
      rating: getRating(deviationMs, accuracy),
      isPerfect: deviationMs <= 100,
      score,
    };

    startedAtRef.current = null;
    setResult(nextResult);
    setStage('result');

    if (!submittedRef.current) {
      submittedRef.current = true;
      onScore({
        gameId: 'time-sense',
        score,
        scoreLabel: `${score} pkt`,
        stats: {
          durationSeconds: selectedDurationSeconds,
          targetMs,
          actualMs,
          deviationMs,
          signedDeviationMs,
          accuracy,
          rating: nextResult.rating,
          isPerfect: nextResult.isPerfect ? 1 : 0,
        },
        meta: nextResult,
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid gap-2 text-sm sm:grid-cols-4">
        {timeSenseDurationOptions.map((option) => (
          <button
            className={`rounded-xl border px-3 py-2 font-black transition ${
              selectedDurationSeconds === option.value
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10'
            }`}
            disabled={stage === 'running'}
            key={option.value}
            onClick={() => {
              playNormalClickSound();
              storeTimeSenseDuration(option.value);
              setSelectedDurationSeconds(option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-8 text-center shadow-[0_0_38px_rgba(34,211,238,0.08)] ${
          stage === 'running'
            ? 'border-cyan-300/35 bg-cyan-300/[0.07]'
            : result?.isPerfect
              ? 'border-yellow-200/45 bg-yellow-200/[0.08] shadow-[0_0_34px_rgba(250,204,21,0.14)]'
              : 'border-white/10 bg-black/22'
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Target</p>
        <h3 className="mt-3 text-5xl font-black text-white sm:text-7xl">{selectedDurationSeconds}s</h3>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {stage === 'running' ? 'Hidden timer' : stage === 'idle' ? 'Stop when ready' : 'Result'}
        </p>

        {result && stage !== 'running' && (
          <div className="mt-6 grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Actual</span>
              <strong className="text-white">{result.actualSeconds.toFixed(2)}s</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Diff</span>
              <strong className="text-white">{formatSeconds(result.differenceSeconds)}</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Accuracy</span>
              <strong className="text-white">{formatPercent(result.accuracy)}</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Rating</span>
              <strong className={result.isPerfect ? 'text-yellow-100' : 'text-white'}>{result.rating}</strong>
            </div>
          </div>
        )}

        {result?.isPerfect && (
          <div className="mt-5 inline-flex rounded-full border border-yellow-200/45 bg-yellow-200/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-100">
            Perfect
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {stage === 'idle' && (
          <button className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:bg-cyan-200" onClick={startTrial} type="button">
            Start
          </button>
        )}
        {stage === 'running' && (
          <button className="rounded-xl bg-fuchsia-300 px-8 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_28px_rgba(217,70,239,0.22)] transition hover:bg-fuchsia-200" onClick={stopTrial} type="button">
            Stop
          </button>
        )}
        {stage === 'result' && (
          <>
            <button className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200" onClick={startTrial} type="button">
              Jeszcze raz
            </button>
            <button className="rounded-xl border border-white/15 px-7 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/10" onClick={reset} type="button">
              Zmień czas
            </button>
          </>
        )}
      </div>

      {result && (
        <div className="grid gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Score</span>
            <strong className="text-white">{result.score}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Target</span>
            <strong className="text-white">{(result.targetMs / 1000).toFixed(2)}s</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Deviation</span>
            <strong className="text-white">{result.deviationMs} ms</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Perfect</span>
            <strong className="text-white">{result.isPerfect ? 'Yes' : 'No'}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
