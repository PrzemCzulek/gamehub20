export type TypingDifficulty = 'normal' | 'hard';

export type TypingTextPack = {
  difficulty: TypingDifficulty;
  label: string;
  accentClass: string;
  texts: string[];
};

const normalTexts = [
  'Krótka sesja treningowa poprawia refleks.',
  'Dobry wynik zaczyna się od skupienia.',
  'Każde kliknięcie ma znaczenie.',
  'Najlepsi gracze utrzymują rytm.',
  'Precyzja daje więcej niż chaotyczne tempo.',
  'Czysty run zaczyna się od spokojnego oddechu.',
  'Ranking premiuje rytm oraz dokładność.',
  'Szybkie dłonie lubią jasny cel.',
  'Trening codzienny buduje stabilną formę.',
  'Wpisuj zdania płynnie i bez paniki.',
  'Dobry gracz widzi błąd zanim urośnie.',
  'Równe tempo pomaga utrzymać dokładność.',
  'Każda litera liczy się w końcowym wyniku.',
  'Polskie znaki też są częścią testu.',
  'Świetny wynik wymaga ciszy i skupienia.',
  'Najpierw kontrola, potem prędkość.',
  'Spokojne palce pracują szybciej niż nerwy.',
  'Nowy rekord pojawia się po kilku próbach.',
  'Krótkie sprinty uczą szybkiego startu.',
  'Dłuższy test sprawdza wytrzymałość.',
  'Wysokie WPM bez celności nic nie znaczy.',
  'Rytm pisania przypomina serię trafień.',
  'Dobry wynik zostaje w rankingu na długo.',
  'Uważność wygrywa z przypadkowym spamem.',
  'Każda runda może być lepsza od poprzedniej.',
  'Nie ścigaj kursora, prowadź go spokojnie.',
  'Słowa płyną lepiej, gdy nie napinasz dłoni.',
  'Arcade trening lubi krótkie serie.',
  'Wynik rośnie, gdy znikają drobne pomyłki.',
  'Czyste zdanie daje lepszy flow.',
  'Trzymaj tempo nawet przy trudnym słowie.',
  'Szybki start nie zastąpi konsekwencji.',
  'Niech rytm klawiatury będzie równy.',
  'Dokładność buduje zaufanie do tempa.',
  'Pisanie po polsku wymaga pełnej kontroli.',
  'Łatwe zdanie też można zepsuć pośpiechem.',
  'Ćwicz krótko, ale regularnie.',
  'W centrum testu jest spokojny rytm.',
  'Dobra seria zaczyna się od pierwszej litery.',
  'Każdy błąd zabiera trochę prędkości.',
  'Najlepszy run ma mało hałasu i dużo kontroli.',
  'Kiedy skupienie rośnie, wynik idzie za nim.',
  'Długie słowa wymagają miękkiego tempa.',
  'Szybkość bez presji daje najlepszy efekt.',
  'Pisz tak, jakby każda litera była trafieniem.',
  'Krótki błąd nie musi zepsuć całej rundy.',
  'Równe tempo łatwiej utrzymać przez minutę.',
  'Dobra klawiatura pomaga, ale nie gra za ciebie.',
  'Zachowaj flow nawet po literówce.',
  'Czytelne zdania pomagają wejść w rytm.',
  'Najwyższe wyniki rodzą się z powtarzalności.',
  'Niech ręce pracują lekko i pewnie.',
  'Płynne pisanie skraca czas reakcji.',
  'W każdej rundzie szukaj jednego lepszego nawyku.',
  'Dokładny start ułatwia szybki finisz.',
  'Dobry sprint nie musi być nerwowy.',
  'Środek testu sprawdza prawdziwy rytm.',
  'Utrzymuj tempo, gdy zdanie robi się dłuższe.',
  'Ciche skupienie działa lepiej niż pośpiech.',
  'Klawiatura lubi pewne decyzje.',
  'Wpisuj polskie znaki bez skrótów.',
  'Zwycięża ten, kto mniej poprawia.',
  'Pamiętaj o spacji po każdym słowie.',
  'Runda kończy się wynikiem, nie emocją.',
  'Dobra celność chroni wysoki WPM.',
  'Nie gub rytmu przy przecinku.',
  'Szybkie palce potrzebują odpoczynku.',
  'Każdy tekst ma własny puls.',
  'Ucz się tempa zamiast walczyć z tekstem.',
  'Najlepszy wynik brzmi jak równy beat.',
  'Pewne naciśnięcie jest lepsze niż poprawka.',
  'Kolejne zdanie zaczyna nową serię.',
  'Zadbaj o rytm od pierwszego słowa.',
  'Ćwiczenie pisania buduje też koncentrację.',
  'Dobry run zostawia mało błędów.',
  'Niech tempo rośnie naturalnie.',
  'Wysoka dokładność daje spokojny finisz.',
  'Każda próba trenuje inny fragment rytmu.',
  'Gracz z kontrolą szybciej wraca po błędzie.',
  'Płynne zdania są najlepszym treningiem.',
  'Wynik jest sumą rytmu, celności i skupienia.',
];

