import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { useSequenceGame } from '../hooks/useSequenceGame';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type MemoryTestGameProps = {
  onScore: (score: ScoreInput) => void;
};

const tiles = Array.from({ length: 9 }, (_, index) => index);
const messages = {
  initial: 'Start tworzy pierwszą sekwencję.',
  showing: 'Zapamiętaj sekwencję.',
  input: 'Odtwórz sekwencję.',
  success: 'Dobrze. Następny poziom.',
};

export function MemoryTestGame({ onScore }: MemoryTestGameProps) {
  const { activeItem, choose, inputIndex, lastTappedItem, level, message, phase, sequenceLength, showing, start, wrongItem } =
    useSequenceGame({
      gameId: 'memory-test',
      itemCount: tiles.length,
      flashMs: 360,
      stepMs: 650,
      endDelayMs: 520,
      messages,
      onScore,
    });

  const isIdle = phase === 'idle' || level === 0;
  const canClickTiles = phase === 'input' && !showing && sequenceLength > 0;
  const completedInput = phase === 'success' ? sequenceLength : inputIndex;
  const phaseConfig = {
    idle: {
      label: 'START',
      text: 'Kliknij Start, aby rozpocząć Memory Test',
      accent: 'border-white/10 bg-white/[0.04] text-slate-300',
    },
    showing: {
      label: 'ZAPAMIĘTAJ',
      text: 'Zapamiętaj sekwencję',
      accent: 'border-cyan-300/30 bg-cyan-300/[0.08] text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.10)]',
    },
    input: {
      label: 'TWOJA KOLEJ',
      text: 'Twoja kolej — powtórz sekwencję',
      accent: 'border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.10)]',
    },
    success: {
      label: 'POZIOM ZALICZONY',
      text: 'Dobrze! Następny poziom',
      accent: 'border-amber-200/35 bg-amber-200/[0.09] text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]',
    },
    error: {
      label: 'BŁĄD',
      text: 'Błąd — spróbuj od nowa',
      accent: 'border-red-300/35 bg-red-400/[0.10] text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.12)]',
    },
  }[phase];

  function handleStart() {
    playNormalClickSound();
    start();
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-md bg-black/20 px-3 py-2">
            <span className="block text-slate-400">Poziom</span>
            <strong className="text-xl text-white">{level}</strong>
          </div>
          <div className="rounded-md bg-black/20 px-3 py-2">
            <span className="block text-slate-400">Sekwencja</span>
            <strong className="text-xl text-white">{sequenceLength || '-'}</strong>
          </div>
          <div className="rounded-md bg-black/20 px-3 py-2">
            <span className="block text-slate-400">Twój ruch</span>
            <strong className="text-xl text-white">
              {canClickTiles || phase === 'success' ? `${completedInput} / ${sequenceLength}` : '-'}
            </strong>
          </div>
        </div>

        {!isIdle && (
          <button
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-white/10"
            onClick={handleStart}
            type="button"
          >
            Restart
          </button>
        )}
      </div>

      <div className={`rounded-lg border p-4 text-center transition duration-200 ${phaseConfig.accent}`}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full border border-current/25 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.18em]">
            {phaseConfig.label}
          </span>
          {canClickTiles && (
            <span className="text-xs font-semibold opacity-80">
              {completedInput} / {sequenceLength}
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-semibold text-white">{phaseConfig.text}</p>
        <p className="mt-1 text-sm opacity-80">{message}</p>
      </div>

      <div className="relative overflow-hidden rounded-xl">
        <div className={`grid aspect-square w-full grid-cols-3 gap-3 transition duration-200 ${isIdle ? 'opacity-45 blur-[1px]' : 'opacity-100'}`}>
          {tiles.map((tile) => {
            const active = activeItem === tile;
            const tapped = lastTappedItem === tile;
            const wrong = wrongItem === tile;

            return (
              <button
                aria-label={`Pole ${tile + 1}`}
                className={`rounded-xl border text-2xl font-black transition duration-150 disabled:cursor-not-allowed ${
                  active
                    ? 'neon-tile-active scale-[1.04] border-cyan-200 bg-cyan-300 text-slate-950'
                    : wrong
                      ? 'memory-tile-error border-red-300 bg-red-400/30 text-red-50'
                      : tapped
                        ? 'memory-tile-tap border-emerald-300/50 bg-emerald-300/20 text-emerald-50'
                        : canClickTiles
                          ? 'border-white/15 bg-white/[0.06] text-white hover:scale-[1.03] hover:border-cyan-300/35 hover:bg-cyan-300/10 active:scale-95'
                          : 'border-white/10 bg-white/[0.035] text-slate-400'
                } disabled:hover:scale-100`}
                disabled={!canClickTiles}
                key={tile}
                onClick={() => {
                  playNormalClickSound();
                  choose(tile);
                }}
                type="button"
              >
                {tile + 1}
              </button>
            );
          })}
        </div>

        {isIdle && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Zapamiętaj kolejność pól i odtwórz ją bez pomyłki."
            onStart={handleStart}
            title="Gotowy na sekwencję?"
          />
        )}
      </div>
    </div>
  );
}
