import type { GameConfig } from '../types';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

function getViewportWidth(): number {
  if (typeof window === 'undefined') {
    return 1200;
  }

  return window.innerWidth || document.documentElement.clientWidth || 1200;
}

function getUserAgent(): string {
  if (typeof navigator === 'undefined') {
    return '';
  }

  return navigator.userAgent.toLowerCase();
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  return navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
}

export function isSmallViewport(): boolean {
  return getViewportWidth() < 768;
}

export function getDeviceType(): DeviceType {
  const width = getViewportWidth();
  const userAgent = getUserAgent();
  const touch = isTouchDevice();
  const mobileAgent = /iphone|ipod|android.*mobile|windows phone/.test(userAgent);
  const tabletAgent = /ipad|tablet|android(?!.*mobile)/.test(userAgent);

  if (width < 768 || mobileAgent) {
    return 'mobile';
  }

  if ((touch && width < 1180) || tabletAgent) {
    return 'tablet';
  }

  return 'desktop';
}

export function canPlayGameOnDevice(game: Pick<GameConfig, 'mobileSupport'>, deviceType: DeviceType): boolean {
  if (game.mobileSupport !== 'desktop-only') {
    return true;
  }

  return deviceType === 'desktop';
}

export function canSubmitScoreForGame(game: Pick<GameConfig, 'mobileSupport'>, deviceType: DeviceType): boolean {
  return canPlayGameOnDevice(game, deviceType);
}
