<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;
use App\Utils\Transformer\StringTransformer;
use Illuminate\Support\Str;

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
        $config->addSimple(
            TqDataTypeEnum::string,
            'name',
            renderer: fn(?string $value) => $value === null || str_starts_with($value, '+') ? $value : Str::camel($value),
        );
        // api_name is stored snake_cased in the database, but the API exposes it camelCased.
        $config->addSimple(
            TqDataTypeEnum::string,
            'api_name',
            renderer: fn(?string $value) => $value === null ? null : Str::camel($value),
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
}
