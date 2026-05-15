import { useMemo, useState } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import type { ScoreInput } from '../types';

type Phase = 'idle' | 'playing' | 'success' | 'overflow' | 'result';
type Card = {
  id: number;
  value: number;
  used: boolean;
};

type Result = {
  score: number;
  roundsCompleted: number;
  attempts: number;
  elapsedTime: number;
  efficiency: number;
  bestTargetStreak: number;
  overflows: number;
  cardsRevealed: number;
};

const boardSize = 25;
const targetRounds = 5;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createDeck(): Card[] {
  return Array.from({ length: boardSize }, (_, index) => ({
    id: index,
    value: randomInt(1, 12),
    used: false,
  }));
}

function pickTarget(cards: Card[], round: number): number {
  const available = cards.filter((card) => !card.used);
  const pool = available.length >= 4 ? available : cards;
  const comboSize = Math.min(pool.length, round >= 4 ? 4 : round >= 2 ? 3 : 2);
  const picked = new Set<number>();
  let target = 0;

  while (picked.size < comboSize) {
    const card = pool[randomInt(0, pool.length - 1)];
    if (!picked.has(card.id)) {
      picked.add(card.id);
      target += card.value;
    }
  }

  return target;
}

function calculateScore(rounds: number, attempts: number, elapsedSeconds: number): number {
  return Math.max(0, Math.round(10000 + rounds * 1000 - attempts * 250 - elapsedSeconds * 10));
}

