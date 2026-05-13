import { useEffect, useRef, useState } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { getColorSimilarity } from '../utils/colorSimilarity';
import { formatPercent } from '../utils/format';

type ColorMemoryGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'showing' | 'choosing' | 'passed' | 'failed';

type RoundHistoryEntry = {
  round: number;
  targetColor: string;
  selectedColor: string;
  similarity: number;
  requiredSimilarity: number;
  passed: boolean;
};

type ColorSummary = {
  completedRound: number;
  averageSimilarity: number;
  bestSimilarity: number;
  worstSimilarity: number;
  attempts: number;
  passedRounds: number;
  failedRounds: number;
  perfectMatches: number;
  highPrecisionMatches: number;
  totalMatches: number;
  highestRound: number;
  bestMatch: RoundHistoryEntry | null;
};

const baseRequiredSimilarity = 70;
const requiredSimilarityStep = 3;
const maxRequiredSimilarity = 95;
const baseShowMs = 3000;
const minShowMs = 1500;
const showDecreaseEveryRounds = 3;
const showDecreaseMs = 250;
const presets = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'];

function getRequiredSimilarity(round: number): number {
  return Math.min(maxRequiredSimilarity, baseRequiredSimilarity + (round - 1) * requiredSimilarityStep);
}

function getShowDuration(round: number): number {
  const decreases = Math.floor((round - 1) / showDecreaseEveryRounds);
  return Math.max(minShowMs, baseShowMs - decreases * showDecreaseMs);
}

function createRandomColor(): string {
  const value = Math.floor(Math.random() * 0xffffff);
  return `#${value.toString(16).padStart(6, '0')}`;
}

function createSummary(history: RoundHistoryEntry[]): ColorSummary {
  const attempts = history.length;
  const similarities = history.map((entry) => entry.similarity);
  const passedRounds = history.filter((entry) => entry.passed).length;
  const failedRounds = attempts - passedRounds;
  const perfectMatches = history.filter((entry) => entry.similarity >= 95).length;
  const highPrecisionMatches = history.filter((entry) => entry.similarity >= 90).length;
  const bestMatch = history.reduce<RoundHistoryEntry | null>(
    (best, entry) => (!best || entry.similarity > best.similarity ? entry : best),
    null,
  );
  const averageSimilarity =
    attempts > 0
      ? Math.round((similarities.reduce((total, value) => total + value, 0) / attempts) * 100) / 100
      : 0;

  return {
    completedRound: passedRounds,
    averageSimilarity,
    bestSimilarity: attempts > 0 ? Math.max(...similarities) : 0,
    worstSimilarity: attempts > 0 ? Math.min(...similarities) : 0,
    attempts,
    passedRounds,
    failedRounds,
    perfectMatches,
    highPrecisionMatches,
    totalMatches: attempts,
    highestRound: passedRounds,
    bestMatch,
  };
}

function getSimilarityFeedbackClass(similarity: number): string {
  if (similarity >= 95) {
    return 'border-yellow-300/50 bg-yellow-300/10 text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.16)]';
  }

  if (similarity >= 80) {
    return 'border-cyan-300/45 bg-cyan-300/10 text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14)]';
  }

  return 'border-red-300/45 bg-red-400/10 text-red-100 shadow-[0_0_20px_rgba(248,113,113,0.12)]';
}

function isSameColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function ColorMemoryGame({ onScore }: ColorMemoryGameProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [round, setRound] = useState(1);
  const [targetColor, setTargetColor] = useState('#14b8a6');
  const [selectedColor, setSelectedColor] = useState('#14b8a6');
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);
  const [lastRequired, setLastRequired] = useState(getRequiredSimilarity(1));
  const [history, setHistory] = useState<RoundHistoryEntry[]>([]);
  const [summary, setSummary] = useState<ColorSummary | null>(null);
  const timerRef = useRef<number | null>(null);
  const submitLockedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRound(nextRound: number) {
    clearTimer();
    const nextTargetColor = createRandomColor();
    const requiredSimilarity = getRequiredSimilarity(nextRound);

    if (nextRound === 1) {
      setHistory([]);
      setSummary(null);
    }

    setRound(nextRound);
    setTargetColor(nextTargetColor);
    setSelectedColor('#14b8a6');
    setLastSimilarity(null);
    setLastRequired(requiredSimilarity);
    submitLockedRef.current = true;
    setStage('showing');

    timerRef.current = window.setTimeout(() => {
      setStage('choosing');
      submitLockedRef.current = false;
      timerRef.current = null;
    }, getShowDuration(nextRound));
  }

  function submitColor() {
    if (stage !== 'choosing' || submitLockedRef.current) {
      return;
    }

    submitLockedRef.current = true;
    const similarity = getColorSimilarity(targetColor, selectedColor);
    const requiredSimilarity = getRequiredSimilarity(round);
    const passed = similarity >= requiredSimilarity;
    const historyEntry: RoundHistoryEntry = {
      round,
      targetColor,
      selectedColor,
      similarity,
      requiredSimilarity,
      passed,
    };
    const nextHistory = [...history, historyEntry];

    setLastSimilarity(similarity);
    setLastRequired(requiredSimilarity);
    setHistory(nextHistory);

    if (passed) {
      setStage('passed');
      return;
    }

    const nextSummary = createSummary(nextHistory);
    const finalSimilarity = historyEntry.similarity;
    const colorStats = {
      completedRound: nextSummary.completedRound,
      highestRound: nextSummary.highestRound,
      averageSimilarity: nextSummary.averageSimilarity,
      avgSimilarity: nextSummary.averageSimilarity,
      bestSimilarity: nextSummary.bestSimilarity,
      worstSimilarity: nextSummary.worstSimilarity,
      finalSimilarity,
      perfectMatches: nextSummary.perfectMatches,
      highPrecisionMatches: nextSummary.highPrecisionMatches,
      totalMatches: nextSummary.totalMatches,
    };

    setSummary(nextSummary);
    setStage('failed');
    onScore({
      gameId: 'color-memory',
      score: nextSummary.completedRound,
      scoreLabel: `Runda ${nextSummary.completedRound}`,
      stats: colorStats,
      meta: {
        ...colorStats,
        attempts: nextSummary.attempts,
        passedRounds: nextSummary.passedRounds,
        failedRounds: nextSummary.failedRounds,
        history: nextHistory,
      },
    });
  }

  const showDurationSeconds = (getShowDuration(round) / 1000).toFixed(1);
  const stageLabel = {
    idle: 'Kliknij Start, aby rozpocząć Color Memory',
    showing: 'Zapamiętaj kolor docelowy',
    choosing: 'Wybierz kolor',
    passed: 'Świetnie! Próg zaliczony',
    failed: 'Gra zakończona',
  }[stage];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Runda: {round}</span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Próg: {formatPercent(lastRequired)}</span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Podgląd: {showDurationSeconds}s</span>
        </div>
        {stage !== 'idle' && (
          <button
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-white/10"
            onClick={() => {
              playNormalClickSound();
              startRound(1);
            }}
            type="button"
          >
            Restart
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/20 p-4">
        <div
          className={`flex h-48 items-center justify-center rounded-lg border border-white/10 text-center text-sm font-semibold text-white transition duration-200 sm:h-64 ${
            stage === 'idle' ? 'scale-[0.99] opacity-50 blur-[1px]' : stage === 'showing' ? 'color-memory-pulse' : ''
          }`}
          style={{ backgroundColor: stage === 'showing' ? targetColor : '#111827' }}
        >
          <span
            className={`rounded-md px-4 py-2 text-lg shadow-[0_0_18px_rgba(0,0,0,0.25)] ${
              stage === 'showing' ? 'bg-black/40 text-white' : stage === 'choosing' ? 'bg-cyan-300/10 text-cyan-100' : 'bg-black/35'
            }`}
          >
            {stageLabel}
          </span>
        </div>
        {stage === 'idle' && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Zapamiętaj kolor, a potem odtwórz go jak najdokładniej."
            onStart={() => {
              playNormalClickSound();
              startRound(1);
            }}
            title="Gotowy na próbę koloru?"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <label
          className={`rounded-lg border bg-black/20 p-4 transition ${
            stage === 'choosing'
              ? 'border-cyan-300/30 shadow-[0_0_24px_rgba(34,211,238,0.10)]'
              : 'border-white/10 opacity-65'
          }`}
        >
          <span className="text-sm font-semibold text-white">Twój kolor</span>
          <input
            className="mt-3 h-16 w-full cursor-pointer rounded-md border border-white/10 bg-transparent transition disabled:cursor-not-allowed disabled:opacity-45"
            disabled={stage !== 'choosing'}
            onChange={(event) => setSelectedColor(event.target.value)}
            type="color"
            value={selectedColor}
          />
          <span className="mt-3 block text-sm text-slate-400">{selectedColor.toUpperCase()}</span>
        </label>

        <div className={`rounded-lg border bg-black/20 p-4 transition ${stage === 'choosing' ? 'border-white/15' : 'border-white/10 opacity-65'}`}>
          <p className="text-sm font-semibold text-white">Szybkie presety</p>
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {presets.map((color) => (
              <button
                aria-label={`Wybierz ${color}`}
                className={`h-12 rounded-md border transition hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${
                  isSameColor(color, selectedColor)
                    ? 'border-white ring-2 ring-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.28)]'
                    : 'border-white/20 hover:border-white/60'
                }`}
                disabled={stage !== 'choosing'}
                key={color}
                onClick={() => {
                  playNormalClickSound();
                  setSelectedColor(color);
                }}
                style={{ backgroundColor: color }}
                title={color.toUpperCase()}
                type="button"
              />
            ))}
          </div>
        </div>
      </div>

      {lastSimilarity !== null && (
        <div className={`feedback-toast rounded-lg border p-4 text-sm transition duration-200 ${getSimilarityFeedbackClass(lastSimilarity)}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-bold">
              Match <strong className="text-white">{formatPercent(lastSimilarity)}</strong> / próg{' '}
              <strong className="text-white">{formatPercent(lastRequired)}</strong>
            </p>
            {lastSimilarity >= 95 && (
              <span className="rounded-full border border-yellow-200/45 bg-yellow-200/15 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.22)]">
                Perfect
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Kolor docelowy</span>
              <span className="mt-2 block h-10 rounded" style={{ backgroundColor: targetColor }} />
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Twój wybór</span>
              <span className="mt-2 block h-10 rounded" style={{ backgroundColor: selectedColor }} />
            </div>
          </div>
        </div>
      )}

      {summary && (
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <h3 className="text-base font-semibold text-white">Podsumowanie</h3>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Ukończona runda</span>
              <strong className="mt-1 block text-white">Runda {summary.completedRound}</strong>
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Średnie podobieństwo</span>
              <strong className="mt-1 block text-white">{formatPercent(summary.averageSimilarity)}</strong>
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Najlepsze podobieństwo</span>
              <strong className="mt-1 block text-white">{formatPercent(summary.bestSimilarity)}</strong>
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Najgorsze podobieństwo</span>
              <strong className="mt-1 block text-white">{formatPercent(summary.worstSimilarity)}</strong>
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Udane rundy</span>
              <strong className="mt-1 block text-white">{summary.passedRounds}</strong>
            </div>
            <div className="rounded-md bg-black/20 p-3">
              <span className="text-slate-400">Perfect / 90%+</span>
              <strong className="mt-1 block text-white">{summary.perfectMatches} / {summary.highPrecisionMatches}</strong>
            </div>
          </div>

          {summary.bestMatch && (
            <div className="mt-4 rounded-md bg-black/20 p-3">
              <h4 className="text-sm font-semibold text-white">Najlepsze podobieństwo</h4>
              <p className="mt-1 text-sm text-slate-400">
                Runda {summary.bestMatch.round}, podobieństwo {formatPercent(summary.bestMatch.similarity)}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-slate-500">Kolor docelowy</span>
                  <span className="mt-1 block h-10 rounded" style={{ backgroundColor: summary.bestMatch.targetColor }} />
                </div>
                <div>
                  <span className="text-xs text-slate-500">Wybrany kolor</span>
                  <span className="mt-1 block h-10 rounded" style={{ backgroundColor: summary.bestMatch.selectedColor }} />
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:scale-105 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={stage !== 'choosing'}
          onClick={() => {
            playNormalClickSound();
            submitColor();
          }}
          type="button"
        >
          Zatwierdź kolor
        </button>
        <button
          className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          disabled={stage !== 'passed'}
          onClick={() => {
            playNormalClickSound();
            startRound(round + 1);
          }}
          type="button"
        >
          Następna runda
        </button>
      </div>
    </div>
  );
}
