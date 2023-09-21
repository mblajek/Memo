<?php

namespace App\Tquery\Engine;

use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use Closure;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class TqBuilder
{
    private readonly Builder $builder;
    private array $joins;

    public static function make(TqTableEnum $table): self
    {
        return new self($table);
    }

    public function __construct(TqTableEnum $table)
    {
        $this->joins = [$table];
        $this->builder = DB::table($table->name);
    }

    public function join(
        TqTableAliasEnum|TqTableEnum $joinBase,
        TqTableAliasEnum $table,
        string $joinColumn,
        bool $left,
    ): bool {
        if (in_array($table, $this->joins, strict: true)) {
            return false;
        }
        $this->joins [] = $table;
        $tableBase = $table->baseTable();
        $this->builder->join(
            "{$tableBase->name} as {$table->name}",
            "{$table->name}.id",
            '=',
            "{$joinBase->name}.$joinColumn",
            $left ? 'left' : 'inner',
        );
        return true;
    }

    public function select(string $query, string $alias): void
    {
        $this->builder->selectRaw("$query as `$alias`");
    }

    public function orderBy(string $query, bool $desc): void
    {
        $this->builder->orderByRaw("$query " . ($desc ? 'desc' : 'asc'));
    }

    public function where(Closure $query, bool $or, bool|int|string|array|null $value = null): void
    {
        if (is_array($value)) {
            $bindings = count($value) ? array_values($value) : [null];
            $bind = '(' . trim(str_repeat('?,', count($bindings)), ',') . ')';
        } else {
            $bindings = ($value !== null) ? [$value] : [];
            $bind = count($bindings) ? '?' : null;
        }
        $queryString = $query(bind: $bind);
        $or ? $this->builder->orWhereRaw($queryString, $bindings) : $this->builder->whereRaw($queryString, $bindings);
    }

    public function whereGroup(Closure $group, bool $or): void
    {
        $or ? $this->builder->orWhere($group) : $this->builder->where($group);
    }

    public function applyPaging(int $number, int $size): void
    {
        $this->builder->forPage(page: $number, perPage: $size);
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
