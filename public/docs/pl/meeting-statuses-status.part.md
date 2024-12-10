Status spotkania jest jedną z następujących wartości:

- **$t(dictionary.meetingStatus.planned)** — Wizyta jest dodana do kalendarza i (zgodnie z aktualną wiedzą) ma się odbyć.
  Taki status powinny mieć tylko wizyty w przyszłości, potem ich status powinien zostać zaktualizowany
  (zwykle zmieniony na "$t(dictionary.meetingStatus.completed)").
- **$t(dictionary.meetingStatus.completed)** — Wizyta się odbyła. Możliwe jest, że niektórzy z uczestników nie wzięli
  w niej udziału, co jest zaznaczone jako odpowiedni $t(models.meeting.attendanceStatusDictId) (patrz poniżej).
- **$t(dictionary.meetingStatus.cancelled)** — Wizyta się nie odbyła. Powód nieodbycia się wizyty jest zwykle zaznaczony
  jako odpowiedni $t(models.meeting.attendanceStatusDictId) (patrz poniżej), ewentualnie dodatkowo w opisie wizyty.
