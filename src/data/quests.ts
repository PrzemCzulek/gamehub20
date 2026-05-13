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
    icon: 'RUN',
    skillDifficulty: 1,
    seasonalTags: ['core', 'casual'],
    rewardXp: rewardByRarity.common,
    target: { kind: 'games_played', amount: 3 },
  },
  {
    id: 'daily-complete-3-different-games',
    type: 'daily',
    title: 'Trzy różne areny',
    description: 'Zapisz wynik w 3 różnych grach.',
    category: 'exploration',
    rarity: 'rare',
    icon: '3G',
    skillDifficulty: 2,
    seasonalTags: ['variety'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'different_games_completed', amount: 3 },
  },
  {
    id: 'daily-game-xp-250',
    type: 'daily',
    title: 'Zdobądź 250 XP gry',
    description: 'Zdobądź 250 XP w poziomach gier.',
    category: 'xp',
    rarity: 'rare',
    icon: 'XP',
    skillDifficulty: 2,
    seasonalTags: ['progression'],
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
    skillDifficulty: 3,
    seasonalTags: ['mastery'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'personal_bests', amount: 1 },
  },
  {
    id: 'daily-reaction-under-260',
    type: 'daily',
    title: 'Zejdź poniżej 260 ms',
    description: 'Zapisz Reaction Time poniżej 260 ms.',
    category: 'skill',
    rarity: 'rare',
    icon: 'RT',
    skillDifficulty: 2,
    seasonalTags: ['reaction'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'reaction_under_ms', amount: 260 },
  },
  {
    id: 'daily-reaction-benchmark',
    type: 'daily',
    title: 'Ukończ benchmark mode',
    description: 'Ukończ poprawną próbę Reaction Time w trybie benchmarkowym.',
    category: 'exploration',
    rarity: 'common',
    icon: 'BM',
    skillDifficulty: 1,
    seasonalTags: ['reaction', 'benchmark'],
    rewardXp: rewardByRarity.common,
    target: { kind: 'benchmark_runs', amount: 1 },
  },
  {
    id: 'daily-reaction-no-false-start',
    type: 'daily',
    title: 'Bez falstartu',
    description: 'Zapisz poprawny wynik Reaction Time bez falstartu.',
    category: 'consistency',
    rarity: 'common',
    icon: 'OK',
    skillDifficulty: 1,
    seasonalTags: ['reaction'],
    rewardXp: rewardByRarity.common,
    target: { kind: 'reaction_valid_runs', amount: 1 },
  },
  {
    id: 'daily-aim-90-accuracy',
    type: 'daily',
    title: 'Celność 90%+',
    description: 'Osiągnij co najmniej 90% celności w Aim Test.',
    category: 'accuracy',
    rarity: 'rare',
    icon: 'AIM',
    skillDifficulty: 3,
    seasonalTags: ['aim'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'aim_accuracy_over', amount: 90 },
  },
  {
    id: 'daily-aim-one-miss',
    type: 'daily',
    title: 'Prawie bez pudła',
    description: 'Ukończ Aim Test z maksymalnie jedną pomyłką.',
    category: 'challenge',
    rarity: 'rare',
    icon: '1M',
    skillDifficulty: 3,
    seasonalTags: ['aim'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'aim_misses_under', amount: 1 },
  },
  {
    id: 'daily-memory-level-5',
    type: 'daily',
    title: 'Sekwencja poziom 5',
    description: 'Osiągnij poziom 5+ w Memory Test.',
    category: 'skill',
    rarity: 'rare',
    icon: 'MEM',
    skillDifficulty: 2,
    seasonalTags: ['memory'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'memory_level_at_least', amount: 5 },
  },
  {
    id: 'daily-color-90',
    type: 'daily',
    title: 'Podobieństwo 90%+',
    description: 'Osiągnij co najmniej 90% podobieństwa w Color Memory.',
    category: 'accuracy',
    rarity: 'rare',
    icon: 'CLR',
    skillDifficulty: 3,
    seasonalTags: ['color'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'color_similarity_over', amount: 90 },
  },
  {
    id: 'daily-symbol-under-20',
    type: 'daily',
    title: 'Symbol Match poniżej 20 ruchów',
    description: 'Ukończ Symbol Match w 20 ruchach lub mniej.',
    category: 'challenge',
    rarity: 'rare',
    icon: 'SYM',
    skillDifficulty: 2,
    seasonalTags: ['symbol'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'symbol_under_moves', amount: 20 },
  },
  {
    id: 'daily-word-combo-5',
    type: 'daily',
    title: 'Combo 5 słów',
    description: 'Osiągnij combo 5 w Word Memory.',
    category: 'combo',
    rarity: 'common',
    icon: 'W5',
    skillDifficulty: 2,
    seasonalTags: ['word'],
    rewardXp: rewardByRarity.common,
    target: { kind: 'word_combo_over', amount: 5 },
  },
  {
    id: 'daily-typing-60-wpm',
    type: 'daily',
    title: '60+ WPM',
    description: 'Zapisz wynik Typing Speed na poziomie 60 WPM lub więcej.',
    category: 'skill',
    rarity: 'rare',
    icon: '60',
    skillDifficulty: 2,
    seasonalTags: ['typing'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'typing_wpm_over', amount: 60 },
  },
  {
    id: 'daily-typing-95-accuracy',
    type: 'daily',
    title: 'Dokładność 95%+',
    description: 'Osiągnij co najmniej 95% dokładności w Typing Speed.',
    category: 'accuracy',
    rarity: 'rare',
    icon: '95',
    skillDifficulty: 3,
    seasonalTags: ['typing'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'typing_accuracy_over', amount: 95 },
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
    skillDifficulty: 2,
    seasonalTags: ['core', 'weekly'],
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
    skillDifficulty: 3,
    seasonalTags: ['progression', 'weekly'],
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
    skillDifficulty: 3,
    seasonalTags: ['variety', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'different_games_completed', amount: 5 },
  },
  {
    id: 'weekly-reaction-under-220',
    type: 'weekly',
    title: 'Zejdź poniżej 220 ms',
    description: 'Zapisz Reaction Time poniżej 220 ms.',
    category: 'skill',
    rarity: 'epic',
    icon: '220',
    skillDifficulty: 4,
    seasonalTags: ['reaction', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'reaction_under_ms', amount: 220 },
  },
  {
    id: 'weekly-reaction-3-valid',
    type: 'weekly',
    title: '3 poprawne reakcje z rzędu',
    description: 'Zapisz 3 poprawne próby Reaction Time w tym tygodniu.',
    category: 'consistency',
    rarity: 'rare',
    icon: '3RT',
    skillDifficulty: 2,
    seasonalTags: ['reaction', 'streak'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'reaction_valid_runs', amount: 3 },
  },
  {
    id: 'weekly-aim-95-accuracy',
    type: 'weekly',
    title: 'Celność 95%+',
    description: 'Osiągnij co najmniej 95% celności w Aim Test.',
    category: 'accuracy',
    rarity: 'epic',
    icon: '95',
    skillDifficulty: 4,
    seasonalTags: ['aim', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'aim_accuracy_over', amount: 95 },
  },
  {
    id: 'weekly-aim-flawless',
    type: 'weekly',
    title: '10 trafień bez pomyłki',
    description: 'Ukończ Aim Test bez żadnej pomyłki.',
    category: 'flawless',
    rarity: 'legendary',
    icon: '0M',
    skillDifficulty: 5,
    seasonalTags: ['aim', 'flawless'],
    rewardXp: rewardByRarity.legendary,
    target: { kind: 'aim_flawless', amount: 1 },
  },
  {
    id: 'weekly-aim-score-900',
    type: 'weekly',
    title: 'Aim score 900+',
    description: 'Zdobądź co najmniej 900 punktów w Aim Test.',
    category: 'challenge',
    rarity: 'epic',
    icon: '900',
    skillDifficulty: 4,
    seasonalTags: ['aim', 'score'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'aim_score_over', amount: 900 },
  },
  {
    id: 'weekly-memory-level-8',
    type: 'weekly',
    title: 'Pamięć sekwencji',
    description: 'Osiągnij poziom 8+ w Memory Test.',
    category: 'challenge',
    rarity: 'epic',
    icon: 'MEM',
    skillDifficulty: 3,
    seasonalTags: ['memory', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'memory_level_at_least', amount: 8 },
  },
  {
    id: 'weekly-memory-level-10',
    type: 'weekly',
    title: 'Memory poziom 10',
    description: 'Osiągnij poziom 10+ w Memory Test.',
    category: 'challenge',
    rarity: 'legendary',
    icon: 'M10',
    skillDifficulty: 5,
    seasonalTags: ['memory', 'legendary'],
    rewardXp: rewardByRarity.legendary,
    target: { kind: 'memory_level_at_least', amount: 10 },
  },
  {
    id: 'weekly-color-95',
    type: 'weekly',
    title: 'Podobieństwo 95%+',
    description: 'Osiągnij co najmniej 95% najlepszego podobieństwa w Color Memory.',
    category: 'accuracy',
    rarity: 'epic',
    icon: '95',
    skillDifficulty: 4,
    seasonalTags: ['color', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'color_similarity_over', amount: 95 },
  },
  {
    id: 'weekly-color-round-5',
    type: 'weekly',
    title: 'Runda koloru 5+',
    description: 'Ukończ co najmniej rundę 5 w Color Memory.',
    category: 'challenge',
    rarity: 'epic',
    icon: 'C5',
    skillDifficulty: 3,
    seasonalTags: ['color'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'color_completed_round', amount: 5 },
  },
  {
    id: 'weekly-symbol-under-16',
    type: 'weekly',
    title: 'Symbol Match poniżej 16 ruchów',
    description: 'Ukończ Symbol Match w 16 ruchach lub mniej.',
    category: 'challenge',
    rarity: 'epic',
    icon: 'S16',
    skillDifficulty: 4,
    seasonalTags: ['symbol', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'symbol_under_moves', amount: 16 },
  },
  {
    id: 'weekly-symbol-low-mistakes',
    type: 'weekly',
    title: 'Maksymalnie 3 pomyłki',
    description: 'Ukończ Symbol Match z maksymalnie 3 pomyłkami.',
    category: 'consistency',
    rarity: 'rare',
    icon: '3M',
    skillDifficulty: 3,
    seasonalTags: ['symbol'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'symbol_mistakes_under', amount: 3 },
  },
  {
    id: 'weekly-word-combo-10',
    type: 'weekly',
    title: 'Combo 10 słów',
    description: 'Osiągnij combo 10 w Word Memory.',
    category: 'combo',
    rarity: 'epic',
    icon: 'W10',
    skillDifficulty: 4,
    seasonalTags: ['word', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'word_combo_over', amount: 10 },
  },
  {
    id: 'weekly-word-score-1000',
    type: 'weekly',
    title: 'Word Memory 1000+',
    description: 'Zdobądź co najmniej 1000 punktów w Word Memory.',
    category: 'challenge',
    rarity: 'epic',
    icon: '1000',
    skillDifficulty: 4,
    seasonalTags: ['word', 'score'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'word_score_over', amount: 1000 },
  },
  {
    id: 'weekly-typing-80-wpm',
    type: 'weekly',
    title: '80+ WPM',
    description: 'Zapisz wynik Typing Speed na poziomie 80 WPM lub więcej.',
    category: 'skill',
    rarity: 'epic',
    icon: '80',
    skillDifficulty: 4,
    seasonalTags: ['typing', 'weekly'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'typing_wpm_over', amount: 80 },
  },
  {
    id: 'weekly-typing-98-accuracy',
    type: 'weekly',
    title: 'Dokładność 98%+',
    description: 'Osiągnij co najmniej 98% dokładności w Typing Speed.',
    category: 'accuracy',
    rarity: 'epic',
    icon: '98',
    skillDifficulty: 5,
    seasonalTags: ['typing', 'accuracy'],
    rewardXp: rewardByRarity.epic,
    target: { kind: 'typing_accuracy_over', amount: 98 },
  },
  {
    id: 'weekly-typing-60s',
    type: 'weekly',
    title: 'Ukończ test 1 min',
    description: 'Zapisz wynik z 60-sekundowego Typing Speed.',
    category: 'consistency',
    rarity: 'rare',
    icon: '60S',
    skillDifficulty: 2,
    seasonalTags: ['typing', 'duration'],
    rewardXp: rewardByRarity.rare,
    target: { kind: 'typing_duration_seconds', amount: 60 },
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

function rarityRank(rarity: QuestRarity): number {
  return { common: 1, rare: 2, epic: 3, legendary: 4 }[rarity];
}

function pickQuests(pool: QuestDefinition[], type: QuestType, count: number): QuestDefinition[] {
  const seed = getPeriodSeed(type);
  const sorted = [...pool].sort((a, b) => {
    const weeklyBias = type === 'weekly' ? rarityRank(b.rarity) - rarityRank(a.rarity) : 0;
    return weeklyBias || seededSortValue(seed, a.id) - seededSortValue(seed, b.id);
  });
  const selected: QuestDefinition[] = [];
  const usedCategories = new Set<string>();
  const usedKinds = new Set<string>();

  const preferredOrder = type === 'weekly' ? ['skill', 'challenge', 'accuracy', 'flawless', 'consistency'] : ['participation', 'skill', 'challenge'];

  for (const category of preferredOrder) {
    const quest = sorted.find((item) => item.category === category && !usedKinds.has(item.target.kind));
    if (quest && selected.length < count) {
      selected.push(quest);
      usedCategories.add(quest.category);
      usedKinds.add(quest.target.kind);
    }
  }

  for (const quest of sorted) {
    if (selected.includes(quest)) {
      continue;
    }

    const categoryAlreadyUsed = usedCategories.has(quest.category);
    const kindAlreadyUsed = usedKinds.has(quest.target.kind);

    if ((!categoryAlreadyUsed && !kindAlreadyUsed) || selected.length >= count - 1) {
      selected.push(quest);
      usedCategories.add(quest.category);
      usedKinds.add(quest.target.kind);
    }

    if (selected.length >= count) {
      break;
    }
  }

  return selected.slice(0, count);
}

export function getActiveQuestDefinitions(): QuestDefinition[] {
  return [...pickQuests(dailyQuestPool, 'daily', 4), ...pickQuests(weeklyQuestPool, 'weekly', 4)];
}

export const questDefinitions: QuestDefinition[] = getActiveQuestDefinitions();
export const questPools = {
  daily: dailyQuestPool,
  weekly: weeklyQuestPool,
};
