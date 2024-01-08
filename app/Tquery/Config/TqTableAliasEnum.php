<?php

namespace App\Tquery\Config;

use App\Tquery\Engine\TqBuilder;

enum TqTableAliasEnum
{
    case created_by;
    case updated_by;
    case last_login_facility;
    case members;

    public function baseTable(): TqTableEnum
    {
        return match ($this) {
            self::created_by, self::updated_by => TqTableEnum::users,
            self::last_login_facility => TqTableEnum::facilities,
            self::members => TqTableEnum::members,
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
