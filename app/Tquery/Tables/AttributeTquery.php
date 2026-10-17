<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;
use App\Utils\Transformer\StringTransformer;

readonly class AttributeTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::attributes);
        $config->addBase();
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'facility_id', 'facility.id');
        $config->addJoined(TqDataTypeEnum::string_nullable, TqTableAliasEnum::facility, 'name', 'facility.name');
        $config->addSimple(TqDataTypeEnum::string, 'table');
        // The API camelCases the name, except for custom names (those starting with '+', kept verbatim).
        // The conversion is done in SQL, so that filtering and sorting act on the exposed value.
        $config->addQuery(
            TqDataTypeEnum::string,
            fn(string $tableName) => "if(left(`$tableName`.`name`, 1) = '+', `$tableName`.`name`, "
                . self::snakeToCamelSql("`$tableName`.`name`") . ')',
            'name',
        );
        // api_name is stored snake_cased in the database, but the API exposes it camelCased.
        $config->addQuery(
            TqDataTypeEnum::string,
            fn(string $tableName) => self::snakeToCamelSql("`$tableName`.`api_name`"),
            'api_name',
        );
        $config->addSimple(TqDataTypeEnum::string, 'type');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'dictionary_id', 'dictionary.id');
        $config->addJoined(TqDataTypeEnum::string_nullable, TqTableAliasEnum::dictionary, 'name', 'dictionary.name');
        $config->addSimple(TqDataTypeEnum::int, 'default_order');
        $config->addSimple(TqDataTypeEnum::bool_nullable, 'is_multi_value');
        $config->addSimple(TqDataTypeEnum::bool, 'is_fixed');
        $config->addSimple(TqDataTypeEnum::string, 'requirement_level');
        $config->addSimple(TqDataTypeEnum::text_nullable, 'description');
        // The stored JSON object has snake_cased keys, but the API exposes them camelCased.
        $config->addSimple(
            TqDataTypeEnum::text_nullable,
            'metadata',
            renderer: fn(?string $value) => $value === null
                ? null
                : json_encode(StringTransformer::camelKeys(json_decode($value, associative: true))),
        );
        $config->addCount();
        return $config;
    }

    /**
     * Returns an SQL expression equal to Str::camel() of a snake_case value made of lowercase
     * letters, digits and underscores (the form in which the snake_cased names are stored).
     */
    private static function snakeToCamelSql(string $query): string
    {
        foreach (range('a', 'z') as $letter) {
            $query = "replace($query, '_$letter', '" . strtoupper($letter) . "')";
        }
        return "replace($query, '_', '')";
    }
}
