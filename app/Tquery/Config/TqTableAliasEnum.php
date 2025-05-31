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

    case log_entries;
    case notifications;

    public static function fromTableName(string $table): self
    {
        return self::{$table};
    }

    public function baseTable(): string
    {
        return match ($this) {
            self::created_by, self::updated_by => 'users',
            self::last_login_facility, self::managed_by_facility => 'facilities',
            default => $this->name,
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
