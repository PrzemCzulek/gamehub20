# Game Hub 2.0 - Project Notes

## Opis projektu

Game Hub 2.0 to lokalnie rozwijana aplikacja webowa z prostymi mini-grami dla znajomych. MVP skupia sie na szybkim graniu, lokalnym profilu gracza, lokalnych rankingach i strukturze gotowej do pozniejszej rozbudowy.

Projekt jest przygotowywany pod pozniejszy deploy na Netlify, ale na tym etapie nie ma backendu, logowania ani synchronizacji danych w chmurze.

## Aktualny stack

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage jako lokalna warstwa zapisu
- Netlify jako docelowy hosting statyczny

## Obecne funkcje

- Strona glowna Game Hub z kafelkami gier.
- Gry:
  - Reaction Time Test
  - Memory Test
  - Color Memory Test
  - Typing Speed Test
  - Symbol Match
  - Aim Test
  - Word Memory
- Lokalny nick gracza.
- Zmiana nicku.
- Lokalny profil:
  - nick
  - liczba rozegranych zapisanych podejsc
  - najlepsze wyniki per gra
  - ostatnie 5 wynikow
- Lokalne leaderboardy per gra.
- Top 5 domyslnie i Top 15 po rozwinieciu.
- Reset lokalnych danych z potwierdzeniem.
- Bezpieczne odczyty z localStorage z fallbackiem.

## Zasady architektury

- Logika gier nie powinna byc mieszana z UI leaderboardow.
- Kazda gra ma osobny komponent w `src/games`.
- Wspolny zapis wynikow jest w `src/services/storage.ts`.
- Definicje gier i kierunek sortowania sa w `src/data/games.ts`.
- Wspolne typy sa w `src/types.ts`.
- Gry emituja wynik przez `onScore`, a zapis wykonuje centralnie `App`.
- Leaderboardy sortuja dane na podstawie konfiguracji gry.
- Memory Test korzysta ze wspolnego hooka `useSequenceGame`.
- Color Memory Test korzysta z osobnego helpera podobienstwa kolorow RGB/HEX.

## Format ScoreInput

`ScoreInput` to dane przekazywane przez gre do aplikacji przed zapisem:

```ts
type ScoreInput = {
  gameId: GameId;
  score: number;
  scoreLabel: string;
  meta?: Record<string, unknown>;
};
```

## Format ScoreEntry

Zapisany wpis leaderboardu ma format:

```ts
type LeaderboardEntry = {
  gameId: GameId;
  playerName: string;
  score: number;
  scoreLabel: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};
```

## Sortowanie wynikow

- Reaction Time Test: `ascending`, nizszy wynik jest lepszy.
- Typing Speed Test: `descending`, wyzszy wynik jest lepszy.
- Memory Test: `descending`, wyzszy poziom jest lepszy.
- Color Memory Test: `descending`, wyzsza ukończona runda jest lepsza.
- Symbol Match: `ascending`, mniej ruchow jest lepiej.
- Aim Test: `descending`, wyzszy wynik punktowy jest lepszy.
- Word Memory: `descending`, wyzszy wynik punktowy jest lepszy.

## Zakazane na tym etapie

- Nie dodawac backendu.
- Nie dodawac prawdziwego logowania.
- Nie dodawac Netlify Functions.
- Nie dodawac bazy danych.
- Nie dodawac nowych bibliotek bez konkretnej potrzeby.
- Nie przenosic danych poza localStorage.
