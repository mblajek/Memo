# `$icon(clientGroupIcons.ClientGroup)` $t(models.client_group._name_plural|cap)

Klienci zapisani w systemie mogą być łączeniu w grupy. Jeden klient może należeć do kilku grup,
chociaż zazwyczaj należy do jednej, zwykle reprezentującej jego rodzinę.
Na profilu klienta wyświetlone są grupy, do których należy, wraz z linkami do profilów innych klientów
w tej grupie.

Przykłady zastosowania grup:

- Rodzice i ich dzieci powinni być jedną rodziną, tak aby można było łatwo przechodzić pomiędzy ich profilami.
- Jedna osoba będąca opiekunem większej liczby dzieci, które nie są rodziną (np. opiekun w instytucji),
  może mieć osobną grupę dla każdego z podopiecznych.

Grupa może posiadać krótki opis, który określa, jak wyświetla się ta grupa, ale można też pozostawić
opis pusty — wtedy jako nazwa grupy wyświetlane są imiona jej członków.

## Role w grupie

Każdy klient należący do grupy ma w niej _rolę_. W przypadku dzieci rola może zazwyczaj pozostać pusta,
natomiast w przypadku dorosłych można tam umieścić informacje na temat jego funkcji w tej grupie,
na przykład: "rodzic" (lub "ojciec", "matka"), "opiekun prawny", "opiekun w instytucji".
