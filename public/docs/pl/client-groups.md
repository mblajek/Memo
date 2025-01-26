# `$icon(clientGroupIcons.ClientGroup)` $t(models.client_group._name_plural|cap)

Klienci mogą być przypisani do grup. Jeden klient może należeć do kilku grup, chociaż zazwyczaj należy do jednej.
Na profilu klienta wyświetlone są grupy, do której należy, wraz z linkami do profilów innych klientów
należących do tej samej grupy.

Przykłady zastosowania grup:

- Rodzice i ich dzieci powinni być jedną rodziną, tak aby można było łatwo przechodzić pomiędzy ich profilami.
- Jedna osoba będąca opiekunem większej liczby dzieci, które nie są rodziną (np. opiekun w instytucji).,
  może mieć osobną grupę dla każdego z podopiecznych.

Grupa może posiadać nazwę, pod którą jest wyświetlana, ale można też pozostawić nazwę pustą — wtedy
jako nazwa grupy wyświetlane są imiona jej członków.

Każdy klient należący do grupy ma w niej _rolę_. W przypadku dzieci rola może zazwyczaj pozostać pusta,
natomiast w przypadku dorosłych można tam umieścić informacje na temat jego relacji w tej grupie,
na przykład: "rodzic", "opiekun prawny", "opiekun w instytucji".
