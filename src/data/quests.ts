import type { QuestDefinition, QuestRarity, QuestType } from '../progression/types';

const rewardByRarity: Record<QuestRarity, number> = {
  common: 100,
  rare: 250,
  epic: 600,
  legendary: 1500,
};

const dailyQuestPool: QuestDefinition[] = [
  {
    id: 'daily-play-3-games',
    type: 'daily',
    title: 'Zagraj 3 rundy',
    description: 'Rozegraj 3 rundy dowolnych gier.',
    category: 'participation',
    rarity: 'common',
    icon: '●',
    rewardXp: rewardByRarity.common,
    target: { kind: 'games_played', amount: 3 },
  },
  {
    id: 'daily-game-xp-250',
    type: 'daily',
    title: 'Zdobądź 250 XP gry',
    description: 'Zdobądź 250 XP w poziomach gier.',
    category: 'xp',
    rarity: 'rare',
    icon: 'XP',
    rewardXp: rewardByRarity.rare,
    target: { kind: 'xp_earned', amount: 250 },
  },
  {
    id: 'daily-improve-pb',
    type: 'daily',
    title: 'Pobij rekord osobisty',
    description: 'Popraw swój najlepszy wynik przynajmniej raz.',
    category: 'personal_best',
    rarity: 'rare',
    icon: 'PB',
    rewardXp: rewardByRarity.rare,
    target: { kind: 'personal_bests', amount: 1 },
  },
  {
    id: 'daily-reaction-under-260',
    type: 'daily',
    title: 'Szybki refleks',
    description: 'Zapisz Reaction Time poniżej 260 ms.',
    category: 'skill',
    rarity: 'rare',
    icon: '⚡',
    rewardXp: rewardByRarity.rare,
    target: { kind: 'reaction_under_ms', amount: 260 },
  },
  {
    id: 'daily-aim-80-accuracy',
    type: 'daily',
    title: 'Celna seria',
    description: 'Osiągnij co najmniej 80% celności w Aim Test.',
    category: 'accuracy',
    rarity: 'rare',
    icon: '◎',
    rewardXp: rewardByRarity.rare,
    target: { kind: 'aim_accuracy_over', amount: 80 },
  },
  {
    id: 'daily-benchmark-run',
    type: 'daily',
    title: 'Tryb benchmarkowy',
    description: 'Ukończ jedną poprawną próbę Reaction Time w benchmark mode.',
    category: 'exploration',
    rarity: 'common',
    icon: 'FS',
    rewardXp: rewardByRarity.common,
    target: { kind: 'benchmark_runs', amount: 1 },
  },
];

const weeklyQuestPool: QuestDefinition[] = [
  {
    id: 'weekly-play-15-games',
    type: 'weekly',
    title: 'Zagraj 15 rund',
    description: 'Rozegraj 15 rund w tym tygodniu.',
    category: 'participation',
    rarity: 'rare',
    icon: '15',
    rewardXp: rewardByRarity.rare,
    target: { kind: 'games_played', amount: 15 },
  },
  {
    id: 'weekly-game-xp-1500',
    type: 'weekly',
    title: 'Zdobądź 1500 XP gry',
    description: 'Zdobądź 1500 XP w poziomach gier w tym tygodniu.',
    category: 'xp',
    rarity: 'epic',
    icon: 'XP',
    rewardXp: rewardByRarity.epic,
    target: { kind: 'xp_earned', amount: 1500 },
  },
  {
    id: 'weekly-5-different-games',
    type: 'weekly',
    title: 'Ukończ 5 różnych gier',
    description: 'Zapisz wynik w 5 różnych grach.',
    category: 'exploration',
    rarity: 'epic',
    icon: '5G',
    rewardXp: rewardByRarity.epic,
    target: { kind: 'different_games_completed', amount: 5 },
  },
  {
    id: 'weekly-symbol-under-14',
    type: 'weekly',
    title: 'Symboliczna precyzja',
    description: 'Ukończ Symbol Match w 14 ruchach lub mniej.',
    category: 'challenge',
    rarity: 'epic',
    icon: '◆',
    rewardXp: rewardByRarity.epic,
    target: { kind: 'symbol_under_moves', amount: 14 },
  },
  {
    id: 'weekly-memory-level-8',
    type: 'weekly',
    title: 'Pamięć sekwencji',
    description: 'Osiągnij poziom 8+ w Memory Test.',
    category: 'challenge',
    rarity: 'epic',
    icon: 'MEM',
    rewardXp: rewardByRarity.epic,
    target: { kind: 'memory_level_at_least', amount: 8 },
  },
  {
    id: 'weekly-legendary-aim-flawless',
    type: 'weekly',
    title: 'Bez pudła',
    description: 'Ukończ Aim Test bez żadnej pomyłki.',
    category: 'flawless',
    rarity: 'legendary',
    icon: '◎',
    rewardXp: rewardByRarity.legendary,
    target: { kind: 'aim_flawless', amount: 1 },
  },
];

function getPeriodSeed(type: QuestType, date = new Date()): number {
  const year = date.getFullYear();
  const day = Math.floor((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000);

  if (type === 'daily') {
    return year * 1000 + day;
  }

  return year * 100 + Math.floor(day / 7);
}

function seededSortValue(seed: number, id: string): number {
  let hash = seed;
  for (const char of id) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
}

function pickQuests(pool: QuestDefinition[], type: QuestType, count: number): QuestDefinition[] {
  const seed = getPeriodSeed(type);
  const sorted = [...pool].sort((a, b) => seededSortValue(seed, a.id) - seededSortValue(seed, b.id));
  const selected: QuestDefinition[] = [];
  const usedCategories = new Set<string>();

  for (const quest of sorted) {
    if (!usedCategories.has(quest.category) || selected.length >= count - 1) {
      selected.push(quest);
      usedCategories.add(quest.category);
    }

    if (selected.length >= count) {
      break;
    }
  }

  return selected;
}

export function getActiveQuestDefinitions(): QuestDefinition[] {
  return [...pickQuests(dailyQuestPool, 'daily', 3), ...pickQuests(weeklyQuestPool, 'weekly', 3)];
}

export const questDefinitions: QuestDefinition[] = getActiveQuestDefinitions();
export const questPools = {
  daily: dailyQuestPool,
  weekly: weeklyQuestPool,
};
