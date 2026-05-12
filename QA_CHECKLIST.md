# Game Hub 2.0 - QA Checklist

Manualna checklista do pierwszego lokalnego QA przed deployem.

## Przygotowanie

- [ ] Uruchom `npm install`, jesli zaleznosci nie sa zainstalowane.
- [ ] Uruchom `npm run dev`.
- [ ] Otworz aplikacje pod adresem pokazanym przez Vite.
- [ ] Otworz DevTools i obserwuj Console pod katem bledow.

## Profil i nick

- [ ] Domyslny nick jest widoczny po pierwszym uruchomieniu.
- [ ] Zmiana nicku zapisuje nowa wartosc w panelu profilu.
- [ ] Pusty nick wraca do wartosci domyslnej.
- [ ] Nick nie rozbija layoutu przy dluzszej nazwie.
- [ ] Po odswiezeniu strony nick pozostaje zapisany.

## Reset danych

- [ ] Klikniecie resetu pokazuje potwierdzenie.
- [ ] Anulowanie potwierdzenia nie usuwa danych.
- [ ] Potwierdzenie resetu usuwa nick, wyniki, najlepsze wyniki i ostatnie wyniki.
- [ ] Po resecie aplikacja nie pokazuje bledow w konsoli.

## Leaderboardy

- [ ] Dla kazdej gry pusty leaderboard pokazuje pusty stan.
- [ ] Po zapisaniu wyniku wpis pojawia sie w leaderboardzie wlasciwej gry.
- [ ] Reaction Time sortuje wyniki rosnaco.
- [ ] Typing Speed sortuje wyniki malejaco.
- [ ] Memory Test sortuje wyniki malejaco.
- [ ] Color Memory Test sortuje wyniki malejaco.
- [ ] Domyslnie widoczne jest Top 5.
- [ ] Przycisk pokazuje Top 15 po rozwinieciu.
- [ ] Przycisk zwija liste z powrotem do Top 5.
- [ ] Zmiana aktywnej gry pokazuje ranking tej gry, bez mieszania wynikow.

## Reaction Time

- [ ] Start rundy przechodzi w stan oczekiwania.
- [ ] Klik za wczesnie konczy probe falstartem.
- [ ] Falstart zapisuje kare w leaderboardzie.
- [ ] Klik po zmianie koloru zapisuje czas w ms.
- [ ] Kolejna runda moze byc uruchomiona po wyniku lub falstarcie.

## Memory Test

- [ ] Start pokazuje pierwsza sekwencje.
- [ ] Pola sa zablokowane podczas pokazywania sekwencji.
- [ ] Poprawna sekwencja przechodzi do kolejnego poziomu.
- [ ] Bledny klik konczy gre i zapisuje wynik.
- [ ] Wynik pojawia sie w profilu i leaderboardzie gry.

## Color Memory Test

- [ ] Start pokazuje losowy kolor docelowy przez ograniczony czas.
- [ ] Po ukryciu koloru mozna wybrac kolor z inputa albo presetow.
- [ ] Zatwierdzenie pokazuje procent podobienstwa i wymagany prog.
- [ ] Wynik powyzej progu odblokowuje nastepna runde.
- [ ] Wynik ponizej progu konczy gre i zapisuje najwyzsza ukonczona runde.
- [ ] Wynik pojawia sie w profilu i leaderboardzie gry.

## Typing Speed Test

- [ ] Wpisywanie tekstu uruchamia pomiar.
- [ ] Reset czysci wpisany tekst, wynik i timer.
- [ ] Pusty tekst nie zapisuje wyniku.
- [ ] Poprawne przepisanie calego tekstu zapisuje WPM.
- [ ] Po ukonczeniu wynik nie zapisuje sie wielokrotnie bez resetu.

## Symbol Match

- [ ] Nowa gra tasuje zakryte karty.
- [ ] Dwie takie same karty zostaja odkryte.
- [ ] Dwie rozne karty wracaja do zakrycia po krotkiej chwili.
- [ ] Odkrycie wszystkich par zapisuje liczbe ruchow.
- [ ] Leaderboard sortuje mniejsza liczbe ruchow wyzej.

## Aim Test

- [ ] Start pokazuje cel wewnatrz planszy.
- [ ] Klik w cel nalicza trafienie i pokazuje kolejny cel.
- [ ] Klik poza celem nalicza miss.
- [ ] Gra konczy sie po serii celow i zapisuje wynik.
- [ ] Leaderboard sortuje wyzszy wynik punktowy wyzej.

## Word Memory

- [ ] Start pokazuje pierwsze slowo.
- [ ] Klik "Nowe" dziala dla slow, ktore nie wystapily wczesniej.
- [ ] Klik "Bylo" dziala dla slow, ktore wystapily wczesniej.
- [ ] Bledy koncza gre po limicie.
- [ ] Gra zapisuje punkty, rundy, bledy i najlepsze combo.

## Responsywnosc

- [ ] Desktop: obszar gry i panel boczny sa obok siebie.
- [ ] Mobile: obszar gry, profil i leaderboard ukladaja sie jeden pod drugim.
- [ ] Kafelki gier zawijaja sie bez nachodzenia tekstu.
- [ ] Przyciski i pola formularzy sa wygodne do klikniecia na mobile.
- [ ] Teksty nie wychodza poza kontenery.

## localStorage i odswiezenie strony

- [ ] Po zapisaniu kilku wynikow odswiez strone.
- [ ] Nick pozostaje zapisany.
- [ ] Leaderboardy pozostaja zapisane.
- [ ] Profil pokazuje najlepsze i ostatnie wyniki po odswiezeniu.
- [ ] Uszkodzony JSON w `game-hub:scores` nie crashuje aplikacji.

## Build

- [ ] Uruchom `npm run build`.
- [ ] Build konczy sie bez bledow.
- [ ] Katalog `dist` zostal wygenerowany.
