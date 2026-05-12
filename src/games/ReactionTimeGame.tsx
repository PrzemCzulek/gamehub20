import { useEffect, useRef, useState } from 'react';
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
  const readyAtRef = useRef<number>(0);
  const scoredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function startRound() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setLastResult(null);
    scoredRef.current = false;
    setState('waiting');
    timerRef.current = window.setTimeout(
      () => {
        readyAtRef.current = performance.now();
        setState('ready');
      },
      1200 + Math.random() * 2600,
    );
  }

  function handlePanelClick() {
    playNormalClickSound();

    if (state === 'idle' || state === 'done' || state === 'too-soon') {
      startRound();
      return;
    }

    if (state === 'waiting') {
      if (scoredRef.current) {
        return;
      }

      scoredRef.current = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setState('too-soon');
      onScore({
        gameId: 'reaction-time',
        score: 9999,
        scoreLabel: 'Falstart',
        meta: { penalty: true, unit: 'ms' },
      });
      return;
    }

    if (scoredRef.current) {
      return;
    }

    scoredRef.current = true;
    const result = Math.round(performance.now() - readyAtRef.current);
    setLastResult(result);
    setState('done');
    onScore({
      gameId: 'reaction-time',
      score: result,
      scoreLabel: `${result} ms`,
      meta: { unit: 'ms' },
    });
  }

  const panelText = {
    idle: 'Kliknij, aby rozpocząć Reaction Time',
    waiting: 'Czekaj...',
    ready: 'Kliknij!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za wcześnie',
  }[state];

  return (
    <div className="space-y-4">
      <button
        className={`flex min-h-48 w-full flex-col items-center justify-center rounded-lg border p-6 text-center text-3xl font-bold transition duration-200 hover:scale-[1.01] active:scale-[0.99] sm:min-h-56 ${
          state === 'ready'
            ? 'glow-ready border-emerald-300 bg-emerald-400 text-slate-950'
            : state === 'waiting'
              ? 'pulse-waiting border-amber-300/40 bg-amber-300/10 text-amber-100'
              : state === 'too-soon'
                ? 'border-red-300/50 bg-red-400/10 text-red-100'
              : 'border-white/10 bg-white/[0.05] text-white'
        }`}
        onClick={handlePanelClick}
        type="button"
      >
        <span>{panelText}</span>
        {state === 'too-soon' && <span className="mt-3 text-sm font-medium text-red-200">Kliknij ponownie, aby zacząć nową próbę.</span>}
      </button>
      <p className="text-sm text-slate-400">Poprawny klik zapisuje czas. Falstart zapisuje karę na końcu rankingu.</p>
    </div>
  );
}
