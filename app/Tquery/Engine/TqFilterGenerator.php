<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqDataTypeEnum;
use Closure;

class TqFilterGenerator
{
    private static function forward(string $query): ?string
    {
        return $query;
    }

    public static function getFilter(TqColumnConfig $columnConfig): Closure
    {
        return match ($columnConfig->type) {
            TqDataTypeEnum::is_null => fn(string $query) => "($query) is null",
            TqDataTypeEnum::is_not_null => fn(string $query) => "($query) is not null",
            // List filters expect an unclosed "select count(…) … and (element" prefix. A plain list
            // query yields null for an empty list, and supports only the null operator.
            TqDataTypeEnum::list => fn(string $query) => "select ($query) is not null and (true",
            default => self::forward(...),
        };
    }
}
