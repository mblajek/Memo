<?php

namespace App\Tquery\Config;

use App\Tquery\Engine\TqBuilder;

enum TqTableAliasEnum
{
    case created_by;
    case last_login_facility;

    public function baseTable(): TqTableEnum
    {
        return match ($this) {
            self::created_by => TqTableEnum::users,
            self::last_login_facility => TqTableEnum::facilities,
        };
    }

    public function applyJoin(TqBuilder $builder, TqTableEnum $joinBase, bool $left): void
    {
        $joinColumn = match ($this) {
            self::created_by => $this->name,
            self::last_login_facility => $this->name . '_id',
        };
        $builder->join($joinBase, $this, $joinColumn, $left);
    }
}
