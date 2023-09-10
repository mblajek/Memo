<?php

namespace App\Services\Tquery\Config;

use App\Services\Tquery\Engine\TqRendererGenerator;
use App\Services\Tquery\Request\TqRequestColumn;
use App\Services\Tquery\Request\TqRequestSort;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Str;

final readonly class TqColumnConfig
{
    private Closure $filter;
    public ?Closure $order;
    private Closure $renderer;
    public string $columnAlias;

    public static function simple(
        TqDataTypeEnum $type,
        string $columnName,
        ?string $columnAlias = null,
    ): self {
        return new self(
            type: $type,
            columnOrQuery: $columnName,
            table: null,
            columnAlias: $columnAlias ?? $columnName,
        );
    }

    public static function joined(
        TqDataTypeEnum $type,
        TqTableAliasEnum $table,
        string $columnName,
        ?string $columnAlias = null,
    ): self {
        return new self(
            type: $type,
            columnOrQuery: $columnName,
            table: $table,
            columnAlias: $columnAlias ?? $columnName,
        );
    }

    public static function query(
        TqDataTypeEnum $type,
        Closure $columnOrQuery,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $order = null,
        ?Closure $renderer = null,
    ): self {
        return new self(
            type: $type,
            columnOrQuery: $columnOrQuery,
            table: null,
            columnAlias: $columnAlias,
            filter: $filter,
            order: $order,
            renderer: $renderer,
        );
    }

    private function __construct(
        public TqDataTypeEnum $type,
        private string|Closure $columnOrQuery,
        public ?TqTableAliasEnum $table,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $order = null,
        ?Closure $renderer = null,
    ) {
        $this->columnAlias = Str::camel($columnAlias);
        // todo: filter, order
        $this->renderer = $renderer ?? TqRendererGenerator::getRenderer($this);
    }

    public function applySelect(Builder $builder, TqRequestColumn $requestColumn, TqConfig $config): void
    {
        $builder->selectRaw($this->getQuery($config) . " as `{$this->columnAlias}`");
    }

    public function applyFilter(Builder $builder /*TODO*/)
    {
        return ($this->filter)(builder: $builder);
    }

    public function applySort(Builder $builder, TqRequestSort $requestSort, TqConfig $config): void
    {
        // todo use $this->sort
        $builder->orderByRaw($this->getQuery($config) . ' ' . ($requestSort->desc ? 'desc' : 'asc'));
    }

    public function render(?string $value): bool|int|string|array|null
    {
        return ($this->renderer)(value: $value);
    }

    private function getQuery(TqConfig $config): string
    {
        return is_string($this->columnOrQuery)
            ? "`{$config->table->name}`.`{$this->columnOrQuery}`"
            : '(' . ($this->columnOrQuery)(tableName: $config->table->name) . ')';
    }
}
