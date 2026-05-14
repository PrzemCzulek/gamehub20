export type AimMode = '15s' | '30s' | 'infinity';

export type AimModeOption = {
  value: AimMode;
  label: string;
  description: string;
};

export const aimModeOptions: AimModeOption[] = [
  { value: '15s', label: '15s', description: 'Hit rush' },
  { value: '30s', label: '30s', description: 'Hit rush' },
  { value: 'infinity', label: 'Infinity', description: 'Survival aim' },
];

export const aimModeChangedEvent = 'game-hub:aim-mode-changed';
const storageKey = 'game-hub:aim-mode';

export function readStoredAimMode(): AimMode {
  try {
    const value = localStorage.getItem(storageKey);
    return value === '15s' || value === 'infinity' ? value : '30s';
  } catch {
    return '30s';
  }
}

export function storeAimMode(mode: AimMode): void {
  try {
    localStorage.setItem(storageKey, mode);
    window.dispatchEvent(new CustomEvent(aimModeChangedEvent));
  } catch {
    return;
  }
}
