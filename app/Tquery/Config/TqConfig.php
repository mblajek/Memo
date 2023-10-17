<?php

namespace App\Tquery\Config;

use Closure;
use Illuminate\Support\Str;

final class TqConfig
{
    /** @var array<string, TqColumnConfig> */
    public array $columns = [];

    public function __construct(
        public readonly TqTableEnum $table,
    ) {
    }

    public function addSimple(
        TqDataTypeEnum $type,
        string $columnName,
        ?string $columnAlias = null,
    ): void {
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnName,
            table: null,
            columnAlias: $columnAlias ?? $columnName,
        );
    }

    public function addJoined(
        TqDataTypeEnum $type,
        TqTableAliasEnum $table,
        string $columnName,
        ?string $columnAlias = null,
    ): void {
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnName,
            table: $table,
            columnAlias: $columnAlias ?? $columnName,
        );
    }

    public function addQuery(
        TqDataTypeEnum $type,
        Closure $columnOrQuery,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $order = null,
        ?Closure $renderer = null,
    ): void {
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnOrQuery,
            table: null,
            columnAlias: $columnAlias,
            filter: $filter,
            sorter: $order,
            renderer: $renderer,
        );
    }

    /** Added in TqRequest for "distinct" queries */
    public function addCount(): void
    {
        $this->addColumn(
            type: TqDataTypeEnum::int,
            columnOrQuery: fn(string $tableName) => 'count(1)',
            table: null,
            columnAlias: 'count',
        );
    }

    private function addColumn(
        TqDataTypeEnum $type,
        string|Closure $columnOrQuery,
        ?TqTableAliasEnum $table,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $sorter = null,
        ?Closure $renderer = null,
    ): void {
        $columnAliasCamel = Str::camel($columnAlias);
        $this->columns[$columnAliasCamel] = new TqColumnConfig(
            config: $this,
            type: $type,
            columnOrQuery: $columnOrQuery,
            table: $table,
            columnAlias: $columnAliasCamel,
            filter: $filter = null,
            sorter: $sorter = null,
            renderer: $renderer = null,
        );
    }
}
