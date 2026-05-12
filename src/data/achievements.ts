import type { AchievementDefinition } from '../progression/types';

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'global-level-10',
    title: 'Signal Ascendant',
    description: 'Reach global level 10.',
    category: 'progression',
    rarity: 'common',
  },
  {
    id: 'reaction-under-200',
    title: 'Neural Snap',
    description: 'Finish a Reaction Time run under 200ms.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'typing-perfect-accuracy',
    title: 'Clean Input',
    description: 'Finish Typing Speed with 100% accuracy.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'typing-100-wpm',
    title: 'Velocity Keys',
    description: 'Reach 100+ WPM in Typing Speed.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'color-memory-95-best',
    title: 'Spectrum Lock',
    description: 'Reach 95%+ best similarity in Color Memory.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'aim-perfect-accuracy',
    title: 'Zero Drift',
    description: 'Finish Aim Test with 100% accuracy.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'word-memory-flawless',
    title: 'Lexicon Ghost',
    description: 'Finish Word Memory without mistakes.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'symbol-match-low-move',
    title: 'Perfect Pairing',
    description: 'Clear Symbol Match in 10 moves or fewer.',
    category: 'high_skill',
    rarity: 'rare',
  },
];
