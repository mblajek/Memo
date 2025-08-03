# $t(routes.admin.db_dumps|cap)

Zrzut bazy danych to pełna kopia stanu systemu, zawierająca w sobie pełną listę placówek, pracowników,
grafików, klientów, spotkań itp. Zrzuty bazy tworzone są przede wszystkim jako kopie bezpieczeństwa,
z których można przywrócić dane w razie ich utraty wskutek awarii, błędu ludzkiego lub ataku.

Zrzuty tworzone są automatycznie, o czasie zdefiniowanym w konfiguracji serwera. Lista istniejących zrzutów
widoczna jest na stronie [/admin/db-dumps](/admin/db-dumps), dostępnej dla
[administratora globalnego](staff-roles#global-admin-role).

Na tej stronie można też utworzyć dodatkowy zrzut, a także załadować istniejący zrzut na
[środowisko rc](rc-environment).
