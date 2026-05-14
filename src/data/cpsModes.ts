export type CpsInputMode = 'normal' | 'space' | 'alternating';

export const cpsSettingsStorageKey = 'game-hub:cps-settings';
export const cpsSettingsChangedEvent = 'game-hub:cps-settings-changed';
export const defaultCpsDuration = 5;
export const defaultCpsInputMode: CpsInputMode = 'normal';

export const cpsDurationOptions = [
  { label: '1s', value: 1 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

export const cpsInputModeOptions: Array<{ label: string; value: CpsInputMode }> = [
  { label: 'Click', value: 'normal' },
  { label: 'Space', value: 'space' },
  { label: 'Alt', value: 'alternating' },
];

export type CpsSettings = {
  durationSeconds: number;
  inputMode: CpsInputMode;
};

export function isCpsDuration(value: number): boolean {
  return cpsDurationOptions.some((option) => option.value === value);
}

export function isCpsInputMode(value: unknown): value is CpsInputMode {
  return value === 'normal' || value === 'space' || value === 'alternating';
}

export function readStoredCpsSettings(): CpsSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(cpsSettingsStorageKey) ?? '{}') as Partial<CpsSettings>;
    const durationSeconds = typeof parsed.durationSeconds === 'number' && isCpsDuration(parsed.durationSeconds)
      ? parsed.durationSeconds
      : defaultCpsDuration;
    const inputMode = isCpsInputMode(parsed.inputMode) ? parsed.inputMode : defaultCpsInputMode;

    return { durationSeconds, inputMode };
  } catch {
    return { durationSeconds: defaultCpsDuration, inputMode: defaultCpsInputMode };
  }
}

export function storeCpsSettings(settings: Partial<CpsSettings>): void {
  const current = readStoredCpsSettings();
  const next: CpsSettings = {
    durationSeconds:
      typeof settings.durationSeconds === 'number' && isCpsDuration(settings.durationSeconds)
        ? settings.durationSeconds
        : current.durationSeconds,
    inputMode: isCpsInputMode(settings.inputMode) ? settings.inputMode : current.inputMode,
  };

  try {
    localStorage.setItem(cpsSettingsStorageKey, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(cpsSettingsChangedEvent, { detail: next }));
  } catch {
    return;
  }
}

export function getCpsLeaderboardScope(durationSeconds: number, inputMode: CpsInputMode): string {
  if (inputMode === 'alternating') return `${durationSeconds}s-alt`;
  if (inputMode === 'space') return `${durationSeconds}s-space`;
  return `${durationSeconds}s`;
}
