# API

To, co tu jest opisane, nie dotyczy pobierania plików przez API.
Tam zwrotka może być typu np. image/png i zawierać dane binarne.

### Content Type

Api zawsze zwraca odpowiedź typu `application/json` i zawiera obiekt:
może być: `{...}`, nie może być: `null`, `"..."`, `[...]` itp.

Jeżeli zwrotka będzie innego typu, np. `text/html`, to oznacza błąd po stronie be.

### Dane

Jeżeli zwrotka opisuje dane, to ma kod 200/201, oraz zwrócony obiekt zawiera pole `data`.
W tym polu znajduje się jeden obiekt z danymi lub lista obiektów.
Struktura powinna być opisana w /api/documentation.

Endpointy GET `*/list` zwracają listę obiektów, pozostałe obiekt.

Endpointy POST, jeżeli tworzą obiekt, to zwracają jego `id`. Jeżeli tworzą wiele obiektów, zwracają listę:
np `{"data":{"id":"UUID"}}`, `{"data":[{"id":"UUID"}]}`

### Struktura błędu

Jeżeli zwrotka opisuje błąd, to ma kod HTTP 4xx/5xx, oraz zwrócony obiekt zawiera pole `errors`.
W tym polu znajduje się lista błędów. Zazwyczaj jest to jeden błąd, np.:

Dla HTTP 401 może to być `{"errors":[{"code": "exception.unauthorised"}]}`

Dla HTTP 403 może to być `{"errors":[{"code": "exception.forbidden"}]}`

W obiekcie błędu mogą się znajdować pola:

- `code` występuje zawsze, jest jednocześnie kodem błędu do tłumaczenia, np. `exception.not_found`
- `data` może zawierać płaski obiekt `<string, string|string[]>` z dodatkowymi danymi związanymi z błędem.
  Te dane służą do interpolacji komunikatu dla danego `error.code`.
- `validation` może zawierać listę błędów walidacji przesłanych danych opisane w sekcji "Błędy walidacji"
- `trace` może występować tylko dla niektórych błędów dla `.env: APP_DEBUG=true`, stack trace PHP

Jeżeli zwrotka będzie HTTP 2xx i będzie zawierać pole `errors`, lub będzie 4xx/5xx i nie będzie zawierać,
to oznacza błąd po stronie be.

### Struktura błędu walidacji

Lista błędów walidacji składa się z obiektów, które mogą zawierać następujące pola:

- `field` może zawierać nazwę pola, którego dotyczy komunikat np. `name`, `children.2.name`.
  Jeżeli jest puste, to znaczy, że komunikat nie dotyczy konkretnego pola
  i należy go wyświetlić w innym miejscu formularza
- `code` występuje zawsze, jest jednocześnie kodem błędu walidacji do tłumaczenia np. `validation.required`
- `data` może zawierać płaski obiekt `<string, string|string[]>` z dodatkowymi danymi związanymi z błędem.
  Te dane służą do interpolacji komunikatu dla danego `error.validation.code`.

Przykład:

```json
{
  "errors": [
    {
      "code": "exception.validation",
      "validation": [
        {
          "field": "fieldA",
          "code": "validation.current_password"
        },
        {
          "field": "fieldB",
          "code": "validation.required_with",
          "data": {
            "values": [
              "fieldC",
              "fieldD"
            ]
          }
        },
        {
          "field": "fieldC",
          "code": "validation.same",
          "data": {
            "other": "fieldD"
          }
        },
        {
          "field": "fieldD",
          "code": "validation.multiple_of",
          "data": {
            "value": "2"
          }
        }
      ]
    }
  ]
}
```

## Uwagi do typów endpointów

### GET id

- adres endpointu `*/element/{id}`
- typowa zwrotka: `{"data":{...}}`

### GET list

- adres endpointu `*/element/list`
- endpoint `list` może przyjmować parametr `in` do filtrowania po id: `?in=UUID,UUID`
- typowa zwrotka: `{"data":[{...}]}`

### POST

- adres endpointu `*/element`
- służy do tworzenia obiektów i np. logowania użytkownika i innych
- typowa zwrotka: `{"data":{"id":"UUID"}}`, `{"errors":[]}`

### PATCH

- adres endpointu `*/element/{id}`
- przy zapisie pola, które nie przyszły, są ignorowane:
  `{name: null}` ustawia pole `name` na `null`, `{}` nie modyfikuje wartości pola `name`
- o ile to, co jest napisane powyżej jest w miarę łatwe do osiągnięcia
- typowa zwrotka: `{}`, `{"errors":[]}`

### DELETE

- adres endpointu `*/element/{id}`
- typowa zwrotka: `{}`

### PUT

- jeżeli PATCH będą się dobrze sprawdzać, to możemy w ogóle nie tworzyć PUT
