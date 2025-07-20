Treść powiadomień może zawierać następujące znaczniki, które zostaną zastąpione odpowiednimi
wartościami w momencie wysyłania powiadomienia:

<!-- Keep this up to date with NotificationTemplate.php. -->

| Znacznik              | Opis                                                                                                                                               | Przykładowa wartość |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `{{facility_name}}`   | Nazwa placówki                                                                                                                                     | CPD Warszawa        |
| `{{recipient_names}}` | Imiona osób, które otrzymują to powiadomienie (zwykle jest to tylko jedno imię, chyba że kilku odbiorców ma ten sam numer telefonu do powiadomień) | Tomasz, Mikołaj     |
| `{{meeting_date}}`    | Data spotkania, razem z dniem tygodnia                                                                                                             | śr, 4.06.2025       |
| `{{meeting_time}}`    | Godzina rozpoczęcia spotkania                                                                                                                      | 15:30               |

Przykładowa treść powiadomienia może wyglądać tak:

> {{facility_name}} przypomina o wizycie {{meeting_date}} o godz. {{meeting_time}} dla: {{recipient_names}}.
> Aby odwołać, prosimy o kontakt: 22 111 11 11. Zapraszamy!

Spowoduje to wysłanie SMSa o przykładowej następującej treści:

> CPD Warszawa przypomina o wizycie śr., 4.06.2025 o godz. 15:30 dla: Tomasz, Mikołaj.
> Aby odwołać, prosimy o kontakt: 22 111 11 11. Zapraszamy!
