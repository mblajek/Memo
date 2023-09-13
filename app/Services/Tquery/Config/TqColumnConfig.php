<?php

namespace App\Services\Tquery\Config;

use App\Services\Tquery\Engine\TqBuilder;
use App\Services\Tquery\Engine\TqRendererGenerator;
use App\Services\Tquery\Engine\TqSelectGenerator;
use App\Services\Tquery\Engine\TqSorterGenerator;
use App\Services\Tquery\Request\TqRequestColumn;
use App\Services\Tquery\Request\TqRequestSort;
use Closure;
use stdClass;

final readonly class TqColumnConfig
{
    private Closure $selector;
    private Closure $filter;
    private Closure $sorter;
    private Closure $renderer;

    public function __construct(
        private TqConfig $config,
        public TqDataTypeEnum $type,
        private string|Closure $columnOrQuery,
        public ?TqTableAliasEnum $table,
        public string $columnAlias,
        ?Closure $selector = null,
        ?Closure $filter = null,
        ?Closure $sorter = null,
        ?Closure $renderer = null,
    ) {
        // todo: filter
        $this->selector = $sorter ?? TqSelectGenerator::getSelect($this);
        $this->sorter = $sorter ?? TqSorterGenerator::getSort($this);
        $this->renderer = $renderer ?? TqRendererGenerator::getRenderer($this);
    }

    public function applyJoin(TqBuilder $builder):void
    {
        $this->table?->applyJoin(builder: $builder, joinBase: $this->config->table, left: $this->type->isNullable());
    }

    public function applySelect(TqBuilder $builder, TqRequestColumn $requestColumn): void
    {
        $builder->select($this->getSelectQuery(), $this->columnAlias);
    }

    public function applyFilter(TqBuilder $builder /*TODO*/)
    {
        return ($this->filter)(builder: $builder);
    }

    public function applySort(TqBuilder $builder, TqRequestSort $requestSort): void
    {
        $builder->orderBy($this->getSortQuery(), $requestSort->desc);
    }

    public function render(?string $value): bool|int|string|array|null|stdClass
    {
        return ($this->renderer)(value: $value);
    }

    private function getQuery(): string
    {
        $table = $this->table ?? $this->config->table;
        return is_string($this->columnOrQuery)
            ? "`{$table->name}`.`{$this->columnOrQuery}`"
            : '(' . ($this->columnOrQuery)(tableName: $table->name) . ')';
    }

    private function getSelectQuery(): string
    {
        return ($this->selector)(query: $this->getQuery());
    }

    private function getSortQuery(): string
    {
        return ($this->sorter)(query: $this->getQuery());
    }
}
