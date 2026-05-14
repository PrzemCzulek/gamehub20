import { useEffect, useMemo, useRef, useState } from 'react';
import { readStoredTypingDuration, storeTypingDuration, typingDurationOptions } from '../data/typingDurations';
import {
  getTypingTexts,
  readStoredTypingDifficulty,
  storeTypingDifficulty,
  typingDifficultyOptions,
  type TypingDifficulty,
} from '../data/typingTexts';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type TypingSpeedGameProps = {
  onScore: (score: ScoreInput) => void;
};

type TestStatus = 'idle' | 'active' | 'finished';
type FinishReason = 'timer' | 'manual';
type TypingSnapshot = {
  selectedDuration: number;
  remainingSeconds: number;
  correctChars: number;
  incorrectChars: number;
  completedSentences: number;
  typed: string;
  currentText: string;
  status: TestStatus;
  difficulty: TypingDifficulty;
};

const maxCreditedWpm = 240;
const noTypingResultMessage = 'Brak wyniku do zapisania — wpisz tekst podczas testu.';
const tooShortResultMessage = 'Wynik za krótki do zapisu — pisz co najmniej kilka sekund.';
const minSavedCorrectChars = 10;
const minSavedTotalTypedChars = 20;
const minSavedElapsedSeconds = 5;

function toChars(value: string): string[] {
  return Array.from(value);
}

function shuffleTexts(difficulty: TypingDifficulty): string[] {
  return [...getTypingTexts(difficulty)].sort(() => Math.random() - 0.5);
}

function calculateWpm(correctChars: number, elapsedSeconds: number): number {
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  return Math.round(correctChars / 5 / minutes);
}

function calculateAccuracy(correctChars: number, incorrectChars: number): number {
  const total = correctChars + incorrectChars;
  return total > 0 ? (correctChars / total) * 100 : 100;
}

