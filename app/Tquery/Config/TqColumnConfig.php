<?php

namespace App\Tquery\Config;

use App\Tquery\Engine\TqBuilder;
use App\Tquery\Engine\TqFilterGenerator;
use App\Tquery\Engine\TqRendererGenerator;
use App\Tquery\Engine\TqSelectGenerator;
use App\Tquery\Engine\TqSorterGenerator;
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
        $this->selector = $selector ?? TqSelectGenerator::getSelect($this);
        $this->filter = $filter ?? TqFilterGenerator::getFilter($this);
        $this->sorter = $sorter ?? TqSorterGenerator::getSort($this);
        $this->renderer = $renderer ?? TqRendererGenerator::getRenderer($this);
    }

    public function applyJoin(TqBuilder $builder): void
    {
        $this->table?->applyJoin(builder: $builder, joinBase: $this->config->table, left: $this->type->isNullable());
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

    public function getSelectQuery(): string
    {
        return ($this->selector)(query: $this->getQuery());
    }

    public function getSortQuery(): string
    {
        return ($this->sorter)(query: $this->getQuery());
    }

    public function getFilterQuery(): string
    {
        return ($this->filter)(query: $this->getQuery());
    }
}
