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
- ustaw filtr kolumny _$t(tables.tables.meeting_attendant.column_names.attendant.attendanceTypeDictId)_ na
_$t(dictionary.attendanceType.staff)_,
- włącz grupowanie według uczestnika.
