<?php

namespace App\Services\Tquery\Engine;

use App\Services\Tquery\Config\TqTableAliasEnum;
use App\Services\Tquery\Config\TqTableEnum;
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

    public function where(string $query): void
    {
        $this->builder->whereRaw($query);
    }

    public function applyPaging(int $number, int $size): void
    {
        $this->builder->forPage(page: $number, perPage: $size);
    }

    public function getRawSql(): string
    {
        return $this->builder->toRawSql();
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
