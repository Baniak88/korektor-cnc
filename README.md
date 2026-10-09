# Korektor CNC

Aplikacja na telefon dla operatora frezarek CNC (Chiron FZ12, Matsuura MX-330, Quaser MV184 — Fanuc i Sinumerik).

- **Korekcja z pomiaru** — ile zmienić zużycie narzędzia (D/H, ΔR/ΔL), żeby wymiar wszedł w tolerancję, i gdzie to wpisać na sterowaniu.
- **Program** — poszerzanie, przesuwanie i zamiana wymiarów w G-code z podglądem zmienionych linii i ostrzeżeniami.
- **AI** — zdjęcie programu i gotowe pytanie wysyłasz przez menu Udostępnij do ChatGPT, Claude albo Gemini na telefonie (bez kluczy i opłat); odpowiedź z kodem wklejasz z powrotem do zakładki Program.
- **Start** — ekran „Co chcesz zrobić?” prowadzi do właściwego narzędzia.
- **Wiedza** — kody G/M dla Fanuc i Sinumerik z przykładami, słowniczek pojęć i najczęstsze alarmy.

Działa offline po pierwszym uruchomieniu. Wszystkie dane zostają na telefonie.

## Instalacja na Androidzie

1. Otwórz w Chrome: **https://baniak88.github.io/korektor-cnc/**
2. Menu **⋮ → Zainstaluj aplikację**.

Ikona „Korektor CNC” pojawi się na ekranie. Przytrzymanie ikony pokazuje skróty: Korekcja, Program, Alarmy.

Aktualizacje przychodzą same: po każdej zmianie w repozytorium strona publikuje się w ok. 1–2 minuty, a aplikacja pobiera nową wersję przy następnym uruchomieniu z internetem.

## Jak wprowadzać zmiany

**Przez Claude** — otwórz to repozytorium w Claude Code (claude.ai/code) i opisz, co zmienić. Claude zna strukturę projektu z pliku `CLAUDE.md`. Po zatwierdzeniu zmian na gałęzi `main` aplikacja zaktualizuje się sama.

**Przez stronę GitHub** — otwórz plik w `src/`, kliknij ołówek, zmień i zatwierdź („Commit changes”). Typowe miejsca:

| Co zmienić | Plik |
|---|---|
| Maszyny, przykładowe programy, alarmy | `src/data.js` |
| Kody G/M i słowniczek pojęć | `src/codes.js` |
| Obliczenia korekcji i zmiany programu | `src/core.js` |
| Wygląd (kolory, odstępy) | `src/head.html` |
| Układ ekranów i teksty | `src/body.html` |
| Działanie przycisków | `src/ui.js` |
| Zakładka AI (udostępnianie do aplikacji AI) | `src/ai.js` |

Postęp publikacji widać w zakładce **Actions**. Czerwony krzyżyk oznacza błąd — zmiana nie trafi do aplikacji, dopóki go nie poprawisz.

## Budowanie lokalnie

```bash
pip install pillow
python3 build.py        # tworzy dist/korektor-cnc/ i dist/korektor-cnc.zip
node tests/check.js     # sprawdza składnię i obliczenia
```

Paczkę `dist/korektor-cnc.zip` można też wgrać na własny hosting (np. folder w `public_html`). Instrukcja jest w pliku `INSTRUKCJA.txt` w paczce.

## Bezpieczeństwo

Obliczenia i odpowiedzi AI to pomoc, nie zatwierdzenie. Każdy program po zmianach sprawdź symulacją albo przejazdem na sucho z ograniczonym posuwem. Przed wysłaniem programów lub rysunków klientów do zewnętrznego AI sprawdź, czy pozwala na to firma.
