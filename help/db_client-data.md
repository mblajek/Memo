### Dane klienta z przykładu:

- id: 1
- imię i nazwisko: Abc Abc
- płeć: kobieta
- osoby kontaktowe: Xyz Xyz
- płeć sprawców: mężczyzna, kobieta
- wiek sprawców: 35, 41
- powiat wlkp: średzki
- decyzja zespołu: abc

### Zawartość tabel

Client:

| id | name    | gender |
|----|---------|--------|
| 1  | Abc Abc | 32     |
| 2  | Xyz Xyz | 31     |

Facility:

| id | name   |
|----|--------|
| 11 | Poznań |

Dictionary:

| id | name         | facility_id |
|----|--------------|-------------|
| 21 | gender       |             |
| 22 | +powiat wlkp | 1           |

Position:

| id | dictionary_id | name       |
|----|---------------|------------|
| 31 | 21            | male       |
| 32 | 21            | female     |
| 33 | 21            | other      |
| 34 | 22            | +Poznań    |
| 35 | 22            | +poznański |
| 36 | 22            | +średzki   |

Column (może np. istnieć jeszcze kolumna regexp):

| id | facility_id | table  | name             | dictionary_id | type     | order | is_multi |
|----|-------------|--------|------------------|---------------|----------|-------|----------|
| 41 | null        | client | gender           | 21            | position | 1     | null     |
| 42 | null        | client | offender_genders | 21            | position | 3     | true     |
| 43 | 11          | client | +powiat wlkp     | 22            | position | 5     | false    |
| 44 | 11          | client | +decyzja zespołu |               | string   | 6     | false    |
| 45 | 11          | client | +wiek sprawcy    |               | decimal0 | 4     | true     |
| 46 | 11          | client | contact_persons  |               | client   | 2     | true     |

Attribute (value może być rozbite na number_value, string_value, datetime_value):

| id | column_id | object_id | position_id | client_id | value |
|----|-----------|-----------|-------------|-----------|-------|
| 52 | 42        | 1         | 31          |           |       |
| 53 | 42        | 1         | 32          |           |       |
| 54 | 43        | 1         | 36          |           |       |
| 55 | 44        | 1         |             |           | "abc" |
| 56 | 45        | 1         |             |           | "35"  |
| 57 | 45        | 1         |             |           | "41"  |
| 58 | 46        | 1         |             | 2         |       |
