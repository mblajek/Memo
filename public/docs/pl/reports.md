# Raporty

Raporty są dostępne w menu _Raporty_, widocznym tylko dla administratorów placówki.

Objaśnienie dostępnych raportów:

## Raport _$t(routes.facility.meetings|cap)_ {#meetings}

Ten raport pokazuje wszystkie spotkania w systemie, przy czym każdy wiersz tabeli odpowiada jednemu spotkaniu.

Ten raport jest odpowiedni do filtrowania spotkań po kryteriach takich jak daty, statusy, opisy, liczby uczestników.

## Raport _$t(routes.facility.meeting_attendants|cap)_ {#meeting-attendants}

Ten raport pokazuje wszystkie _uczestnictwa w spotkaniach_. Oznacza to, że jeżeli w systemie istnieje spotkanie z trzema uczestnikami
(np. jeden pracownik i dwoje klientów), to w tym raporcie pojawią się trzy wiersze związane z tym spotkaniem, przy czym:

- kolumny _$t(tables.tables.meeting_attendant.column_names.attendant.attendanceTypeDictId)_,
_$t(tables.tables.meeting_attendant.column_names.attendant.userId)_ i
_$t(tables.tables.meeting_attendant.column_names.attendant.attendanceStatusDictId)_ będą w tych trzech wierszach różne,
odpowiadające poszczególnym uczestnikom spotkania
- kolumny opisujące samo spotkanie (data, godzina, status spotkania, ale również lista uczestników) będą takie same w każdym z tych wierszy

W tej tabeli szczególnie użyteczne jest [grupowanie](table-grouping).

## Raport _$t(routes.facility.meeting_clients|cap)_ {#meeting-clients}

Ten raport, podobnie jak poprzedni, pokazuje _uczestnictwa w spotkaniach_, jednak tym razem są to jedynie uczestnictwa klientów
(bez pracowników). W tym raporcie widoczne są również atrybuty klienta, w tym atrybuty zdefiniowane przez placówkę.

Przykład użycia:

- W kolumnie _miasto_ wpisz `Warszawa` aby zobaczyć tylko uczestnictwa klientów z Warszawy.
  Być może chcesz ustawić także filtr na statusie spotkania oraz uczestnictwa.
- Zauważ, że jedno spotkanie może mieć wielu uczestników z Warszawy, a więc wystąpi w tak przefiltrowanej tabeli wielokrotnie.
- Następnie użyj [grupowania](table-grouping) według spotkania aby usunąć duplikaty spotkań i móc zobaczyć ostateczną liczbę spotkań,
  na których co najmniej jeden z klientów jest z Warszawy.
- Tabelę nadal można filtrować, na przykład ustawiając kryteria dla daty spotkania, albo też dla innych atrybutów klienta.