const hardTexts = [
  'Żółć konstytucyjna wywołała chwilowe zamieszanie.',
  'Pchnąć w tę łódź jeża lub ośm skrzyń fig.',
  'Konstantynopolitańczykowianeczka ćwiczyła dykcję codziennie.',
  'Szczebrzeszyn brzmi groźniej przy 120 WPM.',
  'Źdźbło żółtawej trawy zadrżało przy żwirze.',
  'Gżegżółka z Żyrardowa żartowała półgłosem.',
  'Późną nocą ćmy krążyły nad łuną neonów.',
  'Zażółć gęślą jaźń, lecz nie zgub rytmu.',
  'Chrząszcz brzmi w trzcinie, gdy gracz łapie flow.',
  'Łódź płynęła przez mgłę, śnieg i szum.',
  'Różdżkarz szepnął: sprawdź źródło drżenia.',
  'Śmiałek żonglował żetonami przy wąskim wejściu.',
  'Wciąż ćwiczysz, aż próg błędów spadnie.',
  'Nieźle, lecz żwawsze tempo wymaga ładu.',
  'Półprzymknięte źrenice śledziły błysk kursora.',
  'Gęsty żar neonów przyćmił żółty znak.',
  'Wąska ścieżka prowadziła przez półmrok.',
  'Zaćmienie krótkiej myśli zburzyło serię.',
  'Przełóż ciężar dłoni, żeby uniknąć błędu.',
  'Śrubokręt, żarówka i klucz leżały obok.',
  'Dżentelmen z Łomży pisał bez zawahania.',
  'Źrebak przeskoczył kałużę przy żwirowni.',
  'Prędkość wzrosła, choć dokładność zadrżała.',
  'Nie każde źle wpisane słowo wymaga paniki.',
  'Życzliwy sędzia śledził próbę bez mrugnięcia.',
  'Łącznik między rytmem a precyzją jest kruchy.',
  'Świeży śnieg skrzypiał pod ciężkimi butami.',
  'Pół żartu, pół próby, a wynik już płynie.',
  'Zwięzły tekst też potrafi złamać tempo.',
  'Rzężący głośnik zagłuszył ostatnią komendę.',
  'Ćwierć sekundy wystarczy, by zgubić rytm.',
  'Wóz strażacki minął żółtą łódź przy moście.',
  'Najtrudniejsze są słowa z ł, ź, ś i ż.',
  'Zręczność rośnie, gdy przestajesz walczyć.',
  'Przyspiesz, ale nie pożeraj ogonków.',
  'Źle dobrany rytm rozbije nawet prostą frazę.',
  'Ściągnij wzrok z wyniku i pisz dalej.',
  'Różnica między ę i e potrafi zaboleć.',
  'Głośny błąd nie musi kończyć dobrej rundy.',
  'Żmudne ćwiczenia tworzą lekki, szybki styl.',
  'Pamiętaj: ósemka, źródło, łąka, świt.',
  'Zakręcony przecinek wtrącił drobną pauzę.',
  'Cóż, najwyższa pora oswoić trudne znaki.',
  'Łańcuch liter pęka tam, gdzie znika uwaga.',
  'Próżny pośpiech przyniósł pięć zbędnych poprawek.',
  'Niech żółty wskaźnik nie wybije cię z rytmu.',
  'Sześć chrząszczy ćwiczyło szelest w trzcinie.',
  'Pójdźże, kiń tę chmurność w głąb flaszy.',
  'Mężny bądź, chroń pułk twój i sześć flag.',
  'Jeżu, klątw, spłódź Finom część gryzących hańb.',
  'W źdźble trawy ukrył się żwawy półton.',
  'Skrzętnie zapisany wynik zaskoczył całą drużynę.',
  'Niewdzięczny skrót klawiaturowy przerwał świetną passę.',
  'Żaden zażółcony żeton nie zastąpi skupienia.',
  'Wciąż przełączasz tempo między śmiałością a kontrolą.',
  'Błyskawiczny gracz nie gubi przecinków.',
  'Trudność rośnie, gdy zdanie skręca bez ostrzeżenia.',
  'Źródłowy rytm ukrył się w środku łamańca.',
  'Półmrok, żwir, śnieżyca; wpisz to bez wahania.',
  'Czujny mistrz śledził każde drgnięcie spacji.',
  'Nad rzeką łabędź przysiadł obok żółwia.',
  'Rozkołysany pociąg utrudniał dokładne pisanie.',
  'Świetlik mignął, gdy żeglarz liczył ósemki.',
  'Wątpienie znika, kiedy palce znają drogę.',
  'Zbyt szybkie żądło literówki zabiera punkty.',
  'Gęś, jeż i żubr ćwiczyli cichy marsz.',
  'Łódzki półfinał przyniósł zdumiewający rekord.',
  'Przedziwny szyfr zawierał ą, ć, ę oraz ź.',
  'Śmiesznie trudne zdanie potrafi wytrącić flow.',
  'Żwawo wpisz frazę, lecz zachowaj czyste znaki.',
];

