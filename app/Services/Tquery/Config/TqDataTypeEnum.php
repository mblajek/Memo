<?php

namespace App\Services\Tquery\Config;

enum TqDataTypeEnum
{
    // todo split?
    case bool;
    case date;
    case datetime;
    case decimal0;
    case string;
    case uuid;
    case text;
    // nullable
    case bool_nullable;
    case date_nullable;
    case datetime_nullable;
    case decimal0_nullable;
    case string_nullable;
    case uuid_nullable;
    case text_nullable;
    // additional
    case is_null;
    case is_not_null;

    public function isNullable(): bool
    {
        return match ($this) {
            self::bool_nullable, self::date_nullable, self::datetime_nullable, self::decimal0_nullable,
            self::string_nullable, self::uuid_nullable, self::text_nullable => true,
            default => false,
        };
    }

    public function notNullType(): self
    {
        return match ($this) {
            self::bool_nullable => self::bool,
            self::date_nullable => self::date,
            self::datetime_nullable => self::datetime,
            self::decimal0_nullable => self::decimal0,
            self::string_nullable => self::string,
            self::uuid_nullable => self::uuid,
            self::text_nullable => self::text,
            default => $this,
        };
    }

    public function isNotBaseType(): bool
    {
        return match ($this) {
            self::is_null, self::is_not_null => true,
            default => false,
        };
    }

    public function baseType(): self
    {
        return match ($this) {
            self::is_null, self::is_not_null => self::bool,
            default => $this,
        };
    }

    public function notNullBaseType(): self
    {
        return $this->baseType()->notNullType();
    }

    public function isSortable():bool
    {
        return match ($this->notNullBaseType()) {
            self::uuid, self::text => false,
            default => true,
        };
    }
}
