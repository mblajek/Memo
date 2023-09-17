<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqDataTypeEnum;
use App\Utils\Date\DateHelper;
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
            TqDataTypeEnum::is_null => fn($query) => "case when ($query) is null then 1 else 0 end",
            TqDataTypeEnum::is_not_null => fn($query) => "case when ($query) is null then 0 else 1 end",
            default => self::forward(...),
        };
    }
}
