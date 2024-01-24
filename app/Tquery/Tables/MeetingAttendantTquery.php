<?php

namespace App\Tquery\Tables;

use App\Models\UuidEnum\DictionaryUuidEnum;
use App\Tquery\Config\TqConfig;
use App\Tquery\Config\TqDataTypeEnum;
use App\Tquery\Config\TqDictDef;
use App\Tquery\Config\TqTableAliasEnum;
use App\Tquery\Config\TqTableEnum;
use App\Tquery\Engine\TqBuilder;

readonly class MeetingAttendantTquery extends MeetingTquery
{
    protected function getBuilder(): TqBuilder
    {
        $builder = parent::getBuilder();
        $builder->join(
            TqTableEnum::meetings,
            TqTableAliasEnum::meeting_attendants,
            'meeting_id',
            left: false,
            inv: true,
        );
        $builder->join(
            TqTableEnum::meeting_attendants,
            TqTableAliasEnum::attendant,
            'user_id',
            left: false,
            inv: false,
        );
        return $builder;
    }

    protected function getConfig(): TqConfig
    {
        $config = parent::getConfig();

        $config->addJoined(
            TqDataTypeEnum::uuid,
            TqTableAliasEnum::meeting_attendants,
            'user_id',
            'attendant.user_id'
        );
        $config->addJoined(
            TqDataTypeEnum::uuid,
            TqTableAliasEnum::attendant,
            'name',
            'attendant.name'
        );
        $config->addJoined(
            TqDataTypeEnum::string,
            TqTableAliasEnum::meeting_attendants,
            'attendance_type',
            'attendant.attendance_type'
        );
        $config->addJoined(
            new TqDictDef(TqDataTypeEnum::dict_nullable, DictionaryUuidEnum::AttendanceStatus),
            TqTableAliasEnum::meeting_attendants,
            'attendance_status_dict_id',
            'attendant.attendance_status_dict_id',
        );

        return $config;
    }
}
