<?php

namespace App\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Rules\Valid;
use App\Tquery\Filter\TqFilterOperator;
use App\Utils\Date\DateHelper;

enum TqDataTypeEnum
{
    case bool;
    case date;
    case datetime;
    case int;
    case string;
    case uuid;
    case text;
    // nullable
    case bool_nullable;
    case date_nullable;
    case datetime_nullable;
    case int_nullable;
    case string_nullable;
    case uuid_nullable;
    case text_nullable;
    // additional
    case is_null;
    case is_not_null;

    public function isNullable(): bool
    {
        return match ($this) {
            self::bool_nullable, self::date_nullable, self::datetime_nullable, self::int_nullable,
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
            self::int_nullable => self::int,
            self::string_nullable => self::string,
            self::uuid_nullable => self::uuid,
            self::text_nullable => self::text,
            default => $this,
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
                self::date => [
                    TqFilterOperator::eq,
                    TqFilterOperator::in,
                    ...TqFilterOperator::CMP,
                ],
                self::datetime => TqFilterOperator::CMP,
                self::int, self::string => [
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

    public function filterValueValidator(TqFilterOperator $operator): array
    {
        if (in_array($operator, TqFilterOperator::LIKE)) {
            return Valid::string();
        }
        return match ($this->notNullBaseType()) {
            self::bool => Valid::bool(),
            self::date => Valid::date(),
            self::datetime => Valid::datetime(),
            self::int => Valid::int(),
            self::string, self::text => in_array($operator, TqFilterOperator::TRIMMED)
                ? Valid::trimmed() : Valid::string(),
            self::uuid => Valid::uuid(),
            default => FatalExceptionFactory::tquery(),
        };
    }

    public function filterValuePrepare(
        TqFilterOperator $operator,
        bool|int|string|array|null $value,
    ): bool|int|string|array|null {
        if ($this->notNullBaseType() === self::datetime) {
            return DateHelper::zuluToDbString($value);
        }
        if ($operator === TqFilterOperator::pv
            || $operator === TqFilterOperator::vp
            || $operator === TqFilterOperator::pvp
        ) {
            return (($operator === TqFilterOperator::pv || $operator === TqFilterOperator::pvp) ? '%' : '')
                . (is_string($value) ? str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value)
                    : (throw FatalExceptionFactory::tquery()))
                . (($operator === TqFilterOperator::vp || $operator === TqFilterOperator::pvp) ? '%' : '');
        }
        return $value;
    }
}
