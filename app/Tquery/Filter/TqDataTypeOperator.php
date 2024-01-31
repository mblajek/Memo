<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Engine\Bind\TqBind;
use App\Tquery\Engine\Bind\TqListBind;
use App\Tquery\Engine\Bind\TqSingleBind;
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
}
