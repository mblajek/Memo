<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqDataTypeEnum;
use Closure;

class TqSelectGenerator
{
    private static function forward(string $query): string
    {
        return $query;
    }

    public static function getSelect(TqColumnConfig $columnConfig): Closure
    {
        return match ($columnConfig->type) {
            TqDataTypeEnum::is_null => fn(string $query) => "($query) is null",
            TqDataTypeEnum::is_not_null => fn(string $query) => "($query) is not null",
            default => self::forward(...),
        };
    }
}
