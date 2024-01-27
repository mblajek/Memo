<?php

namespace App\Tquery\Tables;

use App\Models\Facility;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqBind;
use App\Tquery\Engine\TqBuilder;

readonly class StaffTquery extends AdminUserTquery
{
    public function __construct(private Facility $facility)
    {
        parent::__construct();
    }

    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableEnum::users);
        $builder->join(TqTableEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->where(fn(TqBind $bind) => "members.facility_id = $bind", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.staff_member_id is not null', false, null, false, false);
        return $builder;
    }
}
