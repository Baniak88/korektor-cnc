# Korektor CNC — wskazówki dla Claude

PWA (aplikacja webowa instalowana na Androidzie) dla operatora frezarek CNC. Właściciel: Marcin (operator CNC i lider zmiany, także web developer). Użytkownicy to operatorzy przy maszynie — interfejs po polsku, prosty język warsztatowy, duże cele dotyku.

## Struktura

- `src/head.html` — `<title>` i cały CSS (tokeny kolorów na `:root`, jasny i ciemny motyw).
- `src/body.html` — markup wszystkich zakładek; znaczniki `/*{{CORE}}*/` itd. zastępuje build.
- `src/core.js` — czysta logika bez DOM: `calcCorrection()`, `processProgram()`, parsowanie liczb. Testowana w `tests/check.js`.
- `src/data.js` — `MACHINES`, `SAMPLES` (przykładowe programy), `ALARMS`.
- `src/codes.js` — `CODES` (kody G/M z opisami) i `GLOSSARY` (słowniczek, linkowany przez `data-term="id"`).
- `src/ui.js` — zakładki, korekcja, program, kody, alarmy, arkusze, pamięć `localStorage` (klucze z prefiksem `kcnc:`).
- `src/ai.js` — zakładka AI bez kluczy API. Dwa tryby: (1) strona otwarta w Claude (artefakt https://claude.ai/artifact/YVM71eUHrsapEhqtbPeTW3) używa `claude.use("sample")` — każdy pyta AI na swoim zalogowanym koncie Claude, odpowiedź i kod pojawiają się w aplikacji; (2) zainstalowana aplikacja: składa pytanie z kontekstem maszyny (+ program), a zdjęcia i tekst przekazuje przez Web Share API (`navigator.share`) do aplikacji ChatGPT / Claude / Gemini; fallback: kopiowanie tekstu. Odpowiedź z kodem wkleja się z powrotem i trafia do zakładki Program.
- Zakładki: `start` (ekran „Co chcesz zrobić?” + wybór maszyny przy pierwszym uruchomieniu), `korekcja`, `gcode`, `ai`, `wiedza` (podwidoki kody / słowniczek / alarmy). Hash w adresie (`#alarmy`, `#kody`, `#slownik`, `#korekcja`…) otwiera właściwy widok.
- `build.py` — składa `dist/korektor-cnc/` (index.html, manifest, service worker, ikony) oraz `artifact.html` (wersja do artefaktu Claude, bez doctype). Wersja cache service workera to hash treści — nie trzeba jej podbijać ręcznie.
- Wersja w Claude (artefakt) nie aktualizuje się z GitHuba: po zmianach zbuduj `artifact.html` i opublikuj go narzędziem Artifact na ten sam URL (bez zmiany `capabilities` — artefakt ma `sample` z obrazami).
- `.github/workflows/pages.yml` — build + testy + publikacja na GitHub Pages przy każdym pushu do `main`.

## Zasady

- Po każdej zmianie: `python3 build.py && node tests/check.js`. Przy zmianie logiki w `core.js` dopisz test w `tests/check.js`.
- Wszystkie teksty interfejsu po polsku. Wyjaśniaj pojęcia (dodaj wpis do `GLOSSARY` i przycisk `?` z `data-term`).
- Kolory tylko przez tokeny CSS, z wartościami dla obu motywów. Bez emoji w interfejsie.
- Strona musi działać przy szerokości ok. 400 px bez przewijania w bok.
- Kod nie może zależeć od zewnętrznych bibliotek ani serwera. Dane użytkownika zostają w `localStorage` na telefonie. Nie dodawaj integracji wymagających kluczy API ani serwera — właściciel wybrał logowanie kontem Claude (artefakt) i udostępnianie do aplikacji AI. ChatGPT i Gemini nie pozwalają zewnętrznym aplikacjom logować się na konto użytkownika — nie proś o hasła.
- Bezpieczeństwo obróbki: nie usuwaj ostrzeżeń (łuki po zmianie, G91, G28/G53, cykle) ani przypomnień o symulacji / przejeździe na sucho. Asystent AI nigdy nie może twierdzić, że program jest bezpieczny.
- Numery i opisy alarmów oraz składnię kodów sprawdzaj w dokumentacji; jeśli nie masz pewności, napisz to w opisie zmiany zamiast zgadywać.
- Commituj po polsku, krótko, w trybie rozkazującym (np. „Dodaj alarm 1104 dla Fanuc”).
