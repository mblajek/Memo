<?php

namespace App\Tquery\Config;

use App\Models\Attribute;
use App\Models\Enums\AttributeType;
use App\Models\UuidEnum\AttributeUuidEnum;
use App\Models\UuidEnum\ClientAttributeUuidEnum;
use App\Models\Value;
use BackedEnum;
use Closure;
use Illuminate\Support\Str;

trait TqAttribute
{
    public function addAttribute(
        Attribute|(AttributeUuidEnum&BackedEnum) $attribute,
        ?string $prefix = null,
    ): void {
        $attribute = ($attribute instanceof Attribute) ? $attribute : Attribute::getCacheById($attribute);
        if ($attribute->type === AttributeType::Separator) {
            return; // todo: maybe tquery separator
        }
        $attributeId = $attribute->id;
        $type = $attribute->getTqueryDataType();
        $table = TqTableAliasEnum::fromTableName($attribute->table->value);
        $columnAlias = Str::camel((($prefix !== null) ? "$prefix." : '') . $attribute->api_name);
        if ($attribute->is_multi_value === null) {
            self::assertType($type, false, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list, TqDataTypeEnum::list);
            $this->addColumn(
                type: $type,
                columnOrQuery: $attribute->api_name,
                table: $table,
                columnAlias: $columnAlias,
                attributeId: $attributeId,
                sorter: $this->getAttributeSorter($attribute),
            );
            return;
        }
        $valueColumn = Value::getTypeColumn($attribute->type);
        $from = "`values` where `object_id` = `{$table->name}`.`id` and `attribute_id` = '{$attribute->id}'";
        $multi = $attribute->is_multi_value;
        self::assertType(
            $type,
            $multi,
            TqDataTypeEnum::uuid_list,
            TqDataTypeEnum::dict_list,
            TqDataTypeEnum::string_list,
            TqDataTypeEnum::list // int list, date list
        );
        if ($multi) {
            $this->addColumn(
                type: $type,
                columnOrQuery: fn(string $tableName) => "select json_arrayagg(`$valueColumn` order by `default_order`) from $from",
                table: $table,
                columnAlias: Str::camel($columnAlias),
                attributeId: $attributeId,
                filter: fn(string $query) => "select count(distinct `$valueColumn`) from $from and (`$valueColumn`",
            );
            $this->addColumn(
                type: TqDataTypeEnum::int,
                columnOrQuery: fn(string $tableName) => "select count(1) from $from",
                table: $table,
                columnAlias: Str::camel($columnAlias) . '.count',
                attributeId: $attributeId,
                transform: 'count',
            );
        } else {
            $this->addColumn(
                type: $type,
                columnOrQuery: fn(string $tableName) => "select `$valueColumn` from $from limit 1", // redundant limit
                table: $table,
                columnAlias: $columnAlias,
                attributeId: $attributeId,
            );
        }
    }

    private function getAttributeSorter(Attribute $attribute): ?Closure
    {
        return $attribute->is_fixed ? match ($attribute->id) {
            ClientAttributeUuidEnum::ShortCode->value // supports only '-' and numeric values
            => fn(string $query) => "case when ($query regexp '^[0-9]+$') then cast($query as int) end",
            default => null,
        } : null;
    }
}
