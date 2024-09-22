<?php

namespace App\Tquery\Tables;

use App\Models\User;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

final readonly class MemberTquery extends FacilityUserTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableAliasEnum::users);
        $builder->join(
            TqTableAliasEnum::users,
            TqTableAliasEnum::members,
            'user_id',
            left: true,
            inv: true,
            condition: "`members`.`facility_id` = '{$this->facility->id}'",
        );
        $builder->join(
            TqTableAliasEnum::members,
            TqTableAliasEnum::staff_members,
            'staff_member_id',
            left: true,
            inv: false,
        );
        $builder->where( // return members, global admins and system
            query: fn(TqSingleBind $bind) => //
                "`members`.`id` is not null"
                . " or `users`.`global_admin_grant_id` is not null"
                . " or `users`.`id` = {$bind->use()}",
            or: false,
            value: User::SYSTEM,
            inverse: false,
            nullable: false,
        );

        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig(); // keep $config->uniqueTable - users.id is still unique

        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'client_id',
            'member.is_client',
        );
        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'staff_member_id',
            'member.is_staff',
        );
        $config->addQuery(
            TqDataTypeEnum::bool,
            fn(string $tableName) => //
            'select `staff_members`.`id` is not null and `staff_members`.`deactivated_at` is null',
            'member.is_active_staff',
        );
        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'facility_admin_grant_id',
            'member.has_facility_admin',
        );

        return $config;
    }
}
