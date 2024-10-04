# Raporty

Raporty są dostępne w menu _Raporty_, widocznym tylko dla administratorów placówki.

Objaśnienie dostępnych raportów:

## Raport _$t(routes.facility.meetings|cap)_ {#meetings}

Link: [/«placówka»/meetings](/__facility/meetings)

Ten raport pokazuje wszystkie spotkania w systemie, przy czym każdy wiersz tabeli odpowiada jednemu spotkaniu.

Ten raport jest odpowiedni do filtrowania spotkań po kryteriach takich jak daty, statusy, opisy, liczby uczestników.

Spotkania można [grupować](table-grouping) po niektórych kolumnach.

## Raport _$t(routes.facility.meeting_attendants|cap)_ {#meeting-attendants}

Link: [/«placówka»/meeting-attendants](/__facility/meeting-attendants)

Ten raport pokazuje wszystkie _uczestnictwa w spotkaniach_. Oznacza to, że jeżeli w systemie istnieje spotkanie z trzema uczestnikami
(np. jeden pracownik i dwoje klientów), to w tym raporcie pojawią się trzy wiersze związane z tym spotkaniem, przy czym:

- kolumny _$t(tables.tables.meeting_attendant.column_names.attendant.attendanceTypeDictId)_,
_$t(tables.tables.meeting_attendant.column_names.attendant.userId)_ i
_$t(tables.tables.meeting_attendant.column_names.attendant.attendanceStatusDictId)_ będą w tych trzech wierszach różne,
odpowiadające poszczególnym uczestnikom spotkania
- kolumny opisujące samo spotkanie (data, godzina, status spotkania, ale również lista uczestników) będą takie same w każdym z tych wierszy

W tej tabeli szczególnie użyteczne jest [grupowanie](table-grouping). Przykład: aby szybko zobaczyć liczbę spotkań,
w których uczestniczył każdy z pracowników w danym okresie:

- ustaw filtr daty spotkania na ten okres, oraz inne filtry spotkania, jak na przykład status,
- ustaw filtr kolumny _$t(models.meeting_attendant.column_names.attendant.attendanceTypeDictId)_ na
_$t(dictionaries.attendance_type.staff)_,
- włącz grupowanie według uczestnika.

## Raport _$t(routes.facility.meeting_clients|cap)_ {#meeting-clients}

Link: [/«placówka»/meeting-clients](/__facility/meeting-clients)

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
