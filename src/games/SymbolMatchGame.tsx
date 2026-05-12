import { useMemo, useState } from 'react';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type SymbolMatchGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Card = {
  id: number;
  symbol: string;
  matched: boolean;
};

const symbols = ['◆', '●', '▲', '■', '★', '✚'];
const flipBackDelayMs = 700;

function createDeck(): Card[] {
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: index, symbol, matched: false }))
    .sort(() => Math.random() - 0.5);
}

export function SymbolMatchGame({ onScore }: SymbolMatchGameProps) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [complete, setComplete] = useState(false);

  const matchedPairs = useMemo(() => deck.filter((card) => card.matched).length / 2, [deck]);

  function reset() {
    setDeck(createDeck());
    setSelectedIds([]);
    setMoves(0);
    setMistakes(0);
    setStartedAt(null);
    setLocked(false);
    setComplete(false);
  }

  function start() {
    reset();
    setStartedAt(performance.now());
  }

  function handleCardClick(cardId: number) {
    if (locked || complete) {
      return;
    }

    const card = deck.find((item) => item.id === cardId);

    if (!card || card.matched || selectedIds.includes(cardId)) {
      return;
    }

    if (!startedAt) {
      return;
    }
    const startTime = startedAt;

    const nextSelectedIds = [...selectedIds, cardId];
    setSelectedIds(nextSelectedIds);

    if (nextSelectedIds.length !== 2) {
      return;
    }

    const [firstId, secondId] = nextSelectedIds;
    const firstCard = deck.find((item) => item.id === firstId);
    const secondCard = deck.find((item) => item.id === secondId);
    const nextMoves = moves + 1;

    setMoves(nextMoves);

    if (firstCard?.symbol === secondCard?.symbol) {
      const nextDeck = deck.map((item) => (item.symbol === firstCard?.symbol ? { ...item, matched: true } : item));
      const isComplete = nextDeck.every((item) => item.matched);

      setDeck(nextDeck);
      setSelectedIds([]);

      if (isComplete) {
        const durationMs = Math.round(performance.now() - startTime);
        setComplete(true);
        onScore({
          gameId: 'symbol-match',
          score: nextMoves,
          scoreLabel: `${nextMoves} ruchów`,
          meta: { pairs: symbols.length, mistakes, durationMs },
        });
      }

      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setLocked(true);
    window.setTimeout(() => {
      setSelectedIds([]);
      setLocked(false);
    }, flipBackDelayMs);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-3 text-sm sm:flex">
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Ruchy: {moves}</span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">Pomyłki: {mistakes}</span>
          <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
            Pary: {matchedPairs}/{symbols.length}
          </span>
        </div>
        <button
          className="rounded-lg bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-teal-950/40 transition hover:scale-105 hover:bg-teal-200"
          onClick={() => {
            playNormalClickSound();
            start();
          }}
          type="button"
        >
          {startedAt ? 'Nowa gra' : 'Start'}
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-center">
        <p className="text-lg font-semibold text-white">{complete ? 'Świetnie! Wszystkie pary odkryte' : 'Znajdź wszystkie pary'}</p>
        {!startedAt && <p className="mt-1 text-sm text-slate-400">Kliknij Start, aby aktywować karty.</p>}
      </div>

      <div className={`grid grid-cols-3 gap-3 transition sm:grid-cols-4 ${startedAt ? 'opacity-100' : 'opacity-45'}`}>
        {deck.map((card) => {
          const visible = card.matched || selectedIds.includes(card.id);

          return (
            <button
              className={`aspect-square rounded-lg border text-3xl font-bold transition ${
                visible
                  ? 'border-teal-200 bg-teal-300/20 text-white'
                  : 'border-white/10 bg-white/[0.05] text-transparent hover:scale-[1.03] hover:bg-white/[0.08] active:scale-95'
              }`}
              disabled={!startedAt || locked || card.matched || complete}
              key={card.id}
              onClick={() => {
                playNormalClickSound();
                handleCardClick(card.id);
              }}
              type="button"
            >
              {visible ? card.symbol : '?'}
            </button>
          );
        })}
      </div>

      {complete && <p className="rounded-md bg-teal-300/10 p-3 text-sm font-semibold text-teal-100">Wynik zapisany.</p>}
    </div>
  );
}
