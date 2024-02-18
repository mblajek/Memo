<?php

namespace App\Tquery\Tables;

use App\Models\Attribute;
use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

readonly class ClientTquery extends AdminUserTquery
{
    public function __construct(private Facility $facility)
    {
        parent::__construct();
    }

    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableEnum::users);
        $builder->join(TqTableEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->join(TqTableEnum::members, TqTableAliasEnum::clients, 'client_id', left: false, inv: false);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.client_id is not null', false, null, false, false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();

        foreach (Attribute::getByFacility($this->facility, 'clients') as $attribute) {
            $config->addAttribute($attribute->id);
        }

        return $config;
    }
}
