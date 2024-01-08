<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqDataTypeEnum;
use App\Utils\Date\DateHelper;

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
            || ($this->operator === TqFilterOperator::eq && $this->type->isList());
    }

    public function filterValuePrepare(
        bool|int|string|array $value,
    ): bool|int|string|array {
        if ($this->type->notNullBaseType() === TqDataTypeEnum::datetime) {
            return DateHelper::zuluToDbString($value);
        }
        if (in_array($this->operator, [TqFilterOperator::pv, TqFilterOperator::vp, TqFilterOperator::pvp])) {
            if (!is_string($value)) {
                throw FatalExceptionFactory::tquery();
            }
            return (($this->operator === TqFilterOperator::pv || $this->operator === TqFilterOperator::pvp) ? '%' : '')
                . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value)
                . (($this->operator === TqFilterOperator::vp || $this->operator === TqFilterOperator::pvp) ? '%' : '');
        }
        return $value;
    }
}
