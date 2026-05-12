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
  const { activeItem, choose, level, message, showing, start } = useSequenceGame({
    gameId: 'memory-test',
    itemCount: tiles.length,
    flashMs: 330,
    stepMs: 620,
    endDelayMs: 520,
    messages,
    onScore,
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">Aktualny poziom</p>
          <strong className="text-2xl text-white">{level}</strong>
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
          {level === 0 ? 'Kliknij Start, aby rozpocząć Memory Test' : showing ? 'Zapamiętaj sekwencję' : 'Twój ruch'}
        </p>
        <p className="mt-1 text-sm text-slate-400">{message}</p>
      </div>
      <div className={`grid aspect-square w-full grid-cols-3 gap-3 transition ${level === 0 ? 'opacity-45' : 'opacity-100'}`}>
        {tiles.map((tile) => (
          <button
            className={`rounded-lg border text-xl font-bold transition hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 ${
              activeItem === tile
                ? 'neon-tile-active border-cyan-200 bg-cyan-300 text-slate-950'
                : 'border-white/10 bg-white/[0.05] text-white'
            }`}
            disabled={showing || level === 0}
            key={tile}
            onClick={() => {
              playNormalClickSound();
              choose(tile);
            }}
            type="button"
          >
            {tile + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
