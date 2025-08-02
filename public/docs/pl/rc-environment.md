# Środowisko _rc_

Środowisko _rc_ (_$t(quotes.open)release candidate$t(quotes.close)_, czyli
_$t(quotes.open)kandydat do wydania$t(quotes.close)_) to osobna kopia systemu, dostępna pod innym
adresem niż główny system produkcyjny, służąca przede wszystkim do testowania nowej wersji
przed jej wydaniem. Oznacza to, że gdy przygotowywane jest wydanie nowej wersji (_release_), to
najpierw jest ona wgrana na środowisko _rc_, a dopiero po przetestowaniu i poprawieniu ewentualnych
błędów zostaje wgrana na system produkcyjny.

W czasie gdy nowa wersja nie jest testowana, na środowisku _rc_ jest ta sama wersja systemu, co
na środowisku produkcyjnym.

Środowisko _rc_ służy też jako kopia zapasowa danych — zazwyczaj system skonfigurowany
jest w taki sposób, że dane z systemu produkcyjnego są kopiowane na środowisko _rc_ automatycznie,
np. każdej nocy (chociaż mechanizm ten może być również z różnych powodów wyłączony).
Oznacza to, że na środowisku _rc_ można eksperymentować na prawdziwych danych, tworzyć i usuwać
obiekty, a wszystkie te zmiany zostaną nadpisane podczas kolejnej synchronizacji z systemem
produkcyjnym.
