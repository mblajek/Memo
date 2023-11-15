### Zawartość tabel

##### Dictionary -- nowe słowniki

| column                             | dictionary_id                        |
|------------------------------------|--------------------------------------|
| Meeting.category                   | ce12aa23-a5db-49f3-987b-d2db3ab24a3b |
| Meeting.type                       | 4cc5d6b5-5913-4e07-9fcb-09b6f3d3d2a0 |
| Meeting.status                     | 3865a3c3-0038-4668-9d55-5d05b79d7fcd |
| MeetingAttendant.attendance_status | a2874757-aca7-4c16-a0dc-2fc368f795fb |
| MeetingResource.resource           | fdb0f818-aa1e-4ed9-97cc-2a3cb1b702df |

Czyli w tabeli Attribute będą takie wpisy:

| id | facility_id | table              | model             | name              | api_name                  | type | dictionary_id | default_order | is_multi_value | requirement_level |
|----|-------------|--------------------|-------------------|-------------------|---------------------------|------|---------------|---------------|----------------|-------------------|
| #  | null        | meetings           | meeting           | category          | category_dict_id          | dict | ce1...a3b     | 1             | null           | required          |
| #  | null        | meetings           | meeting           | type              | type_dict_id              | dict | 4cc...2a0     | 1             | null           | required          |
| #  | null        | meetings           | meeting           | status            | status_dict_id            | dict | 386...fcd     | 1             | null           | required          |
| #  | null        | meeting_attendants | meeting_attendant | attendance_status | attendance_status_dict_id | dict | a28...5fb     | 1             | null           | optional          |
| #  | null        | meeting_resources  | meeting_resource  | resource          | resource_dict_id          | dict | fdb...2df     | 1             | null           | required          |

##### Meeting

| id | facility_id | category_dict_id | type_dict_id | name                  | notes            | date       | start_dayminute | duration_minutes | status_dict_id | created_by |
|----|-------------|------------------|--------------|-----------------------|------------------|------------|-----------------|------------------|----------------|------------|
| 1  | 1           | 1                | 1            |                       | Dłuższy opis ... | 2023-08-06 | 600 (10:00)     | 60               | 1              | 3          |
| 2  | 1           | 2                | 2            | Podsumowanie miesiąca |                  | 2023-19-15 | 700 (11:40)     | 150              | 2              | 3          |

##### MeetingAttendant

attendance_type - enum: client|staff|other

| id | meeting_id | user_id | attendance_type | client_family_id | attendance_status_dict_id |
|----|------------|---------|-----------------|------------------|---------------------------|
| 1  | 1          | 1       | client          | 1                | 10                        |
| 2  | 1          | 2       | staff           |                  | 12                        |

##### MeetingResource

| id | meeting_id | resource_dict_id |
|----|------------|------------------|
| 1  | 1          | 1                |
| 2  | 1          | 2                |
