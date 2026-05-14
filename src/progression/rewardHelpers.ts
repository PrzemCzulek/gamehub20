import { getCosmetic } from '../data/cosmetics';
import { rewardDefinitions, type RewardDefinition } from '../data/rewards';
import type { LocalProfile } from '../types';
import { getGameProgressEntry } from './gameProgress';

const CLAIMED_REWARDS_KEY = 'game-hub:claimed-rewards';
const EQUIPPED_COSMETICS_KEY = 'game-hub:equipped-cosmetics';
export const rewardStateChangedEvent = 'game-hub:reward-state-changed';

export type EquippedCosmetics = LocalProfile['equippedCosmetics'];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

function emitRewardStateChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(rewardStateChangedEvent));
  } catch {
    return;
  }
}

export function getClaimedRewards(): string[] {
  const value = readJson<unknown>(CLAIMED_REWARDS_KEY, []);
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function getEquippedCosmetics(): EquippedCosmetics {
  const value = readJson<EquippedCosmetics>(EQUIPPED_COSMETICS_KEY, {});

  return {
    title: typeof value.title === 'string' ? value.title : undefined,
    frame: typeof value.frame === 'string' ? value.frame : undefined,
    badge: typeof value.badge === 'string' ? value.badge : undefined,
  };
}

export function canClaimReward(reward: RewardDefinition, claimedRewards = getClaimedRewards()): boolean {
  if (claimedRewards.includes(reward.id)) return false;

  if (reward.requirement.type === 'gameLevel') {
    if (!reward.gameId) return false;
    return getGameProgressEntry(reward.gameId).level >= reward.requirement.value;
  }

  return false;
}

export function getRewardStatus(reward: RewardDefinition): 'ready' | 'claimed' | 'locked' {
  const claimedRewards = getClaimedRewards();
  if (claimedRewards.includes(reward.id)) return 'claimed';
  return canClaimReward(reward, claimedRewards) ? 'ready' : 'locked';
}

export function claimReward(rewardId: string) {
  const reward = rewardDefinitions.find((item) => item.id === rewardId);

  if (!reward) return { ok: false as const, reason: 'not_found' as const };
  if (!canClaimReward(reward)) return { ok: false as const, reason: 'locked' as const };

  const claimedRewards = getClaimedRewards();
  if (claimedRewards.includes(reward.id)) return { ok: false as const, reason: 'already_claimed' as const };

  writeJson(CLAIMED_REWARDS_KEY, [...claimedRewards, reward.id]);
  emitRewardStateChanged();

  return { ok: true as const, reward };
}

export function equipCosmetic(cosmeticId: string) {
  const cosmetic = getCosmetic(cosmeticId);
  if (!cosmetic) return { ok: false as const, reason: 'not_found' as const };

  const claimedReward = rewardDefinitions.find((reward) => reward.reward.id === cosmeticId && getClaimedRewards().includes(reward.id));
  if (!claimedReward) return { ok: false as const, reason: 'not_claimed' as const };

  const equipped = getEquippedCosmetics();
  const nextEquipped = {
    ...equipped,
    [cosmetic.type]: cosmetic.id,
  };

  writeJson(EQUIPPED_COSMETICS_KEY, nextEquipped);
  emitRewardStateChanged();

  return { ok: true as const, cosmetic, equipped: nextEquipped };
}

export function resetRewardData(): void {
  try {
    localStorage.removeItem(CLAIMED_REWARDS_KEY);
    localStorage.removeItem(EQUIPPED_COSMETICS_KEY);
    emitRewardStateChanged();
  } catch {
    return;
  }
}

export const claimedRewardsStorageKey = CLAIMED_REWARDS_KEY;
export const equippedCosmeticsStorageKey = EQUIPPED_COSMETICS_KEY;
