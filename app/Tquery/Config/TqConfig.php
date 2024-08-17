<?php

namespace App\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Attribute;
use Closure;
use Illuminate\Support\Str;

final class TqConfig
{
    use TqAttribute;

    /** @var array<string, TqColumnConfig> */
    public array $columns = [];
    private const string COUNT_COLUMN = '_count';

    private ?array $filterableColumns = null;
    // may be needed to be set manually if TqService::getBuilder contains inv:true joins
    public TqTableAliasEnum $uniqueTable;

    public function __construct(
        public readonly TqTableAliasEnum $table,
    ) {
        $this->uniqueTable = $this->table;
    }

    public function getSelectableColumns(bool $distinct): array
    {
        return array_filter(
            $this->columns,
            fn(TqColumnConfig $column) => $distinct || !$column->type->isAggregate()
        );
    }

    public function getFilterableColumns(): array
    {
        // cached because used in each filter
        if ($this->filterableColumns === null) {
            $this->filterableColumns = array_filter(
                $this->columns,
                fn(TqColumnConfig $column) => !$column->type->isAggregate()
            );
        }
        return $this->filterableColumns;
    }

    public function getSortableColumns(bool $distinct): array
    {
        return array_filter(
            $this->getSelectableColumns($distinct),
            fn(TqColumnConfig $column) => $column->type->isSortable()
        );
    }

    public function addSimple(
        TqDataTypeEnum|TqDictDef $type,
        string $columnName,
        ?string $columnAlias = null,
    ): void {
        self::assertStringOrUuidList($type, false);
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnName,
            table: null,
            columnAlias: Str::camel($columnAlias ?? $columnName),
        );
    }

    public function addJoined(
        TqDataTypeEnum|TqDictDef $type,
        TqTableAliasEnum $table,
        string $columnName,
        ?string $columnAlias = null,
    ): void {
        self::assertStringOrUuidList($type, false);
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnName,
            table: $table,
            columnAlias: Str::camel($columnAlias ?? $columnName),
        );
    }

    public function addQuery(
        TqDataTypeEnum|TqDictDef $type,
        Closure $columnOrQuery,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $order = null,
        ?Closure $renderer = null,
    ): void {
        self::assertStringOrUuidList($type, false);
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnOrQuery,
            table: null,
            columnAlias: Str::camel($columnAlias),
            filter: $filter,
            sorter: $order,
            renderer: $renderer,
        );
    }

    public function addJoinedQuery(
        TqDataTypeEnum|TqDictDef $type,
        TqTableAliasEnum $table,
        Closure $columnOrQuery,
        string $columnAlias,
        ?Closure $filter = null,
        ?Closure $order = null,
        ?Closure $renderer = null,
    ): void {
        self::assertStringOrUuidList($type, false);
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnOrQuery,
            table: $table,
            columnAlias: Str::camel($columnAlias),
            filter: $filter,
            sorter: $order,
            renderer: $renderer,
        );
    }

    public function addListQuery(
        TqDataTypeEnum|TqDictDef $type,
        string $select,
        string $from,
        string $columnAlias,
        bool $selectDistinct = false,
    ): void {
        self::assertStringOrUuidList($type, true);
        $selectDistinct = $selectDistinct ? 'distinct ' : '';
        $this->addColumn(
            type: $type,
            columnOrQuery: fn(string $tableName) => "select json_arrayagg({$selectDistinct}{$select}) from $from",
            table: null,
            columnAlias: Str::camel($columnAlias),
            filter: fn(string $query) => "select count(distinct {$select}) from $from and ($select",
        );
    }

    public function addCount(): void
    {
        $this->addColumn(
            type: TqDataTypeEnum::count,
            columnOrQuery: fn(string $tableName) => 'count(1)',
            table: null,
            columnAlias: self::COUNT_COLUMN,
        );
    }

    public function addBase(): void
    {
        $this->addSimple(TqDataTypeEnum::uuid, 'id');
        $this->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $this->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $this->addSimple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id');
        $this->addJoined(TqDataTypeEnum::string, TqTableAliasEnum::created_by, 'name', 'created_by.name');
        $this->addSimple(TqDataTypeEnum::uuid, 'updated_by', 'updated_by.id');
        $this->addJoined(TqDataTypeEnum::string, TqTableAliasEnum::updated_by, 'name', 'updated_by.name');
    }

    public function addBaseOnTable(TqTableAliasEnum $table, string $prefix): void
    {
        $this->addJoined(TqDataTypeEnum::datetime, $table, 'created_at', "$prefix.created_at");
        $this->addJoined(TqDataTypeEnum::datetime, $table, 'updated_at', "$prefix.updated_at");
        $this->addJoined(TqDataTypeEnum::uuid, $table, 'created_by', "$prefix.created_by.id");
        $this->addJoinedQuery(TqDataTypeEnum::string, $table, fn(string $tableName) => //
        "select `users`.`name` from `users` where `users`.`id` = `$tableName`.`created_by`", "$prefix.created_by.name");
        $this->addJoined(TqDataTypeEnum::uuid, $table, 'updated_by', "$prefix.updated_by.id");
        $this->addJoinedQuery(TqDataTypeEnum::string, $table, fn(string $tableName) => //
        "select `users`.`name` from `users` where `users`.`id` = `$tableName`.`updated_by`", "$prefix.updated_by.name");
    }

    public function removeColumns(string ...$columnAliases): void
    {
        foreach ($columnAliases as $columnAlias) {
            $columnAlias = Str::camel($columnAlias);
            if (array_key_exists($columnAlias, $this->columns)) {
                unset($this->columns[$columnAlias]);
            } else {
                throw FatalExceptionFactory::tquery();
            }
        }
    }

    private function addColumn(
        TqDataTypeEnum|TqDictDef $type,
        string|Closure $columnOrQuery,
        ?TqTableAliasEnum $table,
        string $columnAlias,
        ?string $attributeId = null,
        ?string $transform = null,
        ?Closure $selector = null,
        ?Closure $filter = null,
        ?Closure $sorter = null,
        ?Closure $renderer = null,
    ): void {
        if (
            (($type instanceof TqDataTypeEnum) && $type->isDict())
            || array_key_exists($columnAlias, $this->columns)
        ) {
            throw FatalExceptionFactory::tquery();
        }
        [$dataType, $dictionaryId] = ($type instanceof TqDataTypeEnum)
            ? [$type, null] : [$type->dataType, $type->dictionaryId];
        $this->filterableColumns = null;
        $this->columns[$columnAlias] = new TqColumnConfig(
            config: $this,
            type: $dataType,
            columnOrQuery: $columnOrQuery,
            table: $table,
            columnAlias: $columnAlias,
            dictionaryId: $dictionaryId,
            attributeId: $attributeId,
            transform: $transform,
            selector: $selector,
            filter: $filter,
            sorter: $sorter,
            renderer: $renderer,
        );
    }

    private static function assertStringOrUuidList(TqDataTypeEnum|TqDictDef $type, bool $is): void
    {
        self::assertType($type, $is, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list, TqDataTypeEnum::string_list);
    }

    private static function assertType(TqDataTypeEnum|TqDictDef $type, bool $is, TqDataTypeEnum ...$types): void
    {
        $dataType = ($type instanceof TqDictDef) ? $type->dataType : $type;
        if ($is xor in_array($dataType, $types)) {
            FatalExceptionFactory::tquery()->throw();
        }
    }
}
