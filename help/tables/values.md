# Values

Wirtualna wartość kolumny dodana do obiektu, który posiada atrybut `is_multi_value` `true` lub `false`.

### attribute_id

Atrybut, którego dotyczy wartość. Pola atrybutu definiują co może być w kolumnach tabeli `values`.

### object_id

Id elementu, którego dotyczy wartość.

## Wartość

Dokładnie jedna z kolumn (`ref_dict_id`, `ref_object_id`, `string_value`, `int_value`, `datetime_value`) ma
wartość inną niż null. Jeżeli atrybut obiektu nie ma wartości, nie ma wpisu w `values`

### ref_dict_id

Jeżeli atrybut jest typu `dict`, w tym polu jest id z `positions`

### ref_object_id

Jeżeli atrybut jest typu `user`, `client` itp., w tym polu jest id obiektu wskazanego typu

### string_value

Jeżeli atrybut jest typu `string`

### int_value

Jeżeli atrybut jest typu `int` lub `bool` (wartości 1 i 0)

### datetime_value

Jeżeli atrybut jest typu `date` (południe UTC danej daty) lub `datetime`
