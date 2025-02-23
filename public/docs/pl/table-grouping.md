# Grupowanie wierszy tabeli

Niektóre tabele w systemie pozwalają na grupowanie danych według określonych kryteriów. Najprościej jest opisać koncept grupowania
na przykładzie.

## Przykład

Poniżej pokazana jest przykładowa tabela spotkań, która mogłaby pojawić się w raportach
(pokazano tylko kilka kolumn):

| Data       | Godzina | Kategoria   | Typ                      | Klienci                   |
| ---------- | ------- | ----------- | ------------------------ | ------------------------- |
| 2020-01-31 | 12:00   | Konsultacje | Konsultacja z parą       | Kornelia K., Krzysztof K. |
| 2020-02-01 | 10:00   | Konsultacje | Konsultacja indywidualna | Anna A.                   |
| 2020-02-01 | 11:00   | Konsultacje | Konsultacja z parą       | Maria M., Mateusz M.      |
| 2020-02-02 | 08:00   | Konsultacje | Konsultacja indywidualna | Barbara B.                |
| 2020-02-02 | 09:00   | Konsultacje | Konsultacja indywidualna | Daria D.                  |
| 2020-02-02 | 14:00   | Szkolenia   | Spotkanie edukacyjne     | —                         |

### Grupowanie po typie

Tabela spotkań może zostać pogrupowana po typie. Powoduje to połączenie wszystkich spotkań o tym samym typie w jeden wiersz —
w tym przykładzie trzy spotkania typu "Konsultacja indywidualna" zostaną połączone.

Takie połączone spotkania mają różne daty i godziny, a więc nie można wyświetlić w tych kolumnach żadnych konkretnych wartości
— zamiast tego pojawi się w nich symbol grupowania $t(tables.column_groups.grouping_symbol).
Podobnie stanie się z kolumnami pracowników, klientów, opisu itp. Natomiast kolumny typu i kategorii spotkania będą miały konkretne wartości.

Dodatkowo w pogrupowanej tabeli pojawi się kolumna _$t(tables.column_groups.count_column_label)_, mówiąca o tym, ile wierszy pierwotnej
tabeli ma dany typ spotkania.

Wynikowa tabela pogrupowana po typie:

| $t(tables.column_groups.count_column_label) | Data $t(tables.column_groups.grouping_symbol) | Godzina $t(tables.column_groups.grouping_symbol) | Kategoria   | Typ                      | Klienci $t(tables.column_groups.grouping_symbol) |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------ | ----------- | ------------------------ | ------------------------------------------------ |
| $t(tables.column_groups.grouping_symbol) 2  | $t(tables.column_groups.grouping_symbol)      | $t(tables.column_groups.grouping_symbol)         | Konsultacje | Konsultacja z parą       | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 3  | $t(tables.column_groups.grouping_symbol)      | $t(tables.column_groups.grouping_symbol)         | Konsultacje | Konsultacja indywidualna | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 1  | $t(tables.column_groups.grouping_symbol)      | $t(tables.column_groups.grouping_symbol)         | Szkolenia   | Spotkanie edukacyjne     | $t(tables.column_groups.grouping_symbol)         |

(Z przyczyn technicznych również ostatni wiersz nie wyświetla konkretnych wartości w kolumnach daty, godziny itp.,
mimo iż teoretycznie mógłby, ponieważ jest tylko jedno spotkanie typu "Spotkanie edukacyjne".)

### Inne grupowania

Tabelę można też pogrupować po kategorii. Wtedy również kolumna typu nie będzie wyświetlała konkretnych wartości:

| $t(tables.column_groups.count_column_label) | Data $t(tables.column_groups.grouping_symbol) | Godzina $t(tables.column_groups.grouping_symbol) | Kategoria   | Typ $t(tables.column_groups.grouping_symbol) | Klienci $t(tables.column_groups.grouping_symbol) |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------ | ----------- | -------------------------------------------- | ------------------------------------------------ |
| $t(tables.column_groups.grouping_symbol) 5  | $t(tables.column_groups.grouping_symbol)      | $t(tables.column_groups.grouping_symbol)         | Konsultacje | $t(tables.column_groups.grouping_symbol)     | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 1  | $t(tables.column_groups.grouping_symbol)      | $t(tables.column_groups.grouping_symbol)         | Szkolenia   | $t(tables.column_groups.grouping_symbol)     | $t(tables.column_groups.grouping_symbol)         |

Spotkania można też pogrupować po dacie:

| $t(tables.column_groups.count_column_label) | Data       | Godzina $t(tables.column_groups.grouping_symbol) | Kategoria $t(tables.column_groups.grouping_symbol) | Typ $t(tables.column_groups.grouping_symbol) | Klienci $t(tables.column_groups.grouping_symbol) |
| ------------------------------------------- | ---------- | ------------------------------------------------ | -------------------------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| $t(tables.column_groups.grouping_symbol) 1  | 2020-01-31 | $t(tables.column_groups.grouping_symbol)         | $t(tables.column_groups.grouping_symbol)           | $t(tables.column_groups.grouping_symbol)     | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 2  | 2020-02-01 | $t(tables.column_groups.grouping_symbol)         | $t(tables.column_groups.grouping_symbol)           | $t(tables.column_groups.grouping_symbol)     | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 3  | 2020-02-02 | $t(tables.column_groups.grouping_symbol)         | $t(tables.column_groups.grouping_symbol)           | $t(tables.column_groups.grouping_symbol)     | $t(tables.column_groups.grouping_symbol)         |

### Filtrowanie pogrupowanej tabeli

Kolumny, które wyświetlają jako wartość $t(tables.column_groups.grouping_symbol), nadal mogą być użyte do filtrowania. Przykładowo jeżeli
wrócimy do grupowania po typie, ale ustawimy w kolumnie daty filtr "od 2020-02-01", pierwsze spotkanie nie zostanie wzięte pod uwagę.
Dlatego w wynikowej tabeli wiersz dla typu "Konsultacja z parą" będzie miał liczbę 1 zamiast 2:

| $t(tables.column_groups.count_column_label) | Data $t(tables.column_groups.grouping_symbol) (filtrowana) | Godzina $t(tables.column_groups.grouping_symbol) | Kategoria   | Typ                      | Klienci $t(tables.column_groups.grouping_symbol) |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ | ----------- | ------------------------ | ------------------------------------------------ |
| $t(tables.column_groups.grouping_symbol) 1  | $t(tables.column_groups.grouping_symbol)                   | $t(tables.column_groups.grouping_symbol)         | Konsultacje | Konsultacja z parą       | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 3  | $t(tables.column_groups.grouping_symbol)                   | $t(tables.column_groups.grouping_symbol)         | Konsultacje | Konsultacja indywidualna | $t(tables.column_groups.grouping_symbol)         |
| $t(tables.column_groups.grouping_symbol) 1  | $t(tables.column_groups.grouping_symbol)                   | $t(tables.column_groups.grouping_symbol)         | Szkolenia   | Spotkanie edukacyjne     | $t(tables.column_groups.grouping_symbol)         |
