# Layout Roadmap

Ten dokument opisuje kierunek przyszłego redesignu layoutu. Nie jest to plan implementacji routingu w obecnym patchu.

## Przyszły podział aplikacji

- Home / Hub: główne lobby arcade z karuzelą, statusem progresu, questami i skrótami do gier.
- Game Page: osobny widok aktywnej gry z większym gameplay area, leaderboardem i kontekstem kompatybilności urządzenia.
- Profile Page: profil gracza, poziomy gier, achievementy, questy, historia wyników i przyszłe kosmetyki.

## Kategorie gier

- Reflex
- Memory
- Precision
- Typing
- Challenges

## Kompatybilność urządzeń

System kompatybilności urządzeń już istnieje w konfiguracji gier przez:

- `mobileSupport: "ready" | "limited" | "desktop-only"`
- `mobileNote`

Ten system powinien zostać użyty w przyszłym redesignie kart, list gier i stron gier.

## Zasady desktop-only

Gry oznaczone jako `desktop-only` muszą mieć:

- blokadę startu na mobile/tablet,
- centralny score guard przed zapisem wyniku,
- brak wysyłki online score z urządzeń niedozwolonych.

## Routing w przyszłości

Przyszły routing nie może psuć obecnego flow:

- Game -> `onScore(ScoreInput)`
- `App.handleScore`
- local `saveScore`
- progression event
- online leaderboard submit

Progression, leaderboardy i localStorage powinny zostać centralne, niezależne od tego, czy gra działa w hubie, czy na osobnej stronie.
