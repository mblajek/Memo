# Role i uprawnienia

## Tabela uprawnień {#permissions-table}

$include(staff-roles-permissions-table.part.md)

## Role pracowników placówki {#facility-roles}

Pracownicy placówki mogą mieć przypisaną **jedną lub obie** poniższe role:

### `$icon(staffIcons.Staff)` Pracownik placówki {#staff-role}

Osoba posiadająca swój kalendarz i biorąca udział w spotkaniach.
Również dawni pracownicy placówki muszą nadal mieć przypisaną tę rolę, aby w systemie mogły być
przechowywane ich spotkania, ale powinni mieć ustawiony status pracownika nieaktywnego.

Aktywny pracownik zwykle posiada adres email i hasło umożliwiające logowanie do systemu, chociaż można
też utworzyć pracownika, który nie ma możliwości samodzielnego logowania, a jego kalendarzem zarządza
ktoś inny, np. administrator placówki.

### `$icon(adminIcons.Admin)` Administrator placówki {#facility-admin-role}

$include(staff-roles-facility-admin-role.part.md)

## Administrator globalny {#global-admin-role}

Administrator globalny ma uprawnienia na poziomie systemu, w tym zarządzanie placówkami oraz nadawanie
i modyfikowanie uprawnień poszczególnych osób. Wykonując operacje jako administrator globalny należy
zachować _szczególną_ ostrożność.
