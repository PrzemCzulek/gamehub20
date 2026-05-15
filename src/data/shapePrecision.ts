export type ShapePrecisionShape = 'circle' | 'square' | 'triangle' | 'star';

export const shapePrecisionShapes: Array<{ id: ShapePrecisionShape; label: string }> = [
  { id: 'circle', label: 'Circle' },
  { id: 'square', label: 'Square' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'star', label: 'Star' },
];

export const shapePrecisionShapeChangedEvent = 'game-hub:shape-precision-shape-changed';
const shapePrecisionShapeKey = 'game-hub:shape-precision-shape';

export function isShapePrecisionShape(value: unknown): value is ShapePrecisionShape {
  return value === 'circle' || value === 'square' || value === 'triangle' || value === 'star';
}

export function readStoredShapePrecisionShape(): ShapePrecisionShape {
  try {
    const stored = localStorage.getItem(shapePrecisionShapeKey);
    return isShapePrecisionShape(stored) ? stored : 'circle';
  } catch {
    return 'circle';
  }
}

export function storeShapePrecisionShape(shape: ShapePrecisionShape): void {
  try {
    localStorage.setItem(shapePrecisionShapeKey, shape);
    window.dispatchEvent(new CustomEvent(shapePrecisionShapeChangedEvent));
  } catch {
    return;
  }
}
