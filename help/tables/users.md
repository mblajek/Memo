# Users

Tabela zawiera listę osób.

Jedna fizyczna osoba powinna mieć jeden wpis w tabeli, ale możliwe jest, że tak nie będzie.

- na pewno są to:
  - pracownicy (terapeuci)
  - administratorzy placówek
- możliwe, że są to:
  - klienci (dzieci i opiekunowie)
  - profesjonaliści

### name

Nazwa osoby, not null

### email

E-mail osoby, null. Jeżeli dana osoba to jest dziecko, a ma stworzony wpis w users, to e-mail może być pusty.

Kolumna ma unique key, czyli jeżeli jest wypełniona, to musi być unikalna. Email jest również używany przy logowaniu.

### email_verified at

Datetime null, może być uzupełnione przez administratora w momencie tworzenia konta, lub poprzez email weryfikacyjny.

Zarządzane przez framework i php.

### password

Jeżeli osoba ma email i password, to może się zalogować do systemu.

### remember_token

Zarządzane przez framework, chyba służy do opcji remember_me przy logowaniu.

### last_login_facility_id

Id placówki, z której osoba ostatnio korzystała. TODO: endpoint do zmiany tej wartości.

### password_expire_at

Data wygaśnięcia hasła, będzie służyć do wyświetlania irytujących komunikatów, że hasło wymaga zmiany.

### global_admin_grant_id

Id grantu, czyli jeżeli not null, to osoba jest globalnym adminem
