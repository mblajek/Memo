<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

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
        $config->addSimple(TqDataTypeEnum::datetime_nullable, 'restored_prod_at');
        $config->addSimple(TqDataTypeEnum::bool, 'is_from_rc');
        $config->addSimple(TqDataTypeEnum::bool, 'is_backuped');
        $config->addCount();
        return $config;
    }
}
