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

    public function __construct(
        public readonly TqTableAliasEnum $table,
    ) {
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
        self::assertType($type, false, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list);
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
        self::assertType($type, false, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list);
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
        self::assertType($type, false, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list);
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

    public function addUuidListQuery(
        TqDataTypeEnum|TqDictDef $type,
        string $select,
        string $from,
        string $columnAlias,
    ): void {
        self::assertType($type, true, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list);
        $this->addColumn(
            type: $type,
            columnOrQuery: fn(string $tableName) => "select json_arrayagg($select) from $from",
            table: null,
            columnAlias: Str::camel($columnAlias),
            filter: fn(string $query) => "select count(distinct $select) from $from and ($select",
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
        ?Attribute $attribute = null,
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
            ? [$type, $attribute?->dictionary_id] : [$type->dataType, $type->dictionaryId];
        $this->filterableColumns = null;
        $this->columns[$columnAlias] = new TqColumnConfig(
            config: $this,
            type: $dataType,
            columnOrQuery: $columnOrQuery,
            table: $table,
            columnAlias: $columnAlias,
            dictionaryId: $dictionaryId,
            attribute: $attribute,
            selector: $selector,
            filter: $filter,
            sorter: $sorter,
            renderer: $renderer,
        );
    }

    private static function assertType(TqDataTypeEnum|TqDictDef $type, bool $is, TqDataTypeEnum ...$types): void
    {
        $dataType = ($type instanceof TqDictDef) ? $type->dataType : $type;
        if ($is xor in_array($dataType, $types)) {
            FatalExceptionFactory::tquery()->throw();
        }
    }
}
