import { useRef, useState } from 'react';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type AimTestGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Target = {
  x: number;
  y: number;
  appearedAt: number;
};

const targetCount = 15;
const missPenalty = 250;

function createTarget(): Target {
  return {
    x: 12 + Math.random() * 76,
    y: 12 + Math.random() * 76,
    appearedAt: performance.now(),
  };
}

export function AimTestGame({ onScore }: AimTestGameProps) {
  const [target, setTarget] = useState<Target | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalLabel, setFinalLabel] = useState<string | null>(null);
  const finishingRef = useRef(false);

  function start() {
    setHits(0);
    setMisses(0);
    setReactionTimes([]);
    setFinalLabel(null);
    finishingRef.current = false;
    setTarget(createTarget());
  }

  function finish(nextHits: number, nextMisses: number, nextReactionTimes: number[]) {
    if (finishingRef.current) {
      return;
    }

    finishingRef.current = true;
    const averageReactionMs = Math.round(
      nextReactionTimes.reduce((total, value) => total + value, 0) / Math.max(nextReactionTimes.length, 1),
    );
    const accuracy = Math.round((nextHits / Math.max(nextHits + nextMisses, 1)) * 100);
    const score = Math.max(0, Math.round(nextHits * 1000 - averageReactionMs - nextMisses * missPenalty));

    setTarget(null);
    setFinalLabel(`${score} pkt, celność ${formatPercent(accuracy)}`);
    onScore({
      gameId: 'aim-test',
      score,
      scoreLabel: `${score} pkt`,
      meta: { hits: nextHits, misses: nextMisses, averageReactionMs, accuracy },
    });
  }

  function handleHit() {
    if (!target || finishingRef.current) {
      return;
    }

    const reactionMs = Math.round(performance.now() - target.appearedAt);
    const nextHits = hits + 1;
    const nextReactionTimes = [...reactionTimes, reactionMs];

    setHits(nextHits);
    setReactionTimes(nextReactionTimes);

    if (nextHits >= targetCount) {
      finish(nextHits, misses, nextReactionTimes);
      return;
    }

    setTarget(createTarget());
  }

  function handleMiss() {
    if (!target || finishingRef.current) {
      return;
    }

    playNormalClickSound();
    setMisses((current) => current + 1);
  }

  const averageReactionMs =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Trafienia: {hits}/{targetCount}
          </span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Pomyłki: {misses}</span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Średnio: {averageReactionMs} ms</span>
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

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
        <p className="text-lg font-semibold text-white">
          {target ? 'Trafiaj cele jak najszybciej' : finalLabel ? 'Gra zakończona' : 'Kliknij Start i trafiaj cele'}
        </p>
        <p className="mt-1 text-sm text-slate-400">Klik poza celem liczy się jako pomyłka.</p>
      </div>

      <button
        className={`relative h-80 w-full overflow-hidden rounded-lg border border-white/10 bg-black/25 transition sm:h-96 ${
          target ? 'opacity-100' : 'opacity-55'
        }`}
        onClick={handleMiss}
        type="button"
      >
        {target ? (
          <span
            className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-red-500 shadow-lg shadow-red-950/50"
            onClick={(event) => {
              event.stopPropagation();
              playNormalClickSound();
              handleHit();
            }}
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
          >
            <span className="h-4 w-4 rounded-full bg-white transition" />
          </span>
        ) : (
          <span className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-400">
            Kliknij Start, aby rozpocząć serię celów.
          </span>
        )}
      </button>

      {finalLabel && <p className="rounded-md bg-teal-300/10 p-3 text-sm font-semibold text-teal-100">Wynik: {finalLabel}</p>}
    </div>
  );
}
