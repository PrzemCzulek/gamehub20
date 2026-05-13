import { useEffect, useMemo, useState } from 'react';
import { FirstRunNickModal } from './components/FirstRunNickModal';
import { GameCarousel } from './components/GameCarousel';
import { Leaderboard } from './components/Leaderboard';
import { PlayerHub } from './components/PlayerHub';
import { LiveFeed } from './components/feedback/LiveFeed';
import { pushFeedback } from './components/feedback/feedbackQueue';
import { MetaPanel } from './components/meta/MetaPanel';
import { achievementDefinitions } from './data/achievements';
import { games } from './data/games';
import { questDefinitions } from './data/quests';
import { AimTestGame } from './games/AimTestGame';
import { ColorMemoryGame } from './games/ColorMemoryGame';
import { MemoryTestGame } from './games/MemoryTestGame';
import { ReactionTimeGame } from './games/ReactionTimeGame';
import { SymbolMatchGame } from './games/SymbolMatchGame';
import { TypingSpeedGame } from './games/TypingSpeedGame';
import { WordMemoryGame } from './games/WordMemoryGame';
import { createProgressionEvent } from './progression/events';
import { claimGameMilestone } from './progression/gameProgress';
import { claimQuestReward } from './progression/quests';
import { processProgressionEvent } from './progression/progressionEngine';
import { preloadAudio } from './services/audio';
import { submitOnlineScore } from './services/onlineLeaderboard';
import { getLeaderboard, getProfile, hasValidPlayerName, resetLocalData, saveScore, setPlayerName } from './services/storage';
import type { GameId, ScoreInput } from './types';

function renderGame(gameId: GameId, onScore: (score: ScoreInput) => void) {
  switch (gameId) {
    case 'reaction-time':
      return <ReactionTimeGame onScore={onScore} />;
    case 'memory-test':
      return <MemoryTestGame onScore={onScore} />;
    case 'color-memory':
      return <ColorMemoryGame onScore={onScore} />;
    case 'typing-speed':
      return <TypingSpeedGame onScore={onScore} />;
    case 'symbol-match':
      return <SymbolMatchGame onScore={onScore} />;
    case 'aim-test':
      return <AimTestGame onScore={onScore} />;
    case 'word-memory':
      return <WordMemoryGame onScore={onScore} />;
  }
}

function getGameTitle(gameId: GameId): string {
  return games.find((game) => game.id === gameId)?.title ?? gameId;
}

