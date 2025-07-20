# Powiadomienia o spotkaniach

Jest możliwość automatycznego wysyłania klientom przypomnień o ich spotkaniach. Obecnie wspierane
są tylko powiadomienia przez SMS.

## Konfiguracja systemu i placówki

Aby wysyłanie powiadomień było możliwe, należy zapewnić bramkę SMS, którą administrator systemu
skonfiguruje i połączy z systemem. Następnie administrator globalny musi ustawić dla placówki
pole _$t(models.facility.meetingNotificationTemplateSubject|cap)_.

$include(meeting-notifications-template.part.md)

## Klienci

Aby powiadomienia były wysyłane dla danego klienta, należy na jego profilu w polu
_$t(dictionary.notificationMethod.\_name|cap)_ wybrać wartość _$t(dictionary.notificationMethod.sms)_,
oraz wypełnić jego numer telefonu.

_Uwaga_: Włączenie lub wyłączenie powiadomień SMS dla danego klienta nie wpływa na powiadomienia dla
spotkań, które już są w systemie. Dlatego jeżeli klient wyraża lub wycofuje zgodę na wysyłanie
powiadomień, należy dokonać odpowiedniej zmiany we wszystkich jego zaplanowanych spotkaniach.
W przyszłości być może będzie opcja aby działo się to automatycznie.

## Spotkania

Podczas tworzenia spotkania, domyślnie zostają włączone powiadomienia dla klientów, którzy mają je
skonfigurowane na swoim profilu. Można jednak zmienić to ustawienie dla pojedynczego spotkania,
włączając lub wyłączając powiadomienia dla poszczególnych klientów.

## Tabela powiadomień

Administratorzy placówki mogą sprawdzić listę istniejących w systemie powiadomień pod adresem
[/«placówka»/admin/notifications](/__facility/admin/notifications). Są tam zarówno powiadomienia
wysłane, jak i te, które mają być wysłane w przyszłości, a także te, których wysłanie się nie powiodło,
razem z komunikatem błędu.
