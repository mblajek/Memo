# Role i uprawnienia

Osoby w bazie Memo mają przypisane role i uprawnienia. Poniżej znajduje się opis dostępnych ról.

## Role pracowników placówki {#facility-roles}

Pracownicy placówki mogą mieć przypisaną **jedną lub obie** poniższe role:

### Pracownik placówki: {#staff-role}

Osoba posiadająca swój kalendarz i biorąca udział w spotkaniach.
Również dawni pracownicy placówki muszą nadal mieć przypisaną tę rolę, aby w systemie mogły być
przechowywane ich spotkania, ale powinni mieć ustawiony status pracownika nieaktywnego.

Zwykle pracownik posiada adres email i hasło umożliwiające logowanie do systemu, chociaż można też
utworzyć pracownika, który nie ma możliwości samodzielnego logowania, a jego kalendarzem zarządza
ktoś inny, np. administrator placówki.

### Administrator placówki {#facility-admin-role}

Osoba posiadająca dostęp do dodatkowych sekcji systemu:

- $t(routes.facility.facility_admin.reports|cap) — przydatne szczególnie do tworzenia zestawień
  okresowych i do zbiorczej analizy danych.
- $t(routes.facility.facility_admin.time_tables|cap) — zarządzanie godzinami pracy placówki oraz
  pracowników, a także dniami wolnymi, urlopami/chorobami itp.

Administratorami będą więc zwykle wszystkie osoby, które nie biorą udziału w spotkaniach, a także
ci z pracowników, którzy potrzebują rozszerzonego dostępu do raportów.

## Administrator globalny {#global-admin-role}

Administrator globalny ma uprawnienia na poziomie systemu, w tym zarządzanie placówkami oraz nadawanie
i modyfikowanie uprawnień poszczególnych osób. Wykonując operacje jako administrator należy zachować
szczególną ostrożność.
