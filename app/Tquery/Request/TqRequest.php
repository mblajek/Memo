<?php

namespace App\Tquery\Request;

use App\Rules\ArrayIsListRule;
use App\Rules\DataTypeRule;
use App\Tquery\Config\TqColumnConfig;
use App\Tquery\Config\TqConfig;
use App\Tquery\Filter\TqRequestAbstractFilter;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

readonly class TqRequest
{
    /** @return array<string, TqColumnConfig> */
    public array $allColumns;

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
            config: $config,
            selectColumns: self::parseColumns($config, $data['columns']),
            filter: self::parseFilter($config, $data['filter'] ?? 'always'),
            sortColumns: self::parseSort($config, $data['sort'] ?? []),
            number: $data['paging']['number'],
            size: $data['paging']['size'],
        );
    }

    /** @return array<string, TqColumnConfig> */
    private function allColumns(): array
    {
        return array_intersect_key(
            $this->config->columns,
            array_flip(
                array_map(
                    fn(TqColumnConfig $column) => $column->columnAlias,
                    array_merge(
                        array_map(fn(TqRequestColumn $column) => $column->column, $this->selectColumns),
                        array_map(fn(TqRequestSort $sort) => $sort->column, $this->sortColumns),
                        is_bool($this->filter) ? [] : $this->filter->getColumns(),
                    ),
                ),
            ),
        );
    }

    /** @return TqRequestColumn[] */
    private static function parseColumns(TqConfig $config, array $array): array
    {
        return array_map(fn(array $column) => TqRequestColumn::fromArray($config, $column), $array);
    }

    private static function parseFilter(TqConfig $config, array|string $array): TqRequestAbstractFilter|bool
    {
        return match ($array) {
            'always', 'never' => ($array === 'always'),
            default => TqRequestAbstractFilter::fromArray($config, ['filter' => $array], ['filter']),
        };
    }

    /** @return TqRequestSort[] */
    private static function parseSort(TqConfig $config, array $array): array
    {
        return array_map(fn(array $sort) => TqRequestSort::fromArray($config, $sort), $array);
    }

    /**
     * @param TqRequestColumn[] $selectColumns
     * @param TqRequestSort[] $sortColumns
     */
    private function __construct(
        public TqConfig $config,
        public array $selectColumns,
        public TqRequestAbstractFilter|bool $filter,
        public array $sortColumns,
        public int $number,
        public int $size,
    ) {
        $this->allColumns = $this->allColumns();
    }
}
