# Uwierzytelnianie dwuskładnikowe

Inne określenia: **2FA** / **MFA** ([Multi-Factor Authentication](https://pl.wikipedia.org/wiki/Uwierzytelnianie_wielosk%C5%82adnikowe)),
**OTP** ([One-Time Password](https://pl.wikipedia.org/wiki/Has%C5%82o_jednorazowe))

Uwierzytelnianie dwuskładnikowe to dodatkowe zabezpieczenie zapobiegające zalogowaniu się do systemu
przez nieuprawnioną osobę. System Memo korzysta z mechanizmu OTP, czyli hasła jednorazowego
generowanego przez aplikację na telefonie.

W praktyce oznacza to, że logując się do systemu należy wpisać adres e-mail oraz hasło,
a następnie, jeżeli OTP jest włączone dla danego użytkownika, uruchomić na swoim telefonie aplikację
(więcej szczegółów w sekcji [poniżej](#app)) i wpisać pokazany w niej sześciocyfrowy kod na stronie
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

Poniżej opisany jest proces konfiguracji OTP w aplikacji [Ente Auth](https://ente.io/auth/), ale podobnie wygląda
on w innych aplikacjach, na przykład [Google Authenticator](https://support.google.com/accounts/answer/1066447?hl=pl)
lub [FreeOTP Authenticator](https://freeotp.github.io/). Każda z tych aplikacji dostępna jest na telefony
z systemem Android oraz iOS.

### Procedura aktywacji OTP {#configure-steps}

1. Zainstaluj na telefonie aplikację Ente Auth ([strona aplikacji](https://ente.io/auth/),
   [wersja na Androida](https://play.google.com/store/apps/details?id=io.ente.auth&hl=pl),
   [wersja na iOS](https://apps.apple.com/us/app/ente-auth-2fa-authenticator/id6444121398)).
1. Z menu użytkownika `$icon(actionIcons.ThreeDots)` na górze po prawej stronie wybierz opcję
   _$t(quotes.open)$t(actions.configure_otp)$t(quotes.close)_.
1. Potwierdź swoje aktualne hasło, aby wygenerować kod QR. Upewnij się, że osoby
   niepowołane nie mają w tym czasie dostępu do twojego ekranu.
1. W aplikacji na telefonie wybierz _$t(quotes.open)Zeskanuj kod QR$t(quotes.close)_, a następnie
   zeskanuj wygenerowany kod.
1. Wpisz sześciocyfrowy kod z aplikacji w polu _$t(quotes.open)$t(models.user.otp)$t(quotes.close)_
   i potwierdź.

Od tego momentu podczas logowania do systemu wymagane będzie podanie aktualnego kodu OTP z aplikacji.
W razie problemów z logowaniem, skontaktuj się z administratorem.
