# Tquery

Pole `filter`, o ile istnieje, zawiera obiekt filtra lub `always` (where true) lub `never` (where false)

### Typy danych i operatory filtrów

| typ          | null | = | in   | cmp | like | select | sort |
|--------------|------|---|------|-----|------|--------|------|
| bool         | +    | + | .    | .   | .    | +      | +    |
| date         | *    | + | *    | *   | .    | +      | +    |
| datetime     | *    | . | .    | *   | .    | +      | +    |
| int          | +    | + | +    | +   | +    | +      | +    |
| string       | +    | + | +    | +   | +    | +      | +    |
| text         | +    | . | .    | .   | +    | +?(8)  | .    |
| uuid         | +    | + | +    | .   | .    | +      | .    |
| --------(9)  |      |   |      |     |      |        |      |
| dict(1)      | *    | * | *    | .   | .    | *      | *    |
| object(2)    | *    | . | .    | .   | .    | *      | .    |
| dict_list(3) | *    | * | *(7) | .   | .    | *      | .    |
| list(4)      | *    | . | .    | .   | .    | *      | .    |

- dla wszystkich porównań `val` powinno być (zależnie od typu porównania, wartością lub listą)
  - tego samego typu co kolumna dla `bool`, `int`, `string`, `text`-`string`
  - stringiem poprawnie reprezentującą wartość (`date` - `Y-m-d`, `datetime` - `Y-m-d\TH:i:s\Z`, `uuid` - uuid v4)
  - dla operatorów `=`, `==` i `in` dla `string` wartość musi być strimmowana
  - wartość nie może być pustym stringiem
- `null` - operator poprawny tylko dla typów nullable oraz list
  - `null` w bazie dla tego operatora daje `true`, dla wszystkich pozostałych daje `false`
  - dla kolumny typu lista, filtrowanie czy `list.length=0`
- `=` - porównanie z wartością tego samego typu, int-int, string-string
  - dla `string`, ignoruje wielkość liter i znaki diakrytyczne
- `==`(?) - porównanie typu binary, w przeciwieństwie do `=` zachowuje wielkość liter i znaki diakrytyczne
  - dotyczy tylko string'a
  - potencjalnie bardziej kosztowne dla sql'a, czyli gdy nie jest konieczne, należy używać `=`
- `in` - zawiera się w niepustej liście, reguły jak dla `=`
- `cmp` - `<`, `<=`, `>`, `>=`, reguły typów jak dla `=`
- `like` - case insensitive
  - `%v`, `v%`, `%v%` - w wartości `%` i `_` są escape'owane
  - `lv` - wartość nie jest escape'owana
  - `/v/` - operator MySql `binary columnn regexp val`
- `sort` - wartości `null` są na początku dla `asc` i na końcu dla `desc`


- `(1)` - pojedyncza wartość słownikowa, zwracana jako uuid
- `(2)` - obiekt o dowolnej strukturze
- `(3)` - wiele wartości słownikowych, zwracanych jako lista uuid
- `(4)` - lista obiektów/wartości o dowolnej strukturze
- `(7)` - all in, any in
- `(8)` - mógłby to być opcją typu substring(256), żeby nie zwracać 100 wierszy po 4kb tekstu, a może nie musi
- `(9)` - typy złożone, na później


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
