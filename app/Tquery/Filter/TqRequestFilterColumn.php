<?php

namespace App\Tquery\Filter;

use App\Exceptions\FatalExceptionFactory;
use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Validation\Rule;

readonly class TqRequestFilterColumn extends TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, array $path): self
    {
        $column = $config->columns[self::validate($data, [
            'column' => ['required', 'string', Rule::in(array_keys($config->columns))],
        ], $path)];
        $operatorsNames = array_map(fn(TqFilterOperator $operator) => $operator->value, $column->type->operators());
        $params = self::validate($data, [
            'op' => ['required', 'string', Rule::in($operatorsNames)],
            'inv' => ['sometimes', 'bool', DataTypeRule::bool(true)],
        ], $path);
        $operator = TqFilterOperator::from($params['op']);
        $nullOperator = ($operator === TqFilterOperator::null);
        self::validate($data, ['' => 'array:type,column,op,inv' . ($nullOperator ? '' : ',val')], $path);
        $valueValidator = $operator->valueValidator() ?? $column->type->valueValidator();
        $value = null;
        if (!$nullOperator) {
            if (in_array($operator, TqFilterOperator::ARR)) {
                $value = self::validate($data, [
                    'val' => ['required', 'array', new ArrayIsListRule()],
                    'val.*' => $valueValidator,
                ], $path)['val'];
            } else {
                $value = self::validate($data, [
                    'val' => ['present', ...$valueValidator],
                ], $path);
            }
        }
        return new self(
            operator: $operator,
            inverse: $params['inv'] ?? false,
            column: $column,
            value: $value,
        );
    }

    private function __construct(
        TqFilterOperator $operator,
        bool $inverse,
        public TqColumnConfig $column,
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
        $value = $this->operator->prepareValue($this->value);
        $filterQuery = $this->column->getFilterQuery();
        $inverse = ($this->inverse xor $invert);

        $sqlPrefix = $this->operator->sqlPrefix();
        $sqlOperator = $this->operator->sqlOperator();

        if ($sqlOperator) {
            $builder->where(
                query: fn(string|null $bind) => "$sqlPrefix $filterQuery $sqlOperator $bind",
                or: $or,
                value: $value,
                inverse: $inverse,
                nullable: false,
            );
        } else {
            throw FatalExceptionFactory::tquery();
        }
    }
}
