import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { GameStartOverlay } from '../components/game/GameStartOverlay';
import { ShareResultButton } from '../components/game/ShareResultButton';
import { readStoredShapePrecisionShape, shapePrecisionShapeChangedEvent, shapePrecisionShapes, storeShapePrecisionShape, type ShapePrecisionShape } from '../data/shapePrecision';
import type { ScoreInput } from '../types';

type ShapeId = ShapePrecisionShape;
type Point = { x: number; y: number; t: number };
type NormalizedPoint = { x: number; y: number };
type Phase = 'idle' | 'drawing' | 'result';

type ShapeResult = {
  shape: ShapeId;
  accuracy: number;
  rating: string;
  drawingTimeMs: number;
  smoothness: number;
  deviation: number;
  pointsCount: number;
};

const shapeLabels: Record<ShapeId, string> = {
  circle: 'Circle',
  square: 'Square',
  triangle: 'Triangle',
  star: 'Star',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: NormalizedPoint, b: NormalizedPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: NormalizedPoint, b: NormalizedPoint, t: number): NormalizedPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function samplePolyline(vertices: NormalizedPoint[], samplesPerSegment: number, close = true): NormalizedPoint[] {
  const result: NormalizedPoint[] = [];
  const limit = close ? vertices.length : vertices.length - 1;

  for (let i = 0; i < limit; i += 1) {
    const start = vertices[i];
    const end = vertices[(i + 1) % vertices.length];
    for (let step = 0; step < samplesPerSegment; step += 1) {
      result.push(lerp(start, end, step / samplesPerSegment));
    }
  }

  return result;
}

function getIdealShape(shape: ShapeId): NormalizedPoint[] {
  if (shape === 'circle') {
    return Array.from({ length: 96 }, (_, index) => {
      const angle = (index / 96) * Math.PI * 2;
      return { x: 0.5 + Math.cos(angle) * 0.42, y: 0.5 + Math.sin(angle) * 0.42 };
    });
  }

  if (shape === 'square') {
    return samplePolyline(
      [
        { x: 0.14, y: 0.14 },
        { x: 0.86, y: 0.14 },
        { x: 0.86, y: 0.86 },
        { x: 0.14, y: 0.86 },
      ],
      24,
    );
  }

  if (shape === 'triangle') {
    return samplePolyline(
      [
        { x: 0.5, y: 0.12 },
        { x: 0.9, y: 0.86 },
        { x: 0.1, y: 0.86 },
      ],
      32,
    );
  }

  const vertices = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index / 10) * Math.PI * 2;
    const radius = index % 2 === 0 ? 0.43 : 0.2;
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
  });
  return samplePolyline(vertices, 12);
}

function normalizePoints(points: Point[]): NormalizedPoint[] {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.max(width, height);
  const offsetX = minX - (scale - width) / 2;
  const offsetY = minY - (scale - height) / 2;

  return points.map((point) => ({
    x: clamp((point.x - offsetX) / scale, 0, 1),
    y: clamp((point.y - offsetY) / scale, 0, 1),
  }));
}

function averageNearestDistance(from: NormalizedPoint[], to: NormalizedPoint[]): number {
  if (from.length === 0 || to.length === 0) return 1;

  const step = Math.max(1, Math.floor(from.length / 120));
  let total = 0;
  let count = 0;

  for (let i = 0; i < from.length; i += step) {
    let nearest = Infinity;
    for (const target of to) {
      nearest = Math.min(nearest, distance(from[i], target));
    }
    total += nearest;
    count += 1;
  }

  return total / Math.max(1, count);
}

function calculateSmoothness(points: NormalizedPoint[]): number {
  if (points.length < 4) return 0;

  let angleChange = 0;
  let count = 0;

  for (let i = 2; i < points.length; i += 1) {
    const a = points[i - 2];
    const b = points[i - 1];
    const c = points[i];
    const angle1 = Math.atan2(b.y - a.y, b.x - a.x);
    const angle2 = Math.atan2(c.y - b.y, c.x - b.x);
    let diff = Math.abs(angle2 - angle1);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    angleChange += diff;
    count += 1;
  }

  const averageChange = angleChange / Math.max(1, count);
  return clamp(Math.round((1 - averageChange / Math.PI) * 100), 0, 100);
}

