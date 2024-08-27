# Grafiki pracy

Grafikami pracy zarządza się na dwóch stronach:

## $t(routes.facility.facility_admin.time_tables_calendar|cap) {#calendar}

Link: [/«placówka»/admin/time-tables](/__facility/admin/time-tables)

Kalendarz na tej stronie nie pokazuje spotkań, natomiast pozwala edytować i tworzyć grafiki pracy.
Grafiki pracy wyświetlone są w kalendarzu w sposób podobny jak spotkania, a po wskazaniu kursorem
myszy zaznaczone są niebieską ramką. Poszczególne wpisy można kliknąć i edytować.

_Uwaga:_ Jeżeli wpis trudno jest wskazać myszą w głównym obszarze kalendarza tygodniowego lub
dziennego, można go wybrać w górnej części tego kalendarza klikając odpowiednie godziny,
albo w kalendarzu miesięcznym.

W grafiku mogą się pojawić cztery typy wpisów:

- Godziny pracy placówki — oznaczone jasnym szarym kolorem.
- Godziny pracy pracownika — oznaczone na biało.
- Dni lub godziny wolne pracownika — oznaczone gęstszym kreskowaniem. W ten sposób należy oznaczać
  urlopy, choroby i inne okoliczności niepozwalające pracownikowi na pracę. Można na przykład
  oznaczyć kilkugodzinne zwolnienie związane z oddawaniem krwi.
- Dni lub godziny wolne całej placówki — oznaczone rzadkim kreskowaniem. W ten sposób warto
  oznaczyć dni lub godziny, w które z jakiegoś wyjątkowego powodu placówka jest zamknięta.
  Można też zrezygnować całkowicie ze stosowania wpisów tego typu, a zamiast tego usuwać
  lub zmieniać godziny pracy placówki w tych dniach.

Dni i godziny wolne (urlopy, choroby), zarówno pracownika jak i placówki, można tworzyć w seriach,
podobnie jak spotkania. Dzięki temu można stworzyć kilkudniowy urlop.

Dni i godziny wolne mają wyższy priorytet niż godziny pracy. Jeżeli pracownik zgłasza urlop,
należy utworzyć wpisy o dniach wolnych, natomiast nie należy przy tym usuwać jego standardowych
godzin pracy z grafiku.

## $t(routes.facility.facility_admin.time_tables_weekly|cap) {#weekly}

Link: [/«placówka»/admin/time-tables/weekly](/__facility/admin/time-tables/weekly)

Na tej stronie można zarządzać godzinami pracy pracowników oraz placówki w formie tygodniowej.
Nie jest możliwe edytowanie ani tworzenie wpisów (do tego służy widok opisany powyżej), natomiast
widok tygodniowy pozwala na realizowanie następujących scenariuszy:

- Przeglądanie godzin pracy pracownika lub placówki w dłuższym okresie, w formie tabeli.
- Kopiowanie grafików z danego tygodnia na inne tygodnie (również co drugi tydzień).
- Przedłużanie grafików na kolejne tygodnie w przyszłości.
- Usuwanie grafików z określonego tygodnia lub zakresu tygodni (również co drugi tydzień).

Operacje na grafikach są dostępne pod przyciskiem akcji **`[⋯]`** w poszczególnych wierszach
tabeli. Niektóre akcje dostępne są bezpośrednio w rozwijanym menu, natomiast inne akcje wymagają
kliknięcia **`[⋯]`** w wierszu źródłowym i wybraniu zaznaczenia, a potem kliknięcia **`[⋯]`**
w wierszu docelowym i wybraniu odpowiedniej akcji.

Informacje w pojawiających się oknach dialogowych należy czytać uważnie, ponieważ operacje na
grafikach nie mogą zostać cofnięte.
