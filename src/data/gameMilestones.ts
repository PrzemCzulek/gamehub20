import { games } from './games';
import type { GameMilestone } from '../progression/types';

const milestoneNames: Record<number, string> = {
  5: 'Rozgrzewka ukończona',
  10: 'Stabilny progres',
  25: 'Mistrzowski próg',
};

const milestoneRewards: Record<number, number> = {
  5: 150,
  10: 350,
  25: 1000,
};

export const gameMilestones: GameMilestone[] = games.flatMap((game) =>
  ([5, 10, 25] as const).map((levelRequired) => ({
    id: `${game.id}-level-${levelRequired}`,
    gameId: game.id,
    levelRequired,
    mainXpReward: milestoneRewards[levelRequired],
    label: `${milestoneNames[levelRequired]}: ${game.title}`,
    description: `Osiągnij poziom ${levelRequired} w ${game.title}.`,
    rewardLabel: `+${milestoneRewards[levelRequired]} XP głównego progresu`,
  })),
);
