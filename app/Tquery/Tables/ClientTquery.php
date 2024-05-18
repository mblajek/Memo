<?php

namespace App\Tquery\Tables;

use App\Models\Client;
use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
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
        $config->addJoined(TqDataTypeEnum::datetime, TqTableAliasEnum::clients, 'created_at', 'client.created_at');
        $config->addJoined(TqDataTypeEnum::datetime, TqTableAliasEnum::clients, 'updated_at', 'client.updated_at');
        $config->addJoined(TqDataTypeEnum::uuid, TqTableAliasEnum::clients, 'created_by', 'client.created_by.id');
        $config->addQuery(TqDataTypeEnum::string, fn(string $tableName) => //
        'select `users`.`name` from `users` where `users`.`id` = `clients`.`created_by`', 'client.created_by.name');
        $config->addJoined(TqDataTypeEnum::uuid, TqTableAliasEnum::clients, 'updated_by', 'client.updated_by.id');
        $config->addQuery(TqDataTypeEnum::string, fn(string $tableName) => //
        'select `users`.`name` from `users` where `users`.`id` = `clients`.`updated_by`', 'client.updated_by.name');
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
