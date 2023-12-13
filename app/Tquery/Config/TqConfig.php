<?php

namespace App\Tquery\Config;

use App\Exceptions\FatalExceptionFactory;
use App\Models\Attribute;
use App\Models\UuidEnum\AttributeUuidEnum;
use BackedEnum;
use Closure;
use Illuminate\Support\Str;

final class TqConfig
{
    /** @var array<string, TqColumnConfig> */
    public array $columns = [];
    private const string COUNT_COLUMN = '_count';

    private ?array $filterableColumns = null;

    public function __construct(
        public readonly TqTableEnum $table,
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
        $this->addColumn(
            type: $type,
            columnOrQuery: $columnName,
            table: null,
            columnAlias: Str::camel($columnAlias ?? $columnName),
        );
    }

    public function addAttribute(string|(AttributeUuidEnum&BackedEnum) $attribute): void
    {
        $attributeModel = Attribute::query()->findOrFail(is_string($attribute) ? $attribute : $attribute->value);
        $this->addColumn(
            type: $attributeModel->getTqueryDataType(),
            columnOrQuery: $attributeModel->api_name,
            table: null,
            columnAlias: Str::camel($attributeModel->api_name),
            attribute: $attributeModel,
        );
    }

    public function addJoined(
        TqDataTypeEnum|TqDictDef $type,
        TqTableAliasEnum $table,
        string $columnName,
        ?string $columnAlias = null,
    ): void {
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

    public function addCount(): void
    {
        $this->addColumn(
            type: TqDataTypeEnum::count,
            columnOrQuery: fn(string $tableName) => 'count(1)',
            table: null,
            columnAlias: self::COUNT_COLUMN,
        );
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
}
