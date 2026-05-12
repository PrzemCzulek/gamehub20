import { useEffect, useMemo, useState } from 'react';
import { GameCarousel } from './components/GameCarousel';
import { Leaderboard } from './components/Leaderboard';
import { PlayerPanel } from './components/PlayerPanel';
import { MetaPanel } from './components/meta/MetaPanel';
import { games } from './data/games';
import { AimTestGame } from './games/AimTestGame';
import { ColorMemoryGame } from './games/ColorMemoryGame';
import { MemoryTestGame } from './games/MemoryTestGame';
import { ReactionTimeGame } from './games/ReactionTimeGame';
import { SymbolMatchGame } from './games/SymbolMatchGame';
import { TypingSpeedGame } from './games/TypingSpeedGame';
import { WordMemoryGame } from './games/WordMemoryGame';
import { createProgressionEvent } from './progression/events';
import { processProgressionEvent } from './progression/progressionEngine';
import { preloadAudio } from './services/audio';
import { submitOnlineScore } from './services/onlineLeaderboard';
import { getLeaderboard, getProfile, resetLocalData, saveScore, setPlayerName } from './services/storage';
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

export default function App() {
  const [activeGameId, setActiveGameId] = useState<GameId>('reaction-time');
  const [revision, setRevision] = useState(0);
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
    const savedScore = saveScore(score);
    const progressionEvent = createProgressionEvent(savedScore);
    processProgressionEvent(progressionEvent);

    submitOnlineScore(savedScore).catch((error) => {
      console.warn('Online score submit failed', error);
    });
    refresh();
  }

  function handleRename(name: string) {
    setPlayerName(name);
    refresh();
  }

  function handleResetLocalData() {
    resetLocalData();
    refresh();
  }

  return (
    <main className="min-h-screen px-3 py-4 text-slate-100 sm:px-5 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_35px_rgba(34,211,238,0.06)] md:grid-cols-[minmax(0,1fr)_minmax(20rem,36rem)] md:items-center">
          <div className="min-w-0 px-1">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-teal-200">GAME HUB 2.0</p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-slate-400">SKILL ARCADE NETWORK</p>
          </div>
          <MetaPanel profile={profile} revision={revision} />
        </header>

        <GameCarousel activeGameId={activeGameId} games={games} onSelectGame={setActiveGameId} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
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

          <aside className="space-y-6">
            <PlayerPanel onRename={handleRename} onReset={handleResetLocalData} profile={profile} />
            <Leaderboard entries={leaderboard} gameId={activeGameId} />
          </aside>
        </div>
      </div>
    </main>
  );
}
