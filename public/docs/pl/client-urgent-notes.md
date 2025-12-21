# Klient — $t(models.client.urgentNotes)

Pole klienta _$t(models.client.urgentNotes)_ pozwala wpisać krótkie notatki, które widoczne będą
na górze profilu klienta, a także w kalendarzu przy wszystkich jego spotkaniach. Spotkania,
w których jeden z klientów ma wypełnione pole _$t(models.client.urgentNotes)_, domyślnie są wyróżnione.
Pole to można traktować jako przypomnienie o wymaganej akcji związanej z klientem.

Przykłady zastosowania: `Pobrać zgodę RODO`, `Poprawić numer telefonu!`.

## Uwagi o niskim priorytecie

Można również utworzyć uwagę, która będzie wyświetlana na profilu klienta i w jego spotkaniach, ale
nie będzie wyróżniać spotkań w kalendarzu. Aby to zrobić, należy rozpocząć treść uwagi od znaku
`*`. Typowe zastosowanie to krótka, ważna informacja o kliencie, która jednak nie wymaga żadnych
specjalnych działań przy najbliższych spotkaniach.

Przykłady zastosowania: `* Pracownik socjalny`, `*Kurator: Jan Kowalski`.
