import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import { aimModeOptions, readStoredAimMode, storeAimMode, type AimMode } from '../data/aimModes';
import { playNormalClickSound } from '../services/audio';
import type { ScoreInput } from '../types';
import { formatPercent } from '../utils/format';

type AimTestGameProps = {
  onScore: (score: ScoreInput) => void;
};

type Target = {
  x: number;
  y: number;
  appearedAt: number;
};

type AimFeedback = {
  id: number;
  x: number;
  y: number;
  type: 'hit' | 'miss' | 'heal';
  label: string;
};

type FinalResult = {
  mode: AimMode;
  score: number;
  accuracy: number;
  averageReactionMs: number;
  bestReactionMs: number;
  hits: number;
  misses: number;
  maxCombo: number;
  survivedTime?: number;
  hpRecovered?: number;
  finalHp?: number;
};

const modeDurationSeconds: Partial<Record<AimMode, number>> = {
  '15s': 15,
  '30s': 30,
};
const maxHp = 3;
const initialRegenThreshold = 10;

function createTarget(): Target {
  return {
    x: 12 + Math.random() * 76,
    y: 12 + Math.random() * 76,
    appearedAt: performance.now(),
  };
}

function getModeLabel(mode: AimMode): string {
  return aimModeOptions.find((option) => option.value === mode)?.label ?? mode;
}

