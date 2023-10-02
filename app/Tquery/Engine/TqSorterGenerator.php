<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqDataTypeEnum;
use Closure;

class TqSorterGenerator
{
    private static function forward(string $query): string
    {
        return $query;
    }

    public static function getSort(TqColumnConfig $columnConfig): Closure
    {
        return match ($columnConfig->type) {
            TqDataTypeEnum::is_null => fn($query) => "($query) is null",
            TqDataTypeEnum::is_not_null => fn($query) => "($query) is not null",
            default => self::forward(...),
        };
    }
}
