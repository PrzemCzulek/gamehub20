import { useEffect, useRef, useState } from 'react';
import type { GameId, ScoreInput } from '../types';

type SequenceMessages = {
  initial: string;
  showing: string;
  input: string;
  success: string;
};

type UseSequenceGameOptions = {
  gameId: GameId;
  itemCount: number;
  flashMs: number;
  stepMs: number;
  endDelayMs: number;
  messages: SequenceMessages;
  onScore: (score: ScoreInput) => void;
};

type SequencePhase = 'idle' | 'showing' | 'input' | 'success' | 'error';

export function useSequenceGame({
  gameId,
  itemCount,
  flashMs,
  stepMs,
  endDelayMs,
  messages,
  onScore,
}: UseSequenceGameOptions) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputIndex, setInputIndex] = useState(0);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [lastTappedItem, setLastTappedItem] = useState<number | null>(null);
  const [wrongItem, setWrongItem] = useState<number | null>(null);
  const [showing, setShowing] = useState(false);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState(messages.initial);
  const [phase, setPhase] = useState<SequencePhase>('idle');
  const timersRef = useRef<number[]>([]);
  const inputLockedRef = useRef(false);

  function clearTimers() {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }

  function schedule(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function addStep(nextLevel: number) {
    setLevel(nextLevel);
    setMessage(messages.showing);
    setPhase('showing');
    setSequence((current) => [...current, Math.floor(Math.random() * itemCount)]);
  }

  function startFirstStep() {
    setLevel(1);
    setMessage(messages.showing);
    setPhase('showing');
    setSequence([Math.floor(Math.random() * itemCount)]);
  }

  useEffect(() => {
    clearTimers();

    if (sequence.length === 0) {
      setShowing(false);
      setActiveItem(null);
      inputLockedRef.current = false;
      if (level === 0) {
        setPhase('idle');
      }
      return;
    }

    setShowing(true);
    setPhase('showing');
    inputLockedRef.current = true;
    setInputIndex(0);
    setMessage(messages.showing);

    sequence.forEach((item, index) => {
      const startAt = index * stepMs;
      schedule(() => setActiveItem(item), startAt);
      schedule(() => setActiveItem(null), startAt + flashMs);
    });

    schedule(() => {
      setShowing(false);
      inputLockedRef.current = false;
      setMessage(messages.input);
      setPhase('input');
    }, sequence.length * stepMs + endDelayMs);

    return clearTimers;
  }, [endDelayMs, flashMs, messages.input, messages.showing, sequence, stepMs]);

  useEffect(() => clearTimers, []);

  function start() {
    clearTimers();
    setSequence([]);
    setInputIndex(0);
    setLevel(0);
    setActiveItem(null);
    setLastTappedItem(null);
    setWrongItem(null);
    setShowing(false);
    inputLockedRef.current = true;
    setMessage(messages.showing);
    setPhase('showing');
    startFirstStep();
  }

  function choose(item: number) {
    if (showing || inputLockedRef.current || sequence.length === 0) {
      return;
    }

    setLastTappedItem(item);
    schedule(() => setLastTappedItem(null), 180);

    if (sequence[inputIndex] !== item) {
      const finalLevel = Math.max(0, level - 1);
      inputLockedRef.current = true;
      clearTimers();
      setWrongItem(item);
      window.setTimeout(() => setWrongItem(null), 420);
      setMessage(`Koniec gry. Wynik: poziom ${finalLevel}.`);
      setSequence([]);
      setInputIndex(0);
      setActiveItem(null);
      setShowing(false);
      setPhase('error');
      onScore({
        gameId,
        score: finalLevel,
        scoreLabel: `Poziom ${finalLevel}`,
        meta: { failedAtLevel: level },
      });
      return;
    }

    if (inputIndex + 1 === sequence.length) {
      inputLockedRef.current = true;
      setMessage(messages.success);
      setPhase('success');
      schedule(() => addStep(level + 1), 450);
      return;
    }

    setInputIndex((current) => current + 1);
  }

  return {
    activeItem,
    choose,
    inputIndex,
    lastTappedItem,
    level,
    message,
    phase,
    sequenceLength: sequence.length,
    showing,
    start,
    wrongItem,
  };
}
