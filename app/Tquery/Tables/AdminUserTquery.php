<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\TqService;

readonly class AdminUserTquery extends TqService
{
    protected function getConfig(): TqConfig
    {
        $config = new TqConfig(table: TqTableAliasEnum::users);
        $config->addBase();
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
        $config->addSimple(TqDataTypeEnum::is_not_null, 'email_verified_at', 'has_email_verified');
        $config->addSimple(TqDataTypeEnum::is_not_null, 'global_admin_grant_id', 'has_global_admin');
        $config->addListQuery(
            type: TqDataTypeEnum::string_list,
            select: "`facilities`.`name`",
            from: "`members` inner join `facilities` on `members`.`facility_id` = `facilities`.`id`"
            . " where `members`.`user_id` = `users`.`id`",
            columnAlias: 'facilities.*.name',
        );
        $config->addQuery(
            TqDataTypeEnum::int,
            fn(string $tableName) => //
            "select count(1) from `members` where `members`.`user_id` = `$tableName`.`id`",
            'facilities.count',
        );
        $config->addSimple(TqDataTypeEnum::uuid_nullable, 'managed_by_facility_id', 'managed_by_facility.id');
        $config->addJoined(
            TqDataTypeEnum::string_nullable,
            TqTableAliasEnum::managed_by_facility,
            'name',
            'managed_by_facility.name',
        );

        foreach (
            [
                ['user_login_success', 'last_login_success_at'],
                ['user_login_failure', 'last_login_failure_at'],
                ['user_password_change', 'last_password_change_at'],
            ] as [$source, $alias]
        ) {
            $config->addQuery(
                TqDataTypeEnum::datetime_nullable,
                fn(string $tableName) => "select `created_at` from `log_entries` where"
                    . " `log_entries`.`user_id` = `$tableName`.`id`"
                    . " and `source` = '$source' order by `created_at` desc limit 1",
                $alias,
            );
        }

        foreach (
            [
                ['facility_admin_grant_id', 'has_facility_admin'],
                ['staff_member_id', 'is_staff'],
                ['client_id', 'is_client'],
            ] as [$column, $alias]
        ) {
            $config->addQuery(
                TqDataTypeEnum::bool,
                fn(string $tableName) => "exists (select 1 from `members` where"
                    . " `members`.`user_id` = `$tableName`.`id` and `members`.`$column` is not null)",
                $alias,
            );
        }

        $config->addSimple(
            TqDataTypeEnum::is_not_null,
            'otp_required_at',
            'is_otp_required',
        );
        $config->addSimple(
            TqDataTypeEnum::datetime_nullable,
            'otp_required_at',
        );
        $config->addSimple(
            TqDataTypeEnum::is_not_null,
            'otp_secret',
            'has_otp_configured',
        );

        $config->addCount();
        return $config;
    }
}
