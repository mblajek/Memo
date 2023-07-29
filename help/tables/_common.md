# Standardowe kolumny

### id

Uuid v4, not null, primery key, wstawiana przez framework

### created_at

Datetime, not null, wstawiana przez framework

### updated_at

Datetime, not null, wstawiana i aktualizowana przez framework

### created_by

Foreign key do user.id, not null, wstawiana przez php

Użytkownik, który utworzył pozycję, elementy dodawane poza kontekstem użytkownika
mogą mieć wstawione id użytkownika system.

