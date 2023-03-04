# fddsz

## Postawienie projektu

### Wymagania
- docker z docker-compose
- WSL2 lub linux

### Uruchomienie
- `cd docker` -> `docker-compose up`
- otwarcie konsoli docker, np. `docker exec -it fddsz-php bash`
  - konsola otwiera się z użytkownika root, a użytkownik uid 1000 jest dostępny jako me
  - o ile użytkownik WSL2/linux ma uid 1000, to `su me` pozwala przełączyć na niego
  - jeżeli użytkownik ma inne uid, można stworzyć w kontenerze użytkownika o takim uid
  - analogicznie do `RUN useradd -mU -u 1000 -s /bin/bash me`
  - dzięki wykorzystaniu tego użytkownika nie będzie konfliktów dostępu
- instalacja zależności php: `composer install`
- konfiguracja bazy danych (Mikołaj):
  - dostępne są wspólne bazy na moim serwerze fddsz_dev1, fddsz_dev2
  - można stworzyć kolejne
  - konfiguracja, użytkownik i hasło dostępne u mnie
- migracja bazy danych `php artisan migrate`

### Kompilacja frontend
- todo

## Programowanie
- kod, komentarze, commity po angielsku
- commit message zaczyna się od numeru zadania jira
- system po polsku, docelowo poprzez mechanizm tłumaczeń
  - nie uwzględnia innych języków, stref czasowych, formatów daty i liczb
- flow git:
  - branche wychodzą z develop, nazwa to nazwa zadania
  - merge requesty (pull requesty) puki co do mnie (Mikołaj) 
  - rc, master, produkcja: to się jeszcze okaże 

### PHP
- PSR-12
- @throws dla metod rzucających wyjątki

### typescript
- strict

### Baza danych
- zgodnie z konwencją laravel'a, nazwy tabel w liczbie mnogiej 
- każda tabela ma primary key typu uuid (mysql nie posiada typu uuid)
  - laravel kolumny guid tworzy jako utf8, co jest bez sensu, więc: 
  - `$table->char('id', 36)->collation('ascii_bin')->primary();`
- klucze obce (również char(36) ascii_bin) bez `delete/update cascade`
- brak wartości domyślnych oprócz null
