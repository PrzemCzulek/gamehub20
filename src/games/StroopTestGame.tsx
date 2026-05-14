import { useEffect, useMemo, useRef, useState } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import { readStoredStroopDuration, storeStroopDuration, stroopDurationOptions } from '../data/stroopDurations';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type StroopTestGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'running' | 'finished';

type StroopColor = {
  id: string;
  word: string;
  label: string;
  className: string;
  glowClassName: string;
};

type Prompt = {
  word: StroopColor;
  ink: StroopColor;
  isConflict: boolean;
  startedAt: number;
  deadlineMs: number;
};

const baseColors: StroopColor[] = [
  { id: 'red', word: 'RED', label: 'RED', className: 'text-red-300', glowClassName: 'shadow-red-500/25' },
  { id: 'blue', word: 'BLUE', label: 'BLUE', className: 'text-cyan-300', glowClassName: 'shadow-cyan-400/25' },
  { id: 'green', word: 'GREEN', label: 'GREEN', className: 'text-emerald-300', glowClassName: 'shadow-emerald-400/25' },
  { id: 'yellow', word: 'YELLOW', label: 'YELLOW', className: 'text-yellow-200', glowClassName: 'shadow-yellow-300/25' },
];

const advancedColors: StroopColor[] = [
  { id: 'purple', word: 'PURPLE', label: 'PURPLE', className: 'text-violet-300', glowClassName: 'shadow-violet-400/25' },
  { id: 'orange', word: 'ORANGE', label: 'ORANGE', className: 'text-orange-300', glowClassName: 'shadow-orange-400/25' },
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function getActiveColors(correctAnswers: number): StroopColor[] {
  if (correctAnswers >= 14) return [...baseColors, ...advancedColors];
  if (correctAnswers >= 7) return [...baseColors, advancedColors[0]];
  return baseColors;
}

function createPrompt(correctAnswers: number): Prompt {
  const colors = getActiveColors(correctAnswers);
  const conflictChance = correctAnswers >= 14 ? 0.82 : correctAnswers >= 7 ? 0.72 : 0.58;
  const ink = pickRandom(colors);
  const shouldConflict = Math.random() < conflictChance;
  const wordPool = shouldConflict ? colors.filter((color) => color.id !== ink.id) : colors;
  const word = pickRandom(wordPool);
  const deadlineMs = Math.max(1050, 2400 - correctAnswers * 55);

  return {
    word,
    ink,
    isConflict: word.id !== ink.id,
    startedAt: performance.now(),
    deadlineMs,
  };
}

function getScore(correctAnswers: number, bestStreak: number, mistakes: number): number {
  return Math.max(0, correctAnswers * 100 + bestStreak * 18 - mistakes * 35);
}

function getAccuracy(correctAnswers: number, mistakes: number): number {
  const total = correctAnswers + mistakes;
  return total > 0 ? Math.round((correctAnswers / total) * 10000) / 100 : 0;
}

export function StroopTestGame({ onScore }: StroopTestGameProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [selectedDurationSeconds, setSelectedDurationSeconds] = useState(readStoredStroopDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(selectedDurationSeconds);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [conflictCorrect, setConflictCorrect] = useState(0);
  const [conflictTotal, setConflictTotal] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong' | 'timeout'>('idle');
  const submittedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);
  const stageRef = useRef<Stage>('idle');
  const resolvingRef = useRef(false);
  const statsRef = useRef({
    correctAnswers: 0,
    mistakes: 0,
    bestStreak: 0,
    reactionTimes: [] as number[],
    conflictCorrect: 0,
    conflictTotal: 0,
  });

  const accuracy = getAccuracy(correctAnswers, mistakes);
  const avgReactionMs = reactionTimes.length
    ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length)
    : 0;
  const conflictAccuracy = conflictTotal > 0 ? Math.round((conflictCorrect / conflictTotal) * 10000) / 100 : 0;
  const currentScore = getScore(correctAnswers, bestStreak, mistakes);

  const activeColors = useMemo(() => getActiveColors(correctAnswers), [correctAnswers]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    if (stage !== 'running') return;

    const intervalId = window.setInterval(() => {
      if (startedAtRef.current === null) return;

      const elapsedSeconds = Math.floor((performance.now() - startedAtRef.current) / 1000);
      const nextRemaining = Math.max(0, selectedDurationSeconds - elapsedSeconds);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        finishRun();
      }
    }, 120);

    return () => window.clearInterval(intervalId);
  }, [selectedDurationSeconds, stage]);

  useEffect(() => {
    if (stage !== 'running' || !prompt) return;

    const timeoutId = window.setTimeout(() => {
      markMistake(true);
    }, prompt.deadlineMs);

    return () => window.clearTimeout(timeoutId);
  }, [prompt, stage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (stage !== 'running') return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const keyMap: Record<string, string> = {
        r: 'red',
        b: 'blue',
        g: 'green',
        y: 'yellow',
        p: 'purple',
        o: 'orange',
        '1': activeColors[0]?.id,
        '2': activeColors[1]?.id,
        '3': activeColors[2]?.id,
        '4': activeColors[3]?.id,
        '5': activeColors[4]?.id,
        '6': activeColors[5]?.id,
      };
      const colorId = keyMap[event.key.toLowerCase()];

      if (colorId) {
        event.preventDefault();
        answer(colorId);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeColors, prompt, stage]);

  function syncStats(next: Partial<typeof statsRef.current>) {
    statsRef.current = { ...statsRef.current, ...next };
  }

  function resetState() {
    submittedRef.current = false;
    startedAtRef.current = null;
    statsRef.current = {
      correctAnswers: 0,
      mistakes: 0,
      bestStreak: 0,
      reactionTimes: [],
      conflictCorrect: 0,
      conflictTotal: 0,
    };
    setCorrectAnswers(0);
    setMistakes(0);
    setCombo(0);
    setBestStreak(0);
    setReactionTimes([]);
    setConflictCorrect(0);
    setConflictTotal(0);
    setFeedback('idle');
    resolvingRef.current = false;
  }

  function startRun() {
    playNormalClickSound();
    resetState();
    startedAtRef.current = performance.now();
    setRemainingSeconds(selectedDurationSeconds);
    resolvingRef.current = false;
    setPrompt(createPrompt(0));
    setStage('running');
  }

  function finishRun() {
    if (submittedRef.current) return;

    submittedRef.current = true;
    resolvingRef.current = true;
    startedAtRef.current = null;
    setStage('finished');
    setPrompt(null);

    const finalStats = statsRef.current;
    const finalAccuracy = getAccuracy(finalStats.correctAnswers, finalStats.mistakes);
    const finalAvgReactionMs = finalStats.reactionTimes.length
      ? Math.round(finalStats.reactionTimes.reduce((total, value) => total + value, 0) / finalStats.reactionTimes.length)
      : 0;
    const finalConflictAccuracy =
      finalStats.conflictTotal > 0 ? Math.round((finalStats.conflictCorrect / finalStats.conflictTotal) * 10000) / 100 : 0;
    const score = getScore(finalStats.correctAnswers, finalStats.bestStreak, finalStats.mistakes);

    onScore({
      gameId: 'stroop-test',
      score,
      scoreLabel: `${score} pkt`,
      stats: {
        durationSeconds: selectedDurationSeconds,
        accuracy: finalAccuracy,
        averageReactionMs: finalAvgReactionMs,
        bestCombo: finalStats.bestStreak,
        combo: finalStats.bestStreak,
        correctAnswers: finalStats.correctAnswers,
        mistakes: finalStats.mistakes,
        conflictAccuracy: finalConflictAccuracy,
      },
      runDurationMs: selectedDurationSeconds * 1000,
      meta: {
        durationSeconds: selectedDurationSeconds,
        correctAnswers: finalStats.correctAnswers,
        mistakes: finalStats.mistakes,
        bestStreak: finalStats.bestStreak,
        avgReactionMs: finalAvgReactionMs,
        conflictAccuracy: finalConflictAccuracy,
      },
    });
  }

  function nextPrompt(nextCorrectAnswers: number) {
    window.setTimeout(() => {
      if (stageRef.current === 'running') {
        resolvingRef.current = false;
        setPrompt(createPrompt(nextCorrectAnswers));
      }
    }, 110);
  }

  function markMistake(timeout = false) {
    if (stage !== 'running' || !prompt || resolvingRef.current) return;
    resolvingRef.current = true;

    const nextMistakes = statsRef.current.mistakes + 1;
    const nextConflictTotal = prompt.isConflict ? statsRef.current.conflictTotal + 1 : statsRef.current.conflictTotal;

    setFeedback(timeout ? 'timeout' : 'wrong');
    setMistakes(nextMistakes);
    setCombo(0);
    setConflictTotal(nextConflictTotal);
    syncStats({
      mistakes: nextMistakes,
      conflictTotal: nextConflictTotal,
    });
    setPrompt(null);
    nextPrompt(statsRef.current.correctAnswers);
  }

  function answer(colorId: string) {
    if (stage !== 'running' || !prompt || resolvingRef.current) return;

    playNormalClickSound();
    const reactionMs = Math.round(performance.now() - prompt.startedAt);

    if (colorId !== prompt.ink.id) {
      markMistake(false);
      return;
    }

    resolvingRef.current = true;

    const nextCorrectAnswers = statsRef.current.correctAnswers + 1;
    const nextCombo = combo + 1;
    const nextBestStreak = Math.max(statsRef.current.bestStreak, nextCombo);
    const nextReactionTimes = [...statsRef.current.reactionTimes, reactionMs];
    const nextConflictTotal = prompt.isConflict ? statsRef.current.conflictTotal + 1 : statsRef.current.conflictTotal;
    const nextConflictCorrect = prompt.isConflict ? statsRef.current.conflictCorrect + 1 : statsRef.current.conflictCorrect;

    setFeedback('correct');
    setCorrectAnswers(nextCorrectAnswers);
    setCombo(nextCombo);
    setBestStreak(nextBestStreak);
    setReactionTimes(nextReactionTimes);
    setConflictTotal(nextConflictTotal);
    setConflictCorrect(nextConflictCorrect);
    syncStats({
      correctAnswers: nextCorrectAnswers,
      bestStreak: nextBestStreak,
      reactionTimes: nextReactionTimes,
      conflictTotal: nextConflictTotal,
      conflictCorrect: nextConflictCorrect,
    });
    setPrompt(null);
    nextPrompt(nextCorrectAnswers);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {stroopDurationOptions.map((option) => (
          <button
            aria-pressed={selectedDurationSeconds === option.value}
            className={`rounded-xl border px-4 py-2 text-sm font-black transition ${
              selectedDurationSeconds === option.value
                ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.24)]'
                : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10'
            }`}
            disabled={stage === 'running'}
            key={option.value}
            onClick={() => {
              playNormalClickSound();
              storeStroopDuration(option.value);
              setSelectedDurationSeconds(option.value);
              setRemainingSeconds(option.value);
            }}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-5">
        <Stat label="Czas" value={`${remainingSeconds}s`} />
        <Stat label="Punkty" value={String(currentScore)} />
        <Stat label="Combo" value={`x${combo}`} />
        <Stat label="Celność" value={formatPercent(accuracy)} />
        <Stat label="Śr. reakcja" value={avgReactionMs ? `${avgReactionMs} ms` : '-'} />
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),rgba(15,23,42,0.18)_38%,rgba(2,6,23,0.72))] p-5 shadow-[0_0_48px_rgba(34,211,238,0.10)]">
        {stage === 'idle' && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Wybieraj kolor tekstu, ignoruj znaczenie słowa."
            onStart={startRun}
            title="Gotowy na Stroop Test?"
          />
        )}

        <div
          className={`flex min-h-[20rem] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-5 text-center transition ${
            feedback === 'correct'
              ? 'shadow-[0_0_34px_rgba(34,211,238,0.18)]'
              : feedback === 'wrong' || feedback === 'timeout'
                ? 'shadow-[0_0_34px_rgba(248,113,113,0.16)]'
                : ''
          }`}
        >
          {stage === 'finished' ? (
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Run complete</p>
              <h3 className="mt-3 text-5xl font-black text-white">{currentScore}</h3>
              <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Punkty</p>
              <div className="mt-6 grid gap-2 text-sm sm:grid-cols-3">
                <Stat label="Correct" value={String(correctAnswers)} />
                <Stat label="Mistakes" value={String(mistakes)} />
                <Stat label="Conflict" value={formatPercent(conflictAccuracy)} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200"
                  onClick={startRun}
                  type="button"
                >
                  Jeszcze raz
                </button>
                <ShareResultButton
                  gameId="stroop-test"
                  metricLabel="Punkty"
                  modeLabel={`${selectedDurationSeconds}s`}
                  scoreLabel={`${currentScore} pkt`}
                />
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Kolor tekstu</p>
              <div className={`mt-7 rounded-3xl px-8 py-6 ${prompt?.ink.glowClassName ?? 'shadow-cyan-400/10'} shadow-2xl`}>
                <h3 className={`select-none text-6xl font-black tracking-[0.12em] sm:text-8xl ${prompt?.ink.className ?? 'text-slate-500'}`}>
                  {prompt?.word.word ?? 'STROOP'}
                </h3>
              </div>
              <p className="mt-5 h-5 text-sm font-black uppercase tracking-[0.18em]">
                {feedback === 'correct' && <span className="text-cyan-200">Correct · combo x{combo}</span>}
                {feedback === 'wrong' && <span className="text-red-200">Wrong color</span>}
                {feedback === 'timeout' && <span className="text-red-200">Too slow</span>}
                {feedback === 'idle' && <span className="text-slate-500">Focus mode</span>}
              </p>
            </>
          )}
        </div>
      </div>

      {stage === 'running' && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {activeColors.map((color, index) => (
            <button
              aria-label={`Wybierz kolor ${color.label}`}
              className={`rounded-2xl border border-white/10 bg-black/25 px-3 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:scale-[1.03] hover:border-cyan-300/40 hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 ${color.glowClassName} shadow-lg`}
              key={color.id}
              onClick={() => answer(color.id)}
              type="button"
            >
              <span className={color.className}>{color.label}</span>
              <span className="mt-1 block text-[0.62rem] text-slate-500">{index + 1}</span>
            </button>
          ))}
        </div>
      )}
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
