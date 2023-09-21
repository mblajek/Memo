<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqService;

readonly class AdminUserTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableEnum::users);
        $config->addSimple(TqDataTypeEnum::uuid, 'id');
        $config->addSimple(TqDataTypeEnum::string, 'name');
        $config->addSimple(TqDataTypeEnum::string_nullable, 'email');
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'last_login_facility_id', 'last_login_facility.id');
        $config->addJoined(
            TqDataTypeEnum::string_nullable,
            TqTableAliasEnum::last_login_facility,
            'name',
            'last_login_facility.name',
        );
        $config->addSimple(TqDataTypeEnum::is_not_null, 'password', 'has_password');
        $config->addSimple(TqDataTypeEnum::datetime_nullable, 'password_expire_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'created_at');
        $config->addSimple(TqDataTypeEnum::datetime, 'updated_at');
        $config->addSimple(TqDataTypeEnum::is_not_null, 'email_verified_at', 'has_email_verified');
        $config->addSimple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id');
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::created_by,
            'name',
            'created_by.name',
        );
        $config->addSimple(TqDataTypeEnum::is_not_null, 'global_admin_grant_id', 'has_global_admin');
        $config->addQuery(
            TqDataTypeEnum::decimal0,
            fn(string $tableName) => //
            "select count(1) from `members` where `members`.`user_id` = `users`.`id`",
            'facility_count',
        );
        return $config;
    }
}
