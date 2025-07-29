<?php

namespace App\Tquery\Config;

use App\Tquery\Engine\TqBuilder;

enum TqTableAliasEnum
{
    case users;
    case created_by;
    case updated_by;

    case facilities;
    case last_login_facility;

    case members;
    case meetings;
    case meeting_attendants;
    case clients;
    case staff_members;
    case managed_by_facility;

    case error_log_entry;
    case log_entries;
    case notifications;
    case db_dumps_copy;

    public static function fromTableName(string $table): self
    {
        return self::{$table};
    }

    public function baseTable(): self
    {
        return match ($this) {
            self::created_by, self::updated_by => self::users,
            self::last_login_facility, self::managed_by_facility => self::facilities,
            self::error_log_entry => self::log_entries,
            default => $this,
            /* self::members => TqTableEnum::members,
            self::meetings => TqTableEnum::meetings,
            self::meeting_attendants => TqTableEnum::meeting_attendants,
            self::clients => TqTableEnum::clients, */
        };
    }

    public function applyJoin(TqBuilder $builder, TqTableAliasEnum $joinBase, bool $left): void
    {
        $joinColumn = match ($this) {
            self::created_by, self::updated_by => $this->name,
            default => $this->name . '_id',
        };
        $builder->join($joinBase, $this, $joinColumn, $left, false);
    }
}
