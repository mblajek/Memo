# Dictionaries

Tabela zawiera listę słowników wykorzystywanych w dowolnych miejscach aplikacji.
Przede wszystkim będą to dane klienta.

### facility_id

- null
  - słownik jest zarządzany przez administratora globalnego
  - używany przed dowolne placówki
- id placówki
  - słownik jest zarządzany przez administratora placówki
  - pozycje tego słownika mogą być używane tylko przez placówkę

### name

Nazwa słownika, która może być wyświetlana w systemie

- zaczyna się od +, np. "+Rodzaj placówki", to wyświetlane jest jako "Rodzaj placówki"
- w przeciwnym razie nazwa jest brana z tłumaczeń (dictionary.{name}._name)

### is_fixed

Słownik może zostać usunięty tylko migracją bazodanową, może być wykorzystany w kodzie lub w innych tabelach.

### is_extendable

Administrator placówki lub administrator globalny może dopisywać pozycje do słownika.
