<?php

namespace App\Services\Tquery\Request;

use App\Rules\DataTypeRule;
use App\Services\Tquery\Config\TqConfig;
use Illuminate\Http\Request;

readonly class TqRequest
{
    public static function fromRequest(TqConfig $config, Request $request): self
    {
        $columnsNames = implode(',', array_keys($config->columns));
        $data = $request->validate([
            'columns' => 'required|array|min:1',
            'columns.*' => 'array|size:2',
            'columns.*.type' => 'required|string|in:column',
            'columns.*.column' => 'required|string|in:' . $columnsNames,
            'filter' => 'present|array',
            'sort' => 'present|array',
            'sort.*.type' => 'required|string|in:column',
            'sort.*.column' => 'required|string|in:' . $columnsNames,
            'sort.*.desc' => ['sometimes', 'bool', new DataTypeRule('?bool')],
            'paging' => 'required|array',
            'paging.page_index' => ['required', 'numeric', 'integer', 'min:1', new DataTypeRule('int')],
            'paging.page_size' => ['required', 'numeric', 'integer', 'min:1', new DataTypeRule('int')],
        ]);

        return new self(
            columns: self::parseColumns($data['columns']),
            sort: self::parseSort($data['sort']),
            pageIndex: $data['paging']['page_index'],
            pageSize: $data['paging']['page_size'],
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
        public array $sort,
        public int $pageIndex,
        public int $pageSize,
    ) {
    }
}
