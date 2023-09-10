<?php

namespace App\Services\Tquery\Config;

enum TqDataTypeEnum
{
    case bool;
    case date;
    case datetime;
    case decimal0;
    case string;
    case uuid;
    case text;

    case is_null;
    case is_not_null;

    public function baseDataType(): self
    {
        return match ($this) {
            self::is_null, self::is_not_null => self::bool,
            default => $this,
        };
    }
}
