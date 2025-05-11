# `$icon(actionIcons.SaveTableView)` Zapisane widoki tabeli

Widok tabeli to zapisany zestaw następujących elementów tabeli:

- pole wyszukiwania
- [wybrane kolumny](table-columns)
- [filtry kolumn](table-filtering)
- sortowanie
- [grupowanie wierszy](table-grouping)

Do zarządzania widokami tabeli służy panel widoków, otwierany przyciskiem
`$icon(actionIcons.SaveTableView)` na górze po prawej stronie tabeli.

Widok tabeli można zapisać pod wybraną nazwą, a następnie szybko przywołać klikając odpowiedni widok
w panelu zapisanych widoków.

Widoki tabeli definiuje się osobno dla każdej z tabel i raportów, i nie są współdzielone między
pracownikami.

## Kody widoku {#codes}

$include(table-saved-views-codes.part.md)

## Tryb zaawansowany {#advanced-view}

W trybie zaawansowanym możliwe jest tworzenie widoków częściowych, czyli takich, które ustawiają
niektóre z parametrów tabeli, a inne parametry pozostawiają niezmienione. Przykłady:

- widok pokazujący wszystkie kolumny danych klienta, bez zmieniania widoczności innych kolumn, i bez
  resetowania filtrów.
- widok ustawiający filtr na statusie spotkania i statusie obecności, bez modyfikowania innych filtrów.
- widok ustawiający zakres dat spotkania, bez modyfikacji jakichkolwiek innych parametrów.

Aby stworzyć filtr częściowy, przełącz panel zapisanych widoków w tryb zaawansowany (na górze po prawej stronie),
potem utwórz filtr tak, jak zazwyczaj, a następnie edytuj go (albo skorzystaj od
razu z opcji _$t(tables.saved_views.edit_and_save)_). W oknie edycji przestaw niektóre przełączniki
sterujące elementami widoku na pozycję _$t(quotes.open)$t(tables.saved_views.component_actions.ignore)$t(quotes.close)_.
To spowoduje, że przełączenie się na ten widok nie zmieni tych elementów tabeli.

Możesz też skorzystać z przycisku _$t(quotes.open)$t(tables.saved_views.component_actions.all.ignore)$t(quotes.close)_
aby przestawić wszystkie przełączniki na pozycję
_$t(quotes.open)$t(tables.saved_views.component_actions.ignore)$t(quotes.close)_, a następnie
przestawić tylko wybrane z nich z powrotem na inną pozycję.

### Kody widoku częściowego

Jeżeli użyjesz opcji kopiowania kodu widoku częściowego do schowka, skopiowany kod będzie działał również
u użytkownika, który nie ma włączonego trybu zaawansowanego, natomiast zapisanie otrzymanego widoku
stworzy dla takiego użytkownika widok standardowy, a nie częściowy.
