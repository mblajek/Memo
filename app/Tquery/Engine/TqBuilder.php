<?php

declare(strict_types=1);

namespace App\Tquery\Engine;

use App\Exceptions\FatalExceptionFactory;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\Bind\TqBind;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TqBuilder
{
    private bool $distinct = false;

    public static function fromTable(TqTableEnum $table): self
    {
        $joins = [$table];
        return new self($joins, DB::table($table->name));
    }

    public function fromBuilder(Builder $builder): self
    {
        return new self($this->joins, $builder);
    }

    private function __construct(
        private array &$joins,
        private readonly Builder $builder,
    ) {
    }

    public function join(
        TqTableAliasEnum|TqTableEnum $joinBase,
        TqTableAliasEnum $table,
        string $joinColumn,
        bool $left,
        bool $inv,
    ): bool {
        if (in_array($table, $this->joins, strict: true)) {
            return false;
        }
        [$tableColumn, $baseColumn] = $inv ? [$joinColumn, 'id'] : ['id', $joinColumn];
        $this->joins[] = $table;
        $tableBase = $table->baseTable();
        $this->builder->join(
            "{$tableBase->name} as {$table->name}",
            "{$table->name}.$tableColumn",
            '=',
            "{$joinBase->name}.$baseColumn",
            $left ? 'left' : 'inner',
        );
        return true;
    }

    public function distinct(): void
    {
        if (count($this->builder->columns ?? [])) {
            throw FatalExceptionFactory::tquery();
        }
        $this->distinct = true;
    }

    public function select(string $query, string $alias, bool $isAggregate): void
    {
        $this->builder->selectRaw("$query as `$alias`");
        if ($this->distinct && !$isAggregate) {
            $this->builder->groupByRaw("`$alias`");
        }
    }

    public function orderBy(string $query, bool $desc): void
    {
        $this->builder->orderByRaw("$query " . ($desc ? 'desc' : 'asc'));
    }

    public function where(
        Closure $query,
        bool $or,
        bool|int|string|array|null|TqBind $value,
        bool $inverse,
        bool $nullable,
    ): void {
        $bind = ($value instanceof TqBind) ? $value : TqBind::any($value);
        $queryString = '(' . $query(bind: $bind) . ')';
        if ($nullable) {
            $queryString = "coalesce(($queryString), false)";
        }
        if ($inverse) {
            $queryString = "(not $queryString)";
        }
        $this->builder->whereRaw(sql: $queryString, bindings: $bind?->bindings() ?? [], boolean: $or ? 'or' : 'and');
    }

    public function whereGroup(Closure $group, bool $or): void
    {
        $this->builder->where($group, boolean: $or ? 'or' : 'and');
    }

    public function whereNotDeleted(
        TqTableEnum $table,
    ): void {
        $this->where(fn(null $bind) => "`{$table->name}`.`deleted_at` is null", false, null, false, false);
    }

    public function applyPaging(int $offset, int $limit): void
    {
        $this->builder->offset($offset)->limit($limit);
    }

    public function getSql(bool $raw): string
    {
        return $raw ? $this->builder->toRawSql() : $this->builder->toSql();
    }

    public function getCount(): int
    {
        return $this->builder->getCountForPagination();
    }

    public function getData(): Collection
    {
        return $this->builder->get();
    }
}
