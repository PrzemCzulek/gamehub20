import type { GameConfig, GameId } from '../types';

type GameCardProps = {
  game: GameConfig;
  active: boolean;
  onSelect: (gameId: GameId) => void;
};

export function GameCard({ game, active, onSelect }: GameCardProps) {
  return (
    <button
      className={`rounded-lg border p-4 text-left transition ${
        active
          ? 'border-teal-300 bg-teal-300/10 shadow-lg shadow-teal-950/40'
          : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
      }`}
      onClick={() => onSelect(game.id)}
      type="button"
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-teal-200">{game.scoreName}</span>
      <h3 className="mt-2 text-lg font-semibold text-white">{game.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{game.description}</p>
    </button>
  );
}
