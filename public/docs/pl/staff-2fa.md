# Uwierzytelnianie dwuskładnikowe

Inne określenia: **2FA** / **MFA** ([Multi-Factor Authentication](https://pl.wikipedia.org/wiki/Uwierzytelnianie_wielosk%C5%82adnikowe)),
**OTP** ([One-Time Password](https://pl.wikipedia.org/wiki/Has%C5%82o_jednorazowe))

Uwierzytelnianie dwuskładnikowe to dodatkowe zabezpieczenie zapobiegające zalogowaniu się do systemu
przez nieuprawnioną osobę. System Memo korzysta z mechanizmu OTP, czyli hasła jednorazowego
generowanego przez aplikację na telefonie.

W praktyce oznacza to, że logując się do systemu należy wpisać adres e-mail oraz hasło,
a następnie, jeżeli OTP jest włączone dla danego użytkownika, uruchomić na swoim telefonie aplikację
(więcej szczegółów w sekcji poniżej) i wpisać pokazany w niej sześciocyfrowy kod na stronie
logowania Memo.

## Konfiguracja OTP {#admin-configuration}

$include(staff-2fa-configuration.part.md)

## Aktywacja OTP na koncie użytkownika {#configure}

### Aplikacja na telefon {#app}

Aby można było korzystać z OTP, należy zainstalować odpowiednią aplikację generującą kody jednorazowe
na swoim telefonie. Dostępnych jest wiele takich aplikacji, i nie są one w żaden sposób powiązane z Memo
$t(em_dash) są to uniwersalne aplikacje do generowania kodów jednorazowych, których można używać do
zabezpieczenia logowania również do innych serwisów (na przykład Google, Facebook, Discord, Reddit,
Kickstarter, GitHub, $t(ellipsis)).

Proponowane aplikacje (każda z nich dostępna jest na telefony z systemem Android oraz iOS):

- [Ente Auth](https://ente.io/auth/)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447?hl=pl)
- [Microsoft Authenticator](https://www.microsoft.com/pl-pl/security/mobile-authenticator-app)
- [FreeOTP Authenticator](https://freeotp.github.io/)

W razie wątpliwości do co wyboru aplikacji, skontaktuj się z administratorem.

### Procedura aktywacji OTP {#configure-steps}

1. Zainstaluj na telefonie wybraną aplikację, a następnie ją uruchom.
1. W Memo otwórz menu użytkownika `$icon(actionIcons.ThreeDots)` na górze po prawej stronie i
   wybierz opcję _$t(quotes.open)$t(actions.configure_otp)$t(quotes.close)_.
1. Potwierdź swoje aktualne hasło, aby wygenerować kod QR. Upewnij się, że osoby niepowołane
   nie mają w tym czasie dostępu do twojego ekranu.
1. W aplikacji na telefonie wybierz opcję skanowania kodu QR, a następnie zeskanuj wygenerowany kod.
1. Wpisz sześciocyfrowy kod z aplikacji w polu _$t(quotes.open)$t(models.user.otp)$t(quotes.close)_
   i potwierdź.

Od tego momentu podczas logowania do systemu wymagane będzie podanie aktualnego kodu OTP z aplikacji.
W razie problemów z logowaniem, skontaktuj się z administratorem.
