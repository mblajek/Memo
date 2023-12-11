# TQuery

Pole `filter`, o ile istnieje, zawiera obiekt filtra lub `always` (where true) lub `never` (where false)

### Typy danych i operatory filtrów

| typ kolumny      | null | = | in | has* | cmp | like | select | sort |
|------------------|------|---|----|------|-----|------|--------|------|
| **typy danych:** |
| bool             | +    | + | .  | .    | .   | .    | +      | +    |
| date             | +    | + | +  | .    | +   | .    | +      | +    |
| datetime         | +    | . | .  | .    | +   | .    | +      | +    |
| int              | +    | + | +  | .    | +   | +    | +      | +    |
| string           | +    | + | +  | .    | +   | +    | +      | +    |
| text             | +    | . | .  | .    | .   | +    | +?(8)  | .    |
| uuid             | +    | + | +  | .    | .   | .    | +      | .    |
| dict(1)          | *    | * | *  | .    | .   | .    | +      | *    |
| dict_list(3)     | *    | * | .  | *    | .   | .    | +      | .    |
| uuid_list(3)     | *    | * | .  | *    | .   | .    | +      | .    |
| list(4)          | *    | . | .  | .    | .   | .    | +      | .    |
| object(2)        | *    | . | .  | .    | .   | .    | *      | .    |
| **inne:**        |
| count(5)         | .    | . | .  | .    | .   | .    | +      | +    |

- dla wszystkich porównań `val` powinno być (zależnie od typu porównania, wartością lub listą)
  - tego samego typu co kolumna dla `bool`, `int`, `string`, `text`-`string`
  - stringiem poprawnie reprezentującą wartość (`date` - `Y-m-d`; `datetime` - `Y-m-d\TH:i:s\Z`;
   `uuid`, `dict`, `dict_list` - uuid v4)
  - dla operatorów `=`, `==` i `in` dla `string` wartość musi być strimmowana
  - wartość nie może być pustym stringiem
  - dla operatorów `has_*` wartość musi być niepustą listą
- `null` - operator poprawny tylko dla typów nullable oraz dict_list i list
  - `null` w bazie dla tego operatora daje `true`, dla wszystkich pozostałych daje `false`
  - dla kolumny typu lista, filtrowanie czy `list.length=0`
- `=` - porównanie z wartością tego samego typu, int-int, string-string
  - dla `string`, ignoruje wielkość liter i znaki diakrytyczne
- `==` (?) - porównanie typu binary, w przeciwieństwie do `=` zachowuje wielkość liter i znaki diakrytyczne
  - dotyczy tylko string'a
  - potencjalnie bardziej kosztowne dla sql'a, czyli gdy nie jest konieczne, należy używać `=`
- `in` - zawiera się w niepustej liście, reguły jak dla `=`
- `has*` (dla `has` `val` jest typu uuid, dla pozostałych typu tablica uuid):
  - `has` - lista zawiera wartość podaną w `val`
  - `has_all` - lista zawiera każdą z wartości podanych w `val`
  - `has_any` - lista zawiera co najmniej jedną z wartości podanych w `val`
  - `has_only` - lista nie zawiera żadnej wartości niepodanej w `val` (spełnia to także pusta lista)
- `cmp` - `<`, `<=`, `>`, `>=`, reguły typów jak dla `=`
- `like` - case insensitive
  - `%v`, `v%`, `%v%` - w wartości `%` i `_` są escape'owane
  - `lv` - wartość nie jest escape'owana
  - `/v/` - operator MySql `binary columnn regexp val`
- `sort` - wartości `null` są na początku dla `asc` i na końcu dla `desc`


- `(1)` - pojedyncza wartość słownikowa, zwracana jako uuid
- `(2)` - obiekt o dowolnej strukturze, ustalonej z frontendem
- `(3)` - wiele wartości słownikowych, zwracanych jako lista uuid lub lista uuid np. użytkowników
- `(4)` - lista obiektów/wartości o dowolnej strukturze, ustalonej z frontendem
- `(5)` - liczba zgrupowanych rekordów, jeżeli tquery było wywołane z opcją `distnct=true`
- `(8)` - mógłby to być opcją typu substring(256), żeby nie zwracać 100 wierszy po 4kb tekstu, a może nie musi


- `+` - jest
- `+?` - chyba jest
- `!` - jest, a nie powinno być
- `!!` - jest, ale działa niepoprawnie
- `*` - powinno być
- `*?` - chyba powinno być
- `.` - nie powinno być
- `.?` - chyba nie powinno być

### Filtry &amp; i |

Wartość to niepusta lista zawierająca filtry dowolnych typów
