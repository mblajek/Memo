# Positions

Tabela zawiera listę pozycji słowników wykorzystywanych w dowolnych miejscach aplikacji.
Przede wszystkim będą to dane klienta.

### dictionary_id

Słownik, do którego należy pozycja

### facility_id

- null
  - pozycja jest zarządzana przez administratora globalnego
  - używana przed dowolne placówki
- id placówki
  - pozycja jest zarządzana przez administratora placówki
  - pozycje przez placówkę

### name

Nazwa słownika, która może być wyświetlana w systemie

- zaczyna się od +, np. "+Rodzaj placówki", to wyświetlane jest jako "Rodzaj placówki"
- w przeciwnym razie nazwa jest brana z tłumaczeń (doctionary.{dictionary.name}.{name})

### is_fixed

Pozycja może zostać usunięta tylko migracją bazodanową, może być wykorzystana w kodzie lub w innych tabelach.

### is_disabled

Niekatywne pozycje są nadal zwracane, ale frontend nie pozwala na wprowadzenie takiej pozycji.

### default_order

Domyślna kolejność słownika, endpoint zwraca posortowane pozycje
