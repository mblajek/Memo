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

    private static function dict(string $query): string
    {
        return "(select `default_order` from positions where `id` = ($query))";
    }

    public static function getSort(TqColumnConfig $columnConfig): Closure
    {
        return match ($columnConfig->type) {
            TqDataTypeEnum::is_null => fn(string $query) => "($query) is null",
            TqDataTypeEnum::is_not_null => fn(string $query) => "($query) is not null",
            TqDataTypeEnum::dict, TqDataTypeEnum::dict_nullable => self::dict(...),
            default => self::forward(...),
        };
    }
}
