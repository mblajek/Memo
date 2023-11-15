### Dane klienta z przykładu

- id: 1
- imię i nazwisko: Abc Abc
- płeć: kobieta
- osoby kontaktowe: Xyz Xyz
- płeć sprawców: mężczyzna, kobieta
- wiek sprawców: 35, 41
- powiat wlkp: średzki
- decyzja zespołu: abc

### Zawartość tabel

##### Client

| id | name    | gender |
|----|---------|--------|
| 1  | Abc Abc | 32     |
| 2  | Xyz Xyz | 31     |

##### Facility

| id | name   |
|----|--------|
| 11 | Poznań |

##### Dictionary

| id | name         | facility_id |
|----|--------------|-------------|
| 21 | gender       |             |
| 22 | +powiat wlkp | 1           |

##### Position

| id | dictionary_id | name       |
|----|---------------|------------|
| 31 | 21            | male       |
| 32 | 21            | female     |
| 33 | 21            | other      |
| 34 | 22            | +Poznań    |
| 35 | 22            | +poznański |
| 36 | 22            | +średzki   |

##### Attribute

może np. istnieć jeszcze kolumna regexp

| id | facility_id | table   | model  | name             | api_name                  | type    | dictionary_id | default_order | is_multi_value | requirement_level |
|----|-------------|---------|--------|------------------|---------------------------|---------|---------------|---------------|----------------|-------------------|
| 41 | null        | clients | client | gender           | gender_dict_id            | dict    | 21            | 1             | null           | recommended       |
| 42 | null        | clients | client | offender_genders | offender_genders_dict_ids | dict    | 21            | 3             | true           | empty             |
| 43 | 11          | clients | client | +powiat wlkp     | powiat_wlkp_c25b_dict_id  | dict    | 22            | 5             | false          | recommended       |
| 44 | 11          | clients | client | +decyzja zespołu | decyzja_zespolu_d2b4      | string  |               | 6             | false          | empty             |
| 45 | 11          | clients | client | +wiek sprawcy    | wiek_sprawcy_d5c1         | int     |               | 4             | true           | empty             |
| 46 | 11          | clients | client | contact_persons  | contact_persons_ids       | clients |               | 2             | true           | optional          |

##### Value

value może być rozbite na number_value, string_value, datetime_value

| id | attribute_id | object_id | position_id | client_id | value |
|----|--------------|-----------|-------------|-----------|-------|
| 52 | 42           | 1         | 31          |           |       |
| 53 | 42           | 1         | 32          |           |       |
| 54 | 43           | 1         | 36          |           |       |
| 55 | 44           | 1         |             |           | "abc" |
| 56 | 45           | 1         |             |           | "35"  |
| 57 | 45           | 1         |             |           | "41"  |
| 58 | 46           | 1         |             | 2         |       |
