## $t(app_name) $t(app_version.v)0.19 {#v0.19}

Data wydania: **$$$DATE$$$**

🟢Dodano stronę [_Nieobecności_](/__facility/absences), na której można zobaczyć urlopy i zwolnienia
chorobowe wszystkich pracowników na jednym widoku. (Uwaga: nie ma obecnie możliwości wpisania
nieobecności administratorów, którzy nie posiadają własnego kalendarza.)
![Nieobecności](absences.png)

🟢Kolumnę tabeli można teraz ukryć zmniejszając jej szerokość do zera. Aby ukryć kolumnę, chwyć myszą
granicę kolumn i przeciągnij ją w lewo aż stanie się czerwona, a następnie upuść.
![Ukrycie kolumny przez przeciągnięcie](column-drag-hide.png)

🟢Na stronie pracownika dodano link, dzięki któremu można szybko przejść do jego kalendarza.
![Link "Pokaż kalendarz"](go-to-calendar.png)

🟣Administratorzy placówek mają teraz możliwość wykonywania następujących operacji:

- edycja danych pracowników i administratorów placówki, w tym resetowanie haseł,
- aktywowanie i dezaktywowanie pracowników,
- zarządzanie uprawnieniami administratora placówki.

🟣Administratorzy placówek: Przy edycji istniejącego elementu grafiku pracy należy wybrać go w górnej
części kalendarza (pokazanym na obrazku). Dotąd działało również wybieranie elementów z obszaru godzinowego,
ale zostało to zmienione.
![Edycja grafiku](timetable-edit.png)

🟣[Zapisane widoki tabeli](table-saved-views) pozwalają teraz na przełączenie w tryb zaawansowany,
w którym można tworzyć widoki częściowe. Widok częściowy pozwala np. ustawić filtry na niektórych
kolumnach bez zmiany pozostałych filtrów i innych parametrów tabeli.

🟤Informacje _Co nowego w Memo_ są teraz dostępne w dokumentacji, na stronie, którą właśnie oglądasz.
Po wydaniu nowej wersji Memo w lewym dolnym narożniku pojawi się link do aktualności.
![Link do "Co nowego"](changelog-link.png)

🟤Dokumentacja: Dodano tabelkę wyjaśniającą [uprawnienia pracownika](staff-roles#permissions-table).

🟡Poprawa bezpieczeństwa aplikacji w przypadku hasła, które zostało odkryte w wyciekach danych, albo
którego ważność wygasła.

🟡Zaimplementowano kilka dodatkowych mechanizmów zwiększających bezpieczeństwo aplikacji i jej odporność
na ewentualne ataki, m.in. skonfigurowano
[CSP (Content Security Policy)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) oraz dodano
ochronę przed
[CSRF (Cross-site request forgery)](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/CSRF_prevention).

## <!-- $$$DELETE_FROM_HERE_WHEN_FINAL$$$, $$$ADD_LOG_ABOVE_SINCE_COMMIT$$$ 42e4c40afb1d65fc0c8854a43008a12938386d1b -->

---

…

🟢 — dla wszystkich,
🟣 — dla administratorów placówki,
🔴 — dla administratorów globalnych,
🟤 — dokumentacja,
🟡 — bezpieczeństwo,
🟠🔵⚪⚫ — inne.
