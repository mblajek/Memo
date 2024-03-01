# $t(models.meeting._name|cap)

## $t(models.meeting.statusDictId|cap) {#status}

Spotkanie posiada status, który jest jedną z następujących wartości:

- **$t(dictionary.meetingStatus.planned)** — Wizyta jest dodana do kalendarza i (zgodnie z aktualną wiedzą) ma się odbyć.
  Taki status powinny mieć tylko wizyty w przyszłości, a potem ich status powinien zostać zaktualizowany
  (zwykle zmieniony na "$t(dictionary.meetingStatus.completed)").
- **$t(dictionary.meetingStatus.completed)**: — Wizyta się odbyła. Możliwe jest, że niektórzy z uczestników nie wzięli
  w niej udziału, co jest zaznaczone jako odpowiedni $t(models.meeting.attendanceStatusDictId) (patrz poniżej).
- **$t(dictionary.meetingStatus.cancelled)**: — Wizyta się nie odbyła. Powód nieodbycia się wizyty jest zwykle zaznaczony
  jako odpowiedni $t(models.meeting.attendanceStatusDictId) (patrz poniżej), ewentualnie dodatkowo w opisie wizyty.

## Uczestnicy

Uczestnikami spotkania są pracownicy placówki oraz klienci, którzy mają się spotkać. Spotkanie może mieć przypisaną
dowolną liczbę pracowników oraz dowolną liczbę klientów. Przykłady:

- Spotkanie terapeutyczne będzie zwykle miało jednego pracownika i jednego lub więcej klientów.
- Zajęcia grupowe będą miały jednego lub więcej pracownika i większą liczbę klientów.
- Spotkania wewnętrzne placówki będą miały większą liczbę pracowników i żadnych klientów.

### $t(models.meeting.attendanceStatusDictId|cap) {#attendance-status}

Każdy z uczestników spotkania posiada $t(models.meeting.attendanceStatusDictId). Wartości te są niezależne od siebie,
i niezależne od statusu spotkania (chociaż pewne kombinacje mogą być mało sensowne). Objaśnienie poszczególnych wartości:

- status **$t(dictionary.attendanceStatus.ok)** — Ten status oznacza brak dodatkowych informacji w odniesieniu do tego uczestnika.
  Dokładne znaczenie tego statusu zależy od statusu spotkania (patrz powyżej):
  - gdy spotkanie ma status **$t(dictionary.meetingStatus.planned)**,
  pełny status uczestnika to **$t(dictionary.attendanceStatus.ok) ($t(dictionary.attendanceStatus._ok_extra_info_by_meeting_status.planned))**,
  oznaczający, że ten uczestnik planuje przybyć na spotkanie.
  - gdy spotkanie ma status **$t(dictionary.meetingStatus.completed)**,
  pełny status uczestnika to **$t(dictionary.attendanceStatus.ok) ($t(dictionary.attendanceStatus._ok_extra_info_by_meeting_status.completed))**,
  oznaczający, że ten uczestnik wziął udział w spotkaniu (i był punktualny).
  - gdy spotkanie ma status **$t(dictionary.meetingStatus.cancelled)**,
  pełny status uczestnika to **$t(dictionary.attendanceStatus.ok) ($t(dictionary.attendanceStatus._ok_extra_info_by_meeting_status.cancelled))**,
  oznaczający, że uczestnik nie wziął udziału w spotkaniu ponieważ zostało ono anulowane, ale nie było to z przyczyny tego uczestnika.
  Spotkanie mogło więc zostać odwołane przez innego uczestnika lub nie odbyć się z dowolnego innego powodu.
- **$t(dictionary.attendanceStatus.late_present)** — Uczestnik wziął udział w spotkaniu, ale przyszedł na nie niepunktualnie.
- **$t(dictionary.attendanceStatus.too_late)** — Uczestnik spóźnił się tak mocno, że nie mógł wziąć udziału w spotkaniu.
  Patrz uwagi o nieobecności poniżej.
- **$t(dictionary.attendanceStatus.no_show)** — Uczestnik nie stawił się na spotkaniu, ani też nie odwołał swojej obecności.
  Patrz uwagi o nieobecności poniżej.
- **$t(dictionary.attendanceStatus.cancelled)** — Ten uczestnik poinformował z wyprzedzeniem, że nie weźmie udziału w spotkaniu.
  Patrz uwagi o nieobecności poniżej.

### Nieobecność uczestnika {#attendant-absence}

Brak któregoś z uczestników (status **$t(dictionary.attendanceStatus.too_late)**, **$t(dictionary.attendanceStatus.no_show)** lub
**$t(dictionary.attendanceStatus.cancelled)**) powoduje różne konsekwencje, zależnie od typu spotkania. Przykładowo:

- Brak uczestnika na spotkaniu terapii indywidyalnej oznacza, że spotkanie nie może się odbyć, i powinno mieć status **$t(dictionary.meetingStatus.cancelled)**.
- Brak klienta na zajęciach grupowych albo brak pracownika na spotkaniu całego zespołu terapeutów nie powoduje potrzeby odwołania spotkania.
  Takie spotkanie może nadal mieć status **$t(dictionary.meetingStatus.planned)** lub **$t(dictionary.meetingStatus.completed)**.
