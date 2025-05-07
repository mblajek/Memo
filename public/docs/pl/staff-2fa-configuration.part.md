Administrator globalny oraz administrator placówki może skonfigurować dla każdego pracownika wymaganie
korzystania z OTP. Jeżeli dany użytkownik (np. pracownik placówki) ma korzystać z OTP, należy zaznaczyć
w formularzu edycji pole _$t(quotes.open)$t(models.user.isOtpRequired)$t(quotes.close)_. Pole
_$t(quotes.open)$t(models.user.otpRequiredAt)$t(quotes.close)_ wskazuje termin, w którym dany użytkownik
musi skonfigurować OTP, aby nie stracić dostępu do konta.

Administrator może też zresetować OTP pracownika, na przykład w sytuacji, gdy
pracownik stracił dostęp do aplikacji generującej kody. Wtedy należy też upewnić się, że
_$t(quotes.open)$t(models.user.otpRequiredAt)$t(quotes.close)_ pozwoli pracownikowi od nowa
skonfigurować dostęp.
