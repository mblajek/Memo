<?php

namespace App\Tquery\Tables;

use App\Models\Enums\AttendanceType;
use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Engine\Bind\TqSingleBind;
use App\Tquery\Engine\TqBuilder;

final readonly class MeetingClientTquery extends MeetingTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = parent::getBuilder();
        $builder->join(
            TqTableAliasEnum::meetings,
            TqTableAliasEnum::meeting_attendants,
            'meeting_id',
            left: false,
            inv: true,
        );
        $builder->join(
            TqTableAliasEnum::meeting_attendants,
            TqTableAliasEnum::users,
            'user_id',
            left: false,
            inv: false,
        );
        $builder->join(TqTableAliasEnum::users, TqTableAliasEnum::members, 'user_id', left: false, inv: true);
        $builder->join(TqTableAliasEnum::members, TqTableAliasEnum::clients, 'client_id', left: false, inv: false);
        $builder->where(fn(TqSingleBind $bind) => //
        "members.facility_id = {$bind->use()}", false, $this->facility->id, false, false);
        $builder->where(fn(TqSingleBind $bind) => // redundant with inner join to `clients`
        "meeting_attendants.attendance_type_dict_id = {$bind->use()}",
            false,
            AttendanceType::Client->value,
            false,
            false);
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();
        $config->uniqueTable = TqTableAliasEnum::users;

        $config->addJoined(
            TqDataTypeEnum::uuid,
            TqTableAliasEnum::members,
            'id',
            'member.id',
        );

        $config->addJoined(
            TqDataTypeEnum::uuid,
            TqTableAliasEnum::meeting_attendants,
            'user_id',
            'attendant.user_id'
        );
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::users,
            'name',
            'attendant.name'
        );
        /* always "client"
         * $config->addJoined(
            new TqDictDef(TqDataTypeEnum::dict, DictionaryUuidEnum::AttendanceType),
            TqTableAliasEnum::meeting_attendants,
            'attendance_type_dict_id',
            'attendant.attendance_type_dict_id'
        );*/
        $config->addJoined(
            new TqDictDef(TqDataTypeEnum::dict, DictionaryUuidEnum::AttendanceStatus),
            TqTableAliasEnum::meeting_attendants,
            'attendance_status_dict_id',
            'attendant.attendance_status_dict_id',
        );

        FacilityUserTquery::addAttendantFields($this->facility, $config);
        ClientTquery::addClientFields($this->facility, $config);

        return $config;
    }
}
