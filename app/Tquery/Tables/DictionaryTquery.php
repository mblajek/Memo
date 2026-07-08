<?php

namespace App\Tquery\Tables;

use App\Models\Dictionary;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

readonly class DictionaryTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::dictionaries);
        $config->addBase();
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'facility_id', 'facility.id');
        $config->addJoined(TqDataTypeEnum::string_nullable, TqTableAliasEnum::facility, 'name', 'facility.name');
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::bool, 'is_fixed');
        $config->addSimple(TqDataTypeEnum::bool, 'is_extendable');
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `positions` where `positions`.`dictionary_id` = `$tableName`.`id`",
            'positions.count',
        );
        // Only global attributes are exposed: this query spans all facilities, while the client only has
        // the global and active-facility attributes loaded, so a facility-specific one could not be resolved.
        foreach (Dictionary::attrMap() as $attribute) {
            if ($attribute->facility_id === null) {
                $config->addAttribute($attribute, 'dictionary');
            }
        }
        $config->addCount();
        return $config;
    }
}
