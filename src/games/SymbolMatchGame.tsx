import { useEffect, useMemo, useRef, useState } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';

type SymbolMatchGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Card = {
  id: number;
  symbol: string;
};

type MatchFeedback = {
  type: 'idle' | 'selected' | 'checking' | 'match' | 'mismatch' | 'complete';
  text: string;
};

type FinalResult = {
  moves: number;
  mistakes: number;
  durationMs: number;
};

const symbols = ['◆', '●', '▲', '■', '★', '✚'];
const matchRevealDelayMs = 520;
const mismatchPreviewDelayMs = 850;

const boardThemes = ['Classic Grid', 'Neon Grid', 'Cyber Tiles', 'Minimal Dark'];
const boardSizes = [
  { label: '4x3', active: true },
  { label: '4x4', active: false },
  { label: '5x4', active: false },
];

function createDeck(): Card[] {
  return [...symbols, ...symbols]
    .map((symbol, index) => ({ id: index, symbol }))
    .sort(() => Math.random() - 0.5);
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function SymbolMatchGame({ onScore }: SymbolMatchGameProps) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [resolvingPairIds, setResolvingPairIds] = useState<number[]>([]);
  const [matchedCardIds, setMatchedCardIds] = useState<number[]>([]);
  const [isResolvingPair, setIsResolvingPair] = useState(false);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [feedback, setFeedback] = useState<MatchFeedback>({ type: 'idle', text: 'Znajdź wszystkie pary' });
  const [lastMatchedIds, setLastMatchedIds] = useState<number[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const timersRef = useRef<number[]>([]);

  const matchedPairs = useMemo(() => matchedCardIds.length / 2, [matchedCardIds]);
  const progressPercent = Math.round((matchedPairs / symbols.length) * 100);
  const efficiency = moves > 0 ? Math.round((symbols.length / moves) * 100) : 0;

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  useEffect(() => clearTimers, []);

  function reset() {
    clearTimers();
    setDeck(createDeck());
    setSelectedCardIds([]);
    setResolvingPairIds([]);
    setMatchedCardIds([]);
    setIsResolvingPair(false);
    setMoves(0);
    setMistakes(0);
    setStartedAt(null);
    setComplete(false);
    setFeedback({ type: 'idle', text: 'Znajdź wszystkie pary' });
    setLastMatchedIds([]);
    setFinalResult(null);
  }

  function start() {
    reset();
    setStartedAt(performance.now());
    setFeedback({ type: 'idle', text: 'Wybierz pierwszą kartę' });
  }

  function handleCardClick(cardId: number) {
    if (import.meta.env.DEV) {
      console.debug('SymbolMatch state', {
        clickedId: cardId,
        selectedCardIds,
        resolvingPairIds,
        matchedCardIds,
        isResolvingPair,
      });
    }

    if (isResolvingPair || complete || !startedAt) {
      return;
    }

    const card = deck.find((item) => item.id === cardId);

    if (!card || matchedCardIds.includes(cardId) || selectedCardIds.includes(cardId)) {
      return;
    }

    if (selectedCardIds.length === 0) {
      setSelectedCardIds([cardId]);
      setFeedback({ type: 'selected', text: 'Wybierz drugą kartę' });
      return;
    }

    const firstId = selectedCardIds[0];
    const secondId = cardId;
    const firstCard = deck.find((item) => item.id === firstId);
    const secondCard = deck.find((item) => item.id === secondId);
    const pairIds = [firstId, secondId];
    const nextMoves = moves + 1;

    setSelectedCardIds(pairIds);
    setResolvingPairIds(pairIds);
    setIsResolvingPair(true);
    setMoves(nextMoves);
    setFeedback({ type: 'checking', text: 'Sprawdzam parę...' });

    if (firstCard?.symbol === secondCard?.symbol) {
      schedule(() => {
        const nextMatchedCardIds = [...matchedCardIds, ...pairIds];
        const isComplete = nextMatchedCardIds.length === deck.length;

        setMatchedCardIds(nextMatchedCardIds);
        setSelectedCardIds([]);
        setResolvingPairIds([]);
        setIsResolvingPair(false);
        setLastMatchedIds(pairIds);
        setFeedback({ type: isComplete ? 'complete' : 'match', text: isComplete ? 'Wszystkie pary odkryte!' : 'Dobra para!' });
        schedule(() => setLastMatchedIds([]), 520);

        if (isComplete) {
          const durationMs = Math.round(performance.now() - startedAt);
          setComplete(true);
          setFinalResult({ moves: nextMoves, mistakes, durationMs });
          onScore({
            gameId: 'symbol-match',
            score: nextMoves,
            scoreLabel: `${nextMoves} ruchów`,
            meta: { pairs: symbols.length, mistakes, durationMs },
          });
        }
      }, matchRevealDelayMs);

      return;
    }

    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setFeedback({ type: 'mismatch', text: 'Nie para - zapamiętaj symbole' });
    schedule(() => {
      setSelectedCardIds([]);
      setResolvingPairIds([]);
      setIsResolvingPair(false);
      setFeedback({ type: 'idle', text: 'Wybierz pierwszą kartę' });
    }, mismatchPreviewDelayMs);
  }

  const started = Boolean(startedAt);
  const feedbackClass = {
    idle: 'border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-100',
    selected: 'border-violet-300/25 bg-violet-300/[0.08] text-violet-100',
    checking: 'border-cyan-300/25 bg-cyan-300/[0.08] text-cyan-100',
    match: 'border-emerald-300/30 bg-emerald-300/[0.10] text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.12)]',
    mismatch: 'border-red-300/35 bg-red-400/[0.10] text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.12)]',
    complete: 'border-amber-200/35 bg-amber-200/[0.10] text-amber-100 shadow-[0_0_22px_rgba(251,191,36,0.14)]',
  }[feedback.type];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
              Ruchy: <strong className="text-white">{moves}</strong>
            </span>
            <span className="rounded-md border border-red-300/15 bg-red-400/10 px-3 py-2 text-red-100">
              Pomyłki: <strong>{mistakes}</strong>
            </span>
            <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
              Pary: <strong className="text-white">{matchedPairs}/{symbols.length}</strong>
            </span>
            <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
              Progres: <strong className="text-cyan-100">{progressPercent}%</strong>
            </span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className={`rounded-lg border px-4 py-3 text-center text-sm font-semibold transition ${feedbackClass}`}>
            {feedback.text}
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[0_0_35px_rgba(34,211,238,0.05)] sm:p-4">
            <div className={`grid grid-cols-3 gap-3 transition duration-200 sm:grid-cols-4 ${started ? 'opacity-100' : 'opacity-45 blur-[1px]'}`}>
              {deck.map((card, index) => {
                const isFaceUp =
                  selectedCardIds.includes(card.id) ||
                  resolvingPairIds.includes(card.id) ||
                  matchedCardIds.includes(card.id);
                const mismatched = resolvingPairIds.includes(card.id) && feedback.type === 'mismatch';
                const justMatched = lastMatchedIds.includes(card.id);
                const faceDown = !isFaceUp;

                return (
                  <button
                    aria-label={`Karta ${index + 1}${isFaceUp ? `, symbol ${card.symbol}` : ', zakryta'}`}
                    className={`symbol-card group aspect-square rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${
                      mismatched ? 'symbol-card-mismatch' : justMatched ? 'symbol-card-match' : ''
                    } ${faceDown && !isResolvingPair && !complete ? 'symbol-card-face-down' : 'symbol-card-open'}`}
                    disabled={!started || isResolvingPair || matchedCardIds.includes(card.id) || complete}
                    key={card.id}
                    onClick={() => {
                      playNormalClickSound();
                      handleCardClick(card.id);
                    }}
                    type="button"
                  >
                    <span className={`symbol-card-inner ${isFaceUp ? 'symbol-card-flipped' : ''}`}>
                      <span className="symbol-card-face symbol-card-back">
                        <span className="text-2xl font-black text-cyan-100/80">?</span>
                      </span>
                      <span
                        className={`symbol-card-face symbol-card-front ${
                          matchedCardIds.includes(card.id) ? 'border-emerald-300/35 bg-emerald-300/[0.12]' : 'border-cyan-300/28 bg-cyan-300/[0.10]'
                        }`}
                      >
                        <span className="text-3xl font-black text-white sm:text-4xl">{card.symbol}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {!started && (
              <GameStartOverlay
                buttonLabel="Start"
                description="Odkrywaj symbole, zapamiętuj pozycje i wyczyść planszę w jak najmniejszej liczbie ruchów."
                onStart={() => {
                  playNormalClickSound();
                  start();
                }}
                title="Gotowy znaleźć wszystkie pary?"
              />
            )}

            {finalResult && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-[3px]">
                <div className="feedback-toast w-full max-w-md rounded-2xl border border-amber-200/30 bg-slate-950/92 p-5 text-center shadow-[0_0_45px_rgba(251,191,36,0.14)]">
                  <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-amber-100">Plansza wyczyszczona</p>
                  <strong className="mt-2 block text-4xl font-black text-white">{finalResult.moves} ruchów</strong>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Pomyłki: {finalResult.mistakes}</span>
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Czas: {formatDuration(finalResult.durationMs)}</span>
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Pary: {symbols.length}/{symbols.length}</span>
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Skuteczność: {efficiency}%</span>
                  </div>
                  <button
                    className="mt-5 rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:scale-[1.03] hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                    onClick={() => {
                      playNormalClickSound();
                      start();
                    }}
                    type="button"
                  >
                    Jeszcze raz
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-cyan-100">Motyw planszy</h3>
                <p className="mt-1 text-xs text-slate-400">Foundation pod przyszłe mapy.</p>
              </div>
              <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-[0.62rem] font-black text-violet-100">
                WKRÓTCE
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              {boardThemes.map((theme) => (
                <button
                  className="cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left opacity-65"
                  disabled
                  key={theme}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                    {theme}
                    <span className="text-[0.62rem] uppercase text-slate-500">Soon</span>
                  </span>
                  <span className="mt-2 block h-2 rounded-full bg-gradient-to-r from-cyan-300/40 via-violet-300/30 to-transparent" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-cyan-100">Rozmiar planszy</h3>
            <p className="mt-1 text-xs text-slate-400">Odblokowane w przyszłej aktualizacji.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {boardSizes.map((size) => (
                <button
                  className={`rounded-lg border px-3 py-3 text-sm font-black ${
                    size.active
                      ? 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100'
                      : 'cursor-not-allowed border-white/10 bg-white/[0.035] text-slate-500 opacity-65'
                  }`}
                  disabled={!size.active}
                  key={size.label}
                  type="button"
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
