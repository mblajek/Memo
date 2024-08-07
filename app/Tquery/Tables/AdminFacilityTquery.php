<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

final readonly class AdminFacilityTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::facilities);
        $config->addBase();
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::string, 'url');
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `members` where `members`.`facility_id` = `$tableName`.`id`",
            'users.count',
        );
        // todo: change to *list, and name  facility_admins.*.name
        $config->addQuery(
            TqDataTypeEnum::text_nullable,
            fn(string $tableName) => //
                "select group_concat(`name` order by `name` separator ', ') from `members` inner join"
                . " `users` on `members`.`user_id` = `users`.`id` where `members`.`facility_admin_grant_id` is not null"
                . " and `members`.`facility_id` = `$tableName`.`id`",
            'facility_admins',
        );
        $config->addCount();
        return $config;
    }
}
