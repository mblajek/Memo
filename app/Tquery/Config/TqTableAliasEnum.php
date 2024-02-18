<?php

namespace App\Tquery\Config;

use App\Tquery\Engine\TqBuilder;

enum TqTableAliasEnum
{
    case created_by;
    case updated_by;
    case attendant;
    case last_login_facility;
    case members;
    case meetings;
    case meeting_attendants;
    case clients;

    public static function fromTableName(string $table): self
    {
        return self::{$table};
    }

    public function baseTable(): TqTableEnum
    {
        return match ($this) {
            self::created_by, self::updated_by, self::attendant => TqTableEnum::users,
            self::last_login_facility => TqTableEnum::facilities,
            self::members => TqTableEnum::members,
            self::meetings => TqTableEnum::meetings,
            self::meeting_attendants => TqTableEnum::meeting_attendants,
            self::clients => TqTableEnum::clients,
        };
    }

    public function applyJoin(TqBuilder $builder, TqTableEnum $joinBase, bool $left): void
    {
        $joinColumn = match ($this) {
            self::created_by, self::updated_by => $this->name,
            default => $this->name . '_id',
        };
        $builder->join($joinBase, $this, $joinColumn, $left, false);
    }
}
