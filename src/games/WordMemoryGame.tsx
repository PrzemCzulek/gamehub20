import { useRef, useState } from 'react';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type WordMemoryGameProps = {
  onScore: (score: ScoreInput) => void;
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

export function WordMemoryGame({ onScore }: WordMemoryGameProps) {
  const [currentWord, setCurrentWord] = useState<string | null>(null);
  const [seenWords, setSeenWords] = useState<string[]>([]);
  const [rounds, setRounds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [finished, setFinished] = useState(false);
  const answerLockedRef = useRef(false);

  function start() {
    const firstWord = pickRandom(wordPool);
    setCurrentWord(firstWord);
    setSeenWords([]);
    setRounds(0);
    setMistakes(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setFinished(false);
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

    setSeenWords(nextSeenWords);
    setRounds(nextRounds);
    setMistakes(nextMistakes);
    setCombo(nextCombo);
    setBestCombo(nextBestCombo);
    setScore(nextScore);

    if (nextMistakes >= maxMistakes || nextRounds >= maxRounds) {
      finish(nextScore, nextRounds, nextMistakes, nextBestCombo);
      return;
    }

    setCurrentWord(pickNextWord(nextSeenWords));
    window.setTimeout(() => {
      answerLockedRef.current = false;
    }, 80);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Runda: {rounds}/{maxRounds}
          </span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Błędy: {mistakes}/{maxMistakes}
          </span>
          <span className={`rounded-md bg-black/20 px-3 py-2 text-slate-300 transition ${combo > 0 ? 'combo-pulse text-cyan-100' : ''}`}>
            Combo: {combo}
          </span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Punkty: {score}</span>
        </div>
        <button
          className="rounded-lg bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:scale-105 hover:bg-teal-200"
          onClick={() => {
            playNormalClickSound();
            start();
          }}
          type="button"
        >
          Start
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-8 text-center">
        <p className="text-sm uppercase tracking-wide text-slate-400">
          {currentWord ? 'Czy to słowo już było?' : finished ? 'Gra zakończona' : 'Kliknij Start, aby rozpocząć'}
        </p>
        <strong className="mt-3 block text-4xl text-white">{currentWord ?? 'Start'}</strong>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-4 py-4 text-lg font-semibold text-emerald-100 transition hover:scale-[1.03] hover:bg-emerald-300/20 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          disabled={!currentWord || finished}
          onClick={() => {
            playNormalClickSound();
            answer(false);
          }}
          type="button"
        >
          Nowe
        </button>
        <button
          className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-4 text-lg font-semibold text-amber-100 transition hover:scale-[1.03] hover:bg-amber-300/20 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          disabled={!currentWord || finished}
          onClick={() => {
            playNormalClickSound();
            answer(true);
          }}
          type="button"
        >
          Było
        </button>
      </div>

      {finished && <p className="rounded-md bg-teal-300/10 p-3 text-sm font-semibold text-teal-100">Wynik zapisany: {score} pkt.</p>}
    </div>
  );
}
