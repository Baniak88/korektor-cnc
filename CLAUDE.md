# Korektor CNC — wskazówki dla Claude

PWA (aplikacja webowa instalowana na Androidzie) dla operatora frezarek CNC. Właściciel: Marcin (operator CNC i lider zmiany, także web developer). Użytkownicy to operatorzy przy maszynie — interfejs po polsku, prosty język warsztatowy, duże cele dotyku.

## Struktura

- `src/head.html` — `<title>` i cały CSS (tokeny kolorów na `:root`, jasny i ciemny motyw).
- `src/body.html` — markup wszystkich zakładek; znaczniki `/*{{CORE}}*/` itd. zastępuje build.
- `src/core.js` — czysta logika bez DOM: `calcCorrection()`, `processProgram()`, parsowanie liczb. Testowana w `tests/check.js`.
- `src/data.js` — `MACHINES`, `SAMPLES` (przykładowe programy), `ALARMS`.
- `src/codes.js` — `CODES` (kody G/M z opisami) i `GLOSSARY` (słowniczek, linkowany przez `data-term="id"`).
- `src/ui.js` — zakładki, korekcja, program, kody, alarmy, arkusze, pamięć `localStorage` (klucze z prefiksem `kcnc:`).
- `src/ai.js` — asystent AI: własny klucz (Anthropic / OpenAI / Gemini, wywołania z przeglądarki ze streamingiem SSE) albo `claude.use("sample")`, gdy strona działa jako artefakt w Claude.
- `build.py` — składa `dist/korektor-cnc/` (index.html, manifest, service worker, ikony) oraz `artifact.html` (wersja do artefaktu Claude, bez doctype). Wersja cache service workera to hash treści — nie trzeba jej podbijać ręcznie.
- `.github/workflows/pages.yml` — build + testy + publikacja na GitHub Pages przy każdym pushu do `main`.

## Zasady

- Po każdej zmianie: `python3 build.py && node tests/check.js`. Przy zmianie logiki w `core.js` dopisz test w `tests/check.js`.
- Wszystkie teksty interfejsu po polsku. Wyjaśniaj pojęcia (dodaj wpis do `GLOSSARY` i przycisk `?` z `data-term`).
- Kolory tylko przez tokeny CSS, z wartościami dla obu motywów. Bez emoji w interfejsie.
- Strona musi działać przy szerokości ok. 400 px bez przewijania w bok.
- Kod nie może zależeć od zewnętrznych bibliotek ani serwera. Dane użytkownika i klucze AI zostają w `localStorage` na telefonie — nigdy nie wpisuj kluczy do repozytorium.
- Bezpieczeństwo obróbki: nie usuwaj ostrzeżeń (łuki po zmianie, G91, G28/G53, cykle) ani przypomnień o symulacji / przejeździe na sucho. Asystent AI nigdy nie może twierdzić, że program jest bezpieczny.
- Numery i opisy alarmów oraz składnię kodów sprawdzaj w dokumentacji; jeśli nie masz pewności, napisz to w opisie zmiany zamiast zgadywać.
- Commituj po polsku, krótko, w trybie rozkazującym (np. „Dodaj alarm 1104 dla Fanuc”).