export default function App() {
  const [activeGameId, setActiveGameId] = useState<GameId>('reaction-time');
  const [revision, setRevision] = useState(0);
  const [needsNick, setNeedsNick] = useState(() => !hasValidPlayerName(getProfile().playerName));
  const profile = useMemo(() => getProfile(), [revision]);
  const leaderboard = useMemo(() => getLeaderboard(activeGameId), [activeGameId, revision]);
  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0];

  useEffect(() => {
    const handleFirstInteraction = () => preloadAudio();
    const options = { once: true };

    window.addEventListener('click', handleFirstInteraction, options);
    window.addEventListener('keydown', handleFirstInteraction, options);
    window.addEventListener('pointerdown', handleFirstInteraction, options);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
    };
  }, []);

  function refresh() {
    setRevision((current) => current + 1);
  }

  function handleScore(score: ScoreInput) {
    if (!hasValidPlayerName(profile.playerName)) {
      setNeedsNick(true);
      return;
    }

    const savedScore = saveScore(score);
    const progressionEvent = createProgressionEvent(savedScore);
    const progressionResult = processProgressionEvent(progressionEvent);

    pushFeedback({
      type: 'xp',
      title: 'XP GRY',
      message: `+${progressionEvent.xpGained} XP gry`,
    });

    if (import.meta.env.DEV) {
      console.debug('XP audit score saved', {
        source: 'score_saved',
        gameId: savedScore.gameId,
        gameXpGained: progressionEvent.xpGained,
        mainXpGained: 0,
      });
    }

    if (progressionResult.playerProgression.level > progressionResult.previousLevel && progressionResult.event.xpGained === 0) {
      pushFeedback({
        type: 'level-up',
        title: 'LEVEL UP',
        message: `Poziom ${progressionResult.playerProgression.level} osiągnięty`,
        detail: progressionResult.newAchievementUnlocks.length > 0 ? '+ nowe achievementy' : undefined,
      });
    }

    if (progressionResult.gameLevelUp) {
      pushFeedback({
        type: 'level-up',
        title: 'LEVEL GRY',
        message: `${getGameTitle(savedScore.gameId)} osiągnął poziom ${progressionResult.gameProgress.level}`,
        detail: `+${progressionEvent.xpGained} XP gry`,
      });
    }

    if (progressionResult.personalBestImproved) {
      pushFeedback({
        type: 'personal-best',
        title: 'NOWY REKORD',
        message: `${getGameTitle(savedScore.gameId)}: ${savedScore.scoreLabel}`,
      });
    }

    progressionResult.newlyCompletedQuests.forEach((questProgress) => {
      const quest = questDefinitions.find((item) => item.id === questProgress.questId);

      if (quest) {
        pushFeedback({
          type: 'quest',
          title: 'QUEST GOTOWY',
          message: quest.title,
          detail: 'Odbierz nagrodę w Player Hub',
        });
      }
    });

    progressionResult.newAchievementUnlocks.forEach((unlock) => {
      const achievement = achievementDefinitions.find((item) => item.id === unlock.achievementId);

      if (achievement) {
        pushFeedback({
          type: 'achievement',
          title: 'OSIĄGNIĘCIE ODBLOKOWANE',
          message: achievement.title,
          detail: achievement.rarity.toUpperCase(),
          rarity: achievement.rarity,
        });
      }
    });

    submitOnlineScore(savedScore).catch((error) => {
      console.warn('Online score submit failed', error);
    });
    refresh();
  }

  function handleRename(name: string) {
    const cleanName = setPlayerName(name);
    setNeedsNick(!hasValidPlayerName(cleanName));
    refresh();
  }

  function handleFirstRunName(name: string) {
    setPlayerName(name);
    setNeedsNick(false);
    refresh();
  }

  function handleResetLocalData() {
    resetLocalData();
    setNeedsNick(true);
    refresh();
  }

  function handleMilestoneClaim(gameId: GameId, milestoneId: string) {
    const previousLevel = getProfile().level;
    const result = claimGameMilestone(gameId, milestoneId);

    if (!result.ok) {
      return;
    }

    const nextProfile = getProfile();

    pushFeedback({
      type: 'quest',
      title: 'NAGRODA ODEBRANA',
      message: `${getGameTitle(gameId)}: ${result.milestone.label}`,
      detail: `+${result.mainXpGained} XP konta`,
    });

    if (nextProfile.level > previousLevel) {
      pushFeedback({
        type: 'level-up',
        title: 'LEVEL UP',
        message: `Poziom konta ${nextProfile.level} osiągnięty`,
        detail: `Nagroda: ${result.milestone.label}`,
      });
    }

    refresh();
  }

  function handleQuestClaim(questId: string, periodId: string) {
    const previousLevel = getProfile().level;
    const result = claimQuestReward(questId, periodId);

    if (!result.ok) {
      return;
    }

    const nextProfile = getProfile();

    pushFeedback({
      type: 'quest',
      title: 'QUEST UKOŃCZONY',
      message: result.quest.title,
      detail: `+${result.mainXpGained} XP konta`,
    });

    pushFeedback({
      type: 'xp',
      title: '+XP KONTA',
      message: `+${result.mainXpGained} XP konta`,
    });

    if (nextProfile.level > previousLevel) {
      pushFeedback({
        type: 'level-up',
        title: 'LEVEL UP',
        message: `Poziom konta ${nextProfile.level} osiągnięty`,
        detail: `Quest: ${result.quest.title}`,
      });
    }

    refresh();
  }

  return (
    <main className="min-h-screen px-3 py-4 text-slate-100 sm:px-5 lg:px-8">
      <LiveFeed />
      {needsNick && <FirstRunNickModal onSubmit={handleFirstRunName} />}
      <div className="mx-auto w-full max-w-7xl">
        <header className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 shadow-[0_0_35px_rgba(34,211,238,0.06)] md:grid-cols-[minmax(0,1fr)_minmax(20rem,34rem)] md:items-center">
          <div className="min-w-0 px-1">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">GAME HUB 2.0</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>SKILL ARCADE NETWORK</span>
              <span className="inline-flex items-center gap-1.5 text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                Online
              </span>
            </div>
          </div>
          <MetaPanel onReset={handleResetLocalData} profile={profile} revision={revision} />
        </header>

        <GameCarousel activeGameId={activeGameId} games={games} onSelectGame={setActiveGameId} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="game-panel min-w-0 self-start rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{activeGame.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{activeGame.description}</p>
              </div>
              <span className="text-sm text-teal-200">{activeGame.scoreName}</span>
            </div>
            {renderGame(activeGameId, handleScore)}
          </section>

          <aside className="self-start">
            <Leaderboard entries={leaderboard} gameId={activeGameId} />
          </aside>
        </div>

        <PlayerHub onMilestoneClaim={handleMilestoneClaim} onQuestClaim={handleQuestClaim} onRename={handleRename} profile={profile} revision={revision} />
      </div>
    </main>
  );
}
