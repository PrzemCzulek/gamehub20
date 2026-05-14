export const typingDurationStorageKey = 'game-hub:typing-duration';
export const defaultTypingDuration = 30;
export const typingDurationChangedEvent = 'game-hub:typing-duration-changed';

export const typingDurationOptions = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '1.5 min', value: 90 },
];

export function isTypingDuration(value: number): boolean {
  return typingDurationOptions.some((option) => option.value === value);
}

export function readStoredTypingDuration(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(typingDurationStorageKey) ?? '', 10);
    return isTypingDuration(value) ? value : defaultTypingDuration;
  } catch {
    return defaultTypingDuration;
  }
}

export function storeTypingDuration(value: number): void {
  if (!isTypingDuration(value)) {
    return;
  }

  try {
    localStorage.setItem(typingDurationStorageKey, String(value));
    window.dispatchEvent(new CustomEvent(typingDurationChangedEvent, { detail: { durationSeconds: value } }));
  } catch {
    return;
  }
}
