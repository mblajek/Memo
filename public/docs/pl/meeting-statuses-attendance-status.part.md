Każdy z uczestników spotkania ma $t(models.meeting.attendanceStatusDictId). Wartości te są ustawiane dla każdego uczestnika
niezależnie, a także niezależne od statusu spotkania (chociaż pewne kombinacje mogą być mało sensowne).

Objaśnienie poszczególnych wartości:

- **status $t(dictionary.attendanceStatus.ok)** (ok) — To jest najczęstszy status uczestnictwa, oznaczający brak szczególnych informacji
w odniesieniu do tego uczestnika.
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

### Nieobecność uczestnika

Brak któregoś z uczestników (status **$t(dictionary.attendanceStatus.too_late)**, **$t(dictionary.attendanceStatus.no_show)** lub
**$t(dictionary.attendanceStatus.cancelled)**) powoduje różne konsekwencje, zależnie od typu spotkania. Przykładowo:

- Brak uczestnika na spotkaniu terapii indywidualnej oznacza, że spotkanie nie może się odbyć, i powinno mieć status **$t(dictionary.meetingStatus.cancelled)**.
- Brak klienta na zajęciach grupowych albo brak pracownika na spotkaniu całego zespołu terapeutów nie powoduje potrzeby odwołania spotkania.
  Takie spotkanie może nadal mieć status **$t(dictionary.meetingStatus.planned)** lub **$t(dictionary.meetingStatus.completed)**,
  i tylko konkretny klient będzie miał status mówiący o tym, że nie wziął w tym spotkaniu udziału.
