# Usuwanie klientów

Całkowite usunięcie klienta z systemu zazwyczaj nie jest możliwe. Jeżeli klient brał udział w spotkaniach,
to nie może zostać usunięty, bo to zaburzałoby statystyki placówki dotyczące spotkań.

Poniżej opisano dostępne sposoby na usunięcie klienta.

## Usunięcie klienta, który znalazł się w systemie przypadkowo {#delete-unnecessary}

### Zduplikowani klienci {#delete-duplicate}

Może się zdarzyć, że dwa (lub więcej) wpisy na liście klientów odnoszą się do tej samej osoby. Może to być
skutkiem pomyłki (dodano klienta zamiast użyć istniejącego wpisu) lub importu z innego systemu.

Należy wtedy połączyć klientów w jeden wpis. Jest to operacja odbywająca się częściowo ręcznie, a częściowo
automatycznie — wszystkie dane klienta trzeba połączyć ręcznie, natomiast informacje o jego spotkaniach
i przynależności do grup zostaną połączone automatycznie.

Postępuj zgodnie z poniższą instrukcją:

1. Wybierz jeden z wpisów jako _**właściwy**_, czyli ten, który ma być w pełni zachowany. Nie ma
istotnego znaczenia, który z wpisów to będzie, ale warto wybrać ten, który ma najwięcej informacji,
albo ma je najbardziej aktualne.
1. W osobnym oknie przeglądarki otwórz drugi wpis — _**duplikat**_ (ten wpis będzie docelowo usunięty).
Następnie upewnij się, że wszystkie istotne informacje (dane osobowe, opis itp.) znajdujące się w _duplikacie_ są
również zapisane we _właściwym_ wpisie. Jeżeli nie, edytuj _właściwy_ wpis, aby dodać brakujące informacje.
Na tym etapie zignoruj spotkania przypisane do poszczególnych wpisów, oraz grupy klientów.
1. **Kolejne kroki może przeprowadzić tylko administrator placówki.**
Na koncie _duplikatu_ kliknij _$t(forms.client_delete.activate_button)_ i przeczytaj uważnie informacje,
które zostały wyświetlone na ekranie.
1. W polu _$t(forms.client_delete.field_names.duplicateOf|cap)_ wybierz _właściwego_ klienta jako tego,
do którego mają zostać przypisane spotkania i grupy usuwanego _duplikatu_.
1. Sprawdź, że _duplikat_ oraz _właściwy_ klient są poprawnie wybrani. Pomogą w tym linki do ich
profili widoczne na formularzu, oraz ich identyfikatory alfanumeryczne, widoczne również w pasku
adresu gdy otwarta jest strona klienta.
1. Potwierdź operację.

W efekcie tej operacji _duplikat_ zostanie usunięty, a jego spotkania zostaną przypisane do
_właściwego_ klienta. Zostanie on też przypisany do grup, w których znajdował się _duplikat_.

Ta operacja jest nieodwracalna.

### Przypadkowo dodany klient {#delete-accidental}

Jeżeli klient został utworzony przez przypadek, a na jego koncie nie ma żadnych istotnych informacji, można go usunąć.
**Może to zrobić tylko administrator placówki.**

Postępuj zgodnie z poniższą instrukcją:

1. Wejdź na stronę klienta, którego chcesz usunąć i kliknij _$t(forms.client_delete.activate_button)_.
1. Pozostaw pole _$t(forms.client_delete.field_names.duplicateOf|cap)_ puste i potwierdź usunięcie.

Jeżeli klient rzeczywiście nie miał żadnych spotkań ani innych powiązań w systemie, zostanie usunięty.

Ta operacja jest nieodwracalna.

## Anonimizacja danych {#anonymize}

Jeżeli klient żąda usunięcia swoich danych, nie można całkowicie usunąć jego konta klienta z systemu,
ponieważ zaburzałoby to statystyki spotkań. Należy wtedy usunąć jego dane wrażliwe, bez jego usuwania.

Automatyczna anonimizacja nie jest jeszcze dostępna w systemie. Aby zanonimizować klienta, edytuj
jego dane i usuń wszystkie wrażliwe informacje, takie jak dane kontaktowe i dane zgromadzone w trakcie
kontaktu z klientem. Możesz też zamienić jego imię i nazwisko na inicjały (jeżeli zmiana imienia
i nazwiska nie jest możliwa, skontaktuj się z globalnym administratorem).
