# Raporty

Raporty są dostępne w menu _Raporty_, widocznym tylko dla administratorów placówki.

Objaśnienie dostępnych raportów:

## Raport _$t(routes.facility.meetings|cap)_ {#meetings}

Ten raport pokazuje wszystkie spotkania w systemie, przy czym każdy wiersz tabeli odpowiada jednemu spotkaniu.

Ten raport jest odpowiedni do filtrowania spotkań po kryteriach takich jak daty, statusy, opisy, liczby uczestników.

## Raport _$t(routes.facility.meeting_attendants|cap)_ {#meeting-attendants}

Ten raport pokazuje wszystkie _uczestnictwa w spotkaniach_. Oznacza to, że jeżeli w systemie istnieje spotkanie z trzema uczestnikami,
to w tym raporcie pojawią się trzy wiersze związane z tym spotkaniem, przy czym:

- kolumny _$t(tables.tables.meetingAttendant.columnNames.attendant.attendanceTypeDictId)_,
_$t(tables.tables.meetingAttendant.columnNames.attendant.name)_ i
_$t(tables.tables.meetingAttendant.columnNames.attendant.attendanceStatusDictId)_ będą w tych trzech wierszach różne,
odpowiadające poszczególnym uczestnikom spotkania
- kolumny opisujące samo spotkanie (data, godzina, status spotkania, ale również lista uczestników) będą takie same w każdym z tych wierszy
