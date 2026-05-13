import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
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

type AimFeedback = {
  id: number;
  x: number;
  y: number;
  type: 'hit' | 'miss';
  label: string;
};

type FinalResult = {
  score: number;
  accuracy: number;
  averageReactionMs: number;
  hits: number;
  misses: number;
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
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [feedbacks, setFeedbacks] = useState<AimFeedback[]>([]);
  const finishingRef = useRef(false);
  const feedbackIdRef = useRef(0);

  function pushArenaFeedback(feedback: Omit<AimFeedback, 'id'>) {
    const id = feedbackIdRef.current + 1;
    feedbackIdRef.current = id;
    setFeedbacks((current) => [...current, { ...feedback, id }].slice(-6));
    window.setTimeout(() => {
      setFeedbacks((current) => current.filter((item) => item.id !== id));
    }, 520);
  }

  function start() {
    setHits(0);
    setMisses(0);
    setReactionTimes([]);
    setFinalResult(null);
    setFeedbacks([]);
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
    setFinalResult({ score, accuracy, averageReactionMs, hits: nextHits, misses: nextMisses });
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

    pushArenaFeedback({ x: target.x, y: target.y, type: 'hit', label: 'TRAFIENIE' });
    setHits(nextHits);
    setReactionTimes(nextReactionTimes);

    if (nextHits >= targetCount) {
      finish(nextHits, misses, nextReactionTimes);
      return;
    }

    setTarget(createTarget());
  }

  function handleMiss(event: PointerEvent<HTMLDivElement>) {
    if (!target || finishingRef.current) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    playNormalClickSound();
    pushArenaFeedback({ x, y, type: 'miss', label: 'POMYŁKA' });
    setMisses((current) => current + 1);
  }

  const averageReactionMs =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length)
      : 0;
  const accuracy = Math.round((hits / Math.max(hits + misses, 1)) * 100);
  const started = Boolean(target) || Boolean(finalResult) || hits > 0 || misses > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Trafienia: <strong className="text-white">{hits}/{targetCount}</strong>
        </span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Celność: <strong className="text-cyan-100">{formatPercent(accuracy)}</strong>
        </span>
        <span className="rounded-md border border-red-300/15 bg-red-400/10 px-3 py-2 text-red-100">
          Pomyłki: <strong>{misses}</strong>
        </span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Śr. reakcja: <strong className="text-white">{averageReactionMs} ms</strong>
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-all duration-200"
          style={{ width: `${Math.min(100, Math.round((hits / targetCount) * 100))}%` }}
        />
      </div>

      <div
        aria-label="Arena Aim Test"
        className={`aim-arena relative h-80 w-full overflow-hidden rounded-xl border border-white/10 bg-black/25 transition sm:h-96 ${
          target ? 'opacity-100' : 'opacity-75'
        }`}
        onPointerDown={handleMiss}
      >
        {!started && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Trafiaj cele jak najszybciej. Klik poza celem liczy się jako pomyłka."
            onStart={() => {
              playNormalClickSound();
              start();
            }}
            title="Gotowy na serię celów?"
          />
        )}

        {target && (
          <span
            aria-label="Cel"
            className="aim-target absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/80 bg-cyan-300/20 shadow-[0_0_30px_rgba(34,211,238,0.34)] transition hover:scale-110"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              playNormalClickSound();
              handleHit();
            }}
            role="button"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            tabIndex={-1}
          >
            <span className="absolute h-full w-full rounded-full border border-cyan-200/45" />
            <span className="h-5 w-5 rounded-full bg-cyan-100 shadow-[0_0_20px_rgba(240,253,250,0.8)]" />
          </span>
        )}

        {feedbacks.map((feedback) => (
          <span
            className={`aim-feedback pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
              feedback.type === 'hit'
                ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-100'
                : 'border-red-300/45 bg-red-400/15 text-red-100'
            }`}
            key={feedback.id}
            style={{ left: `${feedback.x}%`, top: `${feedback.y}%` }}
          >
            {feedback.label}
          </span>
        ))}

        {finalResult && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-[3px]">
            <div className="feedback-toast w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/92 p-5 text-center shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-cyan-200">Wynik Aim Test</p>
              <strong className="mt-2 block text-4xl font-black text-white">{finalResult.score} pkt</strong>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Celność: {formatPercent(finalResult.accuracy)}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Śr.: {finalResult.averageReactionMs} ms</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Trafienia: {finalResult.hits}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Pomyłki: {finalResult.misses}</span>
              </div>
              <button
                className="mt-5 rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:scale-[1.03] hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  playNormalClickSound();
                  start();
                }}
                type="button"
              >
                Zagraj ponownie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
