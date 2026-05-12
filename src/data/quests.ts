import type { QuestDefinition } from '../progression/types';

export const questDefinitions: QuestDefinition[] = [
  {
    id: 'daily-play-3-games',
    type: 'daily',
    title: 'Daily Circuit',
    description: 'Play 3 game rounds.',
    category: 'participation',
    target: { kind: 'games_played', amount: 3 },
  },
  {
    id: 'daily-earn-250-xp',
    type: 'daily',
    title: 'XP Spark',
    description: 'Earn 250 XP.',
    category: 'xp',
    target: { kind: 'xp_earned', amount: 250 },
  },
  {
    id: 'daily-improve-pb',
    type: 'daily',
    title: 'Personal Breakthrough',
    description: 'Improve a personal best once.',
    category: 'personal_best',
    target: { kind: 'personal_bests', amount: 1 },
  },
  {
    id: 'weekly-play-15-games',
    type: 'weekly',
    title: 'Arcade Routine',
    description: 'Play 15 game rounds.',
    category: 'participation',
    target: { kind: 'games_played', amount: 15 },
  },
  {
    id: 'weekly-earn-1500-xp',
    type: 'weekly',
    title: 'Power Cycle',
    description: 'Earn 1500 XP.',
    category: 'xp',
    target: { kind: 'xp_earned', amount: 1500 },
  },
  {
    id: 'weekly-5-different-games',
    type: 'weekly',
    title: 'Skill Rotation',
    description: 'Complete 5 different games.',
    category: 'participation',
    target: { kind: 'different_games_completed', amount: 5 },
  },
];
