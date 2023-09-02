# Columns

Lista konfiguracji kolumn w systemie. W tym informacja o tym, czy dane pole jest wymagane i z jakiego słownika korzysta.

### facility_id

- null
  - kolumna jest zarządzana przez administratora globalnego
  - używana przed dowolne placówki
- id placówki
  - kolumna jest zarządzany przez administratora placówki
  - pozycje tego odnoszą się do pól występujących tylko u np. klienta tej placówki

### table

Tabela, z którą jest związana kolumna. Enum z listą tabel, opcje: `users`, `clients`, `meeting_types`, `meetings`.
Z czasem rozwijany o kolejne pozycje.

### model

To samo, co w `table`, tylko w liczbie pojedynczej: `user`, `client`, `meeting_type`, etc.

### name

Nazwa kolumny, zasady tłumaczeń podobne jak dla słowników:

- zaczyna się od +, np. "+Rodzaj placówki", to wyświetlane jest jako "Rodzaj placówki"
- w przeciwnym razie nazwa jest brana z tłumaczeń (models.{model}.{name})

### api_name

Nazwa kolumny w komunikacji api

Dla kolumn opisujących kolumny tabel (`is_attribute_multi` === `null`), `api_name` jest nazwą kolumny w bazie danych

- dla pola, o prostym typie, name jest tym samym co `name`
- dla pola będącego id z innej tabeli jest `{name}_id`, np. `contact_person` -> `contact_person_id`
- dla pola słownikowego jest `{name}_dict_id`, np. `gender_dict_id`
- dla `is_attribute_multi` === true, zamiast `_id` jest `_ids`

Dla nietłumaczonych pól (typu "+Rodzaj placówki"), jakiś unikalny, ale nielosowy, ciąg znaków ascii,
np. `rodzaj_placowki_5ab5` i analogicznie `rodzaj_placowki_5ab5_id` i `rodzaj_placowki_5ab5_dict_id`

### type

Enum, zawierający

- standardowe typy danych: `string`, `decimal0`, `decimal2`, `bool`, `date`, `datetime`
- nazwy tabel: `users` (póki co tyle)
- słownik: `dict`

### dictionary_id

Jeżeli kolumna `type` === `dict`, to ta kolumna zawiera id słownika.

### default_order

Domyślna kolejność na formularzu (rosnąco).

### is_attribute_multi

Możliwa ilość wystąpień w tabeli `attributes`

- false
  - w attributes może być jeden wpis
- true
  - w attributes może być wiele wpisów
- null
  - opisywana kolumna jest przechowywana w kolumnie opisywanej tabeli, a nie w attributes

### requirement_level

Minimalny poziom wymagalności dla danej kolumny (może być tylko modyfikowany w górę). Enum z pozycjami:

- `required` - pole wymagane, brak uzupełnienia będzie blokował zapis
- `recommended` - pole rekomendowane, brak uzupełnienia będzie generował ostrzeżenie
- `optional` - pole opcjonalne
- `empty` - pole, które powinno pozostać puste, jeżeli wypełnione, będzie się wyświetlać z ostrzeżeniem, że nie powinno

Czyli jeżeli pole odnosi się do:

- kolumny `not null`, w tabeli, to będzie `required`.
- pola, które niektórzy klienci mają `required`, a niektórzy `empty`, to będzie `empty`.
- pola, które jest `recommended`, ale w ogóle występuje tylko dla jednej placówki, będzie uzupełnione `facility_id`, a
  w `requirement_level` będzie `recommended`
