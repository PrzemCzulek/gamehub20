import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import { playNormalClickSound } from '../services/audio';
import { getScores, sortScoresByMetric } from '../services/storage';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type FlappyBallGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Stage = 'idle' | 'playing' | 'gameOver';

type Pipe = {
  id: number;
  x: number;
  gapY: number;
  scored: boolean;
};

type RunResult = {
  score: number;
  flaps: number;
  survivedTimeSeconds: number;
  efficiency: number;
};

type TrailPoint = {
  id: number;
  y: number;
  age: number;
};

const arenaWidth = 720;
const arenaHeight = 420;
const ballX = 168;
const collisionRadius = 11.5;
const gravity = 1450;
const jumpVelocity = -430;
const pipeSpeed = 190;
const pipeGap = 144;
const minPipeGap = 112;
const pipeWidth = 72;
const spawnInterval = 1350;
const minGapY = 86;
const maxGapY = arenaHeight - 92;
const trailLimit = 7;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createPipe(id: number): Pipe {
  return {
    id,
    x: arenaWidth + 40,
    gapY: minGapY + Math.random() * (maxGapY - minGapY),
    scored: false,
  };
}

function getDifficulty(score: number) {
  return {
    speed: pipeSpeed + Math.min(72, Math.floor(score / 5) * 9),
    gap: Math.max(minPipeGap, pipeGap - Math.floor(score / 4) * 4),
  };
}

