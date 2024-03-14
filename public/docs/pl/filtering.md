# Filtrowanie

Większość tabel w systemie pozwala na filtrowanie danych. Poniżej omówione jest filtrowanie kolumn niektórych typów.

## Tekst {#text}

### $t(tables.filter.textual.fuzzy|cap) {#fuzzy}

Domyślnie kolumny tekstowe filtrowanie są w trybie _$t(tables.filter.textual.fuzzy)_,
oznaczonym też symbolem **$t(tables.filter.textual.symbols.fuzzy)**.
W tym trybie działa również pole filtrujące umieszczone nad tabelą, przy czym ono filtruje po wielu kolumnach
jednocześnie.

Wpisany filtr dzielone jest na słowa, a następnie każde ze słów musi wystąpić w filtrowanej kolumnie aby wiersz tabeli
zostało wyświetlony. Najlepiej zilustrować działanie na przykładach:

| Wpisany filtr | Dopasowane wartości          | Niedopasowane wartości    | Uwagi                                                                                 |
| ------------- | ---------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `''`          | puste wartości               | niepuste wartości         | dwa pojedyncze cudzysłowy (nie jeden podwójny)                                        |
| `*`           | niepuste wartości            | puste wartości            |                                                                                       |
| `anda`        | Gandalf Szary, Gandalf Biały | Mithrandir                |                                                                                       |
| `sza an`      | Gandalf Szary                | Gandalf Biały, Mithrandir | kolejność i wielkość liter nie ma znaczenia                                           |
| `oi`          | Oin, Gloin                   |                           |                                                                                       |
| `oi*`         | Oin                          | Gloin                     | wartości zaczynające się na "oi"                                                      |
| `*en`         | Beren, Luthien               | Arwena                    | wartości kończące się na "en"                                                         |
| `*alf`        | Gandalf                      | Gandalf Szary             | wartości kończące się na "alf"                                                        |
| `t* *n`       | Thorin, Thrain               | Thror                     | wartości zaczynające się na "t" i kończące na "n"; `t*n` nie zadziała                 |
| `'f '`        | Gandalf Szary                | Gandalf                   | wartości zawierająca literę "f", a po niej spację; konieczne są pojedyncze cudzysłowy |
| `*' I'`       | Thorin I                     | Thorin II                 | wartości kończące się na " I" (spacja + "I")                                          |
