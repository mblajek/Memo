<?php

namespace App\Tquery\Config;

use App\Models\Attribute;
use App\Models\Enums\AttributeType;
use App\Models\UuidEnum\AttributeUuidEnum;
use App\Models\Value;
use BackedEnum;
use Illuminate\Support\Str;

/** @mixin TqConfig */
trait TqAttribute
{
    public function addAttribute(
        Attribute|(AttributeUuidEnum&BackedEnum) $attribute,
        ?string $prefix = null,
    ): void {
        $attribute = ($attribute instanceof Attribute) ? $attribute : Attribute::getById($attribute);
        if ($attribute->type === AttributeType::Separator) {
            return; // todo: maybe tquery separator
        }
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
                attribute: $attribute,
            );
            return;
        }
        $valueColumn = Value::getTypeColumn($attribute->type);
        $from = "`values` where `object_id` = `{$table->name}`.`id` and `attribute_id` = '{$attribute->id}'";
        $multi = $attribute->is_multi_value;
        self::assertType($type, $multi, TqDataTypeEnum::uuid_list, TqDataTypeEnum::dict_list, TqDataTypeEnum::list);
        if ($multi) {
            $this->addColumn(
                type: $type,
                columnOrQuery: fn(string $tableName) => "select json_arrayagg(`$valueColumn`) from $from",
                table: $table,
                columnAlias: Str::camel($columnAlias),
                attribute: $attribute,
                filter: fn(string $query) => "select count(distinct `$valueColumn`) from $from and (`$valueColumn`",
            );
        } else {
            $this->addColumn(
                type: $type,
                columnOrQuery: fn(string $tableName) => "select `$valueColumn` from $from limit 1", // redundant limit
                table: $table,
                columnAlias: $columnAlias,
                attribute: $attribute,
            );
        }
    }
}
