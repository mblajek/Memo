<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;
use Illuminate\Support\Facades\Config;

final readonly class AdminDbDumpsTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::db_dumps_copy);
        $config->addBase();
        $config->addSimple(TqDataTypeEnum::string_nullable, 'name');
        $config->addSimple(TqDataTypeEnum::int_nullable, 'file_size');
        $config->addSimple(TqDataTypeEnum::string, 'app_version');
        $config->addSimple(TqDataTypeEnum::datetime_nullable, 'restored_rc_at');
        $config->addSimple(TqDataTypeEnum::datetime_nullable, 'restored_prod_at', 'restored_self_at');
        $config->addSimple(TqDataTypeEnum::bool, 'is_from_rc');
        $config->addSimple(TqDataTypeEnum::string, 'status');

        $config->addQuery(
            TqDataTypeEnum::bool_nullable,
            fn(string $tableName): string =>
            "case when(`$tableName`.`is_backuped`) then true when(`$tableName`.`is_from_rc`) then null else false end",
            'is_backed_up',
        );
        $config->addQuery(
            TqDataTypeEnum::string,
            fn(string $tableName): string =>
            "case when(`$tableName`.`is_from_rc`) then 'rc' else '".Config::string('app.env')." (self)' end",
            'from_env',
        );
        $config->addQuery(
            TqDataTypeEnum::string,
            fn(string $tableName): string =>
            "case when(`$tableName`.`status` = 'creating') then 'pending' "
            . "when(`$tableName`.`status` = 'create_error') then 'error' else 'ok' end",
            'create_status',
        );
        $config->addQuery(
            TqDataTypeEnum::string_nullable,
            fn(string $tableName): string =>
            "case when(`$tableName`.`status` = 'restoring') then 'pending' " .
            "when(`$tableName`.`status` = 'restore_error') then 'error' " .
            "when(`$tableName`.`restored_prod_at` is not null or `$tableName`.`restored_rc_at` is not null) then 'ok' " .
            "else null end",
            'last_restore_status',
        );

        $config->addCount();
        return $config;
    }
}
