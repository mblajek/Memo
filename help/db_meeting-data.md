### Zawartość tabel

##### Dictionary -- nowe słowniki

| column                   | dictionary_id                        |
|--------------------------|--------------------------------------|
| MeetingType.category     | ce12aa23-a5db-49f3-987b-d2db3ab24a3b |
| Meeting.status           | 3865a3c3-0038-4668-9d55-5d05b79d7fcd |
| MeetingResource.resource | fdb0f818-aa1e-4ed9-97cc-2a3cb1b702df |

Czyli w tabeli Attribute będą takie wpisy:

| id | facility_id | table             | model            | name     | api_name         | type | dictionary_id | default_order | is_multi_value | requirement_level |
|----|-------------|-------------------|------------------|----------|------------------|------|---------------|---------------|----------------|-------------------|
| #  | null        | meeting_types     | meeting_type     | category | category_dict_id | dict | ce1...a3b     | 1             | null           | required          |
| #  | null        | meetings          | meeting          | status   | status_dict_id   | dict | 386...fcd     | 1             | null           | required          |
| #  | null        | meeting_resources | meeting_resource | resource | resource_dict_id | dict | fdb...2df     | 1             | null           | required          |

##### MeetingType

| id | facility_id | name               | category_dict_id | default_minutes |
|----|-------------|--------------------|------------------|-----------------|
| 1  | 1           | Konsultacja prawna | 1                | 60              |
| 2  |             | Konferencja        | 2                | 180             |

##### Meeting

| id | facility_id | meeting_type_id | name                  | notes            | date       | start_minutes | minutes | status_dict_id |
|----|-------------|-----------------|-----------------------|------------------|------------|---------------|---------|----------------|
| 1  | 1           | 1               |                       | Dłuższy opis ... | 2023-08-06 | 600 (10:00)   | 60      | 1              |
| 2  | 1           | 2               | Podsumowanie miesiąca |                  | 2023-19-15 | 700 (11:40)   | 150     | 2              |

##### MeetingAttendant

attendance_type - enum: client|staff|other

| id | meeting_id | user_id | attendance_type | client_family_id | has_arrived |
|----|------------|---------|-----------------|------------------|-------------|
| 1  | 1          | 1       | client          | 1                | true        |
| 2  | 1          | 2       | staff           |                  | false       |

##### MeetingResource

| id | meeting_id | resource_dict_id |
|----|------------|------------------|
| 1  | 1          | 1                |
| 2  | 1          | 2                |
