import type { AchievementDefinition } from '../progression/types';

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'global-level-10',
    title: 'Poziom 10',
    description: 'Osiągnij globalny poziom 10.',
    category: 'progression',
    rarity: 'common',
  },
  {
    id: 'reaction-under-200',
    title: 'Refleks poniżej 200 ms',
    description: 'Uzyskaj czas reakcji poniżej 200 ms.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'typing-perfect-accuracy',
    title: 'Perfekcyjna dokładność pisania',
    description: 'Ukończ Typing Speed ze 100% dokładnością.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'typing-100-wpm',
    title: '100+ WPM',
    description: 'Osiągnij co najmniej 100 WPM w Typing Speed.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'color-memory-95-best',
    title: 'Mistrz podobieństwa kolorów',
    description: 'Uzyskaj 95% lub więcej najlepszego podobieństwa w Color Memory.',
    category: 'high_skill',
    rarity: 'rare',
  },
  {
    id: 'aim-perfect-accuracy',
    title: 'Bez pudła w Aim Test',
    description: 'Ukończ Aim Test ze 100% celnością.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'word-memory-flawless',
    title: 'Bezbłędna pamięć słów',
    description: 'Ukończ Word Memory bez żadnego błędu.',
    category: 'flawless',
    rarity: 'epic',
  },
  {
    id: 'symbol-match-low-move',
    title: 'Symboliczna perfekcja',
    description: 'Ukończ Symbol Match w 10 ruchach lub mniej.',
    category: 'high_skill',
    rarity: 'rare',
  },
];
