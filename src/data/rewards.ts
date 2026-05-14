import type { GameId } from '../types';
import type { CosmeticType } from './cosmetics';

export type RewardRequirementType = 'gameLevel' | 'streak' | 'perfectRun';

export type RewardDefinition = {
  id: string;
  label: string;
  gameId?: GameId;
  requirement: {
    type: RewardRequirementType;
    value: number;
  };
  reward: {
    type: CosmeticType;
    id: string;
  };
};

export const rewardDefinitions: RewardDefinition[] = [
  {
    id: 'aim-lv5-cyan-precision',
    label: 'Cyan Precision',
    gameId: 'aim-test',
    requirement: { type: 'gameLevel', value: 5 },
    reward: { type: 'frame', id: 'cyan_precision_frame' },
  },
  {
    id: 'aim-lv8-aim-focus',
    label: 'Aim Focus',
    gameId: 'aim-test',
    requirement: { type: 'gameLevel', value: 8 },
    reward: { type: 'badge', id: 'aim_focus_badge' },
  },
  {
    id: 'aim-lv10-precision-i',
    label: 'Precision I',
    gameId: 'aim-test',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'title', id: 'precision_i' },
  },
  {
    id: 'reaction-lv3-reflex-rookie',
    label: 'Reflex Rookie',
    gameId: 'reaction-time',
    requirement: { type: 'gameLevel', value: 3 },
    reward: { type: 'title', id: 'reflex_rookie' },
  },
  {
    id: 'reaction-lv5-reflex-bronze',
    label: 'Reflex Bronze',
    gameId: 'reaction-time',
    requirement: { type: 'gameLevel', value: 5 },
    reward: { type: 'badge', id: 'reflex_bronze' },
  },
  {
    id: 'reaction-lv10-reflex-neon',
    label: 'Reflex Neon',
    gameId: 'reaction-time',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'frame', id: 'reflex_neon_frame' },
  },
  {
    id: 'reaction-lv15-the-fastest',
    label: 'The Fastest',
    gameId: 'reaction-time',
    requirement: { type: 'gameLevel', value: 15 },
    reward: { type: 'title', id: 'the_fastest' },
  },
  {
    id: 'memory-lv10-memory-keeper',
    label: 'Memory Keeper',
    gameId: 'memory-test',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'title', id: 'memory_keeper' },
  },
  {
    id: 'memory-lv5-purple-focus',
    label: 'Purple Focus',
    gameId: 'memory-test',
    requirement: { type: 'gameLevel', value: 5 },
    reward: { type: 'frame', id: 'purple_focus_frame' },
  },
  {
    id: 'cps-lv10-cps-freak',
    label: 'CPS Freak',
    gameId: 'cps-test',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'badge', id: 'cps_freak_badge' },
  },
  {
    id: 'cps-lv15-cps-freak-title',
    label: 'CPS Freak',
    gameId: 'cps-test',
    requirement: { type: 'gameLevel', value: 15 },
    reward: { type: 'title', id: 'cps_freak' },
  },
];
