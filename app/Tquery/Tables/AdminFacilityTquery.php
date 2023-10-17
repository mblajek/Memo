<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqService;

readonly class AdminFacilityTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableEnum::facilities);

        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::string, 'url');
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `members` where `members`.`facility_id` = `facilities`.`id`",
            'user_count',
        );
        $config->addQuery(
            TqDataTypeEnum::text_nullable,
            fn(string $tableName) => //
                "select group_concat(`name` order by `name` separator ', ') from `members` inner join"
                . " `users` on `members`.`user_id` = `users`.`id` where `members`.`facility_admin_grant_id` is not null"
                . " and `members`.`facility_id` = `facilities`.`id`",
            'facility_admins',
        );
        return $config;
    }
}
