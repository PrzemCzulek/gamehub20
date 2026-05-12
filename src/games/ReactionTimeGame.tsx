import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type ReactionState = 'idle' | 'waiting' | 'ready' | 'done' | 'too-soon';

type ReactionTimeGameProps = {
  onScore: (score: ScoreInput) => void;
};

export function ReactionTimeGame({ onScore }: ReactionTimeGameProps) {
  const [state, setState] = useState<ReactionState>('idle');
  const [lastResult, setLastResult] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const scoredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  function clearTimers() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function startRound() {
    clearTimers();
    readyAtRef.current = null;
    setLastResult(null);
    scoredRef.current = false;
    setState('waiting');
    timerRef.current = window.setTimeout(
      () => {
        timerRef.current = null;
        setState('ready');
        animationFrameRef.current = window.requestAnimationFrame(() => {
          readyAtRef.current = performance.now();
          animationFrameRef.current = null;
        });
      },
      1200 + Math.random() * 2600,
    );
  }

  function saveFalseStart() {
    if (scoredRef.current) {
      return;
    }

    scoredRef.current = true;
    clearTimers();
    readyAtRef.current = null;
    setState('too-soon');
    onScore({
      gameId: 'reaction-time',
      score: 9999,
      scoreLabel: 'Falstart',
      meta: { penalty: true, unit: 'ms' },
    });
  }

  function saveReaction(pointerTime: number) {
    if (scoredRef.current) {
      return;
    }

    const readyStartedAt = readyAtRef.current;

    if (readyStartedAt === null) {
      return;
    }

    scoredRef.current = true;
    const result = Math.max(0, Math.round(pointerTime - readyStartedAt));

    if (import.meta.env.DEV) {
      console.debug('Reaction finish stats', {
        status: state,
        readyStartedAt,
        pointerTime,
        measuredReaction: result,
      });
    }

    setLastResult(result);
    setState('done');
    onScore({
      gameId: 'reaction-time',
      score: result,
      scoreLabel: `${result} ms`,
      meta: { unit: 'ms' },
    });
  }

  function handlePanelPointerDown(event: PointerEvent<HTMLButtonElement>) {
    const pointerTime = performance.now();
    event.preventDefault();

    if (state === 'idle' || state === 'done' || state === 'too-soon') {
      playNormalClickSound();
      startRound();
      return;
    }

    if (state === 'waiting') {
      playNormalClickSound();
      saveFalseStart();
      return;
    }

    saveReaction(pointerTime);
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const pointerTime = performance.now();
    event.preventDefault();

    if (state === 'idle' || state === 'done' || state === 'too-soon') {
      playNormalClickSound();
      startRound();
      return;
    }

    if (state === 'waiting') {
      playNormalClickSound();
      saveFalseStart();
      return;
    }

    saveReaction(pointerTime);
  }

  const panelText = {
    idle: 'Kliknij, aby rozpocząć Reaction Time',
    waiting: 'Czekaj…',
    ready: 'KLIKNIJ!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za wcześnie',
  }[state];

  return (
    <div className="space-y-4">
      <button
        className={`flex min-h-48 w-full touch-manipulation select-none flex-col items-center justify-center rounded-lg border p-6 text-center text-3xl font-bold transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] sm:min-h-56 ${
          state === 'ready'
            ? 'glow-ready border-emerald-300 bg-emerald-300 text-slate-950'
            : state === 'waiting'
              ? 'pulse-waiting border-amber-300/40 bg-amber-300/10 text-amber-100'
              : state === 'too-soon'
                ? 'border-red-300/50 bg-red-400/10 text-red-100'
                : 'border-white/10 bg-white/[0.05] text-white'
        }`}
        onKeyDown={handlePanelKeyDown}
        onPointerDown={handlePanelPointerDown}
        type="button"
      >
        <span>{panelText}</span>
        {state === 'too-soon' && <span className="mt-3 text-sm font-medium text-red-200">Kliknij ponownie, aby zacząć nową próbę.</span>}
      </button>
      <p className="text-sm text-slate-400">Poprawny klik zapisuje czas. Falstart zapisuje karę na końcu rankingu.</p>
    </div>
  );
}
