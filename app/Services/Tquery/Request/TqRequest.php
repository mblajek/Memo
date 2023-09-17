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
            'filter' => 'sometimes|array',
            'sort' => ['sometimes', 'array', new ArrayIsListRule()],
            'sort.*' => ['required', 'array:type,column,desc'],
            'sort.*.type' => 'required|string|in:column',
            'sort.*.column' => ['required', 'string', Rule::in(array_keys($sortableColumns))],
            'sort.*.desc' => ['sometimes', 'bool', new DataTypeRule('?bool')],
            'paging' => 'required|array:number,size',
            'paging.number' => ['required', 'numeric', 'integer', 'min:1', new DataTypeRule('int')],
            'paging.size' => ['required', 'numeric', 'integer', 'min:1', new DataTypeRule('int')],
        ]);

        return new self(
            columns: self::parseColumns($data['columns']),
            filter: self::parseFilter($data['filter'] ?? null),
            sort: self::parseSort($data['sort']),
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
            // todo filter
            )
        );
    }

    /** @return TqRequestColumn[] */
    private static function parseColumns(array $array): array
    {
        return array_map(fn(array $column) => TqRequestColumn::fromArray($column), $array);
    }

    private static function parseFilter(?array $array): TqRequestFilter
    {
        return TqRequestFilter::fromArray($array);
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
        public TqRequestFilter $filter,
        public array $sort,
        public int $number,
        public int $size,
    ) {
    }
}
