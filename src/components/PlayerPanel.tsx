import { useState } from 'react';
import { games } from '../data/games';
import { getAudioEnabled, playNormalClickSound, toggleAudioEnabled } from '../services/audio';
import type { LocalProfile } from '../types';
import { formatPercent } from '../utils/format';

type PlayerPanelProps = {
  profile: LocalProfile;
  onRename: (name: string) => void;
  onReset: () => void;
};

export function PlayerPanel({ profile, onRename, onReset }: PlayerPanelProps) {
  const [draftName, setDraftName] = useState(profile.playerName);
  const [audioEnabled, setAudioEnabledState] = useState(getAudioEnabled);
  const [showAllBestScores, setShowAllBestScores] = useState(false);
  const [showAllRecentScores, setShowAllRecentScores] = useState(false);
  const [showProfileStats, setShowProfileStats] = useState(false);
  const visibleBestScoreGames = showAllBestScores ? games : games.slice(0, 3);
  const visibleRecentScores = showAllRecentScores ? profile.recentScores : profile.recentScores.slice(0, 3);
  const bestGameTitle = games.find((game) => game.id === profile.bestGame)?.title ?? '-';
  const mostPlayedGameTitle = games.find((game) => game.id === profile.mostPlayedGame)?.title ?? '-';

  function handleReset() {
    playNormalClickSound();
    const confirmed = window.confirm('Usunąć lokalny nick i wszystkie zapisane wyniki?');

    if (confirmed) {
      onReset();
      setDraftName('Gracz');
    }
  }

  function handleAudioToggle() {
    playNormalClickSound();
    setAudioEnabledState(toggleAudioEnabled());
  }

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-base font-semibold text-white">Profil lokalny</h2>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          playNormalClickSound();
          onRename(draftName);
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          maxLength={24}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="Nick"
          value={draftName}
        />
        <button
          className="rounded-md bg-teal-300 px-3 py-2 text-sm font-semibold text-slate-950"
          type="submit"
        >
          Zmień
        </button>
      </form>

      <button
        className="mt-3 w-full rounded-md border border-cyan-300/25 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10"
        onClick={handleAudioToggle}
        type="button"
      >
        Dźwięki: {audioEnabled ? 'Wł.' : 'Wył.'}
      </button>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md bg-black/20 p-3">
          <span className="text-slate-400">Nick</span>
          <strong className="mt-1 block truncate text-white">{profile.playerName}</strong>
        </div>
        <div className="rounded-md bg-black/20 p-3">
          <span className="text-slate-400">Level</span>
          <strong className="mt-1 block text-white">{profile.level}</strong>
        </div>
        <div className="rounded-md bg-black/20 p-3">
          <span className="text-slate-400">XP</span>
          <strong className="mt-1 block text-white">{profile.xp}</strong>
        </div>
        <div className="rounded-md bg-black/20 p-3">
          <span className="text-slate-400">Rozegrane gry</span>
          <strong className="mt-1 block text-white">{profile.totalGamesPlayed}</strong>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-black/20 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Postęp levelu</span>
          <span>{profile.levelProgressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-teal-300" style={{ width: `${profile.levelProgressPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {profile.xp - profile.currentLevelXp} / {profile.nextLevelXp - profile.currentLevelXp} XP do kolejnego levelu
        </p>
      </div>

      <button
        className="mt-3 w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
        onClick={() => {
          playNormalClickSound();
          setShowProfileStats((value) => !value);
        }}
        type="button"
      >
        {showProfileStats ? 'Ukryj statystyki profilu' : 'Pokaż statystyki profilu'}
      </button>

      {showProfileStats && (
        <div className="mt-3 space-y-2 text-sm">
          <div className="rounded-md border border-white/10 bg-black/20 p-3">
            <span className="text-slate-400">Player ID</span>
            <strong className="mt-1 block truncate text-white">{profile.playerId}</strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-black/20 px-3 py-2">
              <span className="text-slate-400">Level</span>
              <strong className="mt-1 block text-white">{profile.level}</strong>
            </div>
            <div className="rounded-md bg-black/20 px-3 py-2">
              <span className="text-slate-400">XP</span>
              <strong className="mt-1 block text-white">{profile.xp}</strong>
            </div>
            <div className="rounded-md bg-black/20 px-3 py-2">
              <span className="text-slate-400">Rozegrane gry</span>
              <strong className="mt-1 block text-white">{profile.totalGamesPlayed}</strong>
            </div>
            <div className="rounded-md bg-black/20 px-3 py-2">
              <span className="text-slate-400">Zapisane wyniki</span>
              <strong className="mt-1 block text-white">{profile.totalScoreEntries}</strong>
            </div>
          </div>
          <div className="rounded-md bg-black/20 px-3 py-2">
            <span className="text-slate-400">Najczęściej grana gra</span>
            <strong className="mt-1 block text-white">{mostPlayedGameTitle}</strong>
          </div>
          <div className="rounded-md bg-black/20 px-3 py-2">
            <span className="text-slate-400">Najlepsza gra</span>
            <strong className="mt-1 block text-white">{bestGameTitle}</strong>
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
            <span className="text-slate-400">Highlighty</span>
            <div className="mt-2 space-y-1 text-xs text-slate-300">
              <p>Najlepszy Reaction Time: {profile.highlights.bestReactionTime?.scoreLabel ?? '-'}</p>
              <p>Najwyższy WPM: {profile.highlights.highestWpm?.scoreLabel ?? '-'}</p>
              <p>
                Najlepsza celność Aim Test:{' '}
                {profile.highlights.highestAimAccuracy?.stats?.accuracy !== undefined
                  ? formatPercent(profile.highlights.highestAimAccuracy.stats.accuracy)
                  : '-'}
              </p>
              <p>
                Najlepsze podobieństwo Color Memory:{' '}
                {profile.highlights.bestColorSimilarity?.stats?.bestSimilarity !== undefined
                  ? formatPercent(profile.highlights.bestColorSimilarity.stats.bestSimilarity)
                  : '-'}
              </p>
              <p>Najlepszy Symbol Match: {profile.highlights.bestSymbolMatch?.scoreLabel ?? '-'}</p>
              <p>Najlepszy Word Memory: {profile.highlights.bestWordMemory?.scoreLabel ?? '-'}</p>
            </div>
          </div>
        </div>
      )}

      <h3 className="mt-5 text-sm font-semibold text-white">Najlepsze wyniki</h3>
      <div className="mt-3 space-y-2">
        {visibleBestScoreGames.map((game) => (
          <div className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-sm" key={game.id}>
            <span className="min-w-0 truncate text-slate-300">{game.title}</span>
            <strong className="shrink-0 text-white">{profile.bestScores[game.id]?.scoreLabel ?? '-'}</strong>
          </div>
        ))}
      </div>
      {games.length > 3 && (
        <button
          className="mt-3 w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          onClick={() => {
            playNormalClickSound();
            setShowAllBestScores((value) => !value);
          }}
          type="button"
        >
          {showAllBestScores ? 'Pokaż mniej' : 'Pokaż więcej'}
        </button>
      )}

      <h3 className="mt-5 text-sm font-semibold text-white">Ostatnie 5 wyników</h3>
      <div className="mt-3 space-y-2">
        {profile.recentScores.length === 0 ? (
          <p className="text-sm text-slate-400">Brak zapisanych wyników.</p>
        ) : (
          visibleRecentScores.map((score) => (
            <div className="rounded-md bg-black/20 px-3 py-2 text-sm" key={`${score.createdAt}-${score.gameId}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-slate-300">
                  {games.find((game) => game.id === score.gameId)?.title}
                </span>
                <strong className="shrink-0 text-white">{score.scoreLabel}</strong>
              </div>
            </div>
          ))
        )}
      </div>
      {profile.recentScores.length > 3 && (
        <button
          className="mt-3 w-full rounded-md border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          onClick={() => {
            playNormalClickSound();
            setShowAllRecentScores((value) => !value);
          }}
          type="button"
        >
          {showAllRecentScores ? 'Pokaż mniej' : 'Pokaż więcej'}
        </button>
      )}

      <button
        className="mt-5 w-full rounded-md border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-400/10"
        onClick={handleReset}
        type="button"
      >
        Reset lokalnych danych
      </button>
    </section>
  );
}
