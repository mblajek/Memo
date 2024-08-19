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
        $config->addListQuery(
            type: TqDataTypeEnum::string_list,
            select: "`users`.`name`",
            from: "`members` inner join `users` on `members`.`user_id` = `users`.`id`"
                . " where `members`.`facility_admin_grant_id` is not null"
                . " and `members`.`facility_id` = `facilities`.`id`",
            columnAlias: 'facility_admins.*.name',
        );
        $config->addCount();
        return $config;
    }
}
