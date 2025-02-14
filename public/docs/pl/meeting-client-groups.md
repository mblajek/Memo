# Spotkania — `$icon(clientGroupIcons.ClientGroup)` kontekst grupy klientów

Klient, który jest członkiem [grupy klientów](client-groups), może uczestniczyć w spotkaniu _w kontekście_
tej grupy. Przykłady:

- Rodzina z jednym lub kilkorgiem dzieci powinna być grupą klientów. Jeżeli członkowie rodziny
  (niekoniecznie wszyscy) biorą udział w spotkaniu, ich uczestnictwo jest w kontekście tej grupy
  — oznacza to, że poruszane tematy dotyczą tej rodziny.
- Członek rodziny, np. opiekun, może też wziąć udział w spotkaniu, na którym tematem nie jest jego rodzina.
  Przykładem może być grupowe spotkanie terapeutyczne, albo spotkanie dotyczące np. innych relacji klienta
  niż jego rodzina. W tej sytuacji ten klient bierze udział w spotkaniu _poza kontekstem_ grupy swojej rodziny,
  albo w kontekście innej grupy, do której należy.

Domyślnie, jeżeli klient należy do grupy, formularz tworzenia spotkania ustawia kontekst spotkania na tę grupę,
ale można ten wybór zmienić.

Ustawianie kontekstu grupy klientów na spotkaniu pozwala na [grupowanie](table-grouping) wierszy w
[Raporcie _$t(routes.facility.meeting_clients|cap)_](reports#meeting-clients) według grupy klientów,
a tym samym na przykład na policzenie grup klientów, które były kontekstem spotkań w danym okresie.
