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

## Netlify Database / online leaderboard

Online leaderboard dziala przez Netlify Functions i Netlify Database. Frontend dalej zapisuje wyniki lokalnie w `localStorage`, a backend jest tylko warstwa online.

Wymagana zmienna runtime dla funkcji:

- `NETLIFY_DATABASE_URL`
- scope: `Functions`

Konfiguracja przez Netlify UI:

1. Otworz projekt w Netlify.
2. Wejdz w `Database`.
3. Utworz albo podepnij database dla tego projektu.
4. Wejdz w `Project configuration` -> `Environment variables`.
5. Sprawdz, czy istnieje `NETLIFY_DATABASE_URL`.
6. Upewnij sie, ze zmienna ma scope `Functions`.
7. Zrob ponowny deploy po dodaniu zmiennej.

Konfiguracja przez Netlify CLI:

```bash
npx netlify login
npx netlify link
npx netlify db init
```

W niektorych wersjach CLI komenda moze nazywac sie:

```bash
npx netlify database init
```

Endpointy diagnostyczne po deployu:

- `/.netlify/functions/health`
- `/.netlify/functions/db-health`

`health` powinien zwrocic `hasDatabaseUrl: true`. `db-health` powinien zwrocic `ok: true` i wynik prostego `SELECT 1`.

Jesli `health` zwraca `hasDatabaseUrl: false`, problemem nie jest kod aplikacji, tylko brak `NETLIFY_DATABASE_URL` w runtime funkcji. Nie ustawiaj tej zmiennej w `netlify.toml`; musi byc skonfigurowana w Netlify UI albo przez Netlify Database/CLI.
