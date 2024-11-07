Ten raport, podobnie jak poprzedni, pokazuje _uczestnictwa w spotkaniach_, jednak tym razem są to jedynie uczestnictwa klientów
(bez pracowników). W tym raporcie widoczne są również atrybuty klienta, w tym atrybuty zdefiniowane przez placówkę.

Przykład użycia [grupowania](table-grouping) dla tej tabeli:

- W kolumnie _miasto_ wpisz `Warszawa` aby zobaczyć tylko uczestnictwa klientów z Warszawy.
Być może chcesz ustawić także filtr na statusie spotkania oraz uczestnictwa.
- Zauważ, że jedno spotkanie może mieć wielu uczestników z Warszawy, a więc wystąpi w tak przefiltrowanej tabeli wielokrotnie.
- Następnie użyj grupowania według spotkania aby usunąć duplikaty spotkań i móc zobaczyć ostateczną liczbę spotkań,
na których co najmniej jeden z klientów jest z Warszawy.
- Tabelę nadal można filtrować, na przykład ustawiając kryteria dla daty spotkania, albo też dla innych atrybutów klienta.

Tabelę można też grupować po [grupie klientów](meeting-client-groups) ustawionej jako kontekst uczestnictwa w spotkaniu.
Pozwala to policzyć grupy klientów, które były kontekstem określonych spotkań (na przykład spotkań w ostatnim kwartale).
