<?php

namespace App\Tquery\Filter;

use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Validation\Rule;

readonly class TqRequestFilterColumn extends TqRequestAbstractFilter
{
    public function getColumns(): array
    {
       return [$this->column];
    }

    public static function fromArray(TqConfig $config, array $data, array $path): self
    {
        $column = $config->columns[self::validate($data, [
            'column' => ['required', 'string', Rule::in(array_keys($config->columns))],
        ], $path)];
        $operators = $column->type->operators();
        $operatorsNames = array_map(fn(TqFilterOperator $operator) => $operator->value, $operators);
        $params = self::validate($data, [
            'op' => ['required', 'string', Rule::in($operatorsNames)],
            'inv' => ['sometimes', 'bool', DataTypeRule::bool(true)],
        ], $path);
        $operator = TqFilterOperator::from($params['op']);
        $nullOperator = ($operator === TqFilterOperator::null);
        self::validate($data, ['' => 'array:type,column,op,inv' . ($nullOperator ? '' : ',val')], $path);
        $value = null;
        if (!$nullOperator) {
            if (in_array($operator, TqFilterOperator::ARR)) {
                $value = self::validate($data, [
                    'val' => ['required', 'array', new ArrayIsListRule()],
                    'val.*' => $column->type->valueValidator(),
                ], $path)['val'];
            } else {
                $value = self::validate($data, [
                    'val' => $column->type->valueValidator(),
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

    public function applyFilter(TqBuilder $builder, bool $or): void
    {
    }

    protected function __construct(
        TqFilterOperator $operator,
        bool $inverse,
        public TqColumnConfig $column,
        public bool|int|string|array|null $value,
    ) {
        parent::__construct($operator, $inverse);
    }
}
