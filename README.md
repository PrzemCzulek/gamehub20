# Game Hub 2.0

Lokalny hub z prostymi mini-grami, lokalnym profilem gracza i leaderboardami zapisanymi w przegladarce.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- localStorage

## Uruchomienie lokalne

Zainstaluj zaleznosci:

```bash
npm install
```

Uruchom serwer developerski:

```bash
npm run dev
```

Zbuduj wersje produkcyjna:

```bash
npm run build
```

Opcjonalny podglad buildu:

```bash
npm run preview
```

## Gry

- Reaction Time Test: test refleksu, nizszy czas w ms jest lepszy.
- Memory Test: odtwarzanie sekwencji pol, wyzszy poziom jest lepszy.
- Color Memory Test: zapamietywanie i odtwarzanie koloru, wyzsza runda jest lepsza.
- Typing Speed Test: przepisywanie tekstu, wyzszy wynik WPM jest lepszy.
- Symbol Match: klasyczne memory z parami kart, nizsza liczba ruchow jest lepsza.
- Aim Test: trafianie celow na planszy, wyzszy wynik punktowy jest lepszy.
- Word Memory: rozpoznawanie nowych i powtarzajacych sie slow, wyzszy wynik punktowy jest lepszy.

## Dane lokalne

Aplikacja nie ma backendu ani logowania. Nick, profil i wyniki sa zapisywane lokalnie w `localStorage` przegladarki. Reset lokalnych danych usuwa zapisany nick i wszystkie wyniki z tego urzadzenia/przegladarki.

## QA

Manualna checklista znajduje sie w `QA_CHECKLIST.md`.

## Netlify

Projekt jest gotowy do statycznego deployu na Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