function formatTime(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

export function SearchSumGame({ onScore }: { onScore: (score: ScoreInput) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [cards, setCards] = useState<Card[]>(() => createDeck());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [target, setTarget] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [overflows, setOverflows] = useState(0);
  const [cardsRevealed, setCardsRevealed] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestTargetStreak, setBestTargetStreak] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const currentSum = useMemo(
    () => selectedIds.reduce((sum, id) => sum + (cards.find((card) => card.id === id)?.value ?? 0), 0),
    [cards, selectedIds],
  );
  const progressPercent = target > 0 ? Math.min(100, Math.round((currentSum / target) * 100)) : 0;

  function startRun() {
    const nextCards = createDeck();
    setCards(nextCards);
    setSelectedIds([]);
    setTarget(pickTarget(nextCards, 0));
    setRoundsCompleted(0);
    setAttempts(0);
    setOverflows(0);
    setCardsRevealed(0);
    setCurrentStreak(0);
    setBestTargetStreak(0);
    setResult(null);
    setStartedAt(performance.now());
    setPhase('playing');
  }

  function finishRun(nextRounds: number, nextAttempts: number, nextOverflows: number, nextCardsRevealed: number, nextBestStreak: number) {
    const elapsedTime = Math.max(0.1, (performance.now() - startedAt) / 1000);
    const efficiency = Math.round((nextRounds / Math.max(1, nextAttempts + nextRounds)) * 100);
    const score = calculateScore(nextRounds, nextAttempts, elapsedTime);
    const nextResult: Result = {
      score,
      roundsCompleted: nextRounds,
      attempts: nextAttempts,
      elapsedTime,
      efficiency,
      bestTargetStreak: nextBestStreak,
      overflows: nextOverflows,
      cardsRevealed: nextCardsRevealed,
    };

    setResult(nextResult);
    setPhase('result');
    onScore({
      gameId: 'search-sum',
      score,
      scoreLabel: `${score} pkt`,
      stats: {
        roundsCompleted: nextRounds,
        attempts: nextAttempts,
        elapsedTime,
        durationMs: Math.round(elapsedTime * 1000),
        efficiency,
        bestTargetStreak: nextBestStreak,
        overflows: nextOverflows,
        cardsRevealed: nextCardsRevealed,
      },
      meta: {
        roundsCompleted: nextRounds,
        attempts: nextAttempts,
        overflows: nextOverflows,
      },
      runDurationMs: Math.round(elapsedTime * 1000),
    });
  }

  function clearAttempt(nextPhase: Phase) {
    window.setTimeout(() => {
      setSelectedIds([]);
      setPhase('playing');
    }, nextPhase === 'success' ? 650 : 850);
  }

  function handleCardClick(card: Card) {
    if (phase !== 'playing' || card.used || selectedIds.includes(card.id)) return;

    const nextSelectedIds = [...selectedIds, card.id];
    const nextSum = nextSelectedIds.reduce((sum, id) => sum + (cards.find((item) => item.id === id)?.value ?? 0), 0);
    const nextCardsRevealed = cardsRevealed + 1;
    setSelectedIds(nextSelectedIds);
    setCardsRevealed(nextCardsRevealed);

    if (nextSum === target) {
      const nextRounds = roundsCompleted + 1;
      const nextStreak = currentStreak + 1;
      const nextBestStreak = Math.max(bestTargetStreak, nextStreak);
      setPhase('success');
      setRoundsCompleted(nextRounds);
      setCurrentStreak(nextStreak);
      setBestTargetStreak(nextBestStreak);

      const nextCards = cards.map((item) => (nextSelectedIds.includes(item.id) ? { ...item, used: true } : item));
      setCards(nextCards);

      if (nextRounds >= targetRounds) {
        window.setTimeout(() => finishRun(nextRounds, attempts, overflows, nextCardsRevealed, nextBestStreak), 650);
        return;
      }

      window.setTimeout(() => {
        setSelectedIds([]);
        setTarget(pickTarget(nextCards, nextRounds));
        setPhase('playing');
      }, 700);
      return;
    }

    if (nextSum > target) {
      const nextAttempts = attempts + 1;
      const nextOverflows = overflows + 1;
      setAttempts(nextAttempts);
      setOverflows(nextOverflows);
      setCurrentStreak(0);
      setPhase('overflow');
      clearAttempt('overflow');
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 md:grid-cols-4">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.055] p-3 md:col-span-2">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-cyan-100">Target sum</span>
          <strong className="mt-1 block text-4xl font-black text-white">{target || '-'}</strong>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full transition-all duration-300 ${phase === 'overflow' ? 'bg-rose-300' : phase === 'success' ? 'bg-amber-200' : 'bg-cyan-300'}`} style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-400">Current: <span className="text-slate-100">{currentSum}</span></p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-slate-500">Rounds</span><strong className="mt-1 block text-2xl text-white">{roundsCompleted}/{targetRounds}</strong></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-slate-500">Attempts</span><strong className="mt-1 block text-2xl text-white">{attempts}</strong></div>
      </div>

      <div className={`relative overflow-hidden rounded-3xl border bg-slate-950/82 p-3 shadow-[0_0_45px_rgba(34,211,238,0.08)] ${phase === 'overflow' ? 'border-rose-300/45' : phase === 'success' ? 'border-amber-200/45' : 'border-cyan-300/15'}`}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="relative grid grid-cols-5 gap-2">
          {cards.map((card) => {
            const revealed = selectedIds.includes(card.id) || card.used;
            return (
              <button
                aria-label={`Karta ${card.id + 1}`}
                className={`aspect-square rounded-2xl border text-lg font-black transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-100 sm:text-2xl ${
                  card.used
                    ? 'border-teal-300/20 bg-teal-300/[0.08] text-teal-100 opacity-55'
                    : revealed
                      ? phase === 'overflow'
                        ? 'border-rose-300/55 bg-rose-300/15 text-rose-100 shadow-[0_0_22px_rgba(244,63,94,0.22)]'
                        : 'border-cyan-300/45 bg-cyan-300/12 text-white shadow-[0_0_22px_rgba(34,211,238,0.18)]'
                      : 'border-white/10 bg-white/[0.045] text-cyan-100/50 hover:border-cyan-300/35 hover:bg-cyan-300/[0.08] hover:text-cyan-100'
                }`}
                disabled={phase !== 'playing' || card.used}
                key={card.id}
                onClick={() => handleCardClick(card)}
                type="button"
              >
                {revealed ? card.value : '?'}
              </button>
            );
          })}
        </div>

        {phase === 'idle' && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Odkrywaj liczby i traf dokładnie w target."
            onStart={startRun}
            title="Search Sum"
          />
        )}

        {phase === 'result' && result && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-3xl border border-cyan-300/25 bg-slate-950/94 p-5 text-center shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-cyan-200">Run complete</p>
              <strong className="mt-2 block text-5xl font-black text-white">{result.score}</strong>
              <div className="mt-4 grid gap-2 text-left sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Time</span><strong className="mt-1 block text-white">{formatTime(result.elapsedTime)}</strong></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Efficiency</span><strong className="mt-1 block text-white">{result.efficiency}%</strong></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Overflows</span><strong className="mt-1 block text-white">{result.overflows}</strong></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-100" onClick={startRun} type="button">
                  Spróbuj ponownie
                </button>
                <ShareResultButton gameId="search-sum" metricLabel="Score" scoreLabel={`${result.score} pkt`} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Status</span><strong className="mt-1 block text-white">{phase === 'overflow' ? 'Overflow' : phase === 'success' ? 'Match' : phase === 'playing' ? 'Searching' : 'Ready'}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Streak</span><strong className="mt-1 block text-white">{currentStreak}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Revealed</span><strong className="mt-1 block text-white">{cardsRevealed}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Overflow</span><strong className="mt-1 block text-white">{overflows}</strong></div>
      </div>
    </div>
  );
}
