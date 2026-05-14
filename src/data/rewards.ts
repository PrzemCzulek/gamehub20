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
    reward: { type: 'frame', id: 'cyan_precision' },
  },
  {
    id: 'aim-lv10-precision-i',
    label: 'Precision I',
    gameId: 'aim-test',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'title', id: 'precision_i' },
  },
  {
    id: 'reaction-lv5-reflex-bronze',
    label: 'Reflex Bronze',
    gameId: 'reaction-time',
    requirement: { type: 'gameLevel', value: 5 },
    reward: { type: 'badge', id: 'reflex_bronze' },
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
    id: 'cps-lv10-cps-freak',
    label: 'CPS Freak',
    gameId: 'cps-test',
    requirement: { type: 'gameLevel', value: 10 },
    reward: { type: 'badge', id: 'cps_freak' },
  },
];
