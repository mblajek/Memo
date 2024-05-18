<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

readonly class MemberTquery extends FacilityUserTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableAliasEnum::users);
        $builder->join(TqTableAliasEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();
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
        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'facility_admin_grant_id',
            'member.has_facility_admin',
        );

        return $config;
    }
}
