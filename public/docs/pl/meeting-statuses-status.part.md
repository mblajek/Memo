Status spotkania jest jednym z następujących wartości:

- **$t(dictionary.meetingStatus.planned)** — Spotkanie jest dodane do kalendarza i (zgodnie z aktualnymi wiedzą) ma się odbyć.
  Taki status powinny mieć tylko spotkania w przyszłości, potem ich status powinien zostać zaktualizowany
  (zwykle zmieniony na "$t(dictionary.meetingStatus.completed)").
- **$t(dictionary.meetingStatus.completed)** — Spotkanie się odbyło. Możliwe jest, że niektórzy z uczestników nie wzięli
  w nim udziału, co jest zaznaczone jako odpowiedni $t(models.meeting.attendanceStatusDictId).
- **$t(dictionary.meetingStatus.cancelled)** — Spotkanie się nie odbyło. Powód nieodbycia się spotkania jest zwykle zaznaczony
  jako odpowiedni $t(models.meeting.attendanceStatusDictId), ewentualnie dodatkowo w opisie spotkania.
