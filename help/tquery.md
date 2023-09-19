# Tquery

### Typy danych i operatory filtrów

| typ          | null(5) | = | in   | cmp | like | select | sort |
|--------------|---------|---|------|-----|------|--------|------|
| bool         | *       | * | .    | .   | .    | *      | +    |
| date         | *       | * | *    | *   | .    | *      | +    |
| datetime     | *       | . | .    | *   | .    | *      | +    |
| int          | *       | * | *    | *   | *    | *      | +    |
| string       | *       | * | *    | *   | *    | *      | +    |
| uuid         | *       | * | *    | .   | .    | *      | .    |
| text         | *       | . | .    | .   | *    | *(8)   | .    |
| --------(9)  |         |   |      |     |      |        |      |
| dict(1)      | *       | * | *    | .   | .    | *      | *    |
| object(2)    | *       | . | .    | .   | .    | *      | .    |
| dict_list(3) | *       | * | *(7) | .   | .    | *      | .    |
| list(4)      | *       | . | .    | .   | .    | *      | .    |

- `null` - operator poprawny tylko dla typów nullable
- `=` - porównanie z wartością tego samego typu, int-int, string-string, itp., brak możliwości porównania z null ani z
  pustym stringiem
- `==`(?) - porównanie typu binary, bardziej kosztowne dla sql'a, ale z zachowaniem wielkości liter, polskich liter,
  białych znaków
- `in` - zawiera się w niepustej liście, reguły jak dla `=`
- `cmp` - `<`, `<=`, `>`, `>=`, reguły typów jak dla `=`
- `like` - wartość to niepusty string
  - `%v`, `v%`, `%v%` - w wartości `%` i `_` są escape'owane
  - możliwy `v`, gdzie wartość nie jest escape'owana


- `(1)` - pojedyncza wartość słownikowa, zwracana jako uuid
- `(2)` - obiekt o dowolnej strukturze
- `(3)` - wiele wartości słownikowych, zwracanych jako lista uuid
- `(4)` - lista obiektów/wartości o dowolnej strukturze
- `(5)` - filtrowanie `is null`, `is not null`, dla list filtrowanie czy list.length=0
- `(7)` - all in, any in
- `(8)` - mógłby to być opcją typu substring(256), żeby nie zwracać 100 wierszy po 4kb tekstu, a może nie musi
- `(9)` - typy złożone, na później


- `+` - jest
- `!` - jest, a nie powinno być
- `!!` - jest, ale działa niepoprawnie
- `*` - powinno być
- `*?` - chyba powinno być
- `.` - nie powinno być
- `.?` - chyba nie powinno być

### Filtry &amp; i |

Wartość to niepusta lista zawierająca filtry dowolnych typów