function getRating(accuracy: number): string {
  if (accuracy >= 98) return 'PERFECT';
  if (accuracy >= 94) return 'GREAT';
  if (accuracy >= 88) return 'GOOD';
  if (accuracy >= 75) return 'OK';
  return 'MISS';
}

function evaluateShape(points: Point[], shape: ShapeId): ShapeResult {
  const normalized = normalizePoints(points);
  const ideal = getIdealShape(shape);
  const drawToIdeal = averageNearestDistance(normalized, ideal);
  const idealToDraw = averageNearestDistance(ideal, normalized);
  const deviation = (drawToIdeal + idealToDraw) / 2;
  const closure = normalized.length > 1 ? distance(normalized[0], normalized[normalized.length - 1]) : 1;
  const smoothness = calculateSmoothness(normalized);
  const pointsPenalty = points.length < 24 ? (24 - points.length) * 0.9 : 0;
  const closurePenalty = closure > 0.16 ? (shape === 'circle' ? 11 : 7) : closure > 0.09 ? 4 : 0;
  const cornerPenalty = shape !== 'circle' && smoothness > 96 ? 4 : 0;
  const accuracy = clamp(100 - deviation * 145 - closurePenalty - pointsPenalty - cornerPenalty, 0, 100);
  const roundedAccuracy = Math.round(accuracy * 100) / 100;
  const drawingTimeMs = Math.max(0, points[points.length - 1].t - points[0].t);

  return {
    shape,
    accuracy: roundedAccuracy,
    rating: getRating(roundedAccuracy),
    drawingTimeMs,
    smoothness,
    deviation: Math.round(deviation * 10000) / 100,
    pointsCount: points.length,
  };
}

function getPointerPoint(event: PointerEvent<SVGSVGElement>, element: SVGSVGElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100,
    y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100,
    t: performance.now(),
  };
}

