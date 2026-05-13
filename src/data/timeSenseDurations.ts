export const timeSenseDurationStorageKey = 'game-hub:time-sense-duration';
export const timeSenseDurationChangedEvent = 'game-hub:time-sense-duration-changed';
export const defaultTimeSenseDuration = 10;

export const timeSenseDurationOptions = [
  { label: '10s', value: 10 },
  { label: '20s', value: 20 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export function isTimeSenseDuration(value: number): boolean {
  return timeSenseDurationOptions.some((option) => option.value === value);
}

export function readStoredTimeSenseDuration(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(timeSenseDurationStorageKey) ?? '', 10);
    return isTimeSenseDuration(value) ? value : defaultTimeSenseDuration;
  } catch {
    return defaultTimeSenseDuration;
  }
}

export function storeTimeSenseDuration(value: number): void {
  if (!isTimeSenseDuration(value)) {
    return;
  }

  try {
    localStorage.setItem(timeSenseDurationStorageKey, String(value));
    window.dispatchEvent(new CustomEvent(timeSenseDurationChangedEvent, { detail: { durationSeconds: value } }));
  } catch {
    return;
  }
}
