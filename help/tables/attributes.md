# Attributes

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

Nie jest zwracana w api

### model (tylko w api)

To samo, co w `table`, tylko w liczbie pojedynczej i camelCase: `user`, `client`, `meetingType`, etc.

### name

Nazwa kolumny, zasady tłumaczeń podobne jak dla słowników:

- zaczyna się od +, np. "+Rodzaj placówki", to wyświetlane jest jako "Rodzaj placówki"
- w przeciwnym razie nazwa jest brana z tłumaczeń (models.{model}.{name})

### api_name

Nazwa kolumny w komunikacji api

Dla kolumn opisujących kolumny tabel (`is_multi_value` === `null`), `api_name` jest nazwą kolumny w bazie danych

- dla pola, o prostym typie, name jest tym samym co `name`
- dla pola będącego id z innej tabeli jest `{name}_id`, np. `contact_person` -> `contact_person_id`
- dla pola słownikowego jest `{name}_dict_id`, np. `gender_dict_id`
- dla `is_multi_value` === true, zamiast `_id` jest `_ids`

Dla nietłumaczonych pól (typu "+Rodzaj placówki"), jakiś unikalny, ale nielosowy, ciąg znaków ascii,
np. `rodzaj_placowki_5ab5` i analogicznie `rodzaj_placowki_5ab5_id` i `rodzaj_placowki_5ab5_dict_id`

Zwracana w api jako camelCase

### type

Enum, zawierający

- standardowe typy danych: `string`, `int`, `bool`, `date`, `datetime`
- nazwy tabel: `users` (póki co tyle)
- słownik: `dict`

### type / type_model (tylko w api)

Jeżeli kolumna `type` odnosi się do tabeli, to w api jako `type` będzie zwrócona wartość przekształcona analogicznie do
pola `model`

Pole type_model - jeżeli kolumna odnosi się do tabeli, wtedy to samo co `type`, w przeciwnym razie null

### dictionary_id

Jeżeli kolumna `type` === `dict`, to ta kolumna zawiera id słownika.

### default_order

Domyślna kolejność na formularzu (rosnąco).

### is_multi_value

Możliwa ilość wystąpień w tabeli `values`

- false
  - w values może być jeden wpis
- true
  - w values może być wiele wpisów
- null
  - opisywana kolumna jest przechowywana w kolumnie opisywanej tabeli, a nie w values

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

### is_fixed

Atrybuty, które mogą być używane w kodzie, są oznaczane jako fixed. Takim przykłądem jest atrybut "kategoria"
i "długość" dla pozycji słownika typów spotkań. Backend uzupełnia na ich podstawie kategorię przy zapisie typu, frontend
ustawia domyślny czas spotkania.

Jeżeli atrybut jest multi_value=null, to nie musi być fixed. Załóżmy, że płeć klienta w jednej placówce jest wymagana,
w drugiej zalecana, a w trzeciej używa w ogóle innego słownika. Można zamiast jednego atrybutu facility_id=null, wstawić
oddzielne atrybuty dla każdej placówki. W przypadku tego typu atrybutów jednak system będzie musiał wymuszać odpowiednie
api_name, baza danych musi zawierać kolumnę tabeli.
