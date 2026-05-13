import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { playNormalClickSound } from '../services/audio';
import { getScores, sortScoresByMetric } from '../services/storage';
import type { ScoreInput } from '../types';

type ReactionState = 'idle' | 'waiting' | 'ready' | 'done' | 'too-soon';

type ReactionTimeGameProps = {
  onScore: (score: ScoreInput) => void;
};

function getResultStatus(result: number | null): string | null {
  if (result === null) return null;
  if (result < 180) return 'Błyskawicznie';
  if (result < 240) return 'Dobry refleks';
  if (result < 320) return 'Solidny czas';
  return 'Do poprawy';
}

function getResultInsight(result: number | null): string | null {
  if (result === null) return null;
  if (result < 250) return 'Szybszy niż przeciętny gracz';
  if (result < 330) return 'Stabilna reakcja, jest z czego schodzić';
  return 'Spróbuj utrzymać pełny fokus na zielonym ekranie';
}

export function ReactionTimeGame({ onScore }: ReactionTimeGameProps) {
  const [state, setState] = useState<ReactionState>('idle');
  const [benchmarkMode, setBenchmarkMode] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const readyAtRef = useRef<number | null>(null);
  const scoredRef = useRef(false);

  const localReactionScores = getScores().filter((score) => score.gameId === 'reaction-time' && score.score < 9999);
  const bestReaction = sortScoresByMetric(localReactionScores, 'reaction-time')[0];
  const averageReaction =
    localReactionScores.length > 0
      ? Math.round(localReactionScores.reduce((total, score) => total + score.score, 0) / localReactionScores.length)
      : null;

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
    idle: 'Rozpocznij test reakcji',
    waiting: 'Czekaj...',
    ready: 'KLIKNIJ!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za szybko!',
  }[state];

  const overlayText = {
    waiting: 'Czekaj...',
    ready: 'Kliknij!',
    done: lastResult ? `Twój czas: ${lastResult} ms` : 'Wynik zapisany',
    'too-soon': 'Za szybko!',
    idle: 'Reaction Time',
  }[state];
  const resultStatus = getResultStatus(lastResult);
  const resultInsight = getResultInsight(lastResult);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-300/15 bg-black/20 p-3 shadow-[0_0_24px_rgba(34,211,238,0.06)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">Tryb benchmarkowy</p>
            <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-cyan-100">
              Najdokładniejszy pomiar
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Minimalny DOM i fullscreen timing.</p>
        </div>
        <button
          aria-label="Przełącz tryb benchmarkowy"
          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 ${
            benchmarkMode
              ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
              : 'border-white/15 bg-white/[0.04] text-slate-200 hover:border-cyan-300/30'
          }`}
          onClick={() => {
            playNormalClickSound();
            setBenchmarkMode((value) => !value);
          }}
          type="button"
        >
          Benchmark {benchmarkMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <button
        className={`relative flex min-h-48 w-full touch-manipulation select-none flex-col items-center justify-center overflow-hidden rounded-xl border p-6 text-center font-bold transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 sm:min-h-56 ${
          state === 'ready' && !overlayOpen
            ? 'glow-ready border-emerald-300 bg-emerald-300 text-slate-950'
            : state === 'waiting' && !overlayOpen
              ? 'pulse-waiting border-amber-300/40 bg-amber-300/10 text-amber-100'
              : state === 'too-soon'
                ? 'reaction-false-start border-red-300/50 bg-red-400/10 text-red-100'
                : state === 'done'
                  ? 'reaction-result-burst border-cyan-300/25 bg-cyan-300/[0.07] text-white'
                  : 'reaction-idle-panel border-cyan-300/15 bg-white/[0.05] text-white'
        }`}
        onKeyDown={handlePanelKeyDown}
        onPointerDown={handlePanelPointerDown}
        type="button"
      >
        {state === 'idle' ? (
          <>
            <span className="relative z-[1] text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Reaction Time</span>
            <span className="relative z-[1] mt-3 text-3xl font-black sm:text-4xl">{panelText}</span>
            <span className="relative z-[1] mt-3 text-sm font-semibold text-slate-300">Kliknij jak najszybciej po zmianie koloru.</span>
          </>
        ) : state === 'done' ? (
          <>
            <span className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">{resultStatus}</span>
            <span className="mt-2 text-4xl font-black sm:text-5xl">{panelText}</span>
            {resultInsight && <span className="mt-3 text-sm font-semibold text-slate-300">{resultInsight}</span>}
            <span className="mt-5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-100">
              Jeszcze raz
            </span>
          </>
        ) : state === 'too-soon' ? (
          <>
            <span className="text-4xl font-black">Za szybko!</span>
            <span className="mt-3 text-sm font-medium text-red-200">Poczekaj na zielony kolor. Kliknij ponownie, aby zacząć nową próbę.</span>
          </>
        ) : (
          <span className="text-3xl font-black">{panelText}</span>
        )}
      </button>

      <p className="text-sm text-slate-400">Poprawny klik zapisuje czas. Falstart zapisuje karę na końcu rankingu.</p>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <span className="block text-slate-400">Najlepszy</span>
          <strong className="mt-1 block text-white">{bestReaction?.scoreLabel ?? 'Brak danych'}</strong>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <span className="block text-slate-400">Średnia</span>
          <strong className="mt-1 block text-white">{averageReaction !== null ? `${averageReaction} ms` : 'Brak danych'}</strong>
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
          <span className="block text-slate-400">Próby</span>
          <strong className="mt-1 block text-white">{localReactionScores.length}</strong>
        </div>
      </div>

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
