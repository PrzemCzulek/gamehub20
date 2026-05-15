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
import { rewardDefinitions } from './data/rewards';
import { AimTestGame } from './games/AimTestGame';
import { ColorMemoryGame } from './games/ColorMemoryGame';
import { CpsTestGame } from './games/CpsTestGame';
import { FlappyBallGame } from './games/FlappyBallGame';
import { MemoryTestGame } from './games/MemoryTestGame';
import { ReactionTimeGame } from './games/ReactionTimeGame';
import { SymbolMatchGame } from './games/SymbolMatchGame';
import { StroopTestGame } from './games/StroopTestGame';
import { TimeSenseGame } from './games/TimeSenseGame';
import { TypingSpeedGame } from './games/TypingSpeedGame';
import { WordMemoryGame } from './games/WordMemoryGame';
import { createProgressionEvent } from './progression/events';
import { claimGameMilestone } from './progression/gameProgress';
import { claimQuestReward } from './progression/quests';
import { getQuestProgress, processProgressionEvent, syncRetroactiveAchievements } from './progression/progressionEngine';
import { getRewardStatus, rewardStateChangedEvent } from './progression/rewardHelpers';
import { preloadAudio } from './services/audio';
import { submitOnlineScore } from './services/onlineLeaderboard';
import { getLeaderboard, getProfile, hasValidPlayerName, resetLocalData, saveScore, setPlayerName } from './services/storage';
import type { GameId, GameTag, LocalProfile, ScoreInput } from './types';
import { preloadFeedbackSounds } from './utils/audioFeedback';
import { canPlayGameOnDevice, canSubmitScoreForGame, getDeviceType, type DeviceType } from './utils/device';

type AppView = 'home' | 'game' | 'profile';
type CategoryFilterId = GameTag | 'hardcore';
type CategoryFilter = { id: CategoryFilterId; label: string; tags: GameTag[] };

const categoryFilters: CategoryFilter[] = [
  { id: 'reflex', label: 'Reflex', tags: ['reflex'] },
  { id: 'memory', label: 'Memory', tags: ['memory'] },
  { id: 'precision', label: 'Precision', tags: ['precision'] },
  { id: 'typing', label: 'Typing', tags: ['typing'] },
  { id: 'timing', label: 'Timing', tags: ['timing'] },
  { id: 'brain', label: 'Brain', tags: ['brain'] },
  { id: 'arcade', label: 'Arcade', tags: ['arcade'] },
  { id: 'mobile', label: 'Mobile', tags: ['mobile'] },
  { id: 'casual', label: 'Casual', tags: ['casual'] },
  { id: 'hardcore', label: 'Hardcore', tags: ['challenge', 'desktop'] },
];

const seenRewardReadyKey = 'game-hub:seen-reward-ready';

function readSeenRewardReady(): string[] {
  try {
    const raw = localStorage.getItem(seenRewardReadyKey);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeSeenRewardReady(ids: string[]): void {
  try {
    localStorage.setItem(seenRewardReadyKey, JSON.stringify(ids));
  } catch {
    return;
  }
}

function getReadyRewardIds(): string[] {
  return rewardDefinitions.filter((reward) => getRewardStatus(reward) === 'ready').map((reward) => reward.id);
}

function getReadyRewardsCount(): number {
  return getReadyRewardIds().length;
}

function notifyNewReadyRewards(): void {
  const readyIds = getReadyRewardIds();
  const seenIds = readSeenRewardReady();
  const seen = new Set(seenIds);
  const newIds = readyIds.filter((id) => !seen.has(id));

  if (newIds.length === 0) {
    return;
  }

  writeSeenRewardReady([...new Set([...seenIds, ...newIds])]);
  pushFeedback({
    type: 'reward',
    title: 'NOWA NAGRODA',
    message: 'Odbierz w profilu',
    detail: newIds.length > 1 ? `${newIds.length} READY` : undefined,
    priority: 'high',
  });
}

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
    case 'time-sense':
      return <TimeSenseGame onScore={onScore} />;
    case 'stroop-test':
      return <StroopTestGame onScore={onScore} />;
    case 'cps-test':
      return <CpsTestGame onScore={onScore} />;
    case 'flappy-ball':
      return <FlappyBallGame onScore={onScore} />;
  }
}

function getGameTitle(gameId: GameId): string {
  return games.find((game) => game.id === gameId)?.title ?? gameId;
}

function getCategoryGameCount(category: CategoryFilter): number {
  return games.filter((game) => game.tags?.some((tag) => category.tags.includes(tag))).length;
}

