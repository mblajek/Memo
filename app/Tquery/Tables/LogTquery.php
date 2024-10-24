<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

final readonly class LogTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::log_entries);
        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addQuery(TqDataTypeEnum::date, fn(string $tableName) => //
        "cast(`$tableName`.`created_at` as date)", "created_at_date");

        $config->addSimple(TqDataTypeEnum::string, 'app_version');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'user_id', 'user.id');
        $config->addQuery(TqDataTypeEnum::string_nullable, fn(string $tableName) => //
        "select `users`.`name` from `users` where `users`.`id` = `$tableName`.`user_id`", "user.name");

        $config->addSimple(TqDataTypeEnum::string, 'source');
        $config->addSimple(TqDataTypeEnum::string, 'client_ip');

        $config->addQuery(
            TqDataTypeEnum::text_nullable,
            fn(string $tableName) => //
            "select `texts`.`short_text` from `texts` where `texts`.`id` = `$tableName`.`user_agent_text_id`",
            'user_agent',
        );

        $config->addSimple(TqDataTypeEnum::string, 'error_level');
        $config->addSimple(TqDataTypeEnum::text, 'message');

        $config->addQuery(
            TqDataTypeEnum::text_nullable,
            fn(string $tableName) => //
            "select `texts`.`short_text` from `texts` where `texts`.`id` = `$tableName`.`context_text_id`",
            'context',
        );

        $config->addCount();
        return $config;
    }
}
