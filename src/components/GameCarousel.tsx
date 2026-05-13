import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { playClickSound, playHoverSound } from '../services/audio';
import type { GameConfig, GameId, MobileSupport } from '../types';

type GameCarouselProps = {
  games: GameConfig[];
  activeGameId: GameId;
  onOpenGame?: (gameId: GameId) => void;
  onSelectGame: (gameId: GameId) => void;
};

const gameVisuals: Record<GameId, string> = {
  'reaction-time': '⚡',
  'memory-test': '▦',
  'color-memory': '◎',
  'typing-speed': '⌨',
  'symbol-match': '★',
  'aim-test': '◎',
  'word-memory': 'Aa',
};

const mobileSupportMeta: Record<MobileSupport, { label: string; className: string }> = {
  ready: {
    label: 'Mobilne',
    className: 'border-teal-300/25 bg-teal-300/10 text-teal-100',
  },
  limited: {
    label: 'Ograniczone',
    className: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  },
  'desktop-only': {
    label: 'Desktop',
    className: 'border-fuchsia-300/25 bg-red-400/10 text-red-100',
  },
};

function getWrappedIndex(index: number, length: number): number {
  return (index + length) % length;
}

function getCircularOffset(index: number, activeIndex: number, length: number): number {
  let offset = index - activeIndex;
  const half = length / 2;

  if (offset > half) {
    offset -= length;
  }

  if (offset < -half) {
    offset += length;
  }

  return offset;
}

function getTransform(offset: number): string {
  const direction = offset < 0 ? -1 : 1;
  const absOffset = Math.abs(offset);

  if (absOffset === 0) {
    return 'translateX(0) scale(1.04) rotateY(0deg)';
  }

  if (absOffset === 1) {
    return `translateX(${direction * 235}px) scale(0.84) rotateY(${direction * -22}deg)`;
  }

  return `translateX(${direction * 430}px) scale(0.68) rotateY(${direction * -32}deg)`;
}

function getCardStyle(offset: number): CSSProperties {
  const absOffset = Math.abs(offset);

  return {
    transform: getTransform(offset),
    opacity: absOffset === 0 ? 1 : absOffset === 1 ? 0.84 : 0.3,
    filter: absOffset === 0 ? 'none' : absOffset === 1 ? 'blur(0.15px)' : 'blur(2px)',
    zIndex: absOffset === 0 ? 10 : absOffset === 1 ? 6 : 3,
  };
}

export function GameCarousel({ games, activeGameId, onOpenGame, onSelectGame }: GameCarouselProps) {
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const activeIndex = Math.max(
    0,
    games.findIndex((game) => game.id === activeGameId),
  );

  const visibleGames = useMemo(
    () =>
      games
        .map((game, index) => ({
          game,
          offset: getCircularOffset(index, activeIndex, games.length),
        }))
        .filter((item) => Math.abs(item.offset) <= 2)
        .sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset)),
    [activeIndex, games],
  );

  function selectByDelta(delta: number) {
    playClickSound();
    const nextIndex = getWrappedIndex(activeIndex + delta, games.length);
    onSelectGame(games[nextIndex].id);
  }

  function selectGame(gameId: GameId) {
    playClickSound();
    if (gameId === activeGameId && onOpenGame) {
      onOpenGame(gameId);
      return;
    }

    onSelectGame(gameId);
  }

  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (Math.abs(dominantDelta) < 20 || wheelLockRef.current) {
      return;
    }

    wheelLockRef.current = true;
    selectByDelta(dominantDelta > 0 ? 1 : -1);
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 360);
  }

  useEffect(() => {
    const carousel = carouselRef.current;

    if (!carousel) {
      return;
    }

    carousel.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      carousel.removeEventListener('wheel', handleWheel);
    };
  });

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectByDelta(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectByDelta(1);
    }
  }

  return (
    <section className="pb-3 pt-4" aria-label="Wybór gry">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="hidden md:block" />
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">Wybierz grę</h2>
          <p className="mt-1 text-sm text-slate-400">Kliknij kartę, użyj strzałek albo przewiń karuzelę.</p>
        </div>
        <div className="flex justify-center gap-2 md:justify-end">
          <button
            aria-label="Poprzednia gra"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-2xl text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300/20"
            onClick={() => selectByDelta(-1)}
            onMouseEnter={playHoverSound}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Następna gra"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 text-2xl text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300/20"
            onClick={() => selectByDelta(1)}
            onMouseEnter={playHoverSound}
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={carouselRef}
        className="game-carousel relative h-[28.5rem] overflow-hidden rounded-xl border border-cyan-300/10 bg-slate-950/70 outline-none"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.24),transparent_20rem),radial-gradient(circle_at_center,rgba(45,212,191,0.16),transparent_30rem)]" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-24 bg-gradient-to-r from-[#0b0f14] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-24 bg-gradient-to-l from-[#0b0f14] to-transparent" />
        <div className="carousel-orbit" />

        {visibleGames.map(({ game, offset }) => {
          const active = offset === 0;
          const support = mobileSupportMeta[game.mobileSupport];

          return (
            <button
              aria-current={active ? 'true' : undefined}
              className={`game-carousel-card absolute left-1/2 top-1/2 flex w-80 flex-col rounded-xl border p-4 text-left shadow-xl transition-all duration-300 ${
                active
                  ? 'active-carousel-card border-cyan-200 bg-slate-900 shadow-cyan-950/60'
                  : 'border-white/15 bg-slate-900/90 shadow-black/40 hover:border-cyan-200/50'
              }`}
              data-offset={offset}
              key={game.id}
              onClick={() => selectGame(game.id)}
              onMouseEnter={playHoverSound}
              style={getCardStyle(offset)}
              type="button"
            >
              <div className="mb-3 flex min-h-6 items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] shadow-sm backdrop-blur ${support.className}`}
                  title={game.mobileNote}
                >
                  {support.label}
                </span>
                <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                  {game.scoreName}
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className={`carousel-visual ${game.id === 'color-memory' ? 'color-wheel-visual' : ''}`}>
                  {game.id === 'color-memory' ? '' : gameVisuals[game.id]}
                </span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{game.title}</h3>
              <p className="mt-2 min-h-[4.5rem] text-sm leading-5 text-slate-300">{game.description}</p>
              {game.mobileNote && <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-amber-100/80">{game.mobileNote}</p>}
              {active && game.tags && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {game.tags.slice(0, game.mobileNote ? 1 : 2).map((tag) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.14em] text-slate-200"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <span
                className={`mt-auto inline-flex w-fit rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                  active ? 'bg-fuchsia-400/20 text-fuchsia-100' : 'bg-white/10 text-slate-200'
                }`}
              >
                {active ? 'Graj' : 'Wybierz'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {games.map((game) => {
          const active = game.id === activeGameId;

          return (
            <button
              aria-label={`Wybierz ${game.title}`}
              aria-current={active ? 'true' : undefined}
              className={`h-2.5 rounded-full transition-all ${
                active ? 'w-8 bg-cyan-300 shadow-[0_0_14px_rgba(45,212,191,0.9)]' : 'w-2.5 bg-slate-600 hover:bg-slate-400'
              }`}
              key={game.id}
              onClick={() => selectGame(game.id)}
              onMouseEnter={playHoverSound}
              type="button"
            />
          );
        })}
      </div>
    </section>
  );
}
