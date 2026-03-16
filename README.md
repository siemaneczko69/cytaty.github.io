# Głosy Świata 🗣️

> Aplikacja do tworzenia i przeglądania cytatów użytkowników.

## Funkcje

- **Dodawanie cytatów** — własna treść, autor, kategoria i kolor karty
- **Przeglądanie** — siatka kart z animacjami
- **Wyszukiwanie** — po treści, autorze lub kategorii
- **Filtrowanie** — wszystkie / moje / popularne
- **Polubienia** — każdy może polubić cytat (❤)
- **Eksport** — pobierz cytaty jako JSON, CSV, XML lub TXT
- **Modal szczegółów** — kliknij kartę by zobaczyć pełny widok

## Struktura plików

```
/
├── index.html      # Struktura strony (HTML)
├── styles.css      # Style i animacje (CSS)
├── app.js          # Logika aplikacji (JavaScript)
├── quotes.json     # Dane startowe (JSON)
├── logo.svg        # Logo aplikacji (SVG)
├── favicon.svg     # Ikona przeglądarki (SVG)
├── empty.svg       # Ilustracja pustego stanu (SVG)
├── about.svg       # Ilustracja strony "O aplikacji" (SVG)
└── README.md       # Ten plik (Markdown)
```

## Technologie

| Format | Użycie |
|--------|--------|
| HTML   | Struktura interfejsu |
| CSS    | Style, animacje, zmienne kolorów |
| JS     | Logika: CRUD, filtrowanie, eksport |
| JSON   | Przechowywanie cytatów (localStorage) |
| SVG    | Logo, ilustracje, favicon |
| XML    | Eksport danych |
| CSV    | Eksport tabelaryczny |
| TXT    | Eksport tekstowy |
| Fonts  | Google Fonts (Playfair Display, DM Mono, Lato) |

## Uruchomienie

Otwórz `index.html` w przeglądarce lub wgraj pliki na hosting statyczny.

> Dane przechowywane są lokalnie w `localStorage` przeglądarki.
