<?php

namespace App\Tquery\Request;

use App\Rules\Valid;
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
        $distinct = $request->validate(['distinct' => Valid::bool(sometimes: true)])['distinct'] ?? false;
        $data = $request->validate([
            'columns' => Valid::list(),
            'columns.*' => Valid::array(keys: ['type', 'column']),
            'columns.*.type' => Valid::trimmed([Rule::in(['column'])]),
            'columns.*.column' => Valid::trimmed([Rule::in(array_keys($config->getSelectableColumns($distinct)))]),
            'filter' => 'sometimes|required', // array or string
            'sort' => Valid::list(sometimes: true, min: 0),
            'sort.*' => Valid::array(keys: ['type', 'column', 'desc']),
            'sort.*.type' => Valid::trimmed([Rule::in(['column'])]),
            'sort.*.column' => Valid::trimmed([Rule::in(array_keys($config->getSortableColumns($distinct)))]),
            'sort.*.desc' => Valid::bool(sometimes: true),
            'paging' => Valid::array(keys: ['number', 'offset', 'size']),
            'paging.number' => Valid::int(['min:1'], sometimes: true),
            'paging.offset' => Valid::int(['min:0'], sometimes: true),
            'paging.size' => Valid::int(['min:1']),
        ]);

        $pageSize = $data['paging']['size'];
        return new self(
            config: $config,
            selectColumns: self::parseColumns($config, $data['columns']),
            filter: self::parseFilter($config, $data['filter'] ?? 'always'),
            sortColumns: self::parseSort($config, $data['sort'] ?? []),
            pageOffset: $pageSize * (($data['paging']['number'] ?? 1) - 1) + ($data['paging']['offset'] ?? 0),
            pageSize: $pageSize,
            isDistinct: $distinct,
        );
    }

    /** @return array<string, TqColumnConfig> */
    private function allColumns(): array
    {
        return array_intersect_key(
            $this->config->columns,
            array_flip(
                array_merge(
                    array_map(fn(TqRequestColumn $column) => $column->column->columnAlias, $this->selectColumns),
                    array_map(fn(TqRequestSort $sort) => $sort->column->columnAlias, $this->sortColumns),
                    is_bool($this->filter) ? [] : $this->filter->getColumnAliases(),
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
            default => TqRequestAbstractFilter::fromArray($config, ['filter' => $array], 'filter'),
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
        public int $pageOffset,
        public int $pageSize,
        public bool $isDistinct,
    ) {
        $this->allColumns = $this->allColumns();
    }
}