export function TypingSpeedGame({ onScore }: TypingSpeedGameProps) {
  const initialDifficulty = readStoredTypingDifficulty();
  const [selectedDuration, setSelectedDuration] = useState(readStoredTypingDuration);
  const [difficulty, setDifficulty] = useState<TypingDifficulty>(initialDifficulty);
  const [textQueue, setTextQueue] = useState(() => shuffleTexts(initialDifficulty));
  const [queueIndex, setQueueIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState<TestStatus>('idle');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(selectedDuration);
  const [correctChars, setCorrectChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [currentCorrectChars, setCurrentCorrectChars] = useState(0);
  const [currentIncorrectChars, setCurrentIncorrectChars] = useState(0);
  const [completedSentences, setCompletedSentences] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const savedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const latestSnapshotRef = useRef<TypingSnapshot | null>(null);

  const fallbackTexts = getTypingTexts(difficulty);
  const currentText = textQueue[queueIndex] ?? fallbackTexts[0];
  const nextText = textQueue[queueIndex + 1] ?? textQueue[0] ?? fallbackTexts[1];
  const elapsedSeconds = startedAt ? selectedDuration - remainingSeconds : 0;
  const displayElapsedSeconds = status === 'active' ? Math.max(1, elapsedSeconds) : elapsedSeconds;
  const liveCorrectChars = correctChars + currentCorrectChars;
  const liveIncorrectChars = incorrectChars + currentIncorrectChars;
  const liveWpm = status === 'idle' ? 0 : Math.min(maxCreditedWpm, calculateWpm(liveCorrectChars, displayElapsedSeconds || 1));
  const accuracy = calculateAccuracy(liveCorrectChars, liveIncorrectChars);
  const statusLabel =
    status === 'finished' ? 'Test zakończony' : status === 'active' ? 'Test aktywny' : 'Zacznij pisać, aby rozpocząć test';

  const charStates = useMemo(() => {
    const typedChars = toChars(typed);
    return toChars(currentText).map((char, index) => {
      const typedChar = typedChars[index];
      const state = typedChar === undefined ? (index === typedChars.length ? 'current' : 'pending') : typedChar === char ? 'correct' : 'wrong';
      return { char, state };
    });
  }, [currentText, typed]);

  useEffect(() => {
    latestSnapshotRef.current = {
      selectedDuration,
      remainingSeconds,
      correctChars,
      incorrectChars,
      completedSentences,
      typed,
      currentText,
      status,
      difficulty,
    };
  });

  useEffect(() => {
    if (status !== 'active' || !startedAt) return;

    const interval = window.setInterval(() => {
      const elapsed = Math.floor((performance.now() - startedAt) / 1000);
      const nextRemaining = Math.max(0, selectedDuration - elapsed);
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) finishTest('timer');
    }, 250);

    return () => window.clearInterval(interval);
  }, [selectedDuration, startedAt, status]);

  function reset(nextDifficulty = difficulty) {
    const nextQueue = shuffleTexts(nextDifficulty);
    setTextQueue(nextQueue);
    setQueueIndex(0);
    setTyped('');
    setStatus('idle');
    setStartedAt(null);
    setRemainingSeconds(selectedDuration);
    setCorrectChars(0);
    setIncorrectChars(0);
    setCurrentCorrectChars(0);
    setCurrentIncorrectChars(0);
    setCompletedSentences(0);
    setResult(null);
    setPasteBlocked(false);
    savedRef.current = false;
  }

  function countTypedAgainstTarget(value: string, target = currentText) {
    const targetChars = toChars(target);
    return toChars(value).reduce(
      (counts, char, index) => {
        if (char === targetChars[index]) counts.correct += 1;
        else counts.incorrect += 1;
        return counts;
      },
      { correct: 0, incorrect: 0 },
    );
  }

  function finishTest(reason: FinishReason = 'manual') {
    if (savedRef.current) return;

    const snapshot = latestSnapshotRef.current ?? {
      selectedDuration,
      remainingSeconds,
      correctChars,
      incorrectChars,
      completedSentences,
      typed,
      currentText,
      status,
      difficulty,
    };
    const partialInput = toChars(snapshot.typed).slice(0, toChars(snapshot.currentText).length).join('');
    const partialCounts = countTypedAgainstTarget(partialInput, snapshot.currentText);
    const sentenceCompletedInInput = toChars(partialInput).length >= toChars(snapshot.currentText).length && partialInput.length > 0;
    const finalCorrectChars = snapshot.correctChars + partialCounts.correct;
    const finalIncorrectChars = snapshot.incorrectChars + partialCounts.incorrect;
    const finalTotalTypedChars = finalCorrectChars + finalIncorrectChars;
    const elapsedFromRemaining = Math.max(0, snapshot.selectedDuration - snapshot.remainingSeconds);
    const finalElapsedSeconds = reason === 'timer' ? snapshot.selectedDuration : Math.max(5, elapsedFromRemaining);
    const finalCompletedSentences = snapshot.completedSentences + (sentenceCompletedInInput ? 1 : 0);
    const rawWpm = calculateWpm(finalCorrectChars, finalElapsedSeconds);
    const wpm = Math.min(rawWpm, maxCreditedWpm);
    const finalAccuracy = calculateAccuracy(finalCorrectChars, finalIncorrectChars);
    const finalStats = {
      accuracy: finalAccuracy,
      durationSeconds: finalElapsedSeconds,
      correctChars: finalCorrectChars,
      incorrectChars: finalIncorrectChars,
      completedSentences: finalCompletedSentences,
      totalTypedChars: finalTotalTypedChars,
      rawWpm,
      wpm,
      selectedDuration: snapshot.selectedDuration,
      difficulty: snapshot.difficulty,
    };

    if (import.meta.env.DEV) console.log('Typing finish stats', finalStats);

    savedRef.current = true;
    setStatus('finished');
    setRemainingSeconds(0);

    if (finalTotalTypedChars === 0 || finalCorrectChars === 0 || wpm <= 0) {
      setResult(noTypingResultMessage);
      return;
    }

    if (finalCorrectChars < minSavedCorrectChars || finalTotalTypedChars < minSavedTotalTypedChars || finalElapsedSeconds < minSavedElapsedSeconds) {
      setResult(tooShortResultMessage);
      return;
    }

    const label = `${wpm} WPM`;
    setResult(`${label}, dokładność ${formatPercent(finalAccuracy)} · ${snapshot.difficulty.toUpperCase()}`);
    onScore({
      gameId: 'typing-speed',
      score: wpm,
      scoreLabel: label,
      stats: {
        accuracy: finalAccuracy,
        durationSeconds: finalElapsedSeconds,
        durationMs: finalElapsedSeconds * 1000,
        rounds: finalCompletedSentences,
        completedSentences: finalCompletedSentences,
        correctChars: finalCorrectChars,
        incorrectChars: finalIncorrectChars,
        totalTypedChars: finalTotalTypedChars,
        rawWpm,
        selectedDuration: snapshot.selectedDuration,
        difficulty: snapshot.difficulty,
      },
      meta: {
        accuracy: finalAccuracy,
        durationSeconds: finalElapsedSeconds,
        correctChars: finalCorrectChars,
        incorrectChars: finalIncorrectChars,
        completedSentences: finalCompletedSentences,
        totalTypedChars: finalTotalTypedChars,
        rawWpm,
        selectedDuration: snapshot.selectedDuration,
        difficulty: snapshot.difficulty,
      },
      runDurationMs: finalElapsedSeconds * 1000,
    });
  }

  function advanceSentence(finalValue: string) {
    if (savedRef.current) return;

    const counts = countTypedAgainstTarget(toChars(finalValue).slice(0, toChars(currentText).length).join(''));
    const latestSnapshot = latestSnapshotRef.current;
    const nextCorrectChars = (latestSnapshot?.correctChars ?? correctChars) + counts.correct;
    const nextIncorrectChars = (latestSnapshot?.incorrectChars ?? incorrectChars) + counts.incorrect;
    const nextCompletedSentences = (latestSnapshot?.completedSentences ?? completedSentences) + 1;
    const nextCurrentText = textQueue[queueIndex + 1] ?? textQueue[0] ?? fallbackTexts[0];

    latestSnapshotRef.current = {
      selectedDuration,
      remainingSeconds,
      correctChars: nextCorrectChars,
      incorrectChars: nextIncorrectChars,
      completedSentences: nextCompletedSentences,
      typed: '',
      currentText: nextCurrentText,
      status,
      difficulty,
    };

    setCorrectChars((value) => value + counts.correct);
    setIncorrectChars((value) => value + counts.incorrect);
    setCurrentCorrectChars(0);
    setCurrentIncorrectChars(0);
    setCompletedSentences((value) => value + 1);
    setTyped('');
    setQueueIndex((index) => {
      if (index + 2 >= textQueue.length) setTextQueue((queue) => [...queue, ...shuffleTexts(difficulty)]);
      return index + 1;
    });
  }

  function handleChange(value: string) {
    if (status === 'finished') return;

    if (status === 'idle' && value.length > 0) {
      setStatus('active');
      setStartedAt(performance.now());
      setRemainingSeconds(selectedDuration);
      setResult(null);
      setPasteBlocked(false);
    }

    const currentValue = toChars(value).slice(0, toChars(currentText).length).join('');
    const counts = countTypedAgainstTarget(currentValue);
    const nextStatus = status === 'idle' && value.length > 0 ? 'active' : status;

    latestSnapshotRef.current = {
      selectedDuration,
      remainingSeconds,
      correctChars,
      incorrectChars,
      completedSentences,
      typed: currentValue,
      currentText,
      status: nextStatus,
      difficulty,
    };

    setCurrentCorrectChars(counts.correct);
    setCurrentIncorrectChars(counts.incorrect);
    setTyped(currentValue);

    if (toChars(value).length >= toChars(currentText).length) window.setTimeout(() => advanceSentence(currentValue), 120);
  }

  function handleDurationChange(duration: number) {
    if (status === 'active') return;

    playNormalClickSound();
    storeTypingDuration(duration);
    setSelectedDuration(duration);
    setRemainingSeconds(duration);
  }

  function handleDifficultyChange(nextDifficulty: TypingDifficulty) {
    if (status === 'active') return;

    playNormalClickSound();
    storeTypingDifficulty(nextDifficulty);
    setDifficulty(nextDifficulty);
    reset(nextDifficulty);
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-lg border p-4 text-center ${difficulty === 'hard' ? 'border-fuchsia-300/25 bg-fuchsia-300/[0.06]' : 'border-white/10 bg-black/20'}`}>
        <p className="text-lg font-semibold text-white">{statusLabel}</p>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{difficulty === 'hard' ? 'HARD · Polish chaos' : 'NORMAL · Polish flow'}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {typingDurationOptions.map((duration) => (
          <button
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
              selectedDuration === duration.value ? 'border-teal-300 bg-teal-300 text-slate-950' : 'border-white/15 text-white hover:bg-white/10'
            }`}
            disabled={status === 'active'}
            key={duration.value}
            onClick={() => handleDurationChange(duration.value)}
            type="button"
          >
            {duration.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {typingDifficultyOptions.map((option) => (
          <button
            aria-pressed={difficulty === option.value}
            className={`rounded-md border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
              difficulty === option.value ? option.accentClass : 'border-white/15 text-white hover:bg-white/10'
            }`}
            disabled={status === 'active'}
            key={option.value}
            onClick={() => handleDifficultyChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Czas: {remainingSeconds}s</span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">WPM: {liveWpm}</span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Dokładność: {formatPercent(accuracy)}</span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Poprawne: {liveCorrectChars}</span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Błędy: {liveIncorrectChars}</span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Zdania: {completedSentences}</span>
      </div>

      <button className="w-full rounded-lg border border-white/10 bg-black/20 p-5 text-left" onClick={() => inputRef.current?.focus()} type="button">
        <div className="min-h-24 text-xl leading-9">
          {charStates.map(({ char, state }, index) => (
            <span
              className={
                state === 'correct'
                  ? 'text-teal-200 drop-shadow-[0_0_8px_rgba(45,212,191,0.55)]'
                  : state === 'wrong'
                    ? 'rounded bg-red-400/20 text-red-200'
                    : state === 'current'
                      ? 'typing-current text-white'
                      : 'text-slate-500'
              }
              key={`${char}-${index}`}
            >
              {char}
            </span>
          ))}
        </div>
        <p className="mt-4 translate-y-0 text-sm text-slate-500 transition">
          Następne: <span className="text-slate-400">{nextText}</span>
        </p>
      </button>

      <textarea
        ref={inputRef}
        className="h-24 w-full resize-none rounded-lg border border-white/10 bg-black/25 p-4 text-base leading-7 text-white placeholder:text-slate-500"
        onChange={(event) => handleChange(event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          setPasteBlocked(true);
        }}
        placeholder="Pisz tutaj..."
        readOnly={status === 'finished'}
        value={typed}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:scale-105 hover:bg-white/10"
          onClick={() => {
            playNormalClickSound();
            reset();
          }}
          type="button"
        >
          Reset
        </button>
      </div>
      {pasteBlocked && <p className="text-sm text-amber-200">Wklejanie jest wyłączone w teście szybkości pisania.</p>}
      {result && <p className="rounded-md bg-teal-300/10 p-3 text-sm font-semibold text-teal-100">{result}</p>}
    </div>
  );
}
