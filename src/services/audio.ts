const AUDIO_ENABLED_KEY = 'gameHubAudioEnabled';
const AUDIO_VOLUME_KEY = 'gameHubAudioVolume';
const CLICK_SOUND_PATH = '/audio/ui-click.mp3';
const HOVER_SOUND_PATH = '/audio/ui-hover.mp3';
const NORMAL_CLICK_SOUND_PATH = '/audio/ui-click-normal.mp3';
const CLICK_COOLDOWN_MS = 80;
const NORMAL_CLICK_COOLDOWN_MS = 80;
const HOVER_COOLDOWN_MS = 120;
const DEFAULT_VOLUME = 0.35;
const CLICK_POOL_SIZE = 6;
const NORMAL_CLICK_POOL_SIZE = 4;
const HOVER_POOL_SIZE = 2;

let clickPool: HTMLAudioElement[] | null = null;
let normalClickPool: HTMLAudioElement[] | null = null;
let hoverPool: HTMLAudioElement[] | null = null;
let clickStartedAt = new WeakMap<HTMLAudioElement, number>();
let normalClickStartedAt = new WeakMap<HTMLAudioElement, number>();
let lastClickAt = 0;
let lastNormalClickAt = 0;
let lastHoverAt = 0;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, value));
}

function getEffectiveVolume(): number {
  return getAudioVolume();
}

function applyVolumeToPools(): void {
  const volume = getEffectiveVolume();
  clickPool?.forEach((audio) => {
    audio.volume = volume;
  });
  normalClickPool?.forEach((audio) => {
    audio.volume = volume;
  });
  hoverPool?.forEach((audio) => {
    audio.volume = volume;
  });
}

function createAudio(src: string): HTMLAudioElement | null {
  try {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = getEffectiveVolume();
    return audio;
  } catch {
    return null;
  }
}

function createAudioPool(src: string, size: number): HTMLAudioElement[] {
  return Array.from({ length: size })
    .map(() => createAudio(src))
    .filter((audio): audio is HTMLAudioElement => Boolean(audio));
}

function getClickPool(): HTMLAudioElement[] {
  clickPool ??= createAudioPool(CLICK_SOUND_PATH, CLICK_POOL_SIZE);
  return clickPool;
}

function getHoverPool(): HTMLAudioElement[] {
  hoverPool ??= createAudioPool(HOVER_SOUND_PATH, HOVER_POOL_SIZE);
  return hoverPool;
}

function getNormalClickPool(): HTMLAudioElement[] {
  normalClickPool ??= createAudioPool(NORMAL_CLICK_SOUND_PATH, NORMAL_CLICK_POOL_SIZE);
  return normalClickPool;
}

function playFromPool(pool: HTMLAudioElement[]): void {
  if (!getAudioEnabled()) {
    return;
  }

  const audio = pool.find((item) => item.paused || item.ended);

  if (!audio) {
    return;
  }

  try {
    audio.volume = getEffectiveVolume();
    audio.currentTime = 0;
    const result = audio.play();

    if (result) {
      result.catch(() => undefined);
    }
  } catch {
    return;
  }
}

function playClickFromPool(
  pool: HTMLAudioElement[],
  startedAtMap: WeakMap<HTMLAudioElement, number>,
  lastPlayedAt: number,
  setLastPlayedAt: (value: number) => void,
  cooldownMs: number,
): void {
  if (!getAudioEnabled()) {
    return;
  }

  const now = performance.now();

  if (now - lastPlayedAt < cooldownMs) {
    return;
  }

  setLastPlayedAt(now);
  const freeAudio = pool.find((item) => item.paused || item.ended);
  const audio =
    freeAudio ??
    pool.reduce<HTMLAudioElement | null>((oldest, item) => {
      if (!oldest) {
        return item;
      }

      return (startedAtMap.get(item) ?? 0) < (startedAtMap.get(oldest) ?? 0) ? item : oldest;
    }, null);

  if (!audio) {
    return;
  }

  try {
    audio.pause();
    audio.volume = getEffectiveVolume();
    audio.currentTime = 0;
    startedAtMap.set(audio, now);
    const result = audio.play();

    if (result) {
      result.catch(() => undefined);
    }
  } catch {
    return;
  }
}

export function getAudioEnabled(): boolean {
  try {
    return localStorage.getItem(AUDIO_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAudioEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
  } catch {
    return;
  }
}

export function getAudioVolume(): number {
  try {
    const rawValue = localStorage.getItem(AUDIO_VOLUME_KEY);
    return rawValue === null ? DEFAULT_VOLUME : clampVolume(Number(rawValue));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function setAudioVolume(volume: number): number {
  const nextVolume = clampVolume(volume);
  try {
    localStorage.setItem(AUDIO_VOLUME_KEY, String(nextVolume));
  } catch {
    return nextVolume;
  }
  applyVolumeToPools();
  return nextVolume;
}

export function toggleAudioEnabled(): boolean {
  const nextValue = !getAudioEnabled();
  setAudioEnabled(nextValue);
  return nextValue;
}

export function preloadAudio(): void {
  try {
    getClickPool().forEach((audio) => audio.load());
    getNormalClickPool().forEach((audio) => audio.load());
    getHoverPool().forEach((audio) => audio.load());
  } catch {
    return;
  }
}

export function playClickSound(): void {
  playClickFromPool(getClickPool(), clickStartedAt, lastClickAt, (value) => {
    lastClickAt = value;
  }, CLICK_COOLDOWN_MS);
}

export function playNormalClickSound(): void {
  playClickFromPool(getNormalClickPool(), normalClickStartedAt, lastNormalClickAt, (value) => {
    lastNormalClickAt = value;
  }, NORMAL_CLICK_COOLDOWN_MS);
}

export function playHoverSound(): void {
  const now = performance.now();

  if (now - lastHoverAt < HOVER_COOLDOWN_MS) {
    return;
  }

  lastHoverAt = now;
  playFromPool(getHoverPool());
}
