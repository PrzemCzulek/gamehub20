import { useEffect, useRef, useState } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type WordMemoryGameProps = {
  onScore: (score: ScoreInput) => void;
};

type AnswerFeedback = {
  correct: boolean;
  text: string;
  detail: string;
  combo: number;
};

const wordPool = [
  'laser',
  'pixel',
  'arena',
  'tempo',
  'bonus',
  'level',
  'score',
  'combo',
  'quest',
  'portal',
  'shield',
  'target',
  'memory',
  'signal',
  'vector',
  'rocket',
  'button',
  'puzzle',
  'switch',
  'matrix',
];
const maxRounds = 30;
const maxMistakes = 3;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickNextWord(seenWords: string[]): string {
  const shouldRepeat = seenWords.length > 0 && Math.random() < 0.45;
  const unusedWords = wordPool.filter((word) => !seenWords.includes(word));

  if (shouldRepeat || unusedWords.length === 0) {
    return pickRandom(seenWords);
  }

  return pickRandom(unusedWords);
}

function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
}

export function WordMemoryGame({ onScore }: WordMemoryGameProps) {
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [seenWords, setSeenWords] = useState<string[]>([]);
  const [rounds, setRounds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [wordAnimationKey, setWordAnimationKey] = useState(0);
  const answerLockedRef = useRef(false);
  const feedbackTimerRef = useRef<number | null>(null);

  function clearFeedbackTimer() {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }

  useEffect(() => {
    return clearFeedbackTimer;
  }, []);

  function start() {
    clearFeedbackTimer();
    const firstWord = pickRandom(wordPool);
    setCurrentWord(firstWord);
    setSeenWords([]);
    setRounds(0);
    setMistakes(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setFinished(false);
    setFeedback(null);
    setWordAnimationKey((value) => value + 1);
    answerLockedRef.current = false;
  }

  function finish(finalScore: number, finalRounds: number, finalMistakes: number, finalBestCombo: number) {
    if (finished) {
      return;
    }

    setFinished(true);
    answerLockedRef.current = true;
    setCurrentWord(null);
    onScore({
      gameId: 'word-memory',
      score: finalScore,
      scoreLabel: `${finalScore} pkt`,
      meta: { rounds: finalRounds, mistakes: finalMistakes, bestCombo: finalBestCombo },
    });
  }

  function answer(answerWasSeen: boolean) {
    if (!currentWord || finished || answerLockedRef.current) {
      return;
    }

    clearFeedbackTimer();
    answerLockedRef.current = true;
    const wordWasSeen = seenWords.includes(currentWord);
    const correct = answerWasSeen === wordWasSeen;
    const nextRounds = rounds + 1;
    const nextSeenWords = [...seenWords, currentWord];
    let nextMistakes = mistakes;
    let nextCombo = combo;
    let nextBestCombo = bestCombo;
    let nextScore = score;

    if (correct) {
      nextCombo += 1;
      nextBestCombo = Math.max(bestCombo, nextCombo);
      nextScore += 100 + nextCombo * 15;
    } else {
      nextMistakes += 1;
      nextCombo = 0;
      nextScore = Math.max(0, nextScore - 50);
    }

    setFeedback({
      correct,
      text: correct ? 'Dobrze!' : 'Błąd',
      detail: wordWasSeen ? 'To słowo już było' : 'To było nowe',
      combo: nextCombo,
    });
    setSeenWords(nextSeenWords);
    setRounds(nextRounds);
    setMistakes(nextMistakes);
    setCombo(nextCombo);
    setBestCombo(nextBestCombo);
    setScore(nextScore);

    if (nextMistakes >= maxMistakes || nextRounds >= maxRounds) {
      feedbackTimerRef.current = window.setTimeout(() => {
        finish(nextScore, nextRounds, nextMistakes, nextBestCombo);
      }, 420);
      return;
    }

    feedbackTimerRef.current = window.setTimeout(() => {
      setCurrentWord(pickNextWord(nextSeenWords));
      setWordAnimationKey((value) => value + 1);
      setFeedback(null);
      answerLockedRef.current = false;
      feedbackTimerRef.current = null;
    }, 420);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event) || !currentWord || finished) {
        return;
      }

      if (event.key.toLowerCase() === 'n' || event.key === 'ArrowLeft') {
        event.preventDefault();
        playNormalClickSound();
        answer(false);
      }

      if (event.key.toLowerCase() === 'b' || event.key === 'ArrowRight') {
        event.preventDefault();
        playNormalClickSound();
        answer(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentWord, finished, seenWords, rounds, mistakes, score, combo, bestCombo]);

  const started = Boolean(currentWord) || rounds > 0 || finished;
  const canAnswer = Boolean(currentWord) && !finished && !answerLockedRef.current;
  const progressPercent = Math.min(100, Math.round((rounds / maxRounds) * 100));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Runda: <strong className="text-white">{rounds}/{maxRounds}</strong>
          </span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Błędy: <strong className="text-white">{mistakes}/{maxMistakes}</strong>
          </span>
          <span className={`rounded-md bg-black/20 px-3 py-2 text-slate-300 transition ${combo > 0 ? 'combo-pulse text-cyan-100' : ''}`}>
            Combo: <strong className="text-white">{combo}</strong>
          </span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Punkty: <strong className="text-white">{score}</strong>
          </span>
        </div>
        {started && (
          <button
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-white/10"
            onClick={() => {
              playNormalClickSound();
              start();
            }}
            type="button"
          >
            Zagraj ponownie
          </button>
        )}
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-all duration-200" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20 p-5 text-center sm:p-8">
        <div className={`transition duration-200 ${!started ? 'opacity-45 blur-[1px]' : ''}`}>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
            {currentWord ? 'Czy to słowo już było?' : finished ? 'Gra zakończona' : 'Word Memory'}
          </p>

          {currentWord ? (
            <strong
              className={`word-card-enter mt-5 block rounded-2xl border px-5 py-8 text-5xl font-black uppercase tracking-wide text-white shadow-[0_0_35px_rgba(34,211,238,0.08)] sm:text-6xl ${
                feedback
                  ? feedback.correct
                    ? 'border-emerald-300/35 bg-emerald-300/[0.08]'
                    : 'word-card-error border-red-300/35 bg-red-400/[0.10]'
                  : 'border-cyan-300/18 bg-white/[0.045]'
              }`}
              key={wordAnimationKey}
            >
              {currentWord}
            </strong>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-8">
              <strong className="block text-4xl font-black text-white">{finished ? `${score} pkt` : 'Start'}</strong>
              {finished && (
                <p className="mt-3 text-sm text-slate-300">
                  Najlepsze combo: <strong className="text-white">{bestCombo}</strong> · Błędy:{' '}
                  <strong className="text-white">{mistakes}</strong>
                </p>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`feedback-toast mx-auto mt-4 max-w-sm rounded-lg border px-4 py-3 text-sm font-semibold ${
                feedback.correct
                  ? 'border-emerald-300/35 bg-emerald-300/[0.10] text-emerald-100'
                  : 'border-red-300/35 bg-red-400/[0.10] text-red-100'
              }`}
            >
              <span className="block text-base font-black">{feedback.text}</span>
              <span className="mt-1 block opacity-85">
                {feedback.correct && feedback.combo > 1 ? `Combo x${feedback.combo} · ` : ''}
                {feedback.detail}
              </span>
            </div>
          )}
        </div>

        {!started && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Decyduj, czy słowo pojawia się pierwszy raz, czy już było wcześniej."
            onStart={() => {
              playNormalClickSound();
              start();
            }}
            title="Gotowy na test słów?"
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          aria-label="Odpowiedź: nowe słowo"
          className="rounded-xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-5 text-lg font-black text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.08)] transition hover:scale-[1.03] hover:bg-emerald-300/20 hover:shadow-[0_0_26px_rgba(16,185,129,0.14)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          disabled={!canAnswer}
          onClick={() => {
            playNormalClickSound();
            answer(false);
          }}
          type="button"
        >
          <span className="block text-2xl">Nowe</span>
          <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] opacity-70">N / ←</span>
        </button>
        <button
          aria-label="Odpowiedź: słowo już było"
          className="rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-5 text-lg font-black text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.08)] transition hover:scale-[1.03] hover:bg-amber-300/20 hover:shadow-[0_0_26px_rgba(251,191,36,0.14)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100"
          disabled={!canAnswer}
          onClick={() => {
            playNormalClickSound();
            answer(true);
          }}
          type="button"
        >
          <span className="block text-2xl">Było</span>
          <span className="mt-1 block text-xs font-bold uppercase tracking-[0.2em] opacity-70">B / →</span>
        </button>
      </div>
    </div>
  );
}
