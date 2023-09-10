<?php

namespace App\Services\Tquery\Config;

use Illuminate\Database\Query\Builder;

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

    public function applyJoin(Builder $builder, TqTableEnum $joinBase, bool $left): void
    {
        $tableBaseName = $this->baseTable()->name;
        $joinColumn = match ($this) {
            self::created_by => $this->name,
            self::last_login_facility => $this->name . '_id',
        };
        $builder->{$left ? 'leftJoin' : 'join'}(
            "$tableBaseName as {$this->name}",
            "{$this->name}.id",
            '=',
            "{$joinBase->name}.$joinColumn"
        );
    }
}
