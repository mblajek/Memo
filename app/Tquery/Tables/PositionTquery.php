<?php

namespace App\Tquery\Tables;

use App\Models\Position;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

readonly class PositionTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::positions);
        $config->addBase();
        $config->addSimple(TqDataTypeEnum::uuid, 'dictionary_id', 'dictionary.id');
        $config->addJoined(TqDataTypeEnum::string, TqTableAliasEnum::dictionary, 'name', 'dictionary.name');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'facility_id', 'facility.id');
        $config->addJoined(TqDataTypeEnum::string_nullable, TqTableAliasEnum::facility, 'name', 'facility.name');
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::bool, 'is_fixed');
        $config->addSimple(TqDataTypeEnum::bool, 'is_disabled');
        $config->addSimple(TqDataTypeEnum::int, 'default_order');
        // Only global attributes are exposed: this query spans all facilities, while the client only has
        // the global and active-facility attributes loaded, so a facility-specific one could not be resolved.
        foreach (Position::attrMap() as $attribute) {
            if ($attribute->facility_id === null) {
                $config->addAttribute($attribute, 'position');
            }
        }
        $config->addCount();
        return $config;
    }
}
