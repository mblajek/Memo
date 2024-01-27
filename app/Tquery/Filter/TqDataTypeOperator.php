<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Engine\TqBind;
use App\Utils\Date\DateHelper;
use Closure;

readonly class TqDataTypeOperator
{
    public function __construct(
        public TqDataTypeEnum $type,
        public TqFilterOperator $operator,
        public ?string $dictionaryId,
    ) {
    }

    public function isFilterValueList(): bool
    {
        return in_array($this->operator, TqFilterOperator::LIST_FILTER)
            || ($this->operator === TqFilterOperator::eq && $this->type->isUuidList());
    }

    public function filterValuePrepare(
        bool|int|string|array $value,
    ): bool|int|string|array {
        if ($this->type->notNullBaseType() === TqDataTypeEnum::datetime) {
            return DateHelper::zuluToDbString($value);
        }
        return $this->operator->prepareIfLikeValue($value);
    }

    public function getQuery(string $query): Closure
    {
        if ($this->type->isUuidList()) {
            // "where ... and (column" appended with "is null or true)" matches any value
            $anyValue = 'is null or true';
            return match ($this->operator) {
                TqFilterOperator::null => fn(null $bind) => "($query $anyValue)) = 0",
                TqFilterOperator::has => fn(TqBind $bind) => "($query = $bind)) != 0",
                TqFilterOperator::has_any => fn(TqBind $bind) => "($query in $bind)) != 0",
                TqFilterOperator::has_only => fn(TqBind $bind) => "($query in $bind)) = ($query $anyValue))",
                TqFilterOperator::has_all => fn(TqBind $bind) => "($query in $bind)) = {$bind->length}",
                TqFilterOperator::eq => fn(TqBind $bind) => //
                "($query in $bind)) = {$bind->length} and ($query $anyValue)) = {$bind->length}",
                default => FatalExceptionFactory::tquery()->throw(),
            };
        }
        $sqlPrefix = $this->operator->sqlPrefix();
        $sqlOperator = $this->operator->sqlOperator();
        return match ($this->operator) {
            TqFilterOperator::null => fn(null $bind) => trim("$sqlPrefix $query $sqlOperator"),
            default => fn(TqBind|null $bind) => trim("$sqlPrefix $query $sqlOperator $bind"),
        };
    }
}
