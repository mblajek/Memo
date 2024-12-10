Domyślnie kolumny tekstowe filtrowanie są w trybie _$t(tables.filter.textual.fuzzy)_,
oznaczonym też symbolem **$t(tables.filter.textual.symbols.fuzzy)**.
W tym trybie działa również pole globalnego filtra umieszczone nad tabelą, przy czym wtedy filtrowanie odbywa się
po wielu kolumnach jednocześnie.

Wpisany filtr dzielony jest na słowa, a następnie każde ze słów musi wystąpić w filtrowanej kolumnie aby wiersz tabeli został wyświetlony.
Najlepiej zilustrować działanie przykładami:

| Wpisany filtr | Znalezione wartości (dopasowane przez filtr) | Odrzucone wartości (niedopasowane przez filtr) | Uwagi                                                                                 |
| ------------- | -------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `anda`        | Gandalf Szary, Gandalf Biały                 | Mithrandir                                     |                                                                                       |
| `sza an`      | Gandalf Szary                                | Gandalf Biały, Mithrandir                      | kolejność i wielkość liter nie ma znaczenia                                           |
| `oi`          | Oin, Gloin                                   | Eowina                                         |                                                                                       |
| `oi*`         | Oin                                          | Gloin                                          | wartości zaczynające się na "oi"                                                      |
| `*en`         | Beren, Luthien                               | Arwena                                         | wartości kończące się na "en"                                                         |
| `*alf`        | Gandalf                                      | Gandalf Szary                                  | wartości kończące się na "alf"                                                        |
| `t* *n`       | Thorin, Thrain                               | Thror                                          | wartości zaczynające się na "t" i kończące na "n" (_uwaga_: `t*n` nie zadziała)       |
| `'f '`        | Gandalf Szary                                | Gandalf                                        | wartości zawierająca literę "f", a po niej spację; konieczne są pojedyncze cudzysłowy |
| `*' I'`       | Thorin I                                     | Thorin II                                      | wartości kończące się na " I" (spacja + "I")                                          |
| `*`           | wszystkie niepuste wartości                  | pusta wartość                                  |                                                                                       |
| `''`          | pusta wartość                                | wszystkie niepuste wartości                    | dwa pojedyncze cudzysłowy (nie jeden podwójny)                                        |
