<?php

namespace App\Services\Tquery\Request;

use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Filter\TqRequestAbstractFilter;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

readonly class TqRequest
{
    public static function fromHttpRequest(TqConfig $config, Request $request): self
    {
        $sortableColumns = array_filter($config->columns, fn(TqColumnConfig $column) => $column->type->isSortable());
        $data = $request->validate([
            'columns' => ['required', 'array', 'min:1', new ArrayIsListRule()],
            'columns.*' => ['required', 'array:type,column'],
            'columns.*.type' => 'required|string|in:column',
            'columns.*.column' => ['required', 'string', Rule::in(array_keys($config->columns))],
            'filter' => 'sometimes|required',
            'sort' => ['sometimes', 'array', new ArrayIsListRule()],
            'sort.*' => ['required', 'array:type,column,desc'],
            'sort.*.type' => 'required|string|in:column',
            'sort.*.column' => ['required', 'string', Rule::in(array_keys($sortableColumns))],
            'sort.*.desc' => ['sometimes', 'bool', DataTypeRule::bool(true)],
            'paging' => 'required|array:number,size',
            'paging.number' => ['required', 'numeric', 'integer', 'min:1', DataTypeRule::int()],
            'paging.size' => ['required', 'numeric', 'integer', 'min:1', DataTypeRule::int()],
        ]);

        return new self(
            columns: self::parseColumns($data['columns']),
            filter: self::parseFilter($config, $data['filter'] ?? 'always'),
            sort: self::parseSort($data['sort'] ?? []),
            number: $data['paging']['number'],
            size: $data['paging']['size'],
        );
    }

    /** @return string[] */
    public function allColumns(): array
    {
        return array_unique(
            array_merge(
                array_map(fn(TqRequestColumn $column) => $column->column, $this->columns),
                array_map(fn(TqRequestSort $sort) => $sort->column, $this->sort),
                is_bool($this->filter) ? []
                    : array_map(fn(TqColumnConfig $column) => $column->columnAlias, $this->filter->getColumns())
            )
        );
    }

    /** @return TqRequestColumn[] */
    private static function parseColumns(array $array): array
    {
        return array_map(fn(array $column) => TqRequestColumn::fromArray($column), $array);
    }

    private static function parseFilter(TqConfig $config, array|string $array): TqRequestAbstractFilter|bool
    {
        return match ($array) {
            'always', 'never' => ($array === 'always'),
            default => TqRequestAbstractFilter::fromArray($config, ['filter' => $array], ['filter']),
        };
    }

    /** @return TqRequestSort[] */
    private static function parseSort(array $array): array
    {
        return array_map(fn(array $sort) => TqRequestSort::fromArray($sort), $array);
    }

    /**
     * @param TqRequestColumn[] $columns
     * @param TqRequestSort[] $sort
     */
    private function __construct(
        public array $columns,
        public TqRequestAbstractFilter|bool $filter,
        public array $sort,
        public int $number,
        public int $size,
    ) {
    }
}
