### Typy danych w tquery

| typ          | null(5) | = | in   | cmp | select | like | sort |
|--------------|---------|---|------|-----|--------|------|------|
| bool         | *       | * | .    | .   | *      | .    | +    |
| date         | *       | * | *    | *   | *      | .    | +    |
| datetime     | *       | . | .    | *   | *      | .    | +    |
| decimal0     | *       | * | *    | *   | *      | .    | +    |
| string       | *       | * | *    | *   | *      | *    | +    |
| uuid         | *       | * | *    | .   | *      | .    | !    |
| text         | *       | . | .    | .   | *(8)   | *    | !    |
| --------(9)  |         |   |      |     |        |      |      |
| dict(1)      | *       | * | *    | .   | *      | .    | *    |
| object(2)    | *       | . | .    | .   | *      | .    | .    |
| dict_list(3) | *       | * | *(7) | .   | *      | .    | .    |
| list(4)      | *       | . | .    | .   | *      | .    | .    |

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
