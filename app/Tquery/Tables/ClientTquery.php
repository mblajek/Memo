<?php

namespace App\Tquery\Tables;

use App\Models\Client;
use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

readonly class ClientTquery extends FacilityUserTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = TqBuilder::fromTable(TqTableAliasEnum::users);
        $builder->join(TqTableAliasEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->join(TqTableAliasEnum::members, TqTableAliasEnum::clients, 'client_id', left: false, inv: false);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(null $bind) => 'members.client_id is not null', false, null, false, false);
        return $builder;
    }

    final public static function addClientFields(Facility $facility, TqConfig $config): void
    {
        $config->addBaseOnTable(TqTableAliasEnum::clients, 'client');
        foreach (Client::attrMap($facility) as $attribute) {
            $config->addAttribute($attribute, 'client');
        }
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();
        self::addClientFields($this->facility, $config);
        return $config;
    }
}
