<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

final readonly class StaffTquery extends FacilityUserTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableAliasEnum::users);
        $builder->join(TqTableAliasEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->join(
            TqTableAliasEnum::members,
            TqTableAliasEnum::staff_members,
            'staff_member_id',
            left: false,
            inv: false,
        );
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.staff_member_id is not null', false, null, false, false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig(); // keep $config->uniqueTable - users.id is still unique

        $config->addBaseOnTable(TqTableAliasEnum::staff_members, 'staff');
        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'facility_admin_grant_id',
            'staff.has_facility_admin',
        );
        $config->addJoined(
            TqDataTypeEnum::datetime_nullable,
            TqTableAliasEnum::staff_members,
            'deactivated_at',
            'staff.deactivated_at',
        );
        $config->addJoined(
            TqDataTypeEnum::is_null,
            TqTableAliasEnum::staff_members,
            'deactivated_at',
            'staff.is_active',
        );

        return $config;
    }
}