export const typingTextPacks: Record<TypingDifficulty, TypingTextPack> = {
  normal: {
    difficulty: 'normal',
    label: 'NORMAL',
    accentClass: 'border-teal-300 bg-teal-300 text-slate-950 shadow-[0_0_18px_rgba(45,212,191,0.22)]',
    texts: normalTexts,
  },
  hard: {
    difficulty: 'hard',
    label: 'HARD',
    accentClass: 'border-fuchsia-300 bg-fuchsia-300 text-slate-950 shadow-[0_0_18px_rgba(217,70,239,0.24)]',
    texts: hardTexts,
  },
};

export const typingDifficultyOptions = Object.values(typingTextPacks).map(({ accentClass, difficulty, label }) => ({
  accentClass,
  label,
  value: difficulty,
}));

export const defaultTypingDifficulty: TypingDifficulty = 'normal';
export const typingDifficultyChangedEvent = 'game-hub:typing-difficulty-changed';
const typingDifficultyStorageKey = 'game-hub:typing-difficulty';

export function isTypingDifficulty(value: unknown): value is TypingDifficulty {
  return value === 'normal' || value === 'hard';
}

export function readStoredTypingDifficulty(): TypingDifficulty {
  try {
    const value = localStorage.getItem(typingDifficultyStorageKey);
    return isTypingDifficulty(value) ? value : defaultTypingDifficulty;
  } catch {
    return defaultTypingDifficulty;
  }
}

export function storeTypingDifficulty(value: TypingDifficulty): void {
  try {
    localStorage.setItem(typingDifficultyStorageKey, value);
    window.dispatchEvent(new CustomEvent(typingDifficultyChangedEvent, { detail: { difficulty: value } }));
  } catch {
    return;
  }
}

export function getTypingTexts(difficulty: TypingDifficulty): string[] {
  return typingTextPacks[difficulty]?.texts ?? typingTextPacks.normal.texts;
}

export const typingTexts = typingTextPacks.normal.texts;
