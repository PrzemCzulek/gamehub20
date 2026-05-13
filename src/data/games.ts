import type { GameConfig, GameId } from '../types';

export const games: GameConfig[] = [
  {
    id: 'reaction-time',
    title: 'Reaction Time Test',
    description: 'Kliknij jak najszybciej, gdy ekran zmieni kolor.',
    scoreDirection: 'ascending',
    scoreName: 'czas reakcji',
    mobileSupport: 'ready',
    metrics: [{ id: 'score', label: 'Główny wynik', direction: 'ascending', source: 'score', valueType: 'ms' }],
  },
  {
    id: 'memory-test',
    title: 'Memory Test',
    description: 'Zapamiętaj i odtwórz coraz dłuższą sekwencję pól.',
    scoreDirection: 'descending',
    scoreName: 'poziom',
    mobileSupport: 'ready',
    metrics: [{ id: 'score', label: 'Główny wynik', direction: 'descending', source: 'score', suffix: 'poziom' }],
  },
  {
    id: 'color-memory',
    title: 'Color Memory Test',
    description: 'Zapamiętaj kolor docelowy i odtwórz go jak najdokładniej.',
    scoreDirection: 'descending',
    scoreName: 'runda',
    mobileSupport: 'ready',
    metrics: [
      { id: 'score', label: 'Główny wynik', direction: 'descending', source: 'score', suffix: 'runda' },
      { id: 'bestSimilarity', label: 'Najlepsze podobieństwo', direction: 'descending', source: 'stats', statKey: 'bestSimilarity', valueType: 'percent' },
      { id: 'averageSimilarity', label: 'Średnia poprawność', direction: 'descending', source: 'stats', statKey: 'averageSimilarity', valueType: 'percent' },
      { id: 'finalSimilarity', label: 'Ostatnie podobieństwo', direction: 'descending', source: 'stats', statKey: 'finalSimilarity', valueType: 'percent' },
    ],
  },
  {
    id: 'typing-speed',
    title: 'Typing Speed Test',
    description: 'Przepisz tekst i sprawdź wynik WPM oraz dokładność.',
    scoreDirection: 'descending',
    scoreName: 'WPM',
    mobileSupport: 'desktop-only',
    mobileNote: 'Ranking Typing Speed jest dostępny tylko na desktopie, żeby wyniki były porównywalne.',
    metrics: [
      { id: 'score', label: 'Główny wynik', direction: 'descending', source: 'score', suffix: 'WPM' },
      { id: 'accuracy', label: 'Celność', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'rounds', label: 'Ukończone zdania', direction: 'descending', source: 'stats', statKey: 'rounds' },
      { id: 'correctChars', label: 'Poprawne znaki', direction: 'descending', source: 'stats', statKey: 'correctChars' },
    ],
  },
  {
    id: 'symbol-match',
    title: 'Symbol Match',
    description: 'Odkrywaj po dwie karty i znajdź wszystkie pary symboli.',
    scoreDirection: 'ascending',
    scoreName: 'ruchy',
    mobileSupport: 'ready',
    metrics: [
      { id: 'score', label: 'Główny wynik', direction: 'ascending', source: 'score', suffix: 'ruchów' },
      { id: 'mistakes', label: 'Pomyłki', direction: 'ascending', source: 'stats', statKey: 'mistakes' },
      { id: 'durationMs', label: 'Czas gry', direction: 'ascending', source: 'stats', statKey: 'durationMs', valueType: 'ms' },
    ],
  },
  {
    id: 'aim-test',
    title: 'Aim Test',
    description: 'Trafiaj pojawiające się cele i unikaj kliknięć poza nimi.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'limited',
    mobileNote: 'Na mobile sterowanie dotykiem może wpływać na wynik.',
    metrics: [
      { id: 'score', label: 'Główny wynik', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'accuracy', label: 'Celność', direction: 'descending', source: 'stats', statKey: 'accuracy', valueType: 'percent' },
      { id: 'averageReactionMs', label: 'Średni czas', direction: 'ascending', source: 'stats', statKey: 'averageReactionMs', valueType: 'ms' },
      { id: 'hits', label: 'Trafienia', direction: 'descending', source: 'stats', statKey: 'hits' },
      { id: 'misses', label: 'Pomyłki', direction: 'ascending', source: 'stats', statKey: 'misses' },
    ],
  },
  {
    id: 'word-memory',
    title: 'Word Memory',
    description: 'Decyduj, czy słowo jest nowe, czy pojawiło się wcześniej.',
    scoreDirection: 'descending',
    scoreName: 'punkty',
    mobileSupport: 'limited',
    mobileNote: 'Gra działa na mobile, ale najlepiej wypada na większym ekranie.',
    metrics: [
      { id: 'score', label: 'Główny wynik', direction: 'descending', source: 'score', suffix: 'pkt' },
      { id: 'bestCombo', label: 'Najlepsze combo', direction: 'descending', source: 'stats', statKey: 'bestCombo' },
      { id: 'mistakes', label: 'Błędy', direction: 'ascending', source: 'stats', statKey: 'mistakes' },
      { id: 'rounds', label: 'Rundy', direction: 'descending', source: 'stats', statKey: 'rounds' },
    ],
  },
];

export function getGameConfig(gameId: GameId): GameConfig {
  const game = games.find((item) => item.id === gameId);

  if (!game) {
    throw new Error(`Unknown game id: ${gameId}`);
  }

  return game;
}
