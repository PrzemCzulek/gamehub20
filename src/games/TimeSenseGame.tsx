import { useEffect, useMemo, useRef, useState } from 'react';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type TimeSenseGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'running' | 'round-result' | 'finished';

type TimeSenseRound = {
  round: number;
  targetSeconds: number;
  actualSeconds: number;
  differenceSeconds: number;
  accuracy: number;
  rating: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
  perfect: boolean;
};

const targetOptions = [10, 20, 30, 60];
const totalRounds = 5;

function getAccuracy(targetSeconds: number, differenceSeconds: number): number {
  const penalty = Math.abs(differenceSeconds) / targetSeconds;
  return Math.max(0, Math.min(100, Math.round((1 - penalty) * 10000) / 100));
}

function getRating(absDifference: number, accuracy: number): TimeSenseRound['rating'] {
  if (absDifference <= 0.1) return 'PERFECT';
  if (accuracy >= 97) return 'GREAT';
  if (accuracy >= 92) return 'GOOD';
  return 'MISS';
}

function formatSeconds(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}s`;
}

function getNextTarget(currentTarget: number): number {
  const pool = targetOptions.filter((target) => target !== currentTarget);
  return pool[Math.floor(Math.random() * pool.length)] ?? currentTarget;
}

function getBestPerfectStreak(rounds: TimeSenseRound[]): number {
  let best = 0;
  let current = 0;

  rounds.forEach((round) => {
    current = round.perfect ? current + 1 : 0;
    best = Math.max(best, current);
  });

  return best;
}

function calculateFinalScore(rounds: TimeSenseRound[]): number {
  const avgAccuracy = rounds.reduce((total, round) => total + round.accuracy, 0) / rounds.length;
  const avgDeviation = rounds.reduce((total, round) => total + Math.abs(round.differenceSeconds), 0) / rounds.length;
  const perfectHits = rounds.filter((round) => round.perfect).length;
  const bestPerfectStreak = getBestPerfectStreak(rounds);

  return Math.max(0, Math.round(avgAccuracy * 10 + perfectHits * 35 + bestPerfectStreak * 20 - avgDeviation * 18));
}

export function TimeSenseGame({ onScore }: TimeSenseGameProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [targetSeconds, setTargetSeconds] = useState(10);
  const [roundNumber, setRoundNumber] = useState(1);
  const [rounds, setRounds] = useState<TimeSenseRound[]>([]);
  const [lastRound, setLastRound] = useState<TimeSenseRound | null>(null);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  const summary = useMemo(() => {
    if (rounds.length === 0) {
      return null;
    }

    const avgAccuracy = Math.round((rounds.reduce((total, round) => total + round.accuracy, 0) / rounds.length) * 100) / 100;
    const bestAccuracy = Math.max(...rounds.map((round) => round.accuracy));
    const avgDeviation = Math.round((rounds.reduce((total, round) => total + Math.abs(round.differenceSeconds), 0) / rounds.length) * 100) / 100;
    const perfectHits = rounds.filter((round) => round.perfect).length;
    const bestPerfectStreak = getBestPerfectStreak(rounds);

    return {
      avgAccuracy,
      bestAccuracy,
      avgDeviation,
      perfectHits,
      bestPerfectStreak,
    };
  }, [rounds]);

  useEffect(() => {
    return () => {
      startedAtRef.current = null;
    };
  }, []);

  function reset() {
    startedAtRef.current = null;
    submittedRef.current = false;
    setStage('idle');
    setRoundNumber(1);
    setRounds([]);
    setLastRound(null);
    setFinalScore(null);
  }

  function startRun() {
    playNormalClickSound();
    startedAtRef.current = performance.now();
    submittedRef.current = false;
    setRoundNumber(1);
    setRounds([]);
    setLastRound(null);
    setFinalScore(null);
    setStage('running');
  }

  function startNextRound() {
    playNormalClickSound();
    startedAtRef.current = performance.now();
    setTargetSeconds((current) => getNextTarget(current));
    setRoundNumber((current) => current + 1);
    setLastRound(null);
    setStage('running');
  }

  function stopRound() {
    if (stage !== 'running' || startedAtRef.current === null) {
      return;
    }

    playNormalClickSound();
    const actualSeconds = Math.round(((performance.now() - startedAtRef.current) / 1000) * 100) / 100;
    const differenceSeconds = Math.round((actualSeconds - targetSeconds) * 100) / 100;
    const accuracy = getAccuracy(targetSeconds, differenceSeconds);
    const absDifference = Math.abs(differenceSeconds);
    const round: TimeSenseRound = {
      round: roundNumber,
      targetSeconds,
      actualSeconds,
      differenceSeconds,
      accuracy,
      rating: getRating(absDifference, accuracy),
      perfect: absDifference <= 0.1,
    };
    const nextRounds = [...rounds, round];

    startedAtRef.current = null;
    setRounds(nextRounds);
    setLastRound(round);

    if (nextRounds.length >= totalRounds) {
      const score = calculateFinalScore(nextRounds);
      const avgAccuracy = Math.round((nextRounds.reduce((total, item) => total + item.accuracy, 0) / nextRounds.length) * 100) / 100;
      const bestAccuracy = Math.max(...nextRounds.map((item) => item.accuracy));
      const avgDeviation = Math.round((nextRounds.reduce((total, item) => total + Math.abs(item.differenceSeconds), 0) / nextRounds.length) * 100) / 100;
      const perfectHits = nextRounds.filter((item) => item.perfect).length;
      const bestPerfectStreak = getBestPerfectStreak(nextRounds);

      setFinalScore(score);
      setStage('finished');

      if (!submittedRef.current) {
        submittedRef.current = true;
        onScore({
          gameId: 'time-sense',
          score,
          scoreLabel: `${score} pkt`,
          stats: {
            accuracy: avgAccuracy,
            avgAccuracy,
            bestAccuracy,
            perfectHits,
            avgDeviation,
            bestPerfectStreak,
            rounds: nextRounds.length,
          },
          meta: {
            rounds: nextRounds,
            targetOptions,
          },
        });
      }
      return;
    }

    setStage('round-result');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid gap-2 text-sm sm:grid-cols-4">
        {targetOptions.map((target) => (
          <button
            className={`rounded-xl border px-3 py-2 font-black transition ${
              targetSeconds === target
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10'
            }`}
            disabled={stage === 'running'}
            key={target}
            onClick={() => {
              playNormalClickSound();
              setTargetSeconds(target);
            }}
            type="button"
          >
            {target}s
          </button>
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-2xl border p-8 text-center shadow-[0_0_38px_rgba(34,211,238,0.08)] ${
          stage === 'running'
            ? 'border-cyan-300/35 bg-cyan-300/[0.07]'
            : lastRound?.perfect
              ? 'border-yellow-200/45 bg-yellow-200/[0.08] shadow-[0_0_34px_rgba(250,204,21,0.14)]'
              : 'border-white/10 bg-black/22'
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Round {Math.min(roundNumber, totalRounds)} / {totalRounds}</p>
        <h3 className="mt-3 text-5xl font-black text-white sm:text-7xl">{targetSeconds}s</h3>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {stage === 'running' ? 'Timer hidden' : stage === 'idle' ? 'Choose target' : 'Result lock'}
        </p>

        {lastRound && stage !== 'running' && (
          <div className="mt-6 grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Actual</span>
              <strong className="text-white">{lastRound.actualSeconds.toFixed(2)}s</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Diff</span>
              <strong className="text-white">{formatSeconds(lastRound.differenceSeconds)}</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Accuracy</span>
              <strong className="text-white">{formatPercent(lastRound.accuracy)}</strong>
            </div>
            <div className="rounded-lg bg-black/25 px-3 py-2">
              <span className="block text-slate-500">Rating</span>
              <strong className={lastRound.perfect ? 'text-yellow-100' : 'text-white'}>{lastRound.rating}</strong>
            </div>
          </div>
        )}

        {lastRound?.perfect && (
          <div className="mt-5 inline-flex rounded-full border border-yellow-200/45 bg-yellow-200/15 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-yellow-100">
            Perfect
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {stage === 'idle' && (
          <button className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:bg-cyan-200" onClick={startRun} type="button">
            Start
          </button>
        )}
        {stage === 'running' && (
          <button className="rounded-xl bg-fuchsia-300 px-8 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_28px_rgba(217,70,239,0.22)] transition hover:bg-fuchsia-200" onClick={stopRound} type="button">
            Stop
          </button>
        )}
        {stage === 'round-result' && (
          <button className="rounded-xl bg-teal-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-teal-200" onClick={startNextRound} type="button">
            Next round
          </button>
        )}
        {stage === 'finished' && (
          <button className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200" onClick={reset} type="button">
            Again
          </button>
        )}
      </div>

      {(summary || finalScore !== null) && (
        <div className="grid gap-2 text-sm sm:grid-cols-5">
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Score</span>
            <strong className="text-white">{finalScore ?? '-'}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Best</span>
            <strong className="text-white">{summary ? formatPercent(summary.bestAccuracy) : '-'}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Perfect</span>
            <strong className="text-white">{summary?.perfectHits ?? 0}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Avg diff</span>
            <strong className="text-white">{summary ? `${summary.avgDeviation.toFixed(2)}s` : '-'}</strong>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="block text-slate-500">Streak</span>
            <strong className="text-white">{summary?.bestPerfectStreak ?? 0}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
