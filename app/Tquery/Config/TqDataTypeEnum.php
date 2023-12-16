<?php

namespace App\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Rules\Valid;
use App\Rules\RegexpIsValidRule;
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
    case dict;
    case text;
    // nullable
    case bool_nullable;
    case date_nullable;
    case datetime_nullable;
    case int_nullable;
    case string_nullable;
    case uuid_nullable;
    case dict_nullable;
    case text_nullable;
    //list
    case dict_list;
    case uuid_list;
    case list;
    // additional
    case count;
    case is_null;
    case is_not_null;

    public function isNullable(): bool
    {
        return match ($this) {
            self::bool_nullable, self::date_nullable, self::datetime_nullable, self::int_nullable,
            self::string_nullable, self::uuid_nullable, self::dict_nullable, self::text_nullable,
            self::dict_list, self::uuid_list, self::list => true, // list have "null" operator
            default => false,
        };
    }

    public function isDict(): bool
    {
        return match ($this) {
            self::dict, self::dict_nullable, self::dict_list => true,
            default => false,
        };
    }

    public function isList(): bool
    {
        return match ($this) {
            self::dict_list, self::uuid_list, self::list => true,
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
            self::uuid, self::text, self::dict_list, self::uuid_list, self::list => false,
            default => true,
        };
    }

    public function isAggregate(): bool
    {
        return match ($this) {
            self::count => true,
            default => false,
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
                self::uuid, self::dict => [TqFilterOperator::eq, TqFilterOperator::in],
                self::text => TqFilterOperator::LIKE,
                self::dict_list, self::uuid_list, => [TqFilterOperator::eq, ...TqFilterOperator::LIST_COLUMN],
                self::list => [],
                default => FatalExceptionFactory::tquery()->throw(),
            }
        );
    }

    public function filterValueValidator(TqColumnConfig $column, TqFilterOperator $operator): array
    {
        if (in_array($operator, TqFilterOperator::LIKE, true)) {
            return Valid::string($operator === TqFilterOperator::regexp ? [new RegexpIsValidRule()] : []);
        }
        return match ($this->notNullBaseType()) {
            self::bool => Valid::bool(),
            self::date => Valid::date(),
            self::datetime => Valid::datetime(),
            self::int => Valid::int(),
            self::string, self::text => in_array($operator, TqFilterOperator::LIKE, true)
                ? Valid::string() : Valid::trimmed(),
            self::uuid, self::uuid_list => Valid::uuid(),
            self::dict, self::dict_list => Valid::dict($column->dictionaryId),
            default => FatalExceptionFactory::tquery()->throw(),
        };
    }
}
