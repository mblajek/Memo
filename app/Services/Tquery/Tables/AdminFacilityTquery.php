<?php

namespace App\Services\Tquery\Tables;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqDataTypeEnum;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Config\TqTableEnum;
use App\Services\Tquery\Engine\TqService;

readonly class AdminFacilityTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        return new TqConfig(
            table: TqTableEnum::facilities,
            columns: [
                TqColumnConfig::simple(TqDataTypeEnum::uuid, 'id'),
                TqColumnConfig::simple(TqDataTypeEnum::string, 'name'),
                TqColumnConfig::simple(TqDataTypeEnum::string, 'url'),
                TqColumnConfig::simple(TqDataTypeEnum::datetime, 'created_at'),
                TqColumnConfig::simple(TqDataTypeEnum::datetime, 'updated_at'),
                TqColumnConfig::query(
                    TqDataTypeEnum::decimal0,
                    fn(string $tableName) => //
                    "select count(1) from `members` where `members`.`facility_id` = `facilities`.`id`",
                    'user_count',
                ),
            ],
        );
    }
}
