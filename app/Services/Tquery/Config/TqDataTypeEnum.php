<?php

namespace App\Services\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Rules\DataTypeRule;
use App\Services\Tquery\Filter\TqFilterOperator;

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

    public function isSortable(): bool
    {
        return match ($this->notNullBaseType()) {
            self::uuid, self::text => false,
            default => true,
        };
    }

    /** @return TqFilterOperator[] */
    public function operators(): array
    {
        return array_merge(
            $this->isNullable() ? [TqFilterOperator::null] : [],
            match ($this->notNullBaseType()) {
                self::bool => [TqFilterOperator::eq],
                self::date, self::decimal0 => [
                    TqFilterOperator::eq,
                    TqFilterOperator::in,
                    ...TqFilterOperator::CMP,
                ],
                self::datetime => TqFilterOperator::CMP,
                self::string => [
                    TqFilterOperator::eq,
                    TqFilterOperator::in,
                    ...TqFilterOperator::CMP,
                    ...TqFilterOperator::LIKE,
                ],
                self::uuid => [TqFilterOperator::eq, TqFilterOperator::in],
                self::text => TqFilterOperator::LIKE,
                default => FatalExceptionFactory::tquery(),
            }
        );
    }

    public function valueValidator(): array
    {
        return match ($this->notNullBaseType()) {
            self::bool => ['bool', DataTypeRule::bool()],
            self::date => throw new \Exception('To be implemented'),
            self::datetime => throw new \Exception('To be implemented'),
            self::decimal0 => ['numeric', 'integer', DataTypeRule::int()],
            self::string, self::text => ['string'],
            self::uuid => ['string', 'uuid'],
            default => FatalExceptionFactory::tquery(),
        };
    }
}