export function AimTestGame({ onScore }: AimTestGameProps) {
  const [mode, setMode] = useState<AimMode>(() => readStoredAimMode());
  const [target, setTarget] = useState<Target | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hp, setHp] = useState(maxHp);
  const [regenThreshold, setRegenThreshold] = useState(initialRegenThreshold);
  const [hpRecovered, setHpRecovered] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [feedbacks, setFeedbacks] = useState<AimFeedback[]>([]);
  const finishingRef = useRef(false);
  const feedbackIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const modeRef = useRef<AimMode>(mode);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const hpRef = useRef(maxHp);
  const regenThresholdRef = useRef(initialRegenThreshold);
  const hpRecoveredRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  function pushArenaFeedback(feedback: Omit<AimFeedback, 'id'>) {
    const id = feedbackIdRef.current + 1;
    feedbackIdRef.current = id;
    setFeedbacks((current) => [...current, { ...feedback, id }].slice(-7));
    window.setTimeout(() => {
      setFeedbacks((current) => current.filter((item) => item.id !== id));
    }, 560);
  }

  function clearTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function syncCounters(next: {
    hits?: number;
    misses?: number;
    combo?: number;
    maxCombo?: number;
    hp?: number;
    regenThreshold?: number;
    hpRecovered?: number;
    reactionTimes?: number[];
  }) {
    if (next.hits !== undefined) {
      hitsRef.current = next.hits;
      setHits(next.hits);
    }
    if (next.misses !== undefined) {
      missesRef.current = next.misses;
      setMisses(next.misses);
    }
    if (next.combo !== undefined) {
      comboRef.current = next.combo;
      setCombo(next.combo);
    }
    if (next.maxCombo !== undefined) {
      maxComboRef.current = next.maxCombo;
      setMaxCombo(next.maxCombo);
    }
    if (next.hp !== undefined) {
      hpRef.current = next.hp;
      setHp(next.hp);
    }
    if (next.regenThreshold !== undefined) {
      regenThresholdRef.current = next.regenThreshold;
      setRegenThreshold(next.regenThreshold);
    }
    if (next.hpRecovered !== undefined) {
      hpRecoveredRef.current = next.hpRecovered;
      setHpRecovered(next.hpRecovered);
    }
    if (next.reactionTimes) {
      reactionTimesRef.current = next.reactionTimes;
      setReactionTimes(next.reactionTimes);
    }
  }

  function start(nextMode = mode) {
    clearTimer();
    modeRef.current = nextMode;
    finishingRef.current = false;
    startedAtRef.current = performance.now();
    syncCounters({
      hits: 0,
      misses: 0,
      combo: 0,
      maxCombo: 0,
      hp: maxHp,
      regenThreshold: initialRegenThreshold,
      hpRecovered: 0,
      reactionTimes: [],
    });
    setFinalResult(null);
    setFeedbacks([]);
    setElapsedMs(0);
    setRemainingMs((modeDurationSeconds[nextMode] ?? 0) * 1000);
    setTarget(createTarget());

    const durationSeconds = modeDurationSeconds[nextMode];
    if (durationSeconds) {
      timerRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        setRemainingMs(Math.max(0, durationSeconds * 1000 - elapsed));
        if (elapsed >= durationSeconds * 1000) {
          finish('timer');
        }
      }, 100);
    } else {
      timerRef.current = window.setInterval(() => {
        setElapsedMs(performance.now() - startedAtRef.current);
      }, 120);
    }
  }

  function resetToIdle(nextMode: AimMode) {
    clearTimer();
    modeRef.current = nextMode;
    finishingRef.current = false;
    startedAtRef.current = 0;
    syncCounters({
      hits: 0,
      misses: 0,
      combo: 0,
      maxCombo: 0,
      hp: maxHp,
      regenThreshold: initialRegenThreshold,
      hpRecovered: 0,
      reactionTimes: [],
    });
    setTarget(null);
    setFinalResult(null);
    setFeedbacks([]);
    setElapsedMs(0);
    setRemainingMs((modeDurationSeconds[nextMode] ?? 0) * 1000);
  }

  function finish(reason: 'timer' | 'hp') {
    if (finishingRef.current) return;

    finishingRef.current = true;
    clearTimer();
    const finalHits = hitsRef.current;
    const finalMisses = missesRef.current;
    const finalReactions = reactionTimesRef.current;
    const averageReactionMs = Math.round(finalReactions.reduce((total, value) => total + value, 0) / Math.max(finalReactions.length, 1));
    const bestReactionMs = finalReactions.length > 0 ? Math.min(...finalReactions) : 0;
    const accuracy = Math.round((finalHits / Math.max(finalHits + finalMisses, 1)) * 10000) / 100;
    const survivedTime = Math.round((performance.now() - startedAtRef.current) / 1000);
    const finalMode = modeRef.current;
    const finalResultData: FinalResult = {
      mode: finalMode,
      score: finalHits,
      accuracy,
      averageReactionMs,
      bestReactionMs,
      hits: finalHits,
      misses: finalMisses,
      maxCombo: maxComboRef.current,
      survivedTime: finalMode === 'infinity' ? survivedTime : undefined,
      hpRecovered: finalMode === 'infinity' ? hpRecoveredRef.current : undefined,
      finalHp: finalMode === 'infinity' ? hpRef.current : undefined,
    };

    setTarget(null);
    setRemainingMs(0);
    setElapsedMs(survivedTime * 1000);
    setFinalResult(finalResultData);

    onScore({
      gameId: 'aim-test',
      score: finalHits,
      scoreLabel: `${finalHits} pkt`,
      stats: {
        mode: finalMode,
        accuracy,
        hits: finalHits,
        misses: finalMisses,
        averageReactionMs,
        bestReactionMs,
        bestCombo: maxComboRef.current,
        combo: maxComboRef.current,
        survivedTime: finalMode === 'infinity' ? survivedTime : undefined,
        durationSeconds: modeDurationSeconds[finalMode],
        hpRecovered: finalMode === 'infinity' ? hpRecoveredRef.current : undefined,
        finalHp: finalMode === 'infinity' ? hpRef.current : undefined,
      },
      meta: { mode: finalMode, reason },
      runDurationMs: finalMode === 'infinity' ? survivedTime * 1000 : (modeDurationSeconds[finalMode] ?? 0) * 1000,
    });
  }

  function handleModeChange(nextMode: AimMode) {
    playNormalClickSound();
    setMode(nextMode);
    storeAimMode(nextMode);
    resetToIdle(nextMode);
  }

  function handleHit() {
    if (!target || finishingRef.current) return;

    const reactionMs = Math.round(performance.now() - target.appearedAt);
    const nextHits = hitsRef.current + 1;
    const nextCombo = comboRef.current + 1;
    const nextMaxCombo = Math.max(maxComboRef.current, nextCombo);
    const nextReactionTimes = [...reactionTimesRef.current, reactionMs];
    let nextHp = hpRef.current;
    let nextRegenThreshold = regenThresholdRef.current;
    let nextHpRecovered = hpRecoveredRef.current;

    pushArenaFeedback({ x: target.x, y: target.y, type: 'hit', label: '+1' });

    if (modeRef.current === 'infinity' && nextHp < maxHp && nextCombo >= nextRegenThreshold) {
      nextHp += 1;
      nextHpRecovered += 1;
      nextRegenThreshold += 5;
      pushArenaFeedback({ x: target.x, y: target.y + 8, type: 'heal', label: 'HP +1' });
    }

    syncCounters({
      hits: nextHits,
      combo: nextCombo,
      maxCombo: nextMaxCombo,
      hp: nextHp,
      regenThreshold: nextRegenThreshold,
      hpRecovered: nextHpRecovered,
      reactionTimes: nextReactionTimes,
    });
    setTarget(createTarget());
  }

  function handleMiss(event: PointerEvent<HTMLDivElement>) {
    if (!target || finishingRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const nextMisses = missesRef.current + 1;
    const nextHp = modeRef.current === 'infinity' ? hpRef.current - 1 : hpRef.current;

    playNormalClickSound();
    pushArenaFeedback({ x, y, type: 'miss', label: 'MISS' });
    syncCounters({ misses: nextMisses, combo: 0, hp: nextHp });

    if (modeRef.current === 'infinity' && nextHp <= 0) {
      finish('hp');
    }
  }

  const averageReactionMs = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((total, value) => total + value, 0) / reactionTimes.length) : 0;
  const accuracy = Math.round((hits / Math.max(hits + misses, 1)) * 10000) / 100;
  const started = Boolean(target) || Boolean(finalResult) || hits > 0 || misses > 0;
  const active = Boolean(target) && !finalResult;
  const selectedModeOption = aimModeOptions.find((option) => option.value === mode) ?? aimModeOptions[1];
  const modeCopy =
    mode === 'infinity'
      ? { title: 'Survival aim', description: '3 HP. Combo regeneruje życie.' }
      : { title: 'Hit rush', description: 'Zdobądź jak najwięcej trafień.' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-black/25 p-1">
        {aimModeOptions.map((option) => (
          <button
            aria-pressed={mode === option.value}
            className={`rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
              mode === option.value
                ? 'bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            } ${active ? 'pointer-events-none opacity-55' : ''}`}
            key={option.value}
            onClick={() => handleModeChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          {mode === 'infinity' ? 'HP' : 'Czas'}:{' '}
          <strong className={mode === 'infinity' ? 'text-red-100' : 'text-cyan-100'}>
            {mode === 'infinity' ? `${Math.max(0, hp)}/${maxHp}` : `${Math.ceil(remainingMs / 1000)}s`}
          </strong>
        </span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Trafienia: <strong className="text-white">{hits}</strong>
        </span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Combo: <strong className="text-teal-100">{combo}</strong>
        </span>
        <span className="rounded-md bg-black/20 px-3 py-2 text-slate-300">
          Celność: <strong className="text-cyan-100">{formatPercent(accuracy)}</strong>
        </span>
        <span className="rounded-md border border-red-300/15 bg-red-400/10 px-3 py-2 text-red-100">
          Miss: <strong>{misses}</strong>
        </span>
      </div>

      {mode === 'infinity' ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300/10 bg-red-400/[0.045] px-3 py-2 text-xs text-slate-300">
          <span>HP: {'●'.repeat(Math.max(0, hp))}<span className="text-slate-600">{'●'.repeat(Math.max(0, maxHp - hp))}</span></span>
          <span className="font-bold text-cyan-100">Regen przy combo {regenThreshold}</span>
          <span>HP +{hpRecovered}</span>
          <span>{Math.round(elapsedMs / 1000)}s</span>
        </div>
      ) : (
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.45)] transition-all duration-200"
            style={{ width: `${100 - Math.min(100, Math.round((remainingMs / ((modeDurationSeconds[mode] ?? 1) * 1000)) * 100))}%` }}
          />
        </div>
      )}

      <div
        aria-label="Arena Aim Test"
        className={`aim-arena relative h-80 w-full overflow-hidden rounded-xl border border-white/10 bg-black/25 transition sm:h-96 ${target ? 'opacity-100' : 'opacity-75'}`}
        onPointerDown={handleMiss}
      >
        {!started && (
          <GameStartOverlay
            buttonLabel="Start"
            description={modeCopy.description}
            onStart={() => {
              playNormalClickSound();
              start();
            }}
            title={modeCopy.title}
          />
        )}

        {target && (
          <span
            aria-label="Cel"
            className="aim-target absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/80 bg-cyan-300/20 shadow-[0_0_30px_rgba(34,211,238,0.34)] transition hover:scale-110"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              playNormalClickSound();
              handleHit();
            }}
            role="button"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            tabIndex={-1}
          >
            <span className="absolute h-full w-full rounded-full border border-cyan-200/45" />
            <span className="h-5 w-5 rounded-full bg-cyan-100 shadow-[0_0_20px_rgba(240,253,250,0.8)]" />
          </span>
        )}

        {feedbacks.map((feedback) => (
          <span
            className={`aim-feedback pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${
              feedback.type === 'hit'
                ? 'border-emerald-300/45 bg-emerald-300/15 text-emerald-100'
                : feedback.type === 'heal'
                  ? 'border-cyan-300/55 bg-cyan-300/15 text-cyan-100'
                  : 'border-red-300/45 bg-red-400/15 text-red-100'
            }`}
            key={feedback.id}
            style={{ left: `${feedback.x}%`, top: `${feedback.y}%` }}
          >
            {feedback.label}
          </span>
        ))}

        {finalResult && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-[3px]">
            <div className="feedback-toast w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-950/92 p-5 text-center shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <p className="text-[0.7rem] font-black uppercase tracking-[0.28em] text-cyan-200">{getModeLabel(finalResult.mode)}</p>
              <strong className="mt-2 block text-4xl font-black text-white">{finalResult.score} pkt</strong>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Celność: {formatPercent(finalResult.accuracy)}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Combo: {finalResult.maxCombo}</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Śr.: {finalResult.averageReactionMs} ms</span>
                <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Best: {finalResult.bestReactionMs} ms</span>
                {finalResult.mode === 'infinity' && (
                  <>
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">Czas: {finalResult.survivedTime}s</span>
                    <span className="rounded-md bg-black/25 px-3 py-2 text-slate-300">HP +{finalResult.hpRecovered}</span>
                  </>
                )}
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  className="rounded-xl bg-cyan-300 px-7 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.28)] transition hover:scale-[1.03] hover:bg-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    playNormalClickSound();
                    start(finalResult.mode);
                  }}
                  type="button"
                >
                  Zagraj ponownie
                </button>
                <div onPointerDown={(event) => event.stopPropagation()}>
                  <ShareResultButton
                    gameId="aim-test"
                    metricLabel="Punkty"
                    modeLabel={getModeLabel(finalResult.mode)}
                    scoreLabel={`${finalResult.score} pkt`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {selectedModeOption.description} · Max combo {maxCombo} · Śr. reakcja {averageReactionMs} ms
      </p>
    </div>
  );
}