function pointsToPath(points: Point[]): string {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

function idealPointsToPath(shape: ShapeId): string {
  return getIdealShape(shape).map((point) => `${(point.x * 100).toFixed(1)},${(point.y * 100).toFixed(1)}`).join(' ');
}

export function ShapePrecisionGame({ onScore }: { onScore: (score: ScoreInput) => void }) {
  const [selectedShape, setSelectedShape] = useState<ShapeId>(() => readStoredShapePrecisionShape());
  const [phase, setPhase] = useState<Phase>('idle');
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<ShapeResult | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const idealPath = useMemo(() => idealPointsToPath(selectedShape), [selectedShape]);

  useEffect(() => {
    function handleShapeChange() {
      const nextShape = readStoredShapePrecisionShape();
      setSelectedShape(nextShape);
      setPhase((current) => (current === 'drawing' ? current : 'idle'));
      setPoints([]);
      setResult(null);
    }

    window.addEventListener(shapePrecisionShapeChangedEvent, handleShapeChange);
    return () => window.removeEventListener(shapePrecisionShapeChangedEvent, handleShapeChange);
  }, []);

  function reset(nextShape = selectedShape) {
    setPhase('idle');
    setSelectedShape(nextShape);
    storeShapePrecisionShape(nextShape);
    setPoints([]);
    setResult(null);
    setIsPointerDown(false);
  }

  function start() {
    setPhase('drawing');
    setPoints([]);
    setResult(null);
    setIsPointerDown(false);
  }

  function finishDrawing(finalPoints: Point[]) {
    if (finalPoints.length < 6) {
      setIsPointerDown(false);
      return;
    }

    const nextResult = evaluateShape(finalPoints, selectedShape);
    setResult(nextResult);
    setPhase('result');
    setIsPointerDown(false);

    onScore({
      gameId: 'shape-precision',
      score: nextResult.accuracy,
      scoreLabel: `${nextResult.accuracy.toFixed(2)}%`,
      stats: {
        shape: selectedShape,
        accuracy: nextResult.accuracy,
        drawingTimeMs: nextResult.drawingTimeMs,
        smoothness: nextResult.smoothness,
        deviation: nextResult.deviation,
        pointsCount: nextResult.pointsCount,
        rating: nextResult.rating,
      },
      meta: {
        shape: selectedShape,
        rating: nextResult.rating,
      },
      runDurationMs: nextResult.drawingTimeMs,
    });
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (phase !== 'drawing' || !svgRef.current) return;
    event.preventDefault();
    svgRef.current.setPointerCapture(event.pointerId);
    setIsPointerDown(true);
    setPoints([getPointerPoint(event, svgRef.current)]);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (phase !== 'drawing' || !isPointerDown || !svgRef.current) return;
    event.preventDefault();
    const nextPoint = getPointerPoint(event, svgRef.current);
    setPoints((current) => {
      const previous = current[current.length - 1];
      if (previous && Math.hypot(previous.x - nextPoint.x, previous.y - nextPoint.y) < 0.55) return current;
      return [...current, nextPoint].slice(-700);
    });
  }

  function handlePointerUp(event: PointerEvent<SVGSVGElement>) {
    if (phase !== 'drawing' || !isPointerDown || !svgRef.current) return;
    event.preventDefault();
    const nextPoint = getPointerPoint(event, svgRef.current);
    const finalPoints = [...points, nextPoint];
    setPoints(finalPoints);
    finishDrawing(finalPoints);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
        <div>
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-cyan-200">Shape selector</p>
          <h2 className="mt-1 text-xl font-black text-white">Shape Precision</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {shapePrecisionShapes.map((shape) => (
            <button
              className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                selectedShape === shape.id ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/10 bg-white/[0.035] text-slate-300 hover:border-cyan-300/35 hover:text-cyan-100'
              }`}
              disabled={phase === 'drawing'}
              key={shape.id}
              onClick={() => reset(shape.id)}
              type="button"
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-cyan-300/15 bg-slate-950/80 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.13),transparent_38%),radial-gradient(circle_at_70%_75%,rgba(168,85,247,0.12),transparent_34%)]" />
        <svg
          aria-label="Shape Precision drawing area"
          className="relative block h-[440px] w-full touch-none select-none"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          ref={svgRef}
          viewBox="0 0 100 100"
        >
          <polyline fill="none" points={idealPath} stroke="rgba(148, 163, 184, 0.26)" strokeDasharray="1.8 2.4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={pointsToPath(points)} stroke="rgba(34, 211, 238, 0.18)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={pointsToPath(points)} stroke="rgb(103, 232, 249)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.25" vectorEffect="non-scaling-stroke" />
        </svg>

        {phase === 'idle' && (
          <GameStartOverlay
            buttonLabel="Start"
            description="Rysuj jednym ruchem. Zwolnienie kursora kończy próbę."
            onStart={start}
            title={`${shapeLabels[selectedShape]} precision`}
          />
        )}

        {phase === 'result' && result && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/68 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-3xl border border-cyan-300/25 bg-slate-950/92 p-5 text-center shadow-[0_0_45px_rgba(34,211,238,0.16)]">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-cyan-200">{shapeLabels[result.shape]} · {result.rating}</p>
              <strong className="mt-2 block text-5xl font-black text-white">{result.accuracy.toFixed(2)}%</strong>
              <div className="mt-4 grid gap-2 text-left sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Time</span><strong className="mt-1 block text-white">{(result.drawingTimeMs / 1000).toFixed(2)}s</strong></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Smooth</span><strong className="mt-1 block text-white">{result.smoothness}%</strong></div>
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-slate-500">Deviation</span><strong className="mt-1 block text-white">{result.deviation.toFixed(2)}</strong></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-100" onClick={start} type="button">
                  Spróbuj ponownie
                </button>
                <ShareResultButton gameId="shape-precision" metricLabel="Accuracy" modeLabel={shapeLabels[result.shape]} scoreLabel={`${result.accuracy.toFixed(2)}%`} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Shape</span><strong className="mt-1 block text-white">{shapeLabels[selectedShape]}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Status</span><strong className="mt-1 block text-white">{phase === 'drawing' ? 'Draw' : phase === 'result' ? 'Result' : 'Ready'}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Points</span><strong className="mt-1 block text-white">{points.length}</strong></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-slate-500">Best run</span><strong className="mt-1 block text-white">{result ? `${result.accuracy.toFixed(2)}%` : '-'}</strong></div>
      </div>
    </div>
  );
}
