# Memo

## Postawienie projektu

### Wymagania
- docker z docker-compose
- WSL2 lub linux

### Uruchomienie
- uwaga: w WSL2 folder projektu powinien być w folderze systemu linux (/home/...) a nie w mapowanym z windows (/mnt/...)
- niektóre foldery typu `storage` czy `public` mogą wymagać zmiany uprawnień na 777
- `docker-compose up`
- otwarcie konsoli docker, np. `docker exec -it memo-php bash`
  - konsola otwiera się z użytkownika root, a użytkownik uid 1000 jest dostępny jako me
  - o ile użytkownik WSL2/linux ma uid 1000, to `su me` pozwala przełączyć na niego
  - jeżeli użytkownik ma inne uid, można stworzyć w kontenerze użytkownika o takim uid
  - analogicznie do `RUN useradd -mU -u 1000 -s /bin/bash me`
  - dzięki wykorzystaniu tego użytkownika nie będzie konfliktów dostępu
- właścicielem wszystkich plików w folderze powinien być w kontenerze `me`, poza kontenerem uzytkownik systemowy
  - jak tak nie jest, warto to zmienić
- instalacja zależności php: `composer install`
- `cp .env.example .env`
- konfiguracja bazy danych w `.env` (Mikołaj):
  - dostępne są wspólne bazy na moim serwerze fddsz_dev1, fddsz_dev2
  - w razie czego można stworzyć kolejne
  - konfiguracja, użytkownik i hasło dostępne u mnie
  - migracja bazy danych `php artisan migrate` (głównie w celu sprawdzenia połączenia z bazą, zazwyczaj będzie "nothing
    to migrate")
- w pliku `.env` warto dodać linię `L5_SWAGGER_GENERATE_ALWAYS=true`
  - w przeciwnym razie aktualizacja `/api/documentation` wymaga `php artisan l5:g`
- adres: http://localhost:9081/
- na stronie może się pojawić prośba o wygenerowanie klucza aplikacji, trzeba kliknąć, że ok

### Kompilacja frontend
- będąc w konsoli dockera, zainstaluj zależności npa: `npm install`
- budowanie projektu: `npm run build`
- development mode (HMR): `npm run dev` (serwer dostępny pod adresem podanym wyżej)

## Programowanie
- kod, komentarze, commity po angielsku
- commit message zaczyna się od numeru zadania jira (np. FZ-25)
- system po polsku, docelowo poprzez mechanizm tłumaczeń
  - nie uwzględnia innych języków, stref czasowych, formatów daty i liczb
- flow git:
  - branche wychodzą z develop, nazwa to numer zadania (np. FZ-25)
  - merge requesty (pull requesty) z przynajmniej jedną akceptacją
  - od czasu do czasu (w razie możliwości co sprint) z gałęzi develop tworzymy gałąź rc-numer
    - która trafia na środowisko test
    - poprawki gałęzi rc muszą być mergowane najpierw do rc potem do develop
  - po akceptacji, że działa stabilnie jest merge z rc do gałęzi master i wgranie na produkcję
    - poprawki gałęzi master muszą trafić najpierw na master, potem rc, potem develop
  - commity plików help mogą być po polsku
- kod w razie możliwości bazujący na immutable: const, readonly, valueObjects, funkcje itp.

### PHP
- PSR-12
- @throws dla metod rzucających wyjątki (nie dotyczy RuntimeException/ApiFatalException)
- Php Inspections (EA Extended) - jeżeli przywrócą kompatybilność z najnowszym PhpStorm'em

### Laravel
- jeżeli implementacja endpointu ma całą jedną linię, niech zostanie w kontrolerze
- unit testy i feature testy według uznania lub jeżeli są dopisane w zadaniu, że mają być

### Jira
- \[B\] - backend, \[F\] - frontend, \[K\] - praca koncepcyjna

### typescript
- strict

### Baza danych
- zgodnie z konwencją laravel'a, nazwy tabel w liczbie mnogiej
- każda tabela ma primary key typu uuid (mysql nie posiada typu uuid)
  - laravel kolumny uuid tworzy jako utf8, co jest bez sensu, więc:
  - `$table->char('id', 36)->collation('ascii_bin')->primary();`
- klucze obce (również char(36) ascii_bin) bez `delete/update cascade`
  - na kolumnach typu `not null` domyślne działanie, czyli update i delete restrict
  - na kolumnach typu `null` update restrict, delete `set null`
- laravelowe timestamps() tworzy kolumny typu `timestamp null` z zakresem do 2038
  - trzeba ręcznie dodać kolumny typu `datetime not null`
- brak wartości domyślnych oprócz null
