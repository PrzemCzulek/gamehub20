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
import { getQuestProgress, processProgressionEvent } from './progression/progressionEngine';
import { preloadAudio } from './services/audio';
import { submitOnlineScore } from './services/onlineLeaderboard';
import { getLeaderboard, getProfile, hasValidPlayerName, resetLocalData, saveScore, setPlayerName } from './services/storage';
import type { GameId, GameTag, LocalProfile, ScoreInput } from './types';
import { canPlayGameOnDevice, canSubmitScoreForGame, getDeviceType, type DeviceType } from './utils/device';

type AppView = 'home' | 'game' | 'profile';

const categoryFilters: Array<{ id: GameTag | 'hardcore'; label: string; tags: GameTag[] }> = [
  { id: 'reflex', label: 'Reflex', tags: ['reflex'] },
  { id: 'memory', label: 'Memory', tags: ['memory'] },
  { id: 'precision', label: 'Precision', tags: ['precision'] },
  { id: 'typing', label: 'Typing', tags: ['typing'] },
  { id: 'mobile', label: 'Mobile', tags: ['mobile'] },
  { id: 'casual', label: 'Casual', tags: ['casual'] },
  { id: 'hardcore', label: 'Hardcore', tags: ['challenge', 'desktop'] },
];

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

function DeviceBlockCard({ onChooseOther }: { onChooseOther: () => void }) {
  return (
    <div className="rounded-xl border border-fuchsia-300/20 bg-slate-950/70 p-6 text-center shadow-[0_0_34px_rgba(168,85,247,0.12)]">
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
  revision,
}: {
  activeGameTitle: string;
  activeView: AppView;
  onReset: () => void;
  onViewChange: (view: AppView) => void;
  profile: LocalProfile;
  revision: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-300/10 bg-slate-950/82 shadow-[0_10px_40px_rgba(2,6,23,0.28)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-3 px-3 py-2.5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex min-w-0 flex-wrap items-center gap-5">
          <button className="text-left" onClick={() => onViewChange('home')} type="button">
            <span className="block text-sm font-black uppercase tracking-[0.32em] text-teal-200">GAME HUB 2.0</span>
            <span className="mt-1 block text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-500">Skill Arcade Network</span>
          </button>
          <nav className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.025] p-1">
            {(['home', 'profile'] as const).map((view) => (
              <button
                className={`relative rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition duration-200 ${
                  activeView === view
                    ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)] after:absolute after:inset-x-3 after:-bottom-1 after:h-px after:bg-cyan-300 after:shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                    : 'border-transparent text-slate-400 hover:border-cyan-300/20 hover:bg-cyan-300/5 hover:text-white'
                }`}
                key={view}
                onClick={() => onViewChange(view)}
                type="button"
              >
                {view === 'home' ? 'Home' : 'Profil'}
              </button>
            ))}
            {activeView === 'game' && (
              <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.12)]">
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

function CategoryFoundation({ selectedCategory, onSelect }: { selectedCategory: string | null; onSelect: (category: string | null) => void }) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_28px_rgba(34,211,238,0.04)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Kategorie</p>
          <h2 className="mt-1 text-xl font-bold text-white">Arcade lanes</h2>
        </div>
        <p className="text-sm text-slate-400">Foundation pod filtry, playlisty i rekomendacje.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition duration-200 ${
            selectedCategory === null
              ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.18)]'
              : 'border-white/10 bg-black/15 text-slate-300 hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-white'
          }`}
          onClick={() => onSelect(null)}
          type="button"
        >
          Wszystkie
        </button>
        {categoryFilters.map((category) => {
          const count = games.filter((game) => game.tags?.some((tag) => category.tags.includes(tag))).length;

          return (
            <button
              className={`rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wide transition duration-200 ${
                selectedCategory === category.id
                  ? 'border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                  : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white'
              }`}
              key={category.id}
              onClick={() => onSelect(selectedCategory === category.id ? null : category.id)}
              type="button"
            >
              {category.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      {selectedCategory && (
        <p className="mt-3 text-xs text-cyan-100">
          Aktywna grupa: {categoryFilters.find((category) => category.id === selectedCategory)?.label}. Pełne filtrowanie widoków zostanie dodane w kolejnym etapie.
        </p>
      )}
    </section>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [activeGameId, setActiveGameId] = useState<GameId>('reaction-time');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [deviceType, setDeviceType] = useState<DeviceType>(() => getDeviceType());
  const [needsNick, setNeedsNick] = useState(() => !hasValidPlayerName(getProfile().playerName));
  const profile = useMemo(() => getProfile(), [revision]);
  const leaderboard = useMemo(() => getLeaderboard(activeGameId), [activeGameId, revision]);
  const questProgress = useMemo(() => getQuestProgress(), [revision]);
  const activeGame = games.find((game) => game.id === activeGameId) ?? games[0];
  const activeGamePlayable = canPlayGameOnDevice(activeGame, deviceType);
  const firstPlayableGame = games.find((game) => canPlayGameOnDevice(game, deviceType));
  const dailyQuest = questDefinitions.find((quest) => quest.type === 'daily');
  const dailyProgress = dailyQuest ? questProgress.find((item) => item.questId === dailyQuest.id) : undefined;

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

    if (scoreGame && !canSubmitScoreForGame(scoreGame, deviceType)) {
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

    progressionResult.newlyCompletedQuests.forEach((questProgressItem) => {
      const quest = questDefinitions.find((item) => item.id === questProgressItem.questId);

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
    <main className="min-h-screen bg-transparent text-slate-100">
      <LiveFeed />
      {needsNick && <FirstRunNickModal onSubmit={handleFirstRunName} />}
      <TopBar activeGameTitle={activeGame.title} activeView={activeView} onReset={handleResetLocalData} onViewChange={setActiveView} profile={profile} revision={revision} />

      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-5 lg:px-8">
        <div className="view-fade">
          {activeView === 'home' && (
            <div className="space-y-5 sm:space-y-6">
              <section className="grid gap-4 rounded-2xl border border-cyan-300/10 bg-white/[0.035] p-4 shadow-[0_0_45px_rgba(34,211,238,0.06)] sm:p-5 lg:grid-cols-[1.18fr_0.82fr] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-200">Arcade hub</p>
                  <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-5xl">Skill games, rankingi i progres w jednym lobby.</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                    Wybierz grę z karuzeli, wskocz w focus mode albo przejdź do profilu, żeby odebrać questy i milestone'y.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Rozegrane</span>
                    <strong className="mt-1 block text-2xl text-white">{profile.totalScoreEntries}</strong>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <span className="text-xs uppercase tracking-wide text-slate-500">Poziom konta</span>
                    <strong className="mt-1 block text-2xl text-white">L{profile.level}</strong>
                  </div>
                  <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                    <span className="text-xs uppercase tracking-wide text-cyan-100">Daily challenge</span>
                    <strong className="mt-1 block truncate text-sm text-white">{dailyQuest?.title ?? 'Brak aktywnego questa'}</strong>
                    <span className="mt-1 block text-xs text-slate-400">{dailyProgress ? `${dailyProgress.progress}/${dailyQuest?.target.amount ?? 1}` : 'Czeka na progres'}</span>
                  </div>
                </div>
              </section>

              <GameCarousel activeGameId={activeGameId} games={games} onOpenGame={handleOpenGame} onSelectGame={setActiveGameId} />
              <CategoryFoundation selectedCategory={selectedCategory} onSelect={setSelectedCategory} />

              <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Featured mode</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{activeGame.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{activeGame.description}</p>
                  <button className="mt-4 rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200" onClick={() => handleOpenGame(activeGame.id)} type="button">
                    Wejdź do gry
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-200">Future events</p>
                  <h3 className="mt-2 text-lg font-bold text-white">Seasonal playlists</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">Miejsce pod eventy, playlisty, PvP i rotujące challenge modes.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-100">Quick activity</p>
                  <h3 className="mt-2 text-lg font-bold text-white">Ostatnie wyniki</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {profile.recentScores[0] ? `${getGameTitle(profile.recentScores[0].gameId)}: ${profile.recentScores[0].scoreLabel}` : 'Brak historii wyników.'}
                  </p>
                </div>
              </section>
            </div>
          )}

          {activeView === 'game' && (
            <div className="space-y-5">
              <section className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <button className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 transition hover:text-cyan-100" onClick={() => setActiveView('home')} type="button">
                    ← Powrót do hubu
                  </button>
                  <h1 className="mt-2 truncate text-3xl font-black text-white">{activeGame.title}</h1>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activeGame.tags?.slice(0, 4).map((tag) => (
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[0.65rem] font-bold uppercase text-slate-300" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-4 py-3 text-sm text-cyan-50">Focus mode · {activeGame.scoreName}</div>
              </section>

              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
                <section className="game-panel min-w-0 self-start rounded-lg border border-white/10 bg-white/[0.04] p-4 sm:p-5">
                  <div className="mb-5 flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
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

                <aside className="space-y-4 self-start lg:sticky lg:top-28">
                  <Leaderboard entries={leaderboard} gameId={activeGameId} />
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Game info</p>
                    <p className="mt-2 text-sm text-slate-300">{activeGame.mobileNote ?? 'Pełne wsparcie dla aktualnego urządzenia.'}</p>
                    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">Future space: modifiers, seasons, playlists, 1v1.</div>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {activeView === 'profile' && (
            <div className="space-y-5">
              <section className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Profile view</p>
                <h1 className="mt-2 text-3xl font-black text-white">Profil gracza</h1>
                <p className="mt-2 text-sm text-slate-400">Statystyki, questy, achievementy, historia i poziomy gier w jednym miejscu.</p>
              </section>
              <PlayerHub onMilestoneClaim={handleMilestoneClaim} onQuestClaim={handleQuestClaim} onRename={handleRename} profile={profile} revision={revision} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
