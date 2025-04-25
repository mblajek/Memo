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

## Konfiguracja OTP {#configuration}

$include(staff-2fa-configuration.part.md)

## Aplikacja na telefonie {#app}

Aby można było korzystać z OTP, należy zainstalować odpowiednią aplikację generującą kody jednorazowe
na swoim telefonie. Dostępnych jest wiele takich aplikacji, i nie są one w żaden sposób powiązane z Memo
$t(em_dash) są to uniwersalne aplikacje, których można używać do zabezpieczenia logowania
również do innych serwisów, na przykład Google, Facebook, Discord, Reddit, Kickstarter, GitHub, $t(ellipsis).

Poniżej opisany jest proces konfiguracji OTP w aplikacji
[Ente Auth](https://play.google.com/store/apps/details?id=io.ente.auth&hl=pl), ale podobnie wygląda on
w innych aplikacjach, na przykład
[Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=pl)
lub [FreeOTP Authenticator](https://play.google.com/store/apps/details?id=org.fedorahosted.freeotp&hl=pl)

1. Zainstaluj na telefonie aplikację [Ente Auth](https://play.google.com/store/apps/details?id=io.ente.auth&hl=pl).
1. ...
