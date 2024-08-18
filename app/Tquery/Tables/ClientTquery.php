<?php

namespace App\Tquery\Tables;

use App\Models\Client;
use App\Models\Facility;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

final readonly class ClientTquery extends FacilityUserTquery
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

        $config->addQuery(
            type: TqDataTypeEnum::int,
            columnOrQuery: fn(string $tableName) => //
            "select count(1) from `group_clients` where `group_clients`.`user_id` = `users`.`id`",
            columnAlias: 'client.groups.count'
        );

        $config->addListQuery(
            type: TqDataTypeEnum::uuid_list,
            select: "`group_clients`.`client_group_id`",
            from: "`group_clients` where `group_clients`.`user_id` = `users`.`id`",
            columnAlias: 'client.groups.*.id',
        );

        $config->addListQuery(
            type: TqDataTypeEnum::string_list,
            select: "`group_clients`.`role`",
            from: "`group_clients` where `group_clients`.`user_id` = `users`.`id`"
            . " and `group_clients`.`role` is not null",
            columnAlias: 'client.groups.*.role',
        );

        $config->addListQuery(
            type: TqDataTypeEnum::uuid_list,
            select: "`group_clients`.`user_id`",
            from: "`group_clients` as `current_group_clients` join `group_clients`"
            . " on `group_clients`.`client_group_id` = `current_group_clients`.`client_group_id`"
            . " and `group_clients`.`id` != `current_group_clients`.`id`"
            . " where `current_group_clients`.`user_id` = `users`.`id`",
            columnAlias: 'client.groups.*.clients.*.user_id',
            selectDistinct: true,
        );
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig(); // keep $config->uniqueTable - users.id is still unique

        self::addClientFields($this->facility, $config);
        return $config;
    }
}