function getSortedCategoryFilters(): Array<CategoryFilter & { count: number }> {
  return categoryFilters
    .map((category) => ({ ...category, count: getCategoryGameCount(category) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function DeviceBlockCard({ onChooseOther }: { onChooseOther: () => void }) {
  return (
    <div className="rounded-xl border border-fuchsia-300/20 bg-slate-950/70 p-5 text-center shadow-[0_0_34px_rgba(168,85,247,0.12)]">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-fuchsia-100">Desktop wymagany</p>
      <h3 className="mt-3 text-2xl font-bold text-white">Ta gra jest zablokowana na mobile/tablet</h3>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Ta gra wymaga klawiatury lub precyzyjnego sterowania. Wyniki z mobile/tablet są zablokowane dla uczciwego rankingu.
      </p>
      <button
        className="mt-5 rounded-md bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
        onClick={onChooseOther}
        type="button"
      >
        Wybierz inną grę
      </button>
    </div>
  );
}

function LimitedDeviceWarning({ note }: { note?: string }) {
  return (
    <div className="mb-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.08] px-4 py-3 text-sm text-amber-50">
      <strong className="block text-xs uppercase tracking-[0.18em] text-amber-100">Tryb mobile ograniczony</strong>
      <span className="mt-1 block text-amber-50/85">{note ?? 'Ta gra działa na mobile, ale wynik może zależeć od urządzenia.'}</span>
    </div>
  );
}

function TopBar({
  activeGameTitle,
  activeView,
  onReset,
  onViewChange,
  profile,
  readyRewardsCount,
  revision,
}: {
  activeGameTitle: string;
  activeView: AppView;
  onReset: () => void;
  onViewChange: (view: AppView) => void;
  profile: LocalProfile;
  readyRewardsCount: number;
  revision: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/10 bg-slate-950/86 shadow-[0_10px_34px_rgba(2,6,23,0.26)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-2 px-3 py-1.5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <button className="text-left" onClick={() => onViewChange('home')} type="button">
            <span className="block text-sm font-black uppercase tracking-[0.28em] text-teal-200">GAME HUB 2.0</span>
            <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.2em] text-slate-500">Skill Arcade Network</span>
          </button>
          <nav className="flex flex-wrap gap-1.5 rounded-full border border-white/10 bg-white/[0.025] p-1">
            {(['home', 'profile'] as const).map((view) => (
              <button
                className={`relative rounded-full border px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide transition duration-200 ${
                  activeView === view
                    ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)] after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:bg-cyan-300 after:shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                    : 'border-transparent text-slate-400 hover:border-cyan-300/20 hover:bg-cyan-300/5 hover:text-white'
                }`}
                key={view}
                onClick={() => onViewChange(view)}
                type="button"
              >
                {view === 'home' ? 'Home' : 'Profil'}
                {view === 'profile' && readyRewardsCount > 0 && (
                  <span className="ml-2 rounded-full bg-cyan-300 px-1.5 py-0.5 text-[0.55rem] text-slate-950 shadow-[0_0_10px_rgba(34,211,238,0.35)]">
                    {readyRewardsCount}
                  </span>
                )}
              </button>
            ))}
            {activeView === 'game' && (
              <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.12)]">
                {activeGameTitle}
              </span>
            )}
          </nav>
        </div>
        <MetaPanel onReset={onReset} profile={profile} revision={revision} />
      </div>
    </header>
  );
}

function CategoryFoundation({ categories, selectedCategory, onSelect }: { categories: Array<CategoryFilter & { count: number }>; selectedCategory: CategoryFilterId | null; onSelect: (category: CategoryFilterId | null) => void }) {
  return (
    <section className="rounded-xl border border-white/10 bg-slate-950/45 p-3.5 shadow-[0_0_28px_rgba(34,211,238,0.04)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Kategorie</p>
          <h2 className="mt-0.5 text-lg font-bold text-white">Arcade lanes</h2>
        </div>
        <p className="text-sm text-slate-400">Filtruj deck.</p>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <button
          className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition duration-200 ${
            selectedCategory === null
              ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.24)] after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:bg-white/80'
              : 'border-white/10 bg-black/15 text-slate-300 hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-white'
          }`}
          onClick={() => onSelect(null)}
          type="button"
        >
          Wszystkie <span className="opacity-60">{games.length}</span>
        </button>
        {categories.map((category) => (
            <button
              className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition duration-200 ${
                selectedCategory === category.id
                  ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.24)] after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:bg-white/80'
                  : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white'
              }`}
              key={category.id}
              onClick={() => onSelect(selectedCategory === category.id ? null : category.id)}
              type="button"
            >
              {category.label} <span className="opacity-60">{category.count}</span>
            </button>
        ))}
      </div>
      {selectedCategory && (
        <p className="mt-3 text-xs text-cyan-100">
          Aktywna grupa: {categories.find((category) => category.id === selectedCategory)?.label}
        </p>
      )}
    </section>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [activeGameId, setActiveGameId] = useState<GameId>('reaction-time');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilterId | null>(null);
  const [revision, setRevision] = useState(0);
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType());
  const [needsNick, setNeedsNick] = useState(() => !hasValidPlayerName(getProfile().playerName));
  const profile = useMemo(() => getProfile(), [revision]);
  const leaderboard = useMemo(() => getLeaderboard(activeGameId), [activeGameId, revision]);
  const questProgress = useMemo(() => getQuestProgress(), [revision]);
  const readyRewardsCount = useMemo(() => getReadyRewardsCount(), [revision]);
  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0];
  const activeGamePlayable = canPlayGameOnDevice(activeGame, deviceType);
  const firstPlayableGame = games.find((game) => canPlayGameOnDevice(game, deviceType));
  const dailyQuest = questDefinitions.find((quest) => quest.type === 'daily');
  const dailyProgress = dailyQuest ? questProgress.find((item) => item.questId === dailyQuest.id) : undefined;
  const categoryOptions = useMemo(() => getSortedCategoryFilters(), []);
  const selectedCategoryConfig = selectedCategory ? categoryOptions.find((category) => category.id === selectedCategory) : undefined;
  const filteredGames = useMemo(
    () => selectedCategoryConfig ? games.filter((game) => game.tags?.some((tag) => selectedCategoryConfig.tags.includes(tag))) : games,
    [selectedCategoryConfig],
  );
  const recommendedGame = filteredGames.find((game) => game.id === activeGameId) ?? filteredGames[0] ?? activeGame;
  const latestScore = profile.recentScores[0];
  const dailyQuestTarget = dailyQuest?.target.amount ?? 1;
  const dailyQuestProgress = dailyProgress?.progress ?? 0;
  const dailyQuestPercent = dailyQuest ? Math.min(100, Math.round((dailyQuestProgress / Math.max(dailyQuestTarget, 1)) * 100)) : 0;

  useEffect(() => {
    if (filteredGames.length > 0 && !filteredGames.some((game) => game.id === activeGameId)) {
      setActiveGameId(filteredGames[0].id);
    }
  }, [activeGameId, filteredGames]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      preloadAudio();
      preloadFeedbackSounds();
    };
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

  useEffect(() => {
    function handleDeviceChange() {
      setDeviceType(getDeviceType());
    }

    window.addEventListener('resize', handleDeviceChange);
    window.addEventListener('orientationchange', handleDeviceChange);

    return () => {
      window.removeEventListener('resize', handleDeviceChange);
      window.removeEventListener('orientationchange', handleDeviceChange);
    };
  }, []);

  useEffect(() => {
    function handleRewardStateChanged() {
      setRevision((current) => current + 1);
    }

    window.addEventListener(rewardStateChangedEvent, handleRewardStateChanged);
    return () => window.removeEventListener(rewardStateChangedEvent, handleRewardStateChanged);
  }, []);

  function refresh() {
    setRevision((current) => current + 1);
  }

  function handleOpenGame(gameId: GameId) {
    setActiveGameId(gameId);
    setActiveView('game');
  }

  function handleScore(score: ScoreInput) {
    if (!hasValidPlayerName(profile.playerName)) {
      setNeedsNick(true);
      return;
    }

    const scoreGame = games.find((game) => game.id === score.gameId);
    const canSubmit = scoreGame ? canSubmitScoreForGame(scoreGame, deviceType) : false;

    if (import.meta.env.DEV) {
      console.debug('Score submit audit: before saveScore', {
        gameId: score.gameId,
        score: score.score,
        scoreDirection: scoreGame?.scoreDirection,
        stats: score.stats,
        meta: score.meta,
        deviceType,
        canSubmit,
      });
    }

    if (scoreGame && !canSubmit) {
      pushFeedback({
        type: 'quest',
        title: 'Wynik niezapisany',
        message: 'Ta gra zapisuje wyniki tylko na desktopie.',
      });
      return;
    }

    const savedScore = saveScore(score);
    const progressionEvent = createProgressionEvent(savedScore);
    const progressionResult = processProgressionEvent(progressionEvent);
    const retroAchievementUnlocks = syncRetroactiveAchievements(getProfile());

    if (retroAchievementUnlocks.length > 0) {
      pushFeedback({
        type: 'achievement',
        title: retroAchievementUnlocks.length === 1 ? 'ACHIEVEMENT' : 'ACHIEVEMENTS',
        message: retroAchievementUnlocks.length === 1 ? 'Zaległe trofeum' : `${retroAchievementUnlocks.length} zaległych`,
        detail: 'Retro sync',
        priority: 'high',
      });
    }

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
        priority: 'medium',
      });
    }

    if (progressionResult.personalBestImproved) {
      pushFeedback({
        type: 'personal-best',
        title: 'NOWY REKORD',
        message: `${getGameTitle(savedScore.gameId)}: ${savedScore.scoreLabel}`,
      });
    }

    progressionResult.newlyCompletedQuests.forEach((questProgressItem) => {
      const quest = questDefinitions.find((item) => item.id === questProgressItem.questId);

      if (quest) {
        pushFeedback({
          type: 'quest',
          title: 'QUEST READY',
          message: 'Odbierz nagrodę',
          detail: quest.title,
          priority: 'medium',
        });
      }
    });

    progressionResult.newAchievementUnlocks.forEach((unlock) => {
      const achievement = achievementDefinitions.find((item) => item.id === unlock.achievementId);

      if (achievement) {
        pushFeedback({
          type: 'achievement',
          title: 'ACHIEVEMENT',
          message: achievement.title,
          detail: 'Unlocked',
          rarity: achievement.rarity,
        });
      }
    });

    notifyNewReadyRewards();

    if (import.meta.env.DEV) {
      console.debug('Score submit audit: before submitOnlineScore', {
        gameId: savedScore.gameId,
        playerId: savedScore.playerId,
        score: savedScore.score,
        scoreDirection: scoreGame?.scoreDirection,
        stats: savedScore.stats,
        meta: savedScore.meta,
        deviceType,
        canSubmit,
      });
    }

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
    try {
      localStorage.removeItem(seenRewardReadyKey);
    } catch {
      // Reset should stay non-blocking.
    }
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
      type: 'reward',
      title: 'NAGRODA',
      message: `${getGameTitle(gameId)}: ${result.milestone.label}`,
      detail: `+${result.mainXpGained} XP konta`,
      priority: 'high',
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
      type: 'reward',
      title: 'NAGRODA',
      message: `+${result.mainXpGained} XP konta`,
      detail: result.quest.title,
      priority: 'high',
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
    <main className="min-h-screen bg-transparent text-slate-100">
      <LiveFeed />
      {needsNick && <FirstRunNickModal onSubmit={handleFirstRunName} />}
      <TopBar
        activeGameTitle={activeGame.title}
        activeView={activeView}
        onReset={handleResetLocalData}
        onViewChange={setActiveView}
        profile={profile}
        readyRewardsCount={readyRewardsCount}
        revision={revision}
      />

      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
        <div className="view-fade">
          {activeView === 'home' && (
            <div className="space-y-4 sm:space-y-5">
              {filteredGames.length > 0 ? (
                <GameCarousel activeGameId={activeGameId} games={filteredGames} onOpenGame={handleOpenGame} onSelectGame={setActiveGameId} />
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-slate-400">Brak gier w tej kategorii.</div>
              )}
              <CategoryFoundation categories={categoryOptions} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />

              <section className="relative overflow-hidden rounded-2xl border border-cyan-300/10 bg-slate-950/50 p-3.5 shadow-[0_0_34px_rgba(34,211,238,0.055)] sm:p-4">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_22rem),radial-gradient(circle_at_92%_20%,rgba(168,85,247,0.16),transparent_20rem)]" />
                <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
                  <div>
                    <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-cyan-100">
                      Lobby command
                    </div>
                    <h1 className="mt-2 max-w-3xl text-2xl font-black tracking-tight text-white sm:text-3xl">Arcade Skill Lobby</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Wybierz grę. Pobij rekord. Zgarnij progres.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-100" onClick={() => handleOpenGame(recommendedGame.id)} type="button">Graj teraz</button>
                      <button className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-white" onClick={() => setActiveView('profile')} type="button">Profil</button>
                      <button className="rounded-md border border-violet-300/20 bg-violet-300/[0.07] px-4 py-2 text-sm font-bold text-violet-100 transition hover:border-violet-200/40" onClick={() => setActiveView('profile')} type="button">Questy</button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Rozegrane</span>
                      <strong className="mt-1 block text-2xl text-white">{profile.totalScoreEntries}</strong>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
                      <span className="text-xs uppercase tracking-wide text-slate-500">Poziom konta</span>
                      <strong className="mt-1 block text-2xl text-white">L{profile.level}</strong>
                    </div>
                    <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                      <span className="text-xs uppercase tracking-wide text-cyan-100">Dzienny cel</span>
                      <strong className="mt-1 block truncate text-sm text-white">{dailyQuest?.title ?? 'Quest offline'}</strong>
                      <span className="mt-1 block text-xs text-slate-400">{dailyQuest ? `${dailyQuestProgress}/${dailyQuestTarget}` : 'Brak celu'}</span>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-all duration-500 shadow-[0_0_12px_rgba(34,211,238,0.45)]" style={{ width: `${dailyQuestPercent}%` }} /></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Kontynuuj</p>
                  <h3 className="mt-2 truncate text-lg font-bold text-white">{recommendedGame.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{recommendedGame.description}</p>
                  <button className="mt-4 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200" onClick={() => handleOpenGame(recommendedGame.id)} type="button">
                    Wejdź do gry
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Dzienny cel</p>
                  <h3 className="mt-2 truncate text-lg font-bold text-white">{dailyQuest?.title ?? 'Quest offline'}</h3>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-300 transition-all duration-500 shadow-[0_0_12px_rgba(168,85,247,0.45)]" style={{ width: `${dailyQuestPercent}%` }} /></div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-400"><span>{dailyQuest ? `${dailyQuestProgress}/${dailyQuestTarget}` : 'Brak celu'}</span><button className="rounded-md border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs font-bold uppercase text-violet-100 transition hover:border-violet-200/45" onClick={() => setActiveView('profile')} type="button">{dailyProgress?.completed && !dailyProgress.isClaimed ? 'Odbierz w profilu' : 'Questy'}</button></div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-100">Ostatni wynik</p>
                  <h3 className="mt-2 truncate text-lg font-bold text-white">{latestScore ? getGameTitle(latestScore.gameId) : 'Start run'}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {latestScore ? latestScore.scoreLabel : 'Zagraj pierwszą rundę.'}
                  </p>
                  <button className="mt-4 rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-bold text-amber-100 transition hover:border-amber-200/45" onClick={() => handleOpenGame(latestScore?.gameId ?? recommendedGame.id)} type="button">{latestScore ? 'Powtórz' : 'Graj teraz'}</button>
                </div>
              </section>
            </div>
          )}

          {activeView === 'game' && (
            <div className="space-y-4">
              <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/48 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    className="inline-flex w-fit items-center rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/16"
                    onClick={() => setActiveView('home')}
                    type="button"
                  >
                    ← Lobby
                  </button>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Hub / <span className="text-cyan-200">{activeGame.title}</span>
                    </p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-black text-white sm:text-3xl">{activeGame.title}</h1>
                      {activeGame.tags?.slice(0, 4).map((tag) => (
                        <span className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-slate-400" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="w-fit rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-cyan-50">
                  {activeGame.scoreName}
                </div>
              </section>

              <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
                <section className="game-panel min-w-0 self-start rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{activeGame.title}</h2>
                      <p className="mt-1 text-sm text-slate-400">{activeGame.description}</p>
                    </div>
                    <span className="text-sm text-teal-200">{activeGame.scoreName}</span>
                  </div>
                  {!activeGamePlayable ? (
                    <DeviceBlockCard
                      onChooseOther={() => {
                        if (firstPlayableGame) {
                          setActiveGameId(firstPlayableGame.id);
                          setActiveView('home');
                        }
                      }}
                    />
                  ) : (
                    <>
                      {activeGame.mobileSupport === 'limited' && deviceType !== 'desktop' && <LimitedDeviceWarning note={activeGame.mobileNote} />}
                      {renderGame(activeGameId, handleScore)}
                    </>
                  )}
                </section>

                <aside className="space-y-3 self-start lg:sticky lg:top-24">
                  <Leaderboard entries={leaderboard} gameId={activeGameId} />
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3.5">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Game info</p>
                    <p className="mt-2 text-sm text-slate-300">{activeGame.mobileNote ?? 'Pełne wsparcie dla aktualnego urządzenia.'}</p>
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">Modifiers · Seasons · 1v1</div>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeView === 'profile' && (
            <div className="space-y-4">
              <section className="rounded-xl border border-white/10 bg-slate-950/48 p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Profile view</p>
                <h1 className="mt-1.5 text-3xl font-black text-white">Profil gracza</h1>
                <p className="mt-2 text-sm text-slate-400">Statystyki, questy, achievementy, poziomy gier.</p>
              </section>
              <PlayerHub onMilestoneClaim={handleMilestoneClaim} onQuestClaim={handleQuestClaim} onRename={handleRename} profile={profile} revision={revision} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

