<?php

namespace App\Services\Tquery\Tables;

use App\Services\Tquery\Config\TqColumnConfig;
use App\Services\Tquery\Config\TqDataTypeEnum;
use App\Services\Tquery\Config\TqConfig;
use App\Services\Tquery\Config\TqTableAliasEnum;
use App\Services\Tquery\Config\TqTableEnum;
use App\Services\Tquery\Engine\TqService;

readonly class AdminUserTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        return new TqConfig(
            table: TqTableEnum::users,
            columns: [
                TqColumnConfig::simple(TqDataTypeEnum::uuid, 'id'),
                TqColumnConfig::simple(TqDataTypeEnum::string, 'name'),
                TqColumnConfig::simple(TqDataTypeEnum::string, 'email'),
                TqColumnConfig::simple(TqDataTypeEnum::uuid, 'last_login_facility_id', 'last_login_facility.id'),
                TqColumnConfig::joined(
                    TqDataTypeEnum::string,
                    TqTableAliasEnum::last_login_facility,
                    'name',
                    'last_login_facility.name',
                ),
                TqColumnConfig::simple(TqDataTypeEnum::is_not_null, 'password', 'has_password'),
                TqColumnConfig::simple(TqDataTypeEnum::datetime, 'password_expire_at'),
                TqColumnConfig::simple(TqDataTypeEnum::datetime, 'created_at'),
                TqColumnConfig::simple(TqDataTypeEnum::datetime, 'updated_at'),
                TqColumnConfig::simple(TqDataTypeEnum::is_not_null, 'email_verified_at', 'has_email_verified'),
                TqColumnConfig::simple(TqDataTypeEnum::uuid, 'created_by', 'created_by.id'),
                TqColumnConfig::joined(
                    TqDataTypeEnum::string,
                    TqTableAliasEnum::created_by,
                    'name',
                    'created_by.name',
                ),
                TqColumnConfig::simple(TqDataTypeEnum::is_not_null, 'global_admin_grant_id', 'has_global_admin'),
                TqColumnConfig::query(
                    TqDataTypeEnum::decimal0,
                    fn(string $tableName) => //
                    "select count(1) from `members` where `members`.`user_id` = `users`.`id`",
                    'facility_count',
                ),
            ],
        );
    }
}
