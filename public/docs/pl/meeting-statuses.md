# Statusy spotkań

W Memo spotkanie ma własny status, a niezależnie do niego każdy z uczestników (gości) ma status swojej obecności na spotkaniu.

## $t(models.meeting.statusDictId|cap) {#status}

$include(meeting-statuses-status.part.md)

## Uczestnicy

Uczestnikami spotkania są pracownicy placówki oraz klienci. Spotkanie może mieć przypisaną
dowolną liczbę pracowników oraz dowolną liczbę klientów. Przykłady:

- Spotkanie terapeutyczne będzie zwykle miało jednego pracownika i jednego lub więcej klientów.
- Zajęcia grupowe będą miały jednego lub więcej pracownika i większą liczbę klientów.
- Spotkania wewnętrzne placówki będą miały większą liczbę pracowników i zero klientów.

### $t(models.meeting.attendanceStatusDictId|cap) {#attendance-status}

$include(meeting-statuses-attendance-status.part.md)
