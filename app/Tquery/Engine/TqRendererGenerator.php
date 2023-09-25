<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Utils\Date\DateHelper;
use Closure;

class TqRendererGenerator
{
    private static function nullable(Closure $closure): Closure
    {
        return fn(?string $value) => ($value === null) ? null : $closure($value);
    }

    private static function forward(?string $value): ?string
    {
        return $value;
    }

    public static function getRenderer(TqColumnConfig $columnConfig): Closure
    {
        return match ($columnConfig->type->notNullBaseType()) {
            TqDataTypeEnum::bool => self::nullable(fn(string $value) => (bool)(int)$value),
            TqDataTypeEnum::datetime => self::nullable(fn(string $value) => DateHelper::dbToZuluString($value)),
            TqDataTypeEnum::int => self::nullable(fn(string $value) => (int)$value),
            default => self::forward(...),
        };
    }
}
