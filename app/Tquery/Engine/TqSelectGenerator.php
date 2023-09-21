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
            TqDataTypeEnum::is_null => fn(string $query) => "case when ($query) is null then 1 else 0 end",
            TqDataTypeEnum::is_not_null => fn(string $query) => "case when ($query) is null then 0 else 1 end",
            default => self::forward(...),
        };
    }
}