function circleHitsRect(cx: number, cy: number, radius: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function FlappyBallGame({ onScore }: FlappyBallGameProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [ballY, setBallY] = useState(arenaHeight * 0.48);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [flaps, setFlaps] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastSpawnAtRef = useRef(0);
  const nextPipeIdRef = useRef(1);
  const yRef = useRef(arenaHeight * 0.48);
  const velocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const flapsRef = useRef(0);
  const submittedRef = useRef(false);
  const stageRef = useRef<Stage>('idle');
  const trailRef = useRef<TrailPoint[]>([]);
  const trailIdRef = useRef(0);
  const lastTrailAtRef = useRef(0);

  const localScores = getScores().filter((entry) => entry.gameId === 'flappy-ball');
  const bestScore = sortScoresByMetric(localScores, 'flappy-ball')[0];
  const bestTime = sortScoresByMetric(localScores, 'flappy-ball', 'survivedTimeSeconds')[0];

  const currentEfficiency = useMemo(() => (flaps > 0 ? Math.round((score / flaps) * 10000) / 100 : 0), [flaps, score]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return;
      if (event.code !== 'Space') return;

      event.preventDefault();
      flap();
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function syncPipes(nextPipes: Pipe[]) {
    pipesRef.current = nextPipes;
    setPipes(nextPipes);
  }

  function resetRun() {
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastFrameRef.current = null;
    startedAtRef.current = null;
    lastSpawnAtRef.current = 0;
    nextPipeIdRef.current = 1;
    yRef.current = arenaHeight * 0.48;
    velocityRef.current = 0;
    scoreRef.current = 0;
    flapsRef.current = 0;
    submittedRef.current = false;
    setBallY(yRef.current);
    syncPipes([]);
    setScore(0);
    setFlaps(0);
    setElapsedMs(0);
    setResult(null);
    trailRef.current = [];
    trailIdRef.current = 0;
    lastTrailAtRef.current = 0;
    setTrail([]);
  }

  function startRun() {
    playNormalClickSound();
    resetRun();
    setStage('playing');
    stageRef.current = 'playing';
    startedAtRef.current = performance.now();
    lastSpawnAtRef.current = startedAtRef.current;
    syncPipes([createPipe(nextPipeIdRef.current++)]);
    velocityRef.current = jumpVelocity * 0.72;
    rafRef.current = window.requestAnimationFrame(tick);
  }

  function finishRun() {
    if (submittedRef.current) return;

    submittedRef.current = true;
    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const survivedTimeSeconds = Math.round(((performance.now() - (startedAtRef.current ?? performance.now())) / 1000) * 10) / 10;
    const efficiency = flapsRef.current > 0 ? Math.round((scoreRef.current / flapsRef.current) * 10000) / 100 : 0;
    const nextResult = {
      score: scoreRef.current,
      flaps: flapsRef.current,
      survivedTimeSeconds,
      efficiency,
    };

    setResult(nextResult);
    setElapsedMs(survivedTimeSeconds * 1000);
    setStage('gameOver');
    stageRef.current = 'gameOver';

    onScore({
      gameId: 'flappy-ball',
      score: nextResult.score,
      scoreLabel: `${nextResult.score} pkt`,
      stats: {
        flaps: nextResult.flaps,
        survivedTimeSeconds: nextResult.survivedTimeSeconds,
        bestCombo: nextResult.score,
        efficiency: nextResult.efficiency,
      },
      meta: nextResult,
      runDurationMs: Math.round(nextResult.survivedTimeSeconds * 1000),
    });
  }

  function tick(now: number) {
    if (stageRef.current !== 'playing') return;

    const previous = lastFrameRef.current ?? now;
    const deltaSeconds = Math.min(0.032, (now - previous) / 1000);
    lastFrameRef.current = now;

    velocityRef.current += gravity * deltaSeconds;
    yRef.current += velocityRef.current * deltaSeconds;

    if (now - lastTrailAtRef.current > 58) {
      trailIdRef.current += 1;
      trailRef.current = [{ id: trailIdRef.current, y: yRef.current, age: 0 }, ...trailRef.current]
        .slice(0, trailLimit)
        .map((point, index) => ({ ...point, age: index }));
      setTrail(trailRef.current);
      lastTrailAtRef.current = now;
    }

    const difficulty = getDifficulty(scoreRef.current);
    let nextPipes = pipesRef.current
      .map((pipe) => ({ ...pipe, x: pipe.x - difficulty.speed * deltaSeconds }))
      .filter((pipe) => pipe.x + pipeWidth > -20);

    if (now - lastSpawnAtRef.current >= spawnInterval) {
      nextPipes = [...nextPipes, createPipe(nextPipeIdRef.current++)];
      lastSpawnAtRef.current = now;
    }

    nextPipes = nextPipes.map((pipe) => {
      if (!pipe.scored && pipe.x + pipeWidth < ballX - collisionRadius) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        return { ...pipe, scored: true };
      }

      return pipe;
    });

    const outOfBounds = yRef.current - collisionRadius < 0 || yRef.current + collisionRadius > arenaHeight;
    const collision = nextPipes.some((pipe) => {
      const topRect = { x: pipe.x, y: 0, width: pipeWidth, height: pipe.gapY - difficulty.gap / 2 };
      const bottomRect = {
        x: pipe.x,
        y: pipe.gapY + difficulty.gap / 2,
        width: pipeWidth,
        height: arenaHeight - (pipe.gapY + difficulty.gap / 2),
      };
      return circleHitsRect(ballX, yRef.current, collisionRadius, topRect) || circleHitsRect(ballX, yRef.current, collisionRadius, bottomRect);
    });

    setBallY(yRef.current);
    setElapsedMs(now - (startedAtRef.current ?? now));
    syncPipes(nextPipes);

    if (outOfBounds || collision) {
      finishRun();
      return;
    }

    rafRef.current = window.requestAnimationFrame(tick);
  }

  function flap() {
    if (stageRef.current === 'idle' || stageRef.current === 'gameOver') {
      startRun();
      return;
    }

    if (stageRef.current !== 'playing') return;

    velocityRef.current = jumpVelocity;
    flapsRef.current += 1;
    setFlaps(flapsRef.current);
  }

  function handleArenaPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    flap();
  }

  function handleArenaKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    flap();
  }

  const difficulty = getDifficulty(score);
  const elapsedSeconds = Math.round((elapsedMs / 1000) * 10) / 10;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gridOffset = stage === 'playing' ? -(elapsedMs / 70) % 36 : 0;
  const starOffset = stage === 'playing' ? -(elapsedMs / 28) % 120 : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <Stat label="Score" value={String(score)} />
        <Stat label="Best" value={bestScore?.scoreLabel ?? 'Brak danych'} />
        <Stat label="Flaps" value={String(flaps)} />
        <Stat label="Time" value={`${elapsedSeconds.toFixed(1)}s`} />
      </div>

      <div
        aria-label="Flappy Ball arena"
        className="relative h-[22rem] touch-none select-none overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_35%_30%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_80%_72%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.95))] shadow-[0_0_46px_rgba(34,211,238,0.10)] sm:h-[26rem]"
        onKeyDown={handleArenaKeyDown}
        onPointerDown={handleArenaPointerDown}
        role="button"
        style={{ touchAction: 'none' }}
        tabIndex={0}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-22 [background-image:linear-gradient(rgba(34,211,238,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.12)_1px,transparent_1px)] [background-size:36px_36px]"
          style={{ backgroundPosition: `${gridOffset}px 0px` }}
        />
        {!reducedMotion && (
          <div
            className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,transparent_0%,rgba(34,211,238,0.18)_48%,transparent_58%)] [background-size:120px_1px]"
            style={{ backgroundPosition: `${starOffset}px 18%, ${starOffset * 0.7}px 46%, ${starOffset * 1.2}px 72%` }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 border-t border-cyan-300/10 bg-cyan-300/[0.045]" />

        {stage === 'idle' && (
          <GameStartOverlay buttonLabel="Start" description="Tap / Space to fly" onStart={startRun} title="FLAPPY BALL" />
        )}

        {pipes.map((pipe) => {
          const topHeight = pipe.gapY - difficulty.gap / 2;
          const bottomY = pipe.gapY + difficulty.gap / 2;
          return (
            <div key={pipe.id}>
              <div
                className="absolute top-0 rounded-b-2xl border border-cyan-200/25 bg-gradient-to-b from-cyan-200/18 via-cyan-300/10 to-slate-950/35 shadow-[0_0_24px_rgba(34,211,238,0.13),inset_0_0_18px_rgba(34,211,238,0.08)]"
                style={{ height: `${(topHeight / arenaHeight) * 100}%`, left: `${(pipe.x / arenaWidth) * 100}%`, width: `${(pipeWidth / arenaWidth) * 100}%` }}
              />
              <div
                className="absolute bottom-0 rounded-t-2xl border border-violet-200/25 bg-gradient-to-t from-violet-200/18 via-violet-300/10 to-slate-950/35 shadow-[0_0_24px_rgba(168,85,247,0.13),inset_0_0_18px_rgba(168,85,247,0.08)]"
                style={{ height: `${((arenaHeight - bottomY) / arenaHeight) * 100}%`, left: `${(pipe.x / arenaWidth) * 100}%`, width: `${(pipeWidth / arenaWidth) * 100}%` }}
              />
            </div>
          );
        })}

        {stage === 'playing' && !reducedMotion && trail.map((point) => {
          const opacity = Math.max(0.1, 0.42 - point.age * 0.052);
          const scale = Math.max(0.45, 1 - point.age * 0.09);
          return (
            <span
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/20 bg-cyan-200/25"
              key={point.id}
              style={{
                left: `${((ballX - 11 - point.age * 9) / arenaWidth) * 100}%`,
                opacity,
                top: `${(clamp(point.y, 16, arenaHeight - 16) / arenaHeight) * 100}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
            />
          );
        })}
        <div
          className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fuchsia-100/70 bg-[radial-gradient(circle_at_33%_28%,rgba(255,255,255,0.95),rgba(245,208,254,0.75)_16%,rgba(217,70,239,0.95)_48%,rgba(88,28,135,0.95)_100%)] shadow-[0_0_14px_rgba(217,70,239,0.38),0_0_26px_rgba(34,211,238,0.16),inset_-4px_-5px_10px_rgba(30,41,59,0.45)]"
          style={{ left: `${(ballX / arenaWidth) * 100}%`, top: `${(ballY / arenaHeight) * 100}%` }}
        >
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/70 blur-[1px]" />
          <span className="absolute inset-[-3px] rounded-full border border-cyan-100/20" />
        </div>

        {stage === 'gameOver' && result && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-[3px]">
            <div className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/94 p-5 text-center shadow-[0_0_44px_rgba(34,211,238,0.16)]">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-cyan-200">Run complete</p>
              <strong className="mt-2 block text-5xl font-black text-white">{result.score} pkt</strong>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Best: {bestScore?.scoreLabel ?? `${result.score} pkt`}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Flaps: {result.flaps}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Time: {result.survivedTimeSeconds.toFixed(1)}s</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Eff: {formatPercent(result.efficiency)}</span>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:scale-[1.03] hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    startRun();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Zagraj ponownie
                </button>
                <div onPointerDown={(event) => event.stopPropagation()}>
                  <ShareResultButton gameId="flappy-ball" metricLabel="Punkty" scoreLabel={`${result.score} pkt`} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Space / tap · Best time {bestTime?.stats?.survivedTimeSeconds ? `${bestTime.stats.survivedTimeSeconds}s` : 'Brak danych'} · Efficiency {formatPercent(currentEfficiency)}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/22 px-3 py-2 text-center">
      <span className="block text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-sm text-white">{value}</strong>
    </div>
  );
}
