<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Rules\Valid;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Engine\Bind\TqBind;
use App\Tquery\Engine\Bind\TqListBind;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Validation\Rule;

readonly class TqRequestFilterColumn extends TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, string $path): self
    {
        $column = $config->columns[self::validate($data, [
            'column' => Valid::trimmed([Rule::in(array_keys($config->getFilterableColumns()))]),
        ], $path)];
        $operatorsNames = array_map(fn(TqFilterOperator $operator) => $operator->value, $column->type->operators());
        $params = self::validate($data, [
            'op' => Valid::trimmed([Rule::in($operatorsNames)]),
            'inv' => Valid::bool(sometimes: true),
        ], $path);
        $operator = TqFilterOperator::from($params['op']);
        $nullOperator = ($operator === TqFilterOperator::null);
        self::validate($data, [
            '' => Valid::array(keys: array_merge(['type', 'column', 'op', 'inv'], $nullOperator ? [] : ['val'])),
        ], $path);
        $value = null;
        $dataTypeOperator = new TqDataTypeOperator($column->type, $operator, $column->dictionaryId);
        if (!$nullOperator) {
            $valueValidator = $column->type->filterValueValidator($column, $operator);
            if ($dataTypeOperator->isFilterValueList()) {
                $value = self::validate($data, [
                    'val' => Valid::list(),
                    'val.*' => [...$valueValidator, 'distinct:strict'],
                ], $path)['val'];
            } else {
                $value = self::validate($data, [
                    'val' => $valueValidator,
                ], $path);
            }
        }
        return new self(
            operator: $operator,
            inverse: $params['inv'] ?? false,
            column: $column,
            dataTypeOperator: $dataTypeOperator,
            value: $value,
        );
    }

    private function __construct(
        TqFilterOperator $operator,
        bool $inverse,
        public TqColumnConfig $column,
        private TqDataTypeOperator $dataTypeOperator,
        public bool|int|string|array|null $value,
    ) {
        parent::__construct($operator, $inverse);
    }

    public function getColumnAliases(): array
    {
        return [$this->column->columnAlias];
    }

    public function applyFilter(TqBuilder $builder, bool $or, bool $invert): void
    {
        $value = ($this->operator === TqFilterOperator::null) ? null
            : $this->dataTypeOperator->filterValuePrepare($this->value);
        $filterQuery = $this->column->getFilterQuery();
        $inverse = ($this->inverse xor $invert);
        $columnType = $this->column->type;

        $sqlOperator = $this->operator->sqlOperator();

        $query = null;
        if ($columnType->isList()) {
            // "where ... and (column" appended with "is null or true)" matches any value
            $anyValue = 'is null or true';
            if ($this->operator === TqFilterOperator::null) {
                $query = fn(null $bind) => "($filterQuery $anyValue)) = 0";
            } elseif ($columnType === TqDataTypeEnum::string_list
                && in_array($this->operator, TqFilterOperator::LIKE, true)) {
                $query = fn(TqSingleBind $bind) => "($filterQuery $sqlOperator {$bind->use()})) != 0";
            } elseif (!$columnType->isUuidList()) {
                FatalExceptionFactory::tquery()->throw();
            }

            $query ??= match ($this->operator) {
                TqFilterOperator::null => fn(null $bind) => "($filterQuery $anyValue)) = 0",
                TqFilterOperator::has => fn(TqSingleBind $bind) => "($filterQuery = {$bind->use()})) != 0",
                TqFilterOperator::has_any => fn(TqListBind $bind) => "($filterQuery in {$bind->use()})) != 0",
                TqFilterOperator::has_only => fn(TqListBind $bind) => //
                "($filterQuery in {$bind->use()})) = ($filterQuery $anyValue))",
                TqFilterOperator::has_all => fn(TqListBind $bind) => //
                "($filterQuery in {$bind->use()})) = {$bind->length}",
                TqFilterOperator::eq => fn(TqListBind $bind) => //
                "($filterQuery in {$bind->use()})) = {$bind->length} and ($filterQuery $anyValue)) = {$bind->length}",
                default => FatalExceptionFactory::tquery()->throw(),
            };
            $nullable = false;
        } else {
            if ($this->operator === TqFilterOperator::null) {
                $query = fn(null $bind) => trim("$filterQuery $sqlOperator");
            } else {
                if ($columnType->notNullBaseType() === TqDataTypeEnum::string) {
                    // fix for 'Illegal mix of collations (ascii*) and (utf8*)' error
                    // todo: add 'ascii' column type, and cast only this type
                    // there are no 'text' columns with 'ascii' encoding
                    $filterQuery = "convert($filterQuery using utf8mb4)";
                }
                $query = fn(TqBind $bind) => trim("$filterQuery $sqlOperator {$bind->use()}");
            }
            $nullable = $columnType->isNullable();
        }

        $builder->where($query, $or, $value, $inverse, $nullable);
    }
}
