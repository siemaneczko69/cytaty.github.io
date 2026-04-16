# Głosy Świata 🗣️

> Miejsce, gdzie każdy może zostawić swój cytat — niezależnie od tego, czy ma sens, czy nie.

Prosta aplikacja webowa do zbierania i przeglądania cytatów. Bez rejestracji, bez algorytmów, bez sensu — po prostu cytaty.

---

## Funkcje

**Przeglądanie**
- Siatka kart z cytatami, animacjami i kolorami do wyboru
- Wyszukiwanie po treści i autorze
- Filtrowanie: wszystkie / popularne / wyróżnione / losuj
- Kategorie (konfigurowane przez admina)
- Tryb losowania — kolejne cytaty jednym kliknięciem

**Cytaty**
- Dodawanie własnego cytatu z autorem, kategorią i kolorem karty
- Polubienia ❤ i reakcje emoji
- Komentarze pod każdym cytatem
- Modal ze szczegółami i linkiem do udostępnienia
- Profile autorów — wszystkie cytaty danej osoby w jednym miejscu

**Eksport**
- Pobierz wszystkie cytaty jako JSON, CSV, XML lub TXT

**Inne**
- 4 motywy kolorystyczne (złoty ciemny / jasny, różowy ciemny / jasny)
- Wersja mobilna (`mobile.html`) z osobnym układem
- Formularz kontaktowy / sugestii

---

## Panel admina (`admin.html`)

Chroniony hasłem (SHA-256, przechowywane w Firebase).

- Dodawanie, edycja i usuwanie cytatów
- Historia edycji (ostatnie 2 wersje) z możliwością przywrócenia
- Wyróżnianie cytatów ⭐
- Moderacja komentarzy — edycja, usuwanie, obsługa zgłoszeń
- Przeglądanie i zarządzanie sugestiami użytkowników
- Zarządzanie kategoriami — dodawanie, zmiana nazwy, kolejność
- Zarządzanie kolorami kart — własna paleta z podglądem na żywo
- Zmiana hasła admina
- Własny motyw panelu (złoty / różowy)

---

## Struktura plików

```
/
├── index.html      # Strona główna (desktop)
├── mobile.html     # Wersja mobilna
├── admin.html      # Panel administracyjny
├── app.js          # Logika strony głównej
├── mobile.js       # Logika wersji mobilnej
├── styles.css      # Style i animacje
├── logo.png        # Logo
├── favicon.svg     # Ikona przeglądarki
├── empty.svg       # Ilustracja pustego stanu
├── about.svg       # Ilustracja zakładki Info
└── README.md       # Ten plik
```

---

## Stack

- **Vanilla JS** — zero frameworków, zero bundlerów
- **Firebase Realtime Database** — backend i przechowywanie danych
- **Google Fonts** — Playfair Display, DM Mono, Lato
- **GitHub Pages** — hosting
