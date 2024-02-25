<?php

namespace App\Tquery\Tables;

use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

readonly class StaffTquery extends AdminUserTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableAliasEnum::users);
        $builder->join(TqTableAliasEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.staff_member_id is not null', false, null, false, false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();
        $this->addMeetingsRelatedColumns($config);

        $config->addJoined(
            TqDataTypeEnum::is_not_null,
            TqTableAliasEnum::members,
            'facility_admin_grant_id',
            'staff.has_facility_admin',
        );

        return $config;
    }
}
