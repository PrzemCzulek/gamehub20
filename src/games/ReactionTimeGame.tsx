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
  const [benchmarkMode, setBenchmarkMode] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const scoredRef = useRef(false);

  useEffect(() => {
    return () => {
      clearTimers();
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

  function startRound(useOverlay = benchmarkMode) {
    clearTimers();
    readyAtRef.current = null;
    setLastResult(null);
    scoredRef.current = false;

    if (useOverlay) {
      setOverlayOpen(true);
    }

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
      meta: { penalty: true, unit: 'ms', benchmarkMode },
    });
  }

  function saveReaction(pointerTime: number, eventType: string, pointerType?: string) {
    if (scoredRef.current) {
      return;
    }

    const readyStartedAt = readyAtRef.current;

    if (readyStartedAt === null) {
      return;
    }

    const result = Math.max(0, Math.round(pointerTime - readyStartedAt));
    scoredRef.current = true;

    if (import.meta.env.DEV) {
      console.debug('Reaction benchmark', {
        readyStartedAt,
        pointerTime,
        measuredReaction: result,
        eventType,
        pointerType,
      });
    }

    setLastResult(result);
    setState('done');
    onScore({
      gameId: 'reaction-time',
      score: result,
      scoreLabel: `${result} ms`,
      meta: { unit: 'ms', benchmarkMode },
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

    saveReaction(pointerTime, event.type, event.pointerType);
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

    saveReaction(pointerTime, event.type, 'keyboard');
  }

  function handleBenchmarkPointerDown(event: PointerEvent<HTMLDivElement>) {
    const pointerTime = performance.now();
    event.preventDefault();

    if (state === 'waiting') {
      saveFalseStart();
      return;
    }

    if (state === 'ready') {
      saveReaction(pointerTime, event.type, event.pointerType);
    }
  }

  function closeOverlay() {
    clearTimers();
    setOverlayOpen(false);
    readyAtRef.current = null;

    if (state === 'waiting' || state === 'ready') {
      scoredRef.current = false;
      setState('idle');
    }
  }

  const panelText = {
    idle: 'Kliknij, aby rozpocząć Reaction Time',
    waiting: 'Czekaj…',
    ready: 'KLIKNIJ!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za wcześnie',
  }[state];

  const overlayText = {
    waiting: 'Czekaj…',
    ready: 'Kliknij!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za wcześnie',
    idle: 'Reaction Time',
  }[state];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div>
          <p className="text-sm font-semibold text-white">Tryb benchmarkowy</p>
          <p className="text-xs text-slate-400">Pełnoekranowy pomiar z minimalnym DOM.</p>
        </div>
        <button
          className={`rounded-md px-3 py-2 text-xs font-bold ${benchmarkMode ? 'bg-cyan-300 text-slate-950' : 'border border-white/15 text-slate-200'}`}
          onClick={() => {
            playNormalClickSound();
            setBenchmarkMode((value) => !value);
          }}
          type="button"
        >
          {benchmarkMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <button
        className={`flex min-h-48 w-full touch-manipulation select-none flex-col items-center justify-center rounded-lg border p-6 text-center text-3xl font-bold transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] sm:min-h-56 ${
          state === 'ready' && !overlayOpen
            ? 'glow-ready border-emerald-300 bg-emerald-300 text-slate-950'
            : state === 'waiting' && !overlayOpen
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

      {overlayOpen && (
        <div
          className={`fixed inset-0 z-[80] flex touch-none select-none items-center justify-center text-center ${
            state === 'ready'
              ? 'cursor-pointer bg-emerald-400 text-slate-950'
              : state === 'waiting'
                ? 'cursor-wait bg-red-950 text-red-50'
                : state === 'too-soon'
                  ? 'cursor-default bg-red-950 text-red-50'
                  : 'cursor-default bg-slate-950 text-white'
          }`}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={handleBenchmarkPointerDown}
          role="presentation"
        >
          <div className="px-6">
            <p className="text-5xl font-black uppercase tracking-wide sm:text-7xl">{overlayText}</p>
            {state === 'waiting' && <p className="mt-6 text-lg text-red-100/80">Nie klikaj przed zielonym ekranem.</p>}
            {state === 'ready' && <p className="mt-6 text-lg font-bold text-slate-900/75">Naciśnij jak najszybciej.</p>}
            {(state === 'done' || state === 'too-soon') && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950"
                  onClick={(event) => {
                    event.stopPropagation();
                    playNormalClickSound();
                    startRound(true);
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Jeszcze raz
                </button>
                <button
                  className="rounded-lg border border-white/25 px-5 py-3 text-sm font-black uppercase tracking-wide text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    playNormalClickSound();
                    closeOverlay();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Zamknij
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}