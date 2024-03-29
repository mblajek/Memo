<?php

namespace App\Tquery\Filter;

use App\Rules\Valid;
use App\Tquery\Config\TqConfig;
use App\Tquery\Engine\TqBuilder;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rule;

readonly class TqRequestFilterGroup extends TqRequestAbstractFilter
{
    public static function fromArray(TqConfig $config, array $data, string $path): self
    {
        $operatorsNames = array_map(fn(TqFilterOperator $operator) => $operator->value, TqFilterOperator::GROUP);
        $params = self::validate($data, [
            '' => Valid::array(keys: ['type', 'op', 'inv', 'val']),
            'op' => Valid::trimmed([Rule::in($operatorsNames)]),
            'inv' => Valid::bool(sometimes: true),
            'val' => Valid::list(),
        ], $path);
        $operator = TqFilterOperator::from($params['op']);
        $value = array_map(
            fn($num) => TqRequestAbstractFilter::fromArray(
                config: $config,
                data: $data,
                path: "$path.val.$num",
            ),
            array_keys($params['val']),
        );
        return new self(
            operator: $operator,
            inverse: $params['inv'] ?? false,
            value: $value,
        );
    }

    /** @param TqRequestAbstractFilter[] $value */
    private function __construct(
        TqFilterOperator $operator,
        bool $inverse,
        public array $value,
    ) {
        parent::__construct($operator, $inverse);
    }

    public function getColumnAliases(): array
    {
        $columnAliases = [];
        foreach ($this->value as $child) {
            foreach ($child->getColumnAliases() as $childColumnAlias) {
                $columnAliases[$childColumnAlias] = true;
            }
        }
        return array_keys($columnAliases);
    }

    public function applyFilter(TqBuilder $builder, bool $or, bool $invert): void
    {
        $inverse = ($this->inverse xor $invert);
        $builder->whereGroup(function (Builder $groupBuilder) use ($builder, $inverse) {
            $innerBuilder = $builder->fromBuilder($groupBuilder);
            foreach ($this->value as $child) {
                $child->applyFilter(
                    $innerBuilder,
                    (($this->operator === TqFilterOperator::or) xor $inverse),
                    $inverse,
                );
            }
        }, $or);
    }
}
