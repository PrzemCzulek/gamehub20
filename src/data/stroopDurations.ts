export const stroopDurationStorageKey = 'game-hub:stroop-duration';
export const stroopDurationChangedEvent = 'game-hub:stroop-duration-changed';
export const defaultStroopDuration = 30;

export const stroopDurationOptions = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export function isStroopDuration(value: number): boolean {
  return stroopDurationOptions.some((option) => option.value === value);
}

export function readStoredStroopDuration(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(stroopDurationStorageKey) ?? '', 10);
    return isStroopDuration(value) ? value : defaultStroopDuration;
  } catch {
    return defaultStroopDuration;
  }
}

export function storeStroopDuration(value: number): void {
  if (!isStroopDuration(value)) return;

  try {
    localStorage.setItem(stroopDurationStorageKey, String(value));
    window.dispatchEvent(new CustomEvent(stroopDurationChangedEvent, { detail: { durationSeconds: value } }));
  } catch {
    return;
  }
}
